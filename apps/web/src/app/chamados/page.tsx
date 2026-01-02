'use client';

import { ChamadoCard } from '@/components/chamados/ChamadoCard';
import { AuthGuard, useAuthContext } from '@/contexts/AuthContext';
import { useChamados, type CreateChamadoInput } from '@/hooks/useChamados';
import { ChamadoCategoria, type ChamadoComJoins } from '@versix/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const CATEGORIAS: { value: ChamadoCategoria; label: string; icon: string }[] = [
  { value: 'segunda_via_boleto', label: '2ª Via Boleto', icon: 'receipt' },
  { value: 'atualizacao_cadastro', label: 'Atualizar Cadastro', icon: 'person' },
  { value: 'reserva_espaco', label: 'Reservar Espaço', icon: 'event' },
  { value: 'autorizacao_obra', label: 'Autorizar Obra', icon: 'construction' },
  { value: 'mudanca', label: 'Mudança', icon: 'local_shipping' },
  { value: 'reclamacao', label: 'Reclamação', icon: 'sentiment_dissatisfied' },
  { value: 'sugestao', label: 'Sugestão', icon: 'lightbulb' },
  { value: 'duvida', label: 'Dúvida', icon: 'help' },
  { value: 'outros', label: 'Outros', icon: 'more_horiz' },
];

export default function ChamadosPage() {
  const { profile } = useAuthContext();
  const {
    chamados,
    loading,
    fetchChamados,
    createChamado,
    getChamado,
    addMensagem,
    avaliarChamado,
  } = useChamados();
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailedChamado, setDetailedChamado] = useState<ChamadoComJoins | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [form, setForm] = useState<CreateChamadoInput>({
    titulo: '',
    descricao: '',
    categoria: 'duvida',
    prioridade: 'media',
    anexos: [],
  });

  const condominioId = profile?.condominio_atual?.id;

  useEffect(() => {
    if (condominioId) {
      // Usar solicitante_id em vez de 'meus'
      fetchChamados(condominioId, profile?.id ? { solicitante_id: profile.id } : undefined);
    }
  }, [condominioId, fetchChamados, profile?.id]);

  const handleCardClick = async (id: string) => {
    setSelectedId(id);
    const detail = await getChamado(id);
    setDetailedChamado(detail);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condominioId || !profile?.id) return;
    const result = await createChamado(condominioId, profile.id, form);
    if (result) {
      toast.success('Chamado criado!');
      setShowForm(false);
      setForm({ titulo: '', descricao: '', categoria: 'duvida', prioridade: 'media', anexos: [] });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedId || !profile?.id) return;
    const result = await addMensagem(profile.id, {
      chamado_id: selectedId,
      mensagem: newMessage,
      anexos: [],
    });
    if (result) {
      setNewMessage('');
      const detail = await getChamado(selectedId);
      setDetailedChamado(detail);
      toast.success('Mensagem enviada');
    }
  };

  const handleRate = async () => {
    if (rating === 0 || !selectedId) return;
    const success = await avaliarChamado({ id: selectedId, avaliacao_nota: rating });
    if (success) {
      toast.success('Avaliação enviada!');
      const detail = await getChamado(selectedId);
      setDetailedChamado(detail);
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
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Meus Chamados</h1>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-medium text-white"
              >
                <span className="material-symbols-outlined">add</span>Novo
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : chamados.length === 0 ? (
            <div className="py-12 text-center">
              <span className="material-symbols-outlined mb-3 text-5xl text-gray-400">
                support_agent
              </span>
              <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white">
                Nenhum chamado
              </h3>
              <p className="mb-4 text-gray-500">Abra um chamado para falar com o síndico</p>
              <button
                onClick={() => setShowForm(true)}
                className="rounded-xl bg-primary px-6 py-2 font-medium text-white"
              >
                Abrir Chamado
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {chamados.map((c) => (
                <ChamadoCard key={c.id} chamado={c} onClick={() => handleCardClick(c.id)} />
              ))}
            </div>
          )}
        </main>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
            <div className="max-h-[90vh] w-full overflow-y-auto bg-white dark:bg-card-dark sm:max-w-lg sm:rounded-2xl">
              <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-card-dark">
                <h2 className="text-lg font-bold">Novo Chamado</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <div>
                  <label className="text-sm font-medium">O que você precisa?</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {CATEGORIAS.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setForm({ ...form, categoria: cat.value })}
                        className={`flex flex-col items-center rounded-xl border p-3 transition-colors ${form.categoria === cat.value ? 'border-primary bg-primary/10' : 'border-gray-200 dark:border-gray-700'}`}
                      >
                        <span className="material-symbols-outlined mb-1 text-xl">{cat.icon}</span>
                        <span className="text-center text-xs">{cat.label}</span>
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
                    placeholder="Resumo do pedido"
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
                    placeholder="Detalhe sua solicitação"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-primary py-4 font-bold text-white disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Enviar Chamado'}
                </button>
              </form>
            </div>
          </div>
        )}

        {selectedId && detailedChamado && (
          <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-bg-dark">
            <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-card-dark">
              <button
                onClick={() => {
                  setSelectedId(null);
                  setDetailedChamado(null);
                }}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="line-clamp-1 font-bold">{detailedChamado.titulo}</h2>
                <p className="text-xs text-gray-500">
                  {CATEGORIAS.find((c) => c.value === detailedChamado.categoria)?.label}
                </p>
              </div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="rounded-2xl bg-gray-100 p-4 dark:bg-gray-800">
                <p className="whitespace-pre-wrap text-sm">{detailedChamado.descricao}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(detailedChamado.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              {detailedChamado.mensagens?.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded-2xl p-4 ${m.autor_id === profile?.id ? 'ml-auto bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
                >
                  <p className="whitespace-pre-wrap text-sm">{m.mensagem}</p>
                  <p
                    className={`mt-1 text-xs ${m.autor_id === profile?.id ? 'text-white/70' : 'text-gray-400'}`}
                  >
                    {m.autor?.nome} •{' '}
                    {new Date(m.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
              {detailedChamado.status === 'resolvido' && !detailedChamado.avaliacao_nota && (
                <div className="rounded-2xl bg-green-50 p-4 text-center dark:bg-green-900/20">
                  <p className="mb-3 font-medium text-green-800 dark:text-green-200">
                    Chamado resolvido! Como foi o atendimento?
                  </p>
                  <div className="mb-3 flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setRating(star)} className="text-2xl">
                        {star <= rating ? '⭐' : '☆'}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleRate}
                    disabled={rating === 0}
                    className="rounded-xl bg-green-600 px-6 py-2 font-medium text-white disabled:opacity-50"
                  >
                    Enviar Avaliação
                  </button>
                </div>
              )}
            </div>
            {!['fechado', 'resolvido'].includes(detailedChamado.status) && (
              <div className="flex gap-3 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-card-dark">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 rounded-xl border-none bg-gray-100 px-4 py-3 dark:bg-gray-800"
                  placeholder="Digite sua mensagem..."
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="rounded-xl bg-primary px-4 py-3 text-white disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">send</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
