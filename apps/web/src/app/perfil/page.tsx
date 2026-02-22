'use client';

import { AuthGuard } from '@/contexts/AuthContext';
import { ProfilePage } from '@/components/pages/ProfilePage';

export default function PerfilPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="mx-auto max-w-7xl p-6">
          <ProfilePage onScroll={() => undefined} />
        </main>
      </div>
    </AuthGuard>
  );
}
