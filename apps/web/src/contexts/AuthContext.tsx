'use client';

import { useAuth } from '@/hooks/useAuth';
import {
    createContext,
    useContext,
    useState,
    type ReactNode
} from 'react';

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

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
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
    return fallback || (
      <div className="h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-sub">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback || null;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = profile?.condominio_atual?.role;
    if (!userRole || !requiredRoles.includes(userRole)) {
      return (
        <div className="h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark">
          <div className="text-center p-8">
            <span className="material-symbols-outlined text-6xl text-red-500 mb-4">block</span>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              Acesso Negado
            </h1>
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
