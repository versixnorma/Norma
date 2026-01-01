'use client';

import { AuthGuard, useAuthContext } from '@/contexts/AuthContext';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { usePrestacaoContas } from '@/hooks/usePrestacaoContas';
import { useTaxas } from '@/hooks/useTaxas';
import type { SaldoPeriodo, TaxaUnidade } from '@versix/shared/types/financial';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function FinanceiroMoradorPage() {
  const { profile } = useAuthContext();
  const { calcularSaldoPeriodo } = useFinanceiro();
  const { getMinhasTaxas } = useTaxas();
  const { fetchPrestacoes, prestacoes } = usePrestacaoContas();
  const [loading, setLoading] = useState(true);
  const [minhasTaxas, setMinhasTaxas] = useState<TaxaUnidade[]>([]);
  const [saldo, setSaldo] = useState<SaldoPeriodo | null>(null);
  const [tabAtiva, setTabAtiva] = useState<'taxas' | 'prestacao'>('taxas');

  const condominioId = profile?.condominio_atual?.id;

  useEffect(() => {
    if (!condominioId || !profile?.id) return;
    let active = true;
    const handle = requestAnimationFrame(() => {
      (async () => {
        setLoading(true);
        const [taxasData, saldoData] = await Promise.all([
          getMinhasTaxas(profile.id, condominioId),
          calcularSaldoPeriodo(condominioId, `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`),
          fetchPrestacoes(condominioId)
        ]);
        if (!active) return;
        setMinhasTaxas(taxasData);
        setSaldo(saldoData);
        setLoading(false);
      })();
    });
    return () => {
      active = false;
      cancelAnimationFrame(handle);
    };
  }, [condominioId, profile?.id, getMinhasTaxas, calcularSaldoPeriodo, fetchPrestacoes]);

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');
  const formatMonth = (date: string) => new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
    pago: { label: 'Pago', color: 'bg-green-100 text-green-700' },
    atrasado: { label: 'Atrasado', color: 'bg-red-100 text-red-700' }
  };

  const prestacaoPublicadas = prestacoes.filter(p => p.status === 'publicado');
  const taxasPendentes = minhasTaxas.filter(t => ['pendente', 'atrasado'].includes(t.status));
  const totalPendente = taxasPendentes.reduce((sum, t) => sum + t.valor_final, 0);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <header className="bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3 mb-4">
              <Link href="/home" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><span className="material-symbols-outlined">arrow_back</span></Link>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Transparência Financeira</h1>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setTabAtiva('taxas')} className={`flex-1 py-2 rounded-xl font-medium ${tabAtiva === 'taxas' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'}`}>Minhas Taxas</button>
              <button onClick={() => setTabAtiva('prestacao')} className={`flex-1 py-2 rounded-xl font-medium ${tabAtiva === 'prestacao' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'}`}>Prestação de Contas</button>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : tabAtiva === 'taxas' ? (
            <div className="space-y-6">
              {/* Resumo */}
              {totalPendente > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 border border-amber-200 dark:border-amber-700">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined text-amber-600">warning</span>
                    <span className="font-medium text-amber-800 dark:text-amber-200">Você tem taxas pendentes</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{formatCurrency(totalPendente)}</p>
                  <p className="text-sm text-amber-600">{taxasPendentes.length} taxa(s) em aberto</p>
                </div>
              )}

              {/* Lista de Taxas */}
              {minhasTaxas.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-card-dark rounded-2xl">
                  <span className="material-symbols-outlined text-5xl text-gray-400 mb-3">receipt_long</span>
                  <h3 className="text-lg font-semibold mb-1">Nenhuma taxa encontrada</h3>
                  <p className="text-gray-500">Suas taxas condominiais aparecerão aqui</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {minhasTaxas.map(taxa => (
                    <div key={taxa.id} className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white capitalize">{formatMonth(taxa.mes_referencia)}</p>
                          <p className="text-sm text-gray-500">Venc.: {formatDate(taxa.data_vencimento)}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_CONFIG[taxa.status]?.color || 'bg-gray-100'}`}>
                          {STATUS_CONFIG[taxa.status]?.label || taxa.status}
                        </span>
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-gray-400">{taxa.unidade?.bloco?.nome} - {taxa.unidade?.identificador}</p>
                          <p className="text-xs text-gray-400 capitalize">{taxa.tipo.replace('_', ' ')}</p>
                        </div>
                        <p className={`text-xl font-bold ${taxa.status === 'pago' ? 'text-green-600' : 'text-gray-800 dark:text-white'}`}>
                          {formatCurrency(taxa.valor_final)}
                        </p>
                      </div>
                      {taxa.status === 'pago' && taxa.data_pagamento && (
                        <p className="text-xs text-green-600 mt-2">Pago em {formatDate(taxa.data_pagamento)}</p>
                      )}
                      {taxa.boleto_url && taxa.status !== 'pago' && (
                        <a href={taxa.boleto_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-3 text-primary text-sm font-medium">
                          <span className="material-symbols-outlined text-lg">receipt</span>Ver Boleto
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Saldo Atual */}
              {saldo && (
                <div className="bg-white dark:bg-card-dark rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined">account_balance</span>
                    Saldo do Condomínio
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Saldo Anterior</p>
                      <p className="text-lg font-bold text-gray-800 dark:text-white">{formatCurrency(saldo.saldo_anterior)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Saldo Atual</p>
                      <p className={`text-lg font-bold ${saldo.saldo_atual >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(saldo.saldo_atual)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Receitas (Mês)</p>
                      <p className="text-lg font-bold text-blue-600">+{formatCurrency(saldo.total_receitas)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Despesas (Mês)</p>
                      <p className="text-lg font-bold text-red-600">-{formatCurrency(saldo.total_despesas)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Prestações Publicadas */}
              {prestacaoPublicadas.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-card-dark rounded-2xl">
                  <span className="material-symbols-outlined text-5xl text-gray-400 mb-3">description</span>
                  <h3 className="text-lg font-semibold mb-1">Nenhuma prestação disponível</h3>
                  <p className="text-gray-500">As prestações de contas publicadas aparecerão aqui</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {prestacaoPublicadas.map(p => (
                    <div key={p.id} className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold text-gray-800 dark:text-white capitalize">{formatMonth(p.mes_referencia)}</p>
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Publicado</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                          <p className="text-xs text-gray-500">Receitas</p>
                          <p className="font-bold text-blue-600 text-sm">{formatCurrency(p.total_receitas)}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                          <p className="text-xs text-gray-500">Despesas</p>
                          <p className="font-bold text-red-600 text-sm">{formatCurrency(p.total_despesas)}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                          <p className="text-xs text-gray-500">Saldo</p>
                          <p className={`font-bold text-sm ${p.saldo_atual >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(p.saldo_atual)}</p>
                        </div>
                      </div>
                      {p.publicado_em && <p className="text-xs text-gray-400 mt-2">Publicado em {formatDate(p.publicado_em)}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
