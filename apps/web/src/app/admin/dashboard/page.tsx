'use client';

import { AuthGuard } from '@/contexts/AuthContext';
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
    <AuthGuard requiredRoles={['superadmin']}>
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-card-dark">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                  Painel SuperAdmin
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Gestão centralizada da plataforma Versix Norma
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/admin/usuarios"
                  className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <span className="material-symbols-outlined text-lg">group</span>Usuários
                </Link>
                <Link
                  href="/admin/audit-logs"
                  className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <span className="material-symbols-outlined text-lg">history</span>Audit Logs
                </Link>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="mb-8">
            <StatsCards stats={stats} loading={loading} />
          </section>
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
              Ações Rápidas
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href="/admin/condominios/novo"
                className="group rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-card-dark"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 transition-transform group-hover:scale-110 dark:bg-blue-900/30">
                  <span className="material-symbols-outlined text-2xl text-blue-600">add_home</span>
                </div>
                <h3 className="mb-1 font-semibold text-gray-800 dark:text-white">
                  Novo Condomínio
                </h3>
                <p className="text-sm text-gray-500">Cadastrar novo condomínio</p>
              </Link>
              <Link
                href="/admin/usuarios?status=pendente"
                className="group relative rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-card-dark"
              >
                {stats?.usuarios_pendentes && stats.usuarios_pendentes > 0 && (
                  <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {stats.usuarios_pendentes}
                  </span>
                )}
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 transition-transform group-hover:scale-110 dark:bg-amber-900/30">
                  <span className="material-symbols-outlined text-2xl text-amber-600">
                    person_add
                  </span>
                </div>
                <h3 className="mb-1 font-semibold text-gray-800 dark:text-white">
                  Aprovar Usuários
                </h3>
                <p className="text-sm text-gray-500">Revisar cadastros pendentes</p>
              </Link>
              <Link
                href="/admin/feature-flags"
                className="group rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-card-dark"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 transition-transform group-hover:scale-110 dark:bg-purple-900/30">
                  <span className="material-symbols-outlined text-2xl text-purple-600">
                    toggle_on
                  </span>
                </div>
                <h3 className="mb-1 font-semibold text-gray-800 dark:text-white">Feature Flags</h3>
                <p className="text-sm text-gray-500">Gerenciar funcionalidades</p>
              </Link>
              <Link
                href="/admin/audit-logs"
                className="group rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-card-dark"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 transition-transform group-hover:scale-110 dark:bg-green-900/30">
                  <span className="material-symbols-outlined text-2xl text-green-600">history</span>
                </div>
                <h3 className="mb-1 font-semibold text-gray-800 dark:text-white">Audit Logs</h3>
                <p className="text-sm text-gray-500">Ver histórico de ações</p>
              </Link>
            </div>
          </section>
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
        </main>
      </div>
    </AuthGuard>
  );
}
