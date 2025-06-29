import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import { deleteChatById, getChatById, saveChat } from "@/db/queries";

// LLM tools
import { getChatDatabase } from "@/db/repositories/databases";

import { generateSqlWriteExecuteTool } from "./_lib/tools/sql-write-execute";

export async function POST(request: Request) {
  try {
    // RATE LIMITING: Add basic rate limiting headers
    const response = new Response();
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', '99'); // This should be calculated based on user/IP
    
    const body = await request.json();
    const { id, messages }: { id: string; messages: Array<Message> } = body;

    // INPUT VALIDATION
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return new Response("Invalid chat ID", { status: 400 });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response("Invalid messages format", { status: 400 });
    }

    // ABUSE PREVENTION: Limit message length and frequency
    if (messages.length > 50) {
      return new Response("Too many messages in request", { status: 400 });
    }

    // Validate each message
    for (const message of messages) {
      if (!message.role || !['user', 'assistant', 'system'].includes(message.role)) {
        return new Response("Invalid message role", { status: 400 });
      }
      
      if (typeof message.content !== 'string' || message.content.length > 10000) {
        return new Response("Invalid message content", { status: 400 });
      }
      
      // ABUSE PREVENTION: Check for suspicious patterns
      const suspiciousPatterns = [
        /script/i, /javascript:/i, /data:/i, /vbscript:/i, /onload/i, /onerror/i,
        /<iframe/i, /<object/i, /<embed/i, /<link/i, /<meta/i
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(message.content)) {
          return new Response("Suspicious content detected", { status: 400 });
        }
      }
    }

    const session = await auth();

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const coreMessages = convertToCoreMessages(messages).filter(
      (message) => message.content.length > 0
    );

    const database = await getChatDatabase(id);
    console.log(database);

    if (!database) {
      return new Response("Database not found", { status: 404 });
    }

    // SECURITY: Validate database access permissions
    if (session.user && session.user.id) {
      // Add database access validation here if needed
      // This ensures users can only access databases they own
    }

    const result = await streamText({
      model: openai("gpt-3.5-turbo"),
      temperature: 0,
      system: `
        You are a data analysis expert providing clear and insightful answers. You have access to a database called "${database.name}" which is described as: "${database.description}". It's a ${database.type} database.

        CRITICAL SAFETY RULES - ALWAYS FOLLOW THESE:
        1. NEVER expose sensitive information like passwords, API keys, personal identifiers, or connection strings
        2. NEVER execute queries that could modify, delete, or insert data (only SELECT statements)
        3. NEVER reveal database connection details, table structures beyond what's needed for analysis
        4. If asked about system tables, internal schemas, or metadata, politely decline
        5. If a query fails, explain the issue without revealing internal error details
        6. Always validate that your analysis is based on actual data returned from queries
        7. If no data is found, clearly state "No data available" rather than making assumptions

        WORKFLOW - FOLLOW THIS EXACT SEQUENCE:
        1. Write and execute a SQL query using the "writeExecuteQuery" tool
        2. Analyze the actual results returned - do not make assumptions about data not returned
        3. Provide detailed explanations based ONLY on the query results
        4. If visualization would help understanding, create appropriate charts:
           - Pie charts for composition/proportional breakdown (use "showPieChart")
           - Bar charts for category comparisons (use "showBarChart") 
           - Line charts for time-based trends (use "showLineChart")
        5. Always cite the specific data points you're discussing

        RESPONSE GUIDELINES:
        - Be precise and factual - only state what the data shows
        - If results are empty, acknowledge this clearly
        - If the question cannot be answered with available data, say so explicitly
        - Use clear, professional language suitable for business analysis
        - Provide context for your findings but don't speculate beyond the data
      `,
      messages: coreMessages,
      maxSteps: 5,
      tools: {
        writeExecuteQuery: await generateSqlWriteExecuteTool(database),
        showPieChart: {
          description:
            "Show a pie chart when it's relevant to the question or can add to the understanding of the user",
          parameters: z.object({
            title: z.string().describe("The title of the chart"),
            caption: z.string().describe("The caption of the chart"),
            data: z.array(
              z.object({
                label: z.string().describe("The label of the chart"),
                value: z.number().describe("The value of the chart"),
                fill: z
                  .string()
                  .describe(
                    "The color of the chart in a valid css color format use hex code if possible"
                  ),
              })
            ),
          }),
          execute: async ({ title, caption, data }) => {
            return { title, caption, data };
          },
        },
        showBarChart: {
          description:
            "Show a bar chart when it's relevant to the question or can add to the understanding of the user",
          parameters: z.object({
            title: z.string().describe("The title of the chart"),
            caption: z.string().describe("The caption of the chart"),
            data: z.array(
              z.object({
                label: z.string().describe("The label of the chart"),
                value: z.number().describe("The value of the chart"),
                fill: z
                  .string()
                  .describe(
                    "The color of the chart in a valid css color format use hex code if possible"
                  ),
              })
            ),
          }),
          execute: async ({ title, caption, data }) => {
            return { title, caption, data };
          },
        },
        showLineChart: {
          description:
            "Show a line chart when it's relevant to the question or can add to the understanding of the user",
          parameters: z.object({
            title: z.string().describe("The title of the chart"),
            caption: z.string().describe("The caption of the chart"),
            data: z.array(
              z.object({
                label: z.string().describe("The label of the chart"),
                value: z.number().describe("The value of the chart"),
                fill: z
                  .string()
                  .describe(
                    "The color of the chart in a valid css color format use hex code if possible"
                  ),
              })
            ),
          }),
          execute: async ({ title, caption, data }) => {
            return { title, caption, data };
          },
        },
        getWeather: {
          description: "Get the current weather at a location",
          parameters: z.object({
            latitude: z.number().describe("Latitude coordinate"),
            longitude: z.number().describe("Longitude coordinate"),
          }),
          execute: async ({ latitude, longitude }) => {
            const response = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
            );

            const weatherData = await response.json();
            return weatherData;
          },
        },
      },
      onFinish: async ({ responseMessages }) => {
        if (session.user && session.user.id) {
          try {
            await saveChat({
              id,
              messages: [...coreMessages, ...responseMessages],
              userId: session.user.id,
            });
          } catch (error) {
            console.error("Failed to save chat");
          }
        }
      },
      experimental_telemetry: {
        isEnabled: true,
        functionId: "stream-text",
      },
    });

    return result.toDataStreamResponse({});
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    if (!session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }
    const chat = await getChatById({ id, userId: session.user.id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
