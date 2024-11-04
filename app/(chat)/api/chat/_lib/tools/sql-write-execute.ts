import { z } from "zod";
import { tool } from "ai";
import { DataSource } from "typeorm";
import { ChatOpenAI } from "@langchain/openai";
import { SqlDatabase } from "langchain/sql_db";
import { QuerySqlTool } from "langchain/tools/sql";
import { createSqlQueryChain } from "langchain/chains/sql_db";

export const sqlWriteExecuteTool = tool({
  description: "Write a SQL query to answer the question",
  parameters: z.object({
    question: z.string().describe("The question to answer"),
  }),
  execute: async ({ question }) => {
    const datasource = new DataSource({
      type: "sqlite",
      database: "temp.db",
    });
    const db = await SqlDatabase.fromDataSourceParams({
      appDataSource: datasource,
    });
    const llm = new ChatOpenAI({
      model: "gpt-3.5-turbo",
      temperature: 0,
    });
    const executeQuery = new QuerySqlTool(db);
    const writeQuery = await createSqlQueryChain({
      llm,
      db,
      dialect: "sqlite",
    });

    const chain = writeQuery.pipe(executeQuery);
    const response = await chain.invoke({ question });
    return response;
  },
});
