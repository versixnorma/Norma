/**
 * VERSIX NORMA - Shared Package
 *
 * Exporta tipos derivados do schema do banco (fonte da verdade).
 */

// Derived Types (fonte da verdade - derivados do schema do banco)
export * from './src/types/derived';

// Database Types (raw exports do Supabase - use apenas se necessário)
export type { Database, Json } from './database.types';

// Input/Output types for operations (from validators)
export type {
  CreateIntegracaoApiInput,
  CreateWebhookInput,
  IntegracaoDashboard,
  IntegracoesFilters,
  UpdateWebhookConfigInput,
} from './src/validators/integracoes';

// Operational input types (only those not in derived)
export type {
  Comentario,
  CreateAssembleiaInput,
  CreateComentarioInput,
  CreatePautaInput,
  PautaStatus,
  Presenca,
  UpdateAssembleiaInput,
  UpdatePautaInput,
  VotarInput,
  Voto,
} from './src/types/assembleias';

export type {
  AvaliarChamadoInput,
  CreateChamadoInput,
  CreateComunicadoInput,
  CreateMensagemInput,
  CreateOcorrenciaInput,
  UpdateChamadoInput,
  UpdateComunicadoInput,
  UpdateOcorrenciaInput,
} from './src/types/operational';

export * from './src/types/financial';

// FAQ types
export type { CreateFAQInput, FAQFilters, UpdateFAQInput } from './src/types/derived';

// Feature Flags
export type { FeatureFlag } from './src/types/derived';

// Missing Exports
export type { ApiLog, WebhookEntrega } from './src/types/derived';
export type { ApiLogsFilters } from './src/validators/integracoes';
