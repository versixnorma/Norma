import { z } from 'zod';

export const RoleSchema = z.enum([
  'superadmin',
  'admin_master',
  'sindico',
  'subsindico',
  'conselheiro',
  'morador',
  'funcionario',
  'porteiro',
  'admin_condo',
]);

export const StatusSchema = z.enum(['pending', 'ativo', 'inativo', 'bloqueado']);

export const CondominioSimplifiedSchema = z.object({
  nome: z.string(),
});

export const UnidadeSimplifiedSchema = z.object({
  identificador: z.string(),
});

export const UsuarioCondominioSchema = z.object({
  condominio_id: z.string().uuid(),
  role: RoleSchema,
  unidade_id: z.string().uuid().nullable(),
  status: z.string(),
  condominios: CondominioSimplifiedSchema.nullable().optional(),
  unidades: UnidadeSimplifiedSchema.nullable().optional(),
});

export const UsuarioSchema = z.object({
  id: z.string().uuid(),
  auth_id: z.string().uuid(),
  condominio_id: z.string().uuid().nullable(),
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
