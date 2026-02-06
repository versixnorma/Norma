'use client';

import { DashboardKPIs, CondominiosHealth, ActivityChart } from '@/components/admin';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import Link from 'next/link';
import { useEffect } from 'react';

export default function AdminDashboardPage() {
  const { stats, activityData, condominiosHealth, loading, fetchAll } = useAdminDashboard();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Visão geral da plataforma Versix Norma</p>
      </div>

      {/* KPI Cards - Expanded to 8 metrics */}
      <DashboardKPIs stats={stats} loading={loading} />

      {/* Charts and Health Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity Chart - 2 columns */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                Atividade dos Últimos 7 Dias
              </h2>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-gray-500">Novos Usuários</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-gray-500">Logins</span>
                </div>
              </div>
            </div>
            <ActivityChart data={activityData} loading={loading} />
          </div>
        </div>

        {/* Condominios Health - 1 column */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                Saúde dos Condomínios
              </h2>
              <Link href="/admin/condominios" className="text-xs text-primary hover:underline">
                Ver todos
              </Link>
            </div>
            <CondominiosHealth data={condominiosHealth} loading={loading} />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Ações Rápidas</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/condominios/novo"
            className="group rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 transition-transform group-hover:scale-110 dark:bg-blue-900/30">
              <span className="material-symbols-outlined text-2xl text-blue-600">add_home</span>
            </div>
            <h3 className="mb-1 font-semibold text-gray-800 dark:text-white">Novo Condomínio</h3>
            <p className="text-sm text-gray-500">Cadastrar novo condomínio</p>
          </Link>

          <Link
            href="/admin/usuarios?status=pending"
            className="group relative rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            {stats?.usuarios_pendentes && stats.usuarios_pendentes > 0 && (
              <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {stats.usuarios_pendentes}
              </span>
            )}
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 transition-transform group-hover:scale-110 dark:bg-amber-900/30">
              <span className="material-symbols-outlined text-2xl text-amber-600">person_add</span>
            </div>
            <h3 className="mb-1 font-semibold text-gray-800 dark:text-white">Aprovar Usuários</h3>
            <p className="text-sm text-gray-500">Revisar cadastros pendentes</p>
          </Link>

          <Link
            href="/admin/feature-flags"
            className="group rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 transition-transform group-hover:scale-110 dark:bg-purple-900/30">
              <span className="material-symbols-outlined text-2xl text-purple-600">toggle_on</span>
            </div>
            <h3 className="mb-1 font-semibold text-gray-800 dark:text-white">Feature Flags</h3>
            <p className="text-sm text-gray-500">Gerenciar funcionalidades</p>
          </Link>

          <Link
            href="/admin/audit-logs"
            className="group rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 transition-transform group-hover:scale-110 dark:bg-green-900/30">
              <span className="material-symbols-outlined text-2xl text-green-600">history</span>
            </div>
            <h3 className="mb-1 font-semibold text-gray-800 dark:text-white">Audit Logs</h3>
            <p className="text-sm text-gray-500">Ver histórico de ações</p>
          </Link>
        </div>
      </section>

      {/* System Status */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
          Status do Sistema
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Uptime</p>
                <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
                  {loading ? '...' : `${stats?.uptime_percent || 99.9}%`}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                <span className="material-symbols-outlined text-2xl text-green-600">
                  check_circle
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-green-600">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span>Todos os sistemas operacionais</span>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tempo de Resposta</p>
                <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
                  {loading ? '...' : `${stats?.avg_response_time_ms || 120}ms`}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <span className="material-symbols-outlined text-2xl text-blue-600">speed</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-blue-600">
              <span className="material-symbols-outlined text-sm">info</span>
              <span>Média dos últimos 7 dias</span>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Logins Hoje</p>
                <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
                  {loading ? '...' : stats?.logins_hoje || 0}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <span className="material-symbols-outlined text-2xl text-purple-600">login</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <span className="material-symbols-outlined text-sm">schedule</span>
              <span>Atualizado em tempo real</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
