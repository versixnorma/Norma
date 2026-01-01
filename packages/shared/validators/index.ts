/**
 * VERSIX NORMA - Validators (Zod Schemas)
 *
 * Schemas de validação compartilhados entre frontend e backend
 */

import { z } from 'zod';
import { COMUNICADO_CATEGORIES, LIMITS, PRIORITIES, ROLES, STATUS, TIERS } from '../constants';

// ===== PRIMITIVES =====

export const cpfSchema = z
  .string()
  .regex(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido')
  .transform((val) => val.replace(/\D/g, ''));

export const cnpjSchema = z
  .string()
  .regex(/^\d{14}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido')
  .transform((val) => val.replace(/\D/g, ''));

export const phoneSchema = z
  .string()
  .regex(/^\d{10,11}$|^\(\d{2}\)\s?\d{4,5}-?\d{4}$/, 'Telefone inválido')
  .transform((val) => val.replace(/\D/g, ''));

export const cepSchema = z
  .string()
  .regex(/^\d{8}$|^\d{5}-?\d{3}$/, 'CEP inválido')
  .transform((val) => val.replace(/\D/g, ''));

export const emailSchema = z.string().email('Email inválido').toLowerCase().trim();

export const passwordSchema = z
  .string()
  .min(
    LIMITS.MIN_PASSWORD_LENGTH,
    `Senha deve ter no mínimo ${LIMITS.MIN_PASSWORD_LENGTH} caracteres`
  )
  .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'Senha deve conter pelo menos um número');

// ===== ENUMS =====

export const tierSchema = z.enum([TIERS.STARTER, TIERS.PROFESSIONAL, TIERS.ENTERPRISE]);

export const roleSchema = z.enum([
  ROLES.SUPERADMIN,
  ROLES.ADMIN_CONDO,
  ROLES.SINDICO,
  ROLES.CONSELHEIRO,
  ROLES.MORADOR,
  ROLES.PORTEIRO,
  ROLES.ZELADOR,
]);

export const statusSchema = z.enum([
  STATUS.ACTIVE,
  STATUS.INACTIVE,
  STATUS.PENDING,
  STATUS.SUSPENDED,
  STATUS.DELETED,
]);

export const comunicadoCategorySchema = z.enum([
  COMUNICADO_CATEGORIES.GERAL,
  COMUNICADO_CATEGORIES.MANUTENCAO,
  COMUNICADO_CATEGORIES.FINANCEIRO,
  COMUNICADO_CATEGORIES.SEGURANCA,
  COMUNICADO_CATEGORIES.EVENTO,
  COMUNICADO_CATEGORIES.URGENTE,
]);

export const prioritySchema = z.enum([
  PRIORITIES.LOW,
  PRIORITIES.MEDIUM,
  PRIORITIES.HIGH,
  PRIORITIES.URGENT,
]);

// ===== ENTITIES =====

export const condominioSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(200),
  cnpj: cnpjSchema.optional(),
  endereco: z.string().min(5).max(500),
  cidade: z.string().min(2).max(100),
  estado: z.string().length(2),
  cep: cepSchema,
  tier: tierSchema.default(TIERS.STARTER),
  email_contato: emailSchema.optional(),
  telefone_contato: phoneSchema.optional(),
});

export const createCondominioSchema = condominioSchema;

export const updateCondominioSchema = condominioSchema.partial();

export const usuarioSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(200),
  email: emailSchema,
  cpf: cpfSchema.optional(),
  telefone: phoneSchema.optional(),
  role: roleSchema.default(ROLES.MORADOR),
  status: statusSchema.default(STATUS.PENDING),
});

export const createUsuarioSchema = usuarioSchema.extend({
  password: passwordSchema,
});

export const updateUsuarioSchema = usuarioSchema.partial();

export const unidadeHabitacionalSchema = z.object({
  identificador: z.string().min(1).max(20), // Ex: "101", "A-101"
  bloco_id: z.string().uuid().optional(),
  tipo: z.enum(['apartamento', 'casa', 'sala', 'loja', 'garagem', 'outro']).default('apartamento'),
  area_m2: z.number().positive().optional(),
  fracao_ideal: z.number().min(0).max(1).optional(),
});

export const blocoSchema = z.object({
  nome: z.string().min(1).max(50), // Ex: "Bloco A", "Torre Norte"
  andares: z.number().int().positive().optional(),
});

export const comunicadoSchema = z.object({
  titulo: z.string().min(5).max(LIMITS.MAX_TITLE_LENGTH),
  conteudo: z.string().min(10).max(LIMITS.MAX_COMUNICADO_LENGTH),
  categoria: comunicadoCategorySchema.default(COMUNICADO_CATEGORIES.GERAL),
  prioridade: prioritySchema.default(PRIORITIES.MEDIUM),
  publicado: z.boolean().default(false),
  data_publicacao: z.string().datetime().optional(),
  data_expiracao: z.string().datetime().optional(),
  fixado: z.boolean().default(false),
});

export const createComunicadoSchema = comunicadoSchema;
export const updateComunicadoSchema = comunicadoSchema.partial();

// ===== AUTH =====

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const registerSchema = z
  .object({
    nome: z.string().min(2).max(200),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  });

export const registerMoradorSchema = z
  .object({
    nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(200),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    telefone: phoneSchema.optional(),
    codigo_convite: z.string().length(8, 'Código de convite deve ter 8 caracteres').toUpperCase(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  });

export const registerSindicoSchema = z
  .object({
    nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(200),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    telefone: phoneSchema.optional(),
    cpf: cpfSchema.optional(),
    // Dados do condomínio (se novo)
    condominio_nome: z.string().min(3).max(200).optional(),
    condominio_cnpj: cnpjSchema.optional(),
    condominio_endereco: z.string().min(5).max(500).optional(),
    condominio_cidade: z.string().min(2).max(100).optional(),
    condominio_estado: z.string().length(2).optional(),
    condominio_cep: cepSchema.optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Nova senha deve ser diferente da atual',
    path: ['newPassword'],
  });

// ===== IMPERSONATE =====

export const impersonateSchema = z.object({
  usuario_alvo_id: z.string().uuid('ID inválido'),
  motivo: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres').max(500),
});

// ===== APPROVE USER =====

export const approveUserSchema = z
  .object({
    usuario_id: z.string().uuid('ID inválido'),
    acao: z.enum(['approve', 'reject']),
    unidade_id: z.string().uuid('ID inválido').optional(),
    motivo_rejeicao: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres').optional(),
  })
  .refine(
    (data) => {
      if (data.acao === 'reject') {
        return !!data.motivo_rejeicao;
      }
      return true;
    },
    {
      message: 'Motivo obrigatório para rejeição',
      path: ['motivo_rejeicao'],
    }
  );

// ===== VALIDATE ATA =====

export const validateAtaSchema = z
  .object({
    ata_id: z.string().uuid('ID inválido'),
    acao: z.enum(['approve', 'reject']),
    condominio_id: z.string().uuid('ID inválido').optional(),
    motivo_rejeicao: z.string().min(20, 'Motivo deve ter no mínimo 20 caracteres').optional(),
  })
  .refine(
    (data) => {
      if (data.acao === 'reject') {
        return !!data.motivo_rejeicao;
      }
      return true;
    },
    {
      message: 'Motivo obrigatório para rejeição',
      path: ['motivo_rejeicao'],
    }
  );

// ===== API / SEARCH =====

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const searchSchema = z
  .object({
    q: z.string().max(200).optional(),
    status: statusSchema.optional(),
    sort: z.string().max(50).optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
  })
  .merge(paginationSchema);

// ===== MÓDULOS OPERACIONAIS =====

// Categorias de ocorrências
export const ocorrenciaCategoriaSchema = z.enum([
  'barulho',
  'vazamento',
  'iluminacao',
  'limpeza',
  'seguranca',
  'area_comum',
  'elevador',
  'portaria',
  'animais',
  'estacionamento',
  'outros',
]);

// Status de ocorrências
export const ocorrenciaStatusSchema = z.enum([
  'aberta',
  'em_analise',
  'em_andamento',
  'resolvida',
  'arquivada',
]);

// Categorias de chamados
export const chamadoCategoriaSchema = z.enum([
  'segunda_via_boleto',
  'atualizacao_cadastro',
  'reserva_espaco',
  'autorizacao_obra',
  'mudanca',
  'reclamacao',
  'sugestao',
  'duvida',
  'outros',
]);

// Status de chamados
export const chamadoStatusSchema = z.enum([
  'novo',
  'em_atendimento',
  'aguardando_resposta',
  'resolvido',
  'fechado',
]);

// Status de comunicados
export const comunicadoStatusSchema = z.enum(['rascunho', 'publicado', 'arquivado']);

// ===== OCORRÊNCIAS =====

export const createOcorrenciaSchema = z.object({
  titulo: z.string().min(5, 'Título deve ter no mínimo 5 caracteres').max(200),
  descricao: z.string().min(20, 'Descrição deve ter no mínimo 20 caracteres'),
  categoria: ocorrenciaCategoriaSchema.default('outros'),
  prioridade: prioritySchema.default('medium'),
  anonimo: z.boolean().default(false),
  unidade_relacionada_id: z.string().uuid().optional(),
  local_descricao: z.string().max(200).optional(),
});

export const updateOcorrenciaSchema = z.object({
  titulo: z.string().min(5).max(200).optional(),
  descricao: z.string().min(20).optional(),
  categoria: ocorrenciaCategoriaSchema.optional(),
  prioridade: prioritySchema.optional(),
  status: ocorrenciaStatusSchema.optional(),
  responsavel_id: z.string().uuid().optional().nullable(),
  resolucao: z.string().optional(),
  local_descricao: z.string().max(200).optional(),
});

// ===== CHAMADOS =====

export const createChamadoSchema = z.object({
  titulo: z.string().min(5, 'Título deve ter no mínimo 5 caracteres').max(200),
  descricao: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  categoria: chamadoCategoriaSchema.default('duvida'),
  prioridade: prioritySchema.default('medium'),
});

export const updateChamadoSchema = z.object({
  titulo: z.string().min(5).max(200).optional(),
  descricao: z.string().min(10).optional(),
  categoria: chamadoCategoriaSchema.optional(),
  prioridade: prioritySchema.optional(),
  status: chamadoStatusSchema.optional(),
  atendente_id: z.string().uuid().optional().nullable(),
  resposta_final: z.string().optional(),
});

export const chamadoMensagemSchema = z.object({
  chamado_id: z.string().uuid(),
  mensagem: z.string().min(1, 'Mensagem não pode estar vazia'),
  interno: z.boolean().default(false),
});

export const avaliarChamadoSchema = z.object({
  avaliacao_nota: z.number().int().min(1).max(5),
  avaliacao_comentario: z.string().max(500).optional(),
});

// ===== FAQ =====

export const createFaqSchema = z.object({
  pergunta: z.string().min(10, 'Pergunta deve ter no mínimo 10 caracteres').max(500),
  resposta: z.string().min(20, 'Resposta deve ter no mínimo 20 caracteres'),
  categoria: z.string().max(100).default('geral'),
  ordem: z.number().int().default(0),
  ativo: z.boolean().default(true),
  destaque: z.boolean().default(false),
});

export const updateFaqSchema = createFaqSchema.partial();

export const voteFaqSchema = z.object({
  faq_id: z.string().uuid(),
  util: z.boolean(),
});

// ===== TYPE EXPORTS =====

export type Condominio = z.infer<typeof condominioSchema>;
export type CreateCondominio = z.infer<typeof createCondominioSchema>;
export type UpdateCondominio = z.infer<typeof updateCondominioSchema>;

export type Usuario = z.infer<typeof usuarioSchema>;
export type CreateUsuario = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuario = z.infer<typeof updateUsuarioSchema>;

export type UnidadeHabitacional = z.infer<typeof unidadeHabitacionalSchema>;
export type Bloco = z.infer<typeof blocoSchema>;

export type Comunicado = z.infer<typeof comunicadoSchema>;
export type CreateComunicado = z.infer<typeof createComunicadoSchema>;
export type UpdateComunicado = z.infer<typeof updateComunicadoSchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterMoradorInput = z.infer<typeof registerMoradorSchema>;
export type RegisterSindicoInput = z.infer<typeof registerSindicoSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ImpersonateInput = z.infer<typeof impersonateSchema>;
export type ApproveUserInput = z.infer<typeof approveUserSchema>;
export type ValidateAtaInput = z.infer<typeof validateAtaSchema>;

export type Pagination = z.infer<typeof paginationSchema>;
export type SearchParams = z.infer<typeof searchSchema>;

// Módulos Operacionais
export type OcorrenciaCategoria = z.infer<typeof ocorrenciaCategoriaSchema>;
export type OcorrenciaStatus = z.infer<typeof ocorrenciaStatusSchema>;
export type ChamadoCategoria = z.infer<typeof chamadoCategoriaSchema>;
export type ChamadoStatus = z.infer<typeof chamadoStatusSchema>;
export type ComunicadoStatus = z.infer<typeof comunicadoStatusSchema>;

export type CreateOcorrencia = z.infer<typeof createOcorrenciaSchema>;
export type UpdateOcorrencia = z.infer<typeof updateOcorrenciaSchema>;

export type CreateChamado = z.infer<typeof createChamadoSchema>;
export type UpdateChamado = z.infer<typeof updateChamadoSchema>;
export type ChamadoMensagem = z.infer<typeof chamadoMensagemSchema>;
export type AvaliarChamado = z.infer<typeof avaliarChamadoSchema>;

export type CreateFaq = z.infer<typeof createFaqSchema>;
export type UpdateFaq = z.infer<typeof updateFaqSchema>;
export type VoteFaq = z.infer<typeof voteFaqSchema>;
