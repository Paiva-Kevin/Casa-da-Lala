import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Home,
  GraduationCap,
  PawPrint,
  HeartPulse,
  Wallet,
  Calendar,
  Menu,
  Mic,
  FolderOpen,
  WifiOff,
  Sparkles,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  ArquivoRepositorio,
  Artigo,
  BottomSheetPayload,
  CartaoCredito,
  CheckinProntidao,
  ComodoCasa,
  Compromisso,
  ConfiguracaoCalendarioApp,
  ContaBancaria,
  Disciplina,
  FichaTreino,
  HabitoDiario,
  ItemEstoqueCasa,
  ItemListaCompras,
  ItemRadar,
  ItemRefeicao,
  LancamentoFinanceiro,
  LivroLeitura,
  MesFinanceiroKey,
  MetaItem,
  OrcamentoCategoria,
  PetPerfil,
  ProjetoTrabalho,
  RotinaComodo,
  TabId,
  TaskCategoryFilter,
  TaskHorizon,
  TaskItem,
  ThemeMode,
  InteracaoGovernanta,
  TomGovernanta,
  PerfilUsuarioCalibrado,
  AcaoGovernanta,
  AnexoLala,
} from "./types/lala";
import {
  calcularDinheiroLivreHoje,
  calcularProntidaoDetalhada,
  calcularScorePrioridade,
  DIAS_SEMANA_HEADER,
  horaParaMinutos,
  INITIAL_ARTIGOS,
  INITIAL_CARTOES,
  INITIAL_CHECKIN,
  INITIAL_COMODOS,
  INITIAL_COMPROMISSOS,
  INITIAL_CONTAS,
  INITIAL_DIETA_REFEICOES,
  INITIAL_DISCIPLINAS,
  INITIAL_ESTOQUE_CASA,
  INITIAL_FICHAS_TREINO,
  INITIAL_HABITOS,
  INITIAL_LANCAMENTOS,
  INITIAL_LISTA_COMPRAS,
  INITIAL_LIVROS,
  INITIAL_METAS,
  INITIAL_ORCAMENTOS,
  INITIAL_PETS_PERFIL,
  INITIAL_PROJETOS,
  INITIAL_RADAR,
  INITIAL_REPOSITORIO,
  INITIAL_TAREFAS,
  THEMES,
} from "./data/initialData";
import { HomeScreen } from "./components/screens/HomeScreen";
import { AbaCalendario } from "./components/screens/AbaCalendario";
import { AbaGovernantaLala } from "./components/screens/AbaGovernantaLala";
import {
  EstudosTrabalhoScreen,
  SaudePetsScreen,
} from "./components/screens/EstudosCorpoTrabalhoScreens";
import { CasaPetsScreen } from "./components/screens/CasaPetsScreen";
import { FinancasScreen } from "./components/screens/FinancasScreen";
import { BottomSheet } from "./components/BottomSheet";
import { SideDrawer } from "./components/SideDrawer";
import { SmartBrainModal } from "./components/SmartBrainModal";
import { CalibrationWizardModal } from "./components/CalibrationWizardModal";
import {
  consultarLalaUnificada,
  extrairIngredientesParaListaCompras,
  formatarTamanhoBytes,
} from "./services/lalaEngine";
import { LiveWorkoutModal } from "./components/LiveWorkoutModal";
import { PWAInstallButton } from "./components/PWAInstallButton";
import { useOnlineStatus } from "./hooks/usePWAInstall";
import {
  AppBackupPayload,
  exportFullBackupPayload,
  getSyncMetadata,
  idbGetRecord,
  idbSetRecord,
  importFullBackupPayload,
  SyncMetadata,
  updateSyncMetadata,
} from "./services/offlineStorage";
import {
  downloadDriveBackupContent,
  findDriveBackupFile,
  getAccessToken,
  getSavedGoogleUser,
  googleSignIn,
  GoogleUserProfile,
  initAuth,
  logoutGoogleDrive,
  signInWithCustomGISClient,
  uploadDriveBackupContent,
} from "./services/googleDriveSync";
import {
  CloudSyncModal,
  NetworkAndSyncBadges,
  PendingConfirmationState,
} from "./components/CloudSyncModal";
import { criarEventoGoogleCalendar } from "./services/googleCalendarSync";

const STORAGE_PREFIX = "casa_lala_v5_";

function useLocalStorageState<T>(
  key: string,
  defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      if (raw) return JSON.parse(raw) as T;
    } catch (err) {
      console.warn("Erro ao ler localStorage:", key, err);
    }
    return defaultValue;
  });

  const isInitialMount = useRef(true);

  // Hydrate from IndexedDB primary offline storage on mount
  useEffect(() => {
    let mounted = true;
    idbGetRecord<T>(key).then((idbVal) => {
      if (mounted && idbVal !== undefined) {
        setState(idbVal);
      }
    });
    return () => {
      mounted = false;
    };
  }, [key]);

  // Listen for full backup restoration events from Google Drive
  useEffect(() => {
    const handleRestore = () => {
      idbGetRecord<T>(key).then((idbVal) => {
        if (idbVal !== undefined) {
          setState(idbVal);
        }
      });
    };
    window.addEventListener("lala-backup-restored", handleRestore);
    return () => window.removeEventListener("lala-backup-restored", handleRestore);
  }, [key]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      idbSetRecord(key, state, false);
      return;
    }
    idbSetRecord(key, state, true).then(() => {
      window.dispatchEvent(new CustomEvent("lala-local-mutation"));
    });
  }, [key, state]);

  return [state, setState];
}

export default function App() {
  const [themeMode, setThemeMode] = useLocalStorageState<ThemeMode>(
    "theme",
    "light"
  );
  const t = THEMES[themeMode] || THEMES.light;

  // Aba ativa (5 abas principais na barra inferior + aba "calendario" acessível via menu lateral/topo)
  const [activeTab, setActiveTab] = useState<TabId>("inicio");

  const [tarefas, setTarefas] = useLocalStorageState<TaskItem[]>(
    "tarefas",
    INITIAL_TAREFAS
  );
  const [habitos, setHabitos] = useLocalStorageState<HabitoDiario[]>(
    "habitos",
    INITIAL_HABITOS
  );
  const [compromissos, setCompromissos] = useLocalStorageState<Compromisso[]>(
    "compromissos",
    INITIAL_COMPROMISSOS
  );
  const [radarItens, setRadarItens] = useLocalStorageState<ItemRadar[]>(
    "radar",
    INITIAL_RADAR
  );
  const [metas, setMetas] = useLocalStorageState<MetaItem[]>(
    "metas",
    INITIAL_METAS
  );
  const [checkin, setCheckin] = useLocalStorageState<CheckinProntidao>(
    "checkin",
    INITIAL_CHECKIN
  );

  const [disciplinas, setDisciplinas] = useLocalStorageState<Disciplina[]>(
    "disciplinas",
    INITIAL_DISCIPLINAS
  );
  const [artigos, setArtigos] = useLocalStorageState<Artigo[]>(
    "artigos",
    INITIAL_ARTIGOS
  );
  const [livros, setLivros] = useLocalStorageState<LivroLeitura[]>(
    "livros",
    INITIAL_LIVROS
  );
  const [streakLeitura, setStreakLeitura] = useLocalStorageState<number>(
    "streak_leitura",
    6
  );
  const [projetos, setProjetos] = useLocalStorageState<ProjetoTrabalho[]>(
    "projetos",
    INITIAL_PROJETOS
  );

  const [comodos, setComodos] = useLocalStorageState<ComodoCasa[]>(
    "comodos",
    INITIAL_COMODOS
  );
  const [estoqueCasa, setEstoqueCasa] = useLocalStorageState<ItemEstoqueCasa[]>(
    "estoque_casa",
    INITIAL_ESTOQUE_CASA
  );
  const [listaCompras, setListaCompras] = useLocalStorageState<
    ItemListaCompras[]
  >("lista_compras", INITIAL_LISTA_COMPRAS);
  const [petsPerfil, setPetsPerfil] = useLocalStorageState<PetPerfil[]>(
    "pets_perfil",
    INITIAL_PETS_PERFIL
  );

  const [fichasTreino, setFichasTreino] = useLocalStorageState<FichaTreino[]>(
    "fichas_treino",
    INITIAL_FICHAS_TREINO
  );
  const [refeicoes, setRefeicoes] = useLocalStorageState<ItemRefeicao[]>(
    "refeicoes",
    INITIAL_DIETA_REFEICOES
  );
  const [volumeSemana, setVolumeSemana] = useLocalStorageState<number[]>(
    "volume_semana",
    [5, 7, 0, 6, 8, 4, 6]
  );
  const [ultimoSRPE, setUltimoSRPE] = useLocalStorageState<number>(
    "ultimo_srpe",
    6
  );
  const [streakTreino, setStreakTreino] = useLocalStorageState<number>(
    "streak_treino",
    4
  );
  const [fichaTreinoAoVivo, setFichaTreinoAoVivo] =
    useState<FichaTreino | null>(null);

  const [mesSelecionado, setMesSelecionado] =
    useState<MesFinanceiroKey>("2026-09");
  const [contas, setContas] = useLocalStorageState<ContaBancaria[]>(
    "contas",
    INITIAL_CONTAS
  );
  const [cartoes, setCartoes] = useLocalStorageState<CartaoCredito[]>(
    "cartoes",
    INITIAL_CARTOES
  );
  const [orcamentos, setOrcamentos] = useLocalStorageState<
    OrcamentoCategoria[]
  >("orcamentos", INITIAL_ORCAMENTOS);
  const [lancamentos, setLancamentos] = useLocalStorageState<
    LancamentoFinanceiro[]
  >("lancamentos", INITIAL_LANCAMENTOS);

  const [perfilCalibrado, setPerfilCalibrado] =
    useLocalStorageState<PerfilUsuarioCalibrado>("perfil_calibrado", {
      nomeUsuario: "Lala",
      cursoUERJ: "Educação Física · UERJ",
      periodoUERJ: "2026.2",
      frentesTrabalho: "CDT, RCR & Iniciação Científica",
      metaHorasSono: 7.5,
      metaProteinaG: 135,
      metaKcal: 2150,
      calibrado: false,
    });
  const [calibracaoOpen, setCalibracaoOpen] = useState<boolean>(false);

  const [configCalendario, setConfigCalendario] =
    useLocalStorageState<ConfiguracaoCalendarioApp>("config_calendario", {
      visaoPadrao: "semana",
      horaInicioGrade: 7,
      mostrarAulasUERJ: true,
      mostrarPets: true,
      mostrarFinancas: true,
      mostrarRadar: true,
      mostrarGoogleAgenda: true,
      sincronizarAoCriarNoGoogle: true,
      coresCategorias: {
        uerj: "#2E6F5E",
        trabalho: "#D97706",
        pets: "#4F46E5",
        financas: "#0284C7",
        saude: "#059669",
        pessoal: "#7C3AED",
      },
    });

  const [demoLimpo, setDemoLimpo] = useLocalStorageState<boolean>(
    "demo_limpo",
    false
  );

  const [repositorio, setRepositorio] = useLocalStorageState<
    ArquivoRepositorio[]
  >("repositorio", INITIAL_REPOSITORIO);
  const [tomGovernanta, setTomGovernanta] = useLocalStorageState<TomGovernanta>(
    "tom_governanta",
    "equilibrada"
  );
  const [interacoesLala, setInteracoesLala] = useLocalStorageState<
    InteracaoGovernanta[]
  >("interacoes_lala", [
    {
      id: 1,
      dataHora: "08:30",
      modo: "informacao",
      tituloCard: "Bate-Papo com a Lala",
      tags: ["Governanta", "Rotina", "Bem-vinda"],
      mensagemUsuario: "Oi Lala! Como está organizado o meu dia hoje?",
      respostaLala:
        "Bom dia! Já revisei toda a casa, suas matérias da UERJ, o estoque da Nina e do Tobias e seu orçamento de hoje. Pode conversar comigo livremente aqui no bate-papo: me conte como está se sentindo, peça para agendar ou mudar tarefas, lance gastos ou anexe qualquer arquivo no clipe 📎 abaixo!",
      guardadoNoCofre: true,
      acoesPropostas: [
        {
          id: "welcome-act-1",
          tipo: "ALIMENTAR_PETS",
          titulo: "Registrar 1ª refeição da Nina & Tobias",
          detalhe: "Desconta 1 sachê Urinary do estoque e atualiza o painel Pet",
          executada: false,
        },
      ],
    },
  ]);
  const [bottomSheet, setBottomSheet] = useState<BottomSheetPayload | null>(
    null
  );
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [brainModalOpen, setBrainModalOpen] = useState<boolean>(false);

  const [focoAtivoTask, setFocoAtivoTask] = useState<TaskItem | null>(null);
  const [segundosFocoRestantes, setSegundosFocoRestantes] =
    useState<number>(1500);
  const [focoRodando, setFocoRodando] = useState<boolean>(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Offline-First & Google Drive Sync State — Persisted in localStorage so user stays logged in offline & across app restarts
  const isOnline = useOnlineStatus();
  const [syncModalOpen, setSyncModalOpen] = useState<boolean>(false);
  const [googleUser, setGoogleUser] = useState<GoogleUserProfile | null>(() =>
    getSavedGoogleUser()
  );
  const [needsAuth, setNeedsAuth] = useState<boolean>(
    () => !getSavedGoogleUser()
  );
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [useAppDataFolder, setUseAppDataFolder] = useState<boolean>(false);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmationState | null>(null);
  const [syncMeta, setSyncMeta] = useState<SyncMetadata>({
    id: "meta",
    updatedAt: Date.now(),
    updatedAtISO: new Date().toISOString(),
    lastSyncedAt: null,
    lastSyncedAtISO: null,
    syncStatus: "pending",
  });

  // Load initial SyncMetadata from IndexedDB and listen for local mutations
  useEffect(() => {
    getSyncMetadata().then(setSyncMeta);
    const onMutation = () => {
      getSyncMetadata().then(setSyncMeta);
    };
    window.addEventListener("lala-local-mutation", onMutation);
    return () => window.removeEventListener("lala-local-mutation", onMutation);
  }, []);

  // Initialize Firebase OAuth state listener
  useEffect(() => {
    const unsub = initAuth(
      (user) => {
        setGoogleUser(user);
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
      }
    );
    return () => unsub();
  }, []);

  // Evaluate and synchronize local IndexedDB state with Google Drive API v3
  const handleSyncCheckWithDrive = useCallback(
    async (silentIfNoChanges = false) => {
      if (!navigator.onLine) {
        if (!silentIfNoChanges) {
          showToast("Dispositivo offline. Alterações salvas localmente no IndexedDB.");
        }
        return;
      }

      let token = await getAccessToken();
      if (!token) {
        if (!silentIfNoChanges) {
          const reauth = await googleSignIn(false, false);
          if (reauth?.accessToken) {
            token = reauth.accessToken;
            setGoogleUser(reauth.user);
            setNeedsAuth(false);
          } else {
            setSyncModalOpen(true);
            return;
          }
        } else {
          return;
        }
      }

      try {
        const syncingState = await updateSyncMetadata({
          syncStatus: "syncing",
          lastError: null,
        });
        setSyncMeta(syncingState);

        const localPayload = await exportFullBackupPayload();
        let remoteFile;
        try {
          remoteFile = await findDriveBackupFile(useAppDataFolder);
        } catch (firstErr: unknown) {
          const firstMsg =
            firstErr instanceof Error ? firstErr.message : String(firstErr);
          if (firstMsg === "AUTH_REQUIRED" && !silentIfNoChanges) {
            const reauth = await googleSignIn(false, false);
            if (reauth?.accessToken) {
              setGoogleUser(reauth.user);
              setNeedsAuth(false);
              remoteFile = await findDriveBackupFile(useAppDataFolder);
            } else {
              throw firstErr;
            }
          } else {
            throw firstErr;
          }
        }

        // If app_data.json does not exist yet on Drive, create it directly
        if (!remoteFile) {
          const uploaded = await uploadDriveBackupContent(
            localPayload,
            null,
            useAppDataFolder
          );
          const now = Date.now();
          const synced = await updateSyncMetadata({
            syncStatus: "synced",
            lastSyncedAt: now,
            lastSyncedAtISO: new Date(now).toISOString(),
            driveFileId: uploaded.id,
            lastError: null,
          });
          setSyncMeta(synced);
          showToast("Backup inicial app_data.json criado no Google Drive!");
          return;
        }

        // Download existing remote backup to compare timestamps
        let remotePayload: AppBackupPayload | null = null;
        try {
          remotePayload = await downloadDriveBackupContent(remoteFile.id);
        } catch {
          remotePayload = null;
        }

        const remoteTime =
          remotePayload?.updatedAt ||
          new Date(remoteFile.modifiedTime).getTime() ||
          0;
        const localTime = localPayload.updatedAt || 0;

        // Conflict resolution by timestamp + Mandatory User Confirmation before mutating existing Drive file
        if (remotePayload && remoteTime > localTime + 1500) {
          const pendingState = await updateSyncMetadata({
            syncStatus: "pending",
            driveFileId: remoteFile.id,
            lastError: null,
          });
          setSyncMeta(pendingState);
          setPendingConfirmation({
            type: "conflict",
            localPayload,
            remoteMeta: remoteFile,
            remotePayload,
            reason:
              "O arquivo app_data.json no Google Drive possui uma data de modificação mais recente do que os dados salvos localmente neste dispositivo. Escolha qual versão deseja manter:",
          });
          setSyncModalOpen(true);
        } else if (!silentIfNoChanges) {
          const pendingState = await updateSyncMetadata({
            syncStatus: "pending",
            driveFileId: remoteFile.id,
            lastError: null,
          });
          setSyncMeta(pendingState);
          setPendingConfirmation({
            type: "overwrite_drive",
            localPayload,
            remoteMeta: remoteFile,
            remotePayload,
            reason:
              "Confirme a atualização do arquivo existente 'app_data.json' no seu Google Drive com os dados locais mais recentes deste dispositivo.",
          });
          setSyncModalOpen(true);
        } else {
          // Silent startup check: local data is already up to date with Drive
          const synced = await updateSyncMetadata({
            syncStatus: "synced",
            driveFileId: remoteFile.id,
            lastError: null,
          });
          setSyncMeta(synced);
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Falha na comunicação com o Drive";
        if (msg === "AUTH_REQUIRED") {
          const cleanState = await updateSyncMetadata({
            syncStatus: "pending",
            lastError: null,
          });
          setSyncMeta(cleanState);
        } else {
          const errState = await updateSyncMetadata({
            syncStatus: "error",
            lastError: msg,
          });
          setSyncMeta(errState);
          if (!silentIfNoChanges) {
            showToast("Erro ao sincronizar com Google Drive");
          }
        }
      }
    },
    [showToast, useAppDataFolder]
  );

  // Automatic synchronization detector when internet connection returns (`online` event)
  useEffect(() => {
    const handleOnlineReconnect = () => {
      showToast("Conexão restaurada! Verificando sincronização com Google Drive...");
      if (googleUser && !needsAuth) {
        handleSyncCheckWithDrive(true);
      }
    };
    window.addEventListener("online", handleOnlineReconnect);
    return () => window.removeEventListener("online", handleOnlineReconnect);
  }, [googleUser, needsAuth, handleSyncCheckWithDrive, showToast]);

  const handleConfirmOverwriteDrive = async () => {
    if (!pendingConfirmation) return;
    try {
      const syncing = await updateSyncMetadata({
        syncStatus: "syncing",
        lastError: null,
      });
      setSyncMeta(syncing);

      const uploaded = await uploadDriveBackupContent(
        pendingConfirmation.localPayload,
        pendingConfirmation.remoteMeta?.id || null,
        useAppDataFolder
      );
      const now = Date.now();
      const synced = await updateSyncMetadata({
        syncStatus: "synced",
        lastSyncedAt: now,
        lastSyncedAtISO: new Date(now).toISOString(),
        driveFileId: uploaded.id,
        lastError: null,
      });
      setSyncMeta(synced);
      setPendingConfirmation(null);
      showToast("Dados sincronizados com sucesso no Google Drive!");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao atualizar arquivo no Drive";
      const errState = await updateSyncMetadata({
        syncStatus: "error",
        lastError: msg,
      });
      setSyncMeta(errState);
      showToast("Erro ao enviar dados para o Google Drive");
    }
  };

  const handleConfirmRestoreFromDrive = async () => {
    if (!pendingConfirmation?.remotePayload) return;
    try {
      const syncing = await updateSyncMetadata({
        syncStatus: "syncing",
        lastError: null,
      });
      setSyncMeta(syncing);

      await importFullBackupPayload(pendingConfirmation.remotePayload);
      const refreshed = await getSyncMetadata();
      setSyncMeta(refreshed);
      setPendingConfirmation(null);
      window.dispatchEvent(new CustomEvent("lala-backup-restored"));
      showToast("Dados restaurados do Google Drive com sucesso!");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao restaurar backup";
      const errState = await updateSyncMetadata({
        syncStatus: "error",
        lastError: msg,
      });
      setSyncMeta(errState);
    }
  };

  const handleForcePushRequest = async () => {
    let token = await getAccessToken();
    if (!token) {
      const reauth = await googleSignIn(false, false);
      if (reauth?.accessToken) {
        token = reauth.accessToken;
        setGoogleUser(reauth.user);
        setNeedsAuth(false);
      } else {
        return;
      }
    }
    try {
      const localPayload = await exportFullBackupPayload();
      let remoteFile;
      try {
        remoteFile = await findDriveBackupFile(useAppDataFolder);
      } catch (firstErr: unknown) {
        const firstMsg =
          firstErr instanceof Error ? firstErr.message : String(firstErr);
        if (firstMsg === "AUTH_REQUIRED") {
          const reauth = await googleSignIn(false, false);
          if (reauth?.accessToken) {
            setGoogleUser(reauth.user);
            setNeedsAuth(false);
            remoteFile = await findDriveBackupFile(useAppDataFolder);
          } else {
            return;
          }
        } else {
          throw firstErr;
        }
      }
      if (!remoteFile) {
        const uploaded = await uploadDriveBackupContent(
          localPayload,
          null,
          useAppDataFolder
        );
        const now = Date.now();
        const synced = await updateSyncMetadata({
          syncStatus: "synced",
          lastSyncedAt: now,
          lastSyncedAtISO: new Date(now).toISOString(),
          driveFileId: uploaded.id,
          lastError: null,
        });
        setSyncMeta(synced);
        showToast("Arquivo app_data.json criado no Google Drive!");
      } else {
        setPendingConfirmation({
          type: "overwrite_drive",
          localPayload,
          remoteMeta: remoteFile,
          reason:
            "Tem certeza que deseja sobrescrever o arquivo 'app_data.json' no Google Drive com os dados atuais deste dispositivo?",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao preparar envio";
      if (msg === "AUTH_REQUIRED") return;
      const errState = await updateSyncMetadata({
        syncStatus: "error",
        lastError: msg,
      });
      setSyncMeta(errState);
    }
  };

  const handleForcePullRequest = async () => {
    let token = await getAccessToken();
    if (!token) {
      const reauth = await googleSignIn(false, false);
      if (reauth?.accessToken) {
        token = reauth.accessToken;
        setGoogleUser(reauth.user);
        setNeedsAuth(false);
      } else {
        return;
      }
    }
    try {
      const localPayload = await exportFullBackupPayload();
      let remoteFile;
      try {
        remoteFile = await findDriveBackupFile(useAppDataFolder);
      } catch (firstErr: unknown) {
        const firstMsg =
          firstErr instanceof Error ? firstErr.message : String(firstErr);
        if (firstMsg === "AUTH_REQUIRED") {
          const reauth = await googleSignIn(false, false);
          if (reauth?.accessToken) {
            setGoogleUser(reauth.user);
            setNeedsAuth(false);
            remoteFile = await findDriveBackupFile(useAppDataFolder);
          } else {
            return;
          }
        } else {
          throw firstErr;
        }
      }
      if (!remoteFile) {
        showToast("Nenhum arquivo app_data.json encontrado no Google Drive.");
        return;
      }
      const remotePayload = await downloadDriveBackupContent(remoteFile.id);
      setPendingConfirmation({
        type: "restore_local",
        localPayload,
        remoteMeta: remoteFile,
        remotePayload,
        reason:
          "Tem certeza que deseja substituir os dados locais deste dispositivo pelo backup salvo no Google Drive?",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao buscar backup";
      if (msg === "AUTH_REQUIRED") return;
      const errState = await updateSyncMetadata({
        syncStatus: "error",
        lastError: msg,
      });
      setSyncMeta(errState);
    }
  };

  const limparDadosDeExemplo = useCallback(
    (silencioso = false) => {
      setTarefas([]);
      setHabitos([]);
      setCompromissos([]);
      setRadarItens([]);
      setMetas([]);
      setDisciplinas([]);
      setArtigos([]);
      setLivros([]);
      setProjetos([]);
      setRefeicoes([]);
      setFichasTreino([]);
      setListaCompras([]);
      setLancamentos([]);
      setRepositorio([]);
      setContas((prev) => prev.map((c) => ({ ...c, saldoAtual: 0 })));
      setCartoes((prev) => prev.map((ct) => ({ ...ct, faturaAtual: 0 })));
      setPetsPerfil((prev) =>
        prev.map((p) => ({
          ...p,
          alimentadoHojeRefeicoes: 0,
          sachesDadosHoje: 0,
        }))
      );
      setInteracoesLala([
        {
          id: Date.now(),
          dataHora: new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          modo: "informacao",
          tituloCard: "App Limpo! Me conte sua rotina a qualquer momento",
          tags: ["Começar do Zero", "Conversa Fluida", "Google Agenda"],
          mensagemUsuario: "Lala, limpar dados de exemplo para começar com meus dados reais",
          respostaLala:
            "Prontinho! Excluí todos os dados de exemplo do aplicativo. Agora você não precisa preencher formulários engessados: basta clicar no botão 'Lala' (ou falar por voz/texto a qualquer momento) e me contar naturalmente suas aulas, gastos, saldo do banco, refeições da dieta, treinos, hábitos ou compromissos que eu preencho e atualizo cada aba e o Google Agenda para você!",
          guardadoNoCofre: false,
          acoesPropostas: [],
        },
      ]);
      setDemoLimpo(true);
      if (!silencioso) {
        showToast(
          "Dados de exemplo excluídos! Converse com a Lala a qualquer momento para preencher seu app."
        );
      }
    },
    [
      setTarefas,
      setHabitos,
      setCompromissos,
      setRadarItens,
      setMetas,
      setDisciplinas,
      setArtigos,
      setLivros,
      setProjetos,
      setRefeicoes,
      setFichasTreino,
      setListaCompras,
      setLancamentos,
      setRepositorio,
      setContas,
      setCartoes,
      setPetsPerfil,
      setInteracoesLala,
      setDemoLimpo,
      showToast,
    ]
  );

  const handleGoogleLoginClick = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setNeedsAuth(false);
        showToast("Conectado ao Google Drive & Agenda com sucesso!");
        await handleSyncCheckWithDrive(false);
      } else {
        showToast("Janela de login fechada. Clique novamente quando quiser conectar.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Falha na autenticação Google";
      showToast(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCustomGISLoginClick = async (clientId: string) => {
    setIsLoggingIn(true);
    try {
      const result = await signInWithCustomGISClient(clientId);
      setGoogleUser(result.user);
      setNeedsAuth(false);
      showToast("Autenticado via Google Identity Services (GIS)!");
      await handleSyncCheckWithDrive(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro no login GIS";
      showToast(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogoutClick = async () => {
    await logoutGoogleDrive();
    setGoogleUser(null);
    setNeedsAuth(true);
    setPendingConfirmation(null);
    showToast("Desconectado do Google Drive.");
  };

  useEffect(() => {
    if (!focoRodando || !focoAtivoTask) return;
    const timer = window.setInterval(() => {
      setSegundosFocoRestantes((s) => {
        if (s <= 1) {
          setFocoRodando(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [focoRodando, focoAtivoTask]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBrainModalOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const prioridades = useMemo(() => {
    const candidatasHoje = tarefas.filter(
      (tk) =>
        !tk.feito &&
        tk.horizonte !== "backlog" &&
        tk.horizonte !== "semana" &&
        tk.manualLock !== "backlog" &&
        tk.manualLock !== "adiada"
    );
    return [...candidatasHoje]
      .sort((a, b) => {
        const pesoLock = (lock?: TaskItem["manualLock"]) =>
          lock === "p1" ? 100 : lock === "top3" ? 50 : 0;
        const diffLock = pesoLock(b.manualLock) - pesoLock(a.manualLock);
        if (diffLock !== 0) return diffLock;
        return calcularScorePrioridade(b) - calcularScorePrioridade(a);
      })
      .slice(0, 3);
  }, [tarefas]);

  const dinheiroLivreInfo = useMemo(() => {
    const lancsMes = lancamentos.filter((l) => l.mesKey === mesSelecionado);
    return calcularDinheiroLivreHoje(contas, lancsMes, 4);
  }, [contas, lancamentos, mesSelecionado]);

  const prontidaoInfo = useMemo(
    () => calcularProntidaoDetalhada(checkin, volumeSemana, ultimoSRPE),
    [checkin, volumeSemana, ultimoSRPE]
  );

  const toggleFeito = (id: number) => {
    setTarefas((prev) =>
      prev.map((tk) => (tk.id === id ? { ...tk, feito: !tk.feito } : tk))
    );
  };

  const promoverP1 = (id: number) => {
    setTarefas((prev) =>
      prev.map((tk) => {
        if (tk.id === id) return { ...tk, horizonte: "hoje", manualLock: "p1" };
        if (tk.manualLock === "p1") return { ...tk, manualLock: "top3" };
        return tk;
      })
    );
    showToast("Definida como Prioridade #1 de Hoje!");
  };

  const adiarPraAmanha = (id: number) => {
    setTarefas((prev) =>
      prev.map((tk) =>
        tk.id === id
          ? { ...tk, horizonte: "semana", manualLock: "adiada" }
          : tk
      )
    );
    showToast("Tarefa movida para a Semana");
  };

  const moverTarefaHorizonte = (
    id: number,
    destino: TaskHorizon,
    comoP1?: boolean
  ) => {
    setTarefas((prev) =>
      prev.map((tk) => {
        if (tk.id !== id) {
          return comoP1 && tk.manualLock === "p1"
            ? { ...tk, manualLock: "top3" }
            : tk;
        }
        return {
          ...tk,
          horizonte: destino,
          manualLock: comoP1
            ? "p1"
            : destino === "backlog"
            ? "backlog"
            : destino === "hoje"
            ? "top3"
            : null,
        };
      })
    );
    const rotulo =
      destino === "hoje"
        ? comoP1
          ? "Hoje (Prioridade #1)"
          : "Hoje"
        : destino === "semana"
        ? "Semana"
        : "Backlog";
    showToast(`Tarefa movida para ${rotulo}`);
  };

  const agendarTarefaNoHorario = (
    taskId: number,
    hora: string,
    duracaoMin?: number,
    diaMes = new Date().getDate()
  ) => {
    const alvo = tarefas.find((tk) => tk.id === taskId);
    if (!alvo) return;
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    const duracaoReal = Math.max(1, duracaoMin ?? alvo.duracaoMin ?? 25);
    setTarefas((prev) =>
      prev.map((tk) =>
        tk.id === taskId
          ? {
              ...tk,
              horizonte: "hoje",
              manualLock: tk.manualLock === "backlog" ? null : tk.manualLock,
              horarioAgendado: hora,
              duracaoMin: duracaoReal,
              diaAgendado: diaMes,
            }
          : tk
      )
    );
    setCompromissos((prev) => {
      const existente = prev.find((c) => c.taskId === taskId);
      const dtObj = new Date(anoAtual, mesAtual - 1, diaMes);
      const diaIdx = (dtObj.getDay() + 6) % 7;
      if (existente) {
        return prev
          .map((c) =>
            c.taskId === taskId
              ? {
                  ...c,
                  hora,
                  duracaoMin: duracaoReal,
                  diaMes,
                  mes: mesAtual,
                  ano: anoAtual,
                  diaSemanaIdx: diaIdx,
                }
              : c
          )
          .sort((a, b) => horaParaMinutos(a.hora) - horaParaMinutos(b.hora));
      }
      const novoComp: Compromisso = {
        id: Date.now(),
        hora,
        duracaoMin: duracaoReal,
        titulo: alvo.texto,
        local: "Alocado na Timeline Proporcional",
        cor: alvo.cor,
        aba: alvo.aba,
        diaMes,
        mes: mesAtual,
        ano: anoAtual,
        diaSemanaIdx: diaIdx,
        gcalSynced: true,
        taskId: alvo.id,
      };
      return [...prev, novoComp].sort(
        (a, b) => horaParaMinutos(a.hora) - horaParaMinutos(b.hora)
      );
    });
    showToast(`Agendado às ${hora} (${duracaoReal} min)!`);
  };

  const toggleHabitoHoje = (id: number) => {
    setHabitos((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const proximoFeito = !h.feitoHoje;
        const novoStreak = proximoFeito
          ? h.streakAtual + 1
          : Math.max(0, h.streakAtual - 1);
        const novoHistorico = [...h.historicoSemana];
        novoHistorico[6] = proximoFeito;
        return {
          ...h,
          feitoHoje: proximoFeito,
          streakAtual: novoStreak,
          melhorStreak: Math.max(h.melhorStreak, novoStreak),
          historicoSemana: novoHistorico,
        };
      })
    );
  };

  const adicionarHabito = (titulo: string, metaTexto: string) => {
    const novo: HabitoDiario = {
      id: Date.now(),
      titulo,
      icone: "sparkles",
      categoria: "Mente",
      cor: "primary",
      feitoHoje: false,
      streakAtual: 0,
      melhorStreak: 0,
      historicoSemana: [false, false, false, false, false, false, false],
      metaTexto: metaTexto || "Diário",
    };
    setHabitos((prev) => [...prev, novo]);
    showToast(`Hábito "${titulo}" adicionado!`);
  };

  const enviarEtapaRadarParaHoje = (radarId: number, etapaId: number) => {
    const item = radarItens.find((r) => r.id === radarId);
    const etapa = item?.etapas.find((e) => e.id === etapaId);
    if (!item || !etapa) return;

    setRadarItens((prev) =>
      prev.map((r) =>
        r.id === radarId
          ? {
              ...r,
              etapas: r.etapas.map((e) =>
                e.id === etapaId ? { ...e, enviadaParaHoje: true } : e
              ),
            }
          : r
      )
    );

    const novaTask: TaskItem = {
      id: Date.now(),
      texto: `[Radar ${item.titulo}] ${etapa.acao}`,
      aba:
        item.area === "UERJ" || item.area === "Trabalho"
          ? "estudos_trabalho"
          : "casa_rotinas",
      categoriaFiltro:
        item.area === "UERJ"
          ? "uerj"
          : item.area === "Trabalho"
          ? "trabalho"
          : "casa",
      cor: item.cor,
      feito: false,
      impacto: 9,
      urgencia: 8,
      facilidade: 7,
      retorno: 9,
      horizonte: "hoje",
      manualLock: "top3",
      duracaoMin: 30,
      prazoFixo: item.dataEvento,
      origemRadarId: item.id,
    };
    setTarefas((prev) => [novaTask, ...prev]);
    showToast(`Etapa "${etapa.acao}" enviada para Hoje!`);
  };

  const alimentarPet = (petId: number) => {
    const petAlvo = petsPerfil.find((p) => p.id === petId);
    if (!petAlvo) return;
    const novoEstoqueSaches = Math.max(0, petAlvo.estoqueSaches - 1);
    setPetsPerfil((prev) =>
      prev.map((p) => {
        const sachesAtualizados = Math.max(0, p.estoqueSaches - 1);
        if (p.id === petId) {
          return {
            ...p,
            estoqueSaches: sachesAtualizados,
            alimentadoHojeRefeicoes: Math.min(
              p.metaRefeicoesDia,
              p.alimentadoHojeRefeicoes + 1
            ),
            sachesDadosHoje: (p.sachesDadosHoje ?? 0) + 1,
          };
        }
        return { ...p, estoqueSaches: sachesAtualizados };
      })
    );
    setEstoqueCasa((prev) =>
      prev.map((item) =>
        item.id === 1 ? { ...item, quantidadeAtual: novoEstoqueSaches } : item
      )
    );
    if (novoEstoqueSaches <= 4) {
      setListaCompras((prev) => {
        if (
          prev.some(
            (c) => !c.comprado && c.nome.toLowerCase().includes("sachê")
          )
        ) {
          return prev;
        }
        return [
          {
            id: Date.now(),
            nome: "Sachês Úmidos Urinary (Pack 10 un)",
            categoria: "Pets",
            quantidadeComprar: 10,
            unidade: "un",
            precoEstimado: 45.9,
            origemEstoqueId: 1,
            comprado: false,
          },
          ...prev,
        ];
      });
    }
    showToast(
      `1 sachê servido para ${petAlvo.nome}! Restam ${novoEstoqueSaches} un.`
    );
  };

  const ajustarItemEstoqueCasa = (itemId: number, delta: number) => {
    setEstoqueCasa((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const novaQtd = Math.max(
          0,
          Math.round((item.quantidadeAtual + delta) * 100) / 100
        );
        if (novaQtd <= item.quantidadeMinima) {
          setListaCompras((compras) => {
            if (
              compras.some((c) => !c.comprado && c.origemEstoqueId === item.id)
            ) {
              return compras;
            }
            return [
              {
                id: Date.now(),
                nome: `${item.nome} (Reposição)`,
                categoria: item.categoria,
                quantidadeComprar: Math.max(1, item.quantidadeMinima * 2),
                unidade: item.unidade,
                precoEstimado: item.precoEstimadoReposicao,
                origemEstoqueId: item.id,
                comprado: false,
              },
              ...compras,
            ];
          });
        }
        return { ...item, quantidadeAtual: novaQtd };
      })
    );
  };

  const adicionarLancamento = (
    valor: number,
    categoria: OrcamentoCategoria["categoria"],
    descricao: string,
    metodo: "Conta / Pix" | "Cartão de Crédito",
    status: "realizado" | "previsto",
    afetaEstoquePets?: boolean,
    contaId = 1,
    cartaoId = 1,
    tipo: "despesa" | "receita" = "despesa"
  ) => {
    const novo: LancamentoFinanceiro = {
      id: Date.now(),
      mesKey: mesSelecionado,
      data: "hoje",
      descricao,
      tipo,
      status,
      metodo,
      contaId: metodo === "Conta / Pix" ? contaId : undefined,
      cartaoId: metodo === "Cartão de Crédito" ? cartaoId : undefined,
      categoria,
      valor,
    };

    setLancamentos((prev) => [novo, ...prev]);

    if (status === "realizado") {
      if (metodo === "Conta / Pix") {
        setContas((prev) =>
          prev.map((c) =>
            c.id === contaId
              ? {
                  ...c,
                  saldoAtual:
                    tipo === "receita"
                      ? c.saldoAtual + valor
                      : Math.max(0, c.saldoAtual - valor),
                }
              : c
          )
        );
      } else {
        setCartoes((prev) =>
          prev.map((ct) =>
            ct.id === cartaoId
              ? { ...ct, faturaAtual: ct.faturaAtual + valor }
              : ct
          )
        );
      }
    }

    if (afetaEstoquePets) {
      setPetsPerfil((prev) =>
        prev.map((p) => ({ ...p, estoqueSaches: p.estoqueSaches + 10 }))
      );
      setEstoqueCasa((prev) =>
        prev.map((e) =>
          e.id === 1 ? { ...e, quantidadeAtual: e.quantidadeAtual + 10 } : e
        )
      );
    }

    showToast(
      `${tipo === "receita" ? "Receita" : "Gasto"} R$ ${valor
        .toFixed(2)
        .replace(".", ",")} registrado!`
    );
  };

  const comprarItemDaListaEReporEstoque = (itemCompra: ItemListaCompras) => {
    setListaCompras((prev) =>
      prev.map((c) => (c.id === itemCompra.id ? { ...c, comprado: true } : c))
    );
    if (itemCompra.origemEstoqueId) {
      setEstoqueCasa((prev) =>
        prev.map((est) =>
          est.id === itemCompra.origemEstoqueId
            ? {
                ...est,
                quantidadeAtual:
                  est.quantidadeAtual + itemCompra.quantidadeComprar,
              }
            : est
        )
      );
    }
    if (itemCompra.nome.toLowerCase().includes("sachê")) {
      setPetsPerfil((prev) =>
        prev.map((p) => ({
          ...p,
          estoqueSaches: p.estoqueSaches + itemCompra.quantidadeComprar,
        }))
      );
    }
    adicionarLancamento(
      itemCompra.precoEstimado,
      itemCompra.categoria === "Pets" ? "Pets" : "Mercado",
      `Compra: ${itemCompra.nome}`,
      "Conta / Pix",
      "realizado"
    );
  };

  const registrarCompraSaches = (pet: PetPerfil) => {
    adicionarLancamento(
      45.9,
      "Pets",
      `Pack 10 Sachês Urinary (${pet.nome})`,
      "Conta / Pix",
      "realizado",
      true
    );
  };

  const enviarRotinaParaHoje = (rotina: RotinaComodo, comodoNome: string) => {
    const nova: TaskItem = {
      id: Date.now(),
      texto: `[${comodoNome}] ${rotina.tarefa}`,
      aba: "casa_rotinas",
      categoriaFiltro: "casa",
      cor: "primary",
      feito: false,
      impacto: 7,
      urgencia: 8,
      facilidade: 9,
      retorno: 8,
      horizonte: "hoje",
      manualLock: "top3",
      duracaoMin: rotina.tempoEstimadoMin,
      prazoFixo: "Hoje",
    };
    setTarefas((prev) => [nova, ...prev]);
    showToast(`Rotina "${rotina.tarefa}" enviada para Hoje!`);
  };

  const enviarProjetoParaPrioridades = (proj: ProjetoTrabalho) => {
    const nova: TaskItem = {
      id: Date.now(),
      texto: `[${proj.nome.split("—")[0].trim()}] ${proj.tarefa}`,
      aba: "estudos_trabalho",
      categoriaFiltro: "trabalho",
      cor: "alert",
      feito: false,
      impacto: 9,
      urgencia: 9,
      facilidade: 7,
      retorno: 9,
      horizonte: "hoje",
      manualLock: "top3",
      duracaoMin: 45,
      prazoFixo: proj.prazo,
    };
    setTarefas((prev) => [nova, ...prev]);
    showToast(`Entregável "${proj.tarefa}" puxado para Hoje!`);
  };

  const registrarSRPEHoje = (srpe: number) => {
    setUltimoSRPE(srpe);
    setVolumeSemana((prev) => {
      const copia = [...prev];
      copia[6] = srpe;
      return copia;
    });
    showToast(`Carga sRPE ${srpe}/10 registrada na prontidão!`);
  };

  const executarAcaoDaLala = (acao: AcaoGovernanta, interacaoId?: number) => {
    if (acao.executada) return;

    switch (acao.tipo) {
      case "CRIAR_TAREFA": {
        const txt = acao.payload?.texto || acao.titulo;
        const lower = txt.toLowerCase();
        let aba: Exclude<TabId, "inicio"> = "estudos_trabalho";
        let catFiltro: Exclude<TaskCategoryFilter, "todas"> = "uerj";
        let cor: TaskItem["cor"] = "primary";

        if (
          lower.includes("cdt") ||
          lower.includes("rcr") ||
          lower.includes("trabalho")
        ) {
          aba = "estudos_trabalho";
          catFiltro = "trabalho";
          cor = "alert";
        } else if (
          lower.includes("casa") ||
          lower.includes("nina") ||
          lower.includes("tobias")
        ) {
          aba = "casa_rotinas";
          catFiltro = "casa";
          cor = "primary";
        } else if (lower.includes("treino") || lower.includes("cheer")) {
          aba = "saude_pets";
          catFiltro = "pessoal";
          cor = "action";
        }

        const nova: TaskItem = {
          id: Date.now(),
          texto: txt,
          aba,
          categoriaFiltro: catFiltro,
          cor,
          feito: false,
          impacto: 8,
          urgencia: 8,
          facilidade: 7,
          retorno: 8,
          horizonte: "hoje",
          manualLock: "top3",
          duracaoMin: 25,
        };
        setTarefas((prev) => [nova, ...prev]);
        showToast(
          `Lala adicionou em Hoje (Score ${calcularScorePrioridade(nova).toFixed(
            1
          )})`
        );
        break;
      }
      case "REGISTRAR_GASTO": {
        const val = acao.payload?.valor || 20;
        const cat = acao.payload?.categoriaGasto || "Mercado";
        adicionarLancamento(
          val,
          cat,
          acao.payload?.texto || acao.titulo,
          "Conta / Pix",
          "realizado",
          cat === "Pets"
        );
        break;
      }
      case "ALIMENTAR_PETS": {
        alimentarPet(1);
        alimentarPet(2);
        break;
      }
      case "REGISTRAR_SRPE": {
        registrarSRPEHoje(acao.payload?.srpe || 7);
        break;
      }
      case "GUARDAR_SEGUNDO_CEREBRO": {
        const anexo = acao.payload?.anexo;
        const isImg = anexo?.mimeType?.startsWith("image/");
        const novoArq: ArquivoRepositorio = {
          id: Date.now(),
          titulo: anexo?.nome || acao.titulo,
          area: acao.payload?.areaNota || anexo?.areaRepositorio || "Pessoal",
          tipo: anexo ? (isImg ? "Imagem / Foto" : "PDF / Doc") : "Nota Rápida",
          urlOuConteudo:
            anexo?.textoExtraido?.slice(0, 250) ||
            acao.payload?.texto ||
            acao.detalhe ||
            (anexo
              ? `Arquivo salvo (${formatarTamanhoBytes(anexo.tamanhoBytes)})`
              : "Nota guardada pela Lala"),
          dataCriacao: "Hoje (via Lala)",
          fixado: true,
          statusLeitura: "Para Ler",
          anexoBase64: anexo?.base64,
          mimeType: anexo?.mimeType,
          nomeArquivoOriginal: anexo?.nome,
          tamanhoBytes: anexo?.tamanhoBytes,
        };
        setRepositorio((prev) => [novoArq, ...prev]);
        showToast("Guardado pela Lala no Segundo Cérebro!");
        break;
      }
      case "ALIVIAR_AGENDA_HOJE": {
        setTarefas((prev) =>
          prev.map((tk) =>
            !tk.feito && tk.horizonte === "hoje" && tk.manualLock !== "p1"
              ? { ...tk, horizonte: "semana", manualLock: "adiada" }
              : tk
          )
        );
        showToast("Agenda aliviada! Só a Prioridade #1 ficou para hoje.");
        break;
      }
      case "ATIVAR_MODO_SOS": {
        setThemeMode(themeMode === "survival" ? "light" : "survival");
        break;
      }
      case "ATUALIZAR_DIETA_E_COMPRAS": {
        if (acao.payload?.refeicoes && acao.payload.refeicoes.length > 0) {
          setRefeicoes(
            acao.payload.refeicoes.map((r, idx) => ({
              id: Date.now() + idx,
              horario: r.horario,
              nome: r.nome,
              descricao: r.descricao,
              proteinaG: r.proteinaG,
              kcal: r.kcal,
              feito: false,
            }))
          );
        }
        if (acao.payload?.itensCompras && acao.payload.itensCompras.length > 0) {
          const novosItens: ItemListaCompras[] = acao.payload.itensCompras.map(
            (item, idx) => ({
              id: Date.now() + 100 + idx,
              nome: item.nome,
              categoria: item.categoria || "Despensa & Meal Prep",
              quantidadeComprar: item.quantidadeComprar || 1,
              unidade: item.unidade || "un",
              precoEstimado: item.precoEstimado || 20,
              comprado: false,
            })
          );
          setListaCompras((prev) => [...novosItens, ...prev]);
        }
        showToast(
          "Dieta aplicada no cardápio e ingredientes enviados para a Lista de Compras!"
        );
        break;
      }
      case "CRIAR_LISTA_COMPRAS": {
        if (acao.payload?.itensCompras && acao.payload.itensCompras.length > 0) {
          const novosItens: ItemListaCompras[] = acao.payload.itensCompras.map(
            (item, idx) => ({
              id: Date.now() + idx,
              nome: item.nome,
              categoria: item.categoria || "Despensa & Meal Prep",
              quantidadeComprar: item.quantidadeComprar || 1,
              unidade: item.unidade || "un",
              precoEstimado: item.precoEstimado || 20,
              comprado: false,
            })
          );
          setListaCompras((prev) => [...novosItens, ...prev]);
          showToast(
            `${novosItens.length} itens adicionados na Lista de Compras!`
          );
        }
        break;
      }
      case "ATUALIZAR_GRADE_UERJ": {
        if (acao.payload?.disciplinas && acao.payload.disciplinas.length > 0) {
          const novasDiscs: Disciplina[] = acao.payload.disciplinas.map(
            (d, idx) => ({
              id: Date.now() + idx,
              nome: d.nome,
              professor: d.professor || "Docente UERJ",
              horarioSala: d.horarioSala || "Seg/Qua 08h-10h",
              prazo: "Semestre Atual",
              status: "em dia",
              aulasTotaisSemestre: d.aulasTotaisSemestre || 30,
              faltasAtuais: 0,
              faltasMax: d.faltasMax || 7,
              presencas: 0,
              mediaAprovacao: 7.0,
              avaliacoes: [
                {
                  id: Date.now() + 200 + idx,
                  tipo: "P1",
                  data: "A definir",
                  peso: 1,
                  notaObtida: null,
                },
              ],
              leiturasSemana: [],
              linksUteis: [],
              anotacoes: "",
            })
          );
          setDisciplinas(novasDiscs);

          // Também adiciona blocos de aula na Agenda
          const novosComps: Compromisso[] = novasDiscs.map((d, idx) => ({
            id: Date.now() + 500 + idx,
            hora: idx % 2 === 0 ? "08:00" : "10:00",
            duracaoMin: 110,
            titulo: `Aula UERJ: ${d.nome}`,
            local: d.horarioSala,
            cor: "primary",
            aba: "estudos_trabalho",
            diaMes: 28 + (idx % 3),
            diaSemanaIdx: idx % 5,
            gcalSynced: true,
          }));
          setCompromissos((prev) => [...prev, ...novosComps]);
          showToast("Grade UERJ atualizada e aulas alocadas na Agenda!");
        }
        break;
      }
      case "ATUALIZAR_CONTAS_FINANCAS": {
        if (acao.payload?.contasAjuste && acao.payload.contasAjuste.length > 0) {
          setContas((prev) => {
            if (acao.payload?.substituirExistentes) {
              return (acao.payload.contasAjuste || []).map((aj, idx) => ({
                id: Date.now() + idx,
                nome: aj.nome,
                tipo: "Corrente / Pix" as const,
                saldoAtual: aj.saldoAtual,
                cor: idx === 0 ? ("primary" as const) : ("finance" as const),
              }));
            }
            const copia = [...prev];
            for (const aj of acao.payload?.contasAjuste || []) {
              const idx = copia.findIndex((c) =>
                c.nome.toLowerCase().includes(aj.nome.split(" ")[0].toLowerCase())
              );
              if (idx >= 0) {
                copia[idx] = { ...copia[idx], saldoAtual: aj.saldoAtual };
              } else {
                copia.push({
                  id: Date.now() + Math.floor(Math.random() * 1000),
                  nome: aj.nome,
                  tipo: "Corrente / Pix",
                  saldoAtual: aj.saldoAtual,
                  cor: "primary",
                });
              }
            }
            return copia;
          });
        }
        if (acao.payload?.cartoesAjuste && acao.payload.cartoesAjuste.length > 0) {
          setCartoes((prev) => {
            if (acao.payload?.substituirExistentes) {
              return (acao.payload.cartoesAjuste || []).map((aj, idx) => ({
                id: Date.now() + idx,
                nome: aj.nome,
                limiteTotal: aj.limiteTotal || 3000,
                faturaAtual: aj.faturaAtual,
                fechamentoDia: aj.fechamentoDia || 20,
                vencimentoDia: aj.vencimentoDia || 28,
                statusFatura: "aberta" as const,
              }));
            }
            const copia = [...prev];
            for (const aj of acao.payload?.cartoesAjuste || []) {
              const idx = copia.findIndex((c) =>
                c.nome.toLowerCase().includes(aj.nome.split(" ")[0].toLowerCase())
              );
              if (idx >= 0) {
                copia[idx] = {
                  ...copia[idx],
                  faturaAtual: aj.faturaAtual,
                  limiteTotal: aj.limiteTotal ?? copia[idx].limiteTotal,
                  fechamentoDia: aj.fechamentoDia ?? copia[idx].fechamentoDia,
                  vencimentoDia: aj.vencimentoDia ?? copia[idx].vencimentoDia,
                };
              } else {
                copia.push({
                  id: Date.now() + Math.floor(Math.random() * 1000),
                  nome: aj.nome,
                  limiteTotal: aj.limiteTotal || 3000,
                  faturaAtual: aj.faturaAtual,
                  fechamentoDia: aj.fechamentoDia || 20,
                  vencimentoDia: aj.vencimentoDia || 28,
                  statusFatura: "aberta",
                });
              }
            }
            return copia;
          });
        }
        showToast("Finanças e saldos atualizados pela Lala!");
        break;
      }
      case "REGISTRAR_RECEITA": {
        const val = acao.payload?.valor || 100;
        adicionarLancamento(
          val,
          "Lazer & Outros",
          acao.payload?.texto || acao.titulo,
          "Conta / Pix",
          "realizado",
          false,
          1,
          1,
          "receita"
        );
        break;
      }
      case "AGENDAR_COMPROMISSO": {
        const listaComps = acao.payload?.compromissos || [];
        if (listaComps.length > 0) {
          const hoje = new Date();
          const novos: Compromisso[] = listaComps.map((c, idx) => {
            const diaMes = c.diaMes || hoje.getDate();
            const rawMes =
              c.mes !== undefined ? c.mes : hoje.getMonth() + 1;
            const mes = rawMes >= 1 && rawMes <= 12 ? rawMes : hoje.getMonth() + 1;
            const ano = c.ano || hoje.getFullYear();
            const dataObj = new Date(ano, mes - 1, diaMes);
            const diaSemanaIdx = (dataObj.getDay() + 6) % 7;
            const rawCat = c.categoria || c.categoriaCalendario || "pessoal";
            const cat: NonNullable<Compromisso["categoriaCalendario"]> =
              rawCat === "uerj" ||
              rawCat === "trabalho" ||
              rawCat === "pets" ||
              rawCat === "financas" ||
              rawCat === "saude"
                ? rawCat
                : "pessoal";
            const abaMapeada: Exclude<TabId, "inicio"> =
              cat === "uerj" || cat === "trabalho"
                ? "estudos_trabalho"
                : cat === "pets"
                ? "casa_rotinas"
                : cat === "financas"
                ? "financas"
                : cat === "saude"
                ? "saude_pets"
                : "calendario";
            return {
              id: Date.now() + idx,
              hora: c.hora || "09:00",
              duracaoMin: c.duracaoMin || 60,
              titulo: c.titulo || acao.titulo,
              local: c.local || "Agendado via Lala",
              cor:
                cat === "uerj"
                  ? "primary"
                  : cat === "pets"
                  ? "action"
                  : cat === "financas"
                  ? "finance"
                  : rawCat === "radar"
                  ? "alert"
                  : "primary",
              aba: abaMapeada,
              diaMes,
              mes,
              ano,
              diaSemanaIdx,
              categoriaCalendario: cat,
              gcalSynced: !!googleUser && !needsAuth,
            };
          });
          setCompromissos((prev) =>
            [...prev, ...novos].sort(
              (a, b) => horaParaMinutos(a.hora) - horaParaMinutos(b.hora)
            )
          );
          if (googleUser && !needsAuth) {
            novos.forEach((nc) => {
              criarEventoGoogleCalendar({
                titulo: nc.titulo,
                local: nc.local,
                ano: nc.ano || new Date().getFullYear(),
                mes: nc.mes || new Date().getMonth() + 1,
                diaMes: nc.diaMes,
                horaInicio: nc.hora,
                duracaoMin: nc.duracaoMin,
                categoria:
                  nc.categoriaCalendario === "uerj"
                    ? "uerj"
                    : nc.categoriaCalendario === "pets"
                    ? "pets"
                    : nc.categoriaCalendario === "financas"
                    ? "financas"
                    : "pessoal",
              }).catch(() => {});
            });
          }
          showToast(
            `${novos.length} compromisso(s) agendado(s) no Calendário${
              googleUser && !needsAuth ? " e Google Agenda" : ""
            }!`
          );
        }
        break;
      }
      case "ATUALIZAR_PETS": {
        if (acao.payload?.estoquePetsAjuste) {
          const saches = acao.payload.estoquePetsAjuste.estoqueSaches;
          const racaoKg = acao.payload.estoquePetsAjuste.estoqueRacaoKg;
          setPetsPerfil((prev) =>
            prev.map((p) => ({
              ...p,
              estoqueSaches:
                typeof saches === "number" ? saches : p.estoqueSaches,
              estoqueRacaoKg:
                typeof racaoKg === "number" ? racaoKg : p.estoqueRacaoKg,
            }))
          );
        }
        if (acao.payload?.petsAjuste && acao.payload.petsAjuste.length > 0) {
          setPetsPerfil((prev) => {
            const copia = [...prev];
            for (const pj of acao.payload?.petsAjuste || []) {
              const idx = copia.findIndex(
                (p) => p.nome.toLowerCase() === pj.nome.toLowerCase()
              );
              if (idx >= 0) {
                copia[idx] = {
                  ...copia[idx],
                  racao: pj.racao ?? pj.racaoTipo ?? copia[idx].racao,
                  estoqueSaches: pj.estoqueSaches ?? copia[idx].estoqueSaches,
                  estoqueRacaoKg:
                    pj.estoqueRacaoKg ?? copia[idx].estoqueRacaoKg,
                  metaRefeicoesDia:
                    pj.metaRefeicoesDia ?? copia[idx].metaRefeicoesDia,
                  proximaVet:
                    pj.proximaVet ?? pj.proximaVacina ?? copia[idx].proximaVet,
                };
              } else {
                copia.push({
                  id: Date.now() + Math.floor(Math.random() * 1000),
                  nome: pj.nome,
                  racao: pj.racao || pj.racaoTipo || "Ração Super Premium",
                  consumoRacaoGramasDia: 65,
                  consumoSachesDia: 1,
                  proximaVet: pj.proximaVet || pj.proximaVacina || "Em dia",
                  estoqueSaches: pj.estoqueSaches ?? 10,
                  estoqueRacaoKg: pj.estoqueRacaoKg ?? 3,
                  alimentadoHojeRefeicoes: 0,
                  sachesDadosHoje: 0,
                  metaRefeicoesDia: pj.metaRefeicoesDia || 3,
                  historicoPeso: [{ data: "Hoje", pesoKg: 4.2 }],
                  cuidados: [],
                  observacoes: "Cadastrado via Lala",
                });
              }
            }
            return copia;
          });
        }
        showToast("Dados dos Pets atualizados pela Lala!");
        break;
      }
      case "ATUALIZAR_TREINO": {
        if (acao.payload?.fichaTreino) {
          const ft = acao.payload.fichaTreino;
          const novaFicha: FichaTreino = {
            id: Date.now(),
            nome: ft.nome,
            modalidade: "Musculação",
            foco: ft.foco,
            ultimaRealizacao: "Importada pela Lala",
            exercicios: ft.exercicios.map((ex, idx) => ({
              id: Date.now() + idx,
              nome: ex.nome,
              modalidade: "Musculação",
              descansoSeg: ex.descansoSeg,
              series: Array.from(
                { length: Math.max(1, ex.series || 3) },
                (_, sIdx) => ({
                  id: Date.now() + idx * 10 + sIdx,
                  numero: sIdx + 1,
                  cargaOuDetalhe: ex.cargaKg
                    ? `${ex.cargaKg} kg`
                    : "Peso corporal",
                  repsOuTempo: ex.reps || "10",
                  concluida: false,
                })
              ),
            })),
          };
          setFichasTreino((prev) => [novaFicha, ...prev]);
          showToast(`Ficha "${ft.nome}" importada para Saúde & Corpo!`);
        }
        break;
      }
      case "ATUALIZAR_PROJETOS_TRABALHO": {
        const listaProjs =
          acao.payload?.projetos || acao.payload?.projetosTrabalho || [];
        if (listaProjs.length > 0) {
          const novosProjs: ProjetoTrabalho[] = listaProjs.map((p, idx) => ({
            id: Date.now() + idx,
            nome: p.nome,
            papel: p.papel || "Responsável",
            tarefa: p.tarefa,
            prioridade: p.prioridade || "alta",
            statusProjeto: "Em Produção",
            prazo: p.prazo || "Esta semana",
            subtarefas: (p.subtarefas || [p.tarefa]).map((st, sIdx) => ({
              id: Date.now() + idx * 20 + sIdx,
              texto: st,
              feito: false,
            })),
            notas: "Criado conversando com a Lala",
          }));
          setProjetos((prev) =>
            acao.payload?.substituirExistentes
              ? novosProjs
              : [...novosProjs, ...prev]
          );
          showToast("Projetos de trabalho atualizados pela Lala!");
        }
        break;
      }
      case "ATUALIZAR_HABITOS": {
        const listaHabitos =
          acao.payload?.habitos || acao.payload?.habitosLista || [];
        if (listaHabitos.length > 0) {
          const novosHabitos: HabitoDiario[] = listaHabitos.map((h, idx) => ({
            id: Date.now() + idx,
            titulo: h.titulo,
            icone: "sparkles",
            categoria: h.categoria || "Saúde",
            cor: "primary",
            feitoHoje: false,
            streakAtual: 0,
            melhorStreak: 0,
            historicoSemana: [false, false, false, false, false, false, false],
            metaTexto: h.metaTexto || "Diário",
          }));
          setHabitos((prev) =>
            acao.payload?.substituirExistentes
              ? novosHabitos
              : [...prev, ...novosHabitos]
          );
          showToast("Hábitos diários atualizados pela Lala!");
        }
        break;
      }
      case "ATUALIZAR_METAS_RADAR": {
        const listaMetas =
          acao.payload?.metas || acao.payload?.metasLista || [];
        if (listaMetas.length > 0) {
          const novasMetas: MetaItem[] = listaMetas.map((m, idx) => ({
            id: Date.now() + idx,
            titulo: m.titulo,
            categoria: m.categoria || "Pessoal",
            prazo: m.prazo || "Este semestre",
            cor: "primary",
            marcos: (m.marcos || ["Definir primeira entrega", "Concluir etapa final"]).map(
              (mc, mIdx) => ({
                id: Date.now() + idx * 10 + mIdx,
                texto: mc,
                concluido: false,
              })
            ),
          }));
          setMetas((prev) => [...novasMetas, ...prev]);
        }
        if (acao.payload?.radarLista && acao.payload.radarLista.length > 0) {
          const novosRadar: ItemRadar[] = acao.payload.radarLista.map(
            (r, idx) => ({
              id: Date.now() + 200 + idx,
              titulo: r.titulo,
              area: r.area || "UERJ",
              dataEvento: r.dataEvento || "Em breve",
              diasRestantes: r.diasRestantes ?? 7,
              cor: "alert",
              etapas: (r.etapas || ["Preparar entrega"]).map((et, eIdx) => ({
                id: Date.now() + idx * 20 + eIdx,
                diasAntes: 3,
                rotuloTempo: "D-3",
                acao: et,
                concluida: false,
                enviadaParaHoje: false,
              })),
            })
          );
          setRadarItens((prev) => [...novosRadar, ...prev]);
        }
        showToast("Metas e Radar de Prazos atualizados pela Lala!");
        break;
      }
      case "ATUALIZAR_PERFIL_CHECKIN":
      case "ATUALIZAR_CHECKIN_SAUDE": {
        const pc = acao.payload?.perfilCheckin;
        const cj = acao.payload?.checkinAjuste;
        if (pc || cj) {
          setCheckin((prev) => ({
            ...prev,
            horasSono: pc?.horasSono ?? cj?.horasSono ?? prev.horasSono,
            qualidadeSono: cj?.qualidadeSono ?? prev.qualidadeSono,
            energiaFisica:
              pc?.energiaFisica ??
              cj?.energiaFisica ??
              cj?.energia ??
              prev.energiaFisica,
            focoMental: pc?.focoMental ?? cj?.focoMental ?? prev.focoMental,
            realizadoHoje: true,
          }));
        }
        const pf = acao.payload?.perfilAjuste || acao.payload?.perfilCheckin;
        if (pf) {
          setPerfilCalibrado((prev) => ({
            ...prev,
            nomeUsuario: pf.nomeUsuario ?? prev.nomeUsuario,
            cursoUERJ: pf.cursoUERJ ?? prev.cursoUERJ,
            periodoUERJ: pf.periodoUERJ ?? prev.periodoUERJ,
            frentesTrabalho: pf.frentesTrabalho ?? prev.frentesTrabalho,
            metaHorasSono: pf.metaHorasSono ?? prev.metaHorasSono,
            metaProteinaG: pf.metaProteinaG ?? prev.metaProteinaG,
            metaKcal: pf.metaKcal ?? prev.metaKcal,
            calibrado: true,
          }));
        }
        showToast("Check-in de prontidão e perfil atualizados pela Lala!");
        break;
      }
      case "ATUALIZAR_PERFIL": {
        const pf = acao.payload?.perfilAjuste || acao.payload?.perfilCheckin;
        if (pf) {
          setPerfilCalibrado((prev) => ({
            ...prev,
            nomeUsuario: pf.nomeUsuario ?? prev.nomeUsuario,
            cursoUERJ: pf.cursoUERJ ?? prev.cursoUERJ,
            periodoUERJ: pf.periodoUERJ ?? prev.periodoUERJ,
            frentesTrabalho: pf.frentesTrabalho ?? prev.frentesTrabalho,
            metaHorasSono: pf.metaHorasSono ?? prev.metaHorasSono,
            metaProteinaG: pf.metaProteinaG ?? prev.metaProteinaG,
            metaKcal: pf.metaKcal ?? prev.metaKcal,
            calibrado: true,
          }));
          showToast("Perfil atualizado pela Lala!");
        }
        break;
      }
      case "LIMPAR_DADOS_EXEMPLO": {
        limparDadosDeExemplo();
        break;
      }
    }

    if (interacaoId) {
      setInteracoesLala((prev) =>
        prev.map((item) =>
          item.id === interacaoId
            ? {
                ...item,
                acoesPropostas: item.acoesPropostas?.map((a) =>
                  a.id === acao.id ? { ...a, executada: true } : a
                ),
              }
            : item
        )
      );
    }
  };

  const handleEnviarAnexoParaLalaGlobal = async (
    anexoOuAnexos: AnexoLala | AnexoLala[] | undefined,
    promptInicial: string
  ) => {
    const tarefasHojePendentes = tarefas.filter(
      (tk) => !tk.feito && tk.horizonte === "hoje"
    );
    const tarefaP1 =
      tarefasHojePendentes.find((tk) => tk.manualLock === "p1") ||
      tarefasHojePendentes[0];

    const ctx = {
      nomeUsuario: perfilCalibrado.nomeUsuario,
      prontidaoScore: prontidaoInfo.scoreTotal,
      horasSono: checkin.horasSono,
      dinheiroLivreHoje: Math.round(dinheiroLivreInfo.livreHoje),
      sachesRestantes: petsPerfil[0]?.estoqueSaches ?? 0,
      tarefasHojeCount: tarefasHojePendentes.length,
      prioridade1: tarefaP1?.texto || "Nenhuma pendente",
      disciplinasUERJ: disciplinas.map((d) => d.nome),
      projetosAtivos: projetos.map((p) => `${p.nome}: ${p.tarefa}`),
      contasBancarias: contas.map((c) => ({
        nome: c.nome,
        saldoAtual: c.saldoAtual,
      })),
      cartoesCredito: cartoes.map((c) => ({
        nome: c.nome,
        faturaAtual: c.faturaAtual,
        limiteTotal: c.limiteTotal,
        vencimentoDia: c.vencimentoDia,
      })),
    };

    const resultado = await consultarLalaUnificada(
      promptInicial,
      ctx,
      anexoOuAnexos
    );

    // Aplica automaticamente todas as ações de preenchimento/atualização do app
    const acoesComExecucao = (resultado.acoesPropostas || []).map((ac) => {
      if (ac.tipo !== "ATIVAR_MODO_SOS") {
        executarAcaoDaLala(ac);
        return { ...ac, executada: true };
      }
      return ac;
    });

    const novaInteracao: InteracaoGovernanta = {
      id: Date.now(),
      dataHora: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      mensagemUsuario: promptInicial,
      ...resultado,
      acoesPropostas: acoesComExecucao,
    };

    setInteracoesLala((prev) => [novaInteracao, ...prev]);
  };

  // EXATAMENTE 5 ABAS PRINCIPAIS NA BARRA INFERIOR MOBILE
  const NAV_TABS: {
    id: TabId;
    label: string;
    shortLabel: string;
    sub: string;
    icon: React.ElementType;
    badge?: number;
  }[] = [
    {
      id: "inicio",
      label: "Início",
      shortLabel: "Início",
      sub: "Planeador, Foco, Timeline & Hábitos",
      icon: Home,
      badge: tarefas.filter(
        (tk) =>
          !tk.feito &&
          tk.horizonte !== "backlog" &&
          tk.horizonte !== "semana" &&
          tk.manualLock !== "backlog"
      ).length,
    },
    {
      id: "estudos_trabalho",
      label: "Estudos & Trabalho",
      shortLabel: "Estudos",
      sub: "UERJ, Artigos & Projetos",
      icon: GraduationCap,
    },
    {
      id: "casa_rotinas",
      label: "Casa & Pets",
      shortLabel: "Casa & Pets",
      sub: "Casa, Compras & Nina/Tobias",
      icon: PawPrint,
      badge: listaCompras.filter((c) => !c.comprado).length || undefined,
    },
    {
      id: "saude_pets",
      label: "Saúde & Corpo",
      shortLabel: "Saúde",
      sub: "Treinos, Dieta & Prontidão",
      icon: HeartPulse,
    },
    {
      id: "financas",
      label: "Finanças",
      shortLabel: "Finanças",
      sub: `R$ ${dinheiroLivreInfo.livreHoje.toFixed(0)} livre hoje`,
      icon: Wallet,
    },
  ];

  const tituloAbaAtiva =
    activeTab === "calendario"
      ? "Calendário Mensal & Semanal"
      : activeTab === "governanta_lala"
      ? "Lala"
      : NAV_TABS.find((x) => x.id === activeTab)?.label || "Início";

  return (
    <div
      style={{ backgroundColor: t.bg, color: t.text }}
      className="min-h-screen w-full transition-colors duration-300 font-sans antialiased"
    >
      <div className="max-w-[1440px] mx-auto min-h-screen flex flex-col lg:grid lg:grid-cols-[280px_1fr]">
        {/* SIDEBAR DESKTOP */}
        <aside
          style={{ backgroundColor: t.card, borderColor: t.border }}
          className="hidden lg:flex flex-col justify-between border-r h-screen sticky top-0 p-5 select-none z-30"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  style={{
                    backgroundColor: `${t.primary}18`,
                    color: t.primary,
                  }}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-base"
                >
                  L
                </div>
                <div>
                  <h1
                    className="text-base font-bold tracking-tight leading-none"
                    style={{ color: t.text }}
                  >
                    Casa da Lala
                  </h1>
                  <p style={{ color: t.textSoft }} className="text-[11px] mt-1">
                    UERJ · Cheer · Casa & Finanças
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(true)}
                style={{ backgroundColor: t.cardSubtle, color: t.textSoft }}
                className="p-2 rounded-xl hover:opacity-80 transition-opacity cursor-pointer"
                title="Abrir Segundo Cérebro e Calendário"
              >
                <FolderOpen size={16} />
              </button>
            </div>

            <button
              onClick={() => setBrainModalOpen(true)}
              style={{
                background: `linear-gradient(135deg, ${t.primary}, ${t.action})`,
              }}
              className="w-full py-2.5 px-3.5 rounded-2xl text-white font-semibold text-xs flex items-center justify-between shadow-xs hover:opacity-95 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Mic size={15} /> Falar com a Lala
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20 font-mono">
                ⌘K
              </span>
            </button>

            <nav className="space-y-1">
              <p
                style={{ color: t.textSoft }}
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 mb-1.5"
              >
                5 Abas Principais
              </p>
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      backgroundColor: isActive ? `${t.primary}15` : "transparent",
                      color: isActive ? t.primary : t.text,
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        style={{
                          backgroundColor: isActive ? t.primary : t.cardSubtle,
                          color: isActive ? "#FFF" : t.textSoft,
                        }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      >
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate leading-tight">
                          {tab.label}
                        </p>
                        <p
                          style={{ color: t.textSoft }}
                          className="text-[10px] truncate mt-0.5"
                        >
                          {tab.sub}
                        </p>
                      </div>
                    </div>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span
                        style={{
                          backgroundColor: isActive ? t.primary : t.cardSubtle,
                          color: isActive ? "#FFF" : t.textSoft,
                        }}
                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Atalhos da Governanta Lala e Calendário Integrados no Menu Lateral */}
              <div className="pt-2 space-y-1">
                <p
                  style={{ color: t.textSoft }}
                  className="text-[10px] font-bold uppercase tracking-wider px-2.5 mb-1"
                >
                  Governanta & Visão Geral
                </p>
                <button
                  onClick={() => setActiveTab("governanta_lala")}
                  style={{
                    backgroundColor:
                      activeTab === "governanta_lala"
                        ? `${t.primary}18`
                        : "transparent",
                    color:
                      activeTab === "governanta_lala" ? t.primary : t.text,
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all cursor-pointer"
                >
                  <div
                    style={{
                      backgroundColor:
                        activeTab === "governanta_lala"
                          ? t.primary
                          : t.cardSubtle,
                      color:
                        activeTab === "governanta_lala" ? "#FFF" : t.primary,
                    }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  >
                    <Sparkles size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate leading-tight">
                      Lala
                    </p>
                    <p
                      style={{ color: t.textSoft }}
                      className="text-[10px] truncate mt-0.5"
                    >
                      Voz, Comandos, Ideias & Desabafo
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("calendario")}
                  style={{
                    backgroundColor:
                      activeTab === "calendario" ? `${t.action}15` : "transparent",
                    color: activeTab === "calendario" ? t.action : t.text,
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all cursor-pointer"
                >
                  <div
                    style={{
                      backgroundColor:
                        activeTab === "calendario" ? t.action : t.cardSubtle,
                      color: activeTab === "calendario" ? "#FFF" : t.textSoft,
                    }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  >
                    <Calendar size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate leading-tight">
                      Calendário Geral
                    </p>
                    <p
                      style={{ color: t.textSoft }}
                      className="text-[10px] truncate mt-0.5"
                    >
                      UERJ, Pets, Finanças & Rotina
                    </p>
                  </div>
                </button>
              </div>
            </nav>
          </div>

          <div className="space-y-2.5 pt-4 border-t" style={{ borderColor: t.border }}>
            <PWAInstallButton t={t} />

            <div
              className="grid grid-cols-3 gap-1 p-1 rounded-xl"
              style={{ backgroundColor: t.cardSubtle }}
            >
              {(["light", "dark", "survival"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setThemeMode(mode)}
                  style={{
                    backgroundColor: themeMode === mode ? t.card : "transparent",
                    color: themeMode === mode ? t.primary : t.textSoft,
                  }}
                  className="py-1.5 rounded-lg text-[10px] font-bold capitalize cursor-pointer"
                >
                  {mode === "light" ? "Claro" : mode === "dark" ? "Escuro" : "SOS"}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ÁREA PRINCIPAL DE CONTEÚDO */}
        <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-10">
          {!isOnline && (
            <div
              style={{ backgroundColor: t.finance, color: "#fff" }}
              className="px-4 py-1.5 text-xs font-bold flex items-center justify-center gap-2 text-center shadow-xs"
            >
              <WifiOff size={13} />
              <span>
                Modo 100% Offline Ativo — Todos os registros estão sendo salvos no IndexedDB local e serão sincronizados com o Google Drive assim que a conexão retornar.
              </span>
            </div>
          )}

          <header
            style={{ backgroundColor: `${t.bg}E6`, borderColor: t.border }}
            className="sticky top-0 z-20 backdrop-blur-md border-b px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 flex-wrap"
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setDrawerOpen(true)}
                style={{ backgroundColor: t.card, borderColor: t.border }}
                className="p-2 rounded-xl border lg:hidden shrink-0 cursor-pointer"
                aria-label="Abrir Menu Lateral e Segundo Cérebro"
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <h2
                  className="text-base sm:text-lg font-bold tracking-tight truncate"
                  style={{ color: t.text }}
                >
                  {tituloAbaAtiva}
                </h2>
                <p style={{ color: t.textSoft }} className="text-[11px] truncate capitalize">
                  {new Date().toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  }).replace(".", "")}{" "}
                  · Prontidão {prontidaoInfo.scoreTotal}% · Livre R${" "}
                  {dinheiroLivreInfo.livreHoje.toFixed(0)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <NetworkAndSyncBadges
                t={t}
                isOnline={isOnline}
                syncStatus={syncMeta.syncStatus}
                googleUser={googleUser && !needsAuth ? googleUser : null}
                hasConflictOrConfirm={!!pendingConfirmation}
                onClickOpenSync={() => setSyncModalOpen(true)}
              />

              <PWAInstallButton t={t} compact />

              <button
                onClick={() =>
                  setActiveTab(
                    activeTab === "governanta_lala"
                      ? "inicio"
                      : "governanta_lala"
                  )
                }
                style={{
                  backgroundColor:
                    activeTab === "governanta_lala" ? t.primary : t.card,
                  color: activeTab === "governanta_lala" ? "#fff" : t.primary,
                  borderColor:
                    activeTab === "governanta_lala" ? t.primary : `${t.primary}45`,
                }}
                className="px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                title="Abrir Bate-Papo com a Lala"
              >
                <Sparkles size={13} />
                <span>Lala</span>
              </button>

              <button
                onClick={() =>
                  setActiveTab(
                    activeTab === "calendario" ? "inicio" : "calendario"
                  )
                }
                style={{
                  backgroundColor:
                    activeTab === "calendario" ? t.action : t.card,
                  color: activeTab === "calendario" ? "#fff" : t.text,
                  borderColor: t.border,
                }}
                className="px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                title="Abrir Calendário Mensal e Semanal"
              >
                <Calendar size={14} />
                <span className="hidden sm:inline">Calendário</span>
              </button>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
            {activeTab !== "governanta_lala" && !demoLimpo && !perfilCalibrado.calibrado && (
              <div
                style={{
                  backgroundColor: `${t.primary}14`,
                  borderColor: `${t.primary}40`,
                }}
                className="mb-5 p-4 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    style={{ backgroundColor: t.primary, color: "#fff" }}
                    className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
                  >
                    <Sparkles size={17} />
                  </div>
                  <div>
                    <p
                      className="text-xs sm:text-sm font-bold"
                      style={{ color: t.text }}
                    >
                      O app está com dados de demonstração — limpe com 1 clique ou converse com a Lala!
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: t.textSoft }}
                    >
                      Toda a configuração é feita conversando com a Lala (por voz, texto ou prints/arquivos). Assim que preencher seus dados, este aviso some automaticamente.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={() => limparDadosDeExemplo(false)}
                    style={{
                      backgroundColor: `${t.danger}15`,
                      color: t.danger,
                      borderColor: `${t.danger}40`,
                    }}
                    className="px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                  >
                    <Trash2 size={13} />
                    Zerar Dados de Exemplo
                  </button>
                  <button
                    onClick={() => setActiveTab("governanta_lala")}
                    style={{ backgroundColor: t.primary, color: "#fff" }}
                    className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles size={13} />
                    Bate-Papo com a Lala
                  </button>
                </div>
              </div>
            )}

            {activeTab === "inicio" && (
              <HomeScreen
                t={t}
                survivalMode={themeMode === "survival"}
                prioridades={prioridades}
                todasTarefas={tarefas}
                setTarefas={setTarefas}
                toggleFeito={toggleFeito}
                promoverP1={promoverP1}
                moverTarefaHorizonte={moverTarefaHorizonte}
                agendarTarefaNoHorario={agendarTarefaNoHorario}
                habitos={habitos}
                setHabitos={setHabitos}
                toggleHabitoHoje={toggleHabitoHoje}
                adicionarHabito={adicionarHabito}
                compromissos={compromissos}
                setCompromissos={setCompromissos}
                radarItens={radarItens}
                enviarEtapaRadarParaHoje={enviarEtapaRadarParaHoje}
                metas={metas}
                setMetas={setMetas}
                dinheiroLivreInfo={dinheiroLivreInfo}
                checkin={checkin}
                volumeSemana={volumeSemana}
                ultimoSRPE={ultimoSRPE}
                petsPerfil={petsPerfil}
                alimentarPet={alimentarPet}
                openCard={(p) => setBottomSheet(p)}
                irParaAba={setActiveTab}
                iniciarFocoNaTarefa={(task) => {
                  setFocoAtivoTask(task);
                  setSegundosFocoRestantes((task.duracaoMin ?? 25) * 60);
                  setFocoRodando(true);
                }}
                focoAtivoTask={focoAtivoTask}
                segundosFocoRestantes={segundosFocoRestantes}
                focoRodando={focoRodando}
                setFocoRodando={setFocoRodando}
                encerrarFoco={() => {
                  setFocoRodando(false);
                  setFocoAtivoTask(null);
                }}
                showToast={showToast}
              />
            )}

            {activeTab === "governanta_lala" && (
              <AbaGovernantaLala
                t={t}
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                interacoes={interacoesLala}
                setInteracoes={setInteracoesLala}
                tarefas={tarefas}
                setTarefas={setTarefas}
                petsPerfil={petsPerfil}
                alimentarPet={alimentarPet}
                adicionarLancamento={adicionarLancamento}
                registrarSRPEHoje={registrarSRPEHoje}
                setRepositorio={setRepositorio}
                dinheiroLivreHoje={dinheiroLivreInfo.livreHoje}
                prontidaoScore={prontidaoInfo.scoreTotal}
                checkin={checkin}
                disciplinas={disciplinas}
                projetos={projetos}
                contas={contas}
                cartoes={cartoes}
                perfilCalibrado={perfilCalibrado}
                setPerfilUsuario={setPerfilCalibrado}
                executarAcaoDaLala={executarAcaoDaLala}
                irParaAba={setActiveTab}
                showToast={showToast}
              />
            )}

            {activeTab === "calendario" && (
              <AbaCalendario
                t={t}
                compromissos={compromissos}
                setCompromissos={setCompromissos}
                disciplinas={disciplinas}
                setDisciplinas={setDisciplinas}
                petsPerfil={petsPerfil}
                lancamentos={lancamentos}
                cartoes={cartoes}
                radarItens={radarItens}
                openCard={(p) => setBottomSheet(p)}
                showToast={showToast}
                configCalendario={configCalendario}
                setConfigCalendario={setConfigCalendario}
                googleConnected={!!googleUser && !needsAuth}
                onConnectGoogle={handleGoogleLoginClick}
              />
            )}

            {activeTab === "estudos_trabalho" && (
              <EstudosTrabalhoScreen
                t={t}
                openCard={(p) => setBottomSheet(p)}
                disciplinas={disciplinas}
                setDisciplinas={setDisciplinas}
                artigos={artigos}
                setArtigos={setArtigos}
                livros={livros}
                setLivros={setLivros}
                streakLeitura={streakLeitura}
                projetos={projetos}
                setProjetos={setProjetos}
                enviarProjetoParaPrioridades={enviarProjetoParaPrioridades}
                abrirCalibracao={() => setActiveTab("governanta_lala")}
              />
            )}

            {activeTab === "casa_rotinas" && (
              <CasaPetsScreen
                t={t}
                openCard={(p) => setBottomSheet(p)}
                comodos={comodos}
                setComodos={setComodos}
                estoqueCasa={estoqueCasa}
                setEstoqueCasa={setEstoqueCasa}
                ajustarItemEstoqueCasa={ajustarItemEstoqueCasa}
                listaCompras={listaCompras}
                setListaCompras={setListaCompras}
                comprarItemDaListaEReporEstoque={
                  comprarItemDaListaEReporEstoque
                }
                enviarRotinaParaHoje={enviarRotinaParaHoje}
                petsPerfil={petsPerfil}
                setPetsPerfil={setPetsPerfil}
                alimentarPet={alimentarPet}
                registrarCompraSaches={registrarCompraSaches}
                showToast={showToast}
              />
            )}

            {activeTab === "saude_pets" && (
              <SaudePetsScreen
                t={t}
                fichasTreino={fichasTreino}
                setFichasTreino={setFichasTreino}
                iniciarTreinoAoVivo={(ficha) => setFichaTreinoAoVivo(ficha)}
                refeicoes={refeicoes}
                setRefeicoes={setRefeicoes}
                ultimoSRPE={ultimoSRPE}
                registrarSRPEHoje={registrarSRPEHoje}
                volumeSemana={volumeSemana}
                streakTreino={streakTreino}
                checkin={checkin}
                setCheckin={setCheckin}
                openCard={(p) => setBottomSheet(p)}
                abrirCalibracao={() => setActiveTab("governanta_lala")}
                gerarListaComprasDaDieta={() => {
                  const textoDieta = refeicoes
                    .map((r) => `${r.nome} ${r.descricao}`)
                    .join(" ");
                  const itens = extrairIngredientesParaListaCompras(textoDieta);
                  const novos = itens.map((c, idx) => ({
                    id: Date.now() + idx,
                    ...c,
                    comprado: false,
                  }));
                  setListaCompras((prev) => {
                    const existentes = new Set(
                      prev.map((p) => p.nome.toLowerCase())
                    );
                    const unicos = novos.filter(
                      (n) => !existentes.has(n.nome.toLowerCase())
                    );
                    return [...unicos, ...prev];
                  });
                  showToast(
                    `Lala enviou ${novos.length} ingredientes da sua Dieta para a Lista de Compras!`
                  );
                }}
              />
            )}

            {activeTab === "financas" && (
              <FinancasScreen
                t={t}
                mesSelecionado={mesSelecionado}
                setMesSelecionado={setMesSelecionado}
                contas={contas}
                setContas={setContas}
                cartoes={cartoes}
                setCartoes={setCartoes}
                orcamentos={orcamentos}
                setOrcamentos={setOrcamentos}
                lancamentos={lancamentos}
                setLancamentos={setLancamentos}
                adicionarLancamento={adicionarLancamento}
                dinheiroLivreInfo={dinheiroLivreInfo}
              />
            )}
          </main>
        </div>
      </div>

      {/* BOTÃO FLUTUANTE UNIFICADO DA LALA (OCULTO QUANDO JÁ ESTÁ NA ABA DA LALA) */}
      {activeTab !== "governanta_lala" && (
        <button
          onClick={() => setBrainModalOpen(true)}
          style={{
            background: `linear-gradient(135deg, ${t.primary}, ${t.action})`,
            color: "#fff",
          }}
          className="fixed bottom-20 right-4 lg:bottom-8 lg:right-8 z-40 h-14 px-5 rounded-full shadow-xl flex items-center gap-2.5 font-bold text-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer select-none"
          aria-label="Falar com a Lala — Entrada rápida por voz ou texto"
          title="Bate-Papo Rápido com a Lala"
        >
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <Mic size={16} />
          </div>
          <span>Lala</span>
        </button>
      )}

      {/* BARRA DE NAVEGAÇÃO MOBILE (EXATAMENTE 5 ÍCONES ERGONÔMICOS) */}
      <nav
        style={{ backgroundColor: t.card, borderColor: t.border }}
        className="lg:hidden fixed bottom-0 inset-x-0 border-t z-30 px-2 py-1.5 grid grid-cols-5 gap-1 select-none"
      >
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl relative cursor-pointer transition-colors"
              style={{
                color: isActive ? t.primary : t.textSoft,
                backgroundColor: isActive ? `${t.primary}14` : "transparent",
              }}
            >
              <Icon size={18} strokeWidth={isActive ? 2.4 : 1.9} />
              <span className="text-[10px] font-bold truncate max-w-full">
                {tab.shortLabel}
              </span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  style={{ backgroundColor: t.primary }}
                  className="absolute top-1 right-3 w-1.5 h-1.5 rounded-full"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* MODAIS E BOTTOM SHEET */}
      {bottomSheet && (
        <BottomSheet
          t={t}
          payload={bottomSheet}
          onClose={() => setBottomSheet(null)}
          disciplinas={disciplinas}
          setDisciplinas={setDisciplinas}
          artigos={artigos}
          setArtigos={setArtigos}
          livros={livros}
          setLivros={setLivros}
          streakLeitura={streakLeitura}
          setStreakLeitura={setStreakLeitura}
          petsPerfil={petsPerfil}
          alimentarPet={alimentarPet}
          registrarCompraSaches={registrarCompraSaches}
          atualizarPet={(petAtualizado) =>
            setPetsPerfil((prev) =>
              prev.map((p) => (p.id === petAtualizado.id ? petAtualizado : p))
            )
          }
          projetos={projetos}
          setProjetos={setProjetos}
          tarefas={tarefas}
          setTarefas={setTarefas}
          promoverP1={promoverP1}
          adiarPraAmanha={adiarPraAmanha}
          agendarTarefaNoHorario={(id, hora, diaMes) =>
            agendarTarefaNoHorario(id, hora, undefined, diaMes)
          }
          compromissos={compromissos}
          setCompromissos={setCompromissos}
          lancamentos={lancamentos}
          checkin={checkin}
          setCheckin={setCheckin}
          volumeSemana={volumeSemana}
          ultimoSRPE={ultimoSRPE}
          radarItens={radarItens}
          setRadarItens={setRadarItens}
          enviarEtapaRadarParaHoje={enviarEtapaRadarParaHoje}
          comodos={comodos}
          setComodos={setComodos}
        />
      )}

      {fichaTreinoAoVivo && (
        <LiveWorkoutModal
          t={t}
          ficha={fichaTreinoAoVivo}
          onClose={() => setFichaTreinoAoVivo(null)}
          onUpdateFicha={(f) =>
            setFichasTreino((prev) => prev.map((x) => (x.id === f.id ? f : x)))
          }
          onFinishWorkout={(fichaAtualizada, srpeFinal, duracaoMin) => {
            setFichasTreino((prev) =>
              prev.map((f) =>
                f.id === fichaAtualizada.id
                  ? {
                      ...fichaAtualizada,
                      ultimaRealizacao: `Hoje (${duracaoMin}m)`,
                    }
                  : f
              )
            );
            registrarSRPEHoje(srpeFinal);
            setStreakTreino((s) => s + 1);
            setFichaTreinoAoVivo(null);
          }}
        />
      )}

      <SmartBrainModal
        t={t}
        open={brainModalOpen}
        onClose={() => setBrainModalOpen(false)}
        adicionarLancamento={adicionarLancamento}
        tarefas={tarefas}
        setTarefas={setTarefas}
        alimentarPet={alimentarPet}
        registrarSRPEHoje={registrarSRPEHoje}
        setRepositorio={setRepositorio}
        interacoesLala={interacoesLala}
        setInteracoesLala={setInteracoesLala}
        petsPerfil={petsPerfil}
        dinheiroLivreHoje={dinheiroLivreInfo.livreHoje}
        prontidaoScore={prontidaoInfo.scoreTotal}
        checkin={checkin}
        disciplinas={disciplinas}
        projetos={projetos}
        perfilCalibrado={perfilCalibrado}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        irParaLalaCompleta={() => setActiveTab("governanta_lala")}
        irParaAba={setActiveTab}
        executarAcaoDaLala={executarAcaoDaLala}
        showToast={showToast}
      />

      <SideDrawer
        t={t}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openPlanilha={() => {
          setDrawerOpen(false);
          setBottomSheet({ tipo: "planilha" });
        }}
        repositorio={repositorio}
        setRepositorio={setRepositorio}
        compromissos={compromissos}
        setCompromissos={setCompromissos}
        onInterpretarArquivoComLala={handleEnviarAnexoParaLalaGlobal}
        showToast={showToast}
      />

      <CloudSyncModal
        t={t}
        open={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        isOnline={isOnline}
        syncMeta={syncMeta}
        googleUser={googleUser}
        needsAuth={needsAuth}
        isLoggingIn={isLoggingIn}
        onGoogleLogin={handleGoogleLoginClick}
        onCustomGISLogin={handleCustomGISLoginClick}
        onLogout={handleLogoutClick}
        onTriggerSyncCheck={() => handleSyncCheckWithDrive(false)}
        onForcePushToDrive={handleForcePushRequest}
        onForcePullFromDrive={handleForcePullRequest}
        pendingConfirmation={pendingConfirmation}
        onConfirmOverwriteDrive={handleConfirmOverwriteDrive}
        onConfirmRestoreFromDrive={handleConfirmRestoreFromDrive}
        onCancelConfirmation={() => setPendingConfirmation(null)}
        useAppDataFolder={useAppDataFolder}
        setUseAppDataFolder={setUseAppDataFolder}
      />

      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg border border-gray-700 animate-in fade-in slide-in-from-top-2">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
