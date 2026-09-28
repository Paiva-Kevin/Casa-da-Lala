import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppBackupPayload } from './offlineStorage';

// Required Google Drive & Google Calendar OAuth 2.0 scopes
export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/calendar.events',
];

const BACKUP_FILE_NAME = 'app_data.json';

// Initialize Firebase App safely (reuse if already initialized)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// Session-scoped access token cache so page reloads keep Google Calendar & Drive active
const SESSION_TOKEN_KEY = 'casa_lala_oauth_access_token_v2';
const SESSION_CALENDAR_SCOPE_KEY = 'casa_lala_oauth_calendar_scope_v2';
const SESSION_MULTI_ACCOUNTS_KEY = 'casa_lala_google_accounts_v1';

export interface ConnectedGoogleAccount {
  email: string;
  displayName: string;
  photoURL: string | null;
  accessToken: string;
  corHex: string;
  colorHex: string;
  ativo: boolean;
  active: boolean;
}

const DEFAULT_ACCOUNT_COLORS = [
  '#0284C7',
  '#E11D48',
  '#7C3AED',
  '#059669',
  '#D97706',
  '#2E6F5E',
];

let isSigningIn = false;
let cachedAccessToken: string | null = (() => {
  try {
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
})();

export function getConnectedGoogleAccounts(): ConnectedGoogleAccount[] {
  try {
    const raw = sessionStorage.getItem(SESSION_MULTI_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((a: Partial<ConnectedGoogleAccount>) => {
      const hex = a.corHex || a.colorHex || '#0284C7';
      const isAtivo = a.ativo !== undefined ? a.ativo : a.active !== undefined ? a.active : true;
      return {
        email: a.email || 'conta@gmail.com',
        displayName: a.displayName || a.email || 'Conta Google',
        photoURL: a.photoURL || null,
        accessToken: a.accessToken || '',
        corHex: hex,
        colorHex: hex,
        ativo: isAtivo,
        active: isAtivo,
      };
    });
  } catch {
    return [];
  }
}

export function saveConnectedGoogleAccounts(accounts: ConnectedGoogleAccount[]) {
  try {
    sessionStorage.setItem(SESSION_MULTI_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore
  }
}

export function upsertConnectedGoogleAccount(
  user: GoogleUserProfile,
  accessToken: string,
  corHex?: string
): ConnectedGoogleAccount[] {
  const emailKey = (user.email || user.displayName || 'conta1@gmail.com').toLowerCase();
  const list = getConnectedGoogleAccounts();
  const idx = list.findIndex((a) => a.email.toLowerCase() === emailKey);
  if (idx >= 0) {
    const chosenHex = corHex || list[idx].corHex || list[idx].colorHex || '#0284C7';
    list[idx] = {
      ...list[idx],
      displayName: user.displayName || list[idx].displayName,
      photoURL: user.photoURL || list[idx].photoURL,
      accessToken,
      corHex: chosenHex,
      colorHex: chosenHex,
    };
  } else {
    const chosenHex =
      corHex ||
      DEFAULT_ACCOUNT_COLORS[list.length % DEFAULT_ACCOUNT_COLORS.length];
    list.push({
      email: user.email || emailKey,
      displayName: user.displayName || user.email || 'Conta Google',
      photoURL: user.photoURL,
      accessToken,
      corHex: chosenHex,
      colorHex: chosenHex,
      ativo: true,
      active: true,
    });
  }
  saveConnectedGoogleAccounts(list);
  return list;
}

export function toggleConnectedGoogleAccount(email: string): ConnectedGoogleAccount[] {
  const list = getConnectedGoogleAccounts().map((a) => {
    if (a.email.toLowerCase() === email.toLowerCase()) {
      const next = !a.ativo;
      return { ...a, ativo: next, active: next };
    }
    return a;
  });
  saveConnectedGoogleAccounts(list);
  return list;
}

export function updateConnectedGoogleAccountColor(
  email: string,
  corHex: string
): ConnectedGoogleAccount[] {
  const list = getConnectedGoogleAccounts().map((a) =>
    a.email.toLowerCase() === email.toLowerCase()
      ? { ...a, corHex, colorHex: corHex }
      : a
  );
  saveConnectedGoogleAccounts(list);
  return list;
}

export function removeConnectedGoogleAccount(email: string): ConnectedGoogleAccount[] {
  const list = getConnectedGoogleAccounts().filter(
    (a) => a.email.toLowerCase() !== email.toLowerCase()
  );
  saveConnectedGoogleAccounts(list);
  return list;
}

export async function connectAdditionalGoogleAccount(): Promise<{
  user?: GoogleUserProfile;
  accessToken?: string;
  error?: string;
}> {
  try {
    const res = await googleSignIn(true, true);
    if (!res) return {};
    return { user: res.user, accessToken: res.accessToken };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'Não foi possível conectar outra conta Google.',
    };
  }
}

function setCachedToken(token: string | null, hasCalendarScope = true) {
  cachedAccessToken = token;
  try {
    if (token) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      if (hasCalendarScope) {
        sessionStorage.setItem(SESSION_CALENDAR_SCOPE_KEY, '1');
      }
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_CALENDAR_SCOPE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function hasCalendarScopeGranted(): boolean {
  try {
    return (
      Boolean(cachedAccessToken) &&
      sessionStorage.getItem(SESSION_CALENDAR_SCOPE_KEY) === '1'
    );
  } catch {
    return Boolean(cachedAccessToken);
  }
}

export interface GoogleUserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export const initAuth = (
  onAuthSuccess?: (user: GoogleUserProfile, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        const profile: GoogleUserProfile = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        };
        upsertConnectedGoogleAccount(profile, cachedAccessToken);
        if (onAuthSuccess) {
          onAuthSuccess(profile, cachedAccessToken);
        }
      } else if (!isSigningIn) {
        setCachedToken(null);
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      setCachedToken(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in using Firebase Auth Popup (pre-configured in AI Studio)
export const googleSignIn = async (
  forceConsent = false,
  selectAccount = false
): Promise<{
  user: GoogleUserProfile;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const authProvider = new GoogleAuthProvider();
    SCOPES.forEach((scope) => authProvider.addScope(scope));
    if (selectAccount) {
      authProvider.setCustomParameters({ prompt: 'select_account consent' });
    } else if (forceConsent || !hasCalendarScopeGranted()) {
      authProvider.setCustomParameters({ prompt: 'consent' });
    }
    const result = await signInWithPopup(auth, authProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error(
        'Não foi possível obter o token OAuth do Google. Tente novamente.'
      );
    }

    const userProfile: GoogleUserProfile = {
      uid: result.user.uid,
      displayName: result.user.displayName,
      email: result.user.email,
      photoURL: result.user.photoURL,
    };

    if (!cachedAccessToken || !selectAccount) {
      setCachedToken(credential.accessToken, true);
    }
    upsertConnectedGoogleAccount(userProfile, credential.accessToken);

    return {
      user: userProfile,
      accessToken: credential.accessToken,
    };
  } catch (error: unknown) {
    const errCode = (error as { code?: string })?.code || '';
    const errMsg = error instanceof Error ? error.message : String(error);
    if (
      errCode === 'auth/popup-closed-by-user' ||
      errCode === 'auth/cancelled-popup-request' ||
      errMsg.includes('auth/popup-closed-by-user') ||
      errMsg.includes('auth/cancelled-popup-request')
    ) {
      // User closed the popup window before completing sign-in — return null gracefully without throwing
      return null;
    }
    if (
      errCode === 'auth/popup-blocked' ||
      errMsg.includes('auth/popup-blocked')
    ) {
      throw new Error(
        'O navegador bloqueou a janela de login. Permita pop-ups para este site e tente novamente.'
      );
    }
    if (
      errCode === 'auth/unauthorized-domain' ||
      errMsg.includes('auth/unauthorized-domain')
    ) {
      throw new Error(
        `Domínio (${window.location.hostname}) não autorizado no Firebase Auth. Adicione-o em Firebase Console > Authentication > Settings > Authorized domains.`
      );
    }
    throw new Error(
      'Não foi possível concluir o login com o Google. Tente novamente.'
    );
  } finally {
    isSigningIn = false;
  }
};

// Optional fallback: Sign in directly via Google Identity Services (GIS) if user provides custom Client ID
export const signInWithCustomGISClient = (
  customClientId: string
): Promise<{ user: GoogleUserProfile; accessToken: string }> => {
  return new Promise((resolve, reject) => {
    const win = window as unknown as {
      google?: {
        accounts?: {
          oauth2?: {
            initTokenClient: (config: {
              client_id: string;
              scope: string;
              callback: (resp: {
                access_token?: string;
                error?: string;
              }) => void;
            }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
          };
        };
      };
    };

    if (!win.google?.accounts?.oauth2) {
      reject(
        new Error(
          'Biblioteca Google Identity Services (GIS) ainda não carregada ou bloqueada offline.'
        )
      );
      return;
    }

    const tokenClient = win.google.accounts.oauth2.initTokenClient({
      client_id: customClientId.trim(),
      scope: SCOPES.join(' '),
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(
              response.error || 'Falha ao autenticar via GIS TokenClient'
            )
          );
          return;
        }
        setCachedToken(response.access_token, true);
        resolve({
          user: {
            uid: 'gis-user',
            displayName: 'Conta Google Conectada (GIS)',
            email: null,
            photoURL: null,
          },
          accessToken: response.access_token,
        });
      },
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const clearCachedAccessToken = () => {
  setCachedToken(null);
};

export const logoutGoogleDrive = async () => {
  try {
    await auth.signOut();
  } catch {
    // ignore if signed in via custom GIS
  }
  setCachedToken(null);
};

export interface DriveBackupFileMeta {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

// Search for `app_data.json` in Google Drive (`appDataFolder` or `drive`)
export async function findDriveBackupFile(
  useAppDataFolder = false
): Promise<DriveBackupFileMeta | null> {
  const token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');

  const spaces = useAppDataFolder ? 'appDataFolder' : 'drive';
  const query = encodeURIComponent(
    `name = '${BACKUP_FILE_NAME}' and trashed = false`
  );
  const url = `https://www.googleapis.com/drive/v3/files?spaces=${spaces}&q=${query}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=1`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    throw new Error('AUTH_REQUIRED');
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erro ao buscar arquivo no Google Drive: ${errText}`);
  }

  const data = (await res.json()) as { files?: DriveBackupFileMeta[] };
  return data.files && data.files.length > 0 ? data.files[0] : null;
}

// Download the JSON content of `app_data.json` from Google Drive
export async function downloadDriveBackupContent(
  fileId: string
): Promise<AppBackupPayload> {
  const token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    throw new Error('AUTH_REQUIRED');
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erro ao baixar backup do Google Drive: ${errText}`);
  }

  return (await res.json()) as AppBackupPayload;
}

// Create or Update `app_data.json` on Google Drive using multipart upload
export async function uploadDriveBackupContent(
  payload: AppBackupPayload,
  existingFileId?: string | null,
  useAppDataFolder = false
): Promise<DriveBackupFileMeta> {
  const token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');

  const metadata: Record<string, unknown> = {
    name: BACKUP_FILE_NAME,
    mimeType: 'application/json',
    description:
      'Backup sincronizado Offline-First do aplicativo Casa da Lala (PWA)',
  };

  if (!existingFileId && useAppDataFolder) {
    metadata.parents = ['appDataFolder'];
  }

  const boundary = '-------casa_da_lala_sync_boundary_v5';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(payload, null, 2) +
    closeDelimiter;

  const endpoint = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,modifiedTime,size`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size`;

  const method = existingFileId ? 'PATCH' : 'POST';

  const res = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    throw new Error('AUTH_REQUIRED');
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erro ao salvar no Google Drive: ${errText}`);
  }

  return (await res.json()) as DriveBackupFileMeta;
}
