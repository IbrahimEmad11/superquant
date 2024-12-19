import { eq } from "drizzle-orm";
import { db } from "../queries";
import { database, Database } from "../schema";

export async function createDatabase(resource: Database) {
  try {
    return await db.insert(database).values(resource);
  } catch (error) {
    console.error("Failed to create database");
    throw error;
  }
}

export async function getChatDatabase(chatId: string) {
  const [selectedDatabase] = await db
    .select()
    .from(database)
    .where(eq(database.chatId, chatId));
  return selectedDatabase;
}
