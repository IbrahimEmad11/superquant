import { ChatOpenAI } from '@langchain/openai';
import { tool } from 'ai';
import { createSqlQueryChain } from 'langchain/chains/sql_db';
import { SqlDatabase } from 'langchain/sql_db';
import { QuerySqlTool } from 'langchain/tools/sql';
import { DataSource } from 'typeorm';
import { z } from 'zod';

import { Database as AppDatabaseSchema } from '@/db/schema';
import { InMemorySQLiteHandler } from '@/lib/sqlite-handler';

export async function generateSqlWriteExecuteTool(database: AppDatabaseSchema) {
  const sqlWriteExecuteTool = tool({
    description: 'Write and execute a SQL query to answer a question about the database. Only SELECT statements are allowed for security.',
    parameters: z.object({
      question: z.string().describe('The natural language question to answer'),
    }),
    execute: async ({ question }) => {
      try {
        // SECURITY: Validate question doesn't contain dangerous keywords
        const dangerousKeywords = [
          'DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE',
          'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'xp_', 'sp_', '--', '/*', '*/',
          'UNION', 'INFORMATION_SCHEMA', 'sys.', 'master.', 'tempdb.'
        ];
        
        const upperQuestion = question.toUpperCase();
        for (const keyword of dangerousKeywords) {
          if (upperQuestion.includes(keyword)) {
            return JSON.stringify({
              error: "Query blocked for security reasons",
              details: "The question contains potentially dangerous SQL keywords",
              suggestion: "Please rephrase your question to focus on data analysis only."
            }, null, 2);
          }
        }

        if (database.type === 'sqlite') {
          console.log('Processing SQLite query for question:', question);
          
          // 1. Get database metadata with better error handling
          let metadata;
          try {
            metadata = await InMemorySQLiteHandler.getDatabaseMetadata(database.connectionString);
            console.log('Database metadata retrieved:', metadata.tables.length, 'tables found');
          } catch (metadataError) {
            console.error('Failed to get database metadata:', metadataError);
            return JSON.stringify({
              error: "Failed to retrieve database schema",
              details: "Database connection issue",
              suggestion: "Please verify the database file is accessible."
            }, null, 2);
          }
          
          if (metadata.tables.length === 0) {
            return JSON.stringify({
              message: "No tables found in the database",
              suggestion: "The database appears to be empty."
            }, null, 2);
          }

          // 2. Create a comprehensive database context for the LLM
          let databaseContext = "Database Schema:\n\n";
          
          for (const table of metadata.tables) {
            databaseContext += `Table: ${table.name} (${table.rowCount} rows)\n`;
            databaseContext += `Columns:\n`;
            for (const col of table.columns) {
              databaseContext += `  - ${col.name}: ${col.type}${col.primaryKey ? ' (PRIMARY KEY)' : ''}${col.nullable ? ' (NULLABLE)' : ' (NOT NULL)'}\n`;
            }
            
            // Add sample data for better context - with error handling
            try {
              const sampleData = await InMemorySQLiteHandler.getSampleData(database.connectionString, table.name, 2);
              if (sampleData.length > 0) {
                databaseContext += `Sample data: ${JSON.stringify(sampleData[0])}\n`;
              }
            } catch (sampleError) {
              console.warn(`Could not get sample data for ${table.name}:`, sampleError);
              // Continue without sample data
            }
            databaseContext += '\n';
          }

          // 3. Use OpenAI to generate SQL query with better context and security constraints
          let llm;
          try {
            llm = new ChatOpenAI({ 
              model: 'gpt-3.5-turbo',
              temperature: 0 
            });
          } catch (llmError) {
            return JSON.stringify({
              error: "Failed to initialize AI model",
              details: "Could not connect to OpenAI service",
              suggestion: "Please check your OpenAI API configuration."
            }, null, 2);
          }
          
          const sqlPrompt = `Given the following SQLite database schema and a user question, generate a valid SQLite SELECT query to answer the question.

${databaseContext}

User Question: ${question}

CRITICAL REQUIREMENTS:
- Generate ONLY a SELECT query - NO INSERT, UPDATE, DELETE, DROP, CREATE, or ALTER statements
- Use double quotes for table and column names if they contain spaces or special characters
- Use SQLite syntax and functions (like strftime for date formatting)
- Make sure the query is valid and executable
- Use appropriate JOINs if multiple tables are needed
- If the question cannot be answered with the available data, return: SELECT 'Data not available for this question' as message
- NEVER access system tables or internal SQLite tables
- Limit results to reasonable amounts (use LIMIT if needed)

SQL Query:`;

          let response;
          try {
            response = await llm.invoke(sqlPrompt);
          } catch (aiError) {
            return JSON.stringify({
              error: "Failed to generate SQL query",
              details: "AI service error",
              suggestion: "Please try rephrasing your question."
            }, null, 2);
          }

          let sqlQuery = response.content.toString().trim();
          
          // Clean up the SQL query
          sqlQuery = sqlQuery.replace(/^```sql\s*\n?/, '').replace(/\n?```$/, '').trim();
          sqlQuery = sqlQuery.replace(/^SQL Query:\s*/, '').trim();
          sqlQuery = sqlQuery.replace(/^Query:\s*/, '').trim();
          
          // SECURITY: Final validation - ensure it's a SELECT query
          if (!sqlQuery.toUpperCase().trim().startsWith('SELECT')) {
            return JSON.stringify({
              error: "Invalid query type generated",
              details: "Only SELECT queries are allowed for security",
              suggestion: "Please rephrase your question to focus on data retrieval."
            }, null, 2);
          }
          
          // SECURITY: Check for dangerous patterns in the generated query
          const dangerousPatterns = [
            /DROP\s+/i, /DELETE\s+/i, /INSERT\s+/i, /UPDATE\s+/i, /ALTER\s+/i, /CREATE\s+/i,
            /TRUNCATE\s+/i, /GRANT\s+/i, /REVOKE\s+/i, /EXEC\s+/i, /EXECUTE\s+/i,
            /xp_/i, /sp_/i, /--/, /\/\*/, /\*\//, /UNION\s+ALL/i, /UNION\s+SELECT/i
          ];
          
          for (const pattern of dangerousPatterns) {
            if (pattern.test(sqlQuery)) {
              return JSON.stringify({
                error: "Generated query contains dangerous patterns",
                details: "Query blocked for security reasons",
                suggestion: "Please rephrase your question."
              }, null, 2);
            }
          }
          
          console.log('Generated SQL query:', sqlQuery);
          
          // 4. Execute the query using our handler with better error handling
          let results;
          try {
            results = await InMemorySQLiteHandler.executeQuery(database.connectionString, sqlQuery);
            console.log('Query executed successfully, returned', results.length, 'rows');
          } catch (queryError) {
            console.error('Query execution failed:', queryError);
            
            // Provide helpful error messages without exposing internal details
            return JSON.stringify({
              error: "Query execution failed",
              details: "The query could not be executed successfully",
              suggestion: "Please try rephrasing your question or check if the data you're looking for exists."
            }, null, 2);
          }
          
          return JSON.stringify({
            success: true,
            query: sqlQuery,
            results: results,
            rowCount: results.length,
            summary: `Successfully executed query and returned ${results.length} rows`
          }, null, 2);
        }
        // --- PostgreSQL & MySQL LOGIC 
        const datasource = new DataSource({
          type: database.type as any,
          url: database.connectionString,
          ssl: database.connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
        });
        
        const db = await SqlDatabase.fromDataSourceParams({ appDataSource: datasource });
        const llm = new ChatOpenAI({ model: 'gpt-3.5-turbo', temperature: 0 });
        const executeQuery = new QuerySqlTool(db);
        const writeQuery = await createSqlQueryChain({ 
          llm, 
          db, 
          dialect: database.type as 'postgres' | 'mysql' 
        });
        
        const chain = writeQuery.pipe(executeQuery);
        return await chain.invoke({ question });
      } catch (error) {
        console.error("Error during SQL tool execution:", error);
        return JSON.stringify({
          error: "An error occurred while processing the query",
          details: "Internal processing error",
          suggestion: "Please try again or rephrase your question."
        }, null, 2);
      }
    },
  });

  return sqlWriteExecuteTool;
}