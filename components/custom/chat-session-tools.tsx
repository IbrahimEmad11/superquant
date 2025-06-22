"use client";

import { SaveIcon, Share2Icon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { updateChatDashboardAction } from "@/app/(chat)/chat/[id]/_lib/actions";
import { ShareDialog } from "@/components/dialogs/share-dialog"; 
import { Chat } from "@/db/schema";
import useDashboardStore from "@/hooks/use-dashboard-store";

import { Button } from "../ui/button";


type ChatForTools = Pick<Chat, 'id' | 'shareMode' | 'shareId'>;
type ShareMode = 'private' | 'dashboard' | 'full';

interface ChatSessionToolsProps {
  chat?: ChatForTools;
}

export default function ChatSessionTools({ chat }: ChatSessionToolsProps) {
  
  
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const { nodes } = useDashboardStore();
  
  if (!chat) {
    return null;
  }
  const onSave = async () => {
    toast.promise(updateChatDashboardAction(chat.id, nodes), {
      loading: "Saving...",
      success: "Saved!",
      error: "Failed to save",
    });
  };

  return (
    <>
      <div className="flex flex-row gap-2 items-center">
        <Button variant="outline" onClick={onSave}>
          <SaveIcon className="size-4 mr-2" />
          <span>Save</span>
        </Button>
        <Button variant="outline" onClick={() => setIsShareDialogOpen(true)}>
          <Share2Icon className="size-4 mr-2" />
          <span>Share</span>
        </Button>
      </div>

      <ShareDialog
        isOpen={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        chatId={chat.id}
        initialShareMode={chat.shareMode as ShareMode}
        initialShareId={chat.shareId}
      />
    </>
  );
}