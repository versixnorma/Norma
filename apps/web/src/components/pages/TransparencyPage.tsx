'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import type { LancamentoComDetalhes } from '@/hooks/useFinancial';
import { useFinancial } from '@/hooks/useFinancial';

interface DashboardData {
  saldo_total: number;
  receitas_mes: number;
  despesas_mes: number;
  inadimplencia_percent: number;
  fundo_reserva: number;
}

interface TransparencyPageProps {
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  dashboard?: DashboardData | null;
}

export function TransparencyPage({ onScroll, dashboard: propDashboard }: TransparencyPageProps) {
  const { profile } = useAuthContext();
  const {
    dashboard: hookDashboard,
    lancamentos,
    loading,
  } = useFinancial({
    condominioId: profile?.condominio_atual?.id || null,
  });

  const dashboard = propDashboard || hookDashboard;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  return (
    <div
      className="hide-scroll relative z-0 flex-1 animate-slide-up space-y-6 overflow-y-auto px-6 pb-32 pt-6"
      onScroll={onScroll}
    >
      {/* Header */}
      <div>
        <h2 className="mb-1 font-display text-xl font-bold text-gray-800 dark:text-white">
          Transparência Financeira
        </h2>
        <p className="text-sm text-text-sub">Acompanhe as finanças do condomínio</p>
      </div>

      {/* Balance Card */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-splash-primary p-5 text-white shadow-lg">
        <p className="mb-1 text-xs opacity-80">Saldo Disponível</p>
        <h3 className="font-display text-3xl font-bold">
          {dashboard ? formatCurrency(dashboard.saldo_total) : 'R$ --'}
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
          <div>
            <p className="text-xs opacity-70">Receita Mês</p>
            <p className="text-lg font-bold text-green-300">
              +{dashboard ? formatCurrency(dashboard.receitas_mes) : 'R$ --'}
            </p>
          </div>
          <div>
            <p className="text-xs opacity-70">Despesas</p>
            <p className="text-lg font-bold text-red-300">
              -{dashboard ? formatCurrency(dashboard.despesas_mes) : 'R$ --'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm dark:border-gray-700 dark:bg-card-dark">
          <span className="material-symbols-outlined mb-1 text-2xl text-accent-green">
            trending_up
          </span>
          <p className="text-lg font-bold text-gray-800 dark:text-white">
            {dashboard ? `${100 - dashboard.inadimplencia_percent}%` : '--%'}
          </p>
          <p className="text-[10px] text-text-sub">Adimplência</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm dark:border-gray-700 dark:bg-card-dark">
          <span className="material-symbols-outlined mb-1 text-2xl text-accent-blue">savings</span>
          <p className="text-lg font-bold text-gray-800 dark:text-white">
            {dashboard ? formatCurrency(dashboard.fundo_reserva) : 'R$ --'}
          </p>
          <p className="text-[10px] text-text-sub">Fundo Reserva</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm dark:border-gray-700 dark:bg-card-dark">
          <span className="material-symbols-outlined mb-1 text-2xl text-accent-purple">
            receipt_long
          </span>
          <p className="text-lg font-bold text-gray-800 dark:text-white">{lancamentos.length}</p>
          <p className="text-[10px] text-text-sub">Transações</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className="mb-4 font-display text-lg font-bold text-gray-800 dark:text-white">
          Últimas Movimentações
        </h3>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl bg-white p-4 dark:bg-card-dark">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1">
                    <div className="mb-2 h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : lancamentos.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center dark:bg-card-dark">
            <span className="material-symbols-outlined mb-2 text-4xl text-gray-300">
              receipt_long
            </span>
            <p className="text-sm text-gray-500">Nenhuma movimentação este mês</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lancamentos.slice(0, 10).map((lancamento: LancamentoComDetalhes) => (
              <div
                key={lancamento.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-card-dark"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      lancamento.tipo === 'receita'
                        ? 'bg-green-50 text-green-500 dark:bg-green-900/20'
                        : 'bg-red-50 text-red-500 dark:bg-red-900/20'
                    }`}
                  >
                    <span className="material-symbols-outlined">
                      {lancamento.tipo === 'receita' ? 'arrow_downward' : 'arrow_upward'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white">
                      {lancamento.descricao}
                    </h4>
                    <p className="text-xs text-text-sub">
                      {formatDate(lancamento.data_competencia)}
                      {lancamento.unidade_identificador && ` • ${lancamento.unidade_identificador}`}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-bold ${
                    lancamento.tipo === 'receita' ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {lancamento.tipo === 'receita' ? '+' : '-'}
                  {formatCurrency(Math.abs(lancamento.valor))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Download Reports */}
      <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
        <h4 className="mb-3 text-sm font-bold text-gray-800 dark:text-white">Relatórios</h4>
        <div className="flex gap-2">
          <button className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-card-dark dark:text-gray-300">
            <span className="material-symbols-outlined text-sm">download</span>
            Balancete
          </button>
          <button className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-card-dark dark:text-gray-300">
            <span className="material-symbols-outlined text-sm">download</span>
            Prestação
          </button>
        </div>
      </div>
    </div>
  );
}
