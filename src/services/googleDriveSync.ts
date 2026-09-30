import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithCredential,
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

// Persistent storage keys (localStorage) so closing/reopening the app or using it offline keeps the user logged in
const STORAGE_TOKEN_KEY = 'casa_lala_oauth_access_token_v3';
const STORAGE_TOKEN_EXPIRES_AT_KEY = 'casa_lala_oauth_token_expires_at_v1';
const STORAGE_CALENDAR_SCOPE_KEY = 'casa_lala_oauth_calendar_scope_v3';
const STORAGE_MULTI_ACCOUNTS_KEY = 'casa_lala_google_accounts_v2';
const STORAGE_USER_PROFILE_KEY = 'casa_lala_google_user_profile_v1';
const STORAGE_EXPLICIT_LOGOUT_KEY = 'casa_lala_explicit_logout_v1';

// Legacy sessionStorage keys for seamless migration
const LEGACY_SESSION_TOKEN_KEY = 'casa_lala_oauth_access_token_v2';
const LEGACY_SESSION_MULTI_ACCOUNTS_KEY = 'casa_lala_google_accounts_v1';

// Google OAuth2 access tokens last 3600s (60 min); we treat 58 min as fresh
const TOKEN_TTL_MS = 58 * 60 * 1000;

// Resilient fetch wrapper with automatic retry on transient connection instability
export async function fetchWithNetworkRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2
): Promise<Response> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (
        (res.status === 429 ||
          res.status === 500 ||
          res.status === 502 ||
          res.status === 503 ||
          res.status === 504) &&
        attempt < maxRetries
      ) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      }
    }
  }
  throw lastErr || new Error('NETWORK_INSTABILITY');
}

export function isNetworkInstabilityError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('network_instability') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('auth/network-request-failed') ||
    msg.includes('auth/internal-error')
  );
}

export interface ConnectedGoogleAccount {
  email: string;
  displayName: string;
  photoURL: string | null;
  accessToken: string;
  expiresAt?: number;
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
let currentSignInAbort: (() => void) | null = null;

export function cancelOngoingSignIn() {
  isSigningIn = false;
  if (currentSignInAbort) {
    currentSignInAbort();
    currentSignInAbort = null;
  }
}

function isStoredTokenExpired(): boolean {
  try {
    const expRaw = localStorage.getItem(STORAGE_TOKEN_EXPIRES_AT_KEY);
    if (!expRaw) return false;
    const exp = Number(expRaw);
    if (!isNaN(exp) && exp > 0 && Date.now() > exp) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

let cachedAccessToken: string | null = (() => {
  try {
    if (isStoredTokenExpired()) {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      sessionStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
      return null;
    }
    return (
      localStorage.getItem(STORAGE_TOKEN_KEY) ||
      sessionStorage.getItem(LEGACY_SESSION_TOKEN_KEY) ||
      null
    );
  } catch {
    return null;
  }
})();

export function getSavedGoogleUser(): GoogleUserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER_PROFILE_KEY);
    if (raw) {
      return JSON.parse(raw) as GoogleUserProfile;
    }
    const accounts = getConnectedGoogleAccounts();
    if (accounts.length > 0) {
      const first: GoogleUserProfile = {
        uid: accounts[0].email,
        displayName: accounts[0].displayName,
        email: accounts[0].email,
        photoURL: accounts[0].photoURL,
      };
      localStorage.setItem(STORAGE_USER_PROFILE_KEY, JSON.stringify(first));
      return first;
    }
    // Auto-create persistent offline-ready profile unless user explicitly logged out
    if (localStorage.getItem(STORAGE_EXPLICIT_LOGOUT_KEY) !== '1') {
      const defaultProfile: GoogleUserProfile = {
        uid: 'casa-lala-persistent-user',
        displayName: 'Casa da Lala (Sessão Salva)',
        email: 'kevin.goncalves.ismart@gmail.com',
        photoURL: null,
      };
      localStorage.setItem(
        STORAGE_USER_PROFILE_KEY,
        JSON.stringify(defaultProfile)
      );
      return defaultProfile;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveGoogleUserProfile(user: GoogleUserProfile | null) {
  try {
    if (user) {
      localStorage.removeItem(STORAGE_EXPLICIT_LOGOUT_KEY);
      localStorage.setItem(STORAGE_USER_PROFILE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_USER_PROFILE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function activateOfflinePersistentSession(
  email = 'kevin.goncalves.ismart@gmail.com',
  displayName = 'Casa da Lala'
): GoogleUserProfile {
  const cleanEmail = email.trim() || 'kevin.goncalves.ismart@gmail.com';
  const profile: GoogleUserProfile = {
    uid: `persistent-${cleanEmail}`,
    displayName: displayName.trim() || cleanEmail.split('@')[0],
    email: cleanEmail,
    photoURL: null,
  };
  saveGoogleUserProfile(profile);
  upsertConnectedGoogleAccount(profile, cachedAccessToken || '');
  return profile;
}

export function getConnectedGoogleAccounts(): ConnectedGoogleAccount[] {
  try {
    const raw =
      localStorage.getItem(STORAGE_MULTI_ACCOUNTS_KEY) ||
      sessionStorage.getItem(LEGACY_SESSION_MULTI_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((a: Partial<ConnectedGoogleAccount>) => {
      const hex = a.corHex || a.colorHex || '#0284C7';
      const isAtivo =
        a.ativo !== undefined
          ? a.ativo
          : a.active !== undefined
          ? a.active
          : true;
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
    localStorage.setItem(STORAGE_MULTI_ACCOUNTS_KEY, JSON.stringify(accounts));
    sessionStorage.setItem(LEGACY_SESSION_MULTI_ACCOUNTS_KEY, JSON.stringify(accounts));
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

function setCachedToken(
  token: string | null,
  hasCalendarScope = true,
  clearScopeFlag = false
) {
  cachedAccessToken = token;
  try {
    if (token) {
      const expiresAt = Date.now() + TOKEN_TTL_MS;
      localStorage.setItem(STORAGE_TOKEN_KEY, token);
      localStorage.setItem(STORAGE_TOKEN_EXPIRES_AT_KEY, String(expiresAt));
      sessionStorage.setItem(LEGACY_SESSION_TOKEN_KEY, token);
      if (hasCalendarScope) {
        localStorage.setItem(STORAGE_CALENDAR_SCOPE_KEY, '1');
      }
    } else {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_TOKEN_EXPIRES_AT_KEY);
      sessionStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
      if (clearScopeFlag) {
        localStorage.removeItem(STORAGE_CALENDAR_SCOPE_KEY);
      }
    }
  } catch {
    // ignore storage errors
  }
}

export function invalidateExpiredToken(expiredToken?: string | null) {
  if (!expiredToken || cachedAccessToken === expiredToken) {
    setCachedToken(null, true, false);
  }
  try {
    const accounts = getConnectedGoogleAccounts();
    if (accounts.length > 0) {
      const updated = accounts.map((a) =>
        !expiredToken || a.accessToken === expiredToken
          ? { ...a, accessToken: '' }
          : a
      );
      saveConnectedGoogleAccounts(updated);
    }
  } catch {
    // ignore
  }
}

// Note: Direct GIS initTokenClient cannot be used with Firebase's oAuthClientId
// because Google Cloud only registers <project>.firebaseapp.com as an Authorized JS Origin
// for Firebase Web Clients, causing "Erro 400: origin_mismatch" on any other origin.
// All OAuth token acquisitions must go through Firebase Auth signInWithPopup().
export function trySilentTokenRefresh(
  _hintEmail?: string | null
): Promise<string | null> {
  return Promise.resolve(null);
}

export function hasCalendarScopeGranted(): boolean {
  try {
    return localStorage.getItem(STORAGE_CALENDAR_SCOPE_KEY) === '1';
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
  // 1. Restore saved user immediately from localStorage so offline launch or page reload never requires re-login
  const savedProfile = getSavedGoogleUser();
  if (savedProfile && onAuthSuccess) {
    onAuthSuccess(savedProfile, cachedAccessToken || '');
  }

  // 2. Listen to Firebase Auth state changes
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const profile: GoogleUserProfile = {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      };
      saveGoogleUserProfile(profile);
      if (cachedAccessToken) {
        upsertConnectedGoogleAccount(profile, cachedAccessToken);
      }
      if (onAuthSuccess) {
        onAuthSuccess(profile, cachedAccessToken || '');
      }
    } else {
      // Only treat as logged out if there is no saved offline profile and not currently signing in
      const fallbackSaved = getSavedGoogleUser();
      if (fallbackSaved) {
        if (onAuthSuccess) {
          onAuthSuccess(fallbackSaved, cachedAccessToken || '');
        }
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
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
    const savedEmail =
      auth.currentUser?.email || getSavedGoogleUser()?.email || undefined;
    const customParams: Record<string, string> = {};
    if (selectAccount) {
      customParams.prompt = 'select_account consent';
    } else {
      if (savedEmail) {
        customParams.login_hint = savedEmail;
      }
      if (forceConsent || !hasCalendarScopeGranted()) {
        customParams.prompt = 'consent';
      }
    }
    if (Object.keys(customParams).length > 0) {
      authProvider.setCustomParameters(customParams);
    }
    let result;
    try {
      result = await signInWithPopup(auth, authProvider);
    } catch (firstPopupErr: unknown) {
      const firstCode = (firstPopupErr as { code?: string })?.code || '';
      const firstMsg =
        firstPopupErr instanceof Error
          ? firstPopupErr.message
          : String(firstPopupErr);
      if (
        firstCode === 'auth/network-request-failed' ||
        firstCode === 'auth/internal-error' ||
        firstMsg.includes('network-request-failed') ||
        firstMsg.includes('internal-error')
      ) {
        await new Promise((r) => setTimeout(r, 800));
        result = await signInWithPopup(auth, authProvider);
      } else {
        throw firstPopupErr;
      }
    }
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      const existingSaved = getSavedGoogleUser();
      if (existingSaved && cachedAccessToken) {
        return { user: existingSaved, accessToken: cachedAccessToken };
      }
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

    saveGoogleUserProfile(userProfile);
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
      errCode === 'auth/network-request-failed' ||
      errCode === 'auth/internal-error' ||
      errCode === 'auth/timeout' ||
      isNetworkInstabilityError(error)
    ) {
      // If connection flickered during OAuth, preserve existing session silently if available
      const savedUser = getSavedGoogleUser();
      if (savedUser) {
        return {
          user: savedUser,
          accessToken: cachedAccessToken || '',
        };
      }
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
      'Não foi possível concluir o login com o Google. Verifique sua conexão e tente novamente.'
    );
  } finally {
    isSigningIn = false;
  }
};

// Fallback: Sign in via Firebase Auth Popup (avoids Erro 400: origin_mismatch)
export const signInWithCustomGISClient = async (
  customClientId: string
): Promise<{ user: GoogleUserProfile; accessToken: string }> => {
  const fbClientId =
    (firebaseConfig as { oAuthClientId?: string }).oAuthClientId || '';
  if (!customClientId.trim() || customClientId.trim() === fbClientId) {
    const res = await googleSignIn(true, false);
    if (!res) {
      throw new Error('Janela de login fechada antes de concluir.');
    }
    return res;
  }

  // Always prefer Firebase signInWithPopup first since it routes via firebaseapp.com/__/auth/handler
  // and does not require registering every dynamic origin in Google Cloud Console
  const fbRes = await googleSignIn(true, false);
  if (fbRes) {
    return fbRes;
  }
  throw new Error('Não foi possível concluir o login com o Google.');
};

export const getAccessToken = async (): Promise<string | null> => {
  if (isStoredTokenExpired()) {
    invalidateExpiredToken(cachedAccessToken);
  }
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const stored =
      localStorage.getItem(STORAGE_TOKEN_KEY) ||
      sessionStorage.getItem(LEGACY_SESSION_TOKEN_KEY);
    if (stored) {
      cachedAccessToken = stored;
      return stored;
    }
    const accounts = getConnectedGoogleAccounts();
    const firstWithToken = accounts.find((a) => a.ativo && a.accessToken);
    if (firstWithToken?.accessToken) {
      cachedAccessToken = firstWithToken.accessToken;
      return firstWithToken.accessToken;
    }
  } catch {
    // ignore
  }
  return null;
};

export const clearCachedAccessToken = () => {
  invalidateExpiredToken();
};

export const logoutGoogleDrive = async () => {
  try {
    localStorage.setItem(STORAGE_EXPLICIT_LOGOUT_KEY, '1');
  } catch {
    // ignore
  }
  try {
    await auth.signOut();
  } catch {
    // ignore if signed in via custom GIS
  }
  saveGoogleUserProfile(null);
  setCachedToken(null, false, true);
  try {
    localStorage.removeItem(STORAGE_MULTI_ACCOUNTS_KEY);
    sessionStorage.removeItem(LEGACY_SESSION_MULTI_ACCOUNTS_KEY);
  } catch {
    // ignore
  }
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
  let token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');

  const spaces = useAppDataFolder ? 'appDataFolder' : 'drive';
  const query = encodeURIComponent(
    `name = '${BACKUP_FILE_NAME}' and trashed = false`
  );
  const url = `https://www.googleapis.com/drive/v3/files?spaces=${spaces}&q=${query}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=1`;

  let res: Response;
  try {
    res = await fetchWithNetworkRetry(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    if (isNetworkInstabilityError(err)) {
      throw new Error('NETWORK_INSTABILITY');
    }
    throw err;
  }

  if (res.status === 401) {
    invalidateExpiredToken(token);
    token = await trySilentTokenRefresh();
    if (token) {
      res = await fetchWithNetworkRetry(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
    if (!token || res.status === 401) {
      invalidateExpiredToken(token);
      throw new Error('AUTH_REQUIRED');
    }
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
  let token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  let res: Response;
  try {
    res = await fetchWithNetworkRetry(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    if (isNetworkInstabilityError(err)) {
      throw new Error('NETWORK_INSTABILITY');
    }
    throw err;
  }

  if (res.status === 401) {
    invalidateExpiredToken(token);
    token = await trySilentTokenRefresh();
    if (token) {
      res = await fetchWithNetworkRetry(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
    if (!token || res.status === 401) {
      invalidateExpiredToken(token);
      throw new Error('AUTH_REQUIRED');
    }
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
  let token = await getAccessToken();
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

  let res: Response;
  try {
    res = await fetchWithNetworkRetry(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });
  } catch (err) {
    if (isNetworkInstabilityError(err)) {
      throw new Error('NETWORK_INSTABILITY');
    }
    throw err;
  }

  if (res.status === 401) {
    invalidateExpiredToken(token);
    token = await trySilentTokenRefresh();
    if (token) {
      res = await fetchWithNetworkRetry(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      });
    }
    if (!token || res.status === 401) {
      invalidateExpiredToken(token);
      throw new Error('AUTH_REQUIRED');
    }
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erro ao salvar no Google Drive: ${errText}`);
  }

  return (await res.json()) as DriveBackupFileMeta;
}
