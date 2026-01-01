/**
 * VERSIX NORMA - Constants
 *
 * Constantes globais do sistema
 */

// ===== TIERS DO SISTEMA =====
export const TIERS = {
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const;

export type Tier = (typeof TIERS)[keyof typeof TIERS];

// ===== LIMITES POR TIER =====
export const TIER_LIMITS = {
  [TIERS.STARTER]: {
    maxUHs: 50,
    maxUsers: 100,
    maxStorageMB: 500,
    maxDocuments: 50,
    aiQueriesPerMonth: 100,
    hasWhatsApp: false,
    hasAssembleiaHibrida: false,
    hasCustomBranding: false,
    hasPrioritySupport: false,
    hasAPIAccess: false,
  },
  [TIERS.PROFESSIONAL]: {
    maxUHs: 200,
    maxUsers: 500,
    maxStorageMB: 2000,
    maxDocuments: 200,
    aiQueriesPerMonth: 1000,
    hasWhatsApp: true,
    hasAssembleiaHibrida: true,
    hasCustomBranding: false,
    hasPrioritySupport: true,
    hasAPIAccess: false,
  },
  [TIERS.ENTERPRISE]: {
    maxUHs: -1, // Ilimitado
    maxUsers: -1,
    maxStorageMB: 10000,
    maxDocuments: -1,
    aiQueriesPerMonth: -1,
    hasWhatsApp: true,
    hasAssembleiaHibrida: true,
    hasCustomBranding: true,
    hasPrioritySupport: true,
    hasAPIAccess: true,
  },
} as const;

// ===== ROLES DO SISTEMA =====
export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN_CONDO: 'admin_condo',
  SINDICO: 'sindico',
  CONSELHEIRO: 'conselheiro',
  MORADOR: 'morador',
  PORTEIRO: 'porteiro',
  ZELADOR: 'zelador',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Hierarquia de permissões (maior = mais permissão)
export const ROLE_HIERARCHY: Record<Role, number> = {
  [ROLES.SUPERADMIN]: 100,
  [ROLES.ADMIN_CONDO]: 90,
  [ROLES.SINDICO]: 80,
  [ROLES.CONSELHEIRO]: 60,
  [ROLES.MORADOR]: 40,
  [ROLES.PORTEIRO]: 30,
  [ROLES.ZELADOR]: 30,
};

// ===== STATUS =====
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
} as const;

export type Status = (typeof STATUS)[keyof typeof STATUS];

// ===== CATEGORIAS DE COMUNICADO =====
export const COMUNICADO_CATEGORIES = {
  GERAL: 'geral',
  MANUTENCAO: 'manutencao',
  FINANCEIRO: 'financeiro',
  SEGURANCA: 'seguranca',
  EVENTO: 'evento',
  URGENTE: 'urgente',
} as const;

export type ComunicadoCategory = (typeof COMUNICADO_CATEGORIES)[keyof typeof COMUNICADO_CATEGORIES];

// ===== PRIORIDADES =====
export const PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type Priority = (typeof PRIORITIES)[keyof typeof PRIORITIES];

// ===== LIMITES GERAIS =====
export const LIMITS = {
  MAX_FILE_SIZE_MB: 10,
  MAX_UPLOAD_FILES: 5,
  MAX_COMUNICADO_LENGTH: 5000,
  MAX_TITLE_LENGTH: 200,
  MIN_PASSWORD_LENGTH: 8,
  SESSION_DURATION_HOURS: 24,
  IMPERSONATE_MAX_HOURS: 2,
  RATE_LIMIT_REQUESTS_PER_MINUTE: 60,
  AI_MAX_TOKENS_RESPONSE: 2000,
} as const;

// ===== FORMATOS =====
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  SPREADSHEETS: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
} as const;

// ===== APP CONFIG =====
export const APP_CONFIG = {
  NAME: 'Versix Norma',
  VERSION: '1.0.1',
  SUPPORT_EMAIL: 'suporte@versixnorma.com.br',
  DEFAULT_LOCALE: 'pt-BR',
  DEFAULT_TIMEZONE: 'America/Sao_Paulo',
} as const;
