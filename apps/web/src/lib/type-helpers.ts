import type { Json } from '@versix/shared';

/**
 * Helpers para converter tipos Json do banco para tipos específicos
 */

// Tipo genérico para anexos
export interface Anexo {
  url: string;
  tipo: string;
  nome: string;
  tamanho: number;
  uploaded_at?: string;
}

// Converter Json para Anexo[]
export function parseAnexos(anexos: Json | null | undefined): Anexo[] {
  if (!anexos || !Array.isArray(anexos)) return [];
  return anexos as Anexo[];
}

// Converter Json para objeto genérico
export function parseJson<T>(json: Json | null | undefined, defaultValue: T): T {
  if (json === null || json === undefined) return defaultValue;
  return json as T;
}

// Safe null coalesce para joins
export function safeJoin<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}

// Converter Anexo[] para Json (para enviar ao banco)
export function serializeAnexos(anexos: Anexo[] | undefined): Json {
  if (!anexos || anexos.length === 0) return [];
  return JSON.stringify(anexos) as unknown as Json;
}

// Converter string | null para string | undefined
export function nullToUndefined(value: string | null): string | undefined {
  return value ?? undefined;
}
