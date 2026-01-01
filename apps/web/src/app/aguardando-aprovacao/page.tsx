'use client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AguardandoAprovacaoPage() {
  const { profile, isAuthenticated, loading, logout } = useAuthContext();
  const router = useRouter();

  useEffect(() => { if (!loading && !isAuthenticated) router.push('/login'); if (!loading && profile?.status === 'active') router.push('/home'); }, [loading, isAuthenticated, profile, router]);
  const handleLogout = async () => { await logout(); router.push('/login'); };

  if (loading) return (<div className="min-h-screen flex items-center justify-center bg-primary"><div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" /></div>);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary-dark flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-8 animate-pulse"><span className="material-symbols-outlined text-white text-5xl">hourglass_top</span></div>
        <h1 className="text-2xl font-bold text-white text-center mb-3">Aguardando Aprovação</h1>
        <p className="text-blue-100 text-center max-w-sm mb-8">Seu cadastro foi recebido e está aguardando a aprovação do síndico do condomínio.</p>
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 w-full max-w-sm mb-8">
          <div className="flex items-center gap-4 mb-4"><div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"><span className="text-white font-bold text-lg">{profile?.nome?.charAt(0)?.toUpperCase() || '?'}</span></div><div><p className="font-semibold text-white">{profile?.nome || 'Usuário'}</p><p className="text-sm text-blue-200">{profile?.email}</p></div></div>
          <div className="border-t border-white/10 pt-4"><div className="flex items-center gap-2 text-blue-100"><span className="material-symbols-outlined text-lg">schedule</span><span className="text-sm">Status: Pendente</span></div></div>
        </div>
      </div>
      <div className="bg-white dark:bg-card-dark rounded-t-[2.5rem] p-6 shadow-2xl">
        <div className="flex flex-col gap-3"><button onClick={() => window.location.reload()} className="w-full py-4 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2"><span className="material-symbols-outlined">refresh</span>Verificar Status</button><button onClick={handleLogout} className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm">Sair da conta</button></div>
      </div>
    </div>
  );
}
