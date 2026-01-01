/**
 * Sanitiza input para uso em queries LIKE/ILIKE do Supabase
 * Remove caracteres especiais e previne SQL injection simples
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  // Remove caracteres perigosos e espaços extras
  return query.replace(/[%_';"\\]/g, '').trim();
}

/**
 * Sanitiza UUID para queries
 */
export function sanitizeUUID(uuid: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) throw new Error('UUID inválido');
  return uuid;
}
