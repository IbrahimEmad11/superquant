"use client";

import { Message } from "ai/react";

import { Message as PreviewMessage } from "@/components/custom/message";
import { useScrollToBottom } from "@/components/custom/use-scroll-to-bottom";

interface ChatMessagesProps {
  initialMessages: Message[];
  isReadOnly?: boolean;
  chatId: string;
}

export function ChatMessages({ initialMessages, chatId }: ChatMessagesProps) {
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  return (
    <div
      ref={messagesContainerRef}
      className="flex flex-col gap-4 size-full items-center overflow-y-scroll"
    >
      {initialMessages.length === 0 && (
        <div className="text-center text-muted-foreground mt-8">
          This chat has no messages.
        </div>
      )}

      {/* Map over messages and render them using your high-fidelity PreviewMessage component */}
      {initialMessages.map((message) => (
        <PreviewMessage
          key={message.id}
          chatId={chatId}
          role={message.role}
          content={message.content}
          attachments={message.experimental_attachments}
          toolInvocations={message.toolInvocations}
                />
      ))}

      <div
        ref={messagesEndRef}
        className="shrink-0 min-h-px"
      />
    </div>
  );
}