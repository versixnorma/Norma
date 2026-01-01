'use client';

import { AuthGuard } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { StatsCards } from '@/components/admin/StatsCards';
import { CondominiosList } from '@/components/admin/CondominiosList';
import Link from 'next/link';
import { useEffect } from 'react';

export default function AdminDashboardPage() {
  const { stats, condominios, loading, fetchStats, fetchCondominios } = useAdmin();

  useEffect(() => { fetchStats(); fetchCondominios(); }, [fetchStats, fetchCondominios]);

  return (
    <AuthGuard requiredRoles={['superadmin', 'admin_master']}>
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <header className="bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div><h1 className="text-2xl font-bold text-gray-800 dark:text-white">Painel SuperAdmin</h1><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestão centralizada da plataforma Versix Norma</p></div>
              <div className="flex items-center gap-3">
                <Link href="/admin/usuarios" className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"><span className="material-symbols-outlined text-lg">group</span>Usuários</Link>
                <Link href="/admin/audit-logs" className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"><span className="material-symbols-outlined text-lg">history</span>Audit Logs</Link>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <section className="mb-8"><StatsCards stats={stats} loading={loading} /></section>
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Ações Rápidas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/admin/condominios/novo" className="bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow group"><div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-blue-600 text-2xl">add_home</span></div><h3 className="font-semibold text-gray-800 dark:text-white mb-1">Novo Condomínio</h3><p className="text-sm text-gray-500">Cadastrar novo condomínio</p></Link>
              <Link href="/admin/usuarios?status=pendente" className="bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow group relative">{stats?.usuarios_pendentes && stats.usuarios_pendentes > 0 && <span className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">{stats.usuarios_pendentes}</span>}<div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-amber-600 text-2xl">person_add</span></div><h3 className="font-semibold text-gray-800 dark:text-white mb-1">Aprovar Usuários</h3><p className="text-sm text-gray-500">Revisar cadastros pendentes</p></Link>
              <Link href="/admin/feature-flags" className="bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow group"><div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-purple-600 text-2xl">toggle_on</span></div><h3 className="font-semibold text-gray-800 dark:text-white mb-1">Feature Flags</h3><p className="text-sm text-gray-500">Gerenciar funcionalidades</p></Link>
              <Link href="/admin/audit-logs" className="bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow group"><div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-green-600 text-2xl">history</span></div><h3 className="font-semibold text-gray-800 dark:text-white mb-1">Audit Logs</h3><p className="text-sm text-gray-500">Ver histórico de ações</p></Link>
            </div>
          </section>
          <section><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold text-gray-800 dark:text-white">Condomínios Cadastrados</h2><Link href="/admin/condominios" className="text-sm text-primary hover:underline">Ver todos →</Link></div><CondominiosList condominios={condominios.slice(0, 5)} loading={loading} /></section>
        </main>
      </div>
    </AuthGuard>
  );
}
