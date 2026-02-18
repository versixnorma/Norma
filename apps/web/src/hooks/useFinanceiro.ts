'use client';

import type {
  CategoriaFinanceira,
  Comprovante,
  ContaBancaria,
  CreateLancamentoInput,
  DashboardFinanceiro,
  LancamentoFilters,
  LancamentoFinanceiro,
  LancamentoStatus,
  LancamentoTipo,
  UpdateLancamentoInput,
} from '@versix/shared';
import { useDashboardFinanceiro } from './useDashboardFinanceiro';
import { useLancamentos } from './useLancamentos';

/**
 * Hook composto para gerenciamento financeiro completo.
 * Combina useLancamentos (CRUD) + useDashboardFinanceiro (categorias, contas, saldo, dashboard).
 */
export function useFinanceiro() {
  const lancamentosHook = useLancamentos();
  const dashboardHook = useDashboardFinanceiro();

  return {
    // Estado de lançamentos
    lancamentos: lancamentosHook.lancamentos,
    pagination: lancamentosHook.pagination,
    // Estado unificado (loading/error de qualquer sub-hook)
    loading: lancamentosHook.loading || dashboardHook.loading,
    error: lancamentosHook.error || dashboardHook.error,
    // Métodos de lançamentos
    fetchLancamentos: lancamentosHook.fetchLancamentos,
    createLancamento: lancamentosHook.createLancamento,
    updateLancamento: lancamentosHook.updateLancamento,
    deleteLancamento: lancamentosHook.deleteLancamento,
    confirmarLancamento: lancamentosHook.confirmarLancamento,
    // Métodos de dashboard/categorias/contas
    fetchCategorias: dashboardHook.fetchCategorias,
    fetchContas: dashboardHook.fetchContas,
    calcularSaldoPeriodo: dashboardHook.calcularSaldoPeriodo,
    getDashboard: dashboardHook.getDashboard,
  };
}

export type {
  CategoriaFinanceira,
  Comprovante,
  ContaBancaria,
  CreateLancamentoInput,
  DashboardFinanceiro,
  LancamentoFilters,
  LancamentoFinanceiro,
  LancamentoStatus,
  LancamentoTipo,
};
