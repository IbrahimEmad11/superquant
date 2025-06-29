import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import { deleteChatById, getChatById, saveChat } from "@/db/queries";

// LLM tools
import { getChatDatabase } from "@/db/repositories/databases";

import { generateSqlWriteExecuteTool } from "./_lib/tools/sql-write-execute";

// Context management function
function truncateMessages(messages: any[], maxTokens: number = 12000) {
  if (messages.length <= 4) return messages;
  
  // Keep system message (if first message is system) and last 4 messages
  const systemMessage = messages[0];
  const isSystemMessage = systemMessage.role === 'system';
  
  if (isSystemMessage && messages.length > 5) {
    // Keep system message + last 4 user/assistant messages
    return [systemMessage, ...messages.slice(-4)];
  } else if (messages.length > 4) {
    // No system message, just keep last 4 messages
    return messages.slice(-4);
  }
  
  return messages;
}

// Estimate token count (rough approximation)
function estimateTokenCount(messages: any[]): number {
  let totalTokens = 0;
  for (const message of messages) {
    if (typeof message.content === 'string') {
      // Rough estimation: 1 token ≈ 4 characters
      totalTokens += Math.ceil(message.content.length / 4);
    } else if (Array.isArray(message.content)) {
      // Handle multi-part content
      for (const part of message.content) {
        if (part.type === 'text' && typeof part.text === 'string') {
          totalTokens += Math.ceil(part.text.length / 4);
        }
      }
    }
    // Add some tokens for role and metadata
    totalTokens += 10;
  }
  return totalTokens;
}

// Smart context management with more aggressive optimization
function manageContext(messages: any[], maxContextTokens: number = 10000) { // Reduced from 12000 to 10000
  let currentMessages = [...messages];
  let estimatedTokens = estimateTokenCount(currentMessages);
  
  // If we're within limits, return as is
  if (estimatedTokens <= maxContextTokens) {
    return currentMessages;
  }
  
  console.log(`Context management: ${estimatedTokens} tokens, limit: ${maxContextTokens}`);
  
  // More aggressive truncation strategy
  const systemMessage = currentMessages[0]?.role === 'system' ? currentMessages[0] : null;
  
  // Keep system message + last 3 messages (reduced from last 4)
  if (systemMessage && currentMessages.length > 4) {
    currentMessages = [systemMessage, ...currentMessages.slice(-3)];
  } else if (currentMessages.length > 3) {
    currentMessages = currentMessages.slice(-3);
  }
  
  // If still too large, truncate message content
  estimatedTokens = estimateTokenCount(currentMessages);
  if (estimatedTokens > maxContextTokens) {
    currentMessages = currentMessages.map(msg => {
      if (typeof msg.content === 'string' && msg.content.length > 2000) {
        return {
          ...msg,
          content: msg.content.substring(0, 2000) + "...[truncated for context management]"
        };
      }
      return msg;
    });
  }
  
  const finalTokens = estimateTokenCount(currentMessages);
  console.log(`Context after management: ${finalTokens} tokens`);
  
  return currentMessages;
}

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

  // Apply context management with more conservative limit
  const managedMessages = manageContext(coreMessages, 12000); 

  const database = await getChatDatabase(id);
  console.log(database);

  if (!database) {
    return new Response("Database not found", { status: 404 });
  }

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    temperature: 0.5,
    system: `
      You are a data analysis expert providing clear and insightful answers. The ideal workflow is:
      0. The data you have access to is in the database called ${database.name} and the description of the data is: ${database.description}. It's a ${database.type} database.
      1. Write a SQL query, execute it and get the results: tool called "writeExecuteQuery"
         IMPORTANT SQL GUIDELINES:
         - For scatter plots and large datasets: ALWAYS use LIMIT (e.g., LIMIT 50-100 for scatter plots)
         - For scatter plots, prefer sampling with ORDER BY RANDOM() LIMIT 50 or meaningful aggregation
         - Avoid querying thousands of individual records for visualization
         - Use aggregation (GROUP BY, AVG, SUM, COUNT) when possible for better insights
      2. Explain the results in details and be verbose
      3. Try as much as possible to visualize the results with a chart if it's relevant to the question or can add to the understanding of the user:
        - Use the "showChart" tool with appropriate chart type
        - Pie/Donut charts: for composition, comparison or proportional breakdown
        - Bar charts: for comparing categories or values
        - Line charts: for trends over time
        - Area charts: for cumulative data or trends with magnitude emphasis
        - Scatter charts: for relationship between two variables (LIMIT data to 50-100 points)
        - StackedBar charts: for parts of a whole across categories
        - Radar charts: for comparing multiple quantitative variables
        
      CHART DATA OPTIMIZATION:
      - Keep data points under 100 for performance and context management
      - For scatter plots, sample or aggregate data meaningfully
      - Truncate long labels to keep charts readable
    `,
    messages: managedMessages,
    maxSteps: 5,
    tools: {
      writeExecuteQuery: await generateSqlWriteExecuteTool(database),
      
      // Consolidated chart tool replacing all 9 individual chart tools
      showChart: {
        description: "Show various types of charts when relevant to the question or can add to the understanding of the user",
        parameters: z.object({
          type: z.enum([
            "pie", 
            "bar", 
            "line", 
            "area", 
            "scatter", 
            "donut", 
            "stackedBar", 
            "radar"
          ]).describe("The type of chart to display"),
          title: z.string().describe("The title of the chart"),
          caption: z.string().describe("The caption of the chart"),
          data: z.array(
            z.object({
              label: z.string().describe("The label of the chart (keep concise)"),
              value: z.number().describe("The primary value of the chart"),
              value2: z.number().optional().describe("The secondary value for stacking (stackedBar only)"),
              value3: z.number().optional().describe("The tertiary value for stacking (stackedBar only)"),
              x: z.number().optional().describe("The x-axis value for scatter charts"),
              y: z.number().optional().describe("The y-axis value for scatter charts (will use value if not provided)"),
              fill: z.string().describe("The color of the chart in a valid css color format (hex code preferred)"),
            })
          ).max(100).describe("Chart data - limit to 100 points maximum for performance and context management"),
        }),
        execute: async ({ type, title, caption, data }) => {
          // Limit data points to prevent context overflow
          const limitedData = data.slice(0, 100);
          
          // Process data based on chart type
          const processedData = limitedData.map((item: { label: string; value: any; fill: any; x: any; y: any; value2: any; value3: any; }, index: number) => {
            // Truncate long labels to save tokens
            const truncatedLabel = item.label.length > 25 ? 
              item.label.substring(0, 25) + "..." : 
              item.label;
            
            const baseItem = {
              label: truncatedLabel,
              value: item.value,
              fill: item.fill || `hsl(${index * 360 / limitedData.length}, 70%, 50%)` // Generate color if not provided
            };

            // Add type-specific properties
            if (type === 'scatter') {
              return {
                label: truncatedLabel,
                x: item.x ?? item.value, // Use value as x if x not provided
                y: item.y ?? item.value, // Use value as y if y not provided
                fill: baseItem.fill
                // Note: Removed redundant 'value' property for scatter plots to save tokens
              };
            }

            if (type === 'stackedBar') {
              return {
                ...baseItem,
                value2: item.value2,
                value3: item.value3
              };
            }

            return baseItem;
          });

          // Add metadata about data limitation if original data was truncated
          const wasLimited = data.length > 100;
          const finalCaption = wasLimited ? 
            `${caption} (Showing first 100 of ${data.length} data points)` : 
            caption;

          return { 
            type, 
            title, 
            caption: finalCaption, 
            data: processedData 
          };
        },
      },

      // Keep the weather tool if you need it
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
            messages: [...managedMessages, ...responseMessages], // Save managed messages
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
