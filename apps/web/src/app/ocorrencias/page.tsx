'use client';

import { OcorrenciaCard } from '@/components/ocorrencias/OcorrenciaCard';
import { AuthGuard, useAuthContext } from '@/contexts/AuthContext';
import { useAnexos } from '@/hooks/useAnexos';
import { useOcorrencias, type CreateOcorrenciaInput } from '@/hooks/useOcorrencias';
import type { OcorrenciaCategoria, OcorrenciaHistorico, OcorrenciaComJoins } from '@versix/shared';
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
  { value: 'outros', label: 'Outros', icon: 'report' },
];

export default function OcorrenciasPage() {
  const { profile } = useAuthContext();
  const { ocorrencias, loading, fetchOcorrencias, createOcorrencia, getOcorrencia } =
    useOcorrencias();
  const { uploadMultiple, uploading } = useAnexos();
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailedOcorrencia, setDetailedOcorrencia] = useState<
    (OcorrenciaComJoins & { historico?: OcorrenciaHistorico[] }) | null
  >(null);
  const [form, setForm] = useState<CreateOcorrenciaInput>({
    titulo: '',
    descricao: '',
    categoria: 'outros',
    prioridade: 'media',
    anonimo: false,
    local_descricao: '',
    anexos: [],
  });

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
    setForm((prev) => ({ ...prev, anexos: [...(prev.anexos || []), ...anexos] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condominioId || !profile?.id) return;
    if (form.titulo.length < 5) {
      toast.error('Título muito curto');
      return;
    }
    if (form.descricao.length < 20) {
      toast.error('Descrição deve ter pelo menos 20 caracteres');
      return;
    }
    const result = await createOcorrencia(condominioId, profile.id, form);
    if (result) {
      toast.success('Ocorrência registrada!');
      setShowForm(false);
      setForm({
        titulo: '',
        descricao: '',
        categoria: 'outros',
        prioridade: 'media',
        anonimo: false,
        local_descricao: '',
        anexos: [],
      });
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-card-dark">
          <div className="mx-auto max-w-3xl px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link
                  href="/home"
                  className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                  Minhas Ocorrências
                </h1>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-medium text-white"
              >
                <span className="material-symbols-outlined">add</span>Nova
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : ocorrencias.length === 0 ? (
            <div className="py-12 text-center">
              <span className="material-symbols-outlined mb-3 text-5xl text-gray-400">report</span>
              <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white">
                Nenhuma ocorrência
              </h3>
              <p className="mb-4 text-gray-500">Registre problemas para o síndico resolver</p>
              <button
                onClick={() => setShowForm(true)}
                className="rounded-xl bg-primary px-6 py-2 font-medium text-white"
              >
                Registrar Ocorrência
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {ocorrencias.map((o) => (
                <OcorrenciaCard key={o.id} ocorrencia={o} onClick={() => handleCardClick(o.id)} />
              ))}
            </div>
          )}
        </main>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
            <div className="max-h-[90vh] w-full overflow-y-auto bg-white dark:bg-card-dark sm:max-w-lg sm:rounded-2xl">
              <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-card-dark">
                <h2 className="text-lg font-bold">Nova Ocorrência</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Categoria
                  </label>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {CATEGORIAS.slice(0, 8).map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setForm({ ...form, categoria: cat.value })}
                        className={`flex flex-col items-center rounded-xl border p-3 transition-colors ${form.categoria === cat.value ? 'border-primary bg-primary/10' : 'border-gray-200 dark:border-gray-700'}`}
                      >
                        <span className="material-symbols-outlined mb-1 text-xl">{cat.icon}</span>
                        <span className="text-xs">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Título *</label>
                  <input
                    type="text"
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    className="mt-1 w-full rounded-xl border-none bg-gray-100 px-4 py-3 dark:bg-gray-800"
                    placeholder="Resumo do problema"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição *</label>
                  <textarea
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    className="mt-1 w-full resize-none rounded-xl border-none bg-gray-100 px-4 py-3 dark:bg-gray-800"
                    rows={4}
                    placeholder="Descreva o problema em detalhes (mín. 20 caracteres)"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Local</label>
                  <input
                    type="text"
                    value={form.local_descricao || ''}
                    onChange={(e) => setForm({ ...form, local_descricao: e.target.value })}
                    className="mt-1 w-full rounded-xl border-none bg-gray-100 px-4 py-3 dark:bg-gray-800"
                    placeholder="Ex: Garagem B2, Área de lazer..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Fotos</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="mt-1 w-full"
                  />
                  {uploading && <p className="mt-1 text-xs text-primary">Enviando...</p>}
                  {form.anexos && form.anexos.length > 0 && (
                    <p className="mt-1 text-xs text-green-600">
                      {form.anexos.length} foto(s) anexada(s)
                    </p>
                  )}
                </div>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={form.anonimo}
                    onChange={(e) => setForm({ ...form, anonimo: e.target.checked })}
                    className="h-5 w-5 rounded"
                  />
                  <div>
                    <span className="font-medium">Registrar anonimamente</span>
                    <p className="text-xs text-gray-500">O síndico não verá seu nome</p>
                  </div>
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-primary py-4 font-bold text-white disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Registrar Ocorrência'}
                </button>
              </form>
            </div>
          </div>
        )}

        {selectedId && detailedOcorrencia && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
            onClick={() => {
              setSelectedId(null);
              setDetailedOcorrencia(null);
            }}
          >
            <div
              className="max-h-[90vh] w-full overflow-y-auto bg-white dark:bg-card-dark sm:max-w-lg sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-card-dark">
                <h2 className="line-clamp-1 text-lg font-bold">{detailedOcorrencia.titulo}</h2>
                <button
                  onClick={() => {
                    setSelectedId(null);
                    setDetailedOcorrencia(null);
                  }}
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-6">
                <p className="mb-6 whitespace-pre-wrap text-gray-600 dark:text-gray-300">
                  {detailedOcorrencia.descricao}
                </p>
                {detailedOcorrencia.resolucao && (
                  <div className="mb-6 rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
                    <h4 className="mb-2 font-medium text-green-800 dark:text-green-200">
                      Resolução
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {detailedOcorrencia.resolucao}
                    </p>
                  </div>
                )}
                {detailedOcorrencia.historico && detailedOcorrencia.historico.length > 0 && (
                  <div>
                    <h4 className="mb-3 font-medium">Histórico</h4>
                    <div className="space-y-3">
                      {detailedOcorrencia.historico.map((h: OcorrenciaHistorico) => (
                        <div key={h.id} className="flex gap-3 text-sm">
                          <div className="mt-2 h-2 w-2 rounded-full bg-primary" />
                          <div>
                            <p className="text-gray-800 dark:text-white">
                              {h.status_anterior} → {h.status_novo}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(h.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
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
