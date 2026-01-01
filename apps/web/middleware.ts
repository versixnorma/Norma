import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
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
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { pathname } = req.nextUrl;

  // Permitir acesso a rotas públicas
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return res;
  }

  // Verificar sessão para rotas protegidas
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Se não houver sessão, redirecionar para login
    if (!session) {
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Validar que a sessão não expirou
    const expiresAt = session.expires_at;
    if (expiresAt && expiresAt * 1000 < Date.now()) {
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('redirect', pathname);
      redirectUrl.searchParams.set('expired', 'true');
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

// Configurar quais rotas o middleware deve processar
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
