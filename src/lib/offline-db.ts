// src/lib/offline-db.ts

import { DBSchema, IDBPDatabase, openDB } from 'idb';

interface VersixOfflineDB extends DBSchema {
  'critical-data': {
    key: string;
    value: {
      id: string;
      type: 'emergency' | 'contacts' | 'vulnerable' | 'maps';
      data: any;
      updatedAt: string;
    };
  };
  'pending-actions': {
    key: string;
    value: {
      id: string;
      url: string;
      method: string;
      headers: Record<string, string>;
      body: any;
      createdAt: string;
    };
    indexes: { 'by-created': string };
  };
  'cached-data': {
    key: string;
    value: {
      key: string;
      data: any;
      expiresAt: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<VersixOfflineDB>> | null = null;

export async function resetDB() {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch (error) {
      console.warn('[OfflineDB] Error closing DB during reset:', error);
    }
  }
  dbPromise = null;

  // Delete the database
  const deleteRequest = indexedDB.deleteDatabase('versix-offline');
  return new Promise<void>((resolve, reject) => {
    deleteRequest.onsuccess = () => {
      console.log('[OfflineDB] Database reset successfully');
      resolve();
    };
    deleteRequest.onerror = () => {
      console.error('[OfflineDB] Failed to reset database');
      reject(deleteRequest.error);
    };
  });
}

export async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<VersixOfflineDB>('versix-offline', 1, {
      upgrade(db) {
        // Store para dados críticos
        if (!db.objectStoreNames.contains('critical-data')) {
          db.createObjectStore('critical-data', { keyPath: 'id' });
        }

        // Store para ações pendentes
        if (!db.objectStoreNames.contains('pending-actions')) {
          const store = db.createObjectStore('pending-actions', { keyPath: 'id' });
          store.createIndex('by-created', 'createdAt');
        }

        // Store para cache genérico
        if (!db.objectStoreNames.contains('cached-data')) {
          db.createObjectStore('cached-data', { keyPath: 'key' });
        }
      },
      blocked() {
        console.warn('[OfflineDB] Database blocked, retrying...');
        // Reset promise to try again
        dbPromise = null;
      },
      blocking() {
        console.warn('[OfflineDB] Database blocking, closing...');
        // Reset promise to allow new connection
        dbPromise = null;
      }
    }).catch(error => {
      console.error('[OfflineDB] Failed to open database:', error);
      // Reset promise on error
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

// =====================================================
// DADOS CRÍTICOS (Modo Pânico)
// =====================================================
export async function saveCriticalData(type: string, data: any) {
  try {
    const db = await getDB();
    await db.put('critical-data', {
      id: type,
      type: type as any,
      data,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[OfflineDB] Error saving ${type}:`, error);
    // Try to reset DB if it's corrupted
    if (error.name === 'InvalidStateError' || error.name === 'VersionError') {
      console.warn('[OfflineDB] Attempting DB reset due to corruption');
      await resetDB();
    }
    throw error;
  }
}

export async function getCriticalData(type: string) {
  const db = await getDB();
  return db.get('critical-data', type);
}

export async function getAllCriticalData() {
  const db = await getDB();
  return db.getAll('critical-data');
}

// =====================================================
// AÇÕES PENDENTES (Offline Queue)
// =====================================================
export async function queueOfflineAction(action: {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
}) {
  const db = await getDB();
  const id = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  await db.add('pending-actions', {
    id,
    url: action.url,
    method: action.method,
    headers: action.headers || {},
    body: action.body,
    createdAt: new Date().toISOString()
  });

  // Solicitar sync quando online
  if ('serviceWorker' in navigator && 'sync' in window.registration) {
    await (window.registration as any).sync.register('sync-offline-actions');
  }

  return id;
}

export async function getPendingActions() {
  const db = await getDB();
  return db.getAllFromIndex('pending-actions', 'by-created');
}

export async function removePendingAction(id: string) {
  const db = await getDB();
  await db.delete('pending-actions', id);
}

// =====================================================
// CACHE GENÉRICO
// =====================================================
export async function setCache<T>(key: string, data: T, ttlMinutes: number = 60) {
  const db = await getDB();
  await db.put('cached-data', {
    key,
    data,
    expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()
  });
}

export async function getCache<T>(key: string): Promise<T | null> {
  const db = await getDB();
  const cached = await db.get('cached-data', key);

  if (!cached) return null;

  // Verificar expiração
  if (new Date(cached.expiresAt) < new Date()) {
    await db.delete('cached-data', key);
    return null;
  }

  return cached.data as T;
}
