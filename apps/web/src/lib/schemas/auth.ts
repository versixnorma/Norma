import { z } from 'zod';

// Password validation schema — shared across signup, reset-password, and API routes
export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Senha deve conter pelo menos 1 letra maiúscula')
  .regex(/[0-9]/, 'Senha deve conter pelo menos 1 número')
  .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos 1 caractere especial');

export const PASSWORD_RULES = [
  { test: (v: string) => v.length >= 8, label: 'Mínimo 8 caracteres' },
  { test: (v: string) => /[A-Z]/.test(v), label: '1 letra maiúscula' },
  { test: (v: string) => /[0-9]/.test(v), label: '1 número' },
  { test: (v: string) => /[^A-Za-z0-9]/.test(v), label: '1 caractere especial' },
] as const;

// Role hierarchy: superadmin (system-level) > admin_condo (condominium-level) > others
// Note: admin_master was consolidated into superadmin on 2026-02-06
export const RoleSchema = z.enum([
  'superadmin',
  'admin_condo',
  'sindico',
  'subsindico',
  'conselheiro',
  'morador',
  'funcionario',
  'porteiro',
]);

export const StatusSchema = z.enum(['pending', 'active', 'inactive', 'suspended', 'removed']);

export const CondominioSimplifiedSchema = z.object({
  nome: z.string(),
});

export const UnidadeSimplifiedSchema = z.object({
  identificador: z.string(),
});

export const UsuarioCondominioSchema = z.object({
  condominio_id: z.string().uuid(),
  role: RoleSchema,
  unidade_id: z.string().uuid().nullable().optional(), // unidade_id not in table? check.
  status: z.string(),
  condominios: CondominioSimplifiedSchema.nullable().optional(),
  unidades: UnidadeSimplifiedSchema.nullable().optional(),
});

export const UsuarioSchema = z.object({
  id: z.string().uuid(),
  auth_id: z.string().uuid(),
  condominio_id: z.string().uuid().nullable().optional(),
  nome: z.string(),
  email: z.string().email(),
  telefone: z.string().nullable(),
  avatar_url: z.string().nullable(),
  documento: z.string().nullable().optional(),
  status: StatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
  // Joins
  usuario_condominios: z.array(UsuarioCondominioSchema).optional(),
});

export type Usuario = z.infer<typeof UsuarioSchema>;
export type UsuarioCondominio = z.infer<typeof UsuarioCondominioSchema>;
