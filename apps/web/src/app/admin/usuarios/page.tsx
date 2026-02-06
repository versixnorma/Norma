'use client';

import { UserTable } from '@/components/admin/UserTable';
import { useAdmin } from '@/hooks/useAdmin';
import type { Database } from '@/types/database';
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
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Gestão de Usuários</h1>
        <p className="mt-1 text-sm text-gray-500">
          {statusFilter ? `Usuários ${statusLabel.toLowerCase()}` : statusLabel}
        </p>
      </div>

      {/* User Table */}
      <UserTable
        onRefresh={() => fetchUsers({ status: statusFilter, condominio_id: condominioFilter })}
      />
    </div>
  );
}

export default function AdminUsuariosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando...</p>
          </div>
        </div>
      }
    >
      <AdminUsuariosContent />
    </Suspense>
  );
}
