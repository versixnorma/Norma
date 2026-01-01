'use client';
import { UserTable } from '@/components/admin/UserTable';
import { AuthGuard } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import type { StatusType } from '@/types/database';
import { STATUS_LABELS } from '@/types/database';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

// Validar se o status da URL é válido
function isValidStatus(status: string | null): status is StatusType {
  return status !== null && ['pending', 'active', 'inactive', 'suspended', 'removed'].includes(status);
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
    <AuthGuard requiredRoles={['superadmin', 'admin_master']}>
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <header className="bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><div className="flex items-center gap-4"><Link href="/admin/dashboard" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><span className="material-symbols-outlined text-gray-600 dark:text-gray-400">arrow_back</span></Link><div><h1 className="text-2xl font-bold text-gray-800 dark:text-white">Gestão de Usuários</h1><p className="text-sm text-gray-500 mt-1">{statusFilter ? `Usuários ${statusLabel.toLowerCase()}` : statusLabel}</p></div></div></div></header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><UserTable onRefresh={() => fetchUsers({ status: statusFilter, condominio_id: condominioFilter })} /></main>
      </div>
    </AuthGuard>
  );
}

export default function AdminUsuariosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div><p className="mt-4 text-gray-600 dark:text-gray-400">Carregando...</p></div></div>}>
      <AdminUsuariosContent />
    </Suspense>
  );
}
