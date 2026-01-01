'use client';

import { DashboardFinanceiroCards } from '@/components/financeiro/DashboardFinanceiroCards';
import { AuthGuard, useAuthContext } from '@/contexts/AuthContext';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import type { CategoriaFinanceira, ContaBancaria, DashboardFinanceiro } from '@versix/shared/types/financial';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function FinanceiroDashboardPage() {
  const { profile } = useAuthContext();
  const { loading, getDashboard, createLancamento, fetchCategorias, fetchContas } = useFinanceiro();
  const [dashboard, setDashboard] = useState<DashboardFinanceiro | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [form, setForm] = useState({ tipo: 'despesa', categoria_id: '', conta_bancaria_id: '', valor: '', data_competencia: new Date().toISOString().slice(0, 10), descricao: '', fornecedor_nome: '', status: 'pendente' });

  const condominioId = profile?.condominio_atual?.id;

  const loadDashboard = useCallback(async () => {
    if (!condominioId) return;
    const data = await getDashboard(condominioId);
    setDashboard(data);
  }, [condominioId, getDashboard]);

  const loadCategorias = useCallback(async () => {
    if (!condominioId) return;
    const cats = await fetchCategorias(condominioId);
    setCategorias(cats);
  }, [condominioId, fetchCategorias]);

  const loadContas = useCallback(async () => {
    if (!condominioId) return;
    const data = await fetchContas(condominioId);
    setContas(data);
  }, [condominioId, fetchContas]);

  useEffect(() => {
    if (!condominioId) return;
    const handle = requestAnimationFrame(() => {
      loadDashboard();
      loadCategorias();
      loadContas();
    });
    return () => cancelAnimationFrame(handle);
  }, [condominioId, loadDashboard, loadCategorias, loadContas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condominioId || !profile?.id) return;
    if (!form.categoria_id || !form.valor || !form.descricao) { toast.error('Preencha os campos obrigatórios'); return; }

    const result = await createLancamento(condominioId, profile.id, {
      ...form,
      tipo: form.tipo as 'receita' | 'despesa',
      valor: parseFloat(form.valor),
      status: form.status as 'pendente' | 'confirmado',
      conta_bancaria_id: form.conta_bancaria_id || undefined
    });

    if (result) {
      toast.success('Lançamento criado!');
      setShowForm(false);
      setForm({ tipo: 'despesa', categoria_id: '', conta_bancaria_id: '', valor: '', data_competencia: new Date().toISOString().slice(0, 10), descricao: '', fornecedor_nome: '', status: 'pendente' });
      loadDashboard();
    }
  };

  const categoriasFiltered = categorias.flatMap(c => [c, ...(c.children || [])]).filter(c => c.tipo === form.tipo);

  return (
    <AuthGuard requiredRoles={['sindico', 'subsindico']}>
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <header className="bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/home" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><span className="material-symbols-outlined">arrow_back</span></Link>
                <div>
                  <h1 className="text-xl font-bold text-gray-800 dark:text-white">Financeiro</h1>
                  <p className="text-sm text-gray-500">{profile?.condominio_atual?.nome}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/sindico/financeiro/prestacao" className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl"><span className="material-symbols-outlined text-lg">description</span>Prestação</Link>
                <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium"><span className="material-symbols-outlined">add</span>Lançamento</button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">
          {loading && !dashboard ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : dashboard ? (
            <DashboardFinanceiroCards dashboard={dashboard} />
          ) : (
            <div className="text-center py-12 bg-white dark:bg-card-dark rounded-2xl">
              <span className="material-symbols-outlined text-5xl text-gray-400 mb-3">account_balance_wallet</span>
              <h3 className="text-lg font-semibold mb-2">Configure o Financeiro</h3>
              <p className="text-gray-500 mb-4">Adicione contas bancárias e categorias para começar</p>
            </div>
          )}
        </main>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-card-dark w-full max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Novo Lançamento</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><span className="material-symbols-outlined">close</span></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm({ ...form, tipo: 'receita', categoria_id: '' })} className={`flex-1 py-3 rounded-xl font-medium ${form.tipo === 'receita' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    <span className="material-symbols-outlined align-middle mr-1">arrow_upward</span>Receita
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, tipo: 'despesa', categoria_id: '' })} className={`flex-1 py-3 rounded-xl font-medium ${form.tipo === 'despesa' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                    <span className="material-symbols-outlined align-middle mr-1">arrow_downward</span>Despesa
                  </button>
                </div>
                <div>
                  <label className="text-sm font-medium">Categoria *</label>
                  <select value={form.categoria_id} onChange={e => setForm({ ...form, categoria_id: e.target.value })} className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none" required>
                    <option value="">Selecione...</option>
                    {categoriasFiltered.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.nome}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Valor *</label>
                    <input type="number" step="0.01" min="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none" placeholder="0,00" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Data *</label>
                    <input type="date" value={form.data_competencia} onChange={e => setForm({ ...form, data_competencia: e.target.value })} className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none" required />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição *</label>
                  <input type="text" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none" placeholder="Descrição do lançamento" required minLength={5} />
                </div>
                {form.tipo === 'despesa' && (
                  <div>
                    <label className="text-sm font-medium">Fornecedor</label>
                    <input type="text" value={form.fornecedor_nome} onChange={e => setForm({ ...form, fornecedor_nome: e.target.value })} className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none" placeholder="Nome do fornecedor" />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Conta Bancária</label>
                  <select value={form.conta_bancaria_id} onChange={e => setForm({ ...form, conta_bancaria_id: e.target.value })} className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none">
                    <option value="">Selecione...</option>
                    {contas.map(c => <option key={c.id} value={c.id}>{c.nome_exibicao}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="status" checked={form.status === 'pendente'} onChange={() => setForm({ ...form, status: 'pendente' })} />
                    <span className="text-sm">Pendente</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="status" checked={form.status === 'confirmado'} onChange={() => setForm({ ...form, status: 'confirmado' })} />
                    <span className="text-sm">Confirmado</span>
                  </label>
                </div>
                <button type="submit" disabled={loading} className="w-full py-4 bg-primary text-white rounded-xl font-bold disabled:opacity-50">{loading ? 'Salvando...' : 'Salvar Lançamento'}</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
