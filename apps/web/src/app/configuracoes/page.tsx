'use client';

import { AuthGuard } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function ConfiguracoesPage() {
  const [dummy, setDummy] = useState(false);
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="mx-auto max-w-7xl p-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Configurações</h1>
          <p className="mt-2 text-sm text-gray-500">Área de configurações do usuário.</p>
          <div className="mt-6">
            <button
              onClick={() => setDummy((s) => !s)}
              className="rounded-lg bg-primary px-4 py-2 text-white"
            >
              Testar Configuração ({String(dummy)})
            </button>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
