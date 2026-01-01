// ============================================
// VERSIX NORMA - INDEXED DB OFFLINE STORAGE
// Sprint 9: Dados críticos offline, Modo Pânico
// ============================================

import { DBSchema, IDBPDatabase, openDB } from 'idb';

// ============================================
// SCHEMA DO BANCO
// ============================================
interface VersixOfflineDB extends DBSchema {
  'emergency-contacts': {
    key: string;
    value: EmergencyContact;
    indexes: { 'by-type': string };
  };
  'vulnerable-residents': {
    key: string;
    value: VulnerableResident;
    indexes: { 'by-building': string };
  };
  'pending-actions': {
    key: string;
    value: PendingAction;
    indexes: { 'by-created': number };
  };
  'user-profile': {
    key: string;
    value: CachedUserProfile;
  };
  'condominio-info': {
    key: string;
    value: CachedCondominioInfo;
  };
  'notifications-cache': {
    key: string;
    value: CachedNotification;
    indexes: { 'by-date': number };
  };
  'evacuation-maps': {
    key: string;
    value: EvacuationMap;
  };
  'sync-metadata': {
    key: string;
    value: SyncMetadata;
  };
}

// ============================================
// TIPOS
// ============================================
export interface EmergencyContact {
  id: string;
  tipo: 'bombeiros' | 'policia' | 'samu' | 'portaria' | 'sindico' | 'zelador' | 'gas' | 'energia';
  nome: string;
  telefone: string;
  ordem: number;
}

export interface VulnerableResident {
  id: string;
  nome: string;
  unidade: string;
  bloco: string;
  tipo: 'idoso' | 'cadeirante' | 'acamado' | 'gestante' | 'crianca' | 'deficiente_visual' | 'deficiente_auditivo';
  observacoes: string;
  contato_emergencia?: string;
}

export interface PendingAction {
  id: string;
  tipo: 'ocorrencia' | 'chamado' | 'reserva';
  method: 'POST' | 'PUT' | 'DELETE';
  url: string;
  body: Record<string, any>;
  created_at: number;
  retries: number;
}

export interface CachedUserProfile {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  unidade: string;
  bloco: string;
  role: string;
  avatar_url?: string;
  cached_at: number;
}

export interface CachedCondominioInfo {
  id: string;
  nome: string;
  endereco: string;
  telefone_portaria?: string;
  telefone_sindico?: string;
  cached_at: number;
}

export interface CachedNotification {
  id: string;
  titulo: string;
  corpo: string;
  tipo: string;
  prioridade: string;
  created_at: number;
  lido: boolean;
}

export interface EvacuationMap {
  id: string;
  bloco: string;
  andar: string;
  image_base64: string;
  cached_at: number;
}

export interface SyncMetadata {
  key: string;
  last_sync: number;
  version: string;
}

// ============================================
// DATABASE INSTANCE
// ============================================
const DB_NAME = 'versix-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<VersixOfflineDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<VersixOfflineDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<VersixOfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Emergency Contacts
      if (!db.objectStoreNames.contains('emergency-contacts')) {
        const store = db.createObjectStore('emergency-contacts', { keyPath: 'id' });
        store.createIndex('by-type', 'tipo');
      }

      // Vulnerable Residents
      if (!db.objectStoreNames.contains('vulnerable-residents')) {
        const store = db.createObjectStore('vulnerable-residents', { keyPath: 'id' });
        store.createIndex('by-building', 'bloco');
      }

      // Pending Actions
      if (!db.objectStoreNames.contains('pending-actions')) {
        const store = db.createObjectStore('pending-actions', { keyPath: 'id' });
        store.createIndex('by-created', 'created_at');
      }

      // User Profile
      if (!db.objectStoreNames.contains('user-profile')) {
        db.createObjectStore('user-profile', { keyPath: 'id' });
      }

      // Condominio Info
      if (!db.objectStoreNames.contains('condominio-info')) {
        db.createObjectStore('condominio-info', { keyPath: 'id' });
      }

      // Notifications Cache
      if (!db.objectStoreNames.contains('notifications-cache')) {
        const store = db.createObjectStore('notifications-cache', { keyPath: 'id' });
        store.createIndex('by-date', 'created_at');
      }

      // Evacuation Maps
      if (!db.objectStoreNames.contains('evacuation-maps')) {
        db.createObjectStore('evacuation-maps', { keyPath: 'id' });
      }

      // Sync Metadata
      if (!db.objectStoreNames.contains('sync-metadata')) {
        db.createObjectStore('sync-metadata', { keyPath: 'key' });
      }
    }
  });

  return dbInstance;
}

// ============================================
// EMERGENCY CONTACTS
// ============================================
export async function saveEmergencyContacts(contacts: EmergencyContact[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('emergency-contacts', 'readwrite');
  await tx.objectStore('emergency-contacts').clear();
  for (const contact of contacts) {
    await tx.objectStore('emergency-contacts').put(contact);
  }
  await tx.done;
  await updateSyncMetadata('emergency-contacts');
}

export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  const db = await getDB();
  const contacts = await db.getAll('emergency-contacts');
  return contacts.sort((a, b) => a.ordem - b.ordem);
}

// ============================================
// VULNERABLE RESIDENTS
// ============================================
export async function saveVulnerableResidents(residents: VulnerableResident[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('vulnerable-residents', 'readwrite');
  await tx.objectStore('vulnerable-residents').clear();
  for (const resident of residents) {
    await tx.objectStore('vulnerable-residents').put(resident);
  }
  await tx.done;
  await updateSyncMetadata('vulnerable-residents');
}

export async function getVulnerableResidents(): Promise<VulnerableResident[]> {
  const db = await getDB();
  return db.getAll('vulnerable-residents');
}

export async function getVulnerableResidentsByBuilding(bloco: string): Promise<VulnerableResident[]> {
  const db = await getDB();
  return db.getAllFromIndex('vulnerable-residents', 'by-building', bloco);
}

// ============================================
// PENDING ACTIONS (Offline Queue)
// ============================================
export async function addPendingAction(action: Omit<PendingAction, 'id' | 'created_at' | 'retries'>): Promise<string> {
  const db = await getDB();
  const id = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const pendingAction: PendingAction = {
    ...action,
    id,
    created_at: Date.now(),
    retries: 0
  };
  await db.put('pending-actions', pendingAction);
  return id;
}

export async function getPendingActions(): Promise<PendingAction[]> {
  const db = await getDB();
  return db.getAllFromIndex('pending-actions', 'by-created');
}

export async function removePendingAction(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('pending-actions', id);
}

export async function incrementActionRetry(id: string): Promise<void> {
  const db = await getDB();
  const action = await db.get('pending-actions', id);
  if (action) {
    action.retries += 1;
    await db.put('pending-actions', action);
  }
}

// ============================================
// USER PROFILE
// ============================================
export async function saveUserProfile(profile: CachedUserProfile): Promise<void> {
  const db = await getDB();
  await db.put('user-profile', { ...profile, cached_at: Date.now() });
}

export async function getUserProfile(): Promise<CachedUserProfile | undefined> {
  const db = await getDB();
  const profiles = await db.getAll('user-profile');
  return profiles[0];
}

// ============================================
// CONDOMINIO INFO
// ============================================
export async function saveCondominioInfo(info: CachedCondominioInfo): Promise<void> {
  const db = await getDB();
  await db.put('condominio-info', { ...info, cached_at: Date.now() });
}

export async function getCondominioInfo(): Promise<CachedCondominioInfo | undefined> {
  const db = await getDB();
  const infos = await db.getAll('condominio-info');
  return infos[0];
}

// ============================================
// NOTIFICATIONS
// ============================================
export async function cacheNotifications(notifications: CachedNotification[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('notifications-cache', 'readwrite');
  for (const notif of notifications.slice(0, 50)) {
    await tx.objectStore('notifications-cache').put(notif);
  }
  await tx.done;
}

export async function getCachedNotifications(limit = 20): Promise<CachedNotification[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('notifications-cache', 'by-date');
  return all.reverse().slice(0, limit);
}

// ============================================
// EVACUATION MAPS
// ============================================
export async function saveEvacuationMap(map: EvacuationMap): Promise<void> {
  const db = await getDB();
  await db.put('evacuation-maps', { ...map, cached_at: Date.now() });
}

export async function getEvacuationMap(bloco: string, andar: string): Promise<EvacuationMap | undefined> {
  const db = await getDB();
  return db.get('evacuation-maps', `${bloco}-${andar}`);
}

// ============================================
// SYNC METADATA
// ============================================
async function updateSyncMetadata(key: string): Promise<void> {
  const db = await getDB();
  await db.put('sync-metadata', {
    key,
    last_sync: Date.now(),
    version: '1.0.0'
  });
}

export async function getSyncMetadata(key: string): Promise<SyncMetadata | undefined> {
  const db = await getDB();
  return db.get('sync-metadata', key);
}

export async function getLastSyncTime(key: string): Promise<Date | null> {
  const metadata = await getSyncMetadata(key);
  return metadata ? new Date(metadata.last_sync) : null;
}

// ============================================
// PANIC MODE: Get All Critical Data
// ============================================
export async function getAllCriticalData(): Promise<{
  contacts: EmergencyContact[];
  vulnerable: VulnerableResident[];
  condominio: CachedCondominioInfo | undefined;
  lastSync: { contacts: Date | null; vulnerable: Date | null };
}> {
  const [contacts, vulnerable, condominio, contactsSync, vulnerableSync] = await Promise.all([
    getEmergencyContacts(),
    getVulnerableResidents(),
    getCondominioInfo(),
    getLastSyncTime('emergency-contacts'),
    getLastSyncTime('vulnerable-residents')
  ]);

  return {
    contacts,
    vulnerable,
    condominio,
    lastSync: {
      contacts: contactsSync,
      vulnerable: vulnerableSync
    }
  };
}

// ============================================
// CLEAR ALL DATA
// ============================================
export async function clearAllOfflineData(): Promise<void> {
  const db = await getDB();
  const stores = [
    'emergency-contacts',
    'vulnerable-residents',
    'pending-actions',
    'user-profile',
    'condominio-info',
    'notifications-cache',
    'evacuation-maps',
    'sync-metadata'
  ] as const;

  for (const store of stores) {
    await db.clear(store);
  }
}
