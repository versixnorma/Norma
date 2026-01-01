// ============================================
// VERSIX NORMA - TIPOS MÓDULO ASSEMBLEIAS
// Sprint 6: Democracia Digital
// ============================================

// ENUMs
export type AssembleiaTipo = 'AGO' | 'AGE' | 'permanente';
export type AssembleiaStatus = 'rascunho' | 'convocada' | 'em_andamento' | 'votacao' | 'encerrada' | 'arquivada';
export type PautaTipoVotacao = 'aprovacao' | 'escolha_unica' | 'escolha_multipla' | 'eleicao' | 'informativo';
export type PautaStatus = 'pendente' | 'em_votacao' | 'encerrada' | 'aprovada' | 'rejeitada' | 'sem_quorum';
export type QuorumEspecial = 'maioria_simples' | 'maioria_absoluta' | 'dois_tercos' | 'unanimidade';
export type PresencaTipo = 'presencial' | 'online' | 'procuracao' | 'voto_antecipado';
export type AssinaturaTipo = 'presidente' | 'secretario' | 'sindico' | 'testemunha';
export type ComentarioTipo = 'comentario' | 'pergunta' | 'resposta' | 'moderacao';

// ============================================
// ASSEMBLEIA
// ============================================
export interface Assembleia {
  id: string;
  condominio_id: string;
  tipo: AssembleiaTipo;
  titulo: string;
  descricao: string | null;
  numero_sequencial: number | null;
  ano_referencia: number;
  data_primeira_convocacao: string | null;
  data_segunda_convocacao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  permite_voto_antecipado: boolean;
  data_limite_voto_antecipado: string | null;
  permite_procuracao: boolean;
  max_procuracoes_por_pessoa: number;
  quorum_minimo_primeira: number;
  quorum_minimo_segunda: number;
  quorum_atingido: number | null;
  local_presencial: string | null;
  endereco_presencial: string | null;
  link_video: string | null;
  codigo_acesso_video: string | null;
  qr_token: string | null;
  status: AssembleiaStatus;
  ata_texto: string | null;
  ata_pdf_path: string | null;
  ata_hash: string | null;
  ata_assinada?: boolean;
  observacoes_internas: string | null;
  notificacao_convocacao_enviada?: boolean;
  notificacao_lembrete_enviada?: boolean;
  notificacao_resultado_enviada?: boolean;
  metadata?: Record<string, unknown> | null;
  criado_por: string | null;
  convocada_em: string | null;
  iniciada_em: string | null;
  created_at: string;
  updated_at: string;
  encerrada_em: string | null;
  arquivada_em: string | null;
  // Joins
  pautas?: Pauta[];
  presencas?: Presenca[];
  quorum?: QuorumInfo;
}

export interface CreateAssembleiaInput {
  tipo: AssembleiaTipo;
  titulo: string;
  descricao?: string;
  data_primeira_convocacao?: string;
  data_segunda_convocacao?: string;
  permite_voto_antecipado?: boolean;
  data_limite_voto_antecipado?: string;
  permite_procuracao?: boolean;
  max_procuracoes_por_pessoa?: number;
  quorum_minimo_primeira?: number;
  quorum_minimo_segunda?: number;
  local_presencial?: string;
  link_video?: string;
}

export interface UpdateAssembleiaInput extends Partial<CreateAssembleiaInput> {
  id: string;
  status?: AssembleiaStatus;
  ata_texto?: string;
}

// ============================================
// PAUTA
// ============================================
export interface Pauta {
  id: string;
  assembleia_id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  tipo_votacao: PautaTipoVotacao;
  voto_secreto: boolean;
  quorum_especial: QuorumEspecial | null;
  permite_abstencao: boolean;
  cargo: string | null;
  max_eleitos: number | null;
  bloqueia_inadimplentes: boolean;
  status: PautaStatus;
  resultado: PautaResultado | null;
  created_at: string;
  updated_at: string;
  // Joins
  opcoes?: PautaOpcao[];
  votos?: Voto[];
  comentarios?: Comentario[];
}

export interface PautaResultado {
  votos_sim?: number;
  votos_nao?: number;
  abstencoes?: number;
  fracoes_sim?: number;
  fracoes_nao?: number;
  percentual_aprovacao?: number;
  eleitos?: { opcao_id: string; titulo: string; votos: number; fracoes: number }[];
}

export interface CreatePautaInput {
  ordem: number;
  titulo: string;
  descricao?: string;
  tipo_votacao?: PautaTipoVotacao;
  voto_secreto?: boolean;
  quorum_especial?: QuorumEspecial;
  permite_abstencao?: boolean;
  cargo?: string;
  max_eleitos?: number;
  bloqueia_inadimplentes?: boolean;
}

export interface UpdatePautaInput extends Partial<CreatePautaInput> {
  id: string;
  status?: PautaStatus;
}

// ============================================
// PAUTA OPÇÃO
// ============================================
export interface PautaOpcao {
  id: string;
  pauta_id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  candidato_id: string | null;
  votos_count: number;
  votos_fracao: number;
  created_at: string;
  // Joins
  candidato?: { nome: string; avatar_url?: string };
}

export interface CreatePautaOpcaoInput {
  ordem: number;
  titulo: string;
  descricao?: string;
  candidato_id?: string;
}

// ============================================
// PRESENÇA
// ============================================
export interface Presenca {
  id: string;
  assembleia_id: string;
  usuario_id: string;
  unidade_id: string;
  tipo: PresencaTipo;
  representante_id: string | null;
  procuracao_path: string | null;
  fracao_ideal: number;
  check_in_at: string;
  check_out_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  // Joins
  usuario?: { nome: string; avatar_url?: string };
  unidade?: { numero: string; bloco?: { nome: string } };
  unidades_habitacionais?: { numero: string; blocos?: { nome: string } };
  representante?: { nome: string };
}

// ============================================
// VOTO
// ============================================
export interface Voto {
  id: string;
  pauta_id: string;
  presenca_id: string;
  opcao_id: string | null;
  voto: 'sim' | 'nao' | 'abstencao' | 'opcao';
  fracao_ideal: number;
  usuario_id: string | null;
  unidade_id: string | null;
  voto_hash: string | null;
  votado_em: string;
  ip_address: string | null;
  // Joins (se não for voto secreto)
  usuario?: { nome: string };
  unidade?: { numero: string };
}

export interface VotarInput {
  pauta_id: string;
  presenca_id: string;
  voto: 'sim' | 'nao' | 'abstencao' | 'opcao';
  opcao_id?: string;
}

// ============================================
// COMENTÁRIO
// ============================================
export interface Comentario {
  id: string;
  pauta_id: string;
  usuario_id: string;
  conteudo: string;
  tipo: ComentarioTipo;
  parent_id: string | null;
  visivel: boolean;
  moderado_por: string | null;
  moderado_em: string | null;
  motivo_moderacao: string | null;
  created_at: string;
  // Joins
  usuario?: { nome: string; avatar_url?: string };
  respostas?: Comentario[];
}

export interface CreateComentarioInput {
  pauta_id: string;
  conteudo: string;
  tipo?: ComentarioTipo;
  parent_id?: string;
}

// ============================================
// ASSINATURA
// ============================================
export interface Assinatura {
  id: string;
  assembleia_id: string;
  usuario_id: string;
  tipo: AssinaturaTipo;
  assinatura_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  assinado_em: string;
  // Joins
  usuario?: { nome: string };
}

export interface AssinarInput {
  assembleia_id: string;
  tipo: AssinaturaTipo;
}

// ============================================
// QUORUM
// ============================================
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
}

// ============================================
// FILTROS
// ============================================
export interface AssembleiaFilters {
  tipo?: AssembleiaTipo;
  status?: AssembleiaStatus;
  ano?: number;
}
