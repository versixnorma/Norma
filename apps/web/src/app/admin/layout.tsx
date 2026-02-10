'use client';

import { AdminLayout } from '@/components/admin';
import { usePathname } from 'next/navigation';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Admin login page renders without AdminLayout/AuthGuard
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return <AdminLayout>{children}</AdminLayout>;
}
