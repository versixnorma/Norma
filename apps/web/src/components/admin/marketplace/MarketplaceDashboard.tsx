'use client';

import { useMarketplace } from '@/hooks/useMarketplace';
import { useEffect } from 'react';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const CATEGORY_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7'];

export function MarketplaceDashboard() {
  const { metrics, loading, error, fetchMetrics } = useMarketplace();

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const kpis = [
    { label: 'Total de Parceiros', value: metrics?.totalPartners ?? 0, icon: 'store' },
    { label: 'Descontos Ativos', value: metrics?.activeDiscounts ?? 0, icon: 'sell' },
    { label: 'Transações/Mês', value: metrics?.monthlyTransactions ?? 0, icon: 'receipt_long' },
    {
      label: 'Receita Total',
      value: metrics?.totalRevenue ?? 0,
      icon: 'payments',
      format: 'currency' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">{kpi.label}</p>
                <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">
                  {kpi.format === 'currency'
                    ? `R$ ${(kpi.value as number).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}`
                    : kpi.value}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-2xl">{kpi.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Transações por Mês
          </h3>
          <div className="mt-4 h-[260px]">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : metrics?.monthlyTrend?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Line type="monotone" dataKey="transactions" stroke="#6366f1" strokeWidth={2} />
                  <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                Sem dados suficientes
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Categorias Populares
          </h3>
          <div className="mt-4 flex h-[260px] items-center">
            {loading ? (
              <div className="flex w-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : metrics?.topCategories?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.topCategories}
                    dataKey="count"
                    nameKey="category"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {metrics.topCategories.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex w-full items-center justify-center text-sm text-gray-500">
                Sem categorias suficientes
              </div>
            )}
          </div>
          {metrics?.topCategories?.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-300">
              {metrics.topCategories.map((item, index) => (
                <div key={item.category} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                  />
                  <span>{item.category}</span>
                  <span className="ml-auto font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Transações Recentes
          </h3>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800/60">
              <tr>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Parceiro</th>
                <th className="px-3 py-2 text-left">Desconto</th>
                <th className="px-3 py-2 text-left">Condomínio</th>
                <th className="px-3 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {metrics?.recentTransactions?.length ? (
                metrics.recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                      {tx.transaction_date
                        ? new Date(tx.transaction_date).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-800 dark:text-white">
                      {tx.partner_name || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                      {tx.discount_title || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                      {tx.condominio_nome || '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-800 dark:text-white">
                      R$ {Number(tx.final_amount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>
                    Nenhuma transação recente
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
