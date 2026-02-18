import { withAdminAuth } from '@/lib/api-helpers';
import { reportConfigSchema } from '@/lib/schemas/api';
import { createAdminClient } from '@/lib/supabase';
import {
  getExecutiveKPIs,
  getUnifiedMetrics,
  type AnalyticsFilters,
} from '@/lib/services/analyticsService';
import {
  generatePDFReport,
  generateExcelReport,
  generateCSVReport,
  type ReportData,
} from '@/lib/services/reportGenerators';
import { NextResponse } from 'next/server';

export const POST = withAdminAuth(async ({ admin }, request) => {
  try {
    const body = await request.json();
    const parsed = reportConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { reportType, format, title, filters: rawFilters } = parsed.data;

    const filters: AnalyticsFilters = {
      timeRange: rawFilters?.timeRange || '30d',
      ...rawFilters,
    };
    const reportTitle = title || `Relatório ${reportType}`;
    const generatedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    // Build report data based on type
    const reportData = await buildReportData(
      admin,
      reportType,
      reportTitle,
      generatedAt,
      filters
    );

    // Generate file
    let buffer: Buffer;
    let contentType: string;
    let extension: string;

    switch (format) {
      case 'pdf':
        buffer = await generatePDFReport(reportData);
        contentType = 'application/pdf';
        extension = 'pdf';
        break;
      case 'excel':
        buffer = await generateExcelReport(reportData);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        extension = 'xlsx';
        break;
      case 'csv':
        buffer = await generateCSVReport(reportData);
        contentType = 'text/csv; charset=utf-8';
        extension = 'csv';
        break;
      default:
        return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
    }

    const fileName = `${reportTitle.replace(/\s+/g, '_')}_${Date.now()}.${extension}`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao gerar relatório';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

async function buildReportData(
  admin: ReturnType<typeof createAdminClient>,
  reportType: string,
  title: string,
  generatedAt: string,
  filters: AnalyticsFilters
): Promise<ReportData> {
  const sections: ReportData['sections'] = [];

  if (reportType === 'executive' || reportType === 'custom') {
    const kpis = await getExecutiveKPIs(admin);
    sections.push({
      title: 'KPIs Executivos',
      type: 'kpis',
      kpis: [
        { label: 'Usuários Ativos', value: kpis.activeUsers },
        { label: 'Condominios', value: kpis.totalCondominios },
        { label: 'Custo Mensal', value: `R$ ${(kpis.custoMesCentavos / 100).toFixed(2)}` },
        { label: 'GMV Marketplace', value: `R$ ${kpis.gmvMes.toFixed(2)}` },
        { label: 'Conversas IA (30d)', value: kpis.conversasIA30d },
        { label: 'Satisfação IA', value: `${kpis.satisfacaoIA30d.toFixed(1)}/5` },
      ],
    });
  }

  if (reportType === 'operational' || reportType === 'executive' || reportType === 'custom') {
    const metrics = await getUnifiedMetrics(admin, filters);
    if (metrics.condominioHealth.length > 0) {
      sections.push({
        title: 'Saúde dos Condominios',
        type: 'table',
        headers: [
          'Condomínio',
          'Tier',
          'Usuários',
          'Ativos 7d',
          'Comunicados 7d',
          'Ocorrências 7d',
          'Custo 7d',
        ],
        rows: metrics.condominioHealth.map((c) => [
          c.nome,
          c.tier,
          c.total_usuarios,
          c.usuarios_ativos_7d,
          c.comunicados_7d,
          c.ocorrencias_7d,
          `R$ ${(c.custo_7d_centavos / 100).toFixed(2)}`,
        ]),
      });
    }

    if (metrics.dailyActivity.length > 0) {
      // Aggregate daily activity across condominios
      const byDate: Record<
        string,
        { users: number; sessions: number; comunicados: number; ocorrencias: number }
      > = {};
      metrics.dailyActivity.forEach((d) => {
        if (!byDate[d.date])
          byDate[d.date] = { users: 0, sessions: 0, comunicados: 0, ocorrencias: 0 };
        byDate[d.date].users += d.usuarios_ativos;
        byDate[d.date].sessions += d.sessoes_totais;
        byDate[d.date].comunicados += d.comunicados_criados;
        byDate[d.date].ocorrencias += d.ocorrencias_criadas;
      });
      sections.push({
        title: 'Atividade Diária',
        type: 'table',
        headers: ['Data', 'Usuários Ativos', 'Sessões', 'Comunicados', 'Ocorrências'],
        rows: Object.entries(byDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, v]) => [date, v.users, v.sessions, v.comunicados, v.ocorrencias]),
      });
    }
  }

  if (reportType === 'financial' || reportType === 'custom') {
    const kpis = await getExecutiveKPIs(admin);
    sections.push({
      title: 'Resumo Financeiro',
      type: 'kpis',
      kpis: [
        { label: 'Custo IA (mês)', value: `R$ ${(kpis.custoMesCentavos / 100).toFixed(2)}` },
        { label: 'GMV Marketplace', value: `R$ ${kpis.gmvMes.toFixed(2)}` },
        { label: 'Documentos IA', value: kpis.totalDocuments },
        { label: 'Chunks Indexados', value: kpis.totalChunks },
      ],
    });
  }

  return { title, generatedAt, sections };
}
