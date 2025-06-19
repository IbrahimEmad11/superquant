// FILE: ./_lib/tools/sql-write-execute.ts

import { z } from 'zod';
import { tool } from 'ai';
import { DataSource } from 'typeorm';
import { ChatOpenAI } from '@langchain/openai';
import { SqlDatabase } from 'langchain/sql_db';
import { QuerySqlTool } from 'langchain/tools/sql';
import { createSqlQueryChain } from 'langchain/chains/sql_db';
import { Database } from '@/db/schema';
import { InMemorySQLiteHandler } from '@/lib/sqlite-handler';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

export async function generateSqlWriteExecuteTool(database: Database) {
  const sqlWriteExecuteTool = tool({
    description: 'Write a SQL query to answer the question',
    parameters: z.object({
      question: z.string().describe('The question to answer'),
    }),
    execute: async ({ question }) => {
       try {
        let datasource: DataSource;

        if (database.type === 'sqlite') {
          // The SQLite logic is now self-contained, including the final chain invocation
          let tempFilePath: string | null = null;
          try {
            const buffer = await InMemorySQLiteHandler.downloadBlobToBuffer(database.connectionString);
            tempFilePath = path.join(os.tmpdir(), `${uuidv4()}.db`);
            await writeFile(tempFilePath, buffer);
            datasource = new DataSource({ type: 'sqlite', database: tempFilePath });
            // The rest of the chain logic is here
            const db = await SqlDatabase.fromDataSourceParams({ appDataSource: datasource });
            const llm = new ChatOpenAI({ model: 'gpt-3.5-turbo', temperature: 0 });
            const executeQuery = new QuerySqlTool(db);
            const writeQuery = await createSqlQueryChain({ llm, db, dialect: 'sqlite' });
            const chain = writeQuery.pipe(executeQuery);
            return await chain.invoke({ question }); // return directly
          } finally {
            if (tempFilePath) await unlink(tempFilePath).catch(console.warn);
          }
        } else {
          // The PG/MySQL logic is now self-contained
          datasource = new DataSource({
            type: database.type as any,
            url: database.connectionString,
            synchronize: false,
            ssl: database.connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
          });
          const db = await SqlDatabase.fromDataSourceParams({ appDataSource: datasource });
          const llm = new ChatOpenAI({ model: 'gpt-3.5-turbo', temperature: 0 });
          const executeQuery = new QuerySqlTool(db);
          const writeQuery = await createSqlQueryChain({ llm, db, dialect: database.type as 'postgres' | 'mysql' });
          const chain = writeQuery.pipe(executeQuery);
          return await chain.invoke({ question }); // return directly
        }
      } catch (error) {
        console.error("Error during SQL tool execution:", error);
        const errorMessage = (error instanceof Error) ? error.message : String(error);
        return `An error occurred while processing the query: ${errorMessage}`;
      }
    },
  });

  return sqlWriteExecuteTool;
}