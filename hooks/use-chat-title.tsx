import { useState, useEffect, useRef, useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { Chat, Database } from '@/db/schema';

export function useChatTitle(chatId: string, initialTitle?: string) {
  const [title, setTitle] = useState(initialTitle || 'New Chat');
  const [isGenerating, setIsGenerating] = useState(false);
  const { mutate } = useSWRConfig();
  const hasGeneratedRef = useRef(false);

  const updateTitle = useCallback(async (newTitle: string) => {
    setTitle(newTitle);
    mutate('/api/history', (chats: Chat[] | undefined) => 
      chats?.map(chat => 
        chat.id === chatId ? { ...chat, title: newTitle } : chat
      ), { revalidate: false }
    );
  }, [chatId, mutate]);

  const generateTitle = useCallback(async (messages: any[], database?: Database | null) => {
    if (messages.length < 2 || hasGeneratedRef.current) return;
    
    setIsGenerating(true);
    hasGeneratedRef.current = true;
    
    try {
      const response = await fetch('/api/chat/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          messages: messages.slice(0, 4),
          database: database ? {
            name: database.name,
            description: database.description
          } : null
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const { title: newTitle } = await response.json();
      if (newTitle && newTitle !== title) {
        await updateTitle(newTitle);
      }
    } catch (error) {
      console.error('Failed to generate title:', error);
      hasGeneratedRef.current = false;
    } finally {
      setIsGenerating(false);
    }
  }, [chatId, title, updateTitle]);

  useEffect(() => {
    hasGeneratedRef.current = false;
    setTitle(initialTitle || 'New Chat');
    setIsGenerating(false);
  }, [chatId, initialTitle]);

  return { title, isGenerating, updateTitle, generateTitle };
}