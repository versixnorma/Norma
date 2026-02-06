'use client';
import { UserTable } from '@/components/admin/UserTable';
import { AuthGuard } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import type { Database } from '@/types/database';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

type StatusType = Database['public']['Enums']['user_status'];

const STATUS_LABELS: Record<StatusType, string> = {
  active: 'Ativos',
  pending: 'Pendentes',
  inactive: 'Inativos',
  suspended: 'Suspensos',
  removed: 'Removidos',
};

// Validar se o status da URL é válido
function isValidStatus(status: string | null): status is StatusType {
  return (
    status !== null && ['pending', 'active', 'inactive', 'suspended', 'removed'].includes(status)
  );
}

function AdminUsuariosContent() {
  const { fetchUsers } = useAdmin();
  const searchParams = useSearchParams();
  const statusParam = searchParams?.get('status') ?? null;
  const statusFilter = isValidStatus(statusParam) ? statusParam : undefined;
  const condominioFilter = searchParams?.get('condominio') || undefined;

  useEffect(() => {
    fetchUsers({ status: statusFilter, condominio_id: condominioFilter });
  }, [fetchUsers, statusFilter, condominioFilter]);

  const statusLabel = statusFilter ? STATUS_LABELS[statusFilter] : 'Todos os usuários';

  return (
    <AuthGuard requiredRoles={['superadmin']}>
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-card-dark">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/dashboard"
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">
                  arrow_back
                </span>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                  Gestão de Usuários
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {statusFilter ? `Usuários ${statusLabel.toLowerCase()}` : statusLabel}
                </p>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <UserTable
            onRefresh={() => fetchUsers({ status: statusFilter, condominio_id: condominioFilter })}
          />
        </main>
      </div>
    </AuthGuard>
  );
}

export default function AdminUsuariosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bg-light dark:bg-bg-dark">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-500"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando...</p>
          </div>
        </div>
      }
    >
      <AdminUsuariosContent />
    </Suspense>
  );
}
