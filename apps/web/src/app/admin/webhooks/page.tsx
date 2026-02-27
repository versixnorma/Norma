'use client';

import { AuthGuard } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { rpcRetentarWebhook } from '@versix/shared/rpc-overrides';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface FailedDelivery {
  id: string;
  canal: string;
  status: string;
  erro_mensagem: string | null;
  max_tentativas: number;
  created_at: string;
  proxima_tentativa: string | null;
  notificacao_id: string;
}

function WebhookDLQContent() {
  const [failures, setFailures] = useState<FailedDelivery[]>([]);
  const [retrying, setRetrying] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  const loadFailures = useCallback(async () => {
    const { data } = await supabase
      .from('notificacoes_entregas')
      .select(
        'id, canal, status, erro_mensagem, max_tentativas, created_at, proxima_tentativa, notificacao_id'
      )
      .in('status', ['falhou'])
      .order('created_at', { ascending: false })
      .limit(50);

    setFailures((data as FailedDelivery[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    loadFailures();
  }, [loadFailures]);

  const handleRetry = async (entregaId: string) => {
    setRetrying(entregaId);
    try {
      await rpcRetentarWebhook(supabase, entregaId);
      toast.success('Reprocessamento iniciado');
      await loadFailures();
    } catch {
      toast.error('Erro ao reprocessar');
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Entregas com Falha (DLQ)
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Notificações que falharam no envio — reprocessar ou investigar
        </p>
      </div>

      <div className="space-y-3">
        {failures.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs dark:bg-gray-700">
                  {f.canal}
                </span>
                <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {f.status}
                </span>
              </div>
              {f.erro_mensagem && (
                <p className="mt-1 truncate text-sm text-red-600 dark:text-red-400">
                  {f.erro_mensagem}
                </p>
              )}
              <p className="mt-0.5 text-xs text-gray-400">
                {new Date(f.created_at).toLocaleString('pt-BR')}
                {f.proxima_tentativa && (
                  <span className="ml-2">
                    Próxima tentativa: {new Date(f.proxima_tentativa).toLocaleString('pt-BR')}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => handleRetry(f.id)}
              disabled={retrying === f.id}
              className="ml-4 shrink-0 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {retrying === f.id ? 'Reprocessando...' : 'Retentar'}
            </button>
          </div>
        ))}

        {failures.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center dark:border-gray-600">
            <p className="text-gray-500 dark:text-gray-400">Nenhuma entrega com falha.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WebhookDLQPage() {
  return (
    <AuthGuard requiredRoles={['superadmin']}>
      <WebhookDLQContent />
    </AuthGuard>
  );
}
