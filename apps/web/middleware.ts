import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Rotas públicas que não requerem autenticação
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/reset-password',
  '/auth/callback',
  '/auth/confirm',
  '/_next',
  '/api/health',
  '/favicon.ico',
  '/manifest.json',
  '/sw.js',
];

// Rotas protegidas que requerem autenticação
const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/financeiro',
  '/moradores',
  '/comunicados',
  '/documentos',
  '/reservas',
  '/assembleia',
  '/norma-ai',
  '/configuracoes',
];

/**
 * Middleware Next.js para validação de sessão
 * Protege rotas autenticadas e redireciona usuários não autenticados
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // CSP Policy - Relaxed for Next.js compatibility
  // Note: 'unsafe-eval' is required for Next.js in production
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https:;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: blob: https: https://*.supabase.co https://images.unsplash.com;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' https://*.supabase.co https://api.groq.com https://api.openai.com wss://*.supabase.co;
    frame-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Set Response Header
  response.headers.set('Content-Security-Policy', cspHeader);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Permitir acesso a rotas públicas
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return response;
  }

  // Verificar sessão para rotas protegidas
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    // Se não houver usuário, redirecionar para login
    if (!user) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

// Configurar quais rotas o middleware deve processar
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next (todos os assets e internals do Next.js)
     * - favicon.ico e ficheiros estáticos de imagem
     */
    '/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
