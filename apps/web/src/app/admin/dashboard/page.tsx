'use client';

import { useAdmin } from '@/hooks/useAdmin';
import { StatsCards } from '@/components/admin/StatsCards';
import { CondominiosList } from '@/components/admin/CondominiosList';
import Link from 'next/link';
import { useEffect } from 'react';

export default function AdminDashboardPage() {
  const { stats, condominios, loading, fetchStats, fetchCondominios } = useAdmin();

  useEffect(() => {
    fetchStats();
    fetchCondominios();
  }, [fetchStats, fetchCondominios]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Visão geral da plataforma Versix Norma</p>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} loading={loading} />

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

      {/* Condominios List */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Condomínios Cadastrados
          </h2>
          <Link href="/admin/condominios" className="text-sm text-primary hover:underline">
            Ver todos →
          </Link>
        </div>
        <CondominiosList condominios={condominios.slice(0, 5)} loading={loading} />
      </section>
    </div>
  );
}
