// src/pages/ModoPanico.tsx

import { useState, useEffect } from 'react';
import { Phone, MapPin, Users, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { getAllCriticalData } from '@/lib/offline-db';
import { useOnlineStatus } from '@/lib/pwa';

interface CriticalData {
  phones: Array<{ nome: string; numero: string; tipo: string }>;
  vulnerable: Array<{ nome: string; unidade: string; tipo: string; observacao: string }>;
  contacts: Array<{ nome: string; telefone: string; role: string }>;
  maps: Array<{ nome: string; url: string }>;
}

// Componente auxiliar para botões de emergência
const EmergencyButton = ({ numero, nome, color = 'red' }: { numero: string; nome: string; color?: 'red' | 'orange' | 'blue' | 'green' }) => {
  const colorMap = {
    red: 'bg-red-500 hover:bg-red-600',
    orange: 'bg-orange-500 hover:bg-orange-600',
    blue: 'bg-blue-500 hover:bg-blue-600',
    green: 'bg-green-500 hover:bg-green-600',
  };

  return (
    <a 
      href={`tel:${numero.replace(/\D/g, '')}`} 
      className={`flex items-center justify-between p-3 rounded-xl text-white font-semibold transition-colors ${colorMap[color]}`}
    >
      <span>{nome}</span>
      <span className="text-sm">{numero}</span>
    </a>
  );
};

const translateRole = (role: string) => {
  const roles: Record<string, string> = {
    sindico: 'Síndico',
    subsindico: 'Subsíndico',
    porteiro: 'Portaria',
    zelador: 'Zelador',
  };
  return roles[role] || role;
};

export function ModoPanico() {
  const [data, setData] = useState<CriticalData | null>(null);
  const [loading, setLoading] = useState(true);
  const isOnline = useOnlineStatus();
  
  useEffect(() => {
    loadCriticalData();
  }, []);
  
  const loadCriticalData = async () => {
    try {
      const allData = await getAllCriticalData();
      
      setData({
        phones: allData.find(d => d.id === 'emergency-phones')?.data || [],
        vulnerable: allData.find(d => d.id === 'vulnerable-residents')?.data || [],
        contacts: allData.find(d => d.id === 'emergency-contacts')?.data || [],
        maps: allData.find(d => d.id === 'evacuation-maps')?.data || []
      });
    } catch (error) {
      console.error('Erro ao carregar dados críticos:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-red-600 flex items-center justify-center">
        <div className="text-white text-center">
          <AlertTriangle className="w-16 h-16 mx-auto animate-pulse" />
          <p className="mt-4 text-xl">Carregando dados de emergência...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-600 to-red-800 text-white">
      {/* Header com status de conexão */}
      <div className="bg-red-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6" />
          <span className="font-bold text-lg">MODO EMERGÊNCIA</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              <span>Offline</span>
            </>
          )}
        </div>
      </div>
      
      <div className="p-4 space-y-6">
        {/* Telefones de Emergência */}
        <section>
          <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
            <Phone className="w-5 h-5" />
            Telefones de Emergência
          </h2>
          <div className="space-y-2">
            {/* Números fixos de emergência */}
            <EmergencyButton numero="193" nome="Bombeiros" color="orange" />
            <EmergencyButton numero="190" nome="Polícia" color="blue" />
            <EmergencyButton numero="192" nome="SAMU" color="green" />
            
            {/* Números do condomínio */}
            {data?.phones.map((phone, i) => (
              <EmergencyButton 
                key={i} 
                numero={phone.numero} 
                nome={phone.nome}
              />
            ))}
            
            {/* Contatos do condomínio */}
            {data?.contacts.map((contact, i) => (
              <EmergencyButton 
                key={`contact-${i}`} 
                numero={contact.telefone} 
                nome={`${contact.nome} (${translateRole(contact.role)})`}
              />
            ))}
          </div>
        </section>
        
        {/* Moradores Vulneráveis */}
        <section>
          <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
            <Users className="w-5 h-5" />
            Moradores Vulneráveis
          </h2>
          <div className="space-y-3">
            {data?.vulnerable.length === 0 ? (
              <p className="text-sm text-red-200">Nenhum morador vulnerável cadastrado.</p>
            ) : (
              data?.vulnerable.map((v, i) => (
                <div key={i} className="bg-red-600 p-3 rounded-xl">
                  <p className="font-semibold">{v.nome} - {v.unidade}</p>
                  <p className="text-sm text-red-200 mt-1">Tipo: {v.tipo}</p>
                  {v.observacao && <p className="text-xs mt-1 italic">{v.observacao}</p>}
                </div>
              ))
            )}
          </div>
        </section>
        
        {/* Mapas de Evacuação */}
        <section>
          <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5" />
            Mapas de Evacuação
          </h2>
          <div className="space-y-2">
            {data?.maps.length === 0 ? (
              <p className="text-sm text-red-200">Nenhum mapa de evacuação disponível offline.</p>
            ) : (
              data?.maps.map((map, i) => (
                <a 
                  key={i} 
                  href={map.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block bg-red-600 p-3 rounded-xl text-center font-semibold hover:bg-red-500 transition-colors"
                >
                  {map.nome} (Abrir PDF)
                </a>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
