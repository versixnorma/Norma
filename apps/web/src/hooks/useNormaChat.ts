'use client';

import { useCallback, useState } from 'react';
import { useChatMessages } from './norma/useChatMessages';
import { useChatStream } from './norma/useChatStream';
import type { Message, UseNormaChatOptions, UseNormaChatReturn } from './norma/types';

export function useNormaChat({ condominioId, userId }: UseNormaChatOptions): UseNormaChatReturn {
  const messagesState = useChatMessages(condominioId, userId);
  const streamState = useChatStream({
    condominioId,
    userId,
    messages: messagesState.messages,
    setMessages: messagesState.setMessages,
  });

  const clearMessages = useCallback(() => {
    streamState.stopStreaming();
    messagesState.clearMessages();
    streamState.setError(null);
  }, [messagesState, streamState]);

  return {
    messages: messagesState.messages,
    isTyping: streamState.isTyping,
    error: streamState.error,
    sendMessage: streamState.sendMessage,
    clearMessages,
    loadHistory: messagesState.loadHistory,
    stopStreaming: streamState.stopStreaming,
  };
}

// Fallback para desenvolvimento
export function useNormaChatMock(): UseNormaChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async (text: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const botMessage: Message = {
      id: `bot-${Date.now()}`,
      text: 'Olá! Sou Norma, sua assistente de governança condominial. Como posso ajudar você hoje?',
      sender: 'bot',
      timestamp: new Date(),
      status: 'sent',
      suggestions: ['Verificar regimento interno', 'Agendar assembleia', 'Consultar síndico'],
    };

    setMessages((prev) => [...prev, botMessage]);
    setIsTyping(false);
  };

  return {
    messages,
    isTyping,
    error: null,
    sendMessage,
    clearMessages: () => setMessages([]),
    loadHistory: async () => {},
  };
}

export type { Message, UseNormaChatOptions, UseNormaChatReturn };
