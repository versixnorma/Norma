'use client';

import type { DashboardFinanceiro } from '@/hooks/useFinanceiro';

interface DashboardFinanceiroProps {
  dashboard: DashboardFinanceiro;
}

export function DashboardFinanceiroCards({ dashboard }: DashboardFinanceiroProps) {
  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  
  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-card-dark rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600">account_balance_wallet</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Saldo Atual</span>
          </div>
          <p className={`text-2xl font-bold ${dashboard.saldo_atual >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(dashboard.saldo_atual)}</p>
        </div>

        <div className="bg-white dark:bg-card-dark rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600">trending_up</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Receitas (Mês)</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(dashboard.receitas_mes)}</p>
        </div>

        <div className="bg-white dark:bg-card-dark rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-600">trending_down</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Despesas (Mês)</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(dashboard.despesas_mes)}</p>
        </div>

        <div className="bg-white dark:bg-card-dark rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-600">warning</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Inadimplência</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{dashboard.inadimplencia.percentual.toFixed(1)}%</p>
          <p className="text-xs text-gray-500">{dashboard.inadimplencia.unidades_inadimplentes} de {dashboard.inadimplencia.total_unidades} unidades</p>
        </div>
      </div>

      {/* Contas Bancárias */}
      {dashboard.contas.length > 0 && (
        <div className="bg-white dark:bg-card-dark rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">account_balance</span>
            Contas Bancárias
          </h3>
          <div className="space-y-3">
            {dashboard.contas.map(conta => (
              <div key={conta.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">{conta.nome_exibicao}</p>
                  <p className="text-xs text-gray-500">{conta.banco_nome} • Ag {conta.agencia} • CC {conta.conta}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${conta.saldo_atual >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(conta.saldo_atual)}</p>
                  {conta.principal && <span className="text-xs text-primary">Principal</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Despesas por Categoria */}
        {dashboard.despesas_por_categoria.length > 0 && (
          <div className="bg-white dark:bg-card-dark rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">pie_chart</span>
              Despesas por Categoria
            </h3>
            <div className="space-y-3">
              {dashboard.despesas_por_categoria.slice(0, 5).map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{item.categoria}</span>
                    <span className="font-medium text-gray-800 dark:text-white">{formatCurrency(item.valor)}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${item.percentual}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Últimos Lançamentos */}
        {dashboard.ultimos_lancamentos.length > 0 && (
          <div className="bg-white dark:bg-card-dark rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">receipt_long</span>
              Últimos Lançamentos
            </h3>
            <div className="space-y-3">
              {dashboard.ultimos_lancamentos.map(l => (
                <div key={l.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${l.tipo === 'receita' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      <span className="material-symbols-outlined text-sm">{l.tipo === 'receita' ? 'arrow_upward' : 'arrow_downward'}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white line-clamp-1">{l.descricao}</p>
                      <p className="text-xs text-gray-500">{new Date(l.data_competencia).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <p className={`font-bold ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                    {l.tipo === 'receita' ? '+' : '-'}{formatCurrency(l.valor)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
