'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape & Focus Trap
  useEffect(() => {
    if (isOpen) {
      // Focus the menu container when opened
      menuRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

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
    ? profile.nome
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'US';

  const unidadeInfo = profile?.condominios?.find(
    (c) => c.condominio_id === profile?.condominio_atual?.id
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu */}
      <div
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu do Usuário"
        tabIndex={-1}
        className="absolute right-4 top-16 z-50 w-72 animate-slide-down overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-gray-700 dark:bg-card-dark"
      >
        {/* User Info */}
        <div className="border-b border-gray-100 p-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <span className="text-lg font-bold text-white">{userInitials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate font-bold text-gray-800 dark:text-white">
                {profile?.nome || 'Usuário'}
              </h4>
              <p className="truncate text-xs text-text-sub">{profile?.email}</p>
              {unidadeInfo && (
                <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
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
              className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-gray-500">apartment</span>
                <div className="text-left">
                  <span className="block text-sm text-gray-700 dark:text-gray-300">
                    {profile?.condominio_atual?.nome}
                  </span>
                  <span className="text-[10px] text-text-sub">Trocar condomínio</span>
                </div>
              </div>
              <span
                className={`material-symbols-outlined text-gray-400 transition-transform ${showCondominios ? 'rotate-180' : ''}`}
              >
                expand_more
              </span>
            </button>

            {showCondominios && (
              <div className="bg-gray-50 py-1 dark:bg-gray-800/50">
                {profile?.condominios?.map((cond) => (
                  <button
                    key={cond.condominio_id}
                    onClick={() => handleSwitchCondominio(cond.condominio_id)}
                    className={`flex w-full items-center gap-3 px-6 py-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      cond.condominio_id === profile?.condominio_atual?.id
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm text-gray-400">
                      {cond.condominio_id === profile?.condominio_atual?.id
                        ? 'check_circle'
                        : 'circle'}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {cond.condominio.nome}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Menu Items */}
        <div className="p-2">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
            <span className="material-symbols-outlined text-gray-500">person</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Meu Perfil</span>
          </button>

          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
            <span className="material-symbols-outlined text-gray-500">settings</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Configurações</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
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
              className={`h-6 w-10 rounded-full transition-colors ${
                resolvedTheme === 'dark' ? 'bg-secondary' : 'bg-gray-200'
              } relative`}
            >
              <div
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  resolvedTheme === 'dark' ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </div>
          </button>

          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
            <span className="material-symbols-outlined text-gray-500">help</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Ajuda & Suporte</span>
          </button>
        </div>

        {/* Logout */}
        <div className="border-t border-gray-100 p-2 dark:border-gray-700">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-brand-danger transition-colors hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
          >
            {loggingOut ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-500" />
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
        <div className="bg-gray-50 px-4 py-2 dark:bg-gray-800/50">
          <p className="text-center text-[10px] text-gray-400">Versix Norma v1.0.1</p>
        </div>
      </div>
    </>
  );
}
