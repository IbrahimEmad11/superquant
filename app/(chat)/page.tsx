"use client";
import { History, Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useHistoryPanel } from "@/hooks/use-history-panel";
import { generateUUID } from "@/lib/utils";

import { createChatAction } from "./_lib/actions";

export default function Page() {
  const router = useRouter();
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const { setIsOpen: setIsHistoryVisible } = useHistoryPanel();

  const handleCreateChat = async () => {
    setIsCreatingChat(true);
    const id = generateUUID();
    await createChatAction(id);
    router.push(`/chat/${id}`);
    setIsCreatingChat(false);
  };

  return (
    <div className="flex flex-col items-center justify-center h-dvh w-dvw gap-8">
      <Image
        src="/images/superquant-logo.svg"
        height={70}
        width={70}
        alt="superquant logo"
      />
      <div className="flex flex-col items-center justify-center gap-1">
        <div className="flex flex-row items-center justify-center gap-2">
          <h1 className="text-2xl font-bold">SuperQuant AI</h1>
          <Badge variant="secondary">Alpha</Badge>
        </div>
        <p className="text-sm text-zinc-500">
          Your AI-powered financial assistant
        </p>
      </div>
      <div className="flex flex-col items-center justify-center gap-1 w-[300px]">
        <Button
          disabled={isCreatingChat}
          onClick={handleCreateChat}
          className="w-full"
        >
          <Plus className="size-4 mr-2" />
          <span>Create a new chat</span>
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsHistoryVisible(true)}
        >
          <History className="size-4 mr-2" />
          <span>View past sessions</span>
        </Button>
      </div>
    </div>
  );
}
