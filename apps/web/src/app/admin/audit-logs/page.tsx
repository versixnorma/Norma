'use client';
import { AuthGuard } from '@/contexts/AuthContext';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';
import Link from 'next/link';

export default function AuditLogsPage() {
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
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Audit Logs</h1>
                <p className="mt-1 text-sm text-gray-500">Histórico completo de ações do sistema</p>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <AuditLogViewer />
        </main>
      </div>
    </AuthGuard>
  );
}
