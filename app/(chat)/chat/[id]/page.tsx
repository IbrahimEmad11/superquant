import { CoreMessage } from "ai";
import { notFound } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { Chat as PreviewChat } from "@/components/custom/chat";
import { getChatById } from "@/db/queries";
import { Chat } from "@/db/schema";
import { convertToUIMessages } from "@/lib/utils";

import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "@/components/ui/resizable";
import { getChatDatabase } from "@/db/repositories/databases";
import { DatabaseConnectionDialog } from "./_components/database-connection-dialog/database-connection-dialog";

export default async function Page({ params }: { params: Promise<any> }) {
  const { id } = await params;
  const chatFromDb = await getChatById({ id });

  if (!chatFromDb) {
    notFound();
  }

  // type casting and converting messages to UI messages
  const chat: Chat = {
    ...chatFromDb,
    messages: convertToUIMessages(chatFromDb.messages as Array<CoreMessage>),
  };

  const session = await auth();

  if (!session || !session.user) {
    return notFound();
  }

  if (session.user.id !== chat.userId) {
    return notFound();
  }

  const database = await getChatDatabase(chat.id);

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel>
        <div className="my-12 size-full"></div>
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel minSize={35} maxSize={60} defaultSize={35}>
        <PreviewChat
          id={chat.id}
          initialMessages={chat.messages}
          database={database}
        />
        <DatabaseConnectionDialog chatId={chat.id} database={database} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
