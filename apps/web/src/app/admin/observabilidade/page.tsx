// =====================================================
// SPRINT 10: Página de Observabilidade
// Dashboard completo de monitoramento
// =====================================================

'use client';

export const dynamic = 'force-dynamic';

import { AlertasPanel } from '@/components/observabilidade/AlertasPanel';
import { MetricasCards } from '@/components/observabilidade/MetricasCards';
import { HealthSummary, StatusBadge, UptimeBar } from '@/components/observabilidade/SystemStatus';
import { useSystemHealthStatus } from '@/hooks/useHealthCheck';
import { useObservabilidadeDashboard } from '@/hooks/useObservabilidade';
import {
    Activity,
    Cloud,
    Database,
    RefreshCw,
    Server
} from 'lucide-react';
import { useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

// =====================================================
// MAIN PAGE
// =====================================================

export default function ObservabilidadePage() {
  const [periodo, setPeriodo] = useState<'24h' | '7d' | '30d'>('24h');
  const { data, isLoading, refetch } = useObservabilidadeDashboard();
  const healthStatus = useSystemHealthStatus();

  if (isLoading || !data) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Observabilidade</h1>
            <p className="text-gray-500">Monitoramento do sistema em tempo real</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Período */}
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as '24h' | '7d' | '30d')}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
            >
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
            </select>

            {/* Refresh */}
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        </div>

        {/* Status Geral */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <StatusBadge status={data.status.status_geral} size="lg" />
              <div>
                <h2 className="font-semibold text-gray-900">Status do Sistema</h2>
                <p className="text-sm text-gray-500">
                  Última verificação: {new Date().toLocaleTimeString('pt-BR')}
                </p>
              </div>
            </div>

            <HealthSummary
              ok={healthStatus.summary.ok}
              degraded={healthStatus.summary.degraded}
              error={healthStatus.summary.error}
            />
          </div>

          {/* Uptime */}
          <div className="mt-4">
            <UptimeBar
              percentage={data.uptime.percentual_24h}
              label="Uptime (24h)"
            />
          </div>
        </div>

        {/* Métricas Cards */}
        <MetricasCards data={data} />

        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Performance Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Performance</h3>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={generatePerformanceData()}>
                  <defs>
                    <linearGradient id="latenciaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="hora"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="latencia"
                    stroke="#6366f1"
                    fill="url(#latenciaGradient)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="p99"
                    stroke="#ef4444"
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-500 rounded" />
                <span className="text-gray-600">Latência média</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-red-500" style={{ borderStyle: 'dashed' }} />
                <span className="text-gray-600">P99</span>
              </div>
            </div>
          </div>

          {/* Alertas */}
          <div className="lg:col-span-1">
            <AlertasPanel />
          </div>
        </div>

        {/* Segunda linha */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Endpoints Lentos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Endpoints Mais Lentos</h3>

            <div className="space-y-3">
              {data.performance.endpoints_lentos.map((ep, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 w-4">{index + 1}</span>
                    <code className="text-sm text-gray-700 font-mono truncate max-w-xs">
                      {ep.endpoint}
                    </code>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">{ep.requests} req</span>
                    <span className={`text-sm font-medium ${
                      ep.latencia_p99 > 1000 ? 'text-red-600' :
                      ep.latencia_p99 > 500 ? 'text-yellow-600' :
                      'text-gray-900'
                    }`}>
                      {ep.latencia_p99}ms
                    </span>
                  </div>
                </div>
              ))}

              {data.performance.endpoints_lentos.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  Nenhum endpoint lento detectado
                </p>
              )}
            </div>
          </div>

          {/* Custos por Categoria */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Custos por Categoria</h3>

            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.custos.por_categoria}
                  layout="vertical"
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="categoria"
                    type="category"
                    tick={{ fontSize: 12 }}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value: number) =>
                      `R$ ${(value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    }
                  />
                  <Bar
                    dataKey="valor_centavos"
                    fill="#6366f1"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total do mês</span>
                <span className="font-semibold text-gray-900">
                  R$ {(data.custos.mes / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Health Checks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Health Checks</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.status.endpoints.map((endpoint, index) => (
              <HealthCheckCard
                key={index}
                nome={endpoint.nome}
                status={endpoint.status}
                latencia={endpoint.latencia}
                critico={endpoint.critico}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// HEALTH CHECK CARD
// =====================================================

interface HealthCheckCardProps {
  nome: string;
  status: string;
  latencia: number | null;
  critico: boolean;
}

function HealthCheckCard({ nome, status, latencia, critico }: HealthCheckCardProps) {
  const IconComponent = (() => {
    switch (nome.toLowerCase()) {
      case 'database': return Database;
      case 'auth': return Server;
      case 'storage': return Cloud;
      default: return Server;
    }
  })();

  const statusColors = {
    ok: 'text-green-600 bg-green-50 border-green-200',
    degraded: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    error: 'text-red-600 bg-red-50 border-red-200',
  }[status] || 'text-gray-600 bg-gray-50 border-gray-200';

  return (
    <div className={`p-4 rounded-lg border ${statusColors}`}>
      <div className="flex items-center justify-between mb-2">
        <IconComponent className="w-5 h-5" />
        {critico && (
          <span className="text-xs font-medium uppercase">Crítico</span>
        )}
      </div>
      <h4 className="font-medium">{nome}</h4>
      <div className="flex items-center justify-between mt-1">
        <span className="text-sm capitalize">{status}</span>
        {latencia && (
          <span className="text-sm">{latencia}ms</span>
        )}
      </div>
    </div>
  );
}

// =====================================================
// LOADING STATE
// =====================================================

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Activity className="w-8 h-8 text-indigo-600 animate-pulse mx-auto mb-4" />
        <p className="text-gray-600">Carregando métricas...</p>
      </div>
    </div>
  );
}

// =====================================================
// MOCK DATA GENERATOR
// =====================================================

function generatePerformanceData() {
  const data: Array<{
    hora: string;
    latencia: number;
    p99: number;
    requests: number;
  }> = [];
  for (let i = 23; i >= 0; i--) {
    const hora = new Date();
    hora.setHours(hora.getHours() - i);
    data.push({
      hora: hora.getHours() + ':00',
      latencia: Math.floor(Math.random() * 200) + 50,
      p99: Math.floor(Math.random() * 300) + 200,
      requests: Math.floor(Math.random() * 1000) + 500,
    });
  }
  return data;
}
