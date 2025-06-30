import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import { deleteChatById, getChatById, saveChat } from "@/db/queries";
import { getChatDatabase } from "@/db/repositories/databases";

// LLM tools
import { generateSqlWriteExecuteTool } from "./_lib/tools/sql-write-execute";

// Context management functions
function estimateTokenCount(messages: any[]): number {
  let totalTokens = 0;
  for (const message of messages) {
    if (typeof message.content === 'string') {
      totalTokens += Math.ceil(message.content.length / 3.5);
    } else if (Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === 'text' && typeof part.text === 'string') {
          totalTokens += Math.ceil(part.text.length / 3.5);
        }
      }
    }
    // Account for message metadata
    totalTokens += 15;
  }
  return totalTokens;
}

function manageContext(messages: any[], maxContextTokens: number = 100000) {
  let currentMessages = [...messages];
  let estimatedTokens = estimateTokenCount(currentMessages);
  if (estimatedTokens <= maxContextTokens) {
    return currentMessages;
  }
  
  console.log(`Context management: ${estimatedTokens} tokens, limit: ${maxContextTokens}`);
  
  const systemMessage = currentMessages[0]?.role === 'system' ? currentMessages[0] : null;
  
  if (systemMessage) {

    const nonSystemMessages = currentMessages.slice(1);
    let keptMessages = [systemMessage];
    let runningTokens = estimateTokenCount([systemMessage]);

    for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
      const messageTokens = estimateTokenCount([nonSystemMessages[i]]);
      
      if (runningTokens + messageTokens <= maxContextTokens) {
        keptMessages.splice(1, 0, nonSystemMessages[i]);
        runningTokens += messageTokens;
      } else {
        break;
      }
    }
    
    currentMessages = keptMessages;
  } else {
    let keptMessages = [];
    let runningTokens = 0;
    
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      const messageTokens = estimateTokenCount([currentMessages[i]]);
      
      if (runningTokens + messageTokens <= maxContextTokens) {
        keptMessages.unshift(currentMessages[i]);
        runningTokens += messageTokens;
      } else {
        break;
      }
    }
    currentMessages = keptMessages;
  }
  
  // Only truncate individual messages if we're still over limit
  estimatedTokens = estimateTokenCount(currentMessages);
  if (estimatedTokens > maxContextTokens) {
    // Truncate the longest non-system messages first
    currentMessages = currentMessages.map((msg, index) => {
      if (msg.role === 'system') return msg; 
      
      if (typeof msg.content === 'string' && msg.content.length > 5000) {
        return {
          ...msg,
          content: msg.content.substring(0, 4000) + "\n\n...[Message truncated for context management]"
        };
      }
      return msg;
    });
  }
  
  const finalTokens = estimateTokenCount(currentMessages);
  console.log(`Context after management: ${finalTokens} tokens (${currentMessages.length} messages)`);
  
  return currentMessages;
}

export async function POST(request: Request) {
  try {
    // Parse request body
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
    if (messages.length > 100) { // Increased from 50 since we can handle more context
      return new Response("Too many messages in request", { status: 400 });
    }

    // AUTHENTICATION
    const session = await auth();
    if (!session || !session.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    // PROCESS MESSAGES
    const coreMessages = convertToCoreMessages(messages).filter(
      (message) => message.content.length > 0
    );

    const managedMessages = manageContext(coreMessages, 100000);

    // DATABASE ACCESS
    const database = await getChatDatabase(id);
    if (!database) {
      return new Response("Database not found", { status: 404 });
    }

    // SECURITY: Validate database access permissions
    // Add additional database access validation here if needed

    const result = await streamText({
      model: openai("gpt-4o-mini"),
      temperature: 0.5,
      system: `
        You are a data analysis expert providing clear and insightful answers. You have access to a database called "${database.name}" which is described as: "${database.description}". It's a ${database.type} database.

        You have access to the full conversation history to maintain context about:
        - Previous queries and their results
        - Ongoing analysis threads
        - User preferences and requirements
        - Database schema discoveries

        CRITICAL SAFETY RULES - ALWAYS FOLLOW THESE:
        1. NEVER expose sensitive information like passwords, API keys, personal identifiers, or connection strings
        2. NEVER execute queries that could modify, delete, or insert data (only SELECT statements)
        3. NEVER reveal database connection details, table structures beyond what's needed for analysis
        4. If asked about system tables, internal schemas, or metadata, politely decline
        5. If a query fails, explain the issue without revealing internal error details
        6. Always validate that your analysis is based on actual data returned from queries
        7. If no data is found, clearly state "No data available" rather than making assumptions

        CONTEXT AWARENESS:
        - Reference previous queries and results when relevant
        - Build upon earlier analysis
        - Remember user's specific interests and requirements
        - Maintain consistency in your analysis approach

        WORKFLOW - FOLLOW THIS EXACT SEQUENCE:
        1. Write and execute a SQL query using the "writeExecuteQuery" tool
           - For scatter plots and large datasets: ALWAYS use LIMIT (e.g., LIMIT 50-100)
           - Use aggregation (GROUP BY, AVG, SUM, COUNT) when possible for better insights
        2. Analyze the actual results returned - do not make assumptions about data not returned
        3. Provide detailed explanations based ONLY on the query results
        4. If visualization would help understanding, create appropriate charts using "showChart"
        5. Always cite the specific data points you're discussing

        CHART DATA OPTIMIZATION:
        - Keep data points under 100 for performance and context management
        - For scatter plots, sample or aggregate data meaningfully
        - Truncate long labels to keep charts readable
      `,
      messages: managedMessages,
      maxSteps: 5,
      tools: {
        writeExecuteQuery: await generateSqlWriteExecuteTool(database),
        
        showChart: {
          description: "Show various types of charts when relevant to the question or can add to the understanding of the user",
          parameters: z.object({
            type: z.enum([
              "pie", "bar", "line", "area", "scatter", "donut", "stackedBar", "radar"
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
                y: z.number().optional().describe("The y-axis value for scatter charts"),
                fill: z.string().describe("The color of the chart in a valid css color format (hex code preferred)"),
              })
            ).max(100).describe("Chart data - limit to 100 points maximum"),
          }),
          execute: async ({ type, title, caption, data }) => {
            const limitedData = data.slice(0, 100);
            
            interface ChartDataItem {
              label: string;
              value: number;
              value2?: number;
              value3?: number;
              x?: number;
              y?: number;
              fill?: string;
            }

            interface ProcessedChartDataItem {
              label: string;
              value?: number;
              value2?: number;
              value3?: number;
              x?: number;
              y?: number;
              fill: string;
            }

            const processedData: ProcessedChartDataItem[] = limitedData.map((item: ChartDataItem, index: number): ProcessedChartDataItem => {
              const truncatedLabel: string = item.label.length > 25 ? 
                item.label.substring(0, 25) + "..." : 
                item.label;
              
              const baseItem: ProcessedChartDataItem = {
                label: truncatedLabel,
                value: item.value,
                fill: item.fill || `hsl(${index * 360 / limitedData.length}, 70%, 50%)`
              };

              if (type === 'scatter') {
                return {
                  label: truncatedLabel,
                  x: item.x ?? item.value,
                  y: item.y ?? item.value,
                  fill: baseItem.fill
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

            const wasLimited = data.length > 100;
            const finalCaption = wasLimited ? 
              `${caption} (Showing first 100 of ${data.length} data points)` : 
              caption;

            return { type, title, caption: finalCaption, data: processedData };
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
            return await response.json();
          },
        },
      },
      onFinish: async ({ responseMessages }) => {
        if (session.user?.id) {
          try {
            await saveChat({
              id,
              messages: [...managedMessages, ...responseMessages],
              userId: session.user.id,
            });
          } catch (error) {
            console.error("Failed to save chat:", error);
          }
        }
      },
      experimental_telemetry: {
        isEnabled: true,
        functionId: "stream-text",
      },
    });

    // RATE LIMITING: Add rate limiting headers to response
    const response = result.toDataStreamResponse({});
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', '99'); // This should be calculated based on user/IP
    
    return response;

  } catch (error) {
    console.error("API Error:", error);
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
    console.error("Delete Error:", error);
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}