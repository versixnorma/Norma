'use client';

import { logger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useCallback, useState } from 'react';
import type { Message } from './types';

export function useChatMessages(condominioId: string | null, userId: string | null) {
  const supabase = getSupabaseClient();
  const [messages, setMessages] = useState<Message[]>([]);

  const loadHistory = useCallback(async () => {
    if (!condominioId || !userId) return;

    try {
      const { data, error } = await supabase
        .from('norma_chat_logs')
        .select('*')
        .eq('condominio_id', condominioId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!data || data.length === 0) return;

      const historyMessages: Message[] = [];
      const rows = data as unknown as Database['public']['Tables']['norma_chat_logs']['Row'][];

      rows.reverse().forEach((log, index: number) => {
        historyMessages.push({
          id: `hist-user-${index}`,
          text: log.message,
          sender: 'user',
          timestamp: new Date(log.created_at),
          status: 'sent',
        });

        historyMessages.push({
          id: `hist-bot-${index}`,
          text: log.response,
          sender: 'bot',
          sources:
            (log.sources as unknown as Array<{
              type: string;
              name: string;
              content: string;
            }>) || [],
          timestamp: new Date(log.created_at),
          status: 'sent',
        });
      });

      setMessages(historyMessages);
    } catch (err) {
      logger.error('Erro ao carregar histórico:', err);
    }
  }, [condominioId, userId, supabase]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    setMessages,
    loadHistory,
    clearMessages,
  };
}
