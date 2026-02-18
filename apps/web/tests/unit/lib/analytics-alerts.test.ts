import { describe, expect, it } from 'vitest';

import { buildExecutiveAlerts } from '@/lib/services/analyticsAlerts';
import type { CondominioHealth, ExecutiveKPIs } from '@/lib/services/analyticsService';

function makeKpis(overrides?: Partial<ExecutiveKPIs>): ExecutiveKPIs {
  return {
    totalUsers: 100,
    activeUsers: 80,
    activeUsers30d: 85,
    totalCondominios: 10,
    custoMesCentavos: 400000,
    gmvMes: 40000,
    conversasIA30d: 120,
    satisfacaoIA30d: 4.5,
    totalDocuments: 30,
    totalChunks: 400,
    refreshedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeHealth(overrides?: Partial<CondominioHealth>): CondominioHealth {
  return {
    condominio_id: 'c-1',
    nome: 'Condominio Teste',
    tier: 'pro',
    total_unidades: 120,
    total_usuarios: 80,
    usuarios_ativos: 20,
    usuarios_ativos_7d: 30,
    comunicados_7d: 5,
    ocorrencias_7d: 1,
    conversas_ia_7d: 3,
    custo_7d_centavos: 20000,
    ...overrides,
  };
}

describe('buildExecutiveAlerts', () => {
  it('retorna vazio sem condicoes de alerta', () => {
    const alerts = buildExecutiveAlerts(makeKpis(), [makeHealth()]);
    expect(alerts).toHaveLength(0);
  });

  it('gera alerta de satisfacao baixa', () => {
    const alerts = buildExecutiveAlerts(makeKpis({ satisfacaoIA30d: 3.1 }), [makeHealth()]);
    expect(alerts.some((a) => a.id === 'ai-satisfaction-low')).toBe(true);
  });

  it('gera alerta critico de custo elevado', () => {
    const alerts = buildExecutiveAlerts(
      makeKpis({ custoMesCentavos: 1000000, gmvMes: 10000 }),
      [makeHealth()]
    );
    const costAlert = alerts.find((a) => a.id === 'cost-to-gmv-high');
    expect(costAlert?.severity).toBe('critical');
  });

  it('gera alerta de baixo engajamento para condominio grande', () => {
    const alerts = buildExecutiveAlerts(makeKpis(), [
      makeHealth({ nome: 'Alpha', total_usuarios: 40, usuarios_ativos_7d: 6 }),
      makeHealth({ condominio_id: 'c-2', nome: 'Beta', total_usuarios: 50, usuarios_ativos_7d: 8 }),
    ]);
    expect(alerts.some((a) => a.id === 'low-engagement-condominios')).toBe(true);
  });

  it('gera alerta low para zero conversas com base carregada', () => {
    const alerts = buildExecutiveAlerts(
      makeKpis({ conversasIA30d: 0, totalDocuments: 10 }),
      [makeHealth()]
    );
    expect(alerts.some((a) => a.id === 'zero-ai-conversations')).toBe(true);
  });
});
