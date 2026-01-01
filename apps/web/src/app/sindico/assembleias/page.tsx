'use client';

import { AuthGuard, useAuthContext } from '@/contexts/AuthContext';
import { useAssembleias } from '@/hooks/useAssembleias';
import { AssembleiaCard } from '@/components/assembleias/AssembleiaCard';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { CreateAssembleiaInput, AssembleiaTipo } from '@versix/shared/types/assembleias';

export default function SindicoAssembleiasPage() {
  const { profile } = useAuthContext();
  const { assembleias, loading, fetchAssembleias, createAssembleia } = useAssembleias();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateAssembleiaInput>({
    tipo: 'AGO',
    titulo: '',
    descricao: '',
    data_primeira_convocacao: '',
    local_presencial: '',
    quorum_minimo_primeira: 50,
    quorum_minimo_segunda: 0,
    permite_procuracao: true,
    max_procuracoes_por_pessoa: 2
  });
  const [submitting, setSubmitting] = useState(false);

  const condominioId = profile?.condominio_atual?.id;

  useEffect(() => {
    if (condominioId) fetchAssembleias(condominioId);
  }, [condominioId, fetchAssembleias]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condominioId || !profile?.id) return;
    if (!form.titulo || form.titulo.length < 5) { toast.error('Título deve ter pelo menos 5 caracteres'); return; }

    setSubmitting(true);
    const result = await createAssembleia(condominioId, profile.id, form);
    if (result) {
      toast.success('Assembleia criada com sucesso!');
      setShowForm(false);
      setForm({ tipo: 'AGO', titulo: '', descricao: '', data_primeira_convocacao: '', local_presencial: '', quorum_minimo_primeira: 50, quorum_minimo_segunda: 0, permite_procuracao: true, max_procuracoes_por_pessoa: 2 });
    } else {
      toast.error('Erro ao criar assembleia');
    }
    setSubmitting(false);
  };

  const rascunhos = assembleias.filter(a => a.status === 'rascunho');
  const convocadas = assembleias.filter(a => a.status === 'convocada');
  const ativas = assembleias.filter(a => ['em_andamento', 'votacao'].includes(a.status));
  const encerradas = assembleias.filter(a => ['encerrada', 'arquivada'].includes(a.status));

  return (
    <AuthGuard requiredRoles={['sindico']}>
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <header className="bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/home" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div>
                  <h1 className="text-xl font-bold text-gray-800 dark:text-white">Assembleias</h1>
                  <p className="text-sm text-gray-500">{profile?.condominio_atual?.nome}</p>
                </div>
              </div>
              <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium">
                <span className="material-symbols-outlined">add</span>
                Nova Assembleia
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Ativas */}
              {ativas.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    Ao Vivo ({ativas.length})
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {ativas.map(a => <AssembleiaCard key={a.id} assembleia={a} isSindico />)}
                  </div>
                </section>
              )}

              {/* Convocadas */}
              {convocadas.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500">campaign</span>
                    Convocadas ({convocadas.length})
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {convocadas.map(a => <AssembleiaCard key={a.id} assembleia={a} isSindico />)}
                  </div>
                </section>
              )}

              {/* Rascunhos */}
              {rascunhos.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-gray-400">edit_note</span>
                    Rascunhos ({rascunhos.length})
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {rascunhos.map(a => <AssembleiaCard key={a.id} assembleia={a} isSindico />)}
                  </div>
                </section>
              )}

              {/* Encerradas */}
              {encerradas.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-gray-400">inventory_2</span>
                    Encerradas ({encerradas.length})
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {encerradas.slice(0, 6).map(a => <AssembleiaCard key={a.id} assembleia={a} isSindico />)}
                  </div>
                  {encerradas.length > 6 && (
                    <button className="mt-4 text-primary font-medium">Ver todas ({encerradas.length})</button>
                  )}
                </section>
              )}

              {assembleias.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-card-dark rounded-2xl">
                  <span className="material-symbols-outlined text-5xl text-gray-400 mb-3">how_to_vote</span>
                  <h3 className="text-lg font-semibold mb-2">Nenhuma assembleia</h3>
                  <p className="text-gray-500 mb-4">Crie sua primeira assembleia para começar</p>
                  <button onClick={() => setShowForm(true)} className="px-6 py-3 bg-primary text-white rounded-xl font-medium">
                    Criar Assembleia
                  </button>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Modal de criação */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-card-dark w-full max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Nova Assembleia</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium">Tipo *</label>
                  <div className="flex gap-2 mt-1">
                    {(['AGO', 'AGE', 'permanente'] as AssembleiaTipo[]).map(t => (
                      <button key={t} type="button" onClick={() => setForm({ ...form, tipo: t })}
                        className={`flex-1 py-3 rounded-xl font-medium ${form.tipo === t ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Título *</label>
                  <input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })}
                    className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none"
                    placeholder="Ex: Assembleia Geral Ordinária 2024" required minLength={5} />
                </div>

                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })}
                    className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none resize-none"
                    rows={3} placeholder="Descreva o objetivo da assembleia..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Data 1ª Convocação</label>
                    <input type="datetime-local" value={form.data_primeira_convocacao}
                      onChange={e => setForm({ ...form, data_primeira_convocacao: e.target.value })}
                      className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quórum Mínimo (%)</label>
                    <input type="number" min="0" max="100" value={form.quorum_minimo_primeira}
                      onChange={e => setForm({ ...form, quorum_minimo_primeira: parseInt(e.target.value) })}
                      className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Local (presencial)</label>
                  <input type="text" value={form.local_presencial} onChange={e => setForm({ ...form, local_presencial: e.target.value })}
                    className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none"
                    placeholder="Ex: Salão de festas" />
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <input type="checkbox" id="procuracao" checked={form.permite_procuracao}
                    onChange={e => setForm({ ...form, permite_procuracao: e.target.checked })} className="w-5 h-5" />
                  <label htmlFor="procuracao" className="flex-1">
                    <span className="font-medium">Permitir procuração</span>
                    <p className="text-sm text-gray-500">Moradores podem representar outros via procuração</p>
                  </label>
                </div>

                <button type="submit" disabled={submitting}
                  className="w-full py-4 bg-primary text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined">add</span>}
                  {submitting ? 'Criando...' : 'Criar Assembleia'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
