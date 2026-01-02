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
    (c) => c.condominio_id === profile?.condominio_atual?.id
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
    ? profile.nome
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'US';

  return (
    <div
      className="hide-scroll relative z-0 flex-1 animate-slide-up space-y-6 overflow-y-auto px-6 pb-32 pt-6"
      onScroll={onScroll}
    >
      {/* Avatar Section */}
      <div className="flex flex-col items-center pt-2">
        <div className="group relative mb-3 flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-white bg-secondary shadow-lg dark:border-card-dark">
          <span className="text-3xl font-bold text-white">{userInitials}</span>
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="material-symbols-outlined text-white">edit</span>
          </div>
        </div>
        <h2 className="font-display text-xl font-bold text-primary dark:text-white">
          {profile?.nome || 'Usuário'}
        </h2>
        <p className="text-sm font-medium text-text-sub">
          {profile?.condominio_atual?.nome || 'Condomínio'}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {unidadeInfo?.unidade_identificador && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
              {unidadeInfo.unidade_identificador}
            </span>
          )}
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
            <span className="material-symbols-outlined text-[10px]">check_circle</span>
            {profile?.status === 'active' ? 'Ativo' : profile?.status}
          </span>
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
            {profile?.condominio_atual?.role || 'morador'}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button className="group flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-card-dark">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
            <span className="material-symbols-outlined text-xl">qr_code_2</span>
          </div>
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Meu QR Code</span>
        </button>
        <button className="group flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-card-dark">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
            <span className="material-symbols-outlined text-xl">manage_accounts</span>
          </div>
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Editar Dados</span>
        </button>
      </div>

      {/* User Info */}
      <div className="rounded-home-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-card-dark">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-800 dark:text-white">
          Informações
        </h3>

        <div className="space-y-3">
          <div className="flex items-center gap-3 border-b border-gray-50 py-2 dark:border-gray-800">
            <span className="material-symbols-outlined text-gray-400">mail</span>
            <div>
              <p className="text-[10px] uppercase text-text-sub">Email</p>
              <p className="text-sm text-gray-800 dark:text-white">{profile?.email || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-b border-gray-50 py-2 dark:border-gray-800">
            <span className="material-symbols-outlined text-gray-400">phone</span>
            <div>
              <p className="text-[10px] uppercase text-text-sub">Telefone</p>
              <p className="text-sm text-gray-800 dark:text-white">
                {profile?.telefone || 'Não informado'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-2">
            <span className="material-symbols-outlined text-gray-400">badge</span>
            <div>
              <p className="text-[10px] uppercase text-text-sub">Documento</p>
              <p className="text-sm text-gray-800 dark:text-white">
                {profile?.documento || 'Não informado'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      {meusChamados.length > 0 && (
        <div>
          <h3 className="mb-4 font-display text-lg font-bold text-gray-800 dark:text-white">
            Meus Chamados
          </h3>
          <div className="space-y-4">
            {meusChamados.slice(0, 5).map((chamado, i) => (
              <div key={chamado.id} className="relative flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      chamado.status === 'resolvido'
                        ? 'bg-green-100 text-green-600'
                        : chamado.status === 'em_atendimento'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-orange-100 text-orange-600'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {chamado.status === 'resolvido'
                        ? 'check_circle'
                        : chamado.status === 'em_atendimento'
                          ? 'pending'
                          : 'schedule'}
                    </span>
                  </div>
                  {i < meusChamados.length - 1 && (
                    <div className="absolute top-8 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-white">
                    {chamado.titulo}
                  </h4>
                  <p className="line-clamp-1 text-xs text-text-sub">{chamado.descricao}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        chamado.status === 'resolvido'
                          ? 'bg-green-100 text-green-600'
                          : chamado.status === 'em_atendimento'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-orange-100 text-orange-600'
                      }`}
                    >
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
      <div className="rounded-home-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-card-dark">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-800 dark:text-white">
          Configurações
        </h3>

        <div className="space-y-4">
          <NotificationToggle />
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 pb-4 pt-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-brand-danger transition-colors hover:bg-red-50 dark:hover:bg-red-900/10"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Sair do App
        </button>
      </div>
    </div>
  );
}

function NotificationToggle() {
  const { supported, permission, isSubscribed, loading, enablePush, disablePush } =
    usePushNotifications();

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
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            isSubscribed ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
          }`}
        >
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
        className={`relative h-6 w-12 rounded-full transition-colors ${
          isSubscribed ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
            isSubscribed ? 'left-[calc(100%-22px)]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}
