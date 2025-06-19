// FILE: components/custom/chat-session-tools.tsx

"use client";

import { useState } from "react"; // <-- Import useState
import { usePathname } from "next/navigation";
import { Button } from "../ui/button";
import { SaveIcon, Share2Icon } from "lucide-react";
import useDashboardStore from "@/hooks/use-dashboard-store";
import { toast } from "sonner";
import { updateChatDashboardAction } from "@/app/(chat)/chat/[id]/_lib/actions";
import { ShareDialog } from "@/components/dialogs/share-dialog"; // <-- Import your new dialog

// You'll need to pass the chat's sharing info as props
interface ChatSessionToolsProps {
  chat: {
    id: string;
    isPublic: boolean;
    shareId: string | null;
  };
}

export default function ChatSessionTools({ chat }: ChatSessionToolsProps) {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false); // <-- Add state for dialog
  const { nodes } = useDashboardStore();
  const pathname = usePathname();

  const onSave = async () => {
    // ... your existing save logic
  };

  return (
    <>
      <div className="flex flex-row gap-2 items-center">
        <Button variant="outline" onClick={onSave}>
          <SaveIcon className="size-4 mr-2" />
          <span>Save</span>
        </Button>
        <Button variant="outline" onClick={() => setIsShareDialogOpen(true)}> {/* <-- Wire up onClick */}
          <Share2Icon className="size-4 mr-2" />
          <span>Share</span>
        </Button>
      </div>

      {/* Render the dialog component */}
      <ShareDialog
        isOpen={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        chatId={chat.id}
        initialIsPublic={chat.isPublic}
        initialShareId={chat.shareId}
      />
    </>
  );
}