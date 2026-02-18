import type { CondominioHealth, ExecutiveKPIs } from './analyticsService';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ExecutiveAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  createdAt: string;
}

const severityWeight: Record<AlertSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function buildExecutiveAlerts(
  kpis: ExecutiveKPIs,
  condominioHealth: CondominioHealth[],
  nowIso: string = new Date().toISOString()
): ExecutiveAlert[] {
  const alerts: ExecutiveAlert[] = [];

  if (kpis.satisfacaoIA30d > 0 && kpis.satisfacaoIA30d < 3.8) {
    alerts.push({
      id: 'ai-satisfaction-low',
      severity: 'high',
      title: 'Satisfacao da IA abaixo do alvo',
      message: `Satisfacao atual em ${kpis.satisfacaoIA30d.toFixed(1)}/5. Revise prompts, base documental e feedback recente.`,
      createdAt: nowIso,
    });
  }

  const custoMes = kpis.custoMesCentavos / 100;
  if (custoMes > 0 && kpis.gmvMes > 0) {
    const ratio = custoMes / kpis.gmvMes;
    if (ratio > 0.3) {
      alerts.push({
        id: 'cost-to-gmv-high',
        severity: ratio > 0.5 ? 'critical' : 'high',
        title: 'Custo operacional elevado vs GMV',
        message: `Relacao custo/GMV em ${(ratio * 100).toFixed(1)}%. Investigue tenants com baixo retorno e jobs pesados.`,
        createdAt: nowIso,
      });
    }
  }

  const lowEngagement = condominioHealth
    .filter((c) => c.total_usuarios >= 20)
    .filter((c) => {
      const rate = c.total_usuarios > 0 ? c.usuarios_ativos_7d / c.total_usuarios : 0;
      return rate < 0.25;
    })
    .sort((a, b) => a.usuarios_ativos_7d / Math.max(a.total_usuarios, 1) - b.usuarios_ativos_7d / Math.max(b.total_usuarios, 1))
    .slice(0, 3);

  if (lowEngagement.length > 0) {
    const names = lowEngagement.map((c) => c.nome).join(', ');
    alerts.push({
      id: 'low-engagement-condominios',
      severity: 'medium',
      title: 'Baixo engajamento em condominios',
      message: `Atividade 7d abaixo de 25% em: ${names}. Considere campanha de ativacao e comunicados segmentados.`,
      createdAt: nowIso,
    });
  }

  if (kpis.conversasIA30d === 0 && kpis.totalDocuments > 0) {
    alerts.push({
      id: 'zero-ai-conversations',
      severity: 'low',
      title: 'Base IA sem uso recente',
      message: 'Ha documentos indexados, mas sem conversas IA nos ultimos 30 dias.',
      createdAt: nowIso,
    });
  }

  return alerts.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);
}
