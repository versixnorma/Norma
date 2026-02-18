import { describe, expect, it } from 'vitest';

import { condominioIdParamSchema } from '@/lib/schemas/condominios';
import { discountSchema, partnerSchema } from '@/lib/schemas/marketplace';
import { normaFeedbackSchema } from '@/lib/schemas/norma-ai';
import { reportConfigurationSchema } from '@/lib/schemas/reports';

describe('schemas API', () => {
  it('valida partner com campos minimos', () => {
    const parsed = partnerSchema.safeParse({
      name: 'Parceiro XPTO',
      category: 'servicos',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejeita discount sem partner_id uuid', () => {
    const parsed = discountSchema.safeParse({
      partner_id: 'not-uuid',
      title: 'Cupom',
      discount_type: 'percentage',
      discount_value: 10,
    });
    expect(parsed.success).toBe(false);
  });

  it('valida report configuration', () => {
    const parsed = reportConfigurationSchema.safeParse({
      name: 'Relatorio Mensal',
      reportType: 'executive',
      filters: { periodo: '30d' },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejeita feedback fora do range', () => {
    const parsed = normaFeedbackSchema.safeParse({
      userId: '9f5b5802-868b-4cb6-9af7-5f0f6de9a2b0',
      rating: 10,
    });
    expect(parsed.success).toBe(false);
  });

  it('valida parametro de condominio id', () => {
    const parsed = condominioIdParamSchema.safeParse({
      id: '9f5b5802-868b-4cb6-9af7-5f0f6de9a2b0',
    });
    expect(parsed.success).toBe(true);
  });
});
