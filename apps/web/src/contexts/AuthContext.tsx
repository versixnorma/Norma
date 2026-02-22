'use client';

import { useAuth, type UseAuthOptions } from '@/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

// ============================================
// TYPES
// ============================================
type AuthContextType = ReturnType<typeof useAuth>;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================
interface AuthProviderProps extends UseAuthOptions {
  children: ReactNode;
}

export function AuthProvider({
  children,
  initialUser,
  initialSession,
  initialProfile,
}: AuthProviderProps) {
  const auth = useAuth({ initialUser, initialSession, initialProfile });

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
  const router = useRouter();
  const pathname = usePathname();
  const [mounted] = useState(() => typeof window !== 'undefined');
  const [loadingTooLong, setLoadingTooLong] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Admin routes redirect to /admin/login, others to /login
  const loginPath = pathname?.startsWith('/admin') ? '/admin/login' : '/login';

  // Se o loading durar mais de 10s, mostrar botão de recarregar
  useEffect(() => {
    if (loading) {
      loadingTimerRef.current = setTimeout(() => setLoadingTooLong(true), 10000);
    } else {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      setLoadingTooLong(false);
    }
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, [loading]);

  useEffect(() => {
    if (!loading && !isAuthenticated && mounted) {
      router.replace(loginPath);
    }
  }, [loading, isAuthenticated, mounted, router, loginPath]);

  if (!mounted || loading) {
    return (
      fallback || (
        <div className="flex h-screen items-center justify-center bg-bg-light dark:bg-bg-dark">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-text-sub">Carregando...</p>
            {loadingTooLong && (
              <button
                onClick={() => window.location.reload()}
                className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Recarregar página
              </button>
            )}
          </div>
        </div>
      )
    );
  }

  if (!isAuthenticated) {
    // Redirect is handled by useEffect above, show loading while redirecting
    return (
      fallback || (
        <div className="flex h-screen items-center justify-center bg-bg-light dark:bg-bg-dark">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-text-sub">Redirecionando...</p>
          </div>
        </div>
      )
    );
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
