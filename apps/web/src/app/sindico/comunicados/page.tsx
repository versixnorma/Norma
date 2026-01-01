'use client';

import { ComunicadoCard } from '@/components/comunicados/ComunicadoCard';
import { ComunicadoForm } from '@/components/comunicados/ComunicadoForm';
import { AuthGuard, useAuthContext } from '@/contexts/AuthContext';
import { useComunicados } from '@/hooks/useComunicados';
import type { ComunicadoStatus, CreateComunicadoInput } from '@versix/shared';
import type { ComunicadoLeitura } from '@versix/shared/types/operational';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function SindicoComunicadosPage() {
  const { profile } = useAuthContext();
  const { comunicados, loading, fetchComunicados, createComunicado, updateComunicado, deleteComunicado, getLeituras } = useComunicados();
  const [statusFilter, setStatusFilter] = useState<ComunicadoStatus | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingLeituras, setViewingLeituras] = useState<{ id: string; leituras: ComunicadoLeitura[] } | null>(null);

  const condominioId = profile?.condominio_atual?.id;

  useEffect(() => {
    if (condominioId) fetchComunicados(condominioId, { status: statusFilter as ComunicadoStatus || undefined });
  }, [condominioId, statusFilter, fetchComunicados]);

  const handleCreate = async (data: CreateComunicadoInput): Promise<boolean> => {
    if (!condominioId || !profile?.id) return false;
    const result = await createComunicado(condominioId, profile.id, data);
    if (result) { setShowForm(false); return true; }
    return false;
  };

  const handleUpdate = async (data: CreateComunicadoInput): Promise<boolean> => {
    if (!editingId) return false;
    const result = await updateComunicado({ id: editingId, ...data });
    if (result) { setEditingId(null); return true; }
    return false;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este comunicado?')) return;
    const success = await deleteComunicado(id);
    if (success) toast.success('Comunicado excluído');
  };

  const handleViewLeituras = async (id: string) => {
    const leituras = await getLeituras(id);
    setViewingLeituras({ id, leituras });
  };

  const editingComunicado = comunicados.find(c => c.id === editingId);

  return (
    <AuthGuard requiredRoles={['sindico', 'subsindico']}>
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <header className="bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/home" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><span className="material-symbols-outlined">arrow_back</span></Link>
                <div>
                  <h1 className="text-xl font-bold text-gray-800 dark:text-white">Gerenciar Comunicados</h1>
                  <p className="text-sm text-gray-500">{profile?.condominio_atual?.nome}</p>
                </div>
              </div>
              <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium"><span className="material-symbols-outlined">add</span>Novo</button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex gap-2 mb-6">
            {[{ value: '', label: 'Todos' }, { value: 'rascunho', label: 'Rascunhos' }, { value: 'publicado', label: 'Publicados' }, { value: 'arquivado', label: 'Arquivados' }].map(s => (
              <button key={s.value} onClick={() => setStatusFilter(s.value as ComunicadoStatus | '')} className={`px-4 py-2 rounded-xl text-sm font-medium ${statusFilter === s.value ? 'bg-primary text-white' : 'bg-white dark:bg-card-dark text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>{s.label}</button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : comunicados.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-card-dark rounded-2xl"><span className="material-symbols-outlined text-5xl text-gray-400 mb-3">campaign</span><h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Nenhum comunicado</h3><p className="text-gray-500 mb-4">Crie seu primeiro comunicado</p><button onClick={() => setShowForm(true)} className="px-6 py-2 bg-primary text-white rounded-xl font-medium">Criar Comunicado</button></div>
          ) : (
            <div className="space-y-4">
              {comunicados.map(c => (
                <div key={c.id} className="relative group">
                  <ComunicadoCard comunicado={c} showStatus />
                  <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleViewLeituras(c.id)} className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:bg-gray-50" title="Ver leituras"><span className="material-symbols-outlined text-lg">visibility</span></button>
                    <button onClick={() => setEditingId(c.id)} className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:bg-gray-50" title="Editar"><span className="material-symbols-outlined text-lg">edit</span></button>
                    <button onClick={() => handleDelete(c.id)} className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:bg-red-50 text-red-500" title="Excluir"><span className="material-symbols-outlined text-lg">delete</span></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {(showForm || editingId) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-card-dark w-full max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">{editingId ? 'Editar Comunicado' : 'Novo Comunicado'}</h2>
                <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-2 hover:bg-gray-100 rounded-lg"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-6">
                <ComunicadoForm comunicado={editingComunicado} condominioId={condominioId!} onSubmit={editingId ? handleUpdate : handleCreate} onCancel={() => { setShowForm(false); setEditingId(null); }} />
              </div>
            </div>
          </div>
        )}

        {viewingLeituras && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewingLeituras(null)}>
            <div className="bg-white dark:bg-card-dark w-full max-w-md rounded-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-bold">Leituras ({viewingLeituras.leituras.length})</h3>
                <button onClick={() => setViewingLeituras(null)} className="p-2 hover:bg-gray-100 rounded-lg"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                {viewingLeituras.leituras.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nenhuma leitura registrada</p>
                ) : (
                  <div className="space-y-2">
                    {viewingLeituras.leituras.map((l: ComunicadoLeitura) => (
                      <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-800 dark:text-white">{l.usuario?.nome || 'Usuário'}</span>
                        <span className="text-xs text-gray-400">{new Date(l.lido_em).toLocaleString('pt-BR')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
