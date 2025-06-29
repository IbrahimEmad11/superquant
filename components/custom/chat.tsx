"use client";

import { Attachment, Message } from "ai";
import { useChat } from "ai/react";
import { useEffect, useState } from "react";

import { Message as PreviewMessage } from "@/components/custom/message";
import { useScrollToBottom } from "@/components/custom/use-scroll-to-bottom";
import { Database } from "@/db/schema";
import { useChatTitle } from "@/hooks/use-chat-title";
import { useDatabaseConnectionDialog } from "@/hooks/use-database-connection-dialog";

import { MultimodalInput } from "./multimodal-input";
import { Overview } from "./overview";

export function Chat({
  id,
  initialMessages,
  database,
  initialTitle,
}: {
  id: string;
  initialMessages: Array<Message>;
  database: Database | null;
  initialTitle?: string;
}) {
  const {
    isOpen: isDatabaseConnectionDialogOpen,
    setIsOpen: setIsDatabaseConnectionDialogOpen,
  } = useDatabaseConnectionDialog();

  const { generateTitle } = useChatTitle(id, initialTitle);

  const { messages, handleSubmit, input, setInput, append, isLoading, stop } =
    useChat({
      id,
      body: { id },
      initialMessages,
      maxSteps: 10,
      onFinish: () => {
        window.history.replaceState({}, "", `/chat/${id}`);
      },
    });

  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);

  useEffect(() => {
    if (!database) {
      setIsDatabaseConnectionDialogOpen(true);
    }
  }, [database, setIsDatabaseConnectionDialogOpen]);

  // Generate title after 2nd message (user + assistant)
  useEffect(() => {
    if (messages.length >= 2 && (!initialTitle || initialTitle === 'New Chat')) {
      generateTitle(messages, database);
    }
  }, [messages.length, generateTitle, initialTitle, database]);

  return (
    <div className="flex flex-col size-full">
      {/* Messages Container - takes up available space */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={messagesContainerRef}
          className="h-full overflow-y-auto px-4 pt-0"
        >
          <div className="flex flex-col min-h-full space-y-4 pb-[120px]">
            {messages.length === 0 && <Overview />}
            {messages.map((message) => (
              <PreviewMessage
                key={message.id}
                chatId={id}
                role={message.role}
                content={message.content}
                attachments={message.experimental_attachments}
                toolInvocations={message.toolInvocations}
              />
            ))}

            {/* Spacer to push last message above input */}
            <div className="h-10" />

            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
      
      {/* Input Container - fixed at bottom with safe padding */}
      <div className="shrink-0">
        <div className="px-4 pb-3 pb-safe">
          <MultimodalInput
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            stop={stop}
            attachments={attachments}
            setAttachments={setAttachments}
            messages={messages}
            append={append}
          />
        </div>
      </div>
    </div>
  );
}