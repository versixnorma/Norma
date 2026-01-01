'use client';

import { useAuditLogs, type AuditLog, type AuditLogFilters } from '@/hooks/useAuditLogs';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const ACTION_ICONS: Record<string, { icon: string; color: string }> = { USER_APPROVED: { icon: 'check_circle', color: 'text-green-500' }, USER_REJECTED: { icon: 'cancel', color: 'text-red-500' }, USER_CREATED: { icon: 'person_add', color: 'text-blue-500' }, USER_UPDATED: { icon: 'edit', color: 'text-amber-500' }, IMPERSONATE_START: { icon: 'admin_panel_settings', color: 'text-amber-500' }, IMPERSONATE_END: { icon: 'logout', color: 'text-gray-500' }, ATA_APPROVED: { icon: 'verified', color: 'text-green-500' }, LOGIN: { icon: 'login', color: 'text-blue-500' }, LOGOUT: { icon: 'logout', color: 'text-gray-500' }, default: { icon: 'history', color: 'text-gray-500' } };

export function AuditLogViewer() {
  const { logs, loading, totalCount, fetchLogs, exportLogs } = useAuditLogs();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [exporting, setExporting] = useState(false);
  const pageSize = 50;
  const totalPages = Math.ceil(totalCount / pageSize);

  useEffect(() => { fetchLogs(filters, page, pageSize); }, [fetchLogs, filters, page]);

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const getActionInfo = (acao: string) => ACTION_ICONS[acao] || ACTION_ICONS.default;
  const handleExport = async () => { setExporting(true); try { const csv = await exportLogs(filters); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`; link.click(); URL.revokeObjectURL(url); toast.success('Logs exportados'); } catch { toast.error('Erro ao exportar'); } finally { setExporting(false); } };
  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => { setFilters(prev => ({ ...prev, [key]: value || undefined })); setPage(1); };

  return (
    <div>
      <div className="bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]"><label className="block text-xs font-medium text-gray-500 mb-1">Ação</label><select value={filters.acao || ''} onChange={(e) => handleFilterChange('acao', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm focus:ring-2 focus:ring-primary"><option value="">Todas as ações</option><option value="USER_APPROVED">Usuário Aprovado</option><option value="USER_REJECTED">Usuário Rejeitado</option><option value="IMPERSONATE_START">Impersonate Iniciado</option><option value="ATA_APPROVED">Ata Aprovada</option></select></div>
          <div className="flex-1 min-w-[150px]"><label className="block text-xs font-medium text-gray-500 mb-1">Data Início</label><input type="date" value={filters.data_inicio?.split('T')[0] || ''} onChange={(e) => handleFilterChange('data_inicio', e.target.value ? `${e.target.value}T00:00:00` : '')} className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm focus:ring-2 focus:ring-primary" /></div>
          <div className="flex-1 min-w-[150px]"><label className="block text-xs font-medium text-gray-500 mb-1">Data Fim</label><input type="date" value={filters.data_fim?.split('T')[0] || ''} onChange={(e) => handleFilterChange('data_fim', e.target.value ? `${e.target.value}T23:59:59` : '')} className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm focus:ring-2 focus:ring-primary" /></div>
          <div className="flex items-end"><button onClick={handleExport} disabled={exporting} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{exporting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-lg">download</span>}Exportar CSV</button></div>
        </div>
      </div>
      <div className="bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50"><tr><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Data/Hora</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Usuário</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ação</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tabela</th><th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Detalhes</th></tr></thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map((log) => { const actionInfo = getActionInfo(log.acao); return (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDate(log.created_at)}</td>
                  <td className="px-4 py-3"><p className="text-sm font-medium text-gray-800 dark:text-white">{log.usuario_nome || 'Sistema'}</p><p className="text-xs text-gray-500 truncate max-w-[150px]">{log.usuario_email}</p></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><span className={`material-symbols-outlined ${actionInfo.color}`}>{actionInfo.icon}</span><span className="text-sm text-gray-800 dark:text-white">{log.acao.replace(/_/g, ' ')}</span></div></td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{log.tabela}</td>
                  <td className="px-4 py-3 text-center"><button onClick={() => setSelectedLog(log)} className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><span className="material-symbols-outlined text-lg">info</span></button></td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
        {logs.length === 0 && !loading && (<div className="text-center py-12"><span className="material-symbols-outlined text-4xl text-gray-400 mb-2">history</span><p className="text-gray-500">Nenhum log encontrado</p></div>)}
        {loading && (<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>)}
        {totalPages > 1 && (<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700"><p className="text-sm text-gray-500">Página {page} de {totalPages}</p><div className="flex items-center gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"><span className="material-symbols-outlined">chevron_left</span></button><button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"><span className="material-symbols-outlined">chevron_right</span></button></div></div>)}
      </div>
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-card-dark rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700"><h3 className="text-lg font-semibold text-gray-800 dark:text-white">Detalhes do Log</h3><button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><span className="material-symbols-outlined">close</span></button></div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="grid grid-cols-2 gap-4 mb-6"><div><label className="text-xs font-medium text-gray-500">Data/Hora</label><p className="text-gray-800 dark:text-white">{formatDate(selectedLog.created_at)}</p></div><div><label className="text-xs font-medium text-gray-500">Usuário</label><p className="text-gray-800 dark:text-white">{selectedLog.usuario_nome}</p></div><div><label className="text-xs font-medium text-gray-500">Ação</label><p className="text-gray-800 dark:text-white">{selectedLog.acao}</p></div><div><label className="text-xs font-medium text-gray-500">Tabela</label><p className="text-gray-800 dark:text-white">{selectedLog.tabela}</p></div></div>
              {selectedLog.dados_antes && (<div className="mb-4"><label className="text-xs font-medium text-gray-500 mb-2 block">Dados Antes</label><pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl text-xs overflow-x-auto">{JSON.stringify(selectedLog.dados_antes, null, 2)}</pre></div>)}
              {selectedLog.dados_depois && (<div><label className="text-xs font-medium text-gray-500 mb-2 block">Dados Depois</label><pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl text-xs overflow-x-auto">{JSON.stringify(selectedLog.dados_depois, null, 2)}</pre></div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
