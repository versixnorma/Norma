// ============================================
// VERSIX NORMA - Shared Edge Function Utilities
// ============================================

// Allowed origins for CORS - add your production domains here
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005',
  'http://localhost:3006',
  'https://versixnorma.com',
  'https://www.versixnorma.com',
  'https://app.versixnorma.com',
  'https://norma.versix.com.br',
  'https://versix-norma.vercel.app',
];

// Helper to get CORS origin based on request
function getCorsOrigin(req: Request): string {
  const origin = req.headers.get('origin');

  // If origin is in allowlist, return it
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }

  // Check for Vercel preview deployments (*.vercel.app)
  if (origin && origin.endsWith('.vercel.app')) {
    return origin;
  }

  // Default: return first allowed origin (blocks cross-origin requests)
  return ALLOWED_ORIGINS[0];
}

// Generate CORS headers for a specific request
export function getCorsHeaders(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(req),
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-request-id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

// Legacy export for backwards compatibility (uses restrictive default)
export const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }
  return null;
}

// Response helpers with dynamic CORS support
export function jsonResponse<T>(data: T, status = 200, req?: Request): Response {
  const headers = req ? getCorsHeaders(req) : corsHeaders;
  return new Response(JSON.stringify(data), {
    headers: { ...headers, 'Content-Type': 'application/json' },
    status,
  });
}

export function errorResponse(message: string, status = 400, req?: Request): Response {
  return jsonResponse({ error: message, success: false }, status, req);
}

export function unauthorizedResponse(message = 'Não autorizado', req?: Request): Response {
  return errorResponse(message, 401, req);
}

export function forbiddenResponse(message = 'Acesso negado', req?: Request): Response {
  return errorResponse(message, 403, req);
}

export function notFoundResponse(message = 'Não encontrado', req?: Request): Response {
  return errorResponse(message, 404, req);
}

export function serverErrorResponse(message = 'Erro interno do servidor', req?: Request): Response {
  return errorResponse(message, 500, req);
}

// Tipos compartilhados
export interface AuthUser {
  id: string;
  email: string;
  usuario_id: string;
  nome: string;
  role: string;
  status: string;
  condominio_id: string | null;
  unidade_id: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
