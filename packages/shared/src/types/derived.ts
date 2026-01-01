/**
 * VERSIX NORMA - Tipos Derivados do Schema do Banco
 *
 * Este arquivo deriva todos os tipos do database.types.ts gerado automaticamente pelo Supabase.
 * NÃO CRIE TIPOS MANUALMENTE - sempre derive do schema do banco.
 *
 * Para regenerar o database.types.ts:
 * npx supabase gen types typescript --project-id <id> > packages/shared/database.types.ts
 */

import { Database } from '../../database.types';

// ============================================
// TIPOS BASE DO BANCO
// ============================================

export type Tables = Database['public']['Tables'];
export type Enums = Database['public']['Enums'];
export type Functions = Database['public']['Functions'];

// ============================================
// ENUMS
// ============================================

// User & Auth
export type UserRole = Enums['user_role'];
export type UserStatus = Enums['user_status'];
export type TipoResidente = Enums['tipo_residente'];

// Assembleias
export type AssembleiaTipo = Enums['assembleia_tipo'];
export type AssembleiaStatus = Enums['assembleia_status'];
export type PautaTipoVotacao = Enums['pauta_tipo_votacao'];
export type PautaStatus = Enums['pauta_status'];
export type QuorumEspecial = Enums['quorum_especial'];
export type PresencaTipo = Enums['presenca_tipo'];
export type VotoTipo = Enums['voto_tipo'];
export type ProcuracaoStatus = Enums['procuracao_status'];

// Comunicação
export type ComunicadoCategoria = Enums['comunicado_categoria'];
export type ComunicadoStatus = Enums['comunicado_status'];
export type TipoNotificacao = Enums['tipo_notificacao'];
export type CanalNotificacao = Enums['canal_notificacao'];
export type StatusEntrega = Enums['status_entrega'];
export type PrioridadeComunicado = Enums['prioridade_comunicado'];

// Operacional
export type ChamadoCategoria = Enums['chamado_categoria'];
export type ChamadoStatus = Enums['chamado_status'];
export type OcorrenciaCategoria = Enums['ocorrencia_categoria'];
export type OcorrenciaStatus = Enums['ocorrencia_status'];
export type Prioridade = Enums['prioridade'];

// Financeiro
export type TaxaTipo = Enums['taxa_tipo'];
export type CobrancaStatus = Enums['cobranca_status'];
export type LancamentoTipo = Enums['lancamento_tipo'];
export type LancamentoStatus = Enums['lancamento_status'];
export type CategoriaTipo = Enums['categoria_tipo'];
export type PrestacaoStatus = Enums['prestacao_status'];

// Unidades
export type UnidadeTipo = Enums['unidade_tipo'];

// Sistema
export type TierType = Enums['tier_type'];
export type AtaStatus = Enums['ata_status'];

// Integrações
export type IntegracaoTipo = Enums['integracao_tipo'];
export type IntegracaoStatus = Enums['integracao_status'];
export type IntegracaoAmbiente = Enums['integracao_ambiente'];
export type ConectorTipo = Enums['conector_tipo'];
export type WebhookEvento = Enums['webhook_evento'];
export type WebhookEntregaStatus = Enums['webhook_entrega_status'];

// ============================================
// TIPOS DE LINHA (ROW) - Estado completo do banco
// ============================================

export type Usuario = Tables['usuarios']['Row'];
export type Condominio = Tables['condominios']['Row'];
export type UnidadeHabitacional = Tables['unidades_habitacionais']['Row'];
export type Bloco = Tables['blocos']['Row'];

// Assembleias
export type Assembleia = Tables['assembleias']['Row'];
export type Pauta = Tables['assembleia_pautas']['Row'];
export type PautaOpcao = Tables['assembleia_pauta_opcoes']['Row'];
export type Presenca = Tables['assembleia_presencas']['Row'];
export type Voto = Tables['assembleia_votos']['Row'];
export type Procuracao = Tables['assembleia_procuracoes']['Row'];
export type AssembleiaLog = Tables['assembleia_logs']['Row'];
export type AssembleiaAssinatura = Tables['assembleia_assinaturas']['Row'];

// Comunicação
export type Comunicado = Tables['comunicados']['Row'];
export type ComunicadoLeitura = Tables['comunicados_leitura']['Row'];
export type Notificacao = Tables['notificacoes']['Row'];
export type NotificacaoEntrega = Tables['notificacoes_entregas']['Row'];
export type NotificacaoLeitura = Tables['notificacoes_leituras']['Row'];
export type NotificacaoConfig = Tables['notificacoes_config']['Row'];
export type TemplateNotificacao = Tables['templates_notificacao']['Row'];

// Operacional
export type Chamado = Tables['chamados']['Row'];
export type ChamadoMensagem = Tables['chamados_mensagens']['Row'];
export type Ocorrencia = Tables['ocorrencias']['Row'];
export type OcorrenciaHistorico = Tables['ocorrencias_historico']['Row'];
export type FAQ = Tables['faq']['Row'];
export type FAQVoto = Tables['faq_votos']['Row'];

// Financeiro
export type TaxaUnidade = Tables['taxas_unidades']['Row'];
export type LancamentoFinanceiro = Tables['lancamentos_financeiros']['Row'];
export type CategoriaFinanceira = Tables['categorias_financeiras']['Row'];
export type ContaBancaria = Tables['contas_bancarias']['Row'];
export type ContaBancariaHistorico = Tables['contas_bancarias_historico']['Row'];
export type ConfiguracoesFinanceiras = Tables['configuracoes_financeiras']['Row'];
export type PrestacaoContas = Tables['prestacao_contas']['Row'];

// Sistema
export type AuditLog = Tables['audit_logs']['Row'];
export type ApiRequestLog = Tables['api_request_logs']['Row'];
export type AlertaSistema = Tables['alertas_sistema']['Row'];
export type AtaValidacao = Tables['atas_validacao']['Row'];

// Integrações
export type Integracao = Tables['integracoes']['Row'];
export type ApiScope = Tables['api_scopes']['Row'];
export type ApiLog = Tables['api_logs']['Row'];
export type WebhookConfig = Tables['webhooks_config']['Row'];
export type WebhookEntrega = Tables['webhooks_entregas']['Row'];
export type Conector = Tables['conectores']['Row'];
export type SyncLog = Tables['sync_logs']['Row'];
export interface CreateWebhookInput {
  nome: string;
  url_destino: string;
  eventos: WebhookEvento[];
  headers_custom?: Record<string, string>;
}

// ============================================
// TIPOS DE INSERT - Para criar novos registros
// ============================================

export type UsuarioInsert = Tables['usuarios']['Insert'];
export type CondominioInsert = Tables['condominios']['Insert'];
export type UnidadeHabitacionalInsert = Tables['unidades_habitacionais']['Insert'];
export type AssembleiaInsert = Tables['assembleias']['Insert'];
export type PautaInsert = Tables['assembleia_pautas']['Insert'];
export type ChamadoInsert = Tables['chamados']['Insert'];
export type ChamadoMensagemInsert = Tables['chamados_mensagens']['Insert'];
export type ComunicadoInsert = Tables['comunicados']['Insert'];
export type OcorrenciaInsert = Tables['ocorrencias']['Insert'];

// ============================================
// TIPOS DE UPDATE - Para atualizar registros
// ============================================

export type UsuarioUpdate = Tables['usuarios']['Update'];
export type CondominioUpdate = Tables['condominios']['Update'];
export type AssembleiaUpdate = Tables['assembleias']['Update'];
export type PautaUpdate = Tables['assembleia_pautas']['Update'];
export type ChamadoUpdate = Tables['chamados']['Update'];
export type ComunicadoUpdate = Tables['comunicados']['Update'];
export type OcorrenciaUpdate = Tables['ocorrencias']['Update'];

// ============================================
// TIPOS ESTENDIDOS (COM JOINS)
// ============================================

/**
 * Usuário com informações de condomínio e unidade
 */
export interface UsuarioComJoins extends Usuario {
  condominio?: Pick<Condominio, 'id' | 'nome' | 'logo_url'>;
  unidade?: Pick<UnidadeHabitacional, 'id' | 'numero' | 'bloco_id'>;
}

/**
 * Assembleia com pautas, presenças e quorum
 */
export interface AssembleiaComJoins extends Assembleia {
  criador?: Pick<Usuario, 'id' | 'nome' | 'avatar_url'>;
  pautas?: PautaComJoins[];
  presencas?: PresencaComJoins[];
  assinaturas?: AssembleiaAssinatura[];
  quorum?: QuorumInfo | null; // Compatibilidade com useAssembleias
  quorum_info?: QuorumInfo;
}

/**
 * Pauta com opções e votos
 */
export interface PautaComJoins extends Omit<Pauta, 'resultado'> {
  opcoes?: PautaOpcao[];
  votos?: Voto[];
  resultado?: ResultadoPauta | null;
}

/**
 * Presença com usuário e unidade
 */
export interface PresencaComJoins extends Presenca {
  usuario?: Pick<Usuario, 'id' | 'nome' | 'avatar_url'>;
  unidade?: Pick<UnidadeHabitacional, 'id' | 'numero'>;
  representante?: Pick<Usuario, 'id' | 'nome'>;
}

/**
 * Chamado com solicitante, atendente e mensagens
 */
export interface ChamadoComJoins extends Chamado {
  solicitante?: Pick<Usuario, 'nome' | 'avatar_url' | 'email'>;
  atendente?: Pick<Usuario, 'nome'>;
  mensagens?: ChamadoMensagemComJoins[];
  total_mensagens?: number;
}

/**
 * Mensagem de chamado com autor
 */
export interface ChamadoMensagemComJoins extends ChamadoMensagem {
  autor?: Pick<Usuario, 'nome' | 'avatar_url'>;
}

/**
 * Comunicado com autor e leituras
 */
export interface ComunicadoComJoins extends Comunicado {
  autor?: Pick<Usuario, 'nome' | 'avatar_url' | 'email'>;
  lido?: boolean;
  total_leituras?: number;
}

/**
 * Ocorrência com reportador e responsável
 */
export interface OcorrenciaComJoins extends Ocorrencia {
  reportado_por_info?: Pick<Usuario, 'nome' | 'avatar_url'>;
  responsavel?: Pick<Usuario, 'nome' | 'avatar_url'>;
  resolvido_por_info?: Pick<Usuario, 'nome'>;
  unidade_relacionada?: Pick<UnidadeHabitacional, 'numero'>;
}

// ============================================
// TIPOS AUXILIARES
// ============================================

/**
 * Tipo JSON padrão do Supabase
 */
export type Json = Database['public']['Tables']['chamados']['Row']['anexos'];

/**
 * Estrutura de anexo (armazenado como JSON no banco)
 */
export interface Anexo {
  url: string;
  nome: string;
  tipo: string;
  tamanho: number;
  uploaded_at?: string;
}

/**
 * Informações de quorum da assembleia (view v_assembleia_quorum)
 */
export interface QuorumInfo {
  assembleia_id: string | null;
  condominio_id: string | null;
  status: AssembleiaStatus | null;
  total_fracoes: number | null;
  fracoes_presentes: number | null;
  fracao_presente: number | null;
  quorum_percentual: number | null;
  quorum_minimo_primeira: number | null;
  quorum_minimo_segunda: number | null;
  unidades_presentes: number | null;
  total_unidades: number | null;
  presenciais: number | null;
  online: number | null;
  procuracoes: number | null;
  votos_antecipados: number | null;
  quorum_atingido?: boolean; // Computed field
}

/**
 * Resultado da votação de uma pauta
 */
export interface ResultadoPauta {
  total_votos: number;
  votos_sim: number;
  votos_nao: number;
  votos_abstencao: number;
  fracao_sim: number;
  fracao_nao: number;
  fracao_abstencao: number;
  percentual_aprovacao: number;
  aprovada: boolean;
  eleitos?: { opcao_id: string; titulo: string; votos: number; fracoes?: number }[];
}

/**
 * Estatísticas de chamados
 */
export interface ChamadoStats {
  total: number;
  novos: number;
  em_atendimento: number;
  resolvidos: number;
  por_categoria: Record<string, number>;
  avaliacao_media: number | null;
  tempo_medio_resolucao_horas: number | null;
}

/**
 * Resposta paginada genérica
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Filtros de busca genéricos
 */
export interface BaseFilters {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  busca?: string;
}

/**
 * Filtros específicos para chamados
 */
export interface ChamadoFilters extends BaseFilters {
  status?: ChamadoStatus;
  categoria?: ChamadoCategoria;
  prioridade?: Prioridade;
  atendente_id?: string;
  solicitante_id?: string;
}

/**
 * Filtros específicos para comunicados
 */
export interface ComunicadoFilters extends BaseFilters {
  status?: ComunicadoStatus;
  categoria?: ComunicadoCategoria;
  fixado?: boolean;
  destaque?: boolean;
}

/**
 * Filtros específicos para ocorrências
 */
export interface OcorrenciaFilters extends BaseFilters {
  status?: OcorrenciaStatus;
  categoria?: OcorrenciaCategoria;
  prioridade?: Prioridade;
  responsavel_id?: string;
  reportado_por?: string;
}

/**
 * Filtros específicos para assembleias
 */
export interface AssembleiaFilters extends BaseFilters {
  tipo?: AssembleiaTipo;
  status?: AssembleiaStatus;
  ano_referencia?: number;
}

/**
 * FAQ Input/Filter Types
 */
export interface CreateFAQInput {
  pergunta: string;
  resposta: string;
  categoria?: string;
  ordem?: number;
  ativo?: boolean;
  destaque?: boolean;
}

export interface UpdateFAQInput extends Partial<CreateFAQInput> {
  id: string;
}

export interface FAQFilters extends BaseFilters {
  categoria?: string;
  ativo?: boolean;
  destaque?: boolean;
  tags?: string[];
}

/**
 * Feature Flags
 */
export type FeatureFlag = Tables['feature_flags']['Row'];
