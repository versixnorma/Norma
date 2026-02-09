'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useExecutiveDashboard } from '@/hooks/useExecutiveDashboard';
import { MetricCard } from './MetricCard';
import { TimeRangeSelector } from './TimeRangeSelector';

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export function ExecutiveDashboard() {
  const {
    kpis,
    dailyActivity,
    condominioHealth,
    loading,
    error,
    timeRange,
    setTimeRange,
    refreshViews,
  } = useExecutiveDashboard();

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    );
  }

  // Aggregate daily activity for charts
  const activityByDate: Record<
    string,
    { date: string; usuarios: number; sessoes: number; comunicados: number }
  > = {};
  dailyActivity.forEach((d) => {
    if (!activityByDate[d.date]) {
      activityByDate[d.date] = { date: d.date, usuarios: 0, sessoes: 0, comunicados: 0 };
    }
    activityByDate[d.date].usuarios += d.usuarios_ativos;
    activityByDate[d.date].sessoes += d.sessoes_totais;
    activityByDate[d.date].comunicados += d.comunicados_criados;
  });
  const chartData = Object.values(activityByDate).sort((a, b) => a.date.localeCompare(b.date));

  // Tier distribution for pie chart
  const tierCounts: Record<string, number> = {};
  condominioHealth.forEach((c) => {
    tierCounts[c.tier] = (tierCounts[c.tier] || 0) + 1;
  });
  const tierData = Object.entries(tierCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard Executivo</h2>
          {kpis?.refreshedAt && (
            <p className="text-xs text-gray-500">
              Atualizado: {new Date(kpis.refreshedAt).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <button
            onClick={refreshViews}
            className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Atualizar
          </button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Usuários Ativos" value={kpis?.activeUsers ?? '-'} loading={loading} />
        <MetricCard label="Condominios" value={kpis?.totalCondominios ?? '-'} loading={loading} />
        <MetricCard
          label="Custo Mensal"
          value={kpis ? `R$ ${(kpis.custoMesCentavos / 100).toFixed(2)}` : '-'}
          loading={loading}
        />
        <MetricCard
          label="GMV Marketplace"
          value={kpis ? `R$ ${kpis.gmvMes.toFixed(2)}` : '-'}
          loading={loading}
        />
        <MetricCard
          label="Conversas IA (30d)"
          value={kpis?.conversasIA30d ?? '-'}
          loading={loading}
        />
        <MetricCard
          label="Satisfação IA"
          value={kpis ? `${kpis.satisfacaoIA30d.toFixed(1)}/5` : '-'}
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity Chart */}
        <div className="col-span-2 rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Atividade Diária
          </h3>
          {loading ? (
            <div className="flex h-[280px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="usuarios"
                  name="Usuários"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
                <Area
                  type="monotone"
                  dataKey="sessoes"
                  name="Sessões"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSessions)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tier Distribution */}
        <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Distribuição por Tier
          </h3>
          {loading ? (
            <div className="flex h-[280px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : tierData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={tierData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {tierData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-gray-500">
              Sem dados
            </div>
          )}
        </div>
      </div>

      {/* Condominios Health Table */}
      <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Saúde dos Condominios
        </h3>
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 rounded bg-gray-100 dark:bg-gray-700" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-gray-500 dark:border-gray-700">
                  <th className="px-3 py-2">Condomínio</th>
                  <th className="px-3 py-2">Tier</th>
                  <th className="px-3 py-2">Unidades</th>
                  <th className="px-3 py-2">Usuários</th>
                  <th className="px-3 py-2">Ativos 7d</th>
                  <th className="px-3 py-2">Comunicados 7d</th>
                  <th className="px-3 py-2">IA 7d</th>
                  <th className="px-3 py-2">Custo 7d</th>
                </tr>
              </thead>
              <tbody>
                {condominioHealth.map((c) => (
                  <tr
                    key={c.condominio_id}
                    className="border-b hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-3 py-2 font-medium">{c.nome}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {c.tier}
                      </span>
                    </td>
                    <td className="px-3 py-2">{c.total_unidades}</td>
                    <td className="px-3 py-2">{c.total_usuarios}</td>
                    <td className="px-3 py-2">{c.usuarios_ativos_7d}</td>
                    <td className="px-3 py-2">{c.comunicados_7d}</td>
                    <td className="px-3 py-2">{c.conversas_ia_7d}</td>
                    <td className="px-3 py-2">R$ {(c.custo_7d_centavos / 100).toFixed(2)}</td>
                  </tr>
                ))}
                {condominioHealth.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                      Sem dados disponíveis
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cost Breakdown Bar Chart */}
      <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Custo por Condomínio (7d)
        </h3>
        {!loading && condominioHealth.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={condominioHealth.slice(0, 10)} margin={{ left: 0, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="nome"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                tickFormatter={(v) => `R$${(v / 100).toFixed(0)}`}
              />
              <Tooltip formatter={(v: number) => `R$ ${(v / 100).toFixed(2)}`} />
              <Bar dataKey="custo_7d_centavos" name="Custo" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[200px] items-center justify-center text-gray-500">
            {loading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            ) : (
              'Sem dados'
            )}
          </div>
        )}
      </div>
    </div>
  );
}
