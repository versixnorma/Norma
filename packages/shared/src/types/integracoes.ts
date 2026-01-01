// ============================================
// VERSIX NORMA - TIPOS MÓDULO INTEGRAÇÕES
// Sprint 8: APIs, Webhooks, Conectores
// ============================================

// ENUMs
export type IntegracaoTipo = 'api' | 'webhook' | 'conector';
export type IntegracaoStatus = 'ativa' | 'pausada' | 'erro' | 'desativada';

export type WebhookEvento = 
  | 'comunicado.publicado'
  | 'assembleia.criada' | 'assembleia.convocada' | 'assembleia.iniciada' | 'assembleia.encerrada'
  | 'pagamento.criado' | 'pagamento.confirmado' | 'pagamento.vencido'
  | 'ocorrencia.criada' | 'ocorrencia.resolvida'
  | 'chamado.criado' | 'chamado.atualizado'
  | 'morador.cadastrado' | 'morador.aprovado' | 'morador.removido'
  | 'reserva.criada' | 'reserva.aprovada' | 'reserva.cancelada';

export type ConectorTipo = 'google_calendar' | 'asaas' | 's3_backup' | 'zapier' | 'ical';
export type ExportacaoFormato = 'csv' | 'ofx' | 'pdf' | 'xlsx';
export type ExportacaoTipo = 'financeiro' | 'moradores' | 'ocorrencias' | 'reservas' | 'completo';

// ============================================
// INTEGRAÇÃO
// ============================================
export interface Integracao {
  id: string;
  condominio_id: string;
  nome: string;
  descricao: string | null;
  tipo: IntegracaoTipo;
  api_key: string | null;
  secret_key: string | null;
  url_destino: string | null;
  headers_custom: Record<string, string>;
  oauth_provider: string | null;
  oauth_tokens: OAuthTokens | null;
  rate_limit_requests: number;
  rate_limit_periodo: string;
  scopes: string[];
  status: IntegracaoStatus;
  ultimo_uso: string | null;
  total_requests: number;
  total_erros: number;
  ip_whitelist: string[] | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  webhook_config?: WebhookConfig;
  conector_config?: ConectorConfig;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope?: string;
}

export interface CreateIntegracaoApiInput {
  nome: string;
  descricao?: string;
  scopes?: string[];
}

export interface CreateWebhookInput {
  nome: string;
  url_destino: string;
  eventos: WebhookEvento[];
  headers_custom?: Record<string, string>;
}

// ============================================
// WEBHOOK CONFIG
// ============================================
export interface WebhookConfig {
  id: string;
  integracao_id: string;
  eventos: WebhookEvento[];
  max_tentativas: number;
  intervalo_retry: number;
  timeout_segundos: number;
  filtro_blocos: string[] | null;
  filtro_categorias: string[] | null;
  ativo: boolean;
  created_at: string;
}

export interface UpdateWebhookConfigInput {
  eventos?: WebhookEvento[];
  max_tentativas?: number;
  timeout_segundos?: number;
  ativo?: boolean;
}

// ============================================
// WEBHOOK ENTREGA
// ============================================
export interface WebhookEntrega {
  id: string;
  webhook_config_id: string;
  evento: WebhookEvento;
  payload: Record<string, any>;
  event_id: string | null;
  tentativa: number;
  status_code: number | null;
  response_body: string | null;
  response_time_ms: number | null;
  sucesso: boolean | null;
  erro_mensagem: string | null;
  proxima_tentativa: string | null;
  created_at: string;
}

// ============================================
// API LOG
// ============================================
export interface ApiLog {
  id: string;
  integracao_id: string | null;
  method: string;
  path: string;
  query_params: Record<string, any> | null;
  body_preview: string | null;
  status_code: number;
  response_time_ms: number | null;
  ip_origem: string | null;
  user_agent: string | null;
  erro: boolean;
  erro_mensagem: string | null;
  created_at: string;
}

// ============================================
// CONECTOR CONFIG
// ============================================
export interface ConectorConfig {
  id: string;
  integracao_id: string;
  conector: ConectorTipo;
  config: Record<string, any>;
  ultimo_sync: string | null;
  sync_ativo: boolean;
  sync_intervalo_minutos: number;
  status: string;
  erro_ultimo_sync: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleCalendarConfig {
  calendar_id: string;
  sync_assembleias: boolean;
  sync_reservas: boolean;
}

export interface AsaasConfig {
  api_key: string;
  wallet_id: string;
  sandbox: boolean;
}

export interface S3BackupConfig {
  bucket: string;
  region: string;
  prefix: string;
  access_key_id: string;
  secret_access_key: string;
}

// ============================================
// BACKUP EXTERNO
// ============================================
export interface BackupExterno {
  id: string;
  condominio_id: string;
  provider: string;
  bucket: string;
  path: string;
  tipo: string;
  tabelas: string[] | null;
  tamanho_bytes: number | null;
  status: string;
  erro_mensagem: string | null;
  iniciado_em: string;
  concluido_em: string | null;
  expira_em: string | null;
  deletado: boolean;
}

// ============================================
// EXPORTAÇÃO
// ============================================
export interface Exportacao {
  id: string;
  condominio_id: string;
  tipo: ExportacaoTipo;
  formato: ExportacaoFormato;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  filtros: Record<string, any> | null;
  arquivo_path: string | null;
  tamanho_bytes: number | null;
  status: string;
  erro_mensagem: string | null;
  criado_por: string | null;
  created_at: string;
  expira_em: string | null;
}

export interface CreateExportacaoInput {
  tipo: ExportacaoTipo;
  formato: ExportacaoFormato;
  periodo_inicio?: string;
  periodo_fim?: string;
  filtros?: Record<string, any>;
}

// ============================================
// DASHBOARD VIEW
// ============================================
export interface IntegracaoDashboard {
  id: string;
  condominio_id: string;
  nome: string;
  tipo: IntegracaoTipo;
  status: IntegracaoStatus;
  ultimo_uso: string | null;
  total_requests: number;
  total_erros: number;
  eventos: WebhookEvento[][] | null;
  conector: ConectorTipo | null;
}

// ============================================
// FILTROS
// ============================================
export interface IntegracoesFilters {
  tipo?: IntegracaoTipo;
  status?: IntegracaoStatus;
}

export interface ApiLogsFilters {
  integracao_id?: string;
  method?: string;
  erro?: boolean;
  data_inicio?: string;
  data_fim?: string;
}
