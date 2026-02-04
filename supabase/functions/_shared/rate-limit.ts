// ============================================
// VERSIX NORMA - Rate Limiting Utilities
// ============================================
// P0 Security Fix: Implement rate limiting middleware
// for Edge Functions to prevent DoS and brute force attacks
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset_at: string | null;
  retry_after?: number;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
}

/**
 * Get identifier from request (IP or user ID)
 */
export function getIdentifier(req: Request, userId?: string): string {
  // Prefer user ID if authenticated
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfIp = req.headers.get('cf-connecting-ip');

  const ip = cfIp || realIp || forwarded?.split(',')[0]?.trim() || 'unknown';
  return `ip:${ip}`;
}

/**
 * Check rate limit using Supabase function
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string = 'default'
): Promise<RateLimitResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Rate limiting disabled: missing Supabase credentials');
    return { allowed: true, remaining: -1, reset_at: null };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase.rpc('rate_limit_request', {
      p_identifier: identifier,
      p_endpoint: endpoint,
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      // Fail open: allow request if rate limiting fails
      return { allowed: true, remaining: -1, reset_at: null };
    }

    return data as RateLimitResult;
  } catch (err) {
    console.error('Rate limit error:', err);
    // Fail open
    return { allowed: true, remaining: -1, reset_at: null };
  }
}

/**
 * Generate rate limit headers for response
 */
export function getRateLimitHeaders(
  result: RateLimitResult,
  limit: number = 100
): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
    'X-RateLimit-Reset': result.reset_at || '',
  };

  if (result.retry_after) {
    headers['Retry-After'] = String(result.retry_after);
  }

  return headers;
}

/**
 * Create rate limit exceeded response
 */
export function rateLimitExceededResponse(
  result: RateLimitResult,
  req?: Request
): Response {
  const headers = getRateLimitHeaders(result);

  // Import CORS helpers dynamically to avoid circular dependency
  const corsOrigin = req?.headers.get('origin') || '*';

  return new Response(
    JSON.stringify({
      error: 'Taxa de requisições excedida. Tente novamente em breve.',
      success: false,
      retry_after: result.retry_after,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsOrigin,
        ...headers,
      },
    }
  );
}

/**
 * Rate limit middleware for Edge Functions
 *
 * Usage:
 * ```typescript
 * import { withRateLimit } from '../_shared/rate-limit.ts';
 *
 * Deno.serve(async (req) => {
 *   const rateLimitResponse = await withRateLimit(req, 'my-endpoint');
 *   if (rateLimitResponse) return rateLimitResponse;
 *
 *   // Continue with normal handler...
 * });
 * ```
 */
export async function withRateLimit(
  req: Request,
  endpoint: string = 'default',
  userId?: string
): Promise<Response | null> {
  const identifier = getIdentifier(req, userId);
  const result = await checkRateLimit(identifier, endpoint);

  if (!result.allowed) {
    return rateLimitExceededResponse(result, req);
  }

  return null;
}

/**
 * Higher-order function to wrap handlers with rate limiting
 *
 * Usage:
 * ```typescript
 * import { rateLimited } from '../_shared/rate-limit.ts';
 *
 * const handler = rateLimited('my-endpoint', async (req) => {
 *   // Your handler code
 *   return new Response('OK');
 * });
 *
 * Deno.serve(handler);
 * ```
 */
export function rateLimited(
  endpoint: string,
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    // Skip rate limiting for OPTIONS (CORS preflight)
    if (req.method === 'OPTIONS') {
      return handler(req);
    }

    const rateLimitResponse = await withRateLimit(req, endpoint);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get rate limit result for headers
    const identifier = getIdentifier(req);
    const result = await checkRateLimit(identifier, endpoint);
    const rateLimitHeaders = getRateLimitHeaders(result);

    // Call the actual handler
    const response = await handler(req);

    // Clone response and add rate limit headers
    const newHeaders = new Headers(response.headers);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  };
}
