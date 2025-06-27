"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { DataSource } from "typeorm";

import { auth, signOut } from "@/app/(auth)/auth";
import { db , createChat } from "@/db/queries";
import { createDatabase } from "@/db/repositories/databases";
import { chat } from "@/db/schema";
import { InMemorySQLiteHandler } from "@/lib/sqlite-handler";
import { generateUUID } from "@/lib/utils";

export async function createChatAction(id: string) {
  const session = await auth();
  if (!session?.user || !session.user.id) {
    return { error: "Unauthorized" };
  }
  await createChat({ id, userId: session.user.id });
}

export async function testDatabaseConnection(
  provider: string,
  connectionString: string
) {
  const session = await auth();
  if (!session?.user || !session.user.id) {
    return { error: "Unauthorized" };
  }

  // Handle SQLite differently since it uses Vercel Blob URLs
  if (provider === "sqlite") {
    try {
      return await InMemorySQLiteHandler.testConnection(connectionString);
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : "SQLite connection failed" 
      };
    }
  }

  // Handle PostgreSQL and MySQL with TypeORM
  let datasource: DataSource;
  
  try {
    datasource = new DataSource({
      type: provider as any,
      url: connectionString,
      // Add connection options for better serverless compatibility
      extra: {
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 10000,
        max: 1, // Limit connections in serverless
      }
    });

    await datasource.initialize();
    
    // Test with a simple query
    await datasource.query("SELECT 1");
    
    return { success: true };
  } catch (error) {
    console.error(`Database connection test failed for ${provider}:`, error);
    return { 
      error: error instanceof Error ? error.message : "Connection failed" 
    };
  } finally {
    if (datasource! && datasource.isInitialized) {
      try {
        await datasource.destroy();
      } catch (destroyError) {
        console.warn('Error destroying datasource:', destroyError);
      }
    }
  }
}

export async function connectDatabaseToChat(
  chatId: string,
  name: string,
  description: string,
  connectionString: string,
  type: string
) {
  const session = await auth();
  if (!session?.user || !session.user.id) {
    return { error: "Unauthorized" };
  }

  // Test connection before saving
  const testResult = await testDatabaseConnection(type, connectionString);
  if ('error' in testResult) {
    return { error: `Connection test failed: ${testResult.error}` };
  }

  try {
    const database = await createDatabase({
      id: generateUUID(),
      chatId,
      name,
      description,
      connectionString,
      type,
    });
    
    return { database };
  } catch (error) {
    console.error('Error creating database:', error);
    return { 
      error: error instanceof Error ? error.message : "Failed to create database" 
    };
  }
}

type ShareMode = 'private' | 'dashboard' | 'full';

export async function updateChatSharing(chatId: string, mode: ShareMode) {
  const session = await auth();
  if (!session?.user?.id) { return { error: "Unauthorized" }; }

  try {
    const existingChat = await db.query.chat.findFirst({
      where: and(eq(chat.id, chatId), eq(chat.userId, session.user.id)),
    });

    if (!existingChat) { return { error: "Chat not found." }; }

    // If sharing is being enabled, use existing shareId or create a new one.
    // If sharing is being turned off, nullify it.
    const isTurningOnSharing = mode === 'dashboard' || mode === 'full';
    const newShareId = isTurningOnSharing ? (existingChat.shareId || generateUUID()) : null;

    await db.update(chat)
      .set({
        shareMode: mode,
        shareId: newShareId,
      })
      .where(eq(chat.id, chatId));

    revalidatePath(`/chat/${chatId}`);
    return { success: true, shareId: newShareId, shareMode: mode };
  } catch (error) {
    console.error("Failed to update chat sharing:", error);
    return { error: "An unexpected error occurred." };
  }
}

export async function signOutAction() {
  await signOut({
    redirectTo: "/",
  });
}