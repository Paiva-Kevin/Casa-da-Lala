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

function createLightweightLocalStorageCopy<T>(key: string, value: T): unknown {
  if (key === 'interacoes_lala' && Array.isArray(value)) {
    return value.map((item, idx) => {
      if (!item || typeof item !== 'object') return item;
      const copy: Record<string, unknown> = { ...item };
      // Never store large TTS audio blobs in localStorage (IndexedDB keeps them)
      delete copy.audioLalaBase64;
      delete copy.audioUsuarioBase64;
      // Only keep small image base64 in localStorage for the latest 2 messages; IndexedDB keeps all full-res attachments
      const stripAnexo = (anx: unknown) => {
        if (!anx || typeof anx !== 'object') return anx;
        const a = { ...(anx as Record<string, unknown>) };
        if (
          idx >= 2 ||
          (typeof a.base64 === 'string' && a.base64.length > 90000)
        ) {
          delete a.base64;
        }
        return a;
      };
      if (copy.anexo) {
        copy.anexo = stripAnexo(copy.anexo);
      }
      if (Array.isArray(copy.anexos)) {
        copy.anexos = copy.anexos.map(stripAnexo);
      }
      return copy;
    });
  }
  if (key === 'repositorio' && Array.isArray(value)) {
    return value.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const copy: Record<string, unknown> = { ...item };
      if (typeof copy.urlPreview === 'string' && copy.urlPreview.length > 90000) {
        delete copy.urlPreview;
      }
      return copy;
    });
  }
  return value;
}

function safeSetLocalStorage(fullKey: string, data: unknown): void {
  try {
    localStorage.setItem(fullKey, JSON.stringify(data));
  } catch {
    // QuotaExceededError recovery: free up heavy base64 strings in localStorage and retry
    try {
      const rawChat = localStorage.getItem(STORAGE_PREFIX + 'interacoes_lala');
      if (rawChat) {
        const parsedChat = JSON.parse(rawChat);
        if (Array.isArray(parsedChat)) {
          const ultraLight = parsedChat.map((it) => {
            if (!it || typeof it !== 'object') return it;
            const c = { ...it };
            delete c.audioLalaBase64;
            delete c.audioUsuarioBase64;
            if (c.anexo && typeof c.anexo === 'object') {
              const ca = { ...c.anexo };
              delete ca.base64;
              c.anexo = ca;
            }
            if (Array.isArray(c.anexos)) {
              c.anexos = c.anexos.map((ax: unknown) => {
                if (!ax || typeof ax !== 'object') return ax;
                const cax = { ...(ax as Record<string, unknown>) };
                delete cax.base64;
                return cax;
              });
            }
            return c;
          });
          localStorage.setItem(
            STORAGE_PREFIX + 'interacoes_lala',
            JSON.stringify(ultraLight)
          );
        }
      }
      localStorage.setItem(fullKey, JSON.stringify(data));
    } catch (err2) {
      console.warn('LocalStorage mirror warning after cleanup:', err2);
    }
  }
}

export async function idbSetRecord<T>(
  key: string,
  value: T,
  markPendingSync = true
): Promise<void> {
  const now = Date.now();
  safeSetLocalStorage(
    STORAGE_PREFIX + key,
    createLightweightLocalStorageCopy(key, value)
  );

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
    | { id?: string | number; nome?: string; saldoAtual?: number }[]
    | undefined;
  if (Array.isArray(contas)) {
    const demoIds = new Set(['conta-1', 'conta-2', 'conta-3', '1', '2', '3']);
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
  const lancamentos = records.lancamentos as
    | { id?: number; recorrente?: boolean; semData?: boolean }[]
    | undefined;
  if (
    Array.isArray(lancamentos) &&
    lancamentos.some(
      (l) =>
        Number(l?.id) > 1000 ||
        l?.recorrente === true ||
        l?.semData !== undefined
    )
  ) {
    return true;
  }
  const compromissos = records.compromissos as
    | { id?: string | number }[]
    | undefined;
  if (
    Array.isArray(compromissos) &&
    compromissos.some((c) => Number(c?.id) > 2000)
  ) {
    return true;
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

export function mergeInteracoesLala<T = Record<string, unknown>>(
  localRaw: unknown,
  remoteRaw: unknown,
  chatClearedAt = 0
): T[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const localList: any[] = Array.isArray(localRaw) ? localRaw : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const remoteList: any[] = Array.isArray(remoteRaw) ? remoteRaw : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mergeAnexos = (aList?: any[], bList?: any[]) => {
    const base = Array.isArray(aList) && aList.length > 0 ? aList : Array.isArray(bList) ? bList : [];
    const other = base === aList ? (Array.isArray(bList) ? bList : []) : (Array.isArray(aList) ? aList : []);
    if (base.length === 0) return undefined;
    return base.map((anx, i) => {
      const match = other[i] || other.find((o) => o?.nome === anx?.nome);
      if (match && !anx?.base64 && match?.base64) {
        return { ...anx, base64: match.base64 };
      }
      return anx;
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mergeAcoes = (aAcoes?: any[], bAcoes?: any[]) => {
    const listA = Array.isArray(aAcoes) ? aAcoes : [];
    const listB = Array.isArray(bAcoes) ? bAcoes : [];
    if (listA.length === 0) return listB;
    if (listB.length === 0) return listA;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new Map<string, any>();
    for (const ac of [...listB, ...listA]) {
      if (!ac || typeof ac !== 'object') continue;
      const key = String(ac.id || `${ac.tipo}-${ac.titulo}`);
      const prev = map.get(key);
      if (!prev) {
        map.set(key, ac);
      } else {
        map.set(key, {
          ...prev,
          ...ac,
          executada: Boolean(prev.executada || ac.executada),
          desfeita: Boolean(prev.desfeita || ac.desfeita),
          recusada: Boolean(prev.recusada || ac.recusada),
          editadaPeloUsuario: Boolean(prev.editadaPeloUsuario || ac.editadaPeloUsuario),
          executadaEm: ac.executadaEm || prev.executadaEm,
          payload: ac.editadaPeloUsuario
            ? ac.payload
            : prev.editadaPeloUsuario
            ? prev.payload
            : ac.payload || prev.payload,
        });
      }
    }
    return Array.from(map.values());
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mergeTwoItems = (existing: any, incoming: any) => {
    // Prefer the item that has finished processing (processandoResposta !== true)
    const primary =
      existing.processandoResposta && !incoming.processandoResposta
        ? incoming
        : !existing.processandoResposta && incoming.processandoResposta
        ? existing
        : existing;
    const secondary = primary === existing ? incoming : existing;

    const mergedAnexos = mergeAnexos(primary.anexos, secondary.anexos);
    const mergedAnexo =
      primary.anexo || secondary.anexo
        ? {
            ...(secondary.anexo || {}),
            ...(primary.anexo || {}),
            base64: primary.anexo?.base64 || secondary.anexo?.base64,
          }
        : undefined;

    return {
      ...secondary,
      ...primary,
      processandoResposta: Boolean(
        primary.processandoResposta && secondary.processandoResposta
      ),
      anexo: mergedAnexo,
      anexos: mergedAnexos,
      audioLalaBase64: primary.audioLalaBase64 || secondary.audioLalaBase64,
      acoesPropostas: mergeAcoes(primary.acoesPropostas, secondary.acoesPropostas),
    };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byId = new Map<number, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let welcomeCard: any = null;

  // Process local first, then remote so local is primary on ties
  for (const item of [...localList, ...remoteList]) {
    if (!item || typeof item !== 'object') continue;
    const numId = Number(item.id) || 0;
    if (numId === 1) {
      if (
        !welcomeCard ||
        (Array.isArray(item.tags) && item.tags.includes('Memória Preservada'))
      ) {
        welcomeCard = item;
      }
      continue;
    }
    // If chat was explicitly cleared at chatClearedAt, ignore messages from before chatClearedAt
    if (
      chatClearedAt > 0 &&
      numId > 1_000_000_000_000 &&
      numId < chatClearedAt - 500
    ) {
      continue;
    }

    // Check if an identical message (by id or same user text + same minute) already exists
    let matchedId: number | null = byId.has(numId) ? numId : null;
    if (matchedId === null && item.mensagemUsuario) {
      for (const [k, v] of byId.entries()) {
        if (
          String(v.mensagemUsuario || '').trim() ===
            String(item.mensagemUsuario || '').trim() &&
          String(v.dataHora || '') === String(item.dataHora || '') &&
          Math.abs(k - numId) < 60000
        ) {
          matchedId = k;
          break;
        }
      }
    }

    if (matchedId !== null) {
      byId.set(matchedId, mergeTwoItems(byId.get(matchedId), item));
    } else if (numId > 0) {
      byId.set(numId, item);
    }
  }

  const now = Date.now();
  const sortedReal = Array.from(byId.values())
    .map((it) => {
      // If an item was left with processandoResposta === true from earlier (created > 15s ago),
      // clear the lock so the UI is never stuck on startup
      if (
        it &&
        it.processandoResposta === true &&
        now - (Number(it.id) || 0) > 15000
      ) {
        return {
          ...it,
          processandoResposta: false,
          respostaLala:
            it.respostaLala &&
            !it.respostaLala.startsWith("Lando seus") &&
            !it.respostaLala.startsWith("Analisando sua mensagem")
              ? it.respostaLala
              : "Arquivo recebido! Toque em 'Reanalisar' ou 'Concluir Agora' para gerar os treinos e ações no seu aplicativo.",
        };
      }
      return it;
    })
    .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

  if (welcomeCard) {
    sortedReal.push(welcomeCard);
  } else if (sortedReal.length === 0 && localList.length > 0) {
    sortedReal.push(localList[0]);
  }

  return sortedReal.slice(0, 120) as T[];
}

export function mergeHistoricoAcoesLala<T = Record<string, unknown>>(
  localRaw: unknown,
  remoteRaw: unknown
): T[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const localList: any[] = Array.isArray(localRaw) ? localRaw : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const remoteList: any[] = Array.isArray(remoteRaw) ? remoteRaw : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byAcaoId = new Map<string, any>();

  for (const item of [...localList, ...remoteList]) {
    if (!item || typeof item !== 'object') continue;
    const key = String(item.acaoId || item.id || '');
    if (!key) continue;
    const existing = byAcaoId.get(key);
    if (!existing) {
      byAcaoId.set(key, item);
    } else {
      byAcaoId.set(key, {
        ...existing,
        ...item,
        desfeita: Boolean(existing.desfeita || item.desfeita),
        editadaPeloUsuario: Boolean(
          existing.editadaPeloUsuario || item.editadaPeloUsuario
        ),
        notaAprendizado: item.notaAprendizado || existing.notaAprendizado,
      });
    }
  }

  return Array.from(byAcaoId.values()).slice(0, 80) as T[];
}

export async function importFullBackupPayload(
  payload: AppBackupPayload
): Promise<void> {
  if (!payload || !payload.records) return;

  // Preserve Lala's learned memory, rules, conversation messages & action history
  const localPerfil = await idbGetRecord<{
    itensMemoriaViva?: { id: string; texto: string; categoria: string; dataHora?: string }[];
    regrasAprendidasLala?: string[];
    ultimaLimpezaChatEm?: number;
  }>('perfil_calibrado');

  const localInteracoes = await idbGetRecord<unknown[]>('interacoes_lala');
  const localHistorico = await idbGetRecord<unknown[]>('historico_acoes_lala');
  const localDemoLimpo = await idbGetRecord<boolean>('demo_limpo');

  const incomingPerfilObj = (payload.records.perfil_calibrado || {}) as {
    ultimaLimpezaChatEm?: number;
  };
  const chatClearedAt = Math.max(
    Number(localPerfil?.ultimaLimpezaChatEm || 0),
    Number(incomingPerfilObj?.ultimaLimpezaChatEm || 0)
  );

  for (const [key, value] of Object.entries(payload.records)) {
    if (key === 'demo_limpo' && localDemoLimpo === true) {
      await idbSetRecord(key, true, false);
    } else if (key === 'interacoes_lala') {
      const mergedChat = mergeInteracoesLala(
        localInteracoes,
        value,
        chatClearedAt
      );
      await idbSetRecord(key, mergedChat, false);
    } else if (key === 'historico_acoes_lala') {
      const mergedHist = mergeHistoricoAcoesLala(localHistorico, value);
      await idbSetRecord(key, mergedHist, false);
    } else if (key === 'contas' && Array.isArray(value)) {
      const contasLimpas = (value as { nome?: string; saldoAtual?: number }[]).filter(
        (c) => {
          const nomeStr = String(c?.nome || '');
          if (nomeStr === 'Itaú (Bolsa UERJ & CDT)') return false;
          if (
            (localDemoLimpo === true || payload.records.demo_limpo === true) &&
            Number(c?.saldoAtual) === 0 &&
            (nomeStr === 'Reserva / Caixinha Quitação' ||
              nomeStr === 'Nubank (Conta / Pix)') &&
            value.length === 3
          ) {
            return false;
          }
          return true;
        }
      );
      await idbSetRecord(key, contasLimpas, false);
    } else if (
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
          ultimaLimpezaChatEm: chatClearedAt > 0 ? chatClearedAt : undefined,
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
