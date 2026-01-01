'use client';

import { OcorrenciaCard } from '@/components/ocorrencias/OcorrenciaCard';
import { AuthGuard, useAuthContext } from '@/contexts/AuthContext';
import { useAnexos } from '@/hooks/useAnexos';
import { useOcorrencias, type CreateOcorrenciaInput } from '@/hooks/useOcorrencias';
import type { OcorrenciaCategoria, OcorrenciaHistorico } from '@versix/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const CATEGORIAS: { value: OcorrenciaCategoria; label: string; icon: string }[] = [
  { value: 'barulho', label: 'Barulho', icon: 'volume_up' },
  { value: 'vazamento', label: 'Vazamento', icon: 'water_drop' },
  { value: 'iluminacao', label: 'Iluminação', icon: 'lightbulb' },
  { value: 'limpeza', label: 'Limpeza', icon: 'cleaning_services' },
  { value: 'seguranca', label: 'Segurança', icon: 'shield' },
  { value: 'area_comum', label: 'Área Comum', icon: 'deck' },
  { value: 'elevador', label: 'Elevador', icon: 'elevator' },
  { value: 'portaria', label: 'Portaria', icon: 'door_front' },
  { value: 'animais', label: 'Animais', icon: 'pets' },
  { value: 'estacionamento', label: 'Estacionamento', icon: 'local_parking' },
  { value: 'outros', label: 'Outros', icon: 'report' }
];

export default function OcorrenciasPage() {
  const { profile } = useAuthContext();
  const { ocorrencias, loading, fetchOcorrencias, createOcorrencia, getOcorrencia } = useOcorrencias();
  const { uploadMultiple, uploading } = useAnexos();
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailedOcorrencia, setDetailedOcorrencia] = useState<any>(null);
  const [form, setForm] = useState<CreateOcorrenciaInput>({ titulo: '', descricao: '', categoria: 'outros', prioridade: 'media', anonimo: false, local_descricao: '', anexos: [] });

  const condominioId = profile?.condominio_atual?.id;

  useEffect(() => {
    if (condominioId) {
      // Usar reportado_por em vez de 'minhas'
      fetchOcorrencias(condominioId, profile?.id ? { reportado_por: profile.id } : undefined);
    }
  }, [condominioId, fetchOcorrencias, profile?.id]);

  const handleCardClick = async (id: string) => {
    setSelectedId(id);
    const detail = await getOcorrencia(id);
    setDetailedOcorrencia(detail);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !condominioId) return;
    const anexos = await uploadMultiple(condominioId, 'ocorrencias', files);
    setForm(prev => ({ ...prev, anexos: [...(prev.anexos || []), ...anexos] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condominioId || !profile?.id) return;
    if (form.titulo.length < 5) { toast.error('Título muito curto'); return; }
    if (form.descricao.length < 20) { toast.error('Descrição deve ter pelo menos 20 caracteres'); return; }
    const result = await createOcorrencia(condominioId, profile.id, form);
    if (result) {
      toast.success('Ocorrência registrada!');
      setShowForm(false);
      setForm({ titulo: '', descricao: '', categoria: 'outros', prioridade: 'media', anonimo: false, local_descricao: '', anexos: [] });
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <header className="bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/home" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><span className="material-symbols-outlined">arrow_back</span></Link>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Minhas Ocorrências</h1>
              </div>
              <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium"><span className="material-symbols-outlined">add</span>Nova</button>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : ocorrencias.length === 0 ? (
            <div className="text-center py-12"><span className="material-symbols-outlined text-5xl text-gray-400 mb-3">report</span><h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Nenhuma ocorrência</h3><p className="text-gray-500 mb-4">Registre problemas para o síndico resolver</p><button onClick={() => setShowForm(true)} className="px-6 py-2 bg-primary text-white rounded-xl font-medium">Registrar Ocorrência</button></div>
          ) : (
            <div className="space-y-4">{ocorrencias.map(o => <OcorrenciaCard key={o.id} ocorrencia={o} onClick={() => handleCardClick(o.id)} />)}</div>
          )}
        </main>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-card-dark w-full sm:max-w-lg sm:rounded-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Nova Ocorrência</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><span className="material-symbols-outlined">close</span></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {CATEGORIAS.slice(0, 8).map(cat => (
                      <button key={cat.value} type="button" onClick={() => setForm({ ...form, categoria: cat.value })} className={`flex flex-col items-center p-3 rounded-xl border transition-colors ${form.categoria === cat.value ? 'border-primary bg-primary/10' : 'border-gray-200 dark:border-gray-700'}`}>
                        <span className="material-symbols-outlined text-xl mb-1">{cat.icon}</span>
                        <span className="text-xs">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div><label className="text-sm font-medium">Título *</label><input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none" placeholder="Resumo do problema" required /></div>
                <div><label className="text-sm font-medium">Descrição *</label><textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none resize-none" rows={4} placeholder="Descreva o problema em detalhes (mín. 20 caracteres)" required /></div>
                <div><label className="text-sm font-medium">Local</label><input type="text" value={form.local_descricao || ''} onChange={e => setForm({ ...form, local_descricao: e.target.value })} className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none" placeholder="Ex: Garagem B2, Área de lazer..." /></div>
                <div><label className="text-sm font-medium">Fotos</label><input type="file" multiple accept="image/*" onChange={handleFileChange} className="w-full mt-1" />{uploading && <p className="text-xs text-primary mt-1">Enviando...</p>}{form.anexos && form.anexos.length > 0 && <p className="text-xs text-green-600 mt-1">{form.anexos.length} foto(s) anexada(s)</p>}</div>
                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer"><input type="checkbox" checked={form.anonimo} onChange={e => setForm({ ...form, anonimo: e.target.checked })} className="w-5 h-5 rounded" /><div><span className="font-medium">Registrar anonimamente</span><p className="text-xs text-gray-500">O síndico não verá seu nome</p></div></label>
                <button type="submit" disabled={loading} className="w-full py-4 bg-primary text-white rounded-xl font-bold disabled:opacity-50">{loading ? 'Enviando...' : 'Registrar Ocorrência'}</button>
              </form>
            </div>
          </div>
        )}

        {selectedId && detailedOcorrencia && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => { setSelectedId(null); setDetailedOcorrencia(null); }}>
            <div className="bg-white dark:bg-card-dark w-full sm:max-w-lg sm:rounded-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold line-clamp-1">{detailedOcorrencia.titulo}</h2>
                <button onClick={() => { setSelectedId(null); setDetailedOcorrencia(null); }} className="p-2 hover:bg-gray-100 rounded-lg"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-6">
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap mb-6">{detailedOcorrencia.descricao}</p>
                {detailedOcorrencia.resolucao && (<div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-6"><h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Resolução</h4><p className="text-green-700 dark:text-green-300 text-sm">{detailedOcorrencia.resolucao}</p></div>)}
                {detailedOcorrencia.historico && detailedOcorrencia.historico.length > 0 && (
                  <div><h4 className="font-medium mb-3">Histórico</h4><div className="space-y-3">{detailedOcorrencia.historico.map((h: OcorrenciaHistorico) => (<div key={h.id} className="flex gap-3 text-sm"><div className="w-2 h-2 rounded-full bg-primary mt-2" /><div><p className="text-gray-800 dark:text-white">{h.status_anterior} → {h.status_novo}</p><p className="text-gray-500 text-xs">{new Date(h.created_at).toLocaleString('pt-BR')}</p></div></div>))}</div></div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
