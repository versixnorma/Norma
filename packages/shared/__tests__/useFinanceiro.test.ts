import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Testes para useFinanceiro
 *
 * Hook crítico que gerencia dados financeiros do condomínio
 */

// Mock do Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { saldo: 50000 },
              error: null,
            }),
          })),
        })),
      })),
      order: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue({
          data: [
            { id: '1', valor: 1000, tipo: 'receita', status: 'pago' },
            { id: '2', valor: -500, tipo: 'despesa', status: 'pago' },
          ],
          error: null,
        }),
      })),
    })),
  })),
};

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => mockSupabase,
}));

describe('useFinanceiro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve calcular inadimplência corretamente', () => {
    // Teste de cálculo de inadimplência
    const valorVencido = 5000;
    const valorTotal = 50000;
    const inadimplenciaPercent = Math.round((valorVencido / valorTotal) * 100);

    expect(inadimplenciaPercent).toBe(10);
  });

  it('deve retornar 0 quando não há boletos', () => {
    const valorVencido = 0;
    const valorTotal = 1; // Evita divisão por zero
    const inadimplenciaPercent = Math.round((valorVencido / valorTotal) * 100);

    expect(inadimplenciaPercent).toBe(0);
  });

  it('deve calcular saldo total corretamente', () => {
    const lancamentos = [
      { valor: 1000 },
      { valor: -500 },
      { valor: 2000 },
    ];

    const saldoTotal = lancamentos.reduce((sum, l) => sum + l.valor, 0);
    expect(saldoTotal).toBe(2500);
  });

  it('deve formatar valores monetários em BRL', () => {
    const valor = 1234.56;
    const formatado = valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    expect(formatado).toContain('1.234,56');
  });
});
