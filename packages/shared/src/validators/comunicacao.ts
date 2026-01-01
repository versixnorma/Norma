import { z } from 'zod';

// ENUMs
export const canalNotificacaoSchema = z.enum(['push', 'email', 'whatsapp', 'sms', 'voz', 'mural']);
export const prioridadeComunicadoSchema = z.enum(['baixa', 'normal', 'alta', 'critica']);
export const statusEntregaSchema = z.enum(['pendente', 'enviado', 'entregue', 'lido', 'falhou']);
export const digestFrequenciaSchema = z.enum(['diario', 'semanal']);
export const tipoEmergenciaSchema = z.enum(['incendio', 'gas', 'seguranca', 'medica', 'outro']);

// Config
export const updateNotificacoesConfigSchema = z.object({
  push_habilitado: z.boolean().optional(),
  email_habilitado: z.boolean().optional(),
  whatsapp_habilitado: z.boolean().optional(),
  sms_habilitado: z.boolean().optional(),
  voz_habilitado: z.boolean().optional(),
  tempo_espera_push_para_email: z.number().int().min(1).max(1440).optional(),
  tempo_espera_email_para_whatsapp: z.number().int().min(1).max(10080).optional(),
  tempo_espera_whatsapp_para_sms: z.number().int().min(1).max(10080).optional(),
  horario_inicio: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  horario_fim: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  emergencia_ignora_horario: z.boolean().optional()
});

// Preferências
export const updatePreferenciasSchema = z.object({
  push_habilitado: z.boolean().optional(),
  email_habilitado: z.boolean().optional(),
  whatsapp_habilitado: z.boolean().optional(),
  sms_habilitado: z.boolean().optional(),
  voz_emergencia_habilitado: z.boolean().optional(),
  receber_digest: z.boolean().optional(),
  digest_frequencia: digestFrequenciaSchema.optional(),
  digest_horario: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  email_alternativo: z.string().email().optional().or(z.literal('')),
  telefone_alternativo: z.string().min(10).max(20).optional().or(z.literal(''))
});

// Notificação
export const createNotificacaoSchema = z.object({
  tipo: z.string().min(1).max(50),
  titulo: z.string().min(3, 'Título deve ter pelo menos 3 caracteres').max(255),
  corpo: z.string().min(10, 'Corpo deve ter pelo menos 10 caracteres').max(10000),
  prioridade: prioridadeComunicadoSchema.default('normal'),
  destinatarios_tipo: z.enum(['todos', 'bloco', 'unidade', 'role']).default('todos'),
  destinatarios_filtro: z.record(z.any()).optional(),
  agendada_para: z.string().datetime().optional(),
  gerar_mural: z.boolean().default(false),
  referencia_tipo: z.string().max(50).optional(),
  referencia_id: z.string().uuid().optional()
});

// Emergência
export const dispararEmergenciaSchema = z.object({
  tipo: tipoEmergenciaSchema,
  descricao: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres').max(1000)
});

// FCM Token
export const fcmTokenSchema = z.object({
  token: z.string().min(50).max(500)
});

// Filtros
export const notificacoesFiltersSchema = z.object({
  tipo: z.string().optional(),
  prioridade: prioridadeComunicadoSchema.optional(),
  status: statusEntregaSchema.optional(),
  data_inicio: z.string().datetime().optional(),
  data_fim: z.string().datetime().optional()
});

// Type exports
export type UpdateNotificacoesConfigInput = z.infer<typeof updateNotificacoesConfigSchema>;
export type UpdatePreferenciasInput = z.infer<typeof updatePreferenciasSchema>;
export type CreateNotificacaoInput = z.infer<typeof createNotificacaoSchema>;
export type DispararEmergenciaInput = z.infer<typeof dispararEmergenciaSchema>;
export type NotificacoesFilters = z.infer<typeof notificacoesFiltersSchema>;
