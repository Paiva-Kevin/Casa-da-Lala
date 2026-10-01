// Offline-First Primary Storage Service using IndexedDB + LocalStorage Mirror
// Stores key-value entries and full app snapshot with timestamps for conflict resolution.

const DB_NAME = 'CasaDaLalaOfflineDB';
const DB_VERSION = 1;
const STORE_RECORDS = 'app_records';
const STORE_META = 'sync_metadata';
const STORAGE_PREFIX = 'casa_lala_v5_';

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error';

export interface SyncMetadata {
  id: 'meta' | 'meta_v3';
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
        const getReq = metaStore.get('meta_v3');
        getReq.onsuccess = () => {
          const existing: SyncMetadata = getReq.result || {
            id: 'meta_v3',
            updatedAt: now,
            updatedAtISO: new Date(now).toISOString(),
            lastSyncedAt: null,
            lastSyncedAtISO: null,
            syncStatus: 'pending',
          };
          const updatedMeta: SyncMetadata = {
            ...existing,
            id: 'meta_v3',
            updatedAt: now,
            updatedAtISO: new Date(now).toISOString(),
            syncStatus: 'pending',
            lastError: null,
          };
          metaStore.put(updatedMeta);
          try {
            localStorage.setItem(
              STORAGE_PREFIX + '__sync_meta_v3',
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
  const sanitizeMeta = (m: SyncMetadata): SyncMetadata => {
    if (
      m.lastError &&
      (m.lastError.toLowerCase().includes('expirado') ||
        m.lastError.includes('AUTH_REQUIRED') ||
        m.lastError.includes('NETWORK_INSTABILITY') ||
        m.lastError.toLowerCase().includes('failed to fetch') ||
        m.lastError.toLowerCase().includes('network') ||
        m.lastError.toLowerCase().includes('oauth'))
    ) {
      return {
        ...m,
        lastError: null,
        syncStatus: 'synced',
      };
    }
    return m;
  };

  const fallbackMeta = (): SyncMetadata => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + '__sync_meta_v3');
      if (raw) return sanitizeMeta(JSON.parse(raw) as SyncMetadata);
    } catch {
      // ignore
    }
    return {
      id: 'meta_v3',
      updatedAt: 0,
      updatedAtISO: '',
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
      const req = store.get('meta_v3');
      req.onsuccess = () => {
        if (req.result) {
          resolve(sanitizeMeta(req.result as SyncMetadata));
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
    id: 'meta_v3',
  };

  try {
    localStorage.setItem(
      STORAGE_PREFIX + '__sync_meta_v3',
      JSON.stringify(next)
    );
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
  'config_calendario',
  'demo_limpo',
  'historico_acoes_lala',
] as const;

// Checks whether the local browser state actually has real user interactions/modifications
// rather than just the untouched default initial template data.
export function hasRealUserCustomizations(
  records: Record<string, unknown>
): boolean {
  if (!records || typeof records !== 'object') return false;
  if (records.demo_limpo === true) return true;
  if (
    Array.isArray(records.historico_acoes_lala) &&
    records.historico_acoes_lala.length > 0
  ) {
    return true;
  }
  if (
    Array.isArray(records.interacoes_lala) &&
    records.interacoes_lala.length > 1
  ) {
    return true;
  }
  const perfil = records.perfil_calibrado as
    | {
        calibrado?: boolean;
        itensMemoriaViva?: unknown[];
        regrasAprendidasLala?: unknown[];
      }
    | undefined;
  if (perfil?.calibrado) return true;
  if (
    Array.isArray(perfil?.itensMemoriaViva) &&
    perfil.itensMemoriaViva.length > 0
  ) {
    return true;
  }
  if (
    Array.isArray(perfil?.regrasAprendidasLala) &&
    perfil.regrasAprendidasLala.length > 0
  ) {
    return true;
  }
  const contas = records.contas as
    | { id?: string; nome?: string; saldoAtual?: number }[]
    | undefined;
  if (Array.isArray(contas)) {
    const demoIds = new Set(['conta-1', 'conta-2', 'conta-3']);
    const demoBalances = new Set([620, 210, 0, 2450, 385.5, 240, 420]);
    const isDefaultDemoContas =
      contas.length === 0 ||
      contas.every(
        (c) =>
          demoIds.has(String(c?.id || '')) &&
          demoBalances.has(Number(c?.saldoAtual ?? 0))
      );
    if (!isDefaultDemoContas) {
      return true;
    }
  }
  return false;
}

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

  const hasCustom = hasRealUserCustomizations(records);
  const updatedAt = hasCustom ? meta.updatedAt || 0 : 0;

  return {
    appName: 'Casa da Lala',
    schemaVersion: 5,
    updatedAt,
    updatedAtISO: updatedAt > 0 ? new Date(updatedAt).toISOString() : '',
    deviceInfo:
      typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Client',
    records,
  };
}

export async function importFullBackupPayload(
  payload: AppBackupPayload
): Promise<void> {
  if (!payload || !payload.records) return;

  // Preserve Lala's learned memory & rules if local has items that remote doesn't have yet
  const localPerfil = await idbGetRecord<{
    itensMemoriaViva?: { id: string; texto: string; categoria: string; dataHora?: string }[];
    regrasAprendidasLala?: string[];
  }>('perfil_calibrado');

  for (const [key, value] of Object.entries(payload.records)) {
    if (
      key === 'perfil_calibrado' &&
      value &&
      typeof value === 'object' &&
      localPerfil
    ) {
      const incomingPerfil = value as Record<string, unknown>;
      const remoteMem = Array.isArray(incomingPerfil.itensMemoriaViva)
        ? (incomingPerfil.itensMemoriaViva as { id: string; texto: string; categoria: string; dataHora?: string }[])
        : [];
      const localMem = Array.isArray(localPerfil.itensMemoriaViva)
        ? localPerfil.itensMemoriaViva
        : [];
      const mergedMem = [...remoteMem];
      for (const item of localMem) {
        if (
          item?.texto &&
          !mergedMem.some(
            (m) => m.texto?.toLowerCase().trim() === item.texto.toLowerCase().trim()
          )
        ) {
          mergedMem.push(item);
        }
      }

      const remoteRules = Array.isArray(incomingPerfil.regrasAprendidasLala)
        ? (incomingPerfil.regrasAprendidasLala as string[])
        : [];
      const localRules = Array.isArray(localPerfil.regrasAprendidasLala)
        ? localPerfil.regrasAprendidasLala
        : [];
      const mergedRules = [...remoteRules];
      for (const r of localRules) {
        if (
          r &&
          !mergedRules.some(
            (mr) => mr.toLowerCase().trim() === r.toLowerCase().trim()
          )
        ) {
          mergedRules.push(r);
        }
      }

      await idbSetRecord(
        key,
        {
          ...incomingPerfil,
          itensMemoriaViva: mergedMem,
          regrasAprendidasLala: mergedRules,
        },
        false
      );
    } else {
      await idbSetRecord(key, value, false);
    }
  }

  const now = Date.now();
  const effectiveUpdatedAt = payload.updatedAt || now;
  await updateSyncMetadata({
    updatedAt: effectiveUpdatedAt,
    updatedAtISO:
      payload.updatedAtISO || new Date(effectiveUpdatedAt).toISOString(),
    lastSyncedAt: now,
    lastSyncedAtISO: new Date(now).toISOString(),
    syncStatus: 'synced',
    lastError: null,
  });
}

// Synchronizes local state with the server's /api/sync/snapshot endpoint so that
// Preview, Web Version, and Mobile PWA share state automatically in real time.
export async function syncSnapshotWithServer(
  forcePush = false
): Promise<{
  action: 'pulled' | 'pushed' | 'noop';
  buildVersion?: string;
}> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { action: 'noop' };
  }

  try {
    const localPayload = await exportFullBackupPayload();
    const localHasCustom = hasRealUserCustomizations(localPayload.records);
    const localDemoLimpo = localPayload.records.demo_limpo === true;
    const localTime = localHasCustom
      ? localPayload.updatedAt || (forcePush ? Date.now() : 0)
      : 0;

    if (forcePush && localHasCustom) {
      const pushTime = localTime || Date.now();
      const pushPayload = {
        ...localPayload,
        updatedAt: pushTime,
      };
      const res = await fetch('/api/sync/snapshot?force=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pushPayload),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const data = await res.json();
        if (
          data?.updated === false &&
          data?.snapshot?.records &&
          !(localDemoLimpo && data.snapshot.records.demo_limpo !== true)
        ) {
          await importFullBackupPayload(data.snapshot);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('lala-backup-restored'));
          }
          return { action: 'pulled', buildVersion: data.buildVersion };
        }
        return { action: 'pushed', buildVersion: data.buildVersion };
      }
      return { action: 'noop' };
    }

    const getRes = await fetch('/api/sync/snapshot', {
      method: 'GET',
      cache: 'no-store',
    });
    const getCt = getRes.headers.get('content-type') || '';
    if (!getRes.ok || !getCt.includes('application/json')) {
      return { action: 'noop' };
    }

    const data = await getRes.json();
    const remoteSnap = data?.snapshot as AppBackupPayload | null;
    const remoteHasCustom = remoteSnap
      ? hasRealUserCustomizations(remoteSnap.records)
      : false;
    const remoteDemoLimpo = remoteSnap?.records?.demo_limpo === true;
    const remoteTime = remoteHasCustom ? Number(remoteSnap?.updatedAt) || 0 : 0;

    // Protect cleaned local state (demo_limpo === true) from ever being overwritten by an uncleaned demo snapshot!
    if (localDemoLimpo && remoteSnap && !remoteDemoLimpo) {
      const pushTime = localTime || Date.now();
      await fetch('/api/sync/snapshot?force=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...localPayload,
          updatedAt: pushTime,
        }),
      });
      return { action: 'pushed', buildVersion: data?.buildVersion };
    }

    // 1. If server has a newer customized snapshot (or local is just untouched default data while server has real user data), pull it!
    if (
      remoteSnap &&
      remoteSnap.records &&
      remoteHasCustom &&
      (!localHasCustom || remoteTime > localTime + 1000)
    ) {
      await importFullBackupPayload(remoteSnap);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lala-backup-restored'));
      }
      return { action: 'pulled', buildVersion: data?.buildVersion };
    }

    // 2. Only push to server if local ACTUALLY has real user customizations and is newer than server!
    if (
      localHasCustom &&
      localTime > 0 &&
      (!remoteSnap || !remoteHasCustom || localTime > remoteTime + 1000)
    ) {
      const pushPayload = {
        ...localPayload,
        updatedAt: localTime,
      };
      await fetch('/api/sync/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pushPayload),
      });
      return { action: 'pushed', buildVersion: data?.buildVersion };
    }

    return { action: 'noop', buildVersion: data?.buildVersion };
  } catch {
    return { action: 'noop' };
  }
}
