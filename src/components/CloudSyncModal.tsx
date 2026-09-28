import React, { useState } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  X,
  HardDrive,
  UploadCloud,
  DownloadCloud,
  KeyRound,
  BookOpen,
  LogOut,
  ShieldAlert,
  FolderLock,
} from 'lucide-react';
import { ThemeTokens } from '../types/lala';
import {
  AppBackupPayload,
  SyncMetadata,
  SyncStatus,
} from '../services/offlineStorage';
import {
  DriveBackupFileMeta,
  GoogleUserProfile,
} from '../services/googleDriveSync';

export interface PendingConfirmationState {
  type: 'overwrite_drive' | 'restore_local' | 'conflict';
  localPayload: AppBackupPayload;
  remoteMeta: DriveBackupFileMeta | null;
  remotePayload?: AppBackupPayload | null;
  reason: string;
}

interface CloudSyncModalProps {
  t: ThemeTokens;
  open: boolean;
  onClose: () => void;
  isOnline: boolean;
  syncMeta: SyncMetadata;
  googleUser: GoogleUserProfile | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  onGoogleLogin: () => Promise<void>;
  onCustomGISLogin: (clientId: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onTriggerSyncCheck: () => Promise<void>;
  onForcePushToDrive: () => Promise<void>;
  onForcePullFromDrive: () => Promise<void>;
  pendingConfirmation: PendingConfirmationState | null;
  onConfirmOverwriteDrive: () => Promise<void>;
  onConfirmRestoreFromDrive: () => Promise<void>;
  onCancelConfirmation: () => void;
  useAppDataFolder: boolean;
  setUseAppDataFolder: (val: boolean) => void;
}

export function getSyncStatusLabel(status: SyncStatus): string {
  switch (status) {
    case 'synced':
      return 'Sincronizado';
    case 'pending':
      return 'Pendentes de envio...';
    case 'syncing':
      return 'Sincronizando...';
    case 'error':
      return 'Erro de Sincronização';
  }
}

export const NetworkAndSyncBadges: React.FC<{
  t: ThemeTokens;
  isOnline: boolean;
  syncStatus: SyncStatus;
  googleUser: GoogleUserProfile | null;
  hasConflictOrConfirm: boolean;
  onClickOpenSync: () => void;
}> = ({
  t,
  isOnline,
  syncStatus,
  googleUser,
  hasConflictOrConfirm,
  onClickOpenSync,
}) => {
  const statusLabel = getSyncStatusLabel(syncStatus);

  const syncColor =
    syncStatus === 'synced'
      ? t.primary
      : syncStatus === 'error'
      ? t.danger
      : t.finance;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Indicador Visual de Status de Rede ("Online" / "Offline") */}
      <div
        style={{
          backgroundColor: isOnline ? `${t.primary}16` : `${t.danger}18`,
          color: isOnline ? t.primary : t.danger,
          borderColor: isOnline ? `${t.primary}35` : `${t.danger}45`,
        }}
        className="px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 select-none"
        title={
          isOnline
            ? 'Conexão ativa — sincronização automática habilitada'
            : 'Modo 100% Offline ativo — salvando em IndexedDB local'
        }
      >
        <span
          style={{ backgroundColor: isOnline ? t.primary : t.danger }}
          className={`w-2 h-2 rounded-full ${!isOnline ? 'animate-pulse' : ''}`}
        />
        {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
        <span>{isOnline ? 'Online' : 'Offline'}</span>
      </div>

      {/* Botão e Indicador de Status de Sincronização Google Drive */}
      <button
        onClick={onClickOpenSync}
        style={{
          backgroundColor: hasConflictOrConfirm
            ? `${t.danger}18`
            : googleUser
            ? `${syncColor}16`
            : t.card,
          color: hasConflictOrConfirm
            ? t.danger
            : googleUser
            ? syncColor
            : t.text,
          borderColor: hasConflictOrConfirm
            ? t.danger
            : googleUser
            ? `${syncColor}40`
            : t.border,
        }}
        className="px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition hover:opacity-90"
        title="Gerenciar Sincronização Offline-First e Google Drive"
      >
        {syncStatus === 'syncing' ? (
          <RefreshCw size={13} className="animate-spin" />
        ) : syncStatus === 'error' || hasConflictOrConfirm ? (
          <AlertTriangle size={13} />
        ) : googleUser && syncStatus === 'synced' ? (
          <CheckCircle2 size={13} />
        ) : googleUser ? (
          <Cloud size={13} />
        ) : (
          <CloudOff size={13} />
        )}

        <span className="truncate max-w-[165px]">
          {hasConflictOrConfirm
            ? 'Confirmar Sincronização'
            : googleUser
            ? statusLabel
            : 'Conectar ao Google Drive'}
        </span>
      </button>
    </div>
  );
};

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  t,
  open,
  onClose,
  isOnline,
  syncMeta,
  googleUser,
  needsAuth,
  isLoggingIn,
  onGoogleLogin,
  onCustomGISLogin,
  onLogout,
  onTriggerSyncCheck,
  onForcePushToDrive,
  onForcePullFromDrive,
  pendingConfirmation,
  onConfirmOverwriteDrive,
  onConfirmRestoreFromDrive,
  onCancelConfirmation,
  useAppDataFolder,
  setUseAppDataFolder,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'config' | 'guide'>(
    'status'
  );
  const [customClientId, setCustomClientId] = useState<string>(() => {
    try {
      return localStorage.getItem('casa_lala_custom_gis_client_id') || '';
    } catch {
      return '';
    }
  });
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('casa_lala_custom_gdrive_api_key') || '';
    } catch {
      return '';
    }
  });

  if (!open) return null;

  const formatTimestamp = (ts?: number | string | null) => {
    if (!ts) return 'Nunca sincronizado';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleSaveCustomKeys = () => {
    try {
      localStorage.setItem(
        'casa_lala_custom_gis_client_id',
        customClientId.trim()
      );
      localStorage.setItem(
        'casa_lala_custom_gdrive_api_key',
        customApiKey.trim()
      );
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-xs"
        onClick={onClose}
      />

      <div
        style={{
          backgroundColor: t.card,
          color: t.text,
          borderColor: t.border,
        }}
        className="relative z-10 w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div
          style={{ borderColor: t.border }}
          className="px-5 py-4 border-b flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                backgroundColor: `${t.primary}18`,
                color: t.primary,
              }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            >
              <Cloud size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold leading-tight">
                Arquitetura Offline-First & Google Drive Sync
              </h3>
              <p style={{ color: t.textSoft }} className="text-[11px] mt-0.5">
                IndexedDB Primário · Service Worker PWA · Google Drive API v3
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ backgroundColor: t.cardSubtle, color: t.textSoft }}
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{ borderColor: t.border, backgroundColor: t.cardSubtle }}
          className="px-4 py-2 border-b grid grid-cols-3 gap-1.5"
        >
          <button
            onClick={() => setActiveTab('status')}
            style={{
              backgroundColor: activeTab === 'status' ? t.card : 'transparent',
              color: activeTab === 'status' ? t.primary : t.textSoft,
            }}
            className="py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <HardDrive size={13} />
            Sincronização
          </button>
          <button
            onClick={() => setActiveTab('config')}
            style={{
              backgroundColor: activeTab === 'config' ? t.card : 'transparent',
              color: activeTab === 'config' ? t.primary : t.textSoft,
            }}
            className="py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <KeyRound size={13} />
            Client ID / Opções
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            style={{
              backgroundColor: activeTab === 'guide' ? t.card : 'transparent',
              color: activeTab === 'guide' ? t.primary : t.textSoft,
            }}
            className="py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <BookOpen size={13} />
            Guia GCP Console
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'status' && (
            <>
              {/* Top Status Cards: Network & Sync */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  style={{
                    backgroundColor: t.cardSubtle,
                    borderColor: t.border,
                  }}
                  className="p-3.5 rounded-2xl border flex items-center justify-between"
                >
                  <div>
                    <p
                      style={{ color: t.textSoft }}
                      className="text-[10px] font-bold uppercase tracking-wider"
                    >
                      Status da Rede
                    </p>
                    <p className="text-sm font-bold mt-0.5 flex items-center gap-1.5">
                      <span
                        style={{
                          backgroundColor: isOnline ? t.primary : t.danger,
                        }}
                        className="w-2.5 h-2.5 rounded-full inline-block"
                      />
                      {isOnline ? 'Online (Conectado)' : 'Offline (Modo Local)'}
                    </p>
                    <p style={{ color: t.textSoft }} className="text-[10px] mt-1">
                      {isOnline
                        ? 'Pronto para sincronizar com a nuvem'
                        : 'Operando 100% via IndexedDB + Service Worker'}
                    </p>
                  </div>
                  {isOnline ? (
                    <Wifi size={22} style={{ color: t.primary }} />
                  ) : (
                    <WifiOff size={22} style={{ color: t.danger }} />
                  )}
                </div>

                <div
                  style={{
                    backgroundColor: t.cardSubtle,
                    borderColor: t.border,
                  }}
                  className="p-3.5 rounded-2xl border flex items-center justify-between"
                >
                  <div>
                    <p
                      style={{ color: t.textSoft }}
                      className="text-[10px] font-bold uppercase tracking-wider"
                    >
                      Status de Sincronização
                    </p>
                    <p
                      style={{
                        color:
                          syncMeta.syncStatus === 'synced'
                            ? t.primary
                            : syncMeta.syncStatus === 'error'
                            ? t.danger
                            : t.finance,
                      }}
                      className="text-sm font-bold mt-0.5"
                    >
                      {getSyncStatusLabel(syncMeta.syncStatus)}
                    </p>
                    <p style={{ color: t.textSoft }} className="text-[10px] mt-1">
                      Última alteração: {formatTimestamp(syncMeta.updatedAt)}
                    </p>
                  </div>
                  {syncMeta.syncStatus === 'syncing' ? (
                    <RefreshCw
                      size={22}
                      className="animate-spin"
                      style={{ color: t.action }}
                    />
                  ) : syncMeta.syncStatus === 'synced' ? (
                    <CheckCircle2 size={22} style={{ color: t.primary }} />
                  ) : syncMeta.syncStatus === 'error' ? (
                    <AlertTriangle size={22} style={{ color: t.danger }} />
                  ) : (
                    <Cloud size={22} style={{ color: t.finance }} />
                  )}
                </div>
              </div>

              {/* Mandatory User Confirmation Dialog for Overwriting / Conflict Resolution */}
              {pendingConfirmation && (
                <div
                  style={{
                    backgroundColor: `${t.finance}15`,
                    borderColor: t.finance,
                  }}
                  className="p-4 rounded-2xl border-2 space-y-3"
                >
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert
                      size={20}
                      style={{ color: t.finance }}
                      className="shrink-0 mt-0.5"
                    />
                    <div className="space-y-1">
                      <h4 className="text-xs sm:text-sm font-bold">
                        {pendingConfirmation.type === 'conflict'
                          ? 'Conflito de Sincronização Detectado (Timestamp)'
                          : pendingConfirmation.type === 'restore_local'
                          ? 'Confirmar Restauração a partir do Google Drive?'
                          : 'Confirmar Atualização de app_data.json no Google Drive?'}
                      </h4>
                      <p
                        style={{ color: t.textSoft }}
                        className="text-xs leading-relaxed"
                      >
                        {pendingConfirmation.reason}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: t.card,
                      borderColor: t.border,
                    }}
                    className="p-3 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs"
                  >
                    <div>
                      <p
                        style={{ color: t.textSoft }}
                        className="text-[10px] font-bold uppercase"
                      >
                        Dados Locais (IndexedDB)
                      </p>
                      <p className="font-mono font-semibold mt-0.5">
                        {formatTimestamp(
                          pendingConfirmation.localPayload.updatedAt
                        )}
                      </p>
                      <p style={{ color: t.textSoft }} className="text-[10px]">
                        {
                          Object.keys(pendingConfirmation.localPayload.records)
                            .length
                        }{' '}
                        módulos salvos localmente
                      </p>
                    </div>
                    <div>
                      <p
                        style={{ color: t.textSoft }}
                        className="text-[10px] font-bold uppercase"
                      >
                        Arquivo Google Drive (app_data.json)
                      </p>
                      <p className="font-mono font-semibold mt-0.5">
                        {formatTimestamp(
                          pendingConfirmation.remotePayload?.updatedAt ||
                            pendingConfirmation.remoteMeta?.modifiedTime
                        )}
                      </p>
                      <p style={{ color: t.textSoft }} className="text-[10px]">
                        ID:{' '}
                        {pendingConfirmation.remoteMeta?.id.slice(0, 12) ||
                          'Novo arquivo'}
                        ...
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {(pendingConfirmation.type === 'overwrite_drive' ||
                      pendingConfirmation.type === 'conflict') && (
                      <button
                        onClick={onConfirmOverwriteDrive}
                        style={{ backgroundColor: t.primary, color: '#fff' }}
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <UploadCloud size={14} />
                        Confirmar e Sobrescrever no Drive
                      </button>
                    )}

                    {(pendingConfirmation.type === 'restore_local' ||
                      pendingConfirmation.type === 'conflict') &&
                      pendingConfirmation.remotePayload && (
                        <button
                          onClick={onConfirmRestoreFromDrive}
                          style={{ backgroundColor: t.action, color: '#fff' }}
                          className="flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <DownloadCloud size={14} />
                          Usar Versão do Google Drive
                        </button>
                      )}

                    <button
                      onClick={onCancelConfirmation}
                      style={{
                        backgroundColor: t.card,
                        color: t.text,
                        borderColor: t.border,
                      }}
                      className="py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Google Authentication & Account Card */}
              <div
                style={{
                  backgroundColor: t.cardSubtle,
                  borderColor: t.border,
                }}
                className="p-4 rounded-2xl border space-y-3"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Conta Google Drive API v3
                    </h4>
                    <p style={{ color: t.textSoft }} className="text-xs mt-0.5">
                      {googleUser && !needsAuth
                        ? `Conectado como ${
                            googleUser.displayName ||
                            googleUser.email ||
                            'Usuário Autenticado'
                          }`
                        : 'Conecte sua conta Google para sincronizar o arquivo app_data.json na nuvem.'}
                    </p>
                  </div>

                  {googleUser && !needsAuth && (
                    <button
                      onClick={onLogout}
                      style={{
                        backgroundColor: t.card,
                        color: t.danger,
                        borderColor: t.border,
                      }}
                      className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut size={13} />
                      Desconectar
                    </button>
                  )}
                </div>

                {(!googleUser || needsAuth) && (
                  <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    {/* Official Sign in with Google Button style */}
                    <button
                      onClick={onGoogleLogin}
                      disabled={isLoggingIn || !isOnline}
                      className="gsi-material-button flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border bg-white text-gray-800 font-semibold text-xs shadow-xs hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
                      style={{ borderColor: '#dadce0' }}
                    >
                      <div className="w-4 h-4 shrink-0">
                        <svg
                          version="1.1"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 48 48"
                          style={{ display: 'block', width: '100%', height: '100%' }}
                        >
                          <path
                            fill="#EA4335"
                            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                          />
                          <path
                            fill="#4285F4"
                            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                          />
                          <path
                            fill="#34A853"
                            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                          />
                          <path fill="none" d="M0 0h48v48H0z" />
                        </svg>
                      </div>
                      <span>
                        {isLoggingIn
                          ? 'Autenticando...'
                          : 'Sign in with Google (Conectar Google Drive)'}
                      </span>
                    </button>
                  </div>
                )}

                {/* Sync Actions when connected */}
                {googleUser && !needsAuth && (
                  <div className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        onClick={onTriggerSyncCheck}
                        disabled={!isOnline || syncMeta.syncStatus === 'syncing'}
                        style={{ backgroundColor: t.primary, color: '#fff' }}
                        className="py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw
                          size={14}
                          className={
                            syncMeta.syncStatus === 'syncing'
                              ? 'animate-spin'
                              : ''
                          }
                        />
                        Sincronizar Agora
                      </button>

                      <button
                        onClick={onForcePushToDrive}
                        disabled={!isOnline || syncMeta.syncStatus === 'syncing'}
                        style={{
                          backgroundColor: t.card,
                          color: t.text,
                          borderColor: t.border,
                        }}
                        className="py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <UploadCloud size={14} style={{ color: t.action }} />
                        Enviar p/ Drive
                      </button>

                      <button
                        onClick={onForcePullFromDrive}
                        disabled={!isOnline || syncMeta.syncStatus === 'syncing'}
                        style={{
                          backgroundColor: t.card,
                          color: t.text,
                          borderColor: t.border,
                        }}
                        className="py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <DownloadCloud size={14} style={{ color: t.finance }} />
                        Restaurar do Drive
                      </button>
                    </div>

                    <div
                      style={{ color: t.textSoft }}
                      className="text-[11px] flex items-center justify-between flex-wrap gap-2 pt-1"
                    >
                      <span>
                        Última sincronização:{' '}
                        <strong>{formatTimestamp(syncMeta.lastSyncedAt)}</strong>
                      </span>
                      <span>
                        Destino:{' '}
                        <strong>
                          {useAppDataFolder
                            ? 'appDataFolder (Oculto)'
                            : 'Meu Drive / app_data.json'}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}

                {syncMeta.lastError && (
                  <div
                    style={{
                      backgroundColor: `${t.danger}15`,
                      color: t.danger,
                      borderColor: `${t.danger}40`,
                    }}
                    className="p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2"
                  >
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>{syncMeta.lastError}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'config' && (
            <div className="space-y-4">
              {/* Storage Folder Mode */}
              <div
                style={{
                  backgroundColor: t.cardSubtle,
                  borderColor: t.border,
                }}
                className="p-4 rounded-2xl border space-y-2.5"
              >
                <div className="flex items-center gap-2">
                  <FolderLock size={16} style={{ color: t.primary }} />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Local de Armazenamento no Google Drive
                  </h4>
                </div>
                <p style={{ color: t.textSoft }} className="text-xs">
                  Escolha onde o arquivo <code>app_data.json</code> será salvo na
                  sua conta do Google Drive:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setUseAppDataFolder(false)}
                    style={{
                      backgroundColor: !useAppDataFolder ? t.card : 'transparent',
                      borderColor: !useAppDataFolder ? t.primary : t.border,
                      color: t.text,
                    }}
                    className="p-3 rounded-xl border text-left cursor-pointer"
                  >
                    <p className="text-xs font-bold">
                      Pasta do Usuário (drive.file)
                    </p>
                    <p
                      style={{ color: t.textSoft }}
                      className="text-[11px] mt-0.5"
                    >
                      Cria <code>app_data.json</code> visível no seu Google Drive
                      para fácil inspeção e backup.
                    </p>
                  </button>

                  <button
                    onClick={() => setUseAppDataFolder(true)}
                    style={{
                      backgroundColor: useAppDataFolder ? t.card : 'transparent',
                      borderColor: useAppDataFolder ? t.primary : t.border,
                      color: t.text,
                    }}
                    className="p-3 rounded-xl border text-left cursor-pointer"
                  >
                    <p className="text-xs font-bold">
                      Pasta Oculta (appDataFolder)
                    </p>
                    <p
                      style={{ color: t.textSoft }}
                      className="text-[11px] mt-0.5"
                    >
                      Usa o espaço exclusivo de configuração da aplicação (escopo{' '}
                      <code>drive.appdata</code>).
                    </p>
                  </button>
                </div>
              </div>

              {/* Optional Custom GIS Client ID */}
              <div
                style={{
                  backgroundColor: t.cardSubtle,
                  borderColor: t.border,
                }}
                className="p-4 rounded-2xl border space-y-2.5"
              >
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Credenciais OAuth 2.0 Customizadas (Google Identity Services)
                </h4>
                <p style={{ color: t.textSoft }} className="text-xs">
                  O aplicativo já possui autenticação Google OAuth pré-configurada.
                  Caso você hospede o código externamente, informe seu próprio{' '}
                  <strong>Client ID</strong> abaixo para autenticar via GIS:
                </p>
                <input
                  value={customClientId}
                  onChange={(e) => setCustomClientId(e.target.value)}
                  placeholder="Ex: 123456789-abc.apps.googleusercontent.com"
                  style={{
                    backgroundColor: t.card,
                    color: t.text,
                    borderColor: t.border,
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-none font-mono"
                />
                <input
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="API Key (Opcional — para Google Picker / Discovery)"
                  style={{
                    backgroundColor: t.card,
                    color: t.text,
                    borderColor: t.border,
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-none font-mono"
                />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleSaveCustomKeys}
                    style={{
                      backgroundColor: t.card,
                      color: t.text,
                      borderColor: t.border,
                    }}
                    className="px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer"
                  >
                    Salvar Credenciais Locais
                  </button>
                  {customClientId.trim() && (
                    <button
                      onClick={() => onCustomGISLogin(customClientId)}
                      style={{ backgroundColor: t.action, color: '#fff' }}
                      className="px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Autenticar com Client ID Customizado (GIS)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div
              style={{
                backgroundColor: t.cardSubtle,
                borderColor: t.border,
              }}
              className="p-4 rounded-2xl border space-y-3 text-xs leading-relaxed"
            >
              <h4 className="text-sm font-bold" style={{ color: t.primary }}>
                Passo a Passo: Como Configurar API Key e Client ID no Google
                Cloud Console
              </h4>
              <ol className="list-decimal pl-4 space-y-2">
                <li>
                  <strong>Criar ou Selecionar um Projeto:</strong> Acesse o{' '}
                  <code>console.cloud.google.com</code>, crie um novo projeto
                  (ex: <em>Casa da Lala PWA</em>) e selecione-o no topo.
                </li>
                <li>
                  <strong>Ativar a Google Drive API v3:</strong> No menu lateral,
                  vá em <strong>APIs e Serviços &gt; Biblioteca</strong>, busque
                  por <strong>Google Drive API</strong> e clique em{' '}
                  <strong>Ativar</strong>.
                </li>
                <li>
                  <strong>Configurar a Tela de Permissão OAuth:</strong> Vá em{' '}
                  <strong>APIs e Serviços &gt; Tela de permissão OAuth</strong>:
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>Escolha Tipo de Usuário: <strong>Externo</strong> (ou Interno para Workspace).</li>
                    <li>Preencha o nome do app (<code>Casa da Lala</code>) e e-mails de suporte.</li>
                    <li>
                      Em <strong>Escopos (Scopes)</strong>, adicione:{' '}
                      <code>https://www.googleapis.com/auth/drive.file</code> e{' '}
                      <code>https://www.googleapis.com/auth/drive.appdata</code>.
                    </li>
                    <li>
                      Adicione seu e-mail em <strong>Usuários de teste</strong>{' '}
                      enquanto o app estiver em modo de teste.
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>Criar o ID do Cliente OAuth 2.0 (Client ID):</strong>{' '}
                  Vá em <strong>APIs e Serviços &gt; Credenciais &gt; + Criar Credenciais &gt; ID do cliente OAuth</strong>:
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>Tipo de aplicativo: <strong>Aplicativo da Web</strong>.</li>
                    <li>
                      Em <strong>Origens JavaScript autorizadas</strong>,
                      adicione a URL onde seu PWA roda (ex:{' '}
                      <code>http://localhost:3000</code> e o domínio de produção
                      HTTPS).
                    </li>
                    <li>Copie o <strong>Client ID</strong> gerado.</li>
                  </ul>
                </li>
                <li>
                  <strong>Criar a Chave de API (API Key):</strong> Em{' '}
                  <strong>Credenciais &gt; + Criar Credenciais &gt; Chave de API</strong>,
                  restrinja a chave por <em>Referenciadores HTTP</em> (seu
                  domínio) e restrinja à <em>Google Drive API</em>.
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
