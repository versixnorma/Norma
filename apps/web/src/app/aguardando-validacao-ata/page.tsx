'use client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AguardandoValidacaoAtaPage() {
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
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
          <span className="material-symbols-outlined text-5xl text-white">description</span>
        </div>
        <h1 className="mb-3 text-center text-2xl font-bold text-white">Validando Ata de Eleição</h1>
        <p className="mb-8 max-w-sm text-center text-blue-100">
          Sua ata foi enviada e está sendo analisada. Prazo: até 48h úteis.
        </p>
        <div className="mb-8 w-full max-w-sm rounded-2xl bg-white/10 p-6 backdrop-blur-md">
          <h3 className="mb-4 font-semibold text-white">Status da Validação</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-green-400">check_circle</span>
              <span className="text-sm text-blue-100">Cadastro recebido</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-green-400">check_circle</span>
              <span className="text-sm text-blue-100">Ata enviada</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined animate-pulse text-amber-400">
                pending
              </span>
              <span className="text-sm text-blue-100">Aguardando análise</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-gray-500">
                radio_button_unchecked
              </span>
              <span className="text-sm text-gray-400">Aprovação final</span>
            </div>
          </div>
        </div>
        <div className="w-full max-w-sm rounded-xl bg-amber-500/20 p-4">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-amber-400">info</span>
            <p className="text-xs text-amber-200">
              Você receberá um email assim que a validação for concluída.
            </p>
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
