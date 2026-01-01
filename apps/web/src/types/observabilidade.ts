// =====================================================
// SPRINT 10: OBSERVABILIDADE - TYPES
// =====================================================

// =====================================================
// ENUMS
// =====================================================

export type TipoPeriodo = 'hora' | 'dia' | 'semana' | 'mes';
export type SeveridadeAlerta = 'info' | 'warning' | 'error' | 'critical';
export type StatusAlerta = 'aberto' | 'reconhecido' | 'resolvido' | 'ignorado';
export type StatusUptime = 'ok' | 'degraded' | 'error' | 'timeout';
export type StatusSistema = 'healthy' | 'degraded' | 'unhealthy';
export type SeveridadeAnomalia = 'low' | 'medium' | 'high' | 'critical';

// =====================================================
// TABELAS
// =====================================================

export interface MetricasUso {
  id: string;
  condominio_id: string;
  periodo: string; // DATE
  tipo_periodo: TipoPeriodo;

  // Uso
  usuarios_ativos: number;
  sessoes_totais: number;
  tempo_medio_sessao_segundos: number;
  page_views: number;

  // Features
  comunicados_criados: number;
  comunicados_visualizados: number;
  ocorrencias_criadas: number;
  ocorrencias_resolvidas: number;
  chamados_abertos: number;
  chamados_fechados: number;
  reservas_feitas: number;
  votos_assembleias: number;
  documentos_acessados: number;

  // IA
  norma_conversas: number;
  norma_mensagens: number;
  norma_tokens_entrada: number;
  norma_tokens_saida: number;
  norma_tempo_resposta_avg_ms: number;
  norma_satisfacao_avg: number | null;

  // Comunicação
  notificacoes_enviadas: number;
  notificacoes_lidas: number;
  emails_enviados: number;
  emails_abertos: number;
  sms_enviados: number;
  push_enviados: number;
  push_clicados: number;

  // Custos (centavos)
  custo_ia_centavos: number;
  custo_email_centavos: number;
  custo_sms_centavos: number;
  custo_storage_centavos: number;
  custo_total_centavos: number;

  created_at: string;
  updated_at: string;
}

export interface MetricasPerformance {
  id: string;
  periodo: string;
  endpoint: string;
  metodo: string;

  total_requests: number;
  requests_sucesso: number;
  requests_erro: number;
  requests_timeout: number;

  latencia_min: number | null;
  latencia_p50: number | null;
  latencia_p90: number | null;
  latencia_p99: number | null;
  latencia_max: number | null;
  latencia_avg: number | null;

  rps_max: number | null;
  rps_avg: number | null;

  response_size_avg: number | null;
  response_size_max: number | null;

  created_at: string;
}

export interface AlertaSistema {
  id: string;
  tipo: string;
  severidade: SeveridadeAlerta;

  condominio_id: string | null;
  usuario_id: string | null;
  endpoint: string | null;

  titulo: string;
  descricao: string | null;
  dados: Record<string, any>;
  stack_trace: string | null;

  status: StatusAlerta;
  resolvido_em: string | null;
  resolvido_por: string | null;
  resolucao_notas: string | null;

  notificado_slack: boolean;
  notificado_email: boolean;
  notificado_pagerduty: boolean;

  fingerprint: string | null;
  ocorrencias: number;
  primeira_ocorrencia: string;
  ultima_ocorrencia: string;

  created_at: string;
}

export interface UptimeCheck {
  id: string;
  endpoint_nome: string;
  endpoint_url: string;
  endpoint_critico: boolean;

  status: StatusUptime;
  status_code: number | null;
  latencia_ms: number | null;

  erro_mensagem: string | null;
  erro_tipo: string | null;

  checked_at: string;
}

export interface ApiRequestLog {
  id: string;
  request_id: string;
  metodo: string;
  path: string;
  query_params: Record<string, any> | null;
  headers_selecionados: Record<string, any> | null;

  status_code: number;
  response_time_ms: number;
  response_size_bytes: number | null;

  usuario_id: string | null;
  condominio_id: string | null;

  ip_address: string | null;
  user_agent: string | null;
  referer: string | null;

  erro: boolean;
  erro_tipo: string | null;
  erro_mensagem: string | null;

  edge_function: string | null;
  edge_region: string | null;

  created_at: string;
}

export interface AnomaliaDetectada {
  id: string;
  metrica: string;
  condominio_id: string | null;

  valor_atual: number;
  baseline_media: number;
  baseline_desvio: number;
  z_score: number;

  severidade: SeveridadeAnomalia;
  direcao: 'acima' | 'abaixo';

  confirmada: boolean | null;
  falso_positivo: boolean;
  investigada: boolean;

  detected_at: string;
}

export interface HealthCheckConfig {
  id: string;
  nome: string;
  url: string;
  metodo: string;
  headers: Record<string, string>;
  body: Record<string, any> | null;

  ativo: boolean;
  critico: boolean;
  intervalo_segundos: number;
  timeout_segundos: number;

  expect_status: number;
  expect_body_contains: string | null;

  alertar_apos_falhas: number;

  created_at: string;
  updated_at: string;
}

// =====================================================
// VIEWS & COMPUTED
// =====================================================

export interface AlertasResumo {
  severidade: SeveridadeAlerta;
  total: number;
  abertos: number;
  reconhecidos: number;
  mais_antigo: string | null;
}

export interface SystemStatus {
  status_geral: StatusSistema;
  taxa_erro_1h: number | null;
  alertas_criticos: number;
  endpoints: EndpointStatus[];
}

export interface EndpointStatus {
  nome: string;
  status: StatusUptime;
  latencia: number | null;
  critico: boolean;
}

export interface Metricas7d {
  condominio_id: string;
  usuarios_ativos_total: number;
  comunicados_total: number;
  ocorrencias_total: number;
  conversas_ia_total: number;
  custo_total: number;
  latencia_ia_media: number | null;
}

// =====================================================
// DTOs & REQUESTS
// =====================================================

export interface FiltroMetricas {
  condominio_id?: string;
  periodo_inicio: string;
  periodo_fim: string;
  tipo_periodo?: TipoPeriodo;
}

export interface FiltroAlertas {
  tipo?: string;
  severidade?: SeveridadeAlerta;
  status?: StatusAlerta;
  condominio_id?: string;
  limit?: number;
}

export interface CriarAlertaInput {
  tipo: string;
  severidade: SeveridadeAlerta;
  titulo: string;
  descricao?: string;
  condominio_id?: string;
  dados?: Record<string, any>;
}

export interface ResolverAlertaInput {
  alerta_id: string;
  notas?: string;
}

// =====================================================
// DASHBOARD
// =====================================================

export interface DashboardObservabilidade {
  status: SystemStatus;
  alertas: {
    resumo: AlertasResumo[];
    recentes: AlertaSistema[];
  };
  metricas: {
    hoje: MetricasGlobais;
    semana: MetricasGlobais;
    tendencia: TendenciaMetrica[];
  };
  performance: {
    latencia_atual: number;
    latencia_p99: number;
    taxa_erro: number;
    rps: number;
    endpoints_lentos: EndpointLento[];
  };
  uptime: {
    percentual_24h: number;
    checks_recentes: UptimeCheck[];
  };
  custos: {
    hoje: number;
    mes: number;
    por_categoria: CustoPorCategoria[];
    por_condominio: CustoPorCondominio[];
  };
}

export interface MetricasGlobais {
  total_condominios_ativos: number;
  total_usuarios_ativos: number;
  total_requisicoes: number;
  total_erros: number;
  custo_total_centavos: number;
}

export interface TendenciaMetrica {
  data: string;
  valor: number;
  metrica: string;
}

export interface EndpointLento {
  endpoint: string;
  latencia_p99: number;
  requests: number;
}

export interface CustoPorCategoria {
  categoria: string;
  valor_centavos: number;
  percentual: number;
}

export interface CustoPorCondominio {
  condominio_id: string;
  condominio_nome: string;
  custo_centavos: number;
  percentual: number;
}

// =====================================================
// HEALTH CHECK
// =====================================================

export interface HealthCheckResponse {
  status: StatusSistema;
  checks: {
    database: CheckResult;
    auth: CheckResult;
    storage: CheckResult;
    groq?: CheckResult;
    qdrant?: CheckResult;
  };
  timestamp: string;
  version: string;
}

export interface CheckResult {
  status: 'ok' | 'degraded' | 'error';
  latencyMs: number;
  message?: string;
}

// =====================================================
// SENTRY
// =====================================================

export interface SentryUser {
  id: string;
  email: string;
  role: string;
  condominioId: string;
}

export interface SentryContext {
  condominio_id?: string;
  usuario_id?: string;
  endpoint?: string;
  request_id?: string;
  [key: string]: string | number | boolean | null | undefined;
}

// =====================================================
// SLACK NOTIFICATIONS
// =====================================================

export interface SlackMessage {
  tipo: 'alerta' | 'info' | 'sucesso';
  titulo: string;
  mensagem: string;
  campos?: Array<{ titulo: string; valor: string }>;
  link?: { texto: string; url: string };
}

// =====================================================
// ANALYTICS EVENTS
// =====================================================

export type AnalyticsEventType =
  | 'page_view'
  | 'feature_used'
  | 'error_occurred'
  | 'performance_metric'
  | 'user_action';

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  name: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

// =====================================================
// WEB VITALS
// =====================================================

export interface WebVitals {
  CLS: number; // Cumulative Layout Shift
  FID: number; // First Input Delay
  FCP: number; // First Contentful Paint
  LCP: number; // Largest Contentful Paint
  TTFB: number; // Time to First Byte
  INP?: number; // Interaction to Next Paint
}
