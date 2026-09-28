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

// In-memory access token cache (NEVER persisted to localStorage or sessionStorage per security guidelines)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

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
        if (onAuthSuccess) {
          onAuthSuccess(
            {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
            },
            cachedAccessToken
          );
        }
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in using Firebase Auth Popup (pre-configured in AI Studio)
export const googleSignIn = async (): Promise<{
  user: GoogleUserProfile;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error(
        'Não foi possível obter o token OAuth do Google Drive. Tente novamente.'
      );
    }

    cachedAccessToken = credential.accessToken;
    return {
      user: {
        uid: result.user.uid,
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
      },
      accessToken: cachedAccessToken,
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
        cachedAccessToken = response.access_token;
        resolve({
          user: {
            uid: 'gis-user',
            displayName: 'Conta Google Conectada (GIS)',
            email: null,
            photoURL: null,
          },
          accessToken: cachedAccessToken,
        });
      },
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogleDrive = async () => {
  try {
    await auth.signOut();
  } catch {
    // ignore if signed in via custom GIS
  }
  cachedAccessToken = null;
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
