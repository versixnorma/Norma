'use client';

import { useAuth } from '@/hooks/useAuth';
import { createContext, useContext, useState, type ReactNode } from 'react';

// ============================================
// TYPES
// ============================================
type AuthContextType = ReturnType<typeof useAuth>;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

// ============================================
// HOOK
// ============================================
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// ============================================
// GUARD COMPONENT
// ============================================
interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiredRoles?: string[];
}

export function AuthGuard({ children, fallback, requiredRoles }: AuthGuardProps) {
  const { isAuthenticated, loading, profile } = useAuthContext();
  const [mounted] = useState(() => typeof window !== 'undefined');

  if (!mounted || loading) {
    return (
      fallback || (
        <div className="flex h-screen items-center justify-center bg-bg-light dark:bg-bg-dark">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-text-sub">Carregando...</p>
          </div>
        </div>
      )
    );
  }

  if (!isAuthenticated) {
    return fallback || null;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    // Verificar role do condomínio atual OU role direto do usuário (para SuperAdmin)
    const condominioRole = profile?.condominio_atual?.role;
    const userDirectRole = profile?.role;

    // SuperAdmin tem acesso total, independente do condomínio
    const isSuperAdmin = userDirectRole === 'superadmin';
    const hasRequiredRole = condominioRole && requiredRoles.includes(condominioRole);
    const superAdminAllowed = isSuperAdmin && requiredRoles.includes('superadmin');

    if (!isSuperAdmin && !hasRequiredRole && !superAdminAllowed) {
      return (
        <div className="flex h-screen items-center justify-center bg-bg-light dark:bg-bg-dark">
          <div className="p-8 text-center">
            <span className="material-symbols-outlined mb-4 text-6xl text-red-500">block</span>
            <h1 className="mb-2 text-xl font-bold text-gray-800 dark:text-white">Acesso Negado</h1>
            <p className="text-sm text-text-sub">
              Você não tem permissão para acessar esta página.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
