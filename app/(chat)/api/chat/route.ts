import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import { deleteChatById, getChatById, saveChat } from "@/db/queries";

// LLM tools
import { getChatDatabase } from "@/db/repositories/databases";

import { generateSqlWriteExecuteTool } from "./_lib/tools/sql-write-execute";

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } =
    await request.json();

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

  const result = await streamText({
    model: openai("gpt-3.5-turbo"),
    temperature: 0.5,
    system: `
      You are a data analysis expert providing clear and insightful answers. The ideal workflow is:
      0. The data you have access to is in the database called ${database.name} and the description of the data is: ${database.description}. It's a ${database.type} database.
      1. Write a SQL query, execute it and get the results: tool called "writeExecuteQuery"
      2. Explain the results in details and be verbose
      3. Try as much as possible to visualize the results with a chart if it's relevant to the question or can add to the understanding of the user:
        3.1 Pie charts are best used for visualizing the composition, comparison or proportional breakdown of a whole.  Use the tool called "showPieChart" to show a pie chart
        3.2 Bar charts are best used for visualizing the comparison of different categories or values. Use the tool called "showBarChart" to show a bar chart
        3.3 Line charts are best used for visualizing trends over time. Use the tool called "showLineChart" to show a line chart
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
