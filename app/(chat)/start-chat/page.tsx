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

import StartChatDialogWrapper from "./_components/start-chat-dialog-wrapper";

// Temp placeholder chat ID for the start page
const TEMP_CHAT_ID = "temp-start-chat";

export default async function StartChatPage() {
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  return (
    <div className="relative w-full h-screen">
      <Navbar tools={<ChatSessionTools chat={undefined} />} />
      <main className="h-full">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel>
            <div className="px-4 size-full">
              <DashboardPanel chatId={TEMP_CHAT_ID} dashboardNodes={[]} />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel minSize={35} maxSize={60} defaultSize={35}>
            <PreviewChat
              id={TEMP_CHAT_ID}
              initialMessages={[]}
              database={null}
            />
            <StartChatDialogWrapper />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}