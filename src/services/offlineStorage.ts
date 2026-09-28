// Offline-First Primary Storage Service using IndexedDB + LocalStorage Mirror
// Stores key-value entries and full app snapshot with timestamps for conflict resolution.

const DB_NAME = 'CasaDaLalaOfflineDB';
const DB_VERSION = 1;
const STORE_RECORDS = 'app_records';
const STORE_META = 'sync_metadata';
const STORAGE_PREFIX = 'casa_lala_v5_';

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error';

export interface SyncMetadata {
  id: 'meta';
  updatedAt: number; // Epoch ms of last local modification
  updatedAtISO: string;
  lastSyncedAt: number | null;
  lastSyncedAtISO: string | null;
  syncStatus: SyncStatus;
  lastError?: string | null;
  driveFileId?: string | null;
  useAppDataFolder?: boolean;
}

export interface AppBackupPayload {
  appName: 'Casa da Lala';
  schemaVersion: number;
  updatedAt: number;
  updatedAtISO: string;
  deviceInfo: string;
  records: Record<string, unknown>;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openOfflineDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB not supported'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        db.createObjectStore(STORE_RECORDS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

export async function idbGetRecord<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openOfflineDB();
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_RECORDS, 'readonly');
      const store = tx.objectStore(STORE_RECORDS);
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(req.result ? (req.result.value as T) : undefined);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      // ignore
    }
    return undefined;
  }
}

export async function idbSetRecord<T>(
  key: string,
  value: T,
  markPendingSync = true
): Promise<void> {
  const now = Date.now();
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.warn('LocalStorage mirror warning:', err);
  }

  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_RECORDS, STORE_META], 'readwrite');
      const recordStore = tx.objectStore(STORE_RECORDS);
      recordStore.put({
        key,
        value,
        updatedAt: now,
        updatedAtISO: new Date(now).toISOString(),
      });

      if (markPendingSync) {
        const metaStore = tx.objectStore(STORE_META);
        const getReq = metaStore.get('meta');
        getReq.onsuccess = () => {
          const existing: SyncMetadata = getReq.result || {
            id: 'meta',
            updatedAt: now,
            updatedAtISO: new Date(now).toISOString(),
            lastSyncedAt: null,
            lastSyncedAtISO: null,
            syncStatus: 'pending',
          };
          const updatedMeta: SyncMetadata = {
            ...existing,
            updatedAt: now,
            updatedAtISO: new Date(now).toISOString(),
            syncStatus: 'pending',
          };
          metaStore.put(updatedMeta);
          try {
            localStorage.setItem(
              STORAGE_PREFIX + '__sync_meta',
              JSON.stringify(updatedMeta)
            );
          } catch {
            // ignore
          }
        };
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB write fallback to LocalStorage:', err);
  }
}

export async function getSyncMetadata(): Promise<SyncMetadata> {
  const fallbackMeta = (): SyncMetadata => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + '__sync_meta');
      if (raw) return JSON.parse(raw) as SyncMetadata;
    } catch {
      // ignore
    }
    const now = Date.now();
    return {
      id: 'meta',
      updatedAt: now,
      updatedAtISO: new Date(now).toISOString(),
      lastSyncedAt: null,
      lastSyncedAtISO: null,
      syncStatus: 'pending',
    };
  };

  try {
    const db = await openOfflineDB();
    return await new Promise<SyncMetadata>((resolve) => {
      const tx = db.transaction(STORE_META, 'readonly');
      const store = tx.objectStore(STORE_META);
      const req = store.get('meta');
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result as SyncMetadata);
        } else {
          resolve(fallbackMeta());
        }
      };
      req.onerror = () => resolve(fallbackMeta());
    });
  } catch {
    return fallbackMeta();
  }
}

export async function updateSyncMetadata(
  partial: Partial<SyncMetadata>
): Promise<SyncMetadata> {
  const current = await getSyncMetadata();
  const next: SyncMetadata = {
    ...current,
    ...partial,
    id: 'meta',
  };

  try {
    localStorage.setItem(STORAGE_PREFIX + '__sync_meta', JSON.stringify(next));
  } catch {
    // ignore
  }

  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readwrite');
      const store = tx.objectStore(STORE_META);
      store.put(next);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }

  return next;
}

export const ALL_STATE_KEYS = [
  'theme',
  'tarefas',
  'habitos',
  'compromissos',
  'radar',
  'metas',
  'checkin',
  'disciplinas',
  'artigos',
  'livros',
  'streak_leitura',
  'projetos',
  'comodos',
  'estoque_casa',
  'lista_compras',
  'pets_perfil',
  'fichas_treino',
  'refeicoes',
  'volume_semana',
  'ultimo_srpe',
  'streak_treino',
  'contas',
  'cartoes',
  'orcamentos',
  'lancamentos',
  'repositorio',
  'interacoes_lala',
  'tom_governanta',
  'perfil_calibrado',
] as const;

export async function exportFullBackupPayload(): Promise<AppBackupPayload> {
  const meta = await getSyncMetadata();
  const records: Record<string, unknown> = {};

  for (const key of ALL_STATE_KEYS) {
    const idbVal = await idbGetRecord<unknown>(key);
    if (idbVal !== undefined) {
      records[key] = idbVal;
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_PREFIX + key);
        if (raw) records[key] = JSON.parse(raw);
      } catch {
        // ignore
      }
    }
  }

  const updatedAt = meta.updatedAt || Date.now();
  return {
    appName: 'Casa da Lala',
    schemaVersion: 5,
    updatedAt,
    updatedAtISO: new Date(updatedAt).toISOString(),
    deviceInfo:
      typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Client',
    records,
  };
}

export async function importFullBackupPayload(
  payload: AppBackupPayload
): Promise<void> {
  if (!payload || !payload.records) return;

  for (const [key, value] of Object.entries(payload.records)) {
    await idbSetRecord(key, value, false);
  }

  const now = Date.now();
  await updateSyncMetadata({
    updatedAt: payload.updatedAt || now,
    updatedAtISO:
      payload.updatedAtISO || new Date(payload.updatedAt || now).toISOString(),
    lastSyncedAt: now,
    lastSyncedAtISO: new Date(now).toISOString(),
    syncStatus: 'synced',
    lastError: null,
  });
}
