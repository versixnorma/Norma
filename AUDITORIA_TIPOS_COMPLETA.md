# AUDITORIA DE TIPOS - Versix Norma

Data: Thu Jan 1 20:14:10 UTC 2026

## 📋 TABELAS ENCONTRADAS NO BANCO DE DADOS

### Arquivo: 20240101000002_create_core_tables.sql

CREATE TABLE public.condominios (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
nome VARCHAR(255) NOT NULL,
cnpj VARCHAR(18) UNIQUE,
endereco TEXT NOT NULL,
numero VARCHAR(20),
complemento VARCHAR(100),
bairro VARCHAR(100) NOT NULL,
cidade VARCHAR(100) NOT NULL,
estado CHAR(2) NOT NULL,
cep VARCHAR(9) NOT NULL,
tier public.tier_type NOT NULL DEFAULT 'starter',
total_unidades INTEGER NOT NULL CHECK (total_unidades > 0),
codigo_convite VARCHAR(8) NOT NULL UNIQUE DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
telefone VARCHAR(20),
email VARCHAR(255),
logo_url TEXT,
cor_primaria VARCHAR(7) DEFAULT '#3B82F6',
ativo BOOLEAN NOT NULL DEFAULT true,
deleted_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
created_by UUID
CREATE TABLE public.blocos (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
nome VARCHAR(50) NOT NULL,
descricao TEXT,
andares INTEGER,
unidades_por_andar INTEGER,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
CONSTRAINT uq_bloco_condominio UNIQUE (condominio_id, nome)
CREATE TABLE public.unidades_habitacionais (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
bloco_id UUID REFERENCES public.blocos(id) ON DELETE SET NULL,
numero VARCHAR(20) NOT NULL,
andar INTEGER,
tipo public.unidade_tipo NOT NULL DEFAULT 'apartamento',
area_m2 DECIMAL(10,2),
fracao_ideal DECIMAL(10,8),
ativo BOOLEAN NOT NULL DEFAULT true,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
CONSTRAINT uq_unidade_condominio UNIQUE (condominio_id, bloco_id, numero)
CREATE TABLE public.usuarios (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
condominio_id UUID REFERENCES public.condominios(id) ON DELETE SET NULL,
unidade_id UUID REFERENCES public.unidades_habitacionais(id) ON DELETE SET NULL,
nome VARCHAR(255) NOT NULL,
email VARCHAR(255) NOT NULL,
cpf VARCHAR(14) UNIQUE,
telefone VARCHAR(20),
avatar_url TEXT,
data_nascimento DATE,
role public.user_role NOT NULL DEFAULT 'morador',
status public.user_status NOT NULL DEFAULT 'pending',
tipo_residente public.tipo_residente,
notificacoes_email BOOLEAN NOT NULL DEFAULT true,
notificacoes_push BOOLEAN NOT NULL DEFAULT true,
notificacoes_whatsapp BOOLEAN NOT NULL DEFAULT false,
ultimo_acesso TIMESTAMPTZ,
deleted_at TIMESTAMPTZ,
deleted_reason TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
CREATE TABLE public.comunicados (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
autor_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
titulo VARCHAR(255) NOT NULL,
conteudo TEXT NOT NULL,
categoria public.comunicado_categoria NOT NULL DEFAULT 'geral',
prioridade public.prioridade NOT NULL DEFAULT 'media',
anexos JSONB DEFAULT '[]',
publicado BOOLEAN NOT NULL DEFAULT false,
data_publicacao TIMESTAMPTZ,
data_expiracao TIMESTAMPTZ,
fixado BOOLEAN NOT NULL DEFAULT false,
destinatarios_blocos UUID[] DEFAULT NULL,
destinatarios_unidades UUID[] DEFAULT NULL,
visualizacoes INTEGER NOT NULL DEFAULT 0,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
CREATE TABLE public.audit_logs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
condominio_id UUID REFERENCES public.condominios(id) ON DELETE SET NULL,
acao VARCHAR(50) NOT NULL,
tabela VARCHAR(100) NOT NULL,
registro_id UUID,
dados_antes JSONB,
dados_depois JSONB,
ip_address INET,
user_agent TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
CREATE TABLE public.sessoes_impersonate (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
superadmin_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
usuario_alvo_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
motivo TEXT NOT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
revoked_at TIMESTAMPTZ,
CONSTRAINT check_different_users CHECK (superadmin_id != usuario_alvo_id)
CREATE TABLE public.atas_validacao (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
titulo VARCHAR(255) NOT NULL,
conteudo TEXT NOT NULL,
tipo VARCHAR(50) NOT NULL DEFAULT 'assembleia',
status public.ata_status NOT NULL DEFAULT 'rascunho',
validado_por UUID REFERENCES public.usuarios(id),
validado_em TIMESTAMPTZ,
motivo_rejeicao TEXT,
arquivo_url TEXT,
hash_documento VARCHAR(64),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES public.usuarios(id)
CREATE TABLE public.feature_flags (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
nome VARCHAR(100) NOT NULL UNIQUE,
descricao TEXT,
ativo BOOLEAN NOT NULL DEFAULT false,
escopo VARCHAR(20) NOT NULL DEFAULT 'global' CHECK (escopo IN ('global', 'tier', 'condominio')),
tiers_habilitados public.tier_type[] DEFAULT '{}',
condominios_habilitados UUID[] DEFAULT '{}',
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
CREATE TABLE public.rate_limits (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
identifier VARCHAR(255) NOT NULL,
endpoint VARCHAR(255) NOT NULL,
requests INTEGER NOT NULL DEFAULT 1,
window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
CONSTRAINT uq_rate_limit UNIQUE (identifier, endpoint)

### Arquivo: 20240101000005_auth_sync_rate_limiting.sql

CREATE TABLE IF NOT EXISTS public.codigos_convite_uso (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
codigo_usado VARCHAR(8) NOT NULL,
usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
usado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()

### Arquivo: 20240101000006_operational_modules.sql

CREATE TABLE IF NOT EXISTS public.comunicados_leitura (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
comunicado_id UUID NOT NULL REFERENCES public.comunicados(id) ON DELETE CASCADE,
usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
lido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(comunicado_id, usuario_id)
CREATE TABLE public.ocorrencias (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
reportado_por UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
anonimo BOOLEAN NOT NULL DEFAULT false,
unidade_relacionada_id UUID REFERENCES public.unidades_habitacionais(id) ON DELETE SET NULL,
local_descricao VARCHAR(200),
titulo VARCHAR(200) NOT NULL,
descricao TEXT NOT NULL,
categoria public.ocorrencia_categoria NOT NULL DEFAULT 'outros',
prioridade public.prioridade NOT NULL DEFAULT 'media',
status public.ocorrencia_status NOT NULL DEFAULT 'aberta',
responsavel_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
resolucao TEXT,
resolvido_em TIMESTAMPTZ,
resolvido_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
anexos JSONB DEFAULT '[]'::JSONB,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
deleted_at TIMESTAMPTZ,
CONSTRAINT check_ocorrencia_titulo CHECK (char_length(titulo) >= 5),
CONSTRAINT check_ocorrencia_descricao CHECK (char_length(descricao) >= 20)
CREATE TABLE public.ocorrencias_historico (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
ocorrencia_id UUID NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
status_anterior public.ocorrencia_status,
status_novo public.ocorrencia_status NOT NULL,
comentario TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
CREATE TABLE public.chamados (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
solicitante_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
titulo VARCHAR(200) NOT NULL,
descricao TEXT NOT NULL,
categoria public.chamado_categoria NOT NULL DEFAULT 'duvida',
prioridade public.prioridade NOT NULL DEFAULT 'media',
status public.chamado_status NOT NULL DEFAULT 'novo',
atendente_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
resposta_final TEXT,
resolvido_em TIMESTAMPTZ,
avaliacao_nota INTEGER CHECK (avaliacao_nota BETWEEN 1 AND 5),
avaliacao_comentario TEXT,
avaliado_em TIMESTAMPTZ,
anexos JSONB DEFAULT '[]'::JSONB,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
deleted_at TIMESTAMPTZ,
CONSTRAINT check_chamado_titulo CHECK (char_length(titulo) >= 5),
CONSTRAINT check_chamado_descricao CHECK (char_length(descricao) >= 10)
CREATE TABLE public.chamados_mensagens (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
autor_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
mensagem TEXT NOT NULL,
anexos JSONB DEFAULT '[]'::JSONB,
interno BOOLEAN NOT NULL DEFAULT false,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
CREATE TABLE public.faq (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
pergunta VARCHAR(500) NOT NULL,
resposta TEXT NOT NULL,
categoria VARCHAR(100) DEFAULT 'geral',
ordem INTEGER NOT NULL DEFAULT 0,
ativo BOOLEAN NOT NULL DEFAULT true,
destaque BOOLEAN NOT NULL DEFAULT false,
visualizacoes INTEGER NOT NULL DEFAULT 0,
votos_util INTEGER NOT NULL DEFAULT 0,
votos_inutil INTEGER NOT NULL DEFAULT 0,
criado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
deleted_at TIMESTAMPTZ
CREATE TABLE public.faq_votos (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
faq_id UUID NOT NULL REFERENCES public.faq(id) ON DELETE CASCADE,
usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
util BOOLEAN NOT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(faq_id, usuario_id)

### Arquivo: 20240101000008_financial_module.sql

CREATE TABLE public.categorias_financeiras (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
parent_id UUID REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL,
codigo VARCHAR(20) NOT NULL,
nome VARCHAR(100) NOT NULL,
tipo public.categoria_tipo NOT NULL,
orcamento_anual DECIMAL(12,2) DEFAULT 0,
ativo BOOLEAN NOT NULL DEFAULT true,
ordem INTEGER NOT NULL DEFAULT 0,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
deleted_at TIMESTAMPTZ,
UNIQUE(condominio_id, codigo)
CREATE TABLE public.contas_bancarias (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
banco_codigo VARCHAR(10) NOT NULL,
banco_nome VARCHAR(100) NOT NULL,
agencia VARCHAR(10) NOT NULL,
conta VARCHAR(20) NOT NULL,
tipo_conta VARCHAR(20) NOT NULL DEFAULT 'corrente',
nome_exibicao VARCHAR(100) NOT NULL,
saldo_inicial DECIMAL(12,2) NOT NULL DEFAULT 0,
saldo_atual DECIMAL(12,2) NOT NULL DEFAULT 0,
data_saldo TIMESTAMPTZ NOT NULL DEFAULT NOW(),
principal BOOLEAN NOT NULL DEFAULT false,
ativo BOOLEAN NOT NULL DEFAULT true,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
deleted_at TIMESTAMPTZ
CREATE TABLE public.contas_bancarias_historico (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
conta_bancaria_id UUID NOT NULL REFERENCES public.contas_bancarias(id) ON DELETE CASCADE,
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
mes_referencia DATE NOT NULL,
saldo_inicial DECIMAL(12,2) NOT NULL,
total_entradas DECIMAL(12,2) NOT NULL DEFAULT 0,
total_saidas DECIMAL(12,2) NOT NULL DEFAULT 0,
saldo_final DECIMAL(12,2) NOT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(conta_bancaria_id, mes_referencia)
CREATE TABLE public.lancamentos_financeiros (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
tipo public.lancamento_tipo NOT NULL,
categoria_id UUID REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL,
conta_bancaria_id UUID REFERENCES public.contas_bancarias(id) ON DELETE SET NULL,
descricao VARCHAR(500) NOT NULL,
valor DECIMAL(12,2) NOT NULL CHECK (valor > 0),
data_lancamento DATE NOT NULL,
data_competencia DATE NOT NULL,
data_pagamento DATE,
status public.lancamento_status NOT NULL DEFAULT 'pendente',
numero_documento VARCHAR(50),
fornecedor VARCHAR(200),
comprovantes JSONB DEFAULT '[]'::JSONB,
observacoes TEXT,
conta_destino_id UUID REFERENCES public.contas_bancarias(id) ON DELETE SET NULL,
taxa_unidade_id UUID,
periodo_bloqueado BOOLEAN NOT NULL DEFAULT false,
criado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
deleted_at TIMESTAMPTZ
CREATE TABLE public.prestacao_contas (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
mes_referencia DATE NOT NULL,
saldo_anterior DECIMAL(12,2) NOT NULL DEFAULT 0,
total_receitas DECIMAL(12,2) NOT NULL DEFAULT 0,
total_despesas DECIMAL(12,2) NOT NULL DEFAULT 0,
saldo_atual DECIMAL(12,2) NOT NULL DEFAULT 0,
status public.prestacao_status NOT NULL DEFAULT 'rascunho',
revisado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
revisado_em TIMESTAMPTZ,
parecer_conselho TEXT,
publicado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
publicado_em TIMESTAMPTZ,
observacoes_sindico TEXT,
criado_por UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(condominio_id, mes_referencia)
CREATE TABLE public.taxas_unidades (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
unidade_id UUID NOT NULL REFERENCES public.unidades_habitacionais(id) ON DELETE CASCADE,
mes_referencia DATE NOT NULL,
tipo public.taxa_tipo NOT NULL DEFAULT 'ordinaria',
valor_base DECIMAL(10,2) NOT NULL,
desconto DECIMAL(10,2) DEFAULT 0,
acrescimo DECIMAL(10,2) DEFAULT 0,
valor_final DECIMAL(10,2) GENERATED ALWAYS AS (valor_base - COALESCE(desconto, 0) + COALESCE(acrescimo, 0)) STORED,
data_vencimento DATE NOT NULL,
data_pagamento DATE,
valor_pago DECIMAL(10,2),
status public.cobranca_status NOT NULL DEFAULT 'pendente',
boleto_id VARCHAR(100),
boleto_url TEXT,
linha_digitavel VARCHAR(100),
descricao TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(unidade_id, mes_referencia, tipo)
CREATE TABLE public.configuracoes_financeiras (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL UNIQUE REFERENCES public.condominios(id) ON DELETE CASCADE,
taxa_ordinaria_base DECIMAL(10,2) NOT NULL DEFAULT 0,
dia_vencimento INTEGER NOT NULL DEFAULT 10 CHECK (dia_vencimento BETWEEN 1 AND 28),
multa_percentual DECIMAL(5,2) NOT NULL DEFAULT 2.00,
juros_mensal_percentual DECIMAL(5,2) NOT NULL DEFAULT 1.00,
dias_carencia INTEGER NOT NULL DEFAULT 0,
fundo_reserva_percentual DECIMAL(5,2) NOT NULL DEFAULT 10.00,
desconto_pontualidade_percentual DECIMAL(5,2) NOT NULL DEFAULT 0,
desconto_pontualidade_dias INTEGER NOT NULL DEFAULT 0,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

### Arquivo: 20240101000012_assembleias_module.sql

CREATE TABLE public.assembleias (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
tipo public.assembleia_tipo NOT NULL,
titulo VARCHAR(255) NOT NULL,
descricao TEXT,
numero_sequencial INTEGER, -- AGO 2024/1, AGE 2024/3
ano_referencia INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
data_primeira_convocacao TIMESTAMPTZ,
data_segunda_convocacao TIMESTAMPTZ, -- 30 min após, se não houver quórum
data_inicio TIMESTAMPTZ,
data_fim TIMESTAMPTZ,
permite_voto_antecipado BOOLEAN NOT NULL DEFAULT false,
data_limite_voto_antecipado TIMESTAMPTZ,
permite_procuracao BOOLEAN NOT NULL DEFAULT true,
max_procuracoes_por_pessoa INTEGER NOT NULL DEFAULT 2, -- Lei 4.591/64
quorum_minimo_primeira DECIMAL(5,2) NOT NULL DEFAULT 50.00, -- % da fração ideal
quorum_minimo_segunda DECIMAL(5,2) NOT NULL DEFAULT 0, -- Qualquer número
quorum_atingido DECIMAL(5,2) DEFAULT 0, -- Calculado em tempo real
local_presencial VARCHAR(255),
endereco_presencial TEXT,
link_video VARCHAR(500), -- Jitsi, Google Meet, Zoom
codigo_acesso_video VARCHAR(50),
qr_token VARCHAR(64) UNIQUE, -- Token único para validar check-in
status public.assembleia_status NOT NULL DEFAULT 'rascunho',
ata_texto TEXT,
ata_pdf_path VARCHAR(500),
ata_hash VARCHAR(64), -- SHA256 para integridade
observacoes_internas TEXT, -- Notas do síndico (não vai para ata)
criado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
convocada_em TIMESTAMPTZ,
iniciada_em TIMESTAMPTZ,
encerrada_em TIMESTAMPTZ,
arquivada_em TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
CREATE TABLE public.assembleia_pautas (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
assembleia_id UUID NOT NULL REFERENCES public.assembleias(id) ON DELETE CASCADE,
ordem INTEGER NOT NULL,
titulo VARCHAR(255) NOT NULL,
descricao TEXT,
tipo_votacao public.pauta_tipo_votacao NOT NULL DEFAULT 'aprovacao',
voto_secreto BOOLEAN NOT NULL DEFAULT false,
quorum_especial public.quorum_especial DEFAULT 'maioria_simples',
permite_abstencao BOOLEAN NOT NULL DEFAULT true,
cargo VARCHAR(100), -- 'sindico', 'subsindico', 'conselho_fiscal'
max_eleitos INTEGER DEFAULT 1,
bloqueia_inadimplentes BOOLEAN NOT NULL DEFAULT true,
status public.pauta_status NOT NULL DEFAULT 'pendente',
resultado JSONB, -- { aprovados: X, rejeitados: Y, abstencoes: Z, eleitos: [...], percentual: N }
votacao_iniciada_em TIMESTAMPTZ,
votacao_encerrada_em TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(assembleia_id, ordem)
CREATE TABLE public.assembleia_pauta_opcoes (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
pauta_id UUID NOT NULL REFERENCES public.assembleia_pautas(id) ON DELETE CASCADE,
ordem INTEGER NOT NULL,
titulo VARCHAR(255) NOT NULL,
descricao TEXT,
candidato_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
candidato_nome VARCHAR(255), -- Snapshot do nome (caso usuário seja deletado)
candidato_unidade VARCHAR(50), -- Snapshot da unidade
votos_count INTEGER NOT NULL DEFAULT 0,
votos_fracao DECIMAL(10,6) NOT NULL DEFAULT 0, -- Soma das frações ideais
eleito BOOLEAN NOT NULL DEFAULT false,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(pauta_id, ordem)
CREATE TABLE public.assembleia_presencas (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
assembleia_id UUID NOT NULL REFERENCES public.assembleias(id) ON DELETE CASCADE,
usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
unidade_id UUID NOT NULL REFERENCES public.unidades_habitacionais(id) ON DELETE CASCADE,
tipo public.presenca_tipo NOT NULL,
representante_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
procuracao_id UUID, -- Referência à tabela de procurações
fracao_ideal DECIMAL(10,6) NOT NULL,
check_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
check_out_at TIMESTAMPTZ,
ip_address INET,
user_agent TEXT,
dispositivo VARCHAR(100), -- 'mobile', 'desktop', 'tablet'
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(assembleia_id, unidade_id)
CREATE TABLE public.assembleia_votos (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
pauta_id UUID NOT NULL REFERENCES public.assembleia_pautas(id) ON DELETE CASCADE,
presenca_id UUID NOT NULL REFERENCES public.assembleia_presencas(id) ON DELETE CASCADE,
voto public.voto_tipo NOT NULL,
opcao_id UUID REFERENCES public.assembleia_pauta_opcoes(id) ON DELETE SET NULL, -- Para escolha/eleição
fracao_ideal DECIMAL(10,6) NOT NULL,
usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
unidade_id UUID REFERENCES public.unidades_habitacionais(id) ON DELETE SET NULL,
voto_hash VARCHAR(64) NOT NULL, -- SHA256
voto_anterior_hash VARCHAR(64), -- Hash do voto anterior (blockchain simplificado)
votado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ip_address INET,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(pauta_id, presenca_id)
CREATE TABLE public.assembleia_procuracoes (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
outorgante_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
outorgante_unidade_id UUID NOT NULL REFERENCES public.unidades_habitacionais(id) ON DELETE CASCADE,
outorgado_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
assembleia_id UUID REFERENCES public.assembleias(id) ON DELETE CASCADE, -- NULL = válida para qualquer
validade_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
validade_fim DATE, -- NULL = sem prazo
pode_votar BOOLEAN NOT NULL DEFAULT true,
pode_falar BOOLEAN NOT NULL DEFAULT false, -- Falar em nome do outorgante
restricoes TEXT, -- Instruções específicas
status public.procuracao_status NOT NULL DEFAULT 'pendente',
aceite_em TIMESTAMPTZ,
aceite_ip INET,
documento_path VARCHAR(500), -- PDF assinado
documento_hash VARCHAR(64), -- SHA256
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
CREATE TABLE public.assembleia_assinaturas (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
assembleia_id UUID NOT NULL REFERENCES public.assembleias(id) ON DELETE CASCADE,
usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
papel VARCHAR(50) NOT NULL, -- 'presidente', 'secretario', 'sindico', 'testemunha'
assinado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ip_address INET,
user_agent TEXT,
documento_hash VARCHAR(64) NOT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(assembleia_id, usuario_id, papel)
CREATE TABLE public.assembleia_logs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
assembleia_id UUID NOT NULL REFERENCES public.assembleias(id) ON DELETE CASCADE,
usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
acao VARCHAR(100) NOT NULL, -- 'presenca_registrada', 'voto_registrado', 'pauta_aberta', etc
detalhes JSONB,
ip_address INET,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

### Arquivo: 20240101000014_comunicacao_module.sql

CREATE TABLE public.notificacoes_config (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
push_habilitado BOOLEAN NOT NULL DEFAULT true,
email_habilitado BOOLEAN NOT NULL DEFAULT true,
in_app_habilitado BOOLEAN NOT NULL DEFAULT true,
whatsapp_habilitado BOOLEAN NOT NULL DEFAULT false, -- Requer configuração
sms_habilitado BOOLEAN NOT NULL DEFAULT false, -- Requer créditos
voz_habilitado BOOLEAN NOT NULL DEFAULT false, -- Requer créditos
mural_habilitado BOOLEAN NOT NULL DEFAULT true,
cascata_habilitada BOOLEAN NOT NULL DEFAULT true,
tempo_push_para_email INTEGER NOT NULL DEFAULT 60, -- 1 hora
tempo_email_para_whatsapp INTEGER NOT NULL DEFAULT 1440, -- 24 horas
tempo_whatsapp_para_sms INTEGER NOT NULL DEFAULT 2880, -- 48 horas
horario_inicio TIME NOT NULL DEFAULT '07:00',
horario_fim TIME NOT NULL DEFAULT '22:00',
respeitar_horario BOOLEAN NOT NULL DEFAULT true,
emergencia_ignora_horario BOOLEAN NOT NULL DEFAULT true,
whatsapp_phone_id VARCHAR(50),
whatsapp_business_id VARCHAR(50),
whatsapp_token_encrypted TEXT,
email_remetente VARCHAR(255) DEFAULT 'noreply@versixnorma.com.br',
email_nome_remetente VARCHAR(255),
creditos_sms INTEGER NOT NULL DEFAULT 0,
creditos_voz_minutos INTEGER NOT NULL DEFAULT 0,
creditos_whatsapp INTEGER NOT NULL DEFAULT 0,
limite_email_mensal INTEGER NOT NULL DEFAULT 0,
limite_push_mensal INTEGER NOT NULL DEFAULT 0,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(condominio_id)
CREATE TABLE public.usuarios_canais_preferencias (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
push_habilitado BOOLEAN NOT NULL DEFAULT true,
email_habilitado BOOLEAN NOT NULL DEFAULT true,
in_app_habilitado BOOLEAN NOT NULL DEFAULT true,
whatsapp_habilitado BOOLEAN NOT NULL DEFAULT true,
sms_habilitado BOOLEAN NOT NULL DEFAULT true,
voz_habilitado BOOLEAN NOT NULL DEFAULT true,
receber_comunicados BOOLEAN NOT NULL DEFAULT true,
receber_avisos BOOLEAN NOT NULL DEFAULT true,
receber_alertas BOOLEAN NOT NULL DEFAULT true,
receber_emergencias BOOLEAN NOT NULL DEFAULT true, -- Não pode desabilitar emergência
receber_lembretes BOOLEAN NOT NULL DEFAULT true,
receber_cobrancas BOOLEAN NOT NULL DEFAULT true,
receber_assembleias BOOLEAN NOT NULL DEFAULT true,
receber_ocorrencias BOOLEAN NOT NULL DEFAULT true,
receber_chamados BOOLEAN NOT NULL DEFAULT true,
horario_inicio_preferido TIME,
horario_fim_preferido TIME,
push_tokens JSONB DEFAULT '[]'::JSONB, -- [{token, device_type, device_name, last_used}]
whatsapp_numero VARCHAR(20),
whatsapp_verificado BOOLEAN NOT NULL DEFAULT false,
sms_numero VARCHAR(20),
voz_numero VARCHAR(20),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(usuario_id)
CREATE TABLE public.templates_notificacao (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID REFERENCES public.condominios(id) ON DELETE CASCADE, -- NULL = template global
codigo VARCHAR(100) NOT NULL, -- 'comunicado_novo', 'boleto_vencendo', etc
nome VARCHAR(255) NOT NULL,
descricao TEXT,
tipo public.tipo_notificacao NOT NULL,
canal public.canal_notificacao NOT NULL,
assunto VARCHAR(255), -- Para email
corpo TEXT NOT NULL, -- Suporta variáveis {{nome}}, {{unidade}}, etc
corpo_html TEXT, -- Para email HTML
whatsapp_template_id VARCHAR(100),
whatsapp_namespace VARCHAR(100),
variaveis_disponiveis JSONB DEFAULT '[]'::JSONB, -- ['nome', 'unidade', 'valor', ...]
ativo BOOLEAN NOT NULL DEFAULT true,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(condominio_id, codigo, canal)
CREATE TABLE public.notificacoes (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
tipo public.tipo_notificacao NOT NULL,
prioridade public.prioridade_comunicado NOT NULL DEFAULT 'normal',
titulo VARCHAR(255) NOT NULL,
corpo TEXT NOT NULL,
corpo_resumo VARCHAR(200), -- Para push notification
corpo_html TEXT, -- Para email
anexos JSONB DEFAULT '[]'::JSONB, -- [{nome, url, tipo_mime, tamanho}]
destinatarios_tipo VARCHAR(50) NOT NULL DEFAULT 'todos', -- 'todos', 'bloco', 'unidades', 'roles', 'lista'
destinatarios_filtro JSONB, -- {bloco: 'A'}, {unidades: ['101', '102']}, {roles: ['sindico']}
total_destinatarios INTEGER DEFAULT 0,
referencia_tipo VARCHAR(50), -- 'comunicado', 'assembleia', 'ocorrencia', 'chamado', 'boleto'
referencia_id UUID,
acao_url VARCHAR(500), -- URL para abrir ao clicar
acao_texto VARCHAR(100), -- Texto do botão de ação
agendada_para TIMESTAMPTZ,
gerar_mural BOOLEAN NOT NULL DEFAULT false,
mural_pdf_path VARCHAR(500),
mural_qr_code VARCHAR(500),
status public.status_entrega NOT NULL DEFAULT 'pendente',
enviada_em TIMESTAMPTZ,
cancelada_em TIMESTAMPTZ,
criado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
stats_enviados INTEGER DEFAULT 0,
stats_entregues INTEGER DEFAULT 0,
stats_lidos INTEGER DEFAULT 0,
stats_falhas INTEGER DEFAULT 0,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
CREATE TABLE public.notificacoes_entregas (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
notificacao_id UUID NOT NULL REFERENCES public.notificacoes(id) ON DELETE CASCADE,
usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
canal public.canal_notificacao NOT NULL,
status public.status_entrega NOT NULL DEFAULT 'pendente',
tentativas INTEGER NOT NULL DEFAULT 0,
max_tentativas INTEGER NOT NULL DEFAULT 3,
proxima_tentativa TIMESTAMPTZ,
canal_origem public.canal_notificacao, -- Canal que gerou essa entrega via cascata
cascata_nivel INTEGER NOT NULL DEFAULT 0, -- 0 = original, 1 = primeira cascata, etc
provider_id VARCHAR(255), -- ID da mensagem no provider
provider_response JSONB, -- Resposta completa do provider
erro_codigo VARCHAR(50),
erro_mensagem TEXT,
agendada_para TIMESTAMPTZ,
enviada_em TIMESTAMPTZ,
entregue_em TIMESTAMPTZ,
lida_em TIMESTAMPTZ,
falhou_em TIMESTAMPTZ,
custo_centavos INTEGER DEFAULT 0,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(notificacao_id, usuario_id, canal)
CREATE TABLE public.notificacoes_leituras (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
notificacao_id UUID NOT NULL REFERENCES public.notificacoes(id) ON DELETE CASCADE,
usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
canal public.canal_notificacao NOT NULL,
lida_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ip_address INET,
user_agent TEXT,
UNIQUE(notificacao_id, usuario_id)
CREATE TABLE public.cotas_comunicacao (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
mes_referencia DATE NOT NULL, -- Primeiro dia do mês
uso_push INTEGER NOT NULL DEFAULT 0,
uso_email INTEGER NOT NULL DEFAULT 0,
uso_in_app INTEGER NOT NULL DEFAULT 0,
uso_whatsapp INTEGER NOT NULL DEFAULT 0,
uso_sms INTEGER NOT NULL DEFAULT 0,
uso_voz_minutos INTEGER NOT NULL DEFAULT 0,
custo_whatsapp_centavos INTEGER NOT NULL DEFAULT 0,
custo_sms_centavos INTEGER NOT NULL DEFAULT 0,
custo_voz_centavos INTEGER NOT NULL DEFAULT 0,
custo_total_centavos INTEGER NOT NULL DEFAULT 0,
alerta_50_disparado BOOLEAN NOT NULL DEFAULT false,
alerta_80_disparado BOOLEAN NOT NULL DEFAULT false,
alerta_100_disparado BOOLEAN NOT NULL DEFAULT false,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(condominio_id, mes_referencia)
CREATE TABLE public.webhooks_notificacao (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID REFERENCES public.condominios(id) ON DELETE CASCADE, -- NULL = global
nome VARCHAR(255) NOT NULL,
url VARCHAR(500) NOT NULL,
secret VARCHAR(255), -- Para assinatura HMAC
eventos JSONB NOT NULL DEFAULT '["entrega", "leitura", "falha"]'::JSONB,
ativo BOOLEAN NOT NULL DEFAULT true,
max_tentativas INTEGER NOT NULL DEFAULT 3,
timeout_segundos INTEGER NOT NULL DEFAULT 30,
total_enviados INTEGER DEFAULT 0,
total_sucesso INTEGER DEFAULT 0,
total_falha INTEGER DEFAULT 0,
ultimo_erro TEXT,
ultimo_sucesso_em TIMESTAMPTZ,
ultimo_erro_em TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
CREATE TABLE public.notificacoes_fila (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
entrega_id UUID NOT NULL REFERENCES public.notificacoes_entregas(id) ON DELETE CASCADE,
prioridade INTEGER NOT NULL DEFAULT 0,
processando BOOLEAN NOT NULL DEFAULT false,
processando_por VARCHAR(100), -- ID do worker
processando_desde TIMESTAMPTZ,
processar_apos TIMESTAMPTZ NOT NULL DEFAULT NOW(),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(entrega_id)
CREATE TABLE public.emergencias_log (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
notificacao_id UUID REFERENCES public.notificacoes(id) ON DELETE SET NULL,
tipo VARCHAR(100) NOT NULL, -- 'incendio', 'gas', 'invasao', 'alagamento', etc
disparado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
disparado_por_nome VARCHAR(255), -- Snapshot
total_destinatarios INTEGER,
total_push_enviados INTEGER,
total_sms_enviados INTEGER,
total_voz_enviados INTEGER,
tempo_primeiro_envio_ms INTEGER, -- Latência até primeiro envio
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

### Arquivo: 20240101000016_integracoes_module.sql

CREATE TABLE public.integracoes (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
nome VARCHAR(100) NOT NULL,
descricao TEXT,
tipo public.integracao_tipo NOT NULL,
ambiente public.integracao_ambiente NOT NULL DEFAULT 'live',
api_key VARCHAR(64) UNIQUE,
api_key_hash VARCHAR(128), -- SHA256 para validação
api_key_prefix VARCHAR(20), -- Primeiros caracteres para identificação
secret_key VARCHAR(64),
url_destino VARCHAR(500),
headers_custom JSONB DEFAULT '{}'::JSONB,
oauth_provider VARCHAR(50), -- 'google', 'microsoft', etc
oauth_client_id VARCHAR(255),
oauth_tokens JSONB, -- {access_token, refresh_token, expires_at}
scopes TEXT[] NOT NULL DEFAULT '{}',
rate_limit_requests INTEGER NOT NULL DEFAULT 100,
rate_limit_periodo VARCHAR(20) NOT NULL DEFAULT 'hora', -- 'minuto', 'hora', 'dia'
rate_limit_usado INTEGER NOT NULL DEFAULT 0,
rate_limit_reset_em TIMESTAMPTZ,
ip_whitelist INET[],
status public.integracao_status NOT NULL DEFAULT 'ativa',
ultimo_uso TIMESTAMPTZ,
total_requests INTEGER NOT NULL DEFAULT 0,
total_sucesso INTEGER NOT NULL DEFAULT 0,
total_erros INTEGER NOT NULL DEFAULT 0,
criado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(condominio_id, nome)
CREATE TABLE public.webhooks_config (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
integracao_id UUID NOT NULL REFERENCES public.integracoes(id) ON DELETE CASCADE,
eventos public.webhook_evento[] NOT NULL,
url_override VARCHAR(500), -- Sobrescreve URL da integração
headers_override JSONB, -- Headers adicionais
max_tentativas INTEGER NOT NULL DEFAULT 5,
intervalo_retry_segundos INTEGER NOT NULL DEFAULT 60,
backoff_multiplicador DECIMAL(3,1) NOT NULL DEFAULT 2.0, -- Exponencial
timeout_segundos INTEGER NOT NULL DEFAULT 30,
filtro_blocos TEXT[], -- Só eventos desses blocos
filtro_categorias TEXT[], -- Só eventos dessas categorias
filtro_tipos TEXT[], -- Filtro adicional por tipo
usar_assinatura BOOLEAN NOT NULL DEFAULT true,
algoritmo_assinatura VARCHAR(20) NOT NULL DEFAULT 'hmac-sha256',
ativo BOOLEAN NOT NULL DEFAULT true,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
CREATE TABLE public.webhooks_entregas (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
webhook_config_id UUID NOT NULL REFERENCES public.webhooks_config(id) ON DELETE CASCADE,
evento public.webhook_evento NOT NULL,
event_id VARCHAR(64) NOT NULL UNIQUE, -- Idempotência
payload JSONB NOT NULL,
recurso_tipo VARCHAR(50),
recurso_id UUID,
tentativa INTEGER NOT NULL DEFAULT 0,
max_tentativas INTEGER NOT NULL DEFAULT 5,
proxima_tentativa TIMESTAMPTZ,
status public.webhook_entrega_status NOT NULL DEFAULT 'pendente',
status_code INTEGER,
response_body TEXT,
response_time_ms INTEGER,
erro_mensagem TEXT,
assinatura VARCHAR(128),
enviado_em TIMESTAMPTZ,
entregue_em TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
CREATE TABLE public.conectores (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
integracao_id UUID NOT NULL REFERENCES public.integracoes(id) ON DELETE CASCADE,
tipo public.conector_tipo NOT NULL,
provider VARCHAR(100) NOT NULL, -- 'controlid', 'intelbras', 'google_calendar', etc
config JSONB NOT NULL DEFAULT '{}'::JSONB,
credenciais_encrypted TEXT,
mapeamento JSONB DEFAULT '{}'::JSONB,
sync_habilitado BOOLEAN NOT NULL DEFAULT true,
sync_intervalo_minutos INTEGER DEFAULT 60,
ultima_sync_em TIMESTAMPTZ,
ultima_sync_status VARCHAR(50),
ultima_sync_erro TEXT,
proxima_sync_em TIMESTAMPTZ,
total_syncs INTEGER NOT NULL DEFAULT 0,
total_registros_importados INTEGER NOT NULL DEFAULT 0,
total_registros_exportados INTEGER NOT NULL DEFAULT 0,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
CREATE TABLE public.api_logs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
integracao_id UUID REFERENCES public.integracoes(id) ON DELETE SET NULL,
metodo VARCHAR(10) NOT NULL, -- GET, POST, PUT, DELETE
path VARCHAR(500) NOT NULL,
query_params JSONB,
headers JSONB, -- Headers relevantes (sem Authorization)
body_size INTEGER,
status_code INTEGER NOT NULL,
response_time_ms INTEGER NOT NULL,
response_size INTEGER,
erro_codigo VARCHAR(50),
erro_mensagem TEXT,
ip_address INET,
user_agent TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
CREATE TABLE public.api_scopes (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
codigo VARCHAR(100) NOT NULL UNIQUE, -- 'read:moradores', 'write:comunicados'
nome VARCHAR(255) NOT NULL,
descricao TEXT,
categoria VARCHAR(50) NOT NULL, -- 'moradores', 'financeiro', 'comunicacao', etc
tipo VARCHAR(20) NOT NULL, -- 'read', 'write', 'delete', 'admin'
recursos TEXT[] NOT NULL, -- ['usuarios', 'unidades']
requer_role public.user_role[], -- Roles mínimos para usar este scope
ativo BOOLEAN NOT NULL DEFAULT true,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
CREATE TABLE public.sync_logs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
conector_id UUID NOT NULL REFERENCES public.conectores(id) ON DELETE CASCADE,
direcao VARCHAR(20) NOT NULL, -- 'import', 'export', 'bidirecional'
status VARCHAR(20) NOT NULL, -- 'sucesso', 'parcial', 'erro'
registros_processados INTEGER NOT NULL DEFAULT 0,
registros_criados INTEGER NOT NULL DEFAULT 0,
registros_atualizados INTEGER NOT NULL DEFAULT 0,
registros_ignorados INTEGER NOT NULL DEFAULT 0,
registros_erro INTEGER NOT NULL DEFAULT 0,
erros JSONB, -- [{linha: X, erro: 'mensagem'}]
iniciado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
finalizado_em TIMESTAMPTZ,
duracao_ms INTEGER,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

### Arquivo: 20240101000018_observabilidade_module.sql

CREATE TABLE IF NOT EXISTS metricas_uso (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
periodo DATE NOT NULL,
tipo_periodo VARCHAR(10) NOT NULL CHECK (tipo_periodo IN ('hora', 'dia', 'semana', 'mes')),
usuarios_ativos INTEGER DEFAULT 0,
sessoes_totais INTEGER DEFAULT 0,
tempo_medio_sessao_segundos INTEGER DEFAULT 0,
page_views INTEGER DEFAULT 0,
comunicados_criados INTEGER DEFAULT 0,
comunicados_visualizados INTEGER DEFAULT 0,
ocorrencias_criadas INTEGER DEFAULT 0,
ocorrencias_resolvidas INTEGER DEFAULT 0,
chamados_abertos INTEGER DEFAULT 0,
chamados_fechados INTEGER DEFAULT 0,
reservas_feitas INTEGER DEFAULT 0,
votos_assembleias INTEGER DEFAULT 0,
documentos_acessados INTEGER DEFAULT 0,
norma_conversas INTEGER DEFAULT 0,
norma_mensagens INTEGER DEFAULT 0,
norma_tokens_entrada INTEGER DEFAULT 0,
norma_tokens_saida INTEGER DEFAULT 0,
norma_tempo_resposta_avg_ms INTEGER DEFAULT 0,
norma_satisfacao_avg DECIMAL(3,2), -- 0.00 a 5.00
notificacoes_enviadas INTEGER DEFAULT 0,
notificacoes_lidas INTEGER DEFAULT 0,
emails_enviados INTEGER DEFAULT 0,
emails_abertos INTEGER DEFAULT 0,
sms_enviados INTEGER DEFAULT 0,
push_enviados INTEGER DEFAULT 0,
push_clicados INTEGER DEFAULT 0,
custo_ia_centavos INTEGER DEFAULT 0,
custo_email_centavos INTEGER DEFAULT 0,
custo_sms_centavos INTEGER DEFAULT 0,
custo_storage_centavos INTEGER DEFAULT 0,
custo_total_centavos INTEGER DEFAULT 0,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
UNIQUE(condominio_id, periodo, tipo_periodo)
CREATE TABLE IF NOT EXISTS metricas_performance (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
periodo TIMESTAMPTZ NOT NULL,
endpoint VARCHAR(200) NOT NULL,
metodo VARCHAR(10) NOT NULL DEFAULT 'GET',
total_requests INTEGER DEFAULT 0,
requests_sucesso INTEGER DEFAULT 0,
requests_erro INTEGER DEFAULT 0,
requests_timeout INTEGER DEFAULT 0,
latencia_min INTEGER,
latencia_p50 INTEGER,
latencia_p90 INTEGER,
latencia_p99 INTEGER,
latencia_max INTEGER,
latencia_avg INTEGER,
rps_max DECIMAL(10,2),
rps_avg DECIMAL(10,2),
response_size_avg INTEGER,
response_size_max INTEGER,
created_at TIMESTAMPTZ DEFAULT NOW()
CREATE TABLE IF NOT EXISTS alertas_sistema (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
tipo VARCHAR(50) NOT NULL,
severidade VARCHAR(10) NOT NULL CHECK (severidade IN ('info', 'warning', 'error', 'critical')),
condominio_id UUID REFERENCES condominios(id) ON DELETE SET NULL,
usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
endpoint VARCHAR(200),
titulo VARCHAR(200) NOT NULL,
descricao TEXT,
dados JSONB DEFAULT '{}',
stack_trace TEXT,
status VARCHAR(20) DEFAULT 'aberto' CHECK (status IN ('aberto', 'reconhecido', 'resolvido', 'ignorado')),
resolvido_em TIMESTAMPTZ,
resolvido_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
resolucao_notas TEXT,
notificado_slack BOOLEAN DEFAULT false,
notificado_email BOOLEAN DEFAULT false,
notificado_pagerduty BOOLEAN DEFAULT false,
fingerprint VARCHAR(64), -- Hash para agrupar alertas similares
ocorrencias INTEGER DEFAULT 1,
primeira_ocorrencia TIMESTAMPTZ DEFAULT NOW(),
ultima_ocorrencia TIMESTAMPTZ DEFAULT NOW(),
created_at TIMESTAMPTZ DEFAULT NOW()
CREATE TABLE IF NOT EXISTS uptime_checks (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
endpoint_nome VARCHAR(100) NOT NULL,
endpoint_url VARCHAR(500) NOT NULL,
endpoint_critico BOOLEAN DEFAULT false,
status VARCHAR(20) NOT NULL CHECK (status IN ('ok', 'degraded', 'error', 'timeout')),
status_code INTEGER,
latencia_ms INTEGER,
erro_mensagem TEXT,
erro_tipo VARCHAR(100),
checked_at TIMESTAMPTZ DEFAULT NOW()
CREATE TABLE IF NOT EXISTS api_request_logs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
request_id VARCHAR(50) NOT NULL,
metodo VARCHAR(10) NOT NULL,
path VARCHAR(500) NOT NULL,
query_params JSONB,
headers_selecionados JSONB, -- Apenas headers relevantes
status_code INTEGER NOT NULL,
response_time_ms INTEGER NOT NULL,
response_size_bytes INTEGER,
usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
condominio_id UUID REFERENCES condominios(id) ON DELETE SET NULL,
ip_address INET,
user_agent TEXT,
referer TEXT,
erro BOOLEAN DEFAULT false,
erro_tipo VARCHAR(100),
erro_mensagem TEXT,
edge_function VARCHAR(100),
edge_region VARCHAR(50),
created_at TIMESTAMPTZ DEFAULT NOW()
CREATE TABLE IF NOT EXISTS anomalias_detectadas (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
metrica VARCHAR(100) NOT NULL,
condominio_id UUID REFERENCES condominios(id) ON DELETE SET NULL,
valor_atual DECIMAL(20,4) NOT NULL,
baseline_media DECIMAL(20,4) NOT NULL,
baseline_desvio DECIMAL(20,4) NOT NULL,
z_score DECIMAL(10,4) NOT NULL,
severidade VARCHAR(10) NOT NULL CHECK (severidade IN ('low', 'medium', 'high', 'critical')),
direcao VARCHAR(10) NOT NULL CHECK (direcao IN ('acima', 'abaixo')),
confirmada BOOLEAN,
falso_positivo BOOLEAN DEFAULT false,
investigada BOOLEAN DEFAULT false,
detected_at TIMESTAMPTZ DEFAULT NOW()
CREATE TABLE IF NOT EXISTS health_check_config (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
nome VARCHAR(100) NOT NULL,
url VARCHAR(500) NOT NULL,
metodo VARCHAR(10) DEFAULT 'GET',
headers JSONB DEFAULT '{}',
body JSONB,
ativo BOOLEAN DEFAULT true,
critico BOOLEAN DEFAULT false,
intervalo_segundos INTEGER DEFAULT 300, -- 5 minutos
timeout_segundos INTEGER DEFAULT 30,
expect_status INTEGER DEFAULT 200,
expect_body_contains TEXT,
alertar_apos_falhas INTEGER DEFAULT 2,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
CREATE TABLE IF NOT EXISTS metricas_globais (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
periodo TIMESTAMPTZ NOT NULL,
tipo_periodo VARCHAR(10) NOT NULL CHECK (tipo_periodo IN ('hora', 'dia')),
total_condominios_ativos INTEGER DEFAULT 0,
total_usuarios_ativos INTEGER DEFAULT 0,
total_requisicoes INTEGER DEFAULT 0,
total_erros INTEGER DEFAULT 0,
custo_infra_centavos INTEGER DEFAULT 0,
custo_apis_centavos INTEGER DEFAULT 0,
receita_estimada_centavos INTEGER DEFAULT 0,
latencia_global_p50 INTEGER,
latencia_global_p99 INTEGER,
uptime_percentual DECIMAL(5,2),
created_at TIMESTAMPTZ DEFAULT NOW(),
UNIQUE(periodo, tipo_periodo)

### Arquivo: 20251228162000_norma_chat_ai_module.sql

CREATE TABLE public.norma_chat_logs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
message TEXT NOT NULL,
response TEXT NOT NULL,
sources JSONB DEFAULT '[]'::jsonb,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
CREATE TABLE public.document_chunks (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
document_id UUID NOT NULL, -- Reference to the original document
document_type VARCHAR(50) NOT NULL, -- 'regimento', 'ata', 'convenção', etc.
document_name VARCHAR(255) NOT NULL,
page_number INTEGER,
chunk_index INTEGER NOT NULL,
content TEXT NOT NULL,
embedding vector(1536), -- OpenAI text-embedding-3-small dimension
metadata JSONB DEFAULT '{}'::jsonb,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
CREATE TABLE public.documents (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
name VARCHAR(255) NOT NULL,
type VARCHAR(50) NOT NULL, -- 'regimento', 'ata', 'convenção', etc.
file_path TEXT,
file_url TEXT,
file_size INTEGER,
mime_type VARCHAR(100),
status VARCHAR(20) NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
processed_at TIMESTAMPTZ,
created_by UUID NOT NULL REFERENCES public.usuarios(id),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

### Arquivo: 20251229000000_ai_module_final.sql

CREATE TABLE IF NOT EXISTS public.documents (
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
condominio_id UUID NOT NULL,
user_id UUID NOT NULL,
name TEXT NOT NULL,
type TEXT NOT NULL CHECK (type IN ('pdf', 'doc', 'docx', 'txt')),
file_path TEXT NOT NULL,
file_size INTEGER,
uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
processed_at TIMESTAMP WITH TIME ZONE,
status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'error')),
error_message TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
CREATE TABLE IF NOT EXISTS public.document_chunks (
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
document_type TEXT NOT NULL,
document_name TEXT NOT NULL,
page_number INTEGER,
chunk_index INTEGER NOT NULL,
content TEXT NOT NULL,
embedding vector(1536), -- OpenAI text-embedding-3-small dimensions
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
CREATE TABLE IF NOT EXISTS public.norma_chat_logs (
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
condominio_id UUID NOT NULL,
user_id UUID NOT NULL,
message TEXT NOT NULL,
response TEXT NOT NULL,
sources JSONB DEFAULT '[]'::jsonb,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

## 📝 TIPOS TYPESCRIPT DEFINIDOS

### assembleias.ts

export type AssembleiaTipo = 'AGO' | 'AGE' | 'permanente';
export type AssembleiaStatus = 'rascunho' | 'convocada' | 'em_andamento' | 'votacao' | 'encerrada' | 'arquivada';
export type PautaTipoVotacao = 'aprovacao' | 'escolha_unica' | 'escolha_multipla' | 'eleicao' | 'informativo';
export type PautaStatus = 'pendente' | 'em_votacao' | 'encerrada' | 'aprovada' | 'rejeitada' | 'sem_quorum';
export type QuorumEspecial = 'maioria_simples' | 'maioria_absoluta' | 'dois_tercos' | 'unanimidade';
export type PresencaTipo = 'presencial' | 'online' | 'procuracao' | 'voto_antecipado';
export type AssinaturaTipo = 'presidente' | 'secretario' | 'sindico' | 'testemunha';
export type ComentarioTipo = 'comentario' | 'pergunta' | 'resposta' | 'moderacao';
export interface Assembleia {
export interface CreateAssembleiaInput {
export interface UpdateAssembleiaInput extends Partial<CreateAssembleiaInput> {
export interface Pauta {
export interface PautaResultado {
export interface CreatePautaInput {
export interface UpdatePautaInput extends Partial<CreatePautaInput> {
export interface PautaOpcao {
export interface CreatePautaOpcaoInput {
export interface Presenca {
export interface Voto {
export interface VotarInput {

### comunicacao.ts

export type CanalNotificacao = 'push' | 'email' | 'whatsapp' | 'sms' | 'voz' | 'mural';
export type PrioridadeComunicado = 'baixa' | 'normal' | 'alta' | 'critica';
export type StatusEntrega = 'pendente' | 'enviado' | 'entregue' | 'lido' | 'falhou';
export type DigestFrequencia = 'diario' | 'semanal';
export type TipoEmergencia = 'incendio' | 'gas' | 'seguranca' | 'medica' | 'outro';
export interface NotificacoesConfig {
export interface UpdateNotificacoesConfigInput {
export interface UsuarioCanaisPreferencias {
export interface UpdatePreferenciasInput {
export interface Notificacao {
export interface CreateNotificacaoInput {
export interface NotificacaoEntrega {
export interface NotificacaoDashboard {
export interface MuralGerado {
export interface EmergenciaLog {
export interface DispararEmergenciaInput {
export interface ContatoInvalido {
export interface NotificacaoUsuario {
export interface NotificacoesFilters {

### derived.ts

export type Tables = Database['public']['Tables'];
export type Enums = Database['public']['Enums'];
export type Functions = Database['public']['Functions'];
export type UserRole = Enums['user_role'];
export type UserStatus = Enums['user_status'];
export type TipoResidente = Enums['tipo_residente'];
export type AssembleiaTipo = Enums['assembleia_tipo'];
export type AssembleiaStatus = Enums['assembleia_status'];
export type PautaTipoVotacao = Enums['pauta_tipo_votacao'];
export type PautaStatus = Enums['pauta_status'];
export type QuorumEspecial = Enums['quorum_especial'];
export type PresencaTipo = Enums['presenca_tipo'];
export type VotoTipo = Enums['voto_tipo'];
export type ProcuracaoStatus = Enums['procuracao_status'];
export type ComunicadoCategoria = Enums['comunicado_categoria'];
export type ComunicadoStatus = Enums['comunicado_status'];
export type TipoNotificacao = Enums['tipo_notificacao'];
export type CanalNotificacao = Enums['canal_notificacao'];
export type StatusEntrega = Enums['status_entrega'];
export type PrioridadeComunicado = Enums['prioridade_comunicado'];

### financial.ts

export type CategoriaTipo = 'receita' | 'despesa';
export type LancamentoTipo = 'receita' | 'despesa' | 'transferencia';
export type LancamentoStatus = 'pendente' | 'confirmado' | 'cancelado';
export type PrestacaoStatus = 'rascunho' | 'em_revisao' | 'aprovado' | 'rejeitado' | 'publicado';
export type TaxaTipo = 'ordinaria' | 'extra' | 'fundo_reserva' | 'multa' | 'juros' | 'outros';
export type CobrancaStatus = 'pendente' | 'pago' | 'atrasado' | 'negociado' | 'cancelado';
export interface CategoriaFinanceira {
export interface CreateCategoriaInput {
export interface UpdateCategoriaInput extends Partial<CreateCategoriaInput> {
export interface ContaBancaria {
export interface CreateContaBancariaInput {
export interface UpdateContaBancariaInput extends Partial<CreateContaBancariaInput> {
export interface Comprovante {
export interface LancamentoFinanceiro {
export interface CreateLancamentoInput {
export interface UpdateLancamentoInput extends Partial<CreateLancamentoInput> {
export interface PrestacaoContas {
export interface CreatePrestacaoInput {
export interface UpdatePrestacaoInput {
export interface TaxaUnidade {

### integracoes.ts

export type IntegracaoTipo = 'api' | 'webhook' | 'conector';
export type IntegracaoStatus = 'ativa' | 'pausada' | 'erro' | 'desativada';
export type WebhookEvento =
export type ConectorTipo = 'google_calendar' | 'asaas' | 's3_backup' | 'zapier' | 'ical';
export type ExportacaoFormato = 'csv' | 'ofx' | 'pdf' | 'xlsx';
export type ExportacaoTipo = 'financeiro' | 'moradores' | 'ocorrencias' | 'reservas' | 'completo';
export interface Integracao {
export interface OAuthTokens {
export interface CreateIntegracaoApiInput {
export interface CreateWebhookInput {
export interface WebhookConfig {
export interface UpdateWebhookConfigInput {
export interface WebhookEntrega {
export interface ApiLog {
export interface ConectorConfig {
export interface GoogleCalendarConfig {
export interface AsaasConfig {
export interface S3BackupConfig {
export interface BackupExterno {
export interface Exportacao {

### operational.ts

export type ComunicadoStatus = 'rascunho' | 'publicado' | 'arquivado';
export type ComunicadoCategoria = 'geral' | 'manutencao' | 'financeiro' | 'seguranca' | 'evento' | 'urgente' | 'obras' | 'assembleia';
export type OcorrenciaStatus = 'aberta' | 'em_analise' | 'em_andamento' | 'resolvida' | 'arquivada';
export type OcorrenciaCategoria = 'barulho' | 'vazamento' | 'iluminacao' | 'limpeza' | 'seguranca' | 'area_comum' | 'elevador' | 'portaria' | 'animais' | 'estacionamento' | 'outros';
export type Prioridade = 'baixa' | 'media' | 'alta' | 'urgente';
export type ChamadoStatus = 'novo' | 'em_atendimento' | 'aguardando_resposta' | 'resolvido' | 'fechado';
export type ChamadoCategoria = 'segunda_via_boleto' | 'atualizacao_cadastro' | 'reserva_espaco' | 'autorizacao_obra' | 'mudanca' | 'reclamacao' | 'sugestao' | 'duvida' | 'outros';
export interface Anexo {
export interface Comunicado {
export interface ComunicadoLeitura {
export interface CreateComunicadoInput {
export interface UpdateComunicadoInput extends Partial<CreateComunicadoInput> {
export interface Ocorrencia {
export interface OcorrenciaHistorico {
export interface CreateOcorrenciaInput {
export interface UpdateOcorrenciaInput {
export interface Chamado {
export interface ChamadoMensagem {
export interface CreateChamadoInput {
export interface UpdateChamadoInput {
