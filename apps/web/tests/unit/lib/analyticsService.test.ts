import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getDateRange,
  getExecutiveKPIs,
  getUnifiedMetrics,
  getFunnelData,
  getCohortData,
  getRetentionData,
} from '@/lib/services/analyticsService';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  // not used directly; tests will pass mock supabase clients
}));

function makeSupabaseStub(handlers: Record<string, any>) {
  return {
    from: (table: string) => {
      const h = handlers[table];
      if (!h) {
        return {
          select: vi.fn(() => Promise.resolve({ data: [], error: null })),
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        };
      }
      return h();
    },
  } as any;
}

describe('analyticsService helpers and queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getDateRange handles predefined ranges and custom', () => {
    const r7 = getDateRange({ timeRange: '7d' as any });
    const r30 = getDateRange({ timeRange: '30d' as any });
    const r90 = getDateRange({ timeRange: '90d' as any });
    const custom = getDateRange({
      timeRange: 'custom' as any,
      startDate: '2020-01-01T00:00:00.000Z',
      endDate: '2020-01-31T00:00:00.000Z',
    });

    expect(new Date(r7.end).getTime()).toBeGreaterThan(0);
    expect(new Date(r30.end).getTime()).toBeGreaterThan(0);
    expect(new Date(r90.end).getTime()).toBeGreaterThan(0);
    expect(custom.start).toBe('2020-01-01T00:00:00.000Z');
    expect(custom.end).toBe('2020-01-31T00:00:00.000Z');
  });

  it('getExecutiveKPIs maps row correctly', async () => {
    const supabase = {
      from: (table: string) => {
        if (table === 'mv_executive_kpis') {
          return {
            select: () => ({
              limit: () => ({
                single: async () => ({
                  data: {
                    total_users: 10,
                    active_users: 8,
                    active_users_30d: 5,
                    total_condominios: 2,
                    custo_mes_centavos: 1000,
                    gmv_mes: '200.5',
                    conversas_ia_30d: 12,
                    satisfacao_ia_30d: '4.5',
                    total_documents: 20,
                    total_chunks: 100,
                    refreshed_at: '2026-01-01T00:00:00Z',
                  },
                }),
              }),
            }),
          };
        }
        return { select: () => ({ limit: () => ({ single: async () => ({ data: null }) }) }) };
      },
    } as any;

    const kpis = await getExecutiveKPIs(supabase as any);
    expect(kpis.totalUsers).toBe(10);
    expect(kpis.gmvMes).toBe(200.5);
    expect(kpis.satisfacaoIA30d).toBe(4.5);
  });

  it('getUnifiedMetrics returns dailyActivity and condominioHealth', async () => {
    const supabase = makeSupabaseStub({
      mv_daily_activity_summary: () => ({
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn(async () => ({ data: [{ date: '2026-02-01', usuarios_ativos: 5 }] })),
            })),
          })),
        })),
      }),
      mv_condominio_health: () => ({
        select: vi.fn(() => ({ order: vi.fn(async () => ({ data: [{ nome: 'Condo X' }] })) })),
      }),
    });

    const metrics = await getUnifiedMetrics(supabase as any, { timeRange: '7d' as any });
    expect(metrics.dailyActivity.length).toBeGreaterThan(0);
    expect(metrics.condominioHealth.length).toBeGreaterThan(0);
  });

  it('getFunnelData computes steps from audit logs', async () => {
    // mock counts and audit_logs
    const usersCount = 5;
    const auditRows = [
      { usuario_id: 'u1' },
      { usuario_id: 'u1' },
      { usuario_id: 'u2' },
      { usuario_id: 'u3' },
      { usuario_id: 'u4' },
    ];

    const supabase = {
      from: (table: string) => {
        if (table === 'usuarios') {
          return { select: vi.fn(() => Promise.resolve({ data: null, count: usersCount })) };
        }
        if (table === 'audit_logs') {
          return {
            select: vi.fn(() => Promise.resolve({ data: auditRows })),
            gte: vi.fn(() => ({ select: vi.fn(() => Promise.resolve({ data: auditRows })) })),
          };
        }
        return { select: vi.fn(() => Promise.resolve({ data: [] })) };
      },
    } as any;

    const funnel = await getFunnelData(supabase, { timeRange: '7d' as any });
    expect(Array.isArray(funnel)).toBe(true);
    expect(funnel.find((s) => s.step === 'registered')).toBeDefined();
  });

  it('getCohortData groups users by month and builds periods', async () => {
    const users = [
      { id: 'u1', created_at: '2026-01-05T00:00:00Z' },
      { id: 'u2', created_at: '2026-01-10T00:00:00Z' },
      { id: 'u3', created_at: '2026-02-02T00:00:00Z' },
    ];
    const logs = [
      { usuario_id: 'u1', created_at: '2026-01-15T00:00:00Z' },
      { usuario_id: 'u2', created_at: '2026-02-05T00:00:00Z' },
      { usuario_id: 'u3', created_at: '2026-02-10T00:00:00Z' },
    ];

    const supabase = makeSupabaseStub({
      usuarios: () => ({ select: vi.fn(() => Promise.resolve({ data: users })) }),
      audit_logs: () => ({ select: vi.fn(() => Promise.resolve({ data: logs })) }),
    });

    const cohorts = await getCohortData(supabase as any, { timeRange: '90d' as any });
    expect(cohorts.length).toBeGreaterThan(0);
    expect(cohorts[0].periods).toBeDefined();
  });

  it('getRetentionData returns an array of retention points', async () => {
    const logs = [
      { usuario_id: 'u1', created_at: new Date().toISOString() },
      { usuario_id: 'u2', created_at: new Date().toISOString() },
    ];
    const supabase = makeSupabaseStub({
      audit_logs: () => ({ select: vi.fn(() => Promise.resolve({ data: logs })) }),
    });

    const points = await getRetentionData(supabase as any, { timeRange: '7d' as any });
    expect(Array.isArray(points)).toBe(true);
  });
});
