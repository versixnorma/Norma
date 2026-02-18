import { z } from 'zod';

export const partnerSchema = z
  .object({
    name: z.string().min(2, 'Nome obrigatorio'),
    cnpj: z.string().optional(),
    contact_email: z.string().email().optional(),
    contact_phone: z.string().optional(),
    category: z.string().min(1, 'Categoria obrigatoria'),
    commission_rate: z.number().min(0).max(100).default(0),
    status: z.enum(['active', 'inactive']).default('active'),
  })
  .passthrough();

export const discountSchema = z
  .object({
    partner_id: z.string().uuid(),
    title: z.string().min(2),
    description: z.string().optional(),
    discount_type: z.enum(['percentage', 'fixed']),
    discount_value: z.number().positive(),
    original_price: z.number().min(0).optional(),
    valid_from: z.string().datetime().optional(),
    valid_until: z.string().datetime().optional(),
    usage_limit: z.number().int().positive().optional(),
    status: z.enum(['active', 'inactive', 'expired']).default('active'),
  })
  .passthrough();

export type PartnerInput = z.infer<typeof partnerSchema>;
export type DiscountInput = z.infer<typeof discountSchema>;
