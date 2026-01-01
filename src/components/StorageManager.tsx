// src/components/StorageManager.tsx

import { useState, useEffect } from 'react';
import { HardDrive, Trash2, RefreshCw } from 'lucide-react';

interface StorageInfo {
  usage: number;
  quota: number;
  caches: Array<{
    name: string;
    size: number;
    entries: number;
  }>;
}

export function StorageManager() {
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  
  useEffect(() => {
    loadStorageInfo();
  }, []);
  
  const loadStorageInfo = async () => {
    setLoading(true);
    
    try {
      // Estimativa de uso do Storage API
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        
        // Listar caches
        const cacheNames = await caches.keys();
        const cacheInfos = await Promise.all(
          cacheNames.map(async (name) => {
            const cache = await caches.open(name);
            const requests = await cache.keys();
            let size = 0;
            
            for (const request of requests) {
              const response = await cache.match(request);
              if (response) {
                const blob = await response.clone().blob();
                size += blob.size;
              }
            }
            
            return { name, size, entries: requests.length };
          })
        );
        
        setStorage({
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          caches: cacheInfos
        });
      }
    } catch (error) {
      console.error('Erro ao carregar info de storage:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const clearCache = async (cacheName?: string) => {
    setClearing(true);
    
    try {
      if (cacheName) {
        await caches.delete(cacheName);
      } else {
        // Limpar todos exceto dados críticos
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(name => !name.includes('critical'))
            .map(name => caches.delete(name))
        );
      }
      
      await loadStorageInfo();
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    } finally {
      setClearing(false);
    }
  };
  
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Calculando uso de armazenamento...
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <HardDrive className="w-6 h-6" />
          Armazenamento
        </h2>
        <button
          onClick={() => loadStorageInfo()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>
      
      {/* Barra de uso total */}
      <div className="bg-gray-100 rounded-xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span>Uso total</span>
          <span>
            {formatSize(storage?.usage || 0)} / {formatSize(storage?.quota || 0)}
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500"
            style={{ 
              width: `${((storage?.usage || 0) / (storage?.quota || 1)) * 100}%` 
            }}
          />
        </div>
      </div>
      
      {/* Detalhes do Cache */}
      <div className="space-y-3">
        <h3 className="font-semibold">Detalhes do Cache (Service Worker)</h3>
        {storage?.caches.map((cache) => (
          <div key={cache.name} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">{cache.name}</p>
              <p className="text-sm text-gray-500">{cache.entries} itens | {formatSize(cache.size)}</p>
            </div>
            <button
              onClick={() => clearCache(cache.name)}
              disabled={clearing || cache.name.includes('critical')}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
              title={cache.name.includes('critical') ? 'Não é possível limpar dados críticos' : 'Limpar cache'}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
      
      {/* Botão de Limpeza Geral */}
      <button
        onClick={() => clearCache()}
        disabled={clearing}
        className="w-full flex items-center justify-center gap-2 p-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50"
      >
        {clearing ? 'Limpando...' : (
          <>
            <Trash2 className="w-5 h-5" />
            Limpar Cache (Exceto Crítico)
          </>
        )}
      </button>
    </div>
  );
}
