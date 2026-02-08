'use client';

import { useNormaAI } from '@/hooks/useNormaAI';
import { useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const KPI_ICONS: Record<string, string> = {
  documents: 'description',
  conversations: 'chat',
  response_time: 'speed',
  satisfaction: 'thumb_up',
};

export function NormaAIDashboard() {
  const { metrics, loading, error, fetchMetrics } = useNormaAI();

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const kpis = [
    {
      label: 'Total Documentos',
      value: metrics?.totalDocuments ?? 0,
      icon: KPI_ICONS.documents,
    },
    {
      label: 'Conversas (30d)',
      value: metrics?.totalConversations ?? 0,
      icon: KPI_ICONS.conversations,
    },
    {
      label: 'Total Chunks',
      value: metrics?.totalChunks ?? 0,
      icon: 'data_array',
    },
    {
      label: 'Satisfação',
      value: metrics?.satisfactionScore ? `${metrics.satisfactionScore}/5` : 'N/A',
      icon: KPI_ICONS.satisfaction,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Norma AI - Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Monitoramento e métricas do sistema de IA
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : kpi.value}
                </p>
              </div>
              <span className="material-symbols-outlined text-3xl text-indigo-500">{kpi.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Documents by Type */}
      {metrics?.documentsByType && metrics.documentsByType.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Documentos por Tipo
          </h3>
          <div className="flex gap-6">
            {metrics.documentsByType.map((item) => (
              <div key={item.source_type} className="text-center">
                <p className="text-2xl font-bold text-indigo-600">{item.count}</p>
                <p className="text-sm capitalize text-gray-500 dark:text-gray-400">
                  {item.source_type === 'upload'
                    ? 'Upload PDF'
                    : item.source_type === 'manual'
                      ? 'Manual'
                      : item.source_type}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversations Trend Chart */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Conversas por Dia (últimos 30 dias)
        </h3>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
          </div>
        ) : metrics?.dailyTrend && metrics.dailyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(d) => {
                  const date = new Date(d);
                  return `${date.getDate()}/${date.getMonth() + 1}`;
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip labelFormatter={(d) => new Date(d as string).toLocaleDateString('pt-BR')} />
              <Legend />
              <Line
                type="monotone"
                dataKey="queries"
                name="Conversas"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-64 items-center justify-center text-gray-400">
            Sem dados no período
          </div>
        )}
      </div>
    </div>
  );
}
