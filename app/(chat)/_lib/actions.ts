"use server";

import { auth } from "@/app/(auth)/auth";
import { createChat } from "@/db/queries";
import { createDatabase } from "@/db/repositories/databases";
import { DataSource } from "typeorm";
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

  let datasource: DataSource;

  if (provider === "sqlite") {
    datasource = new DataSource({
      type: "sqlite",
      database: connectionString,
    });
  } else {
    datasource = new DataSource({
      type: provider as any,
      url: connectionString,
    });
  }

  try {
    await datasource.initialize();
    return { success: true };
  } catch (error) {
    return { error: (error as Error).message };
  } finally {
    if (datasource.isInitialized) {
      await datasource.destroy();
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
  const database = await createDatabase({
    id: generateUUID(),
    chatId,
    name,
    description,
    connectionString,
    type,
  });

  return { database };
}
