/**
 * VERSIX NORMA - Database Types
 *
 * Tipos preliminares do schema.
 * Execute `pnpm supabase:gen-types` para gerar tipos completos do Supabase.
 */

// ===== JSON Type =====
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ===== Enums =====
export type TierType = 'starter' | 'professional' | 'enterprise';

export type UserRole =
  | 'superadmin'
  | 'admin_condo'
  | 'sindico'
  | 'subsindico'
  | 'conselheiro'
  | 'morador'
  | 'proprietario'
  | 'inquilino'
  | 'porteiro'
  | 'zelador';

export type UserStatus = 'pending' | 'active' | 'inactive' | 'suspended' | 'removed';

export type TipoResidente =
  | 'proprietario_residente'
  | 'proprietario_externo'
  | 'inquilino'
  | 'dependente'
  | 'funcionario';

export type UnidadeTipo =
  | 'apartamento'
  | 'casa'
  | 'cobertura'
  | 'sala_comercial'
  | 'loja'
  | 'garagem'
  | 'deposito';

export type AtaStatus = 'rascunho' | 'pendente_validacao' | 'validada' | 'rejeitada' | 'arquivada';

export type ComunicadoCategoria =
  | 'geral'
  | 'manutencao'
  | 'financeiro'
  | 'seguranca'
  | 'evento'
  | 'urgente'
  | 'obras'
  | 'assembleia';

export type Prioridade = 'baixa' | 'media' | 'alta' | 'urgente';

// ===== Table Types =====
export interface Condominio {
  id: string;
  nome: string;
  cnpj: string | null;
  endereco: string;
  numero: string | null;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  tier: TierType;
  total_unidades: number;
  codigo_convite: string;
  telefone: string | null;
  email: string | null;
  logo_url: string | null;
  cor_primaria: string;
  ativo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Bloco {
  id: string;
  condominio_id: string;
  nome: string;
  descricao: string | null;
  andares: number | null;
  unidades_por_andar: number | null;
  created_at: string;
  updated_at: string;
}

export interface UnidadeHabitacional {
  id: string;
  condominio_id: string;
  bloco_id: string | null;
  numero: string;
  andar: number | null;
  tipo: UnidadeTipo;
  area_m2: number | null;
  fracao_ideal: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Usuario {
  id: string;
  auth_id: string | null;
  condominio_id: string | null;
  unidade_id: string | null;
  nome: string;
  email: string;
  cpf: string | null;
  telefone: string | null;
  avatar_url: string | null;
  data_nascimento: string | null;
  role: UserRole;
  status: UserStatus;
  tipo_residente: TipoResidente | null;
  notificacoes_email: boolean;
  notificacoes_push: boolean;
  notificacoes_whatsapp: boolean;
  ultimo_acesso: string | null;
  deleted_at: string | null;
  deleted_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comunicado {
  id: string;
  condominio_id: string;
  autor_id: string;
  titulo: string;
  conteudo: string;
  categoria: ComunicadoCategoria;
  prioridade: Prioridade;
  anexos: Json;
  publicado: boolean;
  data_publicacao: string | null;
  data_expiracao: string | null;
  fixado: boolean;
  destinatarios_blocos: string[] | null;
  destinatarios_unidades: string[] | null;
  visualizacoes: number;
  created_at: string;
  updated_at: string;
}

export interface AtaValidacao {
  id: string;
  condominio_id: string;
  titulo: string;
  conteudo: string;
  tipo: string;
  status: AtaStatus;
  validado_por: string | null;
  validado_em: string | null;
  motivo_rejeicao: string | null;
  arquivo_url: string | null;
  hash_documento: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface AuditLog {
  id: string;
  usuario_id: string | null;
  condominio_id: string | null;
  acao: string;
  tabela: string;
  registro_id: string | null;
  dados_antes: Json | null;
  dados_depois: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface SessaoImpersonate {
  id: string;
  superadmin_id: string;
  usuario_alvo_id: string;
  motivo: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export interface FeatureFlag {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  escopo: 'global' | 'tier' | 'condominio';
  tiers_habilitados: TierType[] | null;
  condominios_habilitados: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface RateLimit {
  id: string;
  identifier: string;
  endpoint: string;
  requests: number;
  window_start: string;
}

// ===== MÓDULOS OPERACIONAIS =====

export type OcorrenciaStatus = 'aberta' | 'em_analise' | 'em_andamento' | 'resolvida' | 'arquivada';
export type OcorrenciaCategoria =
  | 'barulho'
  | 'vazamento'
  | 'iluminacao'
  | 'limpeza'
  | 'seguranca'
  | 'area_comum'
  | 'elevador'
  | 'portaria'
  | 'animais'
  | 'estacionamento'
  | 'outros';

export type ChamadoStatus =
  | 'novo'
  | 'em_atendimento'
  | 'aguardando_resposta'
  | 'resolvido'
  | 'fechado';
export type ChamadoCategoria =
  | 'segunda_via_boleto'
  | 'atualizacao_cadastro'
  | 'reserva_espaco'
  | 'autorizacao_obra'
  | 'mudanca'
  | 'reclamacao'
  | 'sugestao'
  | 'duvida'
  | 'outros';

export type ComunicadoStatusEnum = 'rascunho' | 'publicado' | 'arquivado';

export interface Ocorrencia {
  id: string;
  condominio_id: string;
  reportado_por: string;
  anonimo: boolean;
  unidade_relacionada_id: string | null;
  local_descricao: string | null;
  titulo: string;
  descricao: string;
  categoria: OcorrenciaCategoria;
  prioridade: Prioridade;
  status: OcorrenciaStatus;
  responsavel_id: string | null;
  resolucao: string | null;
  resolvido_em: string | null;
  resolvido_por: string | null;
  anexos: Json;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OcorrenciaHistorico {
  id: string;
  ocorrencia_id: string;
  usuario_id: string | null;
  status_anterior: OcorrenciaStatus | null;
  status_novo: OcorrenciaStatus;
  comentario: string | null;
  created_at: string;
}

export interface Chamado {
  id: string;
  condominio_id: string;
  solicitante_id: string;
  titulo: string;
  descricao: string;
  categoria: ChamadoCategoria;
  prioridade: Prioridade;
  status: ChamadoStatus;
  atendente_id: string | null;
  resposta_final: string | null;
  resolvido_em: string | null;
  avaliacao_nota: number | null;
  avaliacao_comentario: string | null;
  avaliado_em: string | null;
  anexos: Json;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ChamadoMensagem {
  id: string;
  chamado_id: string;
  autor_id: string;
  mensagem: string;
  anexos: Json;
  interno: boolean;
  created_at: string;
}

export interface Faq {
  id: string;
  condominio_id: string;
  pergunta: string;
  resposta: string;
  categoria: string;
  ordem: number;
  ativo: boolean;
  destaque: boolean;
  visualizacoes: number;
  votos_util: number;
  votos_inutil: number;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FaqVoto {
  id: string;
  faq_id: string;
  usuario_id: string;
  util: boolean;
  created_at: string;
}

export interface ComunicadoLeitura {
  id: string;
  comunicado_id: string;
  usuario_id: string;
  lido_em: string;
}

// ===== Database Schema (Supabase format) =====
export interface Database {
  public: {
    Tables: {
      condominios: {
        Row: Condominio;
        Insert: Omit<Condominio, 'id' | 'created_at' | 'updated_at' | 'codigo_convite'>;
        Update: Partial<Omit<Condominio, 'id' | 'created_at'>>;
      };
      blocos: {
        Row: Bloco;
        Insert: Omit<Bloco, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Bloco, 'id' | 'created_at'>>;
      };
      unidades_habitacionais: {
        Row: UnidadeHabitacional;
        Insert: Omit<UnidadeHabitacional, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UnidadeHabitacional, 'id' | 'created_at'>>;
      };
      usuarios: {
        Row: Usuario;
        Insert: Omit<Usuario, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Usuario, 'id' | 'created_at'>>;
      };
      comunicados: {
        Row: Comunicado;
        Insert: Omit<Comunicado, 'id' | 'created_at' | 'updated_at' | 'visualizacoes'>;
        Update: Partial<Omit<Comunicado, 'id' | 'created_at'>>;
      };
      atas_validacao: {
        Row: AtaValidacao;
        Insert: Omit<AtaValidacao, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AtaValidacao, 'id' | 'created_at'>>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'>;
        Update: never; // Imutável
      };
      sessoes_impersonate: {
        Row: SessaoImpersonate;
        Insert: Omit<SessaoImpersonate, 'id' | 'created_at' | 'expires_at'>;
        Update: Pick<SessaoImpersonate, 'revoked_at'>;
      };
      feature_flags: {
        Row: FeatureFlag;
        Insert: Omit<FeatureFlag, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<FeatureFlag, 'id' | 'created_at'>>;
      };
      rate_limits: {
        Row: RateLimit;
        Insert: Omit<RateLimit, 'id'>;
        Update: Partial<Omit<RateLimit, 'id'>>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_superadmin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_sindico: {
        Args: { p_condominio_id?: string };
        Returns: boolean;
      };
      get_user_condominio_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      get_user_role: {
        Args: Record<string, never>;
        Returns: UserRole | null;
      };
      check_feature_flag: {
        Args: { p_nome: string; p_condominio_id?: string };
        Returns: boolean;
      };
      soft_delete_usuario: {
        Args: { p_usuario_id: string; p_motivo?: string };
        Returns: boolean;
      };
      soft_delete_condominio: {
        Args: { p_condominio_id: string };
        Returns: boolean;
      };
      regenerate_invite_code: {
        Args: { p_condominio_id: string };
        Returns: string;
      };
    };
    Enums: {
      tier_type: TierType;
      user_role: UserRole;
      user_status: UserStatus;
      tipo_residente: TipoResidente;
      unidade_tipo: UnidadeTipo;
      ata_status: AtaStatus;
      comunicado_categoria: ComunicadoCategoria;
      prioridade: Prioridade;
    };
  };
}
