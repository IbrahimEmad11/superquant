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
    description: 'Write and execute a SQL query to answer a question about the database.',
    parameters: z.object({
      question: z.string().describe('The natural language question to answer'),
    }),
    execute: async ({ question }) => {
      try {
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
              details: metadataError instanceof Error ? metadataError.message : 'Unknown error',
              suggestion: "Please verify the database file is accessible and not corrupted."
            }, null, 2);
          }
          
          if (metadata.tables.length === 0) {
            return JSON.stringify({
              message: "No tables found in the database",
              suggestion: "The database appears to be empty or all tables are system tables."
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

          // 3. Use OpenAI to generate SQL query with better context
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
          
          const sqlPrompt = `Given the following SQLite database schema and a user question, generate a valid SQLite query to answer the question.

${databaseContext}

User Question: ${question}

Requirements:
- Generate ONLY the SQL query, no explanations
- Use double quotes for table and column names if they contain spaces or special characters
- Use SQLite syntax and functions (like strftime for date formatting)
- Make sure the query is valid and executable
- Use appropriate JOINs if multiple tables are needed
- If the question cannot be answered with the available data, return: SELECT 'Data not available for this question' as message

SQL Query:`;

          let response;
          try {
            response = await llm.invoke(sqlPrompt);
          } catch (aiError) {
            return JSON.stringify({
              error: "Failed to generate SQL query",
              details: aiError instanceof Error ? aiError.message : 'AI service error',
              suggestion: "Please try rephrasing your question or check the AI service status."
            }, null, 2);
          }

          let sqlQuery = response.content.toString().trim();
          
          // Clean up the SQL query
          sqlQuery = sqlQuery.replace(/^```sql\s*\n?/, '').replace(/\n?```$/, '').trim();
          sqlQuery = sqlQuery.replace(/^SQL Query:\s*/, '').trim();
          sqlQuery = sqlQuery.replace(/^Query:\s*/, '').trim();
          
          console.log('Generated SQL query:', sqlQuery);
          
          // 4. Execute the query using our handler with better error handling
          let results;
          try {
            results = await InMemorySQLiteHandler.executeQuery(database.connectionString, sqlQuery);
            console.log('Query executed successfully, returned', results.length, 'rows');
          } catch (queryError) {
            console.error('Query execution failed:', queryError);
            
            // Try to provide helpful error messages
            const errorMessage = queryError instanceof Error ? queryError.message : 'Unknown query error';
            
            return JSON.stringify({
              error: "Query execution failed",
              query: sqlQuery,
              details: errorMessage,
              suggestion: "The generated query may have syntax errors or reference non-existent columns. Please try rephrasing your question."
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
        const errorMessage = (error instanceof Error) ? error.message : String(error);
        return `An error occurred while processing the query: ${errorMessage}`;
      }
    },
  });

  return sqlWriteExecuteTool;
}