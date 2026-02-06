'use client';

import type { DashboardStats } from '@/hooks/useAdminDashboard';

interface DashboardKPIsProps {
  stats: DashboardStats | null;
  loading?: boolean;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
  bgColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  alert?: boolean;
}

function KPICard({ title, value, subtitle, icon, color, bgColor, trend, alert }: KPICardProps) {
  return (
    <div
      className={`${bgColor} relative overflow-hidden rounded-2xl border border-gray-200/50 p-5 transition-shadow hover:shadow-lg dark:border-gray-700/50`}
    >
      {alert && (
        <div className="absolute right-3 top-3">
          <span className="flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
          </span>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
          </p>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
          {trend && (
            <div
              className={`mt-2 flex items-center gap-1 text-xs font-medium ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {trend.isPositive ? 'trending_up' : 'trending_down'}
              </span>
              {trend.isPositive ? '+' : ''}
              {trend.value}%
            </div>
          )}
        </div>
        <div className={`${color} flex h-10 w-10 items-center justify-center rounded-xl shadow-lg`}>
          <span className="material-symbols-outlined text-xl text-white">{icon}</span>
        </div>
      </div>
    </div>
  );
}

function KPICardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-5 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-8 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

export function DashboardKPIs({ stats, loading }: DashboardKPIsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const kpis: KPICardProps[] = [
    {
      title: 'Condomínios',
      value: stats?.total_condominios || 0,
      subtitle: `+${stats?.condominios_novos_mes || 0} este mês`,
      icon: 'apartment',
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      trend: stats?.condominios_novos_mes
        ? {
            value: Math.round((stats.condominios_novos_mes / (stats.total_condominios || 1)) * 100),
            isPositive: true,
          }
        : undefined,
    },
    {
      title: 'Usuários Ativos',
      value: stats?.usuarios_ativos || 0,
      subtitle: `de ${stats?.total_usuarios || 0} total`,
      icon: 'group',
      color: 'bg-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'Pendentes',
      value: stats?.usuarios_pendentes || 0,
      subtitle: 'aguardando aprovação',
      icon: 'pending',
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      alert: (stats?.usuarios_pendentes || 0) > 0,
    },
    {
      title: 'Total Unidades',
      value: stats?.total_unidades || 0,
      icon: 'home',
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      title: 'Novos Usuários',
      value: stats?.usuarios_novos_mes || 0,
      subtitle: 'este mês',
      icon: 'person_add',
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      trend: { value: 12, isPositive: true },
    },
    {
      title: 'Logins Hoje',
      value: stats?.logins_hoje || 0,
      subtitle: `${stats?.logins_semana || 0} na semana`,
      icon: 'login',
      color: 'bg-cyan-500',
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    },
    {
      title: 'Uptime',
      value: `${stats?.uptime_percent || 99.9}%`,
      subtitle: 'últimos 30 dias',
      icon: 'check_circle',
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      title: 'Tempo Resposta',
      value: `${stats?.avg_response_time_ms || 120}ms`,
      subtitle: 'média',
      icon: 'speed',
      color: 'bg-rose-500',
      bgColor: 'bg-rose-50 dark:bg-rose-900/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis.map((kpi, index) => (
        <KPICard key={index} {...kpi} />
      ))}
    </div>
  );
}
