'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface AvatarMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AvatarMenu({ isOpen, onClose }: AvatarMenuProps) {
  const router = useRouter();
  const { profile, logout, hasMultipleCondominios, switchCondominio } = useAuthContext();
  const { resolvedTheme, setTheme } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showCondominios, setShowCondominios] = useState(false);

  if (!isOpen) return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    const result = await logout();

    if (result.success) {
      toast.success('Até logo!');
      router.push('/login');
    } else {
      toast.error('Erro ao sair');
      setLoggingOut(false);
    }
  };

  const handleSwitchCondominio = (condominioId: string) => {
    switchCondominio(condominioId);
    setShowCondominios(false);
    toast.success('Condomínio alterado!');
    onClose();
  };

  const userInitials = profile?.nome
    ? profile.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'US';

  const unidadeInfo = profile?.condominios?.find(
    c => c.condominio_id === profile?.condominio_atual?.id
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Menu */}
      <div className="absolute top-16 right-4 z-50 w-72 bg-white dark:bg-card-dark rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-slide-down">
        {/* User Info */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-white font-bold text-lg">{userInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-800 dark:text-white truncate">
                {profile?.nome || 'Usuário'}
              </h4>
              <p className="text-xs text-text-sub truncate">{profile?.email}</p>
              {unidadeInfo && (
                <span className="inline-block mt-1 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  {unidadeInfo.unidade_identificador || profile?.condominio_atual?.role}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Condomínio Selector */}
        {hasMultipleCondominios && (
          <div className="border-b border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setShowCondominios(!showCondominios)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-gray-500">apartment</span>
                <div className="text-left">
                  <span className="text-sm text-gray-700 dark:text-gray-300 block">
                    {profile?.condominio_atual?.nome}
                  </span>
                  <span className="text-[10px] text-text-sub">Trocar condomínio</span>
                </div>
              </div>
              <span className={`material-symbols-outlined text-gray-400 transition-transform ${showCondominios ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {showCondominios && (
              <div className="bg-gray-50 dark:bg-gray-800/50 py-1">
                {profile?.condominios?.map((cond) => (
                  <button
                    key={cond.condominio_id}
                    onClick={() => handleSwitchCondominio(cond.condominio_id)}
                    className={`w-full flex items-center gap-3 px-6 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      cond.condominio_id === profile?.condominio_atual?.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm text-gray-400">
                      {cond.condominio_id === profile?.condominio_atual?.id ? 'check_circle' : 'circle'}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{cond.condominio.nome}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Menu Items */}
        <div className="p-2">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <span className="material-symbols-outlined text-gray-500">person</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Meu Perfil</span>
          </button>

          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <span className="material-symbols-outlined text-gray-500">settings</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Configurações</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-gray-500">
                {resolvedTheme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {resolvedTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
              </span>
            </div>
            <div
              className={`w-10 h-6 rounded-full transition-colors ${
                resolvedTheme === 'dark' ? 'bg-secondary' : 'bg-gray-200'
              } relative`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  resolvedTheme === 'dark' ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </div>
          </button>

          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <span className="material-symbols-outlined text-gray-500">help</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Ajuda & Suporte</span>
          </button>
        </div>

        {/* Logout */}
        <div className="p-2 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-brand-danger disabled:opacity-50"
          >
            {loggingOut ? (
              <>
                <span className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                <span className="text-sm font-medium">Saindo...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">logout</span>
                <span className="text-sm font-medium">Sair</span>
              </>
            )}
          </button>
        </div>

        {/* Version */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-[10px] text-gray-400 text-center">
            Versix Norma v1.0.1
          </p>
        </div>
      </div>
    </>
  );
}
