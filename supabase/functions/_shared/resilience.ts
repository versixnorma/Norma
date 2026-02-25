// Circuit Breaker + Retry com Backoff Exponencial para Edge Functions

interface FetchWithResilienceOptions {
  /** Timeout em ms (default: 15s) */
  timeoutMs?: number;
  /** Máximo de retries (default: 2) */
  maxRetries?: number;
  /** Backoff base em ms (default: 1000) */
  backoffBaseMs?: number;
  /** Nome da operação para logging */
  operationName: string;
}

export async function fetchWithResilience(
  url: string,
  init: RequestInit,
  options: FetchWithResilienceOptions
): Promise<Response> {
  const {
    timeoutMs = 15000,
    maxRetries = 2,
    backoffBaseMs = 1000,
    operationName,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Retry on 429 (rate limit) and 5xx (server errors)
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = response.headers.get('retry-after');
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : backoffBaseMs * Math.pow(2, attempt);

        if (attempt < maxRetries) {
          console.warn(
            `[${operationName}] ${response.status}, retry ${attempt + 1}/${maxRetries} in ${waitMs}ms`
          );
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (lastError.name === 'AbortError') {
        console.error(`[${operationName}] Timeout after ${timeoutMs}ms (attempt ${attempt + 1})`);
      }

      if (attempt < maxRetries) {
        const waitMs = backoffBaseMs * Math.pow(2, attempt);
        console.warn(`[${operationName}] Error, retry ${attempt + 1}/${maxRetries} in ${waitMs}ms`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
    }
  }

  throw lastError ?? new Error(`[${operationName}] All ${maxRetries + 1} attempts failed`);
}

/** Mensagem fallback quando IA está indisponível */
export const AI_FALLBACK_RESPONSE = {
  response:
    'Desculpe, estou com dificuldade para processar sua solicitação no momento. ' +
    'Por favor, tente novamente em alguns minutos. Se precisar de ajuda urgente, ' +
    'entre em contato com o síndico ou use o botão SOS.',
  sources: [],
  suggestions: ['Tentar novamente', 'Falar com o síndico', 'Consultar FAQ'],
  fallback: true,
};
