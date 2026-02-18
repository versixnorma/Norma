'use client';

import { logger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useCallback, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Message } from './types';

function generateSuggestions(response: string): string[] {
  const suggestions: string[] = [];
  const lowerResponse = response.toLowerCase();

  if (lowerResponse.includes('assembleia') || lowerResponse.includes('reunião')) {
    suggestions.push('Agendar assembleia', 'Verificar pauta', 'Convocar moradores');
  }
  if (lowerResponse.includes('regimento') || lowerResponse.includes('norma')) {
    suggestions.push('Consultar regimento interno', 'Verificar direitos', 'Regras do condomínio');
  }
  if (lowerResponse.includes('síndico') || lowerResponse.includes('administração')) {
    suggestions.push('Falar com síndico', 'Registrar ocorrência', 'Solicitar manutenção');
  }
  if (
    lowerResponse.includes('taxa') ||
    lowerResponse.includes('pagamento') ||
    lowerResponse.includes('financeiro')
  ) {
    suggestions.push('Verificar taxas pendentes', 'Consultar extrato', 'Formas de pagamento');
  }
  if (
    lowerResponse.includes('área comum') ||
    lowerResponse.includes('festa') ||
    lowerResponse.includes('reserva')
  ) {
    suggestions.push('Reservar salão', 'Verificar disponibilidade', 'Consultar regras');
  }
  if (lowerResponse.includes('manutenção') || lowerResponse.includes('reparo')) {
    suggestions.push('Solicitar manutenção', 'Verificar status', 'Contatar zelador');
  }

  if (suggestions.length === 0) {
    suggestions.push('Verificar regimento interno', 'Agendar assembleia', 'Consultar síndico');
  }

  return suggestions.slice(0, 3);
}

interface UseChatStreamParams {
  condominioId: string | null;
  userId: string | null;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
}

export function useChatStream({
  condominioId,
  userId,
  messages,
  setMessages,
}: UseChatStreamParams) {
  const supabase = getSupabaseClient();
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsTyping(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !condominioId || !userId) return;

      if (abortControllerRef.current) abortControllerRef.current.abort();

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        text: text.trim(),
        sender: 'user',
        timestamp: new Date(),
        status: 'sent',
      };

      const botMessageId = `bot-${Date.now()}`;
      const botMessage: Message = {
        id: botMessageId,
        text: '',
        sender: 'bot',
        timestamp: new Date(),
        status: 'streaming',
      };

      setMessages((prev) => [...prev, userMessage, botMessage]);
      setIsTyping(true);
      setError(null);

      try {
        const conversationHistory = messages.slice(-10).map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
          timestamp: m.timestamp.toISOString(),
        }));

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Usuário não autenticado');

        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ask-norma`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: text.trim(),
            condominioId,
            userId,
            conversationHistory,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        if (!response.body) throw new Error('Response body is null');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        const sources: Array<{ type: string; name: string; content: string }> = [];
        let suggestions: string[] = [];

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6);

              if (data === '[DONE]') {
                suggestions = generateSuggestions(fullResponse);
                await supabase.from('norma_chat_logs').insert({
                  condominio_id: condominioId,
                  user_id: userId,
                  message: text.trim(),
                  response: fullResponse,
                  sources:
                    sources as unknown as Database['public']['Tables']['norma_chat_logs']['Insert']['sources'],
                  created_at: new Date().toISOString(),
                });
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (!parsed.content) continue;

                fullResponse += parsed.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botMessageId
                      ? { ...msg, text: fullResponse, status: 'streaming' as const }
                      : msg
                  )
                );
              } catch {
                // Ignora chunk parcial
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        if (abortController.signal.aborted) return;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId
              ? {
                  ...msg,
                  text: fullResponse,
                  sources,
                  suggestions,
                  status: 'sent' as const,
                }
              : msg
          )
        );
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setMessages((prev) => prev.filter((msg) => msg.id !== botMessageId));
          return;
        }

        logger.error('Erro ao enviar mensagem:', err);
        setError(err instanceof Error ? err : new Error('Erro desconhecido'));

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId
              ? {
                  ...msg,
                  text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
                  status: 'error' as const,
                }
              : msg
          )
        );
      } finally {
        setIsTyping(false);
        abortControllerRef.current = null;
      }
    },
    [condominioId, userId, messages, setMessages, supabase]
  );

  return {
    isTyping,
    error,
    setError,
    sendMessage,
    stopStreaming,
  };
}
