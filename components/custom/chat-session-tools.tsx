"use client";

import { usePathname } from "next/navigation";
import { Button } from "../ui/button";
import { SaveIcon, Share2Icon } from "lucide-react";
import useDashboardStore from "@/hooks/use-dashboard-store";
import { toast } from "sonner";
import { updateChatDashboardAction } from "@/app/(chat)/chat/[id]/_lib/actions";

export default function ChatSessionTools() {
  const pathname = usePathname();
  const { nodes } = useDashboardStore();

  const chatId = pathname.split("/")[2];

  if (!chatId) return null;

  const onSave = async () => {
    toast.promise(updateChatDashboardAction(chatId, nodes), {
      loading: "Saving...",
      success: "Saved!",
      error: "Failed to save",
    });
  };

  return (
    <div className="flex flex-row gap-2 items-center">
      <Button variant="outline" onClick={onSave}>
        <SaveIcon className="size-4 mr-2" />
        <span>Save</span>
      </Button>
      <Button variant="outline">
        <Share2Icon className="size-4 mr-2" />
        <span>Share</span>
      </Button>
    </div>
  );
}
