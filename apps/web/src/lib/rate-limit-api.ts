// In-memory rate limiter para API routes Next.js
// Complementa o rate limiting no banco de dados (supabase/functions/_shared/rate-limit.ts)

const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 60; // 60 req/min por IP

const store = new Map<string, { count: number; resetAt: number }>();

// Cleanup de entradas expiradas a cada 5 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of store) {
      if (val.resetAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  return { allowed: entry.count <= MAX_REQUESTS, remaining };
}
