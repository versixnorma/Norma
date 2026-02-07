'use client';

import { CondominioForm } from '@/components/admin/condominios/CondominioForm';
import { AuthGuard } from '@/contexts/AuthContext';

export default function NovoCondominioPage() {
  return (
    <AuthGuard requiredRoles={['superadmin']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Novo Condomínio</h1>
          <p className="text-sm text-gray-500">Cadastre um novo condomínio no sistema</p>
        </div>

        <CondominioForm mode="create" />
      </div>
    </AuthGuard>
  );
}
