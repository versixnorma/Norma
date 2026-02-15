'use client';

import { AuthGuard } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

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

          {/* Page Content */}
          <main className="p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
