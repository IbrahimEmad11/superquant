"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import DatabaseConnectionDialog from "@/app/(chat)/chat/[id]/_components/database-connection-dialog/database-connection-dialog";

export default function StartChatDialogWrapper() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <DatabaseConnectionDialog
      chatId={undefined}
      onCancel={() => router.replace("/")}
      onSuccess={(chatId) => {
        router.replace(`/chat/${chatId}`);
      }}
    />
  );
}