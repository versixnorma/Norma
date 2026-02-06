'use client';

import { AuditLogViewer } from '@/components/admin/AuditLogViewer';

export default function AuditLogsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Audit Logs</h1>
        <p className="mt-1 text-sm text-gray-500">Histórico completo de ações do sistema</p>
      </div>

      {/* Audit Log Viewer */}
      <AuditLogViewer />
    </div>
  );
}
