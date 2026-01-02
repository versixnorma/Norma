'use client';

import type { LancamentoFinanceiro } from '@versix/shared';

interface LancamentoCardProps {
  lancamento: LancamentoFinanceiro;
  onClick?: () => void;
  onConfirmar?: () => void;
  showActions?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
  confirmado: { label: 'Confirmado', color: 'bg-green-100 text-green-700' },
  cancelado: { label: 'Cancelado', color: 'bg-gray-100 text-gray-600' },
};

export function LancamentoCard({
  lancamento,
  onClick,
  onConfirmar,
  showActions,
}: LancamentoCardProps) {
  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');
  const status = STATUS_CONFIG[lancamento.status];

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:shadow-lg dark:border-gray-700 dark:bg-card-dark ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${lancamento.tipo === 'receita' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}
          >
            <span className="material-symbols-outlined">
              {lancamento.tipo === 'receita' ? 'arrow_upward' : 'arrow_downward'}
            </span>
          </div>
          <div>
            <p className="line-clamp-1 font-medium text-gray-800 dark:text-white">
              {lancamento.descricao}
            </p>
            <p className="text-xs text-gray-500">
              {(lancamento as any).categoria?.nome || 'Sem categoria'}
            </p>
            {(lancamento as any).fornecedor_nome && (
              <p className="mt-1 text-xs text-gray-400">{(lancamento as any).fornecedor_nome}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p
            className={`font-bold ${lancamento.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}
          >
            {lancamento.tipo === 'receita' ? '+' : '-'}
            {formatCurrency(lancamento.valor)}
          </p>
          <span className={`rounded-full px-2 py-0.5 text-xs ${status.color}`}>{status.label}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            {formatDate(lancamento.data_competencia)}
          </span>
          {lancamento.data_pagamento && (
            <span className="flex items-center gap-1 text-green-600">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Pago {formatDate(lancamento.data_pagamento)}
            </span>
          )}
          {Array.isArray(lancamento.comprovantes) && lancamento.comprovantes.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">attach_file</span>
              {lancamento.comprovantes.length}
            </span>
          )}
        </div>
        {showActions && lancamento.status === 'pendente' && onConfirmar && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConfirmar();
            }}
            className="rounded-lg bg-green-100 px-3 py-1 text-xs text-green-700 transition-colors hover:bg-green-200"
          >
            Confirmar
          </button>
        )}
      </div>
    </div>
  );
}
