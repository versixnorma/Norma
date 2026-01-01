import { z } from 'zod';

// ENUMs
export const categoriaTipoSchema = z.enum(['receita', 'despesa']);
export const lancamentoTipoSchema = z.enum(['receita', 'despesa', 'transferencia']);
export const lancamentoStatusSchema = z.enum(['pendente', 'confirmado', 'cancelado']);
export const prestacaoStatusSchema = z.enum(['rascunho', 'em_revisao', 'aprovado', 'rejeitado', 'publicado']);
export const taxaTipoSchema = z.enum(['ordinaria', 'extraordinaria', 'fundo_reserva', 'multa', 'juros', 'outros']);
export const cobrancaStatusSchema = z.enum(['pendente', 'pago', 'atrasado', 'negociado', 'cancelado']);

// Comprovante
export const comprovanteSchema = z.object({
  url: z.string().url(),
  nome: z.string().min(1).max(255),
  tipo: z.string(),
  tamanho: z.number().positive().max(10485760)
});

// Categorias Financeiras
export const createCategoriaSchema = z.object({
  codigo: z.string().min(1).max(20).regex(/^[\d.]+$/, 'Código deve conter apenas números e pontos'),
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  descricao: z.string().max(500).optional(),
  tipo: categoriaTipoSchema,
  parent_id: z.string().uuid().optional(),
  orcamento_mensal: z.number().min(0).default(0),
  ordem: z.number().int().min(0).default(0)
});

export const updateCategoriaSchema = createCategoriaSchema.partial().extend({
  id: z.string().uuid(),
  ativo: z.boolean().optional()
});

// Contas Bancárias
export const createContaBancariaSchema = z.object({
  banco_codigo: z.string().min(3).max(10),
  banco_nome: z.string().min(3).max(100),
  agencia: z.string().min(1).max(10),
  conta: z.string().min(1).max(20),
  tipo_conta: z.enum(['corrente', 'poupanca']).default('corrente'),
  nome_exibicao: z.string().min(3).max(100),
  saldo_inicial: z.number().default(0),
  principal: z.boolean().default(false)
});

export const updateContaBancariaSchema = createContaBancariaSchema.partial().extend({
  id: z.string().uuid(),
  ativo: z.boolean().optional()
});

// Lançamentos Financeiros
export const createLancamentoSchema = z.object({
  tipo: lancamentoTipoSchema,
  categoria_id: z.string().uuid(),
  conta_bancaria_id: z.string().uuid().optional(),
  valor: z.number().positive('Valor deve ser positivo'),
  data_competencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  data_vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  data_pagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  descricao: z.string().min(5, 'Descrição deve ter pelo menos 5 caracteres').max(500),
  observacoes: z.string().max(1000).optional(),
  fornecedor_nome: z.string().max(200).optional(),
  fornecedor_documento: z.string().max(20).optional(),
  numero_documento: z.string().max(50).optional(),
  comprovantes: z.array(comprovanteSchema).default([]),
  status: lancamentoStatusSchema.default('pendente')
});

export const updateLancamentoSchema = createLancamentoSchema.partial().extend({
  id: z.string().uuid()
});

// Prestação de Contas
export const createPrestacaoSchema = z.object({
  mes_referencia: z.string().regex(/^\d{4}-\d{2}-01$/, 'Mês deve ser primeiro dia do mês'),
  observacoes_sindico: z.string().max(2000).optional()
});

export const updatePrestacaoSchema = z.object({
  id: z.string().uuid(),
  status: prestacaoStatusSchema.optional(),
  parecer_conselho: z.string().max(2000).optional(),
  observacoes_sindico: z.string().max(2000).optional()
});

// Taxas de Unidades
export const createTaxaSchema = z.object({
  unidade_id: z.string().uuid(),
  mes_referencia: z.string().regex(/^\d{4}-\d{2}-01$/),
  tipo: taxaTipoSchema.default('ordinaria'),
  valor_base: z.number().positive('Valor deve ser positivo'),
  desconto: z.number().min(0).default(0),
  acrescimo: z.number().min(0).default(0),
  data_vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  descricao: z.string().max(200).optional()
});

export const updateTaxaSchema = z.object({
  id: z.string().uuid(),
  status: cobrancaStatusSchema.optional(),
  data_pagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  valor_pago: z.number().positive().optional(),
  desconto: z.number().min(0).optional(),
  acrescimo: z.number().min(0).optional()
});

// Configurações Financeiras
export const updateConfiguracaoSchema = z.object({
  dia_vencimento: z.number().int().min(1).max(28).optional(),
  taxa_ordinaria_base: z.number().min(0).optional(),
  fundo_reserva_percentual: z.number().min(0).max(100).optional(),
  multa_atraso_percentual: z.number().min(0).max(100).optional(),
  juros_dia_percentual: z.number().min(0).max(10).optional(),
  desconto_antecipacao_percentual: z.number().min(0).max(100).optional(),
  dias_antecipacao_desconto: z.number().int().min(0).optional(),
  texto_boleto: z.string().max(500).optional()
});

// Filtros
export const lancamentoFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  tipo: lancamentoTipoSchema.optional(),
  categoria_id: z.string().uuid().optional(),
  conta_bancaria_id: z.string().uuid().optional(),
  status: lancamentoStatusSchema.optional(),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
  busca: z.string().optional()
});

export const taxaFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  unidade_id: z.string().uuid().optional(),
  mes_referencia: z.string().optional(),
  status: cobrancaStatusSchema.optional(),
  tipo: taxaTipoSchema.optional()
});

// Type exports
export type CreateCategoriaInput = z.infer<typeof createCategoriaSchema>;
export type UpdateCategoriaInput = z.infer<typeof updateCategoriaSchema>;
export type CreateContaBancariaInput = z.infer<typeof createContaBancariaSchema>;
export type UpdateContaBancariaInput = z.infer<typeof updateContaBancariaSchema>;
export type CreateLancamentoInput = z.infer<typeof createLancamentoSchema>;
export type UpdateLancamentoInput = z.infer<typeof updateLancamentoSchema>;
export type CreatePrestacaoInput = z.infer<typeof createPrestacaoSchema>;
export type UpdatePrestacaoInput = z.infer<typeof updatePrestacaoSchema>;
export type CreateTaxaInput = z.infer<typeof createTaxaSchema>;
export type UpdateTaxaInput = z.infer<typeof updateTaxaSchema>;
export type UpdateConfiguracaoInput = z.infer<typeof updateConfiguracaoSchema>;
