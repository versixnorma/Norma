'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import { useChamados } from '@/hooks/useChamados';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ProfilePageProps {
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export function ProfilePage({ onScroll }: ProfilePageProps) {
  const router = useRouter();
  const { profile, logout } = useAuthContext();

  const unidadeInfo = profile?.condominios?.find(
    c => c.condominio_id === profile?.condominio_atual?.id
  );

  const { meusChamados } = useChamados({
    condominioId: profile?.condominio_atual?.id || null,
    userId: profile?.id || null,
    apenasMinhaUnidade: true,
  });

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      toast.success('Até logo!');
      router.push('/login');
    }
  };

  const userInitials = profile?.nome
    ? profile.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'US';

  return (
    <div
      className="flex-1 overflow-y-auto hide-scroll pb-32 pt-6 relative z-0 px-6 animate-slide-up space-y-6"
      onScroll={onScroll}
    >
      {/* Avatar Section */}
      <div className="flex flex-col items-center pt-2">
        <div className="w-24 h-24 rounded-full border-4 border-white dark:border-card-dark shadow-lg overflow-hidden mb-3 relative group cursor-pointer bg-secondary flex items-center justify-center">
          <span className="text-white font-bold text-3xl">{userInitials}</span>
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="material-symbols-outlined text-white">edit</span>
          </div>
        </div>
        <h2 className="text-xl font-bold text-primary dark:text-white font-display">
          {profile?.nome || 'Usuário'}
        </h2>
        <p className="text-sm text-text-sub font-medium">
          {profile?.condominio_atual?.nome || 'Condomínio'}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
          {unidadeInfo?.unidade_identificador && (
            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {unidadeInfo.unidade_identificador}
            </span>
          )}
          <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="material-symbols-outlined text-[10px]">check_circle</span>
            {profile?.status === 'active' ? 'Ativo' : profile?.status}
          </span>
          <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {profile?.condominio_atual?.role || 'morador'}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button className="bg-white dark:bg-card-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors group">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-xl">qr_code_2</span>
          </div>
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Meu QR Code</span>
        </button>
        <button className="bg-white dark:bg-card-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors group">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-xl">manage_accounts</span>
          </div>
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Editar Dados</span>
        </button>
      </div>

      {/* User Info */}
      <div className="bg-white dark:bg-card-dark p-5 rounded-home-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wide mb-4">
          Informações
        </h3>

        <div className="space-y-3">
          <div className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-800">
            <span className="material-symbols-outlined text-gray-400">mail</span>
            <div>
              <p className="text-[10px] text-text-sub uppercase">Email</p>
              <p className="text-sm text-gray-800 dark:text-white">{profile?.email || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-800">
            <span className="material-symbols-outlined text-gray-400">phone</span>
            <div>
              <p className="text-[10px] text-text-sub uppercase">Telefone</p>
              <p className="text-sm text-gray-800 dark:text-white">{profile?.telefone || 'Não informado'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-2">
            <span className="material-symbols-outlined text-gray-400">badge</span>
            <div>
              <p className="text-[10px] text-text-sub uppercase">Documento</p>
              <p className="text-sm text-gray-800 dark:text-white">{profile?.documento || 'Não informado'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      {meusChamados.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white font-display mb-4">
            Meus Chamados
          </h3>
          <div className="space-y-4">
            {meusChamados.slice(0, 5).map((chamado, i) => (
              <div key={chamado.id} className="flex gap-4 relative">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                    chamado.status === 'resolvido' ? 'bg-green-100 text-green-600' :
                    chamado.status === 'em_atendimento' ? 'bg-blue-100 text-blue-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    <span className="material-symbols-outlined text-sm">
                      {chamado.status === 'resolvido' ? 'check_circle' :
                       chamado.status === 'em_atendimento' ? 'pending' : 'schedule'}
                    </span>
                  </div>
                  {i < meusChamados.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 absolute top-8" />
                  )}
                </div>
                <div className="pb-4 flex-1">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-white">{chamado.titulo}</h4>
                  <p className="text-xs text-text-sub line-clamp-1">{chamado.descricao}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      chamado.status === 'resolvido' ? 'bg-green-100 text-green-600' :
                      chamado.status === 'em_atendimento' ? 'bg-blue-100 text-blue-600' :
                      'bg-orange-100 text-orange-600'
                    }`}>
                      {chamado.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(chamado.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Section */}
      <div className="bg-white dark:bg-card-dark p-5 rounded-home-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wide mb-4">
          Configurações
        </h3>

        <div className="space-y-4">
          <NotificationToggle />
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2 pb-4 space-y-3">
        <button
          onClick={handleLogout}
          className="w-full py-3 text-brand-danger text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Sair do App
        </button>
      </div>
    </div>
  );
}

function NotificationToggle() {
  const { supported, permission, isSubscribed, loading, enablePush, disablePush } = usePushNotifications();

  if (!supported) return null;

  const handleToggle = async () => {
    if (loading) return;

    if (isSubscribed) {
      const success = await disablePush();
      if (success) toast.success('Notificações desativadas');
    } else {
      const success = await enablePush();
      if (success) toast.success('Notificações ativadas! Você receberá alertas importantes.');
      else if (permission === 'denied') {
        toast.error('Permissão negada. Ative nas configurações do navegador.');
      }
    }
  };

  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isSubscribed ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
        }`}>
          <span className="material-symbols-outlined text-sm">
            {isSubscribed ? 'notifications_active' : 'notifications_off'}
          </span>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800 dark:text-white">Notificações Push</p>
          <p className="text-[10px] text-text-sub">
            {isSubscribed ? 'Recebendo alertas importantes' : 'Toque para ativar alertas'}
          </p>
        </div>
      </div>

      <button
        onClick={handleToggle}
        disabled={loading}
        className={`w-12 h-6 rounded-full relative transition-colors ${
          isSubscribed ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-all ${
          isSubscribed ? 'left-[calc(100%-22px)]' : 'left-0.5'
        }`} />
      </button>
    </div>
  );
