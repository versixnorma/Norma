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
  const { dashboard: hookDashboard, lancamentos, loading } = useFinancial({
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
      className="flex-1 overflow-y-auto hide-scroll pb-32 pt-6 relative z-0 px-6 animate-slide-up space-y-6"
      onScroll={onScroll}
    >
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white font-display mb-1">
          Transparência Financeira
        </h2>
        <p className="text-sm text-text-sub">Acompanhe as finanças do condomínio</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-primary to-splash-primary rounded-2xl p-5 text-white shadow-lg">
        <p className="text-xs opacity-80 mb-1">Saldo Disponível</p>
        <h3 className="text-3xl font-bold font-display">
          {dashboard ? formatCurrency(dashboard.saldo_total) : 'R$ --'}
        </h3>
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
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
        <div className="bg-white dark:bg-card-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <span className="material-symbols-outlined text-accent-green text-2xl mb-1">trending_up</span>
          <p className="text-lg font-bold text-gray-800 dark:text-white">
            {dashboard ? `${100 - dashboard.inadimplencia_percent}%` : '--%'}
          </p>
          <p className="text-[10px] text-text-sub">Adimplência</p>
        </div>
        <div className="bg-white dark:bg-card-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <span className="material-symbols-outlined text-accent-blue text-2xl mb-1">savings</span>
          <p className="text-lg font-bold text-gray-800 dark:text-white">
            {dashboard ? formatCurrency(dashboard.fundo_reserva) : 'R$ --'}
          </p>
          <p className="text-[10px] text-text-sub">Fundo Reserva</p>
        </div>
        <div className="bg-white dark:bg-card-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <span className="material-symbols-outlined text-accent-purple text-2xl mb-1">receipt_long</span>
          <p className="text-lg font-bold text-gray-800 dark:text-white">
            {lancamentos.length}
          </p>
          <p className="text-[10px] text-text-sub">Transações</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white font-display mb-4">
          Últimas Movimentações
        </h3>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-card-dark p-4 rounded-xl animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                    <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : lancamentos.length === 0 ? (
          <div className="bg-white dark:bg-card-dark p-8 rounded-xl text-center">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">receipt_long</span>
            <p className="text-sm text-gray-500">Nenhuma movimentação este mês</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lancamentos.slice(0, 10).map((lancamento: LancamentoComDetalhes) => (
              <div
                key={lancamento.id}
                className="bg-white dark:bg-card-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    lancamento.tipo === 'receita'
                      ? 'text-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'text-red-500 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <span className="material-symbols-outlined">
                      {lancamento.tipo === 'receita' ? 'arrow_downward' : 'arrow_upward'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-800 dark:text-white">
                      {lancamento.descricao}
                    </h4>
                    <p className="text-xs text-text-sub">
                      {formatDate(lancamento.data_lancamento)}
                      {lancamento.unidade_identificador && ` • ${lancamento.unidade_identificador}`}
                    </p>
                  </div>
                </div>
                <span className={`font-bold ${
                  lancamento.tipo === 'receita' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {lancamento.tipo === 'receita' ? '+' : '-'}
                  {formatCurrency(Math.abs(lancamento.valor))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Download Reports */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
        <h4 className="font-bold text-sm text-gray-800 dark:text-white mb-3">Relatórios</h4>
        <div className="flex gap-2">
          <button className="flex-1 bg-white dark:bg-card-dark py-2 px-3 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 transition flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-sm">download</span>
            Balancete
          </button>
          <button className="flex-1 bg-white dark:bg-card-dark py-2 px-3 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 transition flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-sm">download</span>
            Prestação
          </button>
        </div>
      </div>
    </div>
  );
}
