import { Node } from "@xyflow/react";
import { CoreMessage } from "ai";
import { notFound } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import DashboardPanel from "@/components/common/dashboard-panel/dashboard-panel";
import { Chat as PreviewChat } from "@/components/custom/chat";
import ChatSessionTools from "@/components/custom/chat-session-tools";
import { Navbar } from "@/components/custom/navbar";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "@/components/ui/resizable";
import { getChatById } from "@/db/queries";
import { getChatDatabase } from "@/db/repositories/databases";
import { Chat } from "@/db/schema";
import { convertToUIMessages } from "@/lib/utils";

import DatabaseConnectionDialog from "./_components/database-connection-dialog/database-connection-dialog";

// Updated interface for Next.js 15+ - params is now a Promise
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const chatFromDb = await getChatById({ id, userId: session.user.id });

  if (!chatFromDb) {
    notFound();
  }

  const chat: Chat = {
    ...chatFromDb,
    messages: convertToUIMessages(chatFromDb.messages as Array<CoreMessage>),
  };

  const database = await getChatDatabase(chat.id);

  return (
    <div className="relative w-full h-screen">
      <Navbar tools={<ChatSessionTools chat={chat as any} />} />
      <main className="h-full">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel>
            <div className="px-4 size-full">
              <DashboardPanel
                chatId={chat.id}
                dashboardNodes={chat.dashboard as Node[]}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel minSize={35} maxSize={60} defaultSize={35}>
            <PreviewChat
              id={chat.id}
              initialMessages={chat.messages}
              database={database}
            />
            {/* <DatabaseConnectionDialog chatId={chat.id} database={database} /> */}
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
