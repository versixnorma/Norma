'use client';
import { AuthGuard } from '@/contexts/AuthContext';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';
import Link from 'next/link';

export default function AuditLogsPage() {
  return (
    <AuthGuard requiredRoles={['superadmin', 'admin_master']}>
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <header className="bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><div className="flex items-center gap-4"><Link href="/admin/dashboard" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><span className="material-symbols-outlined text-gray-600 dark:text-gray-400">arrow_back</span></Link><div><h1 className="text-2xl font-bold text-gray-800 dark:text-white">Audit Logs</h1><p className="text-sm text-gray-500 mt-1">Histórico completo de ações do sistema</p></div></div></div></header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><AuditLogViewer /></main>
      </div>
    </AuthGuard>
  );
}
