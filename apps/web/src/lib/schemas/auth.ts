import { z } from 'zod';

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
