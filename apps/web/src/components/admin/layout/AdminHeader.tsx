'use client';

import { useAdminNavigation } from '@/hooks/useAdminNavigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useState } from 'react';

interface AdminHeaderProps {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function AdminHeader({ sidebarCollapsed, onToggleSidebar }: AdminHeaderProps) {
  const { breadcrumbs, activeItem } = useAdminNavigation();
  const { profile, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header
      className={`sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-900 ${sidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all`}
    >
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle */}
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && (
                <span className="material-symbols-outlined text-sm text-gray-400">
                  chevron_right
                </span>
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-sm text-gray-500 hover:text-primary dark:text-gray-400"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-sm font-medium text-gray-800 dark:text-white">
                  {crumb.label}
                </span>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
          <span className="material-symbols-outlined">search</span>
        </button>

        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.nome}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-primary">
                  {profile?.nome?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="material-symbols-outlined text-gray-500">expand_more</span>
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)}></div>
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    {profile?.nome}
                  </p>
                  <p className="text-xs text-gray-500">{profile?.email}</p>
                </div>

                <div className="py-1">
                  <Link
                    href="/perfil"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <span className="material-symbols-outlined text-lg">person</span>
                    Meu Perfil
                  </Link>
                  <Link
                    href="/configuracoes"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <span className="material-symbols-outlined text-lg">settings</span>
                    Configurações
                  </Link>
                </div>

                <div className="border-t border-gray-200 py-1 dark:border-gray-700">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <span className="material-symbols-outlined text-lg">logout</span>
                    Sair
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
