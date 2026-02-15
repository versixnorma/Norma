'use client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AguardandoAprovacaoPage() {
  const { profile, isAuthenticated, loading, logout } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!loading && profile?.status === 'active') {
      const isSuperAdmin = profile.role === 'superadmin';
      const hasActiveCondominio = (profile.condominios?.length || 0) > 0;

      if (isSuperAdmin && !profile.condominio_atual) {
        router.push('/admin/dashboard');
      } else if (isSuperAdmin || hasActiveCondominio) {
        router.push('/home');
      }
    }
  }, [loading, isAuthenticated, profile, router]);
  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </div>
    );

  return (
    <div className="to-primary-dark flex min-h-screen flex-col bg-gradient-to-b from-primary">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
          <span className="material-symbols-outlined text-5xl text-white">hourglass_top</span>
        </div>
        <h1 className="mb-3 text-center text-2xl font-bold text-white">Aguardando Aprovação</h1>
        <p className="mb-8 max-w-sm text-center text-blue-100">
          Seu cadastro foi recebido e está aguardando a aprovação do síndico do condomínio.
        </p>
        <div className="mb-8 w-full max-w-sm rounded-2xl bg-white/10 p-6 backdrop-blur-md">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              <span className="text-lg font-bold text-white">
                {profile?.nome?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div>
              <p className="font-semibold text-white">{profile?.nome || 'Usuário'}</p>
              <p className="text-sm text-blue-200">{profile?.email}</p>
            </div>
          </div>
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center gap-2 text-blue-100">
              <span className="material-symbols-outlined text-lg">schedule</span>
              <span className="text-sm">Status: Pendente</span>
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-t-[2.5rem] bg-white p-6 shadow-2xl dark:bg-card-dark">
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-white"
          >
            <span className="material-symbols-outlined">refresh</span>Verificar Status
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-3 text-sm text-gray-500 hover:text-gray-700"
          >
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}
