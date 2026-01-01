'use client';

import { ChamadoCard } from '@/components/chamados/ChamadoCard';
import { AuthGuard, useAuthContext } from '@/contexts/AuthContext';
import { useChamados, type CreateChamadoInput } from '@/hooks/useChamados';
import { ChamadoCategoria } from '@versix/shared';
import type { ChamadoMensagem } from '@versix/shared/types/operational';
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
  { value: 'outros', label: 'Outros', icon: 'more_horiz' }
];

export default function ChamadosPage() {
  const { profile } = useAuthContext();
  const { chamados, loading, fetchChamados, createChamado, getChamado, addMensagem, avaliarChamado } = useChamados();
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailedChamado, setDetailedChamado] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [form, setForm] = useState<CreateChamadoInput>({ titulo: '', descricao: '', categoria: 'duvida', prioridade: 'media', anexos: [] });

  const condominioId = profile?.condominio_atual?.id;

  useEffect(() => {
    if (condominioId) {
      // Usar solicitante_id em vez de 'meus'
      fetchChamados(condominioId, profile?.id ? { solicitante_id: profile.id } : undefined);
    }
  }, [condominioId, fetchChamados, profile?.id]);

  const handleCardClick = async (id: string) => { setSelectedId(id); const detail = await getChamado(id); setDetailedChamado(detail); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condominioId || !profile?.id) return;
    const result = await createChamado(condominioId, profile.id, form);
    if (result) { toast.success('Chamado criado!'); setShowForm(false); setForm({ titulo: '', descricao: '', categoria: 'duvida', prioridade: 'media', anexos: [] }); }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedId || !profile?.id) return;
    const result = await addMensagem(profile.id, { chamado_id: selectedId, mensagem: newMessage, anexos: [] });
    if (result) { setNewMessage(''); const detail = await getChamado(selectedId); setDetailedChamado(detail); toast.success('Mensagem enviada'); }
  };

  const handleRate = async () => {
    if (rating === 0 || !selectedId) return;
    const success = await avaliarChamado({ id: selectedId, avaliacao_nota: rating });
    if (success) { toast.success('Avaliação enviada!'); const detail = await getChamado(selectedId); setDetailedChamado(detail); }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <header className="bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/home" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><span className="material-symbols-outlined">arrow_back</span></Link>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Meus Chamados</h1>
              </div>
              <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium"><span className="material-symbols-outlined">add</span>Novo</button>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6">
          {loading ? (<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : chamados.length === 0 ? (
            <div className="text-center py-12"><span className="material-symbols-outlined text-5xl text-gray-400 mb-3">support_agent</span><h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Nenhum chamado</h3><p className="text-gray-500 mb-4">Abra um chamado para falar com o síndico</p><button onClick={() => setShowForm(true)} className="px-6 py-2 bg-primary text-white rounded-xl font-medium">Abrir Chamado</button></div>
          ) : (<div className="space-y-4">{chamados.map(c => <ChamadoCard key={c.id} chamado={c} onClick={() => handleCardClick(c.id)} />)}</div>)}
        </main>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-card-dark w-full sm:max-w-lg sm:rounded-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Novo Chamado</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><span className="material-symbols-outlined">close</span></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div><label className="text-sm font-medium">O que você precisa?</label><div className="grid grid-cols-3 gap-2 mt-2">{CATEGORIAS.map(cat => (<button key={cat.value} type="button" onClick={() => setForm({ ...form, categoria: cat.value })} className={`flex flex-col items-center p-3 rounded-xl border transition-colors ${form.categoria === cat.value ? 'border-primary bg-primary/10' : 'border-gray-200 dark:border-gray-700'}`}><span className="material-symbols-outlined text-xl mb-1">{cat.icon}</span><span className="text-xs text-center">{cat.label}</span></button>))}</div></div>
                <div><label className="text-sm font-medium">Título *</label><input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none" placeholder="Resumo do pedido" required /></div>
                <div><label className="text-sm font-medium">Descrição *</label><textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none resize-none" rows={4} placeholder="Detalhe sua solicitação" required /></div>
                <button type="submit" disabled={loading} className="w-full py-4 bg-primary text-white rounded-xl font-bold disabled:opacity-50">{loading ? 'Enviando...' : 'Enviar Chamado'}</button>
              </form>
            </div>
          </div>
        )}

        {selectedId && detailedChamado && (
          <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-bg-dark">
            <div className="bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700 px-4 py-4 flex items-center gap-3">
              <button onClick={() => { setSelectedId(null); setDetailedChamado(null); }} className="p-2 hover:bg-gray-100 rounded-lg"><span className="material-symbols-outlined">arrow_back</span></button>
              <div className="flex-1 min-w-0"><h2 className="font-bold line-clamp-1">{detailedChamado.titulo}</h2><p className="text-xs text-gray-500">{CATEGORIAS.find(c => c.value === detailedChamado.categoria)?.label}</p></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4"><p className="text-sm whitespace-pre-wrap">{detailedChamado.descricao}</p><p className="text-xs text-gray-400 mt-2">{new Date(detailedChamado.created_at).toLocaleString('pt-BR')}</p></div>
              {detailedChamado.mensagens?.map((m: ChamadoMensagem) => (<div key={m.id} className={`rounded-2xl p-4 max-w-[80%] ${m.autor_id === profile?.id ? 'bg-primary text-white ml-auto' : 'bg-gray-100 dark:bg-gray-800'}`}><p className="text-sm whitespace-pre-wrap">{m.mensagem}</p><p className={`text-xs mt-1 ${m.autor_id === profile?.id ? 'text-white/70' : 'text-gray-400'}`}>{m.autor?.nome} • {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p></div>))}
              {detailedChamado.status === 'resolvido' && !detailedChamado.avaliacao_nota && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 text-center">
                  <p className="font-medium text-green-800 dark:text-green-200 mb-3">Chamado resolvido! Como foi o atendimento?</p>
                  <div className="flex justify-center gap-2 mb-3">{[1,2,3,4,5].map(star => (<button key={star} onClick={() => setRating(star)} className="text-2xl">{star <= rating ? '⭐' : '☆'}</button>))}</div>
                  <button onClick={handleRate} disabled={rating === 0} className="px-6 py-2 bg-green-600 text-white rounded-xl font-medium disabled:opacity-50">Enviar Avaliação</button>
                </div>
              )}
            </div>
            {!['fechado', 'resolvido'].includes(detailedChamado.status) && (
              <div className="bg-white dark:bg-card-dark border-t border-gray-200 dark:border-gray-700 p-4 flex gap-3">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none" placeholder="Digite sua mensagem..." />
                <button onClick={handleSendMessage} disabled={!newMessage.trim()} className="px-4 py-3 bg-primary text-white rounded-xl disabled:opacity-50"><span className="material-symbols-outlined">send</span></button>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
