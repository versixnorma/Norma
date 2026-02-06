'use client';

import { useAdminNavigation, type NavItem } from '@/hooks/useAdminNavigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useState } from 'react';

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AdminSidebar({ collapsed = false, onToggleCollapse }: AdminSidebarProps) {
  const { navigation, isActive, hasActiveChild } = useAdminNavigation();
  const { profile, isSuperAdmin } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const isExpanded = (itemId: string) => expandedItems.includes(itemId);

  const renderNavItem = (item: NavItem, depth = 0) => {
    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const expanded = isExpanded(item.id) || hasActiveChild(item);

    return (
      <div key={item.id}>
        <Link
          href={item.isComingSoon ? '#' : item.href}
          onClick={(e) => {
            if (hasChildren) {
              e.preventDefault();
              toggleExpand(item.id);
            }
          }}
          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${depth > 0 ? 'ml-6' : ''} ${
            active
              ? 'bg-primary text-white shadow-lg shadow-primary/25'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          } ${item.isComingSoon ? 'cursor-not-allowed opacity-60' : ''} `}
        >
          <span
            className={`material-symbols-outlined text-xl ${
              active ? 'text-white' : 'text-gray-500 group-hover:text-primary dark:text-gray-500'
            }`}
          >
            {item.icon}
          </span>

          {!collapsed && (
            <>
              <span className="flex-1">{item.label}</span>

              {item.badge && item.badge > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}

              {item.isNew && (
                <span className="rounded bg-green-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                  Novo
                </span>
              )}

              {item.isComingSoon && (
                <span className="rounded bg-gray-300 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                  Em breve
                </span>
              )}

              {hasChildren && (
                <span
                  className={`material-symbols-outlined text-lg transition-transform ${
                    expanded ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              )}
            </>
          )}
        </Link>

        {/* Children */}
        {hasChildren && expanded && !collapsed && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-gray-200 bg-white transition-all dark:border-gray-800 dark:bg-gray-900 ${collapsed ? 'w-20' : 'w-64'} `}
    >
      {/* Logo / Header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
        {!collapsed && (
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <span className="text-lg font-bold text-white">V</span>
            </div>
            <div>
              <span className="text-lg font-bold text-gray-800 dark:text-white">Versix</span>
              <span className="ml-1 text-xs text-gray-500">Admin</span>
            </div>
          </Link>
        )}

        {collapsed && (
          <Link
            href="/admin/dashboard"
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-primary"
          >
            <span className="text-lg font-bold text-white">V</span>
          </Link>
        )}

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <span className="material-symbols-outlined text-xl">
              {collapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        )}
      </div>

      {/* User Info */}
      {!collapsed && profile && (
        <div className="border-b border-gray-200 p-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.nome}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-primary">
                  {profile.nome?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-gray-800 dark:text-white">
                {profile.nome}
              </p>
              <p className="text-xs text-gray-500">
                {isSuperAdmin ? 'Super Admin' : profile.condominio_atual?.role || 'Usuário'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {navigation.map((section) => (
            <div key={section.id}>
              {section.title && !collapsed && (
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">{section.items.map((item) => renderNavItem(item))}</div>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <span className="material-symbols-outlined text-xl">exit_to_app</span>
          {!collapsed && <span>Voltar ao App</span>}
        </Link>
      </div>
    </aside>
  );
}
