import { z } from 'zod';

// ENUMs
export const assembleiaTipoSchema = z.enum(['AGO', 'AGE', 'permanente']);
export const assembleiaStatusSchema = z.enum(['rascunho', 'convocada', 'em_andamento', 'votacao', 'encerrada', 'arquivada']);
export const pautaTipoVotacaoSchema = z.enum(['aprovacao', 'escolha_unica', 'escolha_multipla', 'eleicao', 'informativo']);
export const pautaStatusSchema = z.enum(['pendente', 'em_votacao', 'encerrada', 'aprovada', 'rejeitada', 'sem_quorum']);
export const quorumEspecialSchema = z.enum(['maioria_simples', 'maioria_absoluta', 'dois_tercos', 'unanimidade']);
export const presencaTipoSchema = z.enum(['presencial', 'online', 'procuracao', 'voto_antecipado']);
export const assinaturaTipoSchema = z.enum(['presidente', 'secretario', 'sindico', 'testemunha']);
export const comentarioTipoSchema = z.enum(['comentario', 'pergunta', 'resposta', 'moderacao']);
export const votoSchema = z.enum(['sim', 'nao', 'abstencao', 'opcao']);

// Assembleia
export const createAssembleiaSchema = z.object({
  tipo: assembleiaTipoSchema,
  titulo: z.string().min(5, 'Título deve ter pelo menos 5 caracteres').max(255),
  descricao: z.string().max(5000).optional(),
  data_primeira_convocacao: z.string().datetime().optional(),
  data_segunda_convocacao: z.string().datetime().optional(),
  permite_voto_antecipado: z.boolean().default(false),
  data_limite_voto_antecipado: z.string().datetime().optional(),
  permite_procuracao: z.boolean().default(true),
  max_procuracoes_por_pessoa: z.number().int().min(1).max(10).default(2),
  quorum_minimo_primeira: z.number().min(0).max(100).default(50),
  quorum_minimo_segunda: z.number().min(0).max(100).default(0),
  local_presencial: z.string().max(255).optional(),
  link_video: z.string().url().optional()
});

export const updateAssembleiaSchema = createAssembleiaSchema.partial().extend({
  id: z.string().uuid(),
  status: assembleiaStatusSchema.optional(),
  ata_texto: z.string().optional()
});

// Pauta
export const createPautaSchema = z.object({
  ordem: z.number().int().min(1),
  titulo: z.string().min(5, 'Título deve ter pelo menos 5 caracteres').max(255),
  descricao: z.string().max(5000).optional(),
  tipo_votacao: pautaTipoVotacaoSchema.default('aprovacao'),
  voto_secreto: z.boolean().default(false),
  quorum_especial: quorumEspecialSchema.default('maioria_simples'),
  permite_abstencao: z.boolean().default(true),
  cargo: z.string().max(100).optional(),
  max_eleitos: z.number().int().min(1).default(1),
  bloqueia_inadimplentes: z.boolean().default(true)
});

export const updatePautaSchema = createPautaSchema.partial().extend({
  id: z.string().uuid(),
  status: pautaStatusSchema.optional()
});

// Opção de Pauta
export const createPautaOpcaoSchema = z.object({
  ordem: z.number().int().min(1),
  titulo: z.string().min(1).max(255),
  descricao: z.string().max(1000).optional(),
  candidato_id: z.string().uuid().optional()
});

// Voto
export const votarSchema = z.object({
  pauta_id: z.string().uuid(),
  presenca_id: z.string().uuid(),
  voto: votoSchema,
  opcao_id: z.string().uuid().optional()
}).refine(data => {
  if (data.voto === 'opcao' && !data.opcao_id) return false;
  return true;
}, { message: 'opcao_id é obrigatório quando voto é "opcao"' });

// Comentário
export const createComentarioSchema = z.object({
  pauta_id: z.string().uuid(),
  conteudo: z.string().min(1).max(2000),
  tipo: comentarioTipoSchema.default('comentario'),
  parent_id: z.string().uuid().optional()
});

// Assinatura
export const assinarSchema = z.object({
  assembleia_id: z.string().uuid(),
  tipo: assinaturaTipoSchema
});

// Registrar Presença
export const registrarPresencaSchema = z.object({
  assembleia_id: z.string().uuid(),
  tipo: presencaTipoSchema.default('online'),
  representante_id: z.string().uuid().optional(),
  procuracao_path: z.string().optional()
});

// Filtros
export const assembleiaFiltersSchema = z.object({
  tipo: assembleiaTipoSchema.optional(),
  status: assembleiaStatusSchema.optional(),
  ano: z.number().int().min(2020).max(2100).optional()
});

// Type exports
export type CreateAssembleiaInput = z.infer<typeof createAssembleiaSchema>;
export type UpdateAssembleiaInput = z.infer<typeof updateAssembleiaSchema>;
export type CreatePautaInput = z.infer<typeof createPautaSchema>;
export type UpdatePautaInput = z.infer<typeof updatePautaSchema>;
export type CreatePautaOpcaoInput = z.infer<typeof createPautaOpcaoSchema>;
export type VotarInput = z.infer<typeof votarSchema>;
export type CreateComentarioInput = z.infer<typeof createComentarioSchema>;
export type AssinarInput = z.infer<typeof assinarSchema>;
export type RegistrarPresencaInput = z.infer<typeof registrarPresencaSchema>;
