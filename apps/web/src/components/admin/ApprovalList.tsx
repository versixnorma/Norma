'use client';

import { useApproveUser } from '@/hooks/useApproveUser';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ApprovalListProps { condominioId: string; onUserApproved?: () => void; }

export function ApprovalList({ condominioId, onUserApproved }: ApprovalListProps) {
  const { pendingUsers, loading, error, fetchPendingUsers, approveUser, rejectUser, approveInBatch } = useApproveUser();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingUser, setProcessingUser] = useState<string | null>(null);

  useEffect(() => { fetchPendingUsers(condominioId); }, [condominioId, fetchPendingUsers]);

  const handleApprove = async (userId: string) => {
    setProcessingUser(userId);
    const result = await approveUser(userId);
    setProcessingUser(null);
    if (result.success) { toast.success(`${result.usuario?.nome} foi aprovado!`); onUserApproved?.(); }
    else toast.error(result.error || 'Erro ao aprovar usuário');
  };

  const handleReject = async () => {
    if (!showRejectModal || !rejectReason.trim()) { toast.error('Informe o motivo da rejeição'); return; }
    setProcessingUser(showRejectModal);
    const result = await rejectUser(showRejectModal, rejectReason);
    setProcessingUser(null);
    if (result.success) { toast.success('Cadastro rejeitado'); setShowRejectModal(null); setRejectReason(''); }
    else toast.error(result.error || 'Erro ao rejeitar');
  };

  const handleBatchApprove = async () => {
    if (selectedUsers.length === 0) { toast.error('Selecione ao menos um usuário'); return; }
    const results = await approveInBatch(selectedUsers);
    const successCount = results.filter(r => r.success).length;
    toast.success(`${successCount} usuário(s) aprovado(s)`);
    setSelectedUsers([]);
    onUserApproved?.();
  };

  const toggleSelectUser = (userId: string) => setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  const toggleSelectAll = () => setSelectedUsers(selectedUsers.length === pendingUsers.length ? [] : pendingUsers.map(u => u.id));
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading && pendingUsers.length === 0) return (<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>);
  if (error) return (<div className="text-center py-12"><span className="material-symbols-outlined text-4xl text-red-500 mb-2">error</span><p className="text-gray-600 dark:text-gray-400">{error}</p><button onClick={() => fetchPendingUsers(condominioId)} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg">Tentar novamente</button></div>);
  if (pendingUsers.length === 0) return (<div className="text-center py-12"><span className="material-symbols-outlined text-5xl text-green-500 mb-3">check_circle</span><h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Nenhuma aprovação pendente</h3><p className="text-gray-500 dark:text-gray-400 text-sm">Todos os cadastros foram processados</p></div>);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={selectedUsers.length === pendingUsers.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" /><span className="text-sm text-gray-600 dark:text-gray-400">Selecionar todos</span></label>
          {selectedUsers.length > 0 && <span className="text-sm text-primary font-medium">{selectedUsers.length} selecionado(s)</span>}
        </div>
        {selectedUsers.length > 0 && (<button onClick={handleBatchApprove} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"><span className="material-symbols-outlined text-lg">done_all</span>Aprovar selecionados</button>)}
      </div>
      <div className="space-y-3">
        {pendingUsers.map((user) => (
          <div key={user.id} className={`bg-white dark:bg-card-dark rounded-xl border ${selectedUsers.includes(user.id) ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 dark:border-gray-700'} p-4 transition-all`}>
            <div className="flex items-start gap-4">
              <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => toggleSelectUser(user.id)} className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><span className="text-primary font-bold text-lg">{user.nome.charAt(0).toUpperCase()}</span></div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-800 dark:text-white">{user.nome}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  {user.telefone && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">phone</span>{user.telefone}</span>}
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span>{formatDate(user.created_at)}</span>
                  {user.unidade_numero && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">home</span>{user.bloco_nome && `${user.bloco_nome} - `}{user.unidade_numero}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleApprove(user.id)} disabled={processingUser === user.id} className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{processingUser === user.id ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-lg">check</span>}Aprovar</button>
                <button onClick={() => setShowRejectModal(user.id)} disabled={processingUser === user.id} className="flex items-center gap-1.5 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"><span className="material-symbols-outlined text-lg">close</span>Rejeitar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-card-dark rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Rejeitar Cadastro</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Informe o motivo da rejeição. O usuário será notificado.</p>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Ex: Unidade informada não confere..." className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none text-gray-700 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 resize-none" rows={4} />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => { setShowRejectModal(null); setRejectReason(''); }} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleReject} disabled={!rejectReason.trim() || loading} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50">{loading ? 'Processando...' : 'Confirmar Rejeição'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
