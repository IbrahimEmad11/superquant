
import { Node } from "@xyflow/react";
import { CoreMessage } from "ai";
import { and, eq, ne } from "drizzle-orm";
import { Share2, Eye, BarChart3, MessageSquare, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";

import DashboardPanel from "@/components/common/dashboard-panel/dashboard-panel";
import { ChatMessages } from "@/components/custom/chat-messages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { db } from "@/db/queries";
import { chat } from "@/db/schema";
import { convertToUIMessages } from "@/lib/utils";


interface PageProps {
  params: Promise<{ shareId: string }>;
}

export default async function SharedChatPage({ params }:  PageProps ) {
  const { shareId } = await params;

  if (!shareId) {
    notFound();
  }

  const sharedChatData = await db.query.chat.findFirst({
    where: and(
      eq(chat.shareId, shareId),
      ne(chat.shareMode, 'private') 
    ),
  });

  if (!sharedChatData) {
    notFound();
  }

  const uiMessages = convertToUIMessages(sharedChatData.messages as Array<CoreMessage>);

  return (
    <div className="flex flex-col h-screen bg-background pt-16">
      {/* Responsive Header */}
      <header className="relative overflow-hidden border-b border-border bg-gradient-to-r from-background via-red-50/10 to-background dark:from-gray-950 dark:via-red-950/5 dark:to-black shrink-0">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(239,68,68,0.04),transparent_60%)] dark:bg-[radial-gradient(circle_at_30%_40%,rgba(239,68,68,0.08),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(156,163,175,0.02),transparent_50%)] dark:bg-[radial-gradient(circle_at_70%_60%,rgba(156,163,175,0.05),transparent_50%)]" />
        </div>
        
        <div className="relative px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Left: Title and Status */}
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-muted border border-border">
                <Share2 className="size-4 text-red-600 dark:text-red-500" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  Shared Analysis
                </h1>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="size-3" />
                    Read-only
                  </span>
                  <Badge variant="outline" className="h-5 text-xs px-2 bg-muted border-border">
                    {sharedChatData.shareMode === 'dashboard' ? (
                      <>
                        <BarChart3 className="size-3 mr-1 text-red-600 dark:text-red-500" />
                        Dashboard
                      </>
                    ) : (
                      <>
                        <MessageSquare className="size-3 mr-1 text-red-600 dark:text-red-500" />
                        Full Chat
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Right: Action */}
            <Button asChild size="sm" className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white border-0 h-8 px-3 text-xs">
              <a href="/" className="flex items-center gap-1.5">
                Create Your Own
                <ArrowRight className="size-3" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Content based on share mode */}
      {sharedChatData.shareMode === 'dashboard' && (
        <main className="flex-1 p-4">
          <DashboardPanel
            chatId={sharedChatData.id}
            dashboardNodes={sharedChatData.dashboard as Node[]}
            isReadOnly={true} 
          />
        </main>
      )}

      {sharedChatData.shareMode === 'full' && (
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel>
            <div className="p-4 h-full">
              <DashboardPanel
                chatId={sharedChatData.id}
                dashboardNodes={sharedChatData.dashboard as Node[]}
                isReadOnly={true}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel minSize={20} maxSize={60} defaultSize={35}> 
            <div className="p-4 h-full overflow-y-auto">
              <ChatMessages initialMessages={uiMessages} isReadOnly={true} chatId={sharedChatData.id} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}