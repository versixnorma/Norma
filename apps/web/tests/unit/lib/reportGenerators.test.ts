import { describe, it, expect } from 'vitest';
import { generateCSVReport } from '@/lib/services/reportGenerators';

describe('reportGenerators CSV', () => {
  it('generateCSVReport includes title, date and table data', async () => {
    const data = {
      title: 'Relatório Teste',
      generatedAt: '2026-02-01T00:00:00Z',
      sections: [
        {
          title: 'KPIs',
          type: 'kpis' as const,
          kpis: [{ label: 'Usuários', value: 10 }],
        },
        {
          title: 'Tabela',
          type: 'table' as const,
          headers: ['Col1', 'Col2'],
          rows: [
            ['a', 'b'],
            ['c', 'd'],
          ],
        },
        {
          title: 'Resumo',
          type: 'summary' as const,
          text: 'Texto com, virgula e "aspas"',
        },
      ],
    };

    const buf = await generateCSVReport(data as any);
    const text = buf.toString('utf-8');
    expect(text).toContain('# Relatório Teste');
    expect(text).toContain('Col1,Col2');
    expect(text).toContain('"Texto com, virgula e ""aspas"""');
  });
});
