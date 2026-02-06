'use client';

import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

// Navigation item type
export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  badge?: number;
  children?: NavItem[];
  requiredRoles?: string[];
  isNew?: boolean;
  isComingSoon?: boolean;
}

// Navigation sections
export interface NavSection {
  id: string;
  title?: string;
  items: NavItem[];
}

// Define all admin navigation items
const ADMIN_NAVIGATION: NavSection[] = [
  {
    id: 'main',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/admin/dashboard',
        icon: 'dashboard',
      },
    ],
  },
  {
    id: 'management',
    title: 'Gestão',
    items: [
      {
        id: 'usuarios',
        label: 'Usuários',
        href: '/admin/usuarios',
        icon: 'group',
      },
      {
        id: 'condominios',
        label: 'Condomínios',
        href: '/admin/condominios',
        icon: 'apartment',
      },
    ],
  },
  {
    id: 'modules',
    title: 'Módulos',
    items: [
      {
        id: 'marketplace',
        label: 'Marketplace',
        href: '/admin/marketplace',
        icon: 'storefront',
        isComingSoon: true,
        children: [
          {
            id: 'marketplace-partners',
            label: 'Parceiros',
            href: '/admin/marketplace/partners',
            icon: 'handshake',
          },
          {
            id: 'marketplace-discounts',
            label: 'Descontos',
            href: '/admin/marketplace/discounts',
            icon: 'sell',
          },
          {
            id: 'marketplace-transactions',
            label: 'Transações',
            href: '/admin/marketplace/transactions',
            icon: 'receipt_long',
          },
        ],
      },
      {
        id: 'norma-ai',
        label: 'Norma AI',
        href: '/admin/norma-ai',
        icon: 'smart_toy',
        isComingSoon: true,
        children: [
          {
            id: 'norma-ai-monitoring',
            label: 'Monitoramento',
            href: '/admin/norma-ai/monitoring',
            icon: 'monitoring',
          },
          {
            id: 'norma-ai-knowledge',
            label: 'Conhecimento',
            href: '/admin/norma-ai/knowledge',
            icon: 'menu_book',
          },
          {
            id: 'norma-ai-training',
            label: 'Treinamento',
            href: '/admin/norma-ai/training',
            icon: 'model_training',
          },
          {
            id: 'norma-ai-conversations',
            label: 'Conversas',
            href: '/admin/norma-ai/conversations',
            icon: 'chat',
          },
        ],
      },
    ],
  },
  {
    id: 'system',
    title: 'Sistema',
    items: [
      {
        id: 'feature-flags',
        label: 'Feature Flags',
        href: '/admin/feature-flags',
        icon: 'toggle_on',
      },
      {
        id: 'audit-logs',
        label: 'Audit Logs',
        href: '/admin/audit-logs',
        icon: 'history',
      },
      {
        id: 'observabilidade',
        label: 'Observabilidade',
        href: '/admin/observabilidade',
        icon: 'monitoring',
      },
    ],
  },
];

// Breadcrumb item type
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Hook for admin navigation management
 * Provides filtered navigation based on user role and current path
 */
export function useAdminNavigation() {
  const { profile, isSuperAdmin } = useAuth();
  const pathname = usePathname();

  // Filter navigation based on user role
  const navigation = useMemo(() => {
    if (!profile) return [];

    return ADMIN_NAVIGATION.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // SuperAdmin sees everything
        if (isSuperAdmin) return true;

        // Check required roles
        if (item.requiredRoles) {
          const userRole = profile.condominio_atual?.role || profile.role;
          return item.requiredRoles.includes(userRole);
        }

        return true;
      }),
    })).filter((section) => section.items.length > 0);
  }, [profile, isSuperAdmin]);

  // Find current active item
  const activeItem = useMemo(() => {
    if (!pathname) return null;
    for (const section of ADMIN_NAVIGATION) {
      for (const item of section.items) {
        if (pathname === item.href) return item;
        if (item.children) {
          const child = item.children.find((c) => pathname === c.href);
          if (child) return child;
        }
        // Check if current path starts with item href (for nested routes)
        if (pathname.startsWith(item.href + '/')) return item;
      }
    }
    return null;
  }, [pathname]);

  // Find parent item if on a child route
  const parentItem = useMemo(() => {
    if (!pathname) return null;
    for (const section of ADMIN_NAVIGATION) {
      for (const item of section.items) {
        if (item.children) {
          const isChildActive = item.children.some(
            (c) => pathname === c.href || pathname.startsWith(c.href + '/')
          );
          if (isChildActive) return item;
        }
      }
    }
    return null;
  }, [pathname]);

  // Generate breadcrumbs from current path
  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    const crumbs: BreadcrumbItem[] = [{ label: 'Admin', href: '/admin/dashboard' }];

    if (parentItem) {
      crumbs.push({ label: parentItem.label, href: parentItem.href });
    }

    if (activeItem && activeItem !== parentItem) {
      crumbs.push({ label: activeItem.label });
    }

    return crumbs;
  }, [activeItem, parentItem]);

  // Check if a path is active
  const isActive = (href: string): boolean => {
    if (!pathname) return false;
    if (pathname === href) return true;
    if (href !== '/admin/dashboard' && pathname.startsWith(href + '/')) return true;
    return false;
  };

  // Check if a parent item has an active child
  const hasActiveChild = (item: NavItem): boolean => {
    if (!item.children) return false;
    return item.children.some((child) => isActive(child.href));
  };

  return {
    navigation,
    activeItem,
    parentItem,
    breadcrumbs,
    isActive,
    hasActiveChild,
    pathname,
  };
}
