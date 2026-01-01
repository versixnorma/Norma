'use client';

import { getAllCriticalData, type EmergencyContact, type VulnerableResident } from '@/lib/offline-db';
import { useOnlineStatus } from '@/lib/pwa';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const TIPO_ICONS: Record<string, string> = {
  bombeiros: '🚒',
  policia: '🚔',
  samu: '🚑',
  portaria: '🏢',
  sindico: '👔',
  zelador: '🔧',
  gas: '⛽',
  energia: '⚡'
};

const VULNERAVEL_ICONS: Record<string, string> = {
  idoso: '👴',
  cadeirante: '🦽',
  acamado: '🛏️',
  gestante: '🤰',
  crianca: '👶',
  deficiente_visual: '🦯',
  deficiente_auditivo: '🦻'
};

export default function SOSPage() {
  const isOnline = useOnlineStatus();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [vulnerable, setVulnerable] = useState<VulnerableResident[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCriticalData();
  }, []);

  const loadCriticalData = async () => {
    try {
      const data = await getAllCriticalData();
      setContacts(data.contacts);
      setVulnerable(data.vulnerable);
      setLastSync(data.lastSync.contacts);
    } catch (error) {
      console.error('Erro ao carregar dados críticos:', error);
    } finally {
      setLoading(false);
    }
  };

  const makeCall = (telefone: string) => {
    window.location.href = `tel:${telefone.replace(/\D/g, '')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-red-600 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-red-600">
      {/* Header */}
      <header className="bg-red-700 text-white px-4 py-6 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <Link href="/home" className="p-2 -ml-2 hover:bg-red-600 rounded-lg">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <div className={`flex items-center gap-2 text-sm px-3 py-1 rounded-full ${isOnline ? 'bg-green-500' : 'bg-amber-500'}`}>
              <span className="material-symbols-outlined text-sm">{isOnline ? 'wifi' : 'wifi_off'}</span>
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl animate-pulse">emergency</span>
            MODO EMERGÊNCIA
          </h1>
          {lastSync && (
            <p className="text-red-200 text-sm mt-1">
              Dados sincronizados {formatDistanceToNow(lastSync, { addSuffix: true, locale: ptBR })}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Telefones de Emergência */}
        <section className="mb-8">
          <h2 className="text-white text-lg font-bold mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined">call</span>
            Telefones de Emergência
          </h2>

          {contacts.length === 0 ? (
            <div className="bg-red-500 rounded-xl p-4 text-white/80 text-center">
              <p>Nenhum telefone sincronizado</p>
              {isOnline && <p className="text-sm mt-1">Volte à home para sincronizar</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {contacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => makeCall(contact.telefone)}
                  className="w-full bg-white rounded-xl p-4 flex items-center justify-between shadow-lg active:scale-98 transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{TIPO_ICONS[contact.tipo] || '📞'}</span>
                    <div className="text-left">
                      <p className="font-bold text-gray-800">{contact.nome}</p>
                      <p className="text-primary font-medium">{contact.telefone}</p>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-2xl">call</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Moradores Vulneráveis */}
        {vulnerable.length > 0 && (
          <section className="mb-8">
            <h2 className="text-white text-lg font-bold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined">elderly</span>
              Moradores que Precisam de Ajuda
            </h2>

            <div className="bg-white rounded-xl overflow-hidden shadow-lg">
              {vulnerable.map((res, idx) => (
                <div key={res.id} className={`p-4 flex items-center gap-3 ${idx > 0 ? 'border-t border-gray-100' : ''}`}>
                  <span className="text-2xl">{VULNERAVEL_ICONS[res.tipo] || '👤'}</span>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{res.nome}</p>
                    <p className="text-sm text-gray-500">
                      {res.bloco && `Bloco ${res.bloco} - `}Ap {res.unidade}
                    </p>
                    {res.observacoes && (
                      <p className="text-xs text-gray-400 mt-1">{res.observacoes}</p>
                    )}
                  </div>
                  {res.contato_emergencia && (
                    <button
                      onClick={() => makeCall(res.contato_emergencia!)}
                      className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-white">call</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ações Rápidas */}
        <section>
          <h2 className="text-white text-lg font-bold mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined">bolt</span>
            Ações Rápidas
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => makeCall('192')}
              className="bg-white rounded-xl p-4 flex flex-col items-center gap-2 shadow-lg active:scale-98"
            >
              <span className="text-3xl">🚑</span>
              <span className="font-bold text-gray-800">SAMU</span>
              <span className="text-2xl font-bold text-red-600">192</span>
            </button>

            <button
              onClick={() => makeCall('193')}
              className="bg-white rounded-xl p-4 flex flex-col items-center gap-2 shadow-lg active:scale-98"
            >
              <span className="text-3xl">🚒</span>
              <span className="font-bold text-gray-800">Bombeiros</span>
              <span className="text-2xl font-bold text-red-600">193</span>
            </button>

            <button
              onClick={() => makeCall('190')}
              className="bg-white rounded-xl p-4 flex flex-col items-center gap-2 shadow-lg active:scale-98"
            >
              <span className="text-3xl">🚔</span>
              <span className="font-bold text-gray-800">Polícia</span>
              <span className="text-2xl font-bold text-red-600">190</span>
            </button>

            <button
              onClick={() => makeCall('180')}
              className="bg-white rounded-xl p-4 flex flex-col items-center gap-2 shadow-lg active:scale-98"
            >
              <span className="text-3xl">🛡️</span>
              <span className="font-bold text-gray-800">Defesa Civil</span>
              <span className="text-2xl font-bold text-red-600">199</span>
            </button>
          </div>
        </section>

        {/* Aviso offline */}
        {!isOnline && (
          <div className="mt-8 bg-amber-500 rounded-xl p-4 text-white">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined">info</span>
              <div>
                <p className="font-bold">Você está offline</p>
                <p className="text-sm text-amber-100 mt-1">
                  Os dados exibidos foram sincronizados anteriormente.
                  Ligações funcionam normalmente via rede celular.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
