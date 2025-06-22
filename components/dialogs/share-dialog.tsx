"use client";

import { CopyIcon, LinkIcon, Loader2, Share2, Lock, BarChart3, MessageSquare, Check, Eye } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateChatSharing } from "@/app/(chat)/_lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

type ShareMode = 'private' | 'dashboard' | 'full';

interface ShareDialogProps {
  chatId: string;
  initialShareMode: ShareMode;
  initialShareId: string | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function ShareDialog({
  chatId,
  initialShareMode,
  initialShareId,
  isOpen,
  onOpenChange,
}: ShareDialogProps) {
  const [shareMode, setShareMode] = useState(initialShareMode);
  const [shareId, setShareId] = useState(initialShareId);
  const [isPending, startTransition] = useTransition();
  const [copiedRecently, setCopiedRecently] = useState(false);

  const shareUrl = shareId ? `${window.location.origin}/share/${shareId}` : "";
  const isSharingEnabled = shareMode !== 'private';

  const handleModeChange = (newMode: ShareMode) => {
    startTransition(async () => {
      const result = await updateChatSharing(chatId, newMode);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.shareMode) {
        setShareMode(result.shareMode);
      }
      setShareId(result.shareId ?? null);
      toast.success("Sharing settings updated!");
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedRecently(true);
    setTimeout(() => setCopiedRecently(false), 2000);
    toast.success("Link copied to clipboard!");
  };

  const handleSubmit = () => {
    onOpenChange(false);
  };

  const getShareModeInfo = (mode: ShareMode) => {
    switch (mode) {
      case 'private':
        return {
          icon: Lock,
          title: 'Private',
          description: 'Only you can access this analysis',
        };
      case 'dashboard':
        return {
          icon: BarChart3,
          title: 'Dashboard Only',
          description: 'Share visualizations and charts publicly',
        };
      case 'full':
        return {
          icon: MessageSquare,
          title: 'Full Chat & Dashboard',
          description: 'Share entire conversation and all visualizations',
        };
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Share Analysis</DialogTitle>
          <DialogDescription>
            Choose what you want to share via a public link
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-8 py-4">
          <div className="flex flex-col gap-4">
            <Label>Share Mode</Label>
            <RadioGroup
              value={shareMode}
              onValueChange={handleModeChange}
              disabled={isPending}
              className="flex flex-col gap-2"
            >
              {(['private', 'dashboard', 'full'] as ShareMode[]).map((mode) => {
                const info = getShareModeInfo(mode);
                const Icon = info.icon;
                const isSelected = shareMode === mode;

                return (
                  <div
                    key={mode}
                    onClick={() => !isPending && handleModeChange(mode)}
                    className={cn(
                      "py-4 px-4 border border-muted-foreground rounded-md cursor-pointer text-muted-foreground transition-all duration-500 flex items-start gap-3",
                      isSelected && "bg-primary/10 border-primary text-primary",
                      isPending && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <RadioGroupItem
                      value={mode}
                      id={mode}
                      className="mt-0.5"
                      disabled={isPending}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="size-4" />
                        <Label htmlFor={mode} className="font-medium cursor-pointer">
                          {info.title}
                        </Label>
                        {mode !== 'private' && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            <Eye className="size-3 mr-1" />
                            Public
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {info.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {isPending && (
            <div className="flex items-center justify-center gap-2 py-2">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Updating sharing settings...</span>
            </div>
          )}

          {isSharingEnabled && shareUrl && (
            <div className="flex flex-col gap-4">
              <Label className="flex items-center gap-2">
                <LinkIcon className="size-4" />
                Share Link
              </Label>
              
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-primary/10 border border-primary rounded-md">
                  <div className="text-sm font-mono break-all">
                    {shareUrl}
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="shrink-0 h-12 px-3 transition-all duration-300"
                >
                  {copiedRecently ? (
                    <Check className="size-4 text-green-500" />
                  ) : (
                    <CopyIcon className="size-4" />
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Eye className="size-3" />
                Anyone with this link can view your shared content
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={handleSubmit}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}