// ============================================
// VERSIX NORMA - TIPOS MÓDULO COMUNICAÇÃO
// Sprint 7: Comunicação Multicanal
// ============================================

// ENUMs
export type CanalNotificacao = 'push' | 'email' | 'whatsapp' | 'sms' | 'voz' | 'mural';
export type PrioridadeComunicado = 'baixa' | 'normal' | 'alta' | 'critica';
export type StatusEntrega = 'pendente' | 'enviado' | 'entregue' | 'lido' | 'falhou';
export type DigestFrequencia = 'diario' | 'semanal';
export type TipoEmergencia = 'incendio' | 'gas' | 'seguranca' | 'medica' | 'outro';

// ============================================
// CONFIG
// ============================================
export interface NotificacoesConfig {
  id: string;
  condominio_id: string;
  push_habilitado: boolean;
  email_habilitado: boolean;
  whatsapp_habilitado: boolean;
  sms_habilitado: boolean;
  voz_habilitado: boolean;
  tempo_espera_push_para_email: number;
  tempo_espera_email_para_whatsapp: number;
  tempo_espera_whatsapp_para_sms: number;
  horario_inicio: string;
  horario_fim: string;
  emergencia_ignora_horario: boolean;
  whatsapp_phone_id: string | null;
  whatsapp_business_id: string | null;
  creditos_sms: number;
  creditos_voz: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateNotificacoesConfigInput {
  push_habilitado?: boolean;
  email_habilitado?: boolean;
  whatsapp_habilitado?: boolean;
  sms_habilitado?: boolean;
  voz_habilitado?: boolean;
  tempo_espera_push_para_email?: number;
  tempo_espera_email_para_whatsapp?: number;
  tempo_espera_whatsapp_para_sms?: number;
  horario_inicio?: string;
  horario_fim?: string;
  emergencia_ignora_horario?: boolean;
}

// ============================================
// PREFERÊNCIAS DO USUÁRIO
// ============================================
export interface UsuarioCanaisPreferencias {
  id: string;
  usuario_id: string;
  // Canais
  push_habilitado: boolean;
  email_habilitado: boolean;
  in_app_habilitado: boolean;
  whatsapp_habilitado: boolean;
  sms_habilitado: boolean;
  voz_habilitado: boolean;
  // Tipos de notificação
  receber_comunicados: boolean;
  receber_avisos: boolean;
  receber_alertas: boolean;
  receber_emergencias: boolean;
  receber_lembretes: boolean;
  receber_cobrancas: boolean;
  receber_assembleias: boolean;
  receber_ocorrencias: boolean;
  receber_chamados: boolean;
  // Horários
  horario_inicio_preferido: string | null;
  horario_fim_preferido: string | null;
  // Dispositivos
  push_tokens: Array<{
    token: string;
    device_type?: string;
    device_name?: string;
    last_used?: string;
  }> | null;
  // Contatos
  whatsapp_numero: string | null;
  whatsapp_verificado: boolean;
  sms_numero: string | null;
  voz_numero: string | null;
  // Metadados
  created_at: string;
  updated_at: string;
}

export interface UpdatePreferenciasInput {
  // Canais
  push_habilitado?: boolean;
  email_habilitado?: boolean;
  in_app_habilitado?: boolean;
  whatsapp_habilitado?: boolean;
  sms_habilitado?: boolean;
  voz_habilitado?: boolean;
  // Tipos de notificação
  receber_comunicados?: boolean;
  receber_avisos?: boolean;
  receber_alertas?: boolean;
  receber_emergencias?: boolean;
  receber_lembretes?: boolean;
  receber_cobrancas?: boolean;
  receber_assembleias?: boolean;
  receber_ocorrencias?: boolean;
  receber_chamados?: boolean;
  // Horários
  horario_inicio_preferido?: string | null;
  horario_fim_preferido?: string | null;
  // Contatos
  whatsapp_numero?: string | null;
  sms_numero?: string | null;
  voz_numero?: string | null;
}

// ============================================
// NOTIFICAÇÃO
// ============================================
export interface Notificacao {
  id: string;
  condominio_id: string;
  tipo: string;
  referencia_tipo: string | null;
  referencia_id: string | null;
  titulo: string;
  corpo: string;
  corpo_resumo: string | null;
  prioridade: PrioridadeComunicado;
  destinatarios_tipo: string;
  destinatarios_filtro: Record<string, any> | null;
  agendada_para: string | null;
  enviada_em: string | null;
  gerar_mural: boolean;
  mural_path: string | null;
  criado_por: string | null;
  created_at: string;
  // Joins
  entregas?: NotificacaoEntrega[];
  dashboard?: NotificacaoDashboard;
}

export interface CreateNotificacaoInput {
  tipo: string;
  titulo: string;
  corpo: string;
  prioridade?: PrioridadeComunicado;
  destinatarios_tipo?: string;
  destinatarios_filtro?: Record<string, any>;
  agendada_para?: string;
  gerar_mural?: boolean;
  referencia_tipo?: string;
  referencia_id?: string;
}

// ============================================
// ENTREGA
// ============================================
export interface NotificacaoEntrega {
  id: string;
  notificacao_id: string;
  usuario_id: string;
  canal: CanalNotificacao;
  status: StatusEntrega;
  enviado_em: string | null;
  entregue_em: string | null;
  lido_em: string | null;
  provider_message_id: string | null;
  provider_response: Record<string, any> | null;
  erro_mensagem: string | null;
  tentativas: number;
  proxima_tentativa: string | null;
  ip_leitura: string | null;
  user_agent_leitura: string | null;
  created_at: string;
  // Joins
  notificacao?: Notificacao;
}

// ============================================
// DASHBOARD
// ============================================
export interface NotificacaoDashboard {
  id: string;
  condominio_id: string;
  titulo: string;
  prioridade: PrioridadeComunicado;
  tipo: string;
  created_at: string;
  total_destinatarios: number;
  total_lidos: number;
  total_entregues: number;
  total_falhas: number;
  percentual_leitura: number;
  lidos_push: number;
  lidos_email: number;
  lidos_whatsapp: number;
}

// ============================================
// MURAL
// ============================================
export interface MuralGerado {
  id: string;
  condominio_id: string;
  notificacao_id: string | null;
  titulo: string;
  comunicados_ids: string[];
  pdf_path: string;
  qr_code_url: string | null;
  valido_de: string;
  valido_ate: string;
  impresso: boolean;
  impresso_em: string | null;
  impresso_por: string | null;
  created_at: string;
}

// ============================================
// EMERGÊNCIA
// ============================================
export interface EmergenciaLog {
  id: string;
  condominio_id: string;
  tipo: TipoEmergencia;
  descricao: string;
  disparado_por: string | null;
  disparado_em: string;
  total_destinatarios: number | null;
  total_ligacoes: number | null;
  total_atendidas: number | null;
  total_sms: number | null;
  total_push: number | null;
  disparo_inicio: string | null;
  disparo_fim: string | null;
  detalhes: Record<string, any> | null;
}

export interface DispararEmergenciaInput {
  tipo: TipoEmergencia;
  descricao: string;
}

// ============================================
// CONTATO INVÁLIDO
// ============================================
export interface ContatoInvalido {
  id: string;
  usuario_id: string;
  tipo: string;
  valor: string;
  motivo: string;
  detectado_em: string;
  usuario_notificado: boolean;
  notificado_em: string | null;
  corrigido: boolean;
  corrigido_em: string | null;
  // Joins
  usuario?: { nome: string; unidade?: { identificador: string } };
}

// ============================================
// VIEW DE NOTIFICAÇÕES DO USUÁRIO
// ============================================
export interface NotificacaoUsuario {
  entrega_id: string;
  usuario_id: string;
  canal: CanalNotificacao;
  status: StatusEntrega;
  lido_em: string | null;
  notificacao_id: string;
  tipo: string;
  titulo: string;
  corpo: string;
  corpo_resumo: string | null;
  prioridade: PrioridadeComunicado;
  referencia_tipo: string | null;
  referencia_id: string | null;
  created_at: string;
}

// ============================================
// FILTROS
// ============================================
export interface NotificacoesFilters {
  tipo?: string;
  prioridade?: PrioridadeComunicado;
  status?: StatusEntrega;
  data_inicio?: string;
  data_fim?: string;
}
