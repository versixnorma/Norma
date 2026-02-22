import { cookies, headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { AdminLayout } from '@/components/admin';
import type { UsuarioWithCondominios } from '@/hooks/auth/types';
import type { UsuarioCondominioJoin } from '@/hooks/auth/types';

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '';

  // Página de login admin não precisa de layout nem de auth
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Pre-load auth data no servidor para evitar fetchProfile assíncrono no cliente.
  // O middleware já validou a sessão (getUser via JWT) — aqui usamos getSession()
  // que lê dos cookies sem fazer request de rede adicional.
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;
  let initialProfile: UsuarioWithCondominios | null = null;

  if (user) {
    const { data: profileData } = await supabase
      .from('usuarios' as any)
      .select(
        `
        *,
        usuario_condominios (
          condominio:condominio_id (
            id,
            nome
          ),
          role,
          status
        )
      `
      )
      .eq('auth_id', user.id);

    if (profileData && profileData.length > 0) {
      const rawUser = profileData[0] as any;

      const userCondominios = (rawUser.usuario_condominios || [])
        .filter((uc: UsuarioCondominioJoin) => uc.status === 'active' || uc.status === 'ativo')
        .map((uc: UsuarioCondominioJoin) => ({
          condominio_id: uc.condominio.id,
          nome: uc.condominio.nome,
          role: uc.role,
          unidade_id: rawUser.unidade_id,
          unidade_identificador: undefined,
        }));

      const condominioAtual =
        userCondominios.length > 0
          ? {
              id: userCondominios[0].condominio_id,
              nome: userCondominios[0].nome,
              role: userCondominios[0].role,
            }
          : null;

      initialProfile = {
        ...rawUser,
        condominio_id: undefined,
        condominios: userCondominios.map((cond: any) => ({
          condominio_id: cond.condominio_id,
          role: cond.role,
          unidade_identificador: cond.unidade_identificador,
          condominio: { nome: cond.nome },
        })),
        condominio_atual: condominioAtual,
        usuario_condominios: [],
      } as unknown as UsuarioWithCondominios;
    }
  }

  return (
    <AdminLayout initialUser={user} initialSession={session} initialProfile={initialProfile}>
      {children}
    </AdminLayout>
  );
}
