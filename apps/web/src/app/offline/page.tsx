'use client';

import { getAllCriticalData, type EmergencyContact } from '@/lib/offline-db';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function OfflinePage() {
  const [hasEmergencyData, setHasEmergencyData] = useState(false);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);

  const checkOfflineData = async () => {
    try {
      const data = await getAllCriticalData();
      setContacts(data.contacts);
      setHasEmergencyData(data.contacts.length > 0);
    } catch {
      // IndexedDB não disponível
    }
  };

  useEffect(() => {
    const handle = requestAnimationFrame(() => { void checkOfflineData(); });
    return () => cancelAnimationFrame(handle);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Ícone offline */}
        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-5xl text-gray-400">cloud_off</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Você está offline
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Não foi possível carregar esta página. Verifique sua conexão com a internet.
        </p>

        {/* Botões de ação */}
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">refresh</span>
            Tentar novamente
          </button>

          {hasEmergencyData && (
            <Link
              href="/sos"
              className="w-full py-4 bg-red-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 block"
            >
              <span className="material-symbols-outlined">emergency</span>
              Modo Emergência (Offline)
            </Link>
          )}
        </div>

        {/* Telefones rápidos se disponível */}
        {contacts.length > 0 && (
          <div className="mt-8 text-left">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Telefones disponíveis offline:</h2>
            <div className="space-y-2">
              {contacts.slice(0, 3).map(contact => (
                <a
                  key={contact.id}
                  href={`tel:${contact.telefone.replace(/\D/g, '')}`}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm"
                >
                  <span className="font-medium text-gray-800 dark:text-white">{contact.nome}</span>
                  <span className="text-primary font-bold">{contact.telefone}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Dica */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-left">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-500">lightbulb</span>
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Dica</p>
              <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                Instale o app na sua tela inicial para ter acesso a dados importantes mesmo offline.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
