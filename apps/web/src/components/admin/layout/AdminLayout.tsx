'use client';

import { AuthGuard } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { useServiceWorkerUpdate } from '@/lib/pwa';

interface AdminLayoutProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function AdminLayout({
  children,
  requiredRoles = ['superadmin', 'admin_condo'],
}: AdminLayoutProps) {
  // Initialize from viewport immediately to avoid layout shift
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();
  const [dismissedUpdateBanner, setDismissedUpdateBanner] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <AuthGuard requiredRoles={requiredRoles}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Sidebar - Desktop */}
        <div className={`hidden lg:block ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <AdminSidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Sidebar - Mobile Overlay */}
        {isMobile && mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden">
              <AdminSidebar collapsed={false} onToggleCollapse={() => setMobileMenuOpen(false)} />
            </div>
          </>
        )}

        {/* Main Content */}
        <div
          className={`min-h-screen ${mounted ? 'transition-all' : ''} ${isMobile ? 'ml-0' : sidebarCollapsed ? 'ml-20' : 'ml-64'} `}
        >
          {/* Header */}
          <AdminHeader
            sidebarCollapsed={isMobile ? true : sidebarCollapsed}
            onToggleSidebar={() => {
              if (isMobile) {
                setMobileMenuOpen(!mobileMenuOpen);
              } else {
                setSidebarCollapsed(!sidebarCollapsed);
              }
            }}
          />

          {/* Service Worker update banner */}
          {updateAvailable && !dismissedUpdateBanner && (
            <div className="mx-6 mt-4 flex items-center justify-between rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 shadow-sm">
              <div>
                <strong>Nova versão disponível</strong>
                <div className="mt-1 text-xs text-yellow-700">
                  Atualize para aplicar as últimas correções e melhorias.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    applyUpdate();
                  }}
                  className="rounded-md bg-yellow-600 px-3 py-1 text-xs font-medium text-white hover:bg-yellow-700"
                >
                  Atualizar agora
                </button>
                <button
                  onClick={() => setDismissedUpdateBanner(true)}
                  className="rounded-md px-2 py-1 text-xs text-yellow-800 hover:underline"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

          {/* Page Content */}
          <main className="p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
