import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Rotas públicas que não requerem autenticação
const PUBLIC_ROUTES = [
  '/login',
  '/admin/login',
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
  '/home',
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
  '/admin',
  '/aguardando-aprovacao',
  '/aguardando-validacao-ata',
];

// CSP Policy - Relaxed for Next.js compatibility
// Note: 'unsafe-eval' is required for Next.js in production
const CSP_HEADER = `
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

/**
 * Middleware Next.js para validação de sessão
 * Protege rotas autenticadas e redireciona usuários não autenticados
 */
export async function middleware(request: NextRequest) {
  // Propaga o pathname para Server Components via request header.
  // Server Components lêem este header via headers().get('x-pathname').
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // getAll/setAll é o padrão moderno do @supabase/ssr (v0.4+).
        // O padrão antigo get/set/remove chamava set() individualmente para cada
        // cookie chunk, e cada chamada criava um NextResponse.next() novo —
        // sobrescrevendo os cookies anteriores. Quando a sessão JWT é dividida em
        // múltiplos chunks (ex.: auth-token.0, .1, .2), apenas o último chunk
        // chegava ao browser, causando getSession() → null → loop auth/login.
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Propaga os novos cookies para o request (leituras subsequentes no middleware)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Cria UM ÚNICO response novo com TODOS os cookies de uma vez
          // (mantém o requestHeaders com x-pathname)
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Aplica CSP no response final (após possível troca de response pelo setAll acima)
  response.headers.set('Content-Security-Policy', CSP_HEADER);

  const { pathname } = request.nextUrl;

  // Prevenir cache de rotas admin diretamente no middleware — garante que CDN e
  // browser nunca armazenem respostas de páginas protegidas, independentemente do
  // que next.config.mjs configurar (aplicado depois do middleware em alguns cenários).
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
  }

  // Redirect root /admin to the admin login or dashboard depending on session
  if (pathname === '/admin' || pathname === '/admin/') {
    if (user) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Permitir acesso a rotas públicas
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return response;
  }

  // Verificar sessão para rotas protegidas
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    const isAdminRoute = pathname.startsWith('/admin');

    // Se não houver usuário, redirecionar para login
    if (!user) {
      const redirectUrl = new URL(isAdminRoute ? '/admin/login' : '/login', request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Admin possui validação de role no AuthGuard/layout.
    // Aqui garantimos consistência do fluxo de aprovação para a área de morador.
    if (!isAdminRoute) {
      const { data: profile } = await supabase
        .from('usuarios')
        .select('id, role, status')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (!profile) {
        const redirectUrl = new URL('/login', request.url);
        redirectUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(redirectUrl);
      }

      const isSuperAdmin = profile.role === 'superadmin';
      const isWaitingRoute = pathname.startsWith('/aguardando-aprovacao');

      // Se já está ativo e tenta abrir tela de espera, manda para o sistema.
      if (isWaitingRoute && profile.status === 'active') {
        if (isSuperAdmin) {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }

        const { count } = await supabase
          .from('usuario_condominios')
          .select('id', { head: true, count: 'exact' })
          .eq('usuario_id', profile.id)
          .eq('status', 'active');

        if ((count || 0) > 0) {
          return NextResponse.redirect(new URL('/home', request.url));
        }
      }

      // Não ativo -> deve ficar na tela de aguardando aprovação
      if (!isWaitingRoute && profile.status !== 'active') {
        return NextResponse.redirect(new URL('/aguardando-aprovacao', request.url));
      }

      // Ativo sem vínculo condominial ativo também não acessa o app
      if (!isWaitingRoute && !isSuperAdmin) {
        const { count } = await supabase
          .from('usuario_condominios')
          .select('id', { head: true, count: 'exact' })
          .eq('usuario_id', profile.id)
          .eq('status', 'active');

        if ((count || 0) === 0) {
          return NextResponse.redirect(new URL('/aguardando-aprovacao', request.url));
        }
      }
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
