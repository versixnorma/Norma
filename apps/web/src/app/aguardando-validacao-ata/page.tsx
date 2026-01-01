'use client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AguardandoValidacaoAtaPage() {
  const { profile, isAuthenticated, loading, logout } = useAuthContext();
  const router = useRouter();

  useEffect(() => { if (!loading && !isAuthenticated) router.push('/login'); if (!loading && profile?.status === 'active') router.push('/home'); }, [loading, isAuthenticated, profile, router]);
  const handleLogout = async () => { await logout(); router.push('/login'); };

  if (loading) return (<div className="min-h-screen flex items-center justify-center bg-primary"><div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" /></div>);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary-dark flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-8"><span className="material-symbols-outlined text-white text-5xl">description</span></div>
        <h1 className="text-2xl font-bold text-white text-center mb-3">Validando Ata de Eleição</h1>
        <p className="text-blue-100 text-center max-w-sm mb-8">Sua ata foi enviada e está sendo analisada. Prazo: até 48h úteis.</p>
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 w-full max-w-sm mb-8">
          <h3 className="font-semibold text-white mb-4">Status da Validação</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3"><span className="material-symbols-outlined text-green-400">check_circle</span><span className="text-blue-100 text-sm">Cadastro recebido</span></div>
            <div className="flex items-center gap-3"><span className="material-symbols-outlined text-green-400">check_circle</span><span className="text-blue-100 text-sm">Ata enviada</span></div>
            <div className="flex items-center gap-3"><span className="material-symbols-outlined text-amber-400 animate-pulse">pending</span><span className="text-blue-100 text-sm">Aguardando análise</span></div>
            <div className="flex items-center gap-3"><span className="material-symbols-outlined text-gray-500">radio_button_unchecked</span><span className="text-gray-400 text-sm">Aprovação final</span></div>
          </div>
        </div>
        <div className="bg-amber-500/20 rounded-xl p-4 w-full max-w-sm"><div className="flex gap-3"><span className="material-symbols-outlined text-amber-400">info</span><p className="text-xs text-amber-200">Você receberá um email assim que a validação for concluída.</p></div></div>
      </div>
      <div className="bg-white dark:bg-card-dark rounded-t-[2.5rem] p-6 shadow-2xl">
        <div className="flex flex-col gap-3"><button onClick={() => window.location.reload()} className="w-full py-4 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2"><span className="material-symbols-outlined">refresh</span>Verificar Status</button><button onClick={handleLogout} className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm">Sair da conta</button></div>
      </div>
    </div>
  );
}
