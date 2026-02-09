'use client';

import type { GeneratedReport } from '@/hooks/useReportBuilder';

interface ReportHistoryProps {
  reports: GeneratedReport[];
  loading?: boolean;
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  generating: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const statusLabels: Record<string, string> = {
  completed: 'Concluído',
  pending: 'Pendente',
  generating: 'Gerando',
  failed: 'Erro',
};

export function ReportHistory({ reports, loading }: ReportHistoryProps) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-700" />
        ))}
      </div>
    );
  }

  if (!reports.length) {
    return <div className="py-12 text-center text-gray-500">Nenhum relatório gerado ainda</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-xs uppercase text-gray-500 dark:border-gray-700">
            <th className="px-3 py-2">Nome</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Formato</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Tamanho</th>
            <th className="px-3 py-2">Data</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr
              key={report.id}
              className="border-b hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
            >
              <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{report.name}</td>
              <td className="px-3 py-2 capitalize text-gray-600 dark:text-gray-400">
                {report.report_type}
              </td>
              <td className="px-3 py-2 uppercase text-gray-600 dark:text-gray-400">
                {report.format}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[report.status] || ''}`}
                >
                  {statusLabels[report.status] || report.status}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                {report.file_size_bytes ? `${(report.file_size_bytes / 1024).toFixed(1)} KB` : '-'}
              </td>
              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                {new Date(report.created_at).toLocaleString('pt-BR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
