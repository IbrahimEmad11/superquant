// FILE: components/dialogs/share-dialog.tsx (new file)

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CopyIcon, LinkIcon, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { updateChatSharing } from "@/app/(chat)/_lib/actions";

interface ShareDialogProps {
  chatId: string;
  initialIsPublic: boolean;
  initialShareId: string | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function ShareDialog({
  chatId,
  initialIsPublic,
  initialShareId,
  isOpen,
  onOpenChange,
}: ShareDialogProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [shareId, setShareId] = useState(initialShareId);
  const [isPending, startTransition] = useTransition();

  const shareUrl = shareId ? `${window.location.origin}/share/${shareId}` : "";

  const handleToggleSharing = (checked: boolean) => {
    startTransition(async () => {
      const result = await updateChatSharing(chatId, checked);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setIsPublic(checked);
      setShareId(result.shareId);
      toast.success(checked ? "Sharing is now enabled!" : "Sharing has been disabled.");
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Dashboard</DialogTitle>
          <DialogDescription>
            Anyone with the link will be able to view a read-only version of this chat and dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="share-toggle"
              checked={isPublic}
              onCheckedChange={handleToggleSharing}
              disabled={isPending}
            />
            <Label htmlFor="share-toggle" className="font-medium">
              {isPending ? "Updating..." : "Enable public link"}
            </Label>
            {isPending && <Loader2 className="animate-spin h-4 w-4" />}
          </div>

          {isPublic && shareUrl && (
            <div className="flex items-center space-x-2">
              <div className="flex-1 p-2 border rounded-md bg-muted text-sm truncate">
                <LinkIcon className="inline-block h-4 w-4 mr-2" />
                {shareUrl}
              </div>
              <Button size="icon" variant="ghost" onClick={handleCopyLink}>
                <CopyIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}