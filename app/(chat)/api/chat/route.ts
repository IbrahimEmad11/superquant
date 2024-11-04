import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { sqlWriteExecuteTool } from "./_lib/tools/sql-write-execute";

// Allow streaming responses up to 30 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai("gpt-3.5-turbo"),
    system: `
      You are a data analysis expert providing clear and insightful answers. The ideal workflow is:
      1. Write a SQL query, execute it and get the results: tool called "writeExecuteQuery"
      2. Explain the results in details and be vurbose
    `,
    messages,
    maxSteps: 10,
    tools: {
      writeExecuteQuery: sqlWriteExecuteTool,
    },
  });

  return result.toDataStreamResponse();
}
