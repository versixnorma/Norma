// ============================================
// VERSIX NORMA - Shared Edge Function Utilities
// ============================================

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message, success: false }, status);
}

export function unauthorizedResponse(message = 'Não autorizado'): Response {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message = 'Acesso negado'): Response {
  return errorResponse(message, 403);
}

export function notFoundResponse(message = 'Não encontrado'): Response {
  return errorResponse(message, 404);
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
