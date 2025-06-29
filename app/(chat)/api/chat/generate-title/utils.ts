import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import type { CoreMessage } from "ai";

export async function generateChatTitle(
    messages: CoreMessage[],
    database?: { name: string; description?: string } | null
    ): Promise<string> {
  try {
    const contextMessages = messages.slice(0, 4);
    
    const conversationContext = contextMessages
      .map((msg) => {
        if (typeof msg.content === 'string') {
          return `${msg.role}: ${msg.content}`;
        } else if (Array.isArray(msg.content)) {
          return `${msg.role}: ${msg.content
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join(' ')}`;
        }
        return `${msg.role}: [content]`;
      })
      .join('\n');

    let databaseContext = '';
    if (database?.name) {
        databaseContext = `\nDatabase: ${database.name}`;
        if (database.description) {
          databaseContext += ` - ${database.description}`;
        }
      }

    const { text } = await generateText({
      model: openai("gpt-3.5-turbo"),
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `Generate a concise title for the conversation. 
          
Rules:
- Maximum 6 words only
- No quotation marks
- Include database context when relevant
- Be specific but brief
- Prioritize the main topic/action

Examples:
- "Customer DB Sales Analysis"
- "Orders Database Query Help"
- "User Data Performance Issues"
- "Product Schema Design Review"
- "Analytics DB Report Generation"`,
        },
        {
          role: "user",
          content: `Generate a title for this conversation:\n\n${conversationContext}`,
        },
      ],
    });

    // Clean and limit to 6 words
    const cleanTitle = text
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\n/g, ' ')
      .split(/\s+/)
      .slice(0, 6)
      .join(' ');

    return cleanTitle || "New Chat";
  } catch (error) {
    console.error("Failed to generate chat title:", error);
    return generateFallbackTitle(messages);
  }
}

  function generateFallbackTitle(
    messages: CoreMessage[], 
    database?: { name: string; description?: string } | null
  ): string {
    const firstUserMessage = messages.find((msg) => msg.role === 'user');
    
    if (!firstUserMessage) {
      return database?.name ? `${database.name} Chat` : "New Chat";
    }

    let content = '';
    if (typeof firstUserMessage.content === 'string') {
      content = firstUserMessage.content;
    } else if (Array.isArray(firstUserMessage.content)) {
      content = firstUserMessage.content
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join(' ');
    }

    if (!content) {
      return database?.name ? `${database.name} Chat` : "New Chat";
    }

    const words = content.trim().split(/\s+/);
    const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'way', 'she', 'too'];
    
    const meaningfulWords = words.filter(word => 
      word.length > 2 && !stopWords.includes(word.toLowerCase())
    );

    let title = meaningfulWords.slice(0, 4).join(' '); // Leave room for DB name

    if (database?.name && title) {
      const dbPrefix = database.name.length > 10 
        ? database.name.substring(0, 8) + '...' 
        : database.name;
      title = `${dbPrefix} ${title}`;
    }

    return title || (database?.name ? `${database.name} Chat` : "New Chat");
  }