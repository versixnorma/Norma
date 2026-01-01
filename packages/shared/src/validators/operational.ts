import { z } from 'zod';

// ============================================
// ENUMS
// ============================================

export const comunicadoStatusSchema = z.enum(['rascunho', 'publicado', 'arquivado']);
export const comunicadoCategoriaSchema = z.enum(['geral', 'manutencao', 'financeiro', 'seguranca', 'evento', 'urgente', 'obras', 'assembleia']);
export const ocorrenciaStatusSchema = z.enum(['aberta', 'em_analise', 'em_andamento', 'resolvida', 'arquivada']);
export const ocorrenciaCategoriaSchema = z.enum(['barulho', 'vazamento', 'iluminacao', 'limpeza', 'seguranca', 'area_comum', 'elevador', 'portaria', 'animais', 'estacionamento', 'outros']);
export const prioridadeSchema = z.enum(['baixa', 'media', 'alta', 'urgente']);
export const chamadoStatusSchema = z.enum(['novo', 'em_atendimento', 'aguardando_resposta', 'resolvido', 'fechado']);
export const chamadoCategoriaSchema = z.enum(['segunda_via_boleto', 'atualizacao_cadastro', 'reserva_espaco', 'autorizacao_obra', 'mudanca', 'reclamacao', 'sugestao', 'duvida', 'outros']);

// ============================================
// ANEXO
// ============================================

export const anexoSchema = z.object({
  url: z.string().url(),
  nome: z.string().min(1).max(255),
  tipo: z.string(),
  tamanho: z.number().positive().max(10485760), // 10MB
  uploaded_at: z.string().datetime().optional(),
});

// ============================================
// COMUNICADOS
// ============================================

const baseComunicadoSchema = z.object({
  titulo: z.string().min(5, 'Título deve ter pelo menos 5 caracteres').max(200),
  conteudo: z.string().min(10, 'Conteúdo deve ter pelo menos 10 caracteres'),
  resumo: z.string().max(500).optional(),
  categoria: comunicadoCategoriaSchema.default('geral'),
  fixado: z.boolean().default(false),
  destaque: z.boolean().default(false),
  publicar_em: z.string().datetime().optional().nullable(),
  expirar_em: z.string().datetime().optional().nullable(),
  anexos: z.array(anexoSchema).default([]),
  status: comunicadoStatusSchema.default('rascunho'),
});

export const createComunicadoSchema = baseComunicadoSchema.refine(data => {
  if (data.publicar_em && data.expirar_em) {
    return new Date(data.expirar_em) > new Date(data.publicar_em);
  }
  return true;
}, { message: 'Data de expiração deve ser posterior à data de publicação' });

export const updateComunicadoSchema = baseComunicadoSchema.partial().extend({
  id: z.string().uuid(),
});

// ============================================
// OCORRÊNCIAS
// ============================================

export const createOcorrenciaSchema = z.object({
  titulo: z.string().min(5, 'Título deve ter pelo menos 5 caracteres').max(200),
  descricao: z.string().min(20, 'Descrição deve ter pelo menos 20 caracteres'),
  categoria: ocorrenciaCategoriaSchema.default('outros'),
  prioridade: prioridadeSchema.default('media'),
  anonimo: z.boolean().default(false),
  unidade_relacionada_id: z.string().uuid().optional().nullable(),
  local_descricao: z.string().max(200).optional(),
  anexos: z.array(anexoSchema).default([]),
});

export const updateOcorrenciaSchema = z.object({
  id: z.string().uuid(),
  status: ocorrenciaStatusSchema.optional(),
  responsavel_id: z.string().uuid().optional().nullable(),
  resolucao: z.string().optional(),
  prioridade: prioridadeSchema.optional(),
});

// ============================================
// CHAMADOS
// ============================================

export const createChamadoSchema = z.object({
  titulo: z.string().min(5, 'Título deve ter pelo menos 5 caracteres').max(200),
  descricao: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  categoria: chamadoCategoriaSchema.default('duvida'),
  prioridade: prioridadeSchema.default('media'),
  anexos: z.array(anexoSchema).default([]),
});

export const updateChamadoSchema = z.object({
  id: z.string().uuid(),
  status: chamadoStatusSchema.optional(),
  atendente_id: z.string().uuid().optional().nullable(),
  resposta_final: z.string().optional(),
  prioridade: prioridadeSchema.optional(),
});

export const createMensagemSchema = z.object({
  chamado_id: z.string().uuid(),
  mensagem: z.string().min(1, 'Mensagem não pode ser vazia'),
  anexos: z.array(anexoSchema).default([]),
});

export const avaliarChamadoSchema = z.object({
  id: z.string().uuid(),
  avaliacao_nota: z.number().int().min(1).max(5),
  avaliacao_comentario: z.string().max(500).optional(),
});

// ============================================
// FAQ
// ============================================

export const createFAQSchema = z.object({
  pergunta: z.string().min(10, 'Pergunta deve ter pelo menos 10 caracteres').max(500),
  resposta: z.string().min(20, 'Resposta deve ter pelo menos 20 caracteres'),
  categoria: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).default([]),
  ordem: z.number().int().min(0).default(0),
  destaque: z.boolean().default(false),
});

export const updateFAQSchema = createFAQSchema.partial().extend({
  id: z.string().uuid(),
  ativo: z.boolean().optional(),
});

// ============================================
// FILTROS E PAGINAÇÃO
// ============================================

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  orderBy: z.string().optional(),
  orderDir: z.enum(['asc', 'desc']).default('desc'),
});

export const comunicadoFiltersSchema = paginationSchema.extend({
  status: comunicadoStatusSchema.optional(),
  categoria: comunicadoCategoriaSchema.optional(),
  fixado: z.boolean().optional(),
  busca: z.string().optional(),
});

export const ocorrenciaFiltersSchema = paginationSchema.extend({
  status: ocorrenciaStatusSchema.optional(),
  categoria: ocorrenciaCategoriaSchema.optional(),
  prioridade: prioridadeSchema.optional(),
  responsavel_id: z.string().uuid().optional(),
  minhas: z.boolean().optional(),
  busca: z.string().optional(),
});

export const chamadoFiltersSchema = paginationSchema.extend({
  status: chamadoStatusSchema.optional(),
  categoria: chamadoCategoriaSchema.optional(),
  prioridade: prioridadeSchema.optional(),
  atendente_id: z.string().uuid().optional(),
  meus: z.boolean().optional(),
  busca: z.string().optional(),
});

export const faqFiltersSchema = paginationSchema.extend({
  categoria: z.string().optional(),
  tags: z.array(z.string()).optional(),
  destaque: z.boolean().optional(),
  busca: z.string().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type CreateComunicadoInput = z.infer<typeof createComunicadoSchema>;
export type UpdateComunicadoInput = z.infer<typeof updateComunicadoSchema>;
export type CreateOcorrenciaInput = z.infer<typeof createOcorrenciaSchema>;
export type UpdateOcorrenciaInput = z.infer<typeof updateOcorrenciaSchema>;
export type CreateChamadoInput = z.infer<typeof createChamadoSchema>;
export type UpdateChamadoInput = z.infer<typeof updateChamadoSchema>;
export type CreateMensagemInput = z.infer<typeof createMensagemSchema>;
export type AvaliarChamadoInput = z.infer<typeof avaliarChamadoSchema>;
export type CreateFAQInput = z.infer<typeof createFAQSchema>;
export type UpdateFAQInput = z.infer<typeof updateFAQSchema>;
