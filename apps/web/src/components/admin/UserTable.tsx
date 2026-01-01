'use client';

import { useAdmin, type AdminUser } from '@/hooks/useAdmin';
import { useImpersonate } from '@/hooks/useImpersonate';
import type { StatusType } from '@/types/database';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'sonner';

interface UserTableProps { onRefresh?: () => void; }

const ROLE_LABELS: Record<string, string> = { superadmin: 'Super Admin', admin_master: 'Admin Master', sindico: 'Síndico', subsindico: 'Sub-síndico', conselheiro: 'Conselheiro', morador: 'Morador', porteiro: 'Porteiro', zelador: 'Zelador' };
const STATUS_CONFIG: Record<StatusType, { label: string; color: string }> = { active: { label: 'Ativo', color: 'bg-green-100 text-green-700' }, pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' }, inactive: { label: 'Inativo', color: 'bg-gray-100 text-gray-700' }, suspended: { label: 'Suspenso', color: 'bg-red-100 text-red-700' }, removed: { label: 'Removido', color: 'bg-red-100 text-red-700' } };

export function UserTable({ onRefresh }: UserTableProps) {
  const { users, loading, updateUserStatus, searchUsers } = useAdmin();
  const { startImpersonate } = useImpersonate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AdminUser[]>([]);
  const [showImpersonateModal, setShowImpersonateModal] = useState<AdminUser | null>(null);
  const [impersonateReason, setImpersonateReason] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [processing, setProcessing] = useState<string | null>(null);

  const displayUsers = searchQuery && searchResults.length > 0 ? searchResults : users;

  const handleSearch = async (query: string) => { setSearchQuery(query); if (query.length >= 2) { const results = await searchUsers(query); setSearchResults(results); } else setSearchResults([]); };
  const handleStatusChange = async (userId: string, newStatus: StatusType) => { setProcessing(userId); const success = await updateUserStatus(userId, newStatus); setProcessing(null); if (success) { toast.success('Status atualizado'); onRefresh?.(); } else toast.error('Erro ao atualizar status'); };
  const handleImpersonate = async () => {
    if (!showImpersonateModal || impersonateReason.length < 10) { toast.error('Motivo deve ter pelo menos 10 caracteres'); return; }
    setProcessing(showImpersonateModal.id);
    const result = await startImpersonate(showImpersonateModal.id, impersonateReason);
    if (!result.success) { setProcessing(null); toast.error(result.error || 'Erro ao impersonar'); }
  };
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR');

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1"><span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span><input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} placeholder="Buscar por nome ou email..." className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none text-gray-700 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary" /></div>
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none text-gray-700 dark:text-white focus:ring-2 focus:ring-primary"><option value="">Todos os status</option><option value="active">Ativos</option><option value="pending">Pendentes</option><option value="inactive">Inativos</option><option value="suspended">Suspensos</option></select>
      </div>
      <div className="bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuário</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Condomínio / Role</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cadastro</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th></tr></thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {displayUsers.filter(u => !selectedStatus || u.status === selectedStatus).map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">{user.avatar_url ? <Image src={user.avatar_url} alt={user.nome} width={40} height={40} className="w-10 h-10 rounded-full object-cover" /> : <span className="text-primary font-bold">{user.nome.charAt(0).toUpperCase()}</span>}</div><div><p className="font-medium text-gray-800 dark:text-white">{user.nome}</p><p className="text-sm text-gray-500 truncate max-w-[200px]">{user.email}</p></div></div></td>
                  <td className="px-6 py-4">{user.condominios.length > 0 ? (<div className="space-y-1">{user.condominios.slice(0, 2).map((c, i) => (<div key={i} className="text-sm"><span className="text-gray-800 dark:text-white">{c.condominio_nome}</span><span className="text-gray-500 ml-2">({ROLE_LABELS[c.role] || c.role})</span></div>))}{user.condominios.length > 2 && <span className="text-xs text-primary">+{user.condominios.length - 2} mais</span>}</div>) : <span className="text-gray-400 text-sm">Sem condomínio</span>}</td>
                  <td className="px-6 py-4"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[user.status]?.color || 'bg-gray-100 text-gray-700'}`}>{STATUS_CONFIG[user.status]?.label || user.status}</span></td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(user.created_at)}</td>
                  <td className="px-6 py-4"><div className="flex items-center justify-end gap-2"><select value={user.status} onChange={(e) => handleStatusChange(user.id, e.target.value as StatusType)} disabled={processing === user.id} className="px-2 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary"><option value="active">Ativar</option><option value="inactive">Inativar</option><option value="suspended">Suspender</option><option value="removed">Bloquear</option></select><button onClick={() => setShowImpersonateModal(user)} className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Impersonar usuário"><span className="material-symbols-outlined text-lg">admin_panel_settings</span></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {displayUsers.length === 0 && !loading && (<div className="text-center py-12"><span className="material-symbols-outlined text-4xl text-gray-400 mb-2">person_off</span><p className="text-gray-500">Nenhum usuário encontrado</p></div>)}
      </div>
      {showImpersonateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-card-dark rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4"><span className="material-symbols-outlined text-2xl text-amber-500">admin_panel_settings</span><h3 className="text-lg font-semibold text-gray-800 dark:text-white">Impersonar Usuário</h3></div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 mb-4"><p className="text-sm text-amber-800 dark:text-amber-200">Você irá visualizar o sistema como <strong>{showImpersonateModal.nome}</strong>. Esta ação será registrada no log de auditoria.</p></div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Motivo do acesso (obrigatório)</label>
              <textarea value={impersonateReason} onChange={(e) => setImpersonateReason(e.target.value)} placeholder="Ex: Suporte ao usuário para resolução de problema com boleto..." className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none text-gray-700 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 resize-none" rows={3} />
              <p className="text-xs text-gray-500 mt-1">Mínimo de 10 caracteres</p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => { setShowImpersonateModal(null); setImpersonateReason(''); }} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleImpersonate} disabled={impersonateReason.length < 10 || processing === showImpersonateModal.id} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50">{processing ? 'Processando...' : 'Iniciar Impersonate'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
