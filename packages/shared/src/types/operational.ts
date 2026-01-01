// ============================================
// VERSIX NORMA - TIPOS MÓDULOS OPERACIONAIS
// Sprint 3: Comunicados, Ocorrências, Chamados, FAQ
// ============================================

// ============================================
// ENUMS
// ============================================

export type ComunicadoStatus = 'rascunho' | 'publicado' | 'arquivado';
export type ComunicadoCategoria = 'geral' | 'manutencao' | 'financeiro' | 'seguranca' | 'evento' | 'urgente' | 'obras' | 'assembleia';
export type OcorrenciaStatus = 'aberta' | 'em_analise' | 'em_andamento' | 'resolvida' | 'arquivada';
export type OcorrenciaCategoria = 'barulho' | 'vazamento' | 'iluminacao' | 'limpeza' | 'seguranca' | 'area_comum' | 'elevador' | 'portaria' | 'animais' | 'estacionamento' | 'outros';
export type Prioridade = 'baixa' | 'media' | 'alta' | 'urgente';
export type ChamadoStatus = 'novo' | 'em_atendimento' | 'aguardando_resposta' | 'resolvido' | 'fechado';
export type ChamadoCategoria = 'segunda_via_boleto' | 'atualizacao_cadastro' | 'reserva_espaco' | 'autorizacao_obra' | 'mudanca' | 'reclamacao' | 'sugestao' | 'duvida' | 'outros';

// ============================================
// ANEXO (comum para todos os módulos)
// ============================================

export interface Anexo {
  url: string;
  nome: string;
  tipo: string;
  tamanho: number;
  uploaded_at?: string;
}

// ============================================
// COMUNICADOS
// ============================================

export interface Comunicado {
  id: string;
  condominio_id: string;
  autor_id: string;
  titulo: string;
  conteudo: string;
  resumo: string | null;
  categoria: ComunicadoCategoria;
  status: ComunicadoStatus;
  fixado: boolean;
  destaque: boolean;
  publicar_em: string | null;
  expirar_em: string | null;
  anexos: Anexo[];
  visualizacoes: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  deleted_at: string | null;
  // Joins
  autor?: { nome: string; avatar_url: string | null };
  lido?: boolean;
  total_leituras?: number;
}

export interface ComunicadoLeitura {
  id: string;
  comunicado_id: string;
  usuario_id: string;
  lido_em: string;
  usuario?: { nome: string };
}

export interface CreateComunicadoInput {
  titulo: string;
  conteudo: string;
  resumo?: string;
  categoria?: ComunicadoCategoria;
  fixado?: boolean;
  destaque?: boolean;
  publicar_em?: string;
  expirar_em?: string;
  anexos?: Anexo[];
  status?: ComunicadoStatus;
}

export interface UpdateComunicadoInput extends Partial<CreateComunicadoInput> {
  id: string;
}

// ============================================
// OCORRÊNCIAS
// ============================================

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
  anexos: Anexo[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joins
  reportado_por_usuario?: { nome: string; avatar_url: string | null };
  responsavel?: { nome: string };
  unidade?: { identificador: string; bloco?: { nome: string } };
  historico?: OcorrenciaHistorico[];
}

export interface OcorrenciaHistorico {
  id: string;
  ocorrencia_id: string;
  usuario_id: string | null;
  status_anterior: OcorrenciaStatus | null;
  status_novo: OcorrenciaStatus;
  comentario: string | null;
  created_at: string;
  usuario?: { nome: string };
}

export interface CreateOcorrenciaInput {
  titulo: string;
  descricao: string;
  categoria?: OcorrenciaCategoria;
  prioridade?: Prioridade;
  anonimo?: boolean;
  unidade_relacionada_id?: string;
  local_descricao?: string;
  anexos?: Anexo[];
}

export interface UpdateOcorrenciaInput {
  id: string;
  status?: OcorrenciaStatus;
  responsavel_id?: string | null;
  resolucao?: string;
  prioridade?: Prioridade;
}

// ============================================
// CHAMADOS
// ============================================

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
  anexos: Anexo[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joins
  solicitante?: { nome: string; avatar_url: string | null; email: string };
  atendente?: { nome: string };
  mensagens?: ChamadoMensagem[];
  total_mensagens?: number;
}

export interface ChamadoMensagem {
  id: string;
  chamado_id: string;
  autor_id: string;
  mensagem: string;
  anexos: Anexo[];
  created_at: string;
  editado_em: string | null;
  deleted_at: string | null;
  autor?: { nome: string; avatar_url: string | null };
  is_sindico?: boolean;
}

export interface CreateChamadoInput {
  titulo: string;
  descricao: string;
  categoria?: ChamadoCategoria;
  prioridade?: Prioridade;
  anexos?: Anexo[];
}

export interface UpdateChamadoInput {
  id: string;
  status?: ChamadoStatus;
  atendente_id?: string | null;
  resposta_final?: string;
  prioridade?: Prioridade;
}

export interface CreateMensagemInput {
  chamado_id: string;
  mensagem: string;
  anexos?: Anexo[];
}

export interface AvaliarChamadoInput {
  id: string;
  avaliacao_nota: number;
  avaliacao_comentario?: string;
}

// ============================================
// FAQ
// ============================================

export interface FAQ {
  id: string;
  condominio_id: string;
  pergunta: string;
  resposta: string;
  categoria: string | null;
  tags: string[];
  ordem: number;
  destaque: boolean;
  ativo: boolean;
  visualizacoes: number;
  util_sim: number;
  util_nao: number;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Computed
  utilidade_percentual?: number;
}

export interface CreateFAQInput {
  pergunta: string;
  resposta: string;
  categoria?: string;
  tags?: string[];
  ordem?: number;
  destaque?: boolean;
}

export interface UpdateFAQInput extends Partial<CreateFAQInput> {
  id: string;
  ativo?: boolean;
}

// ============================================
// PAGINAÇÃO
// ============================================

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

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

// ============================================
// FILTROS
// ============================================

export interface ComunicadoFilters extends PaginationParams {
  status?: ComunicadoStatus;
  categoria?: ComunicadoCategoria;
  fixado?: boolean;
  busca?: string;
}

export interface OcorrenciaFilters extends PaginationParams {
  status?: OcorrenciaStatus;
  categoria?: OcorrenciaCategoria;
  prioridade?: Prioridade;
  responsavel_id?: string;
  minhas?: boolean;
  busca?: string;
}

export interface ChamadoFilters extends PaginationParams {
  status?: ChamadoStatus;
  categoria?: ChamadoCategoria;
  prioridade?: Prioridade;
  atendente_id?: string;
  solicitante_id?: string;
  meus?: boolean;
  busca?: string;
}

export interface FAQFilters extends PaginationParams {
  categoria?: string;
  tags?: string[];
  destaque?: boolean;
  busca?: string;
}

// ============================================
// ESTATÍSTICAS
// ============================================

export interface ComunicadoStats {
  total: number;
  publicados: number;
  rascunhos: number;
  arquivados: number;
  total_visualizacoes: number;
  por_categoria: Record<ComunicadoCategoria, number>;
}

export interface OcorrenciaStats {
  total: number;
  abertas: number;
  em_andamento: number;
  resolvidas: number;
  por_categoria: Record<OcorrenciaCategoria, number>;
  por_prioridade: Record<Prioridade, number>;
  tempo_medio_resolucao_horas: number | null;
}

export interface ChamadoStats {
  total: number;
  novos: number;
  em_atendimento: number;
  resolvidos: number;
  por_categoria: Record<ChamadoCategoria, number>;
  avaliacao_media: number | null;
  tempo_medio_resolucao_horas: number | null;
}
