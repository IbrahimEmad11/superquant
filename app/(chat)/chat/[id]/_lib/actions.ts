"use server";

import { updateChatDashboard } from "@/db/queries";
import { Node } from "@xyflow/react";
import { revalidatePath } from "next/cache";

export async function updateChatDashboardAction(
  chatId: string,
  dashboard: Node[]
) {
  await updateChatDashboard({ chatId, dashboard });
  revalidatePath(`/chat/[id]`, "page");
}
