import { z } from 'zod';

export const condominioFormSchema = z.object({
  cnpj: z
    .string()
    .min(14, 'CNPJ inválido')
    .transform((v) => v.replace(/\D/g, '')),
  nome: z.string().min(2, 'Nome obrigatório'),
  razao_social: z.string().optional(),
  email_administrativo: z.string().email('Email inválido'),
  telefone: z.string().optional(),

  cep: z
    .string()
    .min(8)
    .transform((v) => v.replace(/\D/g, '')),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),

  dia_vencimento: z.number().int().min(1).max(28),

  // Named blocks with unit counts (preferred over quantidade_blocos + unidades_por_bloco)
  blocos: z
    .array(
      z.object({
        nome: z.string().min(1, 'Nome do bloco obrigatório'),
        unidades: z.number().int().min(1, 'Mínimo 1 unidade'),
      })
    )
    .optional(),

  // Legacy fields kept optional for backward compatibility
  quantidade_blocos: z.number().int().min(1).optional(),
  unidades_por_bloco: z.number().int().min(1).optional(),

  areas_comuns_string: z.string().optional(),
  logo_url: z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional()),
  primary_color: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .string()
      .regex(/^#([0-9A-Fa-f]{6})$/, 'Cor inválida (formato hex)')
      .optional()
  ),

  modules: z.object({
    financeiro: z.boolean().default(true),
    assembleias: z.boolean().default(true),
    comunicacao: z.boolean().default(true),
    norma_ai: z.boolean().default(true),
  }),
});

export type CondominioFormInput = z.infer<typeof condominioFormSchema> & {
  areas_comuns_string?: string;
};
