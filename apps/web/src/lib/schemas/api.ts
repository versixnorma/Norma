import { z } from 'zod';
import { passwordSchema } from './auth';

// ============================================
// AUTH
// ============================================

export const signupSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: passwordSchema,
  telefone: z.string().optional(),
  condominio_id: z.string().uuid('ID do condomínio inválido'),
  unidade_id: z.string().uuid('ID da unidade inválido'),
  cpf: z.string().transform(v => v.replace(/\D/g, '')).pipe(
    z.string().length(11, 'CPF deve ter 11 dígitos')
  ),
  data_nascimento: z.string().min(1, 'Data de nascimento é obrigatória'),
  notificacoes_email: z.boolean().optional(),
  notificacoes_push: z.boolean().optional(),
  notificacoes_whatsapp: z.boolean().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

// ============================================
// CONDOMINIOS
// ============================================

export const condominioCreateSchema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório'),
  cnpj: z.string().nullish(),
  endereco: z.string().nullish(),
  total_unidades: z.number().int().min(0).optional(),
  blocos_ruas: z.union([z.array(z.string()), z.string()]).optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  tipo: z.string().optional(),
  status: z.string().optional(),
}).passthrough();

export const condominioUpdateSchema = z.object({
  id: z.string().uuid('ID do condomínio inválido'),
  blocos_ruas: z.union([z.array(z.string()), z.string()]).optional(),
}).passthrough();

// ============================================
// USUARIOS (admin)
// ============================================

const roleEnum = z.enum([
  'superadmin', 'admin_condo', 'sindico', 'subsindico',
  'conselheiro', 'morador', 'proprietario', 'inquilino',
  'porteiro', 'zelador', 'funcionario',
]);

const statusEnum = z.enum(['pending', 'active', 'inactive', 'suspended', 'removed']);

export const adminUsuarioCreateSchema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  telefone: z.string().optional(),
  role: roleEnum.optional(),
  status: statusEnum.optional(),
  condominio_id: z.string().uuid().optional(),
  unidade_id: z.string().uuid().optional().nullable(),
  cpf: z.string().optional(),
  data_nascimento: z.string().optional(),
  notificacoes_email: z.boolean().optional(),
  notificacoes_push: z.boolean().optional(),
  notificacoes_whatsapp: z.boolean().optional(),
  senha: z.string().min(8).optional(),
});

export const adminUsuarioUpdateSchema = z.object({
  id: z.string().uuid('ID do usuário inválido'),
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  telefone: z.string().optional().nullable(),
  role: roleEnum.optional(),
  status: statusEnum.optional(),
  condominio_id: z.string().uuid().optional(),
  unidade_id: z.string().uuid().optional().nullable(),
  cpf: z.string().optional().nullable(),
  data_nascimento: z.string().optional().nullable(),
  notificacoes_email: z.boolean().optional(),
  notificacoes_push: z.boolean().optional(),
  notificacoes_whatsapp: z.boolean().optional(),
});

// ============================================
// REPORTS
// ============================================

export const reportConfigSchema = z.object({
  reportType: z.enum(['executive', 'operational', 'financial', 'custom'], {
    required_error: 'Tipo de relatório é obrigatório',
  }),
  format: z.enum(['pdf', 'excel', 'csv'], {
    required_error: 'Formato é obrigatório',
  }),
  title: z.string().optional(),
  filters: z.object({
    timeRange: z.enum(['7d', '30d', '90d', 'custom']).optional(),
    condominioId: z.string().uuid().optional(),
  }).optional(),
});

// ============================================
// NORMA AI DOCUMENTS
// ============================================

export const documentUploadSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  category: z.string().optional(),
  source_type: z.enum(['upload', 'manual', 'conversation']).optional(),
  condominio_id: z.string().uuid().optional(),
}).passthrough();
