import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  GraduationCap,
  PawPrint,
  Wallet,
  Sparkles,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  Briefcase,
  HeartPulse,
  Cloud,
  Trash2,
  ExternalLink,
  UploadCloud,
  ShieldAlert,
  X,
  LayoutGrid,
  Columns,
  ListFilter,
  CalendarDays,
} from "lucide-react";
import {
  BottomSheetPayload,
  CartaoCredito,
  ColorTokenKey,
  Compromisso,
  ConfiguracaoCalendarioApp,
  Disciplina,
  ItemRadar,
  LancamentoFinanceiro,
  PetPerfil,
  RecorrenciaCompromisso,
  ThemeTokens,
} from "../../types/lala";
import {
  CategoriaCalendarioApp,
  criarEventoGoogleCalendar,
  atualizarEventoGoogleCalendar,
  excluirEventoGoogleCalendar,
  GoogleCalendarEventMapped,
  listarEventosGoogleCalendarMes,
  NovoEventoGoogleInput,
  CustomCalendarSource,
  getCustomCalendars,
  addCustomCalendar,
  toggleCustomCalendar,
  removeCustomCalendar,
} from "../../services/googleCalendarSync";
import {
  getAccessToken,
  getConnectedGoogleAccounts,
  connectAdditionalGoogleAccount,
  toggleConnectedGoogleAccount,
  removeConnectedGoogleAccount,
  ConnectedGoogleAccount,
} from "../../services/googleDriveSync";

export type CategoriaEventoCalendario = "todas" | CategoriaCalendarioApp;

export interface EventoCalendarioUnificado {
  id: string;
  diaMes: number;
  mes: number;
  ano: number;
  horario: string;
  horaFim?: string;
  duracaoMin: number;
  titulo: string;
  subtitulo: string;
  descricao?: string;
  local?: string;
  categoria: CategoriaCalendarioApp;
  cor: ColorTokenKey;
  corCustomHex?: string;
  concluido?: boolean;
  ehTarefa?: boolean;
  ehRecorrente?: boolean;
  recorrencia?: RecorrenciaCompromisso;
  recorrenciaSerieId?: string;
  disciplinaId?: number;
  origem: "app" | "gcal" | "modulo";
  gcalId?: string;
  calendarId?: string;
  contaEmail?: string;
  nomeCalendario?: string;
  htmlLink?: string;
  compromissoId?: number;
  payloadSheet?: BottomSheetPayload;
}

export type EscopoAlteracaoRecorrencia = "este" | "seguintes" | "todos";

interface ConfirmacaoRecorrenciaModalState {
  evento: EventoCalendarioUnificado;
  tipoOperacao: "mover" | "editar" | "excluir";
  resumoAlteracao: string;
  onEscolherEscopo: (escopo: EscopoAlteracaoRecorrencia) => void;
}

interface ConfirmacaoGoogleCalendarModalState {
  tipo: "criar" | "excluir" | "exportar_lote";
  tituloModal: string;
  descricaoModal: string;
  itensAfetados: string[];
  onConfirmar: () => Promise<void>;
}

interface AbaCalendarioProps {
  t: ThemeTokens;
  compromissos: Compromisso[];
  setCompromissos: React.Dispatch<React.SetStateAction<Compromisso[]>>;
  disciplinas: Disciplina[];
  setDisciplinas?: React.Dispatch<React.SetStateAction<Disciplina[]>>;
  petsPerfil: PetPerfil[];
  lancamentos: LancamentoFinanceiro[];
  cartoes: CartaoCredito[];
  radarItens: ItemRadar[];
  configCalendario: ConfiguracaoCalendarioApp;
  setConfigCalendario: React.Dispatch<
    React.SetStateAction<ConfiguracaoCalendarioApp>
  >;
  googleConnected: boolean;
  onConnectGoogle: () => Promise<void>;
  openCard: (payload: BottomSheetPayload) => void;
  showToast: (msg: string) => void;
}

const DIAS_SEMANA_CURTO = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const NOMES_MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const PALETA_CORES_SUGERIDAS = [
  "#2E6F5E",
  "#4F46E5",
  "#D97706",
  "#0284C7",
  "#E11D48",
  "#7C3AED",
  "#059669",
  "#EA580C",
  "#DB2777",
  "#475569",
];

function formatDataIso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function AbaCalendario({
  t,
  compromissos,
  setCompromissos,
  disciplinas,
  setDisciplinas,
  petsPerfil,
  lancamentos,
  cartoes,
  radarItens,
  configCalendario,
  setConfigCalendario,
  googleConnected,
  onConnectGoogle,
  openCard,
  showToast,
}: AbaCalendarioProps) {
  const hojeReal = useMemo(() => new Date(), []);
  const [anoAtivo, setAnoAtivo] = useState<number>(hojeReal.getFullYear());
  const [mesAtivo, setMesAtivo] = useState<number>(hojeReal.getMonth() + 1); // 1..12
  const [diaSelecionado, setDiaSelecionado] = useState<number>(
    hojeReal.getDate()
  );

  const [visao, setVisao] = useState<"dia" | "semana" | "mes" | "programacao">(
    configCalendario.visaoPadrao || "mes"
  );
  const [filtroCategoria, setFiltroCategoria] =
    useState<CategoriaEventoCalendario>("todas");
  const [painelConfigAberto, setPainelConfigAberto] = useState<boolean>(false);

  // Estado de sincronização com Google Calendar (com cache local para funcionar 100% offline)
  const [eventosGoogle, setEventosGoogle] = useState<
    GoogleCalendarEventMapped[]
  >(() => {
    try {
      const raw = localStorage.getItem("casa_lala_gcal_events_cache_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        "casa_lala_gcal_events_cache_v1",
        JSON.stringify(eventosGoogle)
      );
    } catch {
      // ignore
    }
  }, [eventosGoogle]);
  const [sincronizandoGCal, setSincronizandoGCal] = useState<boolean>(false);
  const [ultimaSyncGCal, setUltimaSyncGCal] = useState<string | null>(null);
  const [confirmacaoGCal, setConfirmacaoGCal] =
    useState<ConfirmacaoGoogleCalendarModalState | null>(null);
  const [executandoConfirmacao, setExecutandoConfirmacao] =
    useState<boolean>(false);

  // Confirmação ao alterar / mover / excluir evento recorrente ("este", "seguintes", "todos")
  const [confirmacaoRecorrencia, setConfirmacaoRecorrencia] =
    useState<ConfirmacaoRecorrenciaModalState | null>(null);

  // Estado para Drag and Drop em todas as visões (Mês, Semana, Dia)
  const [eventoArrastando, setEventoArrastando] =
    useState<EventoCalendarioUnificado | null>(null);
  const [dropTargetDia, setDropTargetDia] = useState<number | null>(null);
  const [dropTargetHora, setDropTargetHora] = useState<string | null>(null);

  // Arraste vertical interativo (Mouse/Touch) na régua diária de 15 em 15 min
  const [dragVerticalDia, setDragVerticalDia] = useState<{
    ev: EventoCalendarioUnificado;
    startY: number;
    origMin: number;
    previewMin: number;
    moved: boolean;
  } | null>(null);

  // Formulário rápido para novo evento no dia selecionado e Modal Nativo estilo Google Agenda
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaHora, setNovaHora] = useState("14:00");
  const [novaDuracao, setNovaDuracao] = useState(60);
  const [novoLocal, setNovoLocal] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novaCat, setNovaCat] = useState<CategoriaCalendarioApp>("pessoal");
  const [novaRecorrencia, setNovaRecorrencia] =
    useState<RecorrenciaCompromisso>("nenhuma");
  const [novaRecorrenciaAte, setNovaRecorrenciaAte] = useState<string>("");
  const [enviarNovoParaGoogle, setEnviarNovoParaGoogle] = useState<boolean>(
    configCalendario.sincronizarAoCriarNoGoogle
  );

  // Contas Google conectadas (múltiplos e-mails) e agendas extras por ID/e-mail
  const [contasGoogle, setContasGoogle] = useState<ConnectedGoogleAccount[]>(
    () => getConnectedGoogleAccounts()
  );
  const [calendariosExtras, setCalendariosExtras] = useState<
    CustomCalendarSource[]
  >(() => getCustomCalendars());
  const [painelContasAberto, setPainelContasAberto] = useState<boolean>(false);
  const [novoCalIdInput, setNovoCalIdInput] = useState("");
  const [novoCalNomeInput, setNovoCalNomeInput] = useState("");
  const [novoCalCorInput, setNovoCalCorInput] = useState("#0284C7");
  const [contaDestinoCriacao, setContaDestinoCriacao] = useState<string>("");
  const [filtroContaEmail, setFiltroContaEmail] = useState<string>("todas");

  // Modal interativo estilo Google Agenda ao clicar em qualquer dia/horário
  const [modalCriacaoAberto, setModalCriacaoAberto] = useState<boolean>(false);
  const [tipoItemModal, setTipoItemModal] = useState<"evento" | "tarefa">(
    "evento"
  );
  const [diaInteiroModal, setDiaInteiroModal] = useState<boolean>(false);
  const [eventoEditando, setEventoEditando] =
    useState<EventoCalendarioUnificado | null>(null);

  const diasNoMesCount = useMemo(
    () => new Date(anoAtivo, mesAtivo, 0).getDate(),
    [anoAtivo, mesAtivo]
  );

  // Offset do dia 1 do mês na grade Seg..Dom (0 = Seg, ..., 6 = Dom)
  const offsetInicioMes = useMemo(() => {
    const jsDay = new Date(anoAtivo, mesAtivo - 1, 1).getDay(); // 0=Dom..6=Sab
    return jsDay === 0 ? 6 : jsDay - 1;
  }, [anoAtivo, mesAtivo]);

  const diasNoMesArray = useMemo(
    () => Array.from({ length: diasNoMesCount }, (_, i) => i + 1),
    [diasNoMesCount]
  );

  // Carrega eventos do Google Calendar para o mês ativo (todas as contas conectadas + agendas extras)
  const sincronizarEventosDoMesGoogle = useCallback(
    async (silencioso = false) => {
      const contasAtuais = getConnectedGoogleAccounts();
      setContasGoogle(contasAtuais);
      setCalendariosExtras(getCustomCalendars());

      const token = await getAccessToken();
      if (!token && contasAtuais.length === 0) {
        if (!silencioso) {
          await onConnectGoogle();
          setContasGoogle(getConnectedGoogleAccounts());
        }
        return;
      }

      setSincronizandoGCal(true);
      try {
        const lista = await listarEventosGoogleCalendarMes(anoAtivo, mesAtivo);
        setEventosGoogle(lista);
        setContasGoogle(getConnectedGoogleAccounts());
        setUltimaSyncGCal(
          new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
        if (!silencioso) {
          const totalContas = Math.max(1, getConnectedGoogleAccounts().filter((a) => a.active).length);
          showToast(
            `Google Agenda sincronizado: ${lista.length} evento(s) de ${totalContas} conta(s) em ${
              NOMES_MESES[mesAtivo - 1]
            }!`
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === "NETWORK_INSTABILITY") {
          if (!silencioso) {
            showToast(
              "Conexão instável no momento. Exibindo sua agenda salva localmente."
            );
          }
          return;
        }
        if (!silencioso) {
          if (msg === "AUTH_REQUIRED" || msg === "SCOPE_REQUIRED") {
            try {
              await onConnectGoogle();
              const listaRetry = await listarEventosGoogleCalendarMes(
                anoAtivo,
                mesAtivo
              );
              setEventosGoogle(listaRetry);
              setContasGoogle(getConnectedGoogleAccounts());
              setUltimaSyncGCal(
                new Date().toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              );
              return;
            } catch {
              // ignore if user closed popup
              return;
            }
          }
          showToast(
            err instanceof Error
              ? err.message
              : "Não foi possível sincronizar o Google Agenda."
          );
        }
      } finally {
        setSincronizandoGCal(false);
      }
    },
    [anoAtivo, mesAtivo, onConnectGoogle, showToast]
  );

  // Sincroniza ao abrir a aba ou trocar mês/ano, mesmo se já houver token em sessão
  useEffect(() => {
    if (configCalendario.mostrarGoogleAgenda) {
      const hasAnyToken =
        googleConnected || getConnectedGoogleAccounts().length > 0;
      if (hasAnyToken) {
        sincronizarEventosDoMesGoogle(true);
      }
    }
  }, [
    googleConnected,
    anoAtivo,
    mesAtivo,
    configCalendario.mostrarGoogleAgenda,
    sincronizarEventosDoMesGoogle,
  ]);

  // Extrai dia e mês de strings como "29/09", "Dia 28", "15/10", etc.
  const extrairDiaMesTexto = (
    textoData: string,
    fallbackDia: number
  ): { dia: number; mes: number } => {
    const matchBarra = textoData.match(/(\d{1,2})\/(\d{1,2})/);
    if (matchBarra) {
      const d = parseInt(matchBarra[1], 10);
      const m = parseInt(matchBarra[2], 10);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        return { dia: d, mes: m };
      }
    }
    const matchDia = textoData.match(/(\d{1,2})/);
    if (matchDia) {
      const d = parseInt(matchDia[1], 10);
      if (d >= 1 && d <= 31) return { dia: d, mes: mesAtivo };
    }
    return { dia: Math.min(diasNoMesCount, fallbackDia), mes: mesAtivo };
  };

  const calcularHoraFim = (horaInicio: string, duracaoMin: number): string => {
    const [hh, mm] = (horaInicio || "09:00").split(":").map(Number);
    const totalMin = (hh || 0) * 60 + (mm || 0) + (duracaoMin || 60);
    const fimH = Math.floor(totalMin / 60) % 24;
    const fimM = totalMin % 60;
    return `${String(fimH).padStart(2, "0")}:${String(fimM).padStart(2, "0")}`;
  };

  const calcularDuracaoEntreHoras = (
    horaInicio?: string,
    horaFim?: string,
    fallback = 60
  ): number => {
    if (!horaInicio || !horaFim) return fallback;
    const [h1, m1] = horaInicio.split(":").map(Number);
    const [h2, m2] = horaFim.split(":").map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return fallback;
    const diff = h2 * 60 + m2 - (h1 * 60 + m1);
    return diff > 0 ? diff : fallback;
  };

  // Detecta se um título ou série possui múltiplas ocorrências para saber se é recorrente
  const titulosRepetidosMap = useMemo(() => {
    const counts = new Map<string, number>();
    compromissos.forEach((c) => {
      const k = c.recorrenciaSerieId || c.titulo.trim().toLowerCase();
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return counts;
  }, [compromissos]);

  // Consolida todos os eventos do App + Módulos + Google Agenda para o mês/ano ativo
  const todosEventosMes = useMemo<EventoCalendarioUnificado[]>(() => {
    const lista: EventoCalendarioUnificado[] = [];
    const gcalIdsJaNosCompromissos = new Set<string>();

    // 1. Compromissos nativos do App (incluindo projeção de eventos recorrentes diários/semanais/mensais)
    compromissos.forEach((c) => {
      const mesComp =
        c.mes === undefined
          ? mesAtivo
          : c.mes === 0
          ? 1
          : c.mes;
      const anoComp = c.ano ?? anoAtivo;
      const rec = c.recorrencia || "nenhuma";
      const serieKey = c.recorrenciaSerieId || c.titulo.trim().toLowerCase();
      const repetePorMultiplos = (titulosRepetidosMap.get(serieKey) || 0) > 1;
      const ehRecorrente = rec !== "nenhuma" || Boolean(c.recorrenciaSerieId) || repetePorMultiplos;

      if (c.gcalEventId) {
        gcalIdsJaNosCompromissos.add(c.gcalEventId);
      }

      const catMap: CategoriaCalendarioApp =
        c.categoriaCalendario ||
        (c.aba === "estudos_trabalho"
          ? c.titulo.toLowerCase().includes("cdt") ||
            c.titulo.toLowerCase().includes("rcr") ||
            c.titulo.toLowerCase().includes("reunião")
            ? "trabalho"
            : "uerj"
          : c.aba === "financas"
          ? "financas"
          : c.aba === "saude_pets"
          ? "saude"
          : c.titulo.toLowerCase().includes("nina") ||
            c.titulo.toLowerCase().includes("tobias") ||
            c.titulo.toLowerCase().includes("sachê") ||
            c.titulo.toLowerCase().includes("vet")
          ? "pets"
          : "pessoal");

      const dataInicioIso = formatDataIso(
        anoComp,
        mesComp,
        Math.min(31, Math.max(1, c.diaMes))
      );
      const excluidas = new Set(c.datasExcluidasRecorrencia || []);

      if (rec === "nenhuma") {
        if (mesComp !== mesAtivo || anoComp !== anoAtivo) return;
        const diaReal = Math.min(diasNoMesCount, Math.max(1, c.diaMes));
        const dataIso = formatDataIso(anoAtivo, mesAtivo, diaReal);
        if (excluidas.has(dataIso)) return;

        lista.push({
          id: `comp-${c.id}-${diaReal}`,
          compromissoId: c.id,
          diaMes: diaReal,
          mes: mesComp,
          ano: anoComp,
          horario: c.hora,
          horaFim: calcularHoraFim(c.hora, c.duracaoMin),
          duracaoMin: c.duracaoMin || 60,
          titulo: c.titulo,
          subtitulo: `${c.duracaoMin} min · ${c.local || "Agenda Casa da Lala"}`,
          local: c.local,
          categoria: catMap,
          cor: c.cor,
          concluido: c.concluido,
          ehTarefa: c.titulo.startsWith("[Tarefa]") || c.titulo.startsWith("☑"),
          ehRecorrente,
          recorrencia: rec,
          recorrenciaSerieId: c.recorrenciaSerieId,
          origem: c.gcalEventId ? "gcal" : "app",
          gcalId: c.gcalEventId,
          payloadSheet: { tipo: "compromisso", id: c.id },
        });
      } else {
        // Projeta ocorrências da recorrência ("diaria", "semanal", "mensal") nos dias do mês ativo
        const jsDayOriginal = new Date(anoComp, mesComp - 1, c.diaMes).getDay();
        const diaSemanaOriginal = jsDayOriginal === 0 ? 6 : jsDayOriginal - 1;

        diasNoMesArray.forEach((dia) => {
          const dataIso = formatDataIso(anoAtivo, mesAtivo, dia);
          if (dataIso < dataInicioIso) return;
          if (c.recorrenciaAteData && dataIso > c.recorrenciaAteData) return;
          if (excluidas.has(dataIso)) return;

          const diaSemanaAtual = (dia + offsetInicioMes - 1) % 7;
          const bateRecorrencia =
            rec === "diaria" ||
            (rec === "semanal" &&
              diaSemanaAtual === (c.diaSemanaIdx ?? diaSemanaOriginal)) ||
            (rec === "mensal" && dia === Math.min(diasNoMesCount, c.diaMes));

          if (!bateRecorrencia) return;

          const labelRec =
            rec === "diaria"
              ? "Repete todo dia"
              : rec === "semanal"
              ? "Repete toda semana"
              : "Repete todo mês";

          lista.push({
            id: `comp-${c.id}-rec-${dia}`,
            compromissoId: c.id,
            diaMes: dia,
            mes: mesAtivo,
            ano: anoAtivo,
            horario: c.hora,
            horaFim: calcularHoraFim(c.hora, c.duracaoMin),
            duracaoMin: c.duracaoMin || 60,
            titulo: c.titulo,
            subtitulo: `${c.duracaoMin} min · ${labelRec} · ${
              c.local || "Agenda Casa da Lala"
            }`,
            local: c.local,
            categoria: catMap,
            cor: c.cor,
            concluido: c.concluido,
            ehTarefa:
              c.titulo.startsWith("[Tarefa]") || c.titulo.startsWith("☑"),
            ehRecorrente: true,
            recorrencia: rec,
            recorrenciaSerieId: c.recorrenciaSerieId || `serie-${c.id}`,
            origem: c.gcalEventId ? "gcal" : "app",
            gcalId: c.gcalEventId,
            payloadSheet: { tipo: "compromisso", id: c.id },
          });
        });
      }
    });

    // 2. Eventos vindos diretamente do Google Agenda (de todas as contas e agendas conectadas)
    if (configCalendario.mostrarGoogleAgenda) {
      eventosGoogle.forEach((eg) => {
        if (eg.ano !== anoAtivo || eg.mes !== mesAtivo) return;
        if (gcalIdsJaNosCompromissos.has(eg.gcalId)) return;

        const labelOrigem = eg.nomeCalendario
          ? eg.nomeCalendario
          : eg.contaEmail
          ? eg.contaEmail
          : "Google Agenda";

        lista.push({
          id: `gcal-${eg.calendarId || "primary"}-${eg.gcalId}`,
          gcalId: eg.gcalId,
          calendarId: eg.calendarId || "primary",
          contaEmail: eg.contaEmail,
          nomeCalendario: labelOrigem,
          corCustomHex: eg.corCalendarioHex,
          diaMes: eg.diaMes,
          mes: eg.mes,
          ano: eg.ano,
          horario: eg.horaInicio,
          horaFim: eg.horaFim,
          duracaoMin:
            eg.duracaoMin ||
            calcularDuracaoEntreHoras(eg.horaInicio, eg.horaFim, 60),
          titulo: eg.titulo,
          descricao: eg.descricao,
          ehTarefa: eg.titulo.startsWith("[Tarefa]") || eg.titulo.startsWith("☑"),
          ehRecorrente: eg.gcalId.includes("_"),
          subtitulo: eg.diaInteiro
            ? `Dia inteiro · ${labelOrigem}${eg.local ? ` · ${eg.local}` : ""}`
            : `${eg.horaInicio}–${eg.horaFim} · ${labelOrigem}${
                eg.local ? ` · ${eg.local}` : ""
              }`,
          local: eg.local,
          categoria: eg.categoriaDetectada,
          cor: "action",
          origem: "gcal",
          htmlLink: eg.htmlLink,
        });
      });
    }

    // 3. Aulas Semanais & Avaliações Acadêmicas
    if (configCalendario.mostrarAulasUERJ) {
      disciplinas.forEach((d, idx) => {
        // Projeta aulas nos dias da semana correspondentes (ex: Seg, Ter, Qua, Qui, Sex)
        const hLower = d.horarioSala.toLowerCase();
        const diasSemanaDisc: number[] = [];
        if (hLower.includes("seg")) diasSemanaDisc.push(0);
        if (hLower.includes("ter")) diasSemanaDisc.push(1);
        if (hLower.includes("qua")) diasSemanaDisc.push(2);
        if (hLower.includes("qui")) diasSemanaDisc.push(3);
        if (hLower.includes("sex")) diasSemanaDisc.push(4);
        if (hLower.includes("sáb") || hLower.includes("sab"))
          diasSemanaDisc.push(5);

        const matchHoraAula = d.horarioSala.match(/(\d{1,2})[:h](\d{2})?/);
        const horaAula = matchHoraAula
          ? `${String(parseInt(matchHoraAula[1], 10)).padStart(2, "0")}:${
              matchHoraAula[2] || "00"
            }`
          : "08:00";

        // Permite excluir dias específicos de aulas se a usuária moveu/excluiu "apenas este evento"
        const datasExcluidasDisc = new Set(
          (d.anotacoes || "")
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.startsWith("EX:"))
            .map((s) => s.replace("EX:", ""))
        );

        if (diasSemanaDisc.length > 0) {
          diasNoMesArray.forEach((dia) => {
            const dataIso = formatDataIso(anoAtivo, mesAtivo, dia);
            if (datasExcluidasDisc.has(dataIso)) return;
            const diaSemana = (dia + offsetInicioMes - 1) % 7;
            if (diasSemanaDisc.includes(diaSemana)) {
              lista.push({
                id: `uerj-aula-${d.id}-dia-${dia}`,
                disciplinaId: d.id,
                diaMes: dia,
                mes: mesAtivo,
                ano: anoAtivo,
                horario: horaAula,
                horaFim: calcularHoraFim(horaAula, 110),
                duracaoMin: 110,
                titulo: `Aula: ${d.nome}`,
                subtitulo: `${d.horarioSala} · ${d.professor} (Repete toda semana)`,
                local: d.horarioSala,
                categoria: "uerj",
                cor: "primary",
                ehRecorrente: true,
                recorrencia: "semanal",
                origem: "modulo",
                payloadSheet: { tipo: "disciplina", id: d.id },
              });
            }
          });
        } else {
          const { dia, mes } = extrairDiaMesTexto(d.prazo, 15 + (idx % 10));
          if (mes === mesAtivo) {
            lista.push({
              id: `uerj-disc-${d.id}`,
              disciplinaId: d.id,
              diaMes: dia,
              mes: mesAtivo,
              ano: anoAtivo,
              horario: horaAula,
              horaFim: calcularHoraFim(horaAula, 110),
              duracaoMin: 110,
              titulo: `Estudos: ${d.nome}`,
              subtitulo: `${d.horarioSala} · Prazo: ${d.prazo}`,
              categoria: "uerj",
              cor: "primary",
              origem: "modulo",
              payloadSheet: { tipo: "disciplina", id: d.id },
            });
          }
        }

        d.avaliacoes.forEach((av) => {
          if (!av.data || av.data.toLowerCase().includes("definir")) return;
          const { dia, mes } = extrairDiaMesTexto(av.data, 25);
          if (mes === mesAtivo) {
            lista.push({
              id: `uerj-av-${d.id}-${av.id}`,
              disciplinaId: d.id,
              diaMes: dia,
              mes: mesAtivo,
              ano: anoAtivo,
              horario: "10:00",
              horaFim: "12:00",
              duracaoMin: 120,
              titulo: `Avaliação ${av.tipo} — ${d.nome}`,
              subtitulo: `Peso ${av.peso} · Data: ${av.data}`,
              categoria: "uerj",
              cor: "alert",
              concluido: av.concluida,
              origem: "modulo",
              payloadSheet: { tipo: "disciplina", id: d.id },
            });
          }
        });
      });
    }

    // 4. Consultas Veterinárias e Vacinas dos Pets
    if (configCalendario.mostrarPets) {
      petsPerfil.forEach((pet, idx) => {
        if (pet.proximaVet) {
          const { dia, mes } = extrairDiaMesTexto(pet.proximaVet, 20 + idx * 2);
          if (mes === mesAtivo) {
            lista.push({
              id: `pet-vet-${pet.id}`,
              diaMes: dia,
              mes: mesAtivo,
              ano: anoAtivo,
              horario: "15:30",
              horaFim: "16:30",
              duracaoMin: 60,
              titulo: `Pet (${pet.nome}): ${pet.proximaVet}`,
              subtitulo: `Estoque: ${pet.estoqueSaches} sachês · Ração ${pet.racao}`,
              categoria: "pets",
              cor: "primary",
              origem: "modulo",
              payloadSheet: { tipo: "pet", id: pet.id },
            });
          }
        }

        pet.cuidados.forEach((cuid) => {
          const { dia, mes } = extrairDiaMesTexto(cuid.proximaData, 18 + idx);
          if (mes === mesAtivo) {
            lista.push({
              id: `pet-cuid-${pet.id}-${cuid.id}`,
              diaMes: dia,
              mes: mesAtivo,
              ano: anoAtivo,
              horario: "11:00",
              horaFim: "11:45",
              duracaoMin: 45,
              titulo: `${pet.nome} · ${cuid.tipo}`,
              subtitulo: `Próxima dose/cuidado: ${cuid.proximaData} (${cuid.status})`,
              categoria: "pets",
              cor: cuid.status === "atencao" ? "alert" : "primary",
              origem: "modulo",
              payloadSheet: { tipo: "pet", id: pet.id },
            });
          }
        });
      });
    }

    // 5. Vencimentos Financeiros & Cartões de Crédito
    if (configCalendario.mostrarFinancas) {
      cartoes.forEach((ct) => {
        if (ct.faturaAtual > 0 || ct.limiteTotal > 0) {
          lista.push({
            id: `fin-cartao-${ct.id}`,
            diaMes: Math.min(diasNoMesCount, Math.max(1, ct.vencimentoDia)),
            mes: mesAtivo,
            ano: anoAtivo,
            horario: "09:00",
            horaFim: "09:30",
            duracaoMin: 30,
            titulo: `Vencimento Fatura ${ct.nome}`,
            subtitulo: `Fatura: R$ ${ct.faturaAtual.toFixed(2)} · Status: ${
              ct.statusFatura
            }`,
            categoria: "financas",
            cor: "finance",
            concluido: ct.statusFatura === "paga",
            ehRecorrente: true,
            recorrencia: "mensal",
            origem: "modulo",
          });
        }
      });

      const mesKeyStr = `${anoAtivo}-${String(mesAtivo).padStart(2, "0")}`;
      lancamentos
        .filter((l) => l.mesKey === mesKeyStr && l.status === "previsto")
        .forEach((l, idx) => {
          const { dia } = extrairDiaMesTexto(l.data, 20 + (idx % 8));
          lista.push({
            id: `fin-lanc-${l.id}`,
            diaMes: dia,
            mes: mesAtivo,
            ano: anoAtivo,
            horario: "12:00",
            horaFim: "12:30",
            duracaoMin: 30,
            titulo: `${l.tipo === "receita" ? "Recebimento" : "Vencimento"}: ${
              l.descricao
            }`,
            subtitulo: `R$ ${l.valor.toFixed(2)} · ${l.categoria} (${l.metodo})`,
            categoria: "financas",
            cor: l.tipo === "receita" ? "primary" : "finance",
            origem: "modulo",
          });
        });
    }

    // 6. Radar de Preparação
    if (configCalendario.mostrarRadar) {
      radarItens.forEach((rad) => {
        const { dia, mes } = extrairDiaMesTexto(
          rad.dataEvento,
          Math.min(diasNoMesCount, diaSelecionado + rad.diasRestantes)
        );
        if (mes === mesAtivo) {
          lista.push({
            id: `rad-${rad.id}`,
            diaMes: dia,
            mes: mesAtivo,
            ano: anoAtivo,
            horario: "18:00",
            horaFim: "19:00",
            duracaoMin: 60,
            titulo: `Radar: ${rad.titulo}`,
            subtitulo: `${rad.area} · ${rad.dataEvento}`,
            categoria:
              rad.area === "UERJ"
                ? "uerj"
                : rad.area === "Trabalho"
                ? "trabalho"
                : rad.area === "Finanças"
                ? "financas"
                : rad.area === "Casa & Pets"
                ? "pets"
                : rad.area === "Corpo"
                ? "saude"
                : "pessoal",
            cor: rad.cor,
            origem: "modulo",
            payloadSheet: { tipo: "radar_item", id: rad.id },
          });
        }
      });
    }

    return lista.sort((a, b) => a.horario.localeCompare(b.horario));
  }, [
    compromissos,
    titulosRepetidosMap,
    eventosGoogle,
    disciplinas,
    petsPerfil,
    cartoes,
    lancamentos,
    radarItens,
    configCalendario,
    anoAtivo,
    mesAtivo,
    diasNoMesCount,
    diasNoMesArray,
    offsetInicioMes,
    diaSelecionado,
  ]);

  const eventosFiltrados = useMemo(() => {
    return todosEventosMes.filter((ev) => {
      if (filtroCategoria !== "todas" && ev.categoria !== filtroCategoria) {
        return false;
      }
      if (filtroContaEmail !== "todas") {
        if (ev.origem === "gcal") {
          const idMatch =
            ev.contaEmail?.toLowerCase() === filtroContaEmail.toLowerCase() ||
            ev.calendarId?.toLowerCase() === filtroContaEmail.toLowerCase();
          if (!idMatch) return false;
        } else if (filtroContaEmail !== "app_local") {
          return false;
        }
      }
      return true;
    });
  }, [todosEventosMes, filtroCategoria, filtroContaEmail]);

  const eventosDoDiaSelecionado = useMemo(
    () => eventosFiltrados.filter((ev) => ev.diaMes === diaSelecionado),
    [eventosFiltrados, diaSelecionado]
  );

  // Semana de 7 dias contendo o diaSelecionado (Seg a Dom)
  const diasVisaoSemanal = useMemo(() => {
    const posNaGrade = diaSelecionado + offsetInicioMes - 1;
    const inicioSemanaDia = diaSelecionado - (posNaGrade % 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = inicioSemanaDia + i;
      return d >= 1 && d <= diasNoMesCount ? d : null;
    });
  }, [diaSelecionado, offsetInicioMes, diasNoMesCount]);

  const horasGrade = useMemo(() => {
    let inicio = Math.min(12, Math.max(5, configCalendario.horaInicioGrade || 7));
    eventosFiltrados.forEach((ev) => {
      const h = parseInt((ev.horario || "09:00").split(":")[0], 10);
      if (!isNaN(h) && h >= 0 && h < inicio) {
        inicio = h;
      }
    });
    return Array.from({ length: 23 - inicio + 1 }, (_, i) => inicio + i);
  }, [configCalendario.horaInicioGrade, eventosFiltrados]);

  const getCorHexCategoria = (
    cat: CategoriaCalendarioApp,
    corCustomHex?: string
  ): string => {
    if (corCustomHex) return corCustomHex;
    return configCalendario.coresCategorias?.[cat] || t.primary;
  };

  // Abre o modal de criação rápida estilo Google Agenda ao clicar num dia ou horário
  const abrirModalCriacaoRapida = (
    dia: number,
    horaPadrao = "14:00",
    tipoInicial: "evento" | "tarefa" = "evento"
  ) => {
    setDiaSelecionado(dia);
    setNovaHora(horaPadrao);
    setTipoItemModal(tipoInicial);
    setDiaInteiroModal(false);
    setEventoEditando(null);
    setNovoTitulo("");
    setNovoLocal("");
    setNovaDescricao("");
    setNovaRecorrencia("nenhuma");
    setNovaRecorrenciaAte("");
    setModalCriacaoAberto(true);
  };

  // Abre um evento/tarefa existente para visualização, conclusão ou edição
  const abrirEventoNoCalendario = (ev: EventoCalendarioUnificado) => {
    setDiaSelecionado(ev.diaMes);
    if (ev.payloadSheet && ev.origem === "modulo" && !ev.disciplinaId) {
      openCard(ev.payloadSheet);
      return;
    }
    setEventoEditando(ev);
    setTipoItemModal(ev.ehTarefa ? "tarefa" : "evento");
    setNovoTitulo(ev.titulo.replace(/^(\[Tarefa\]\s*|☑\s*)/i, ""));
    setNovaHora(ev.horario || "14:00");
    setNovaDuracao(ev.duracaoMin || 60);
    setNovoLocal(ev.local || "");
    setNovaDescricao(ev.descricao || ev.subtitulo || "");
    setNovaCat(ev.categoria);
    setNovaRecorrencia(ev.recorrencia || (ev.ehRecorrente ? "semanal" : "nenhuma"));
    setContaDestinoCriacao(ev.contaEmail || ev.calendarId || "");
    setModalCriacaoAberto(true);
  };

  // Aplica a movimentação ou edição de um evento de acordo com o escopo ("este", "seguintes", "todos")
  const aplicarAlteracaoComEscopo = useCallback(
    async (
      ev: EventoCalendarioUnificado,
      dadosNovos: {
        novoDia: number;
        novoMes: number;
        novoAno: number;
        novaHoraStr: string;
        novaDuracaoNum: number;
        novoTituloStr: string;
        novoLocalStr?: string;
        novaCatVal?: CategoriaCalendarioApp;
        novaRec?: RecorrenciaCompromisso;
      },
      escopo: EscopoAlteracaoRecorrencia
    ) => {
      const dataOcorrenciaIso = formatDataIso(ev.ano, ev.mes, ev.diaMes);
      const dataAnteriorIso = (() => {
        const dt = new Date(ev.ano, ev.mes - 1, ev.diaMes);
        dt.setDate(dt.getDate() - 1);
        return formatDataIso(
          dt.getFullYear(),
          dt.getMonth() + 1,
          dt.getDate()
        );
      })();
      const novoDiaSemanaIdx =
        (dadosNovos.novoDia + offsetInicioMes - 1) % 7;

      const abaMap: Record<CategoriaCalendarioApp, Compromisso["aba"]> = {
        uerj: "estudos_trabalho",
        trabalho: "estudos_trabalho",
        pets: "casa_rotinas",
        financas: "financas",
        saude: "saude_pets",
        pessoal: "casa_rotinas",
      };
      const catFinal = dadosNovos.novaCatVal || ev.categoria;

      // Caso A: Evento de Aula Semanal de Disciplina (origem === "modulo" com disciplinaId)
      if (ev.disciplinaId) {
        if (escopo === "este") {
          // Exclui apenas a aula desta data e cria um Compromisso avulso no novo dia/horário
          if (setDisciplinas) {
            setDisciplinas((prev) =>
              prev.map((d) =>
                d.id === ev.disciplinaId
                  ? {
                      ...d,
                      anotacoes: `${d.anotacoes ? d.anotacoes + "," : ""}EX:${dataOcorrenciaIso}`,
                    }
                  : d
              )
            );
          }
          setCompromissos((prev) => [
            ...prev,
            {
              id: Date.now(),
              hora: dadosNovos.novaHoraStr,
              duracaoMin: dadosNovos.novaDuracaoNum,
              titulo: dadosNovos.novoTituloStr,
              local: dadosNovos.novoLocalStr || ev.local || "Aula remarcada",
              cor: "primary",
              aba: "estudos_trabalho",
              diaMes: dadosNovos.novoDia,
              mes: dadosNovos.novoMes,
              ano: dadosNovos.novoAno,
              diaSemanaIdx: novoDiaSemanaIdx,
              categoriaCalendario: "uerj",
              recorrencia: "nenhuma",
            },
          ]);
          showToast(
            `Apenas esta aula foi movida para ${String(
              dadosNovos.novoDia
            ).padStart(2, "0")}/${String(dadosNovos.novoMes).padStart(
              2,
              "0"
            )} às ${dadosNovos.novaHoraStr}!`
          );
          return;
        }

        // Escopo "seguintes" ou "todos" na disciplina: atualiza o horário/dia da disciplina ou cria série
        if (setDisciplinas) {
          const nomeDiaCurto =
            DIAS_SEMANA_CURTO[novoDiaSemanaIdx]?.toUpperCase() || "SEG";
          setDisciplinas((prev) =>
            prev.map((d) => {
              if (d.id !== ev.disciplinaId) return d;
              const novoHorSala =
                dadosNovos.novoDia !== ev.diaMes
                  ? `${nomeDiaCurto} · ${dadosNovos.novaHoraStr}`
                  : d.horarioSala.replace(
                      /(\d{1,2})[:h](\d{2})?/,
                      dadosNovos.novaHoraStr
                    );
              return {
                ...d,
                nome: dadosNovos.novoTituloStr.replace(/^(Aula( UERJ)?:\s*)/i, ""),
                horarioSala: novoHorSala.includes(dadosNovos.novaHoraStr)
                  ? novoHorSala
                  : `${d.horarioSala} · ${dadosNovos.novaHoraStr}`,
              };
            })
          );
        }
        showToast(
          escopo === "todos"
            ? `Todas as aulas da série atualizadas para ${dadosNovos.novaHoraStr}!`
            : `Esta aula e as seguintes foram atualizadas para ${dadosNovos.novaHoraStr}!`
        );
        return;
      }

      // Caso B: Compromisso nativo do App (recorrente ou em série)
      if (ev.compromissoId) {
        const compOriginal = compromissos.find(
          (c) => c.id === ev.compromissoId
        );
        const serieKey =
          compOriginal?.recorrenciaSerieId ||
          ev.titulo.trim().toLowerCase();

        if (escopo === "este") {
          setCompromissos((prev) => {
            const atualizados = prev
              .map((c) => {
                if (c.id !== ev.compromissoId) return c;
                // Se o compromisso tem recorrência projetada, adiciona a data na lista de excluídas
                if (c.recorrencia && c.recorrencia !== "nenhuma") {
                  return {
                    ...c,
                    datasExcluidasRecorrencia: [
                      ...(c.datasExcluidasRecorrencia || []),
                      dataOcorrenciaIso,
                    ],
                  };
                }
                // Se era uma ocorrência individual de uma série, atualiza somente ela
                return {
                  ...c,
                  titulo: dadosNovos.novoTituloStr,
                  hora: dadosNovos.novaHoraStr,
                  duracaoMin: dadosNovos.novaDuracaoNum,
                  local: dadosNovos.novoLocalStr ?? c.local,
                  categoriaCalendario: catFinal,
                  aba: abaMap[catFinal],
                  diaMes: dadosNovos.novoDia,
                  mes: dadosNovos.novoMes,
                  ano: dadosNovos.novoAno,
                  diaSemanaIdx: novoDiaSemanaIdx,
                  recorrencia: "nenhuma" as RecorrenciaCompromisso,
                };
              });

            // Se o original era recorrente projetado, criamos a nova instância avulsa no dia/hora destino
            if (
              compOriginal?.recorrencia &&
              compOriginal.recorrencia !== "nenhuma"
            ) {
              atualizados.push({
                ...compOriginal,
                id: Date.now(),
                titulo: dadosNovos.novoTituloStr,
                hora: dadosNovos.novaHoraStr,
                duracaoMin: dadosNovos.novaDuracaoNum,
                local: dadosNovos.novoLocalStr ?? compOriginal.local,
                categoriaCalendario: catFinal,
                aba: abaMap[catFinal],
                diaMes: dadosNovos.novoDia,
                mes: dadosNovos.novoMes,
                ano: dadosNovos.novoAno,
                diaSemanaIdx: novoDiaSemanaIdx,
                recorrencia: "nenhuma",
                datasExcluidasRecorrencia: [],
              });
            }
            return atualizados;
          });

          showToast(
            `Alterado apenas este evento (${String(dadosNovos.novoDia).padStart(
              2,
              "0"
            )}/${String(dadosNovos.novoMes).padStart(2, "0")} às ${
              dadosNovos.novaHoraStr
            })!`
          );
          return;
        }

        if (escopo === "seguintes") {
          setCompromissos((prev) => {
            const listaNova: Compromisso[] = [];
            prev.forEach((c) => {
              const mesmaSerie =
                c.id === ev.compromissoId ||
                (c.recorrenciaSerieId &&
                  c.recorrenciaSerieId === compOriginal?.recorrenciaSerieId) ||
                c.titulo.trim().toLowerCase() === serieKey;

              if (!mesmaSerie) {
                listaNova.push(c);
                return;
              }

              if (c.recorrencia && c.recorrencia !== "nenhuma") {
                // Encerra a série antiga no dia anterior e cria a nova série a partir da data atual
                listaNova.push({
                  ...c,
                  recorrenciaAteData: dataAnteriorIso,
                });
                listaNova.push({
                  ...c,
                  id: Date.now() + Math.floor(Math.random() * 1000),
                  titulo: dadosNovos.novoTituloStr,
                  hora: dadosNovos.novaHoraStr,
                  duracaoMin: dadosNovos.novaDuracaoNum,
                  local: dadosNovos.novoLocalStr ?? c.local,
                  categoriaCalendario: catFinal,
                  aba: abaMap[catFinal],
                  diaMes: dadosNovos.novoDia,
                  mes: dadosNovos.novoMes,
                  ano: dadosNovos.novoAno,
                  diaSemanaIdx: novoDiaSemanaIdx,
                  recorrencia: dadosNovos.novaRec || c.recorrencia,
                  recorrenciaAteData: c.recorrenciaAteData,
                  datasExcluidasRecorrencia: [],
                });
              } else {
                // Para eventos em série individuais: altera este e os de datas >= dataOcorrenciaIso
                const cIso = formatDataIso(
                  c.ano ?? anoAtivo,
                  c.mes ?? mesAtivo,
                  c.diaMes
                );
                if (cIso >= dataOcorrenciaIso) {
                  listaNova.push({
                    ...c,
                    titulo: dadosNovos.novoTituloStr,
                    hora: dadosNovos.novaHoraStr,
                    duracaoMin: dadosNovos.novaDuracaoNum,
                    local: dadosNovos.novoLocalStr ?? c.local,
                    categoriaCalendario: catFinal,
                    aba: abaMap[catFinal],
                    diaMes:
                      c.id === ev.compromissoId ? dadosNovos.novoDia : c.diaMes,
                  });
                } else {
                  listaNova.push(c);
                }
              }
            });
            return listaNova;
          });

          showToast(
            `Este evento e os seguintes foram atualizados para ${dadosNovos.novaHoraStr}!`
          );
          return;
        }

        // Escopo === "todos": altera toda a série
        setCompromissos((prev) =>
          prev.map((c) => {
            const mesmaSerie =
              c.id === ev.compromissoId ||
              (c.recorrenciaSerieId &&
                c.recorrenciaSerieId === compOriginal?.recorrenciaSerieId) ||
              c.titulo.trim().toLowerCase() === serieKey;
            if (!mesmaSerie) return c;
            return {
              ...c,
              titulo: dadosNovos.novoTituloStr,
              hora: dadosNovos.novaHoraStr,
              duracaoMin: dadosNovos.novaDuracaoNum,
              local: dadosNovos.novoLocalStr ?? c.local,
              categoriaCalendario: catFinal,
              aba: abaMap[catFinal],
              diaMes:
                c.id === ev.compromissoId || c.recorrencia !== "nenhuma"
                  ? dadosNovos.novoDia
                  : c.diaMes,
              mes:
                c.id === ev.compromissoId || c.recorrencia !== "nenhuma"
                  ? dadosNovos.novoMes
                  : c.mes,
              ano:
                c.id === ev.compromissoId || c.recorrencia !== "nenhuma"
                  ? dadosNovos.novoAno
                  : c.ano,
              diaSemanaIdx: novoDiaSemanaIdx,
              recorrencia:
                dadosNovos.novaRec !== undefined
                  ? dadosNovos.novaRec
                  : c.recorrencia,
            };
          })
        );
        showToast(
          `Todos os eventos da série "${dadosNovos.novoTituloStr}" foram atualizados!`
        );
        return;
      }

      // Caso C: Evento do Google Calendar ou módulo convertido ao arrastar
      if (ev.gcalId && navigator.onLine) {
        try {
          const atualizado = await atualizarEventoGoogleCalendar(ev.gcalId, {
            titulo: dadosNovos.novoTituloStr,
            descricao: ev.descricao || "",
            local: dadosNovos.novoLocalStr || ev.local || "",
            ano: dadosNovos.novoAno,
            mes: dadosNovos.novoMes,
            diaMes: dadosNovos.novoDia,
            horaInicio: dadosNovos.novaHoraStr,
            duracaoMin: dadosNovos.novaDuracaoNum,
            categoria: catFinal,
            targetAccountEmail: ev.contaEmail,
            targetCalendarId: ev.calendarId || "primary",
          });
          setEventosGoogle((prev) =>
            prev.map((x) => (x.gcalId === ev.gcalId ? atualizado : x))
          );
          showToast(
            `"${atualizado.titulo}" movido para ${String(
              dadosNovos.novoDia
            ).padStart(2, "0")}/${String(dadosNovos.novoMes).padStart(
              2,
              "0"
            )} às ${dadosNovos.novaHoraStr}!`
          );
          return;
        } catch {
          // fallback local
        }
      }

      // Fallback para eventos de outros módulos arrastados: cria compromisso personalizado no novo horário
      setCompromissos((prev) => [
        ...prev,
        {
          id: Date.now(),
          hora: dadosNovos.novaHoraStr,
          duracaoMin: dadosNovos.novaDuracaoNum,
          titulo: dadosNovos.novoTituloStr,
          local: dadosNovos.novoLocalStr || ev.local || "Agenda Casa da Lala",
          cor: ev.cor || "action",
          aba: abaMap[catFinal],
          diaMes: dadosNovos.novoDia,
          mes: dadosNovos.novoMes,
          ano: dadosNovos.novoAno,
          diaSemanaIdx: novoDiaSemanaIdx,
          categoriaCalendario: catFinal,
          recorrencia: "nenhuma",
        },
      ]);
      showToast(
        `"${dadosNovos.novoTituloStr}" reagendado em ${String(
          dadosNovos.novoDia
        ).padStart(2, "0")}/${String(dadosNovos.novoMes).padStart(
          2,
          "0"
        )} às ${dadosNovos.novaHoraStr}!`
      );
    },
    [anoAtivo, compromissos, mesAtivo, offsetInicioMes, setCompromissos, setDisciplinas, showToast]
  );

  // Solicita mover um evento (via Drag & Drop) para novoDia e/ou novaHora, perguntando escopo se for recorrente!
  const handleMoverEventoNoCalendario = useCallback(
    (
      ev: EventoCalendarioUnificado,
      novoDia: number,
      novaHoraAlvo?: string
    ) => {
      const horaFinal = novaHoraAlvo || ev.horario || "09:00";
      if (novoDia === ev.diaMes && horaFinal === ev.horario) return;

      const dadosNovos = {
        novoDia,
        novoMes: mesAtivo,
        novoAno: anoAtivo,
        novaHoraStr: horaFinal,
        novaDuracaoNum: ev.duracaoMin || 60,
        novoTituloStr: ev.titulo,
        novoLocalStr: ev.local,
        novaCatVal: ev.categoria,
        novaRec: ev.recorrencia,
      };

      // Se o evento se repete, abre o modal perguntando: "Apenas este", "Este e os seguintes" ou "Todos"!
      if (ev.ehRecorrente) {
        setConfirmacaoRecorrencia({
          evento: ev,
          tipoOperacao: "mover",
          resumoAlteracao: `Mover "${ev.titulo}" de ${String(ev.diaMes).padStart(
            2,
            "0"
          )}/${String(mesAtivo).padStart(2, "0")} (${ev.horario}) para ${String(
            novoDia
          ).padStart(2, "0")}/${String(mesAtivo).padStart(
            2,
            "0"
          )} às ${horaFinal}`,
          onEscolherEscopo: (escopo) => {
            aplicarAlteracaoComEscopo(ev, dadosNovos, escopo);
            setConfirmacaoRecorrencia(null);
          },
        });
        return;
      }

      aplicarAlteracaoComEscopo(ev, dadosNovos, "este");
    },
    [anoAtivo, aplicarAlteracaoComEscopo, mesAtivo]
  );

  // Listener global para finalizar o arraste vertical por Mouse/Touch na Visão Diária
  useEffect(() => {
    if (!dragVerticalDia) return;

    const handleMove = (clientY: number) => {
      const deltaPx = clientY - dragVerticalDia.startY;
      // 96px = 60 min => 24px = 15 min
      const deltaQuartos = Math.round(deltaPx / 24);
      const novoMin = Math.max(
        5 * 60,
        Math.min(23 * 60 + 45, dragVerticalDia.origMin + deltaQuartos * 15)
      );
      setDragVerticalDia((prev) =>
        prev
          ? {
              ...prev,
              previewMin: novoMin,
              moved: prev.moved || Math.abs(deltaPx) > 6,
            }
          : null
      );
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientY);
    };

    const onEnd = () => {
      if (dragVerticalDia.moved) {
        const hh = String(Math.floor(dragVerticalDia.previewMin / 60)).padStart(
          2,
          "0"
        );
        const mm = String(dragVerticalDia.previewMin % 60).padStart(2, "0");
        const novaHoraStr = `${hh}:${mm}`;
        if (novaHoraStr !== dragVerticalDia.ev.horario) {
          handleMoverEventoNoCalendario(
            dragVerticalDia.ev,
            dragVerticalDia.ev.diaMes,
            novaHoraStr
          );
        }
      } else {
        abrirEventoNoCalendario(dragVerticalDia.ev);
      }
      setDragVerticalDia(null);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [dragVerticalDia, handleMoverEventoNoCalendario]);

  const handleConectarOutroEmailGoogle = async () => {
    const res = await connectAdditionalGoogleAccount();
    if (res.user) {
      setContasGoogle(getConnectedGoogleAccounts());
      showToast(`Conta ${res.user.email} vinculada ao seu Calendário Unificado!`);
      await sincronizarEventosDoMesGoogle(true);
    } else if (res.error) {
      showToast(res.error);
    }
  };

  const handleAdicionarCalendarioPorId = async () => {
    if (!novoCalIdInput.trim()) return;
    const lista = addCustomCalendar(
      novoCalIdInput.trim(),
      novoCalNomeInput.trim() || novoCalIdInput.trim(),
      novoCalCorInput,
      contasGoogle[0]?.email
    );
    setCalendariosExtras(lista);
    setNovoCalIdInput("");
    setNovoCalNomeInput("");
    showToast("Agenda adicional vinculada! Sincronizando eventos...");
    await sincronizarEventosDoMesGoogle(true);
  };

  const CATEGORIAS_FILTRO: {
    id: CategoriaEventoCalendario;
    label: string;
    corHex: string;
    icon: React.ElementType;
  }[] = [
    { id: "todas", label: "Todas", corHex: t.text, icon: Filter },
    {
      id: "uerj",
      label: "UERJ & Estudos",
      corHex: getCorHexCategoria("uerj"),
      icon: GraduationCap,
    },
    {
      id: "trabalho",
      label: "Trabalho & CDT",
      corHex: getCorHexCategoria("trabalho"),
      icon: Briefcase,
    },
    {
      id: "pets",
      label: "Pets",
      corHex: getCorHexCategoria("pets"),
      icon: PawPrint,
    },
    {
      id: "financas",
      label: "Finanças",
      corHex: getCorHexCategoria("financas"),
      icon: Wallet,
    },
    {
      id: "saude",
      label: "Saúde & Treino",
      corHex: getCorHexCategoria("saude"),
      icon: HeartPulse,
    },
    {
      id: "pessoal",
      label: "Pessoal & Rotina",
      corHex: getCorHexCategoria("pessoal"),
      icon: Sparkles,
    },
  ];

  const navegarMes = (delta: number) => {
    let novoMes = mesAtivo + delta;
    let novoAno = anoAtivo;
    if (novoMes < 1) {
      novoMes = 12;
      novoAno -= 1;
    } else if (novoMes > 12) {
      novoMes = 1;
      novoAno += 1;
    }
    setMesAtivo(novoMes);
    setAnoAtivo(novoAno);
    setDiaSelecionado(1);
  };

  const irParaHoje = () => {
    const agora = new Date();
    setAnoAtivo(agora.getFullYear());
    setMesAtivo(agora.getMonth() + 1);
    setDiaSelecionado(agora.getDate());
  };

  const salvarCompromissoLocal = (
    tituloFinal: string,
    gcalEventIdCriado?: string
  ): number => {
    const abaMap: Record<CategoriaCalendarioApp, Compromisso["aba"]> = {
      uerj: "estudos_trabalho",
      trabalho: "estudos_trabalho",
      pets: "casa_rotinas",
      financas: "financas",
      saude: "saude_pets",
      pessoal: "casa_rotinas",
    };

    const horaFinal = diaInteiroModal ? "08:00" : novaHora || "14:00";
    const duracaoFinal = diaInteiroModal
      ? 480
      : Number(novaDuracao) || (tipoItemModal === "tarefa" ? 15 : 60);

    const novoId = Date.now();
    const novo: Compromisso = {
      id: novoId,
      hora: horaFinal,
      duracaoMin: duracaoFinal,
      titulo: tituloFinal,
      local:
        novoLocal.trim() ||
        (novaDescricao.trim()
          ? novaDescricao.trim()
          : `Agenda (${novaCat.toUpperCase()})`),
      cor:
        novaCat === "uerj" || novaCat === "saude"
          ? "primary"
          : novaCat === "financas"
          ? "finance"
          : novaCat === "trabalho"
          ? "alert"
          : "action",
      aba: abaMap[novaCat],
      diaMes: diaSelecionado,
      mes: mesAtivo,
      ano: anoAtivo,
      diaSemanaIdx: (diaSelecionado + offsetInicioMes - 1) % 7,
      categoriaCalendario: novaCat,
      recorrencia: novaRecorrencia,
      recorrenciaSerieId:
        novaRecorrencia !== "nenhuma" ? `serie-${novoId}` : undefined,
      recorrenciaAteData: novaRecorrenciaAte || undefined,
      gcalSynced: Boolean(gcalEventIdCriado),
      gcalEventId: gcalEventIdCriado,
    };

    setCompromissos((prev) => [...prev, novo]);
    setNovoTitulo("");
    setNovoLocal("");
    setNovaDescricao("");
    return novoId;
  };

  const handleAgendarCompromisso = async () => {
    if (!novoTitulo.trim()) {
      showToast("Digite um título para o evento ou tarefa.");
      return;
    }

    const tituloFormatado =
      tipoItemModal === "tarefa" &&
      !novoTitulo.trim().startsWith("[Tarefa]") &&
      !novoTitulo.trim().startsWith("☑")
        ? `[Tarefa] ${novoTitulo.trim()}`
        : novoTitulo.trim();

    // Se estiver editando um evento existente
    if (eventoEditando) {
      const editRef = eventoEditando;
      const horaEdit = diaInteiroModal ? "08:00" : novaHora;
      const dadosNovos = {
        novoDia: diaSelecionado,
        novoMes: mesAtivo,
        novoAno: anoAtivo,
        novaHoraStr: horaEdit,
        novaDuracaoNum: novaDuracao,
        novoTituloStr: tituloFormatado,
        novoLocalStr: novoLocal.trim() || editRef.local,
        novaCatVal: novaCat,
        novaRec: novaRecorrencia,
      };

      setModalCriacaoAberto(false);
      setEventoEditando(null);

      // Se o evento se repete, pergunta se quer alterar apenas este, este e os seguintes, ou todos!
      if (editRef.ehRecorrente) {
        setConfirmacaoRecorrencia({
          evento: editRef,
          tipoOperacao: "editar",
          resumoAlteracao: `Alterar "${editRef.titulo}" para "${tituloFormatado}" (${String(
            diaSelecionado
          ).padStart(2, "0")}/${String(mesAtivo).padStart(
            2,
            "0"
          )} às ${horaEdit})`,
          onEscolherEscopo: (escopo) => {
            aplicarAlteracaoComEscopo(editRef, dadosNovos, escopo);
            setConfirmacaoRecorrencia(null);
          },
        });
        return;
      }

      await aplicarAlteracaoComEscopo(editRef, dadosNovos, "este");
      return;
    }

    // 1. SEMPRE salva imediatamente na agenda local (instantâneo, funciona 100% offline e sem modais extras)
    const idCriadoLocal = salvarCompromissoLocal(tituloFormatado);
    setModalCriacaoAberto(false);
    setEventoEditando(null);

    const token = await getAccessToken();
    const temContaAtiva =
      navigator.onLine && (Boolean(token) || contasGoogle.length > 0);

    if (enviarNovoParaGoogle && temContaAtiva) {
      const contaAlvo =
        contaDestinoCriacao || contasGoogle[0]?.email || undefined;
      const inputGCal: NovoEventoGoogleInput = {
        titulo: tituloFormatado,
        descricao: novaDescricao.trim(),
        local: novoLocal.trim(),
        ano: anoAtivo,
        mes: mesAtivo,
        diaMes: diaSelecionado,
        horaInicio: diaInteiroModal ? "08:00" : novaHora,
        duracaoMin:
          Number(novaDuracao) || (tipoItemModal === "tarefa" ? 15 : 60),
        diaInteiro: diaInteiroModal,
        categoria: novaCat,
        targetAccountEmail: contaAlvo,
      };

      showToast(
        `"${tituloFormatado}" salvo na Agenda em ${String(
          diaSelecionado
        ).padStart(2, "0")}/${String(mesAtivo).padStart(
          2,
          "0"
        )} às ${novaHora}! Sincronizando com Google...`
      );

      try {
        const criado = await criarEventoGoogleCalendar(inputGCal);
        setEventosGoogle((prev) => [...prev, criado]);
        setCompromissos((prev) =>
          prev.map((c) =>
            c.id === idCriadoLocal
              ? { ...c, gcalSynced: true, gcalEventId: criado.gcalId }
              : c
          )
        );
        showToast(
          `"${criado.titulo}" sincronizado com o Google Agenda!`
        );
      } catch {
        // Mantém o evento salvo localmente sem perder nada
      }
      return;
    }

    showToast(
      `${
        tipoItemModal === "tarefa" ? "Tarefa" : "Evento"
      } "${tituloFormatado}" agendado em ${String(diaSelecionado).padStart(
        2,
        "0"
      )}/${String(mesAtivo).padStart(2, "0")} às ${novaHora}!`
    );
  };

  const handleAlternarConclusaoEvento = (ev: EventoCalendarioUnificado) => {
    if (ev.compromissoId) {
      setCompromissos((prev) =>
        prev.map((c) =>
          c.id === ev.compromissoId ? { ...c, concluido: !c.concluido } : c
        )
      );
      showToast(
        ev.concluido
          ? `Reaberto: "${ev.titulo}"`
          : `Concluído: "${ev.titulo}" ✓`
      );
    }
  };

  const handleSolicitarExclusaoEvento = (ev: EventoCalendarioUnificado) => {
    setModalCriacaoAberto(false);
    setEventoEditando(null);

    // Se for um evento que se repete, pergunta se deseja excluir apenas este, este e os seguintes, ou todos!
    if (ev.ehRecorrente && (ev.compromissoId || ev.disciplinaId)) {
      const dataOcorrenciaIso = formatDataIso(ev.ano, ev.mes, ev.diaMes);
      const dataAnteriorIso = (() => {
        const dt = new Date(ev.ano, ev.mes - 1, ev.diaMes);
        dt.setDate(dt.getDate() - 1);
        return formatDataIso(
          dt.getFullYear(),
          dt.getMonth() + 1,
          dt.getDate()
        );
      })();

      setConfirmacaoRecorrencia({
        evento: ev,
        tipoOperacao: "excluir",
        resumoAlteracao: `Excluir "${ev.titulo}" (${String(ev.diaMes).padStart(
          2,
          "0"
        )}/${String(ev.mes).padStart(2, "0")} às ${ev.horario})`,
        onEscolherEscopo: (escopo) => {
          if (ev.disciplinaId && setDisciplinas) {
            if (escopo === "este") {
              setDisciplinas((prev) =>
                prev.map((d) =>
                  d.id === ev.disciplinaId
                    ? {
                        ...d,
                        anotacoes: `${
                          d.anotacoes ? d.anotacoes + "," : ""
                        }EX:${dataOcorrenciaIso}`,
                      }
                    : d
                )
              );
              showToast(`Aula de ${ev.diaMes}/${ev.mes} removida da agenda.`);
            } else {
              setDisciplinas((prev) =>
                prev.filter((d) => d.id !== ev.disciplinaId)
              );
              showToast(`Série de aulas "${ev.titulo}" removida.`);
            }
            setConfirmacaoRecorrencia(null);
            return;
          }

          const compOrig = compromissos.find((c) => c.id === ev.compromissoId);
          const serieKey =
            compOrig?.recorrenciaSerieId || ev.titulo.trim().toLowerCase();

          if (escopo === "este") {
            setCompromissos((prev) =>
              prev.flatMap((c) => {
                if (c.id !== ev.compromissoId) return [c];
                if (c.recorrencia && c.recorrencia !== "nenhuma") {
                  return [
                    {
                      ...c,
                      datasExcluidasRecorrencia: [
                        ...(c.datasExcluidasRecorrencia || []),
                        dataOcorrenciaIso,
                      ],
                    },
                  ];
                }
                return [];
              })
            );
            showToast(`Removido apenas o evento de ${ev.diaMes}/${ev.mes}.`);
          } else if (escopo === "seguintes") {
            setCompromissos((prev) =>
              prev.flatMap((c) => {
                const mesmaSerie =
                  c.id === ev.compromissoId ||
                  (c.recorrenciaSerieId &&
                    c.recorrenciaSerieId === compOrig?.recorrenciaSerieId) ||
                  c.titulo.trim().toLowerCase() === serieKey;
                if (!mesmaSerie) return [c];
                if (c.recorrencia && c.recorrencia !== "nenhuma") {
                  return [{ ...c, recorrenciaAteData: dataAnteriorIso }];
                }
                const cIso = formatDataIso(
                  c.ano ?? anoAtivo,
                  c.mes ?? mesAtivo,
                  c.diaMes
                );
                return cIso >= dataOcorrenciaIso ? [] : [c];
              })
            );
            showToast(
              `Este evento e os seguintes foram removidos da série "${ev.titulo}".`
            );
          } else {
            setCompromissos((prev) =>
              prev.filter((c) => {
                const mesmaSerie =
                  c.id === ev.compromissoId ||
                  (c.recorrenciaSerieId &&
                    c.recorrenciaSerieId === compOrig?.recorrenciaSerieId) ||
                  c.titulo.trim().toLowerCase() === serieKey;
                return !mesmaSerie;
              })
            );
            showToast(`Todos os eventos da série "${ev.titulo}" foram removidos.`);
          }
          setConfirmacaoRecorrencia(null);
        },
      });
      return;
    }

    if (ev.gcalId) {
      setConfirmacaoGCal({
        tipo: "excluir",
        tituloModal: "Excluir do Google Agenda?",
        descricaoModal:
          "Tem certeza de que deseja remover este item do seu Google Calendar?",
        itensAfetados: [
          `${ev.titulo} (${ev.diaMes}/${String(ev.mes).padStart(
            2,
            "0"
          )} às ${ev.horario})`,
        ],
        onConfirmar: async () => {
          await excluirEventoGoogleCalendar(
            ev.gcalId!,
            ev.calendarId || "primary",
            ev.contaEmail
          );
          setEventosGoogle((prev) =>
            prev.filter((x) => x.gcalId !== ev.gcalId)
          );
          if (ev.compromissoId) {
            setCompromissos((prev) =>
              prev.filter((c) => c.id !== ev.compromissoId)
            );
          }
          showToast(`"${ev.titulo}" removido do Google Agenda.`);
        },
      });
      return;
    }

    if (ev.compromissoId) {
      setCompromissos((prev) => prev.filter((c) => c.id !== ev.compromissoId));
      showToast(`"${ev.titulo}" removido.`);
    }
  };

  const handleExportarEventosDoDiaParaGoogle = async () => {
    const token = await getAccessToken();
    if (!token) {
      await onConnectGoogle();
      return;
    }

    const candidatos = eventosDoDiaSelecionado.filter(
      (ev) => !ev.gcalId && ev.origem !== "gcal"
    );
    if (candidatos.length === 0) {
      showToast(
        "Todos os eventos deste dia já estão sincronizados no Google Agenda!"
      );
      return;
    }

    setConfirmacaoGCal({
      tipo: "exportar_lote",
      tituloModal: `Exportar ${candidatos.length} evento(s) para o Google Agenda?`,
      descricaoModal: `Confirme para criar os ${candidatos.length} evento(s) do dia ${diaSelecionado}/${String(
        mesAtivo
      ).padStart(2, "0")} na sua conta do Google Calendar:`,
      itensAfetados: candidatos.map(
        (c) => `${c.horario} — ${c.titulo} (${c.categoria.toUpperCase()})`
      ),
      onConfirmar: async () => {
        const criados: GoogleCalendarEventMapped[] = [];
        for (const ev of candidatos) {
          const criado = await criarEventoGoogleCalendar({
            titulo: ev.titulo,
            descricao: ev.subtitulo,
            local: ev.local,
            ano: anoAtivo,
            mes: mesAtivo,
            diaMes: ev.diaMes,
            horaInicio: ev.horario,
            duracaoMin: ev.duracaoMin || 60,
            categoria: ev.categoria,
          });
          criados.push(criado);
        }
        setEventosGoogle((prev) => [...prev, ...criados]);
        showToast(
          `${criados.length} evento(s) exportados para o seu Google Agenda!`
        );
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* BARRA SUPERIOR ESTILO GOOGLE AGENDA + CONEXÃO + SELETOR DE VISÃO (DIA / SEMANA / MÊS / PROGRAMAÇÃO) */}
      <section
        className="rounded-3xl p-4 sm:p-5 border space-y-4"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Título e Navegação de Data estilo Google Calendar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: `${t.action}18`, color: t.action }}
            >
              <CalendarIcon size={20} />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className="text-base sm:text-lg font-bold"
                  style={{ color: t.text }}
                >
                  {NOMES_MESES[mesAtivo - 1]} {anoAtivo}
                </h2>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    background: googleConnected
                      ? `${t.primary}18`
                      : `${t.finance}18`,
                    color: googleConnected ? t.primary : t.finance,
                  }}
                >
                  <Cloud size={11} />
                  {googleConnected
                    ? ultimaSyncGCal
                      ? `Google Agenda (${ultimaSyncGCal})`
                      : "Google Agenda Conectado"
                    : "Modo Local"}
                </span>
              </div>
              <p className="text-xs" style={{ color: t.textSoft }}>
                Sincronizado com Google Agenda + Filtros, Cores e Camadas da Casa
                da Lala
              </p>
            </div>

            {/* Botões < Hoje > */}
            <div className="flex items-center gap-1 ml-auto lg:ml-2">
              <button
                onClick={() =>
                  visao === "dia"
                    ? setDiaSelecionado((d) => Math.max(1, d - 1))
                    : visao === "semana"
                    ? setDiaSelecionado((d) => Math.max(1, d - 7))
                    : navegarMes(-1)
                }
                className="p-2 rounded-xl border cursor-pointer"
                style={{
                  background: t.bg,
                  borderColor: t.border,
                  color: t.text,
                }}
                title="Período anterior"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={irParaHoje}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer"
                style={{
                  background: t.bg,
                  borderColor: t.border,
                  color: t.action,
                }}
              >
                Hoje
              </button>
              <button
                onClick={() =>
                  visao === "dia"
                    ? setDiaSelecionado((d) => Math.min(diasNoMesCount, d + 1))
                    : visao === "semana"
                    ? setDiaSelecionado((d) => Math.min(diasNoMesCount, d + 7))
                    : navegarMes(1)
                }
                className="p-2 rounded-xl border cursor-pointer"
                style={{
                  background: t.bg,
                  borderColor: t.border,
                  color: t.text,
                }}
                title="Próximo período"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Alternador de Visualização igual ao Google Agenda + Botão + Criar + Contas/Agendas + Sincronizar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => abrirModalCriacaoRapida(diaSelecionado, "14:00", "evento")}
              className="px-3.5 py-2 rounded-2xl text-xs font-bold text-white flex items-center gap-1.5 shadow-sm cursor-pointer"
              style={{ background: t.action }}
              title="Criar novo Evento ou Tarefa estilo Google Agenda"
            >
              <Plus size={15} />
              <span>+ Criar Evento / Tarefa</span>
            </button>

            <div
              className="grid grid-cols-4 gap-1 p-1 rounded-2xl border"
              style={{ background: t.bg, borderColor: t.border }}
            >
              {(
                [
                  { id: "dia", label: "Dia", icon: Clock },
                  { id: "semana", label: "Semana", icon: Columns },
                  { id: "mes", label: "Mês", icon: LayoutGrid },
                  { id: "programacao", label: "Agenda", icon: CalendarDays },
                ] as const
              ).map((v) => {
                const Icon = v.icon;
                const ativo = visao === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => {
                      setVisao(v.id);
                      setConfigCalendario((prev) => ({
                        ...prev,
                        visaoPadrao: v.id,
                      }));
                    }}
                    className="py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    style={{
                      background: ativo ? t.action : "transparent",
                      color: ativo ? "#fff" : t.textSoft,
                    }}
                  >
                    <Icon size={12} />
                    <span>{v.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPainelContasAberto((v) => !v)}
              className="px-3 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              style={{
                background: painelContasAberto ? t.action : t.bg,
                color: painelContasAberto ? "#fff" : t.text,
                borderColor: painelContasAberto ? t.action : t.border,
              }}
              title="Conectar mais e-mails Google ou adicionar mais agendas"
            >
              <Cloud size={13} />
              <span>
                Contas & Agendas ({Math.max(googleConnected ? 1 : 0, contasGoogle.length) + calendariosExtras.length})
              </span>
            </button>

            <button
              onClick={() => sincronizarEventosDoMesGoogle(false)}
              disabled={sincronizandoGCal}
              className="px-3 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              style={{
                background: googleConnected ? `${t.primary}15` : t.action,
                color: googleConnected ? t.primary : "#fff",
                borderColor: googleConnected ? `${t.primary}40` : t.action,
              }}
              title="Sincronizar eventos com todas as suas contas do Google Agenda"
            >
              <RefreshCw
                size={13}
                className={sincronizandoGCal ? "animate-spin" : ""}
              />
              <span>
                {sincronizandoGCal
                  ? "Sincronizando..."
                  : googleConnected || contasGoogle.length > 0
                  ? "Sync Agendas"
                  : "Conectar Google"}
              </span>
            </button>

            <button
              onClick={() => setPainelConfigAberto((v) => !v)}
              className="px-3 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              style={{
                background: painelConfigAberto ? t.primary : t.bg,
                color: painelConfigAberto ? "#fff" : t.text,
                borderColor: t.border,
              }}
              title="Personalizar Cores, Filtros e Camadas do Calendário"
            >
              <SlidersHorizontal size={13} />
              <span>Cores & Camadas</span>
            </button>
          </div>
        </div>

        {/* PAINEL DE MÚLTIPLOS E-MAILS GOOGLE E AGENDAS EXTRAS */}
        {painelContasAberto && (
          <div
            className="p-4 rounded-2xl border space-y-4"
            style={{ background: t.bg, borderColor: t.border }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs sm:text-sm font-bold flex items-center gap-1.5" style={{ color: t.text }}>
                  <Cloud size={15} style={{ color: t.action }} />
                  Múltiplas Contas Google & Agendas Unificadas
                </h3>
                <p className="text-[11px]" style={{ color: t.textSoft }}>
                  Conecte 2 ou mais e-mails do Google (ex: pessoal + trabalho/UERJ) ou adicione o ID/e-mail de outras agendas para ver tudo unificado aqui:
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleConectarOutroEmailGoogle}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                  style={{ background: t.action }}
                >
                  <Plus size={13} /> Conectar Outro E-mail Google
                </button>
                <button
                  onClick={() => setPainelContasAberto(false)}
                  className="p-1.5 rounded-lg cursor-pointer"
                  style={{ color: t.textSoft }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Lista de Contas Google OAuth Conectadas */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.textSoft }}>
                E-mails Conectados via Login Google ({contasGoogle.length})
              </p>
              {contasGoogle.length === 0 ? (
                <div className="p-3 rounded-xl border text-xs flex items-center justify-between" style={{ background: t.card, borderColor: t.border }}>
                  <span style={{ color: t.textSoft }}>
                    Nenhuma conta Google listada ainda. Clique em "Conectar Outro E-mail Google" para vincular suas contas.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {contasGoogle.map((acc) => (
                    <div
                      key={acc.email}
                      className="p-3 rounded-xl border flex items-center justify-between gap-2"
                      style={{ background: t.card, borderColor: acc.active ? acc.colorHex : t.border }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ background: acc.colorHex }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: t.text }}>
                            {acc.displayName || acc.email}
                          </p>
                          <p className="text-[11px] truncate" style={{ color: t.textSoft }}>
                            {acc.email} · Todas as agendas da conta
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            const list = toggleConnectedGoogleAccount(acc.email);
                            setContasGoogle(list);
                            sincronizarEventosDoMesGoogle(true);
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer"
                          style={{
                            background: acc.active ? `${t.primary}18` : t.bg,
                            color: acc.active ? t.primary : t.textSoft,
                            borderColor: acc.active ? t.primary : t.border,
                          }}
                        >
                          {acc.active ? "Ativa" : "Pausada"}
                        </button>
                        <button
                          onClick={() => {
                            const list = removeConnectedGoogleAccount(acc.email);
                            setContasGoogle(list);
                            sincronizarEventosDoMesGoogle(true);
                          }}
                          className="p-1 rounded-lg cursor-pointer"
                          style={{ color: t.danger }}
                          title="Remover conta"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Adicionar Agenda de Outro E-mail ou ID de Calendário Compartilhado */}
            <div className="p-3 rounded-xl border space-y-2.5" style={{ background: t.card, borderColor: t.border }}>
              <p className="text-xs font-bold" style={{ color: t.text }}>
                Adicionar Agenda por E-mail ou ID do Google Calendar
              </p>
              <p className="text-[11px]" style={{ color: t.textSoft }}>
                Se você compartilha a agenda de outro e-mail com sua conta principal, digite o e-mail (ex: <code className="font-mono">outroemail@gmail.com</code>) abaixo para sincronizar também:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  value={novoCalIdInput}
                  onChange={(e) => setNovoCalIdInput(e.target.value)}
                  placeholder="E-mail da agenda ou ID (ex: segundo.email@gmail.com)"
                  className="sm:col-span-5 px-3 py-2 rounded-xl text-xs outline-none border"
                  style={{ background: t.bg, color: t.text, borderColor: t.border }}
                />
                <input
                  value={novoCalNomeInput}
                  onChange={(e) => setNovoCalNomeInput(e.target.value)}
                  placeholder="Apelido (ex: Agenda Trabalho, Pessoal 2)"
                  className="sm:col-span-4 px-3 py-2 rounded-xl text-xs outline-none border"
                  style={{ background: t.bg, color: t.text, borderColor: t.border }}
                />
                <div className="sm:col-span-3 flex items-center gap-2">
                  <input
                    type="color"
                    value={novoCalCorInput}
                    onChange={(e) => setNovoCalCorInput(e.target.value)}
                    className="w-9 h-9 rounded-xl border-0 cursor-pointer bg-transparent shrink-0"
                  />
                  <button
                    onClick={handleAdicionarCalendarioPorId}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white cursor-pointer"
                    style={{ background: t.primary }}
                  >
                    + Vincular
                  </button>
                </div>
              </div>

              {calendariosExtras.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {calendariosExtras.map((cal) => (
                    <div
                      key={cal.id}
                      className="px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-2"
                      style={{ background: t.bg, borderColor: cal.ativo ? cal.corHex : t.border }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: cal.corHex }} />
                      <button
                        onClick={() => {
                          setCalendariosExtras(toggleCustomCalendar(cal.id));
                          sincronizarEventosDoMesGoogle(true);
                        }}
                        className="font-semibold cursor-pointer"
                        style={{ color: cal.ativo ? t.text : t.textSoft }}
                      >
                        {cal.nome} ({cal.id})
                      </button>
                      <button
                        onClick={() => {
                          setCalendariosExtras(removeCustomCalendar(cal.id));
                          sincronizarEventosDoMesGoogle(true);
                        }}
                        className="cursor-pointer"
                        style={{ color: t.danger }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Filtro rápido por Conta/Agenda */}
            {(contasGoogle.length > 0 || calendariosExtras.length > 0) && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] font-bold mr-1" style={{ color: t.textSoft }}>
                  Filtrar por conta:
                </span>
                <button
                  onClick={() => setFiltroContaEmail("todas")}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer"
                  style={{
                    background: filtroContaEmail === "todas" ? t.action : t.card,
                    color: filtroContaEmail === "todas" ? "#fff" : t.textSoft,
                    borderColor: t.border,
                  }}
                >
                  Todas Unificadas
                </button>
                {contasGoogle.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => setFiltroContaEmail(acc.email)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 cursor-pointer"
                    style={{
                      background: filtroContaEmail === acc.email ? `${acc.colorHex}22` : t.card,
                      color: filtroContaEmail === acc.email ? acc.colorHex : t.textSoft,
                      borderColor: filtroContaEmail === acc.email ? acc.colorHex : t.border,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: acc.colorHex }} />
                    {acc.email}
                  </button>
                ))}
                {calendariosExtras.map((cal) => (
                  <button
                    key={cal.id}
                    onClick={() => setFiltroContaEmail(cal.id)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 cursor-pointer"
                    style={{
                      background: filtroContaEmail === cal.id ? `${cal.corHex}22` : t.card,
                      color: filtroContaEmail === cal.id ? cal.corHex : t.textSoft,
                      borderColor: filtroContaEmail === cal.id ? cal.corHex : t.border,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: cal.corHex }} />
                    {cal.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PAINEL EXPANSÍVEL DE CORES, CAMADAS E CONFIGURAÇÕES DO CALENDÁRIO DO APP */}
        {painelConfigAberto && (
          <div
            className="p-4 rounded-2xl border space-y-4"
            style={{ background: t.bg, borderColor: t.border }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                  <ListFilter size={15} style={{ color: t.primary }} />
                  Configurações, Camadas & Cores do Seu Calendário
                </h3>
                <p className="text-[11px]" style={{ color: t.textSoft }}>
                  Escolha o que aparece na sua agenda e personalize a cor de
                  cada área da sua vida:
                </p>
              </div>
              <button
                onClick={() => setPainelConfigAberto(false)}
                className="p-1 rounded-lg cursor-pointer"
                style={{ color: t.textSoft }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Toggles de Camadas Automáticas do App */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {(
                [
                  {
                    key: "mostrarGoogleAgenda",
                    label: "Google Agenda",
                  },
                  {
                    key: "mostrarAulasUERJ",
                    label: "Aulas & Provas UERJ",
                  },
                  {
                    key: "mostrarPets",
                    label: "Vacinas & Vet Pets",
                  },
                  {
                    key: "mostrarFinancas",
                    label: "Faturas & Vencimentos",
                  },
                  {
                    key: "mostrarRadar",
                    label: "Radar de Preparação",
                  },
                  {
                    key: "sincronizarAoCriarNoGoogle",
                    label: "Auto-enviar p/ Google",
                  },
                ] as const
              ).map((item) => {
                const ativo = Boolean(configCalendario[item.key]);
                return (
                  <button
                    key={item.key}
                    onClick={() =>
                      setConfigCalendario((prev) => ({
                        ...prev,
                        [item.key]: !prev[item.key],
                      }))
                    }
                    className="p-2.5 rounded-xl border text-left text-[11px] font-bold flex items-center justify-between gap-2 cursor-pointer"
                    style={{
                      background: ativo ? `${t.primary}15` : t.card,
                      borderColor: ativo ? t.primary : t.border,
                      color: ativo ? t.primary : t.textSoft,
                    }}
                  >
                    <span className="truncate">{item.label}</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        background: ativo ? t.primary : t.border,
                      }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Seletor de Cores por Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {(
                [
                  { id: "uerj", nome: "UERJ & Estudos" },
                  { id: "trabalho", nome: "Trabalho (CDT / RCR)" },
                  { id: "pets", nome: "Pets (Nina & Tobias)" },
                  { id: "financas", nome: "Finanças & Faturas" },
                  { id: "saude", nome: "Saúde & Treinos" },
                  { id: "pessoal", nome: "Pessoal & Rotina" },
                ] as const
              ).map((cat) => {
                const corAtual = getCorHexCategoria(cat.id);
                return (
                  <div
                    key={cat.id}
                    className="p-2.5 rounded-xl border flex items-center justify-between gap-2"
                    style={{ background: t.card, borderColor: t.border }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="color"
                        value={corAtual}
                        onChange={(e) =>
                          setConfigCalendario((prev) => ({
                            ...prev,
                            coresCategorias: {
                              ...prev.coresCategorias,
                              [cat.id]: e.target.value,
                            },
                          }))
                        }
                        className="w-6 h-6 rounded-lg border-0 cursor-pointer bg-transparent shrink-0"
                        title={`Escolher cor para ${cat.nome}`}
                      />
                      <span className="text-xs font-bold truncate">
                        {cat.nome}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {PALETA_CORES_SUGERIDAS.slice(0, 5).map((hex) => (
                        <button
                          key={hex}
                          onClick={() =>
                            setConfigCalendario((prev) => ({
                              ...prev,
                              coresCategorias: {
                                ...prev.coresCategorias,
                                [cat.id]: hex,
                              },
                            }))
                          }
                          className="w-4 h-4 rounded-full cursor-pointer border"
                          style={{
                            background: hex,
                            borderColor:
                              corAtual === hex ? t.text : "transparent",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FILTROS RÁPIDOS POR CATEGORIA COM CORES CUSTOMIZADAS */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIAS_FILTRO.map((cat) => {
            const Icon = cat.icon;
            const ativo = filtroCategoria === cat.id;
            const totalCat =
              cat.id === "todas"
                ? todosEventosMes.length
                : todosEventosMes.filter((e) => e.categoria === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => setFiltroCategoria(cat.id)}
                className="px-3 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 shrink-0 border transition-all cursor-pointer"
                style={{
                  background: ativo ? `${cat.corHex}18` : t.bg,
                  borderColor: ativo ? cat.corHex : t.border,
                  color: ativo ? t.text : t.textSoft,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: cat.corHex }}
                />
                <Icon size={13} style={{ color: cat.corHex }} />
                <span>{cat.label}</span>
                <span
                  className="text-[10px] font-mono-num px-1.5 py-0.5 rounded-md"
                  style={{ background: t.card, color: t.textSoft }}
                >
                  {totalCat}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* BARRA RÁPIDA DE CRIAÇÃO DIRETA NA AGENDA (1 CLIQUE OU ENTER, SEM MODAIS DESNECESSÁRIOS) */}
      <section
        className="rounded-3xl p-3.5 sm:p-4 border flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div
            className="flex gap-1 p-0.5 rounded-xl border"
            style={{ background: t.bg, borderColor: t.border }}
          >
            <button
              type="button"
              onClick={() => {
                setTipoItemModal("evento");
                if (novaDuracao === 15) setNovaDuracao(60);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
              style={{
                background:
                  tipoItemModal === "evento" ? t.action : "transparent",
                color: tipoItemModal === "evento" ? "#fff" : t.textSoft,
              }}
            >
              Evento
            </button>
            <button
              type="button"
              onClick={() => {
                setTipoItemModal("tarefa");
                if (novaDuracao === 60) setNovaDuracao(15);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
              style={{
                background:
                  tipoItemModal === "tarefa" ? t.primary : "transparent",
                color: tipoItemModal === "tarefa" ? "#fff" : t.textSoft,
              }}
            >
              Tarefa
            </button>
          </div>

          <input
            type="date"
            value={`${anoAtivo}-${String(mesAtivo).padStart(2, "0")}-${String(
              diaSelecionado
            ).padStart(2, "0")}`}
            onChange={(e) => {
              const parts = e.target.value.split("-").map(Number);
              if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
                setAnoAtivo(parts[0]);
                setMesAtivo(parts[1]);
                setDiaSelecionado(parts[2]);
              }
            }}
            className="px-2.5 py-1.5 rounded-xl text-xs font-mono-num font-bold border outline-none"
            style={{
              background: t.bg,
              color: t.text,
              borderColor: t.border,
            }}
          />

          <input
            type="time"
            value={novaHora}
            onChange={(e) => setNovaHora(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-mono-num font-bold border outline-none"
            style={{
              background: t.bg,
              color: t.text,
              borderColor: t.border,
            }}
          />

          <select
            value={novaDuracao}
            onChange={(e) => setNovaDuracao(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-xl text-xs font-mono-num font-bold border outline-none"
            style={{
              background: t.bg,
              color: t.text,
              borderColor: t.border,
            }}
            title="Duração proporcional na agenda"
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>1h</option>
            <option value={90}>1h30</option>
            <option value={120}>2h</option>
          </select>

          <select
            value={novaCat}
            onChange={(e) =>
              setNovaCat(e.target.value as CategoriaCalendarioApp)
            }
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold border outline-none"
            style={{
              background: t.bg,
              color: t.text,
              borderColor: t.border,
            }}
          >
            <option value="pessoal">Pessoal</option>
            <option value="uerj">UERJ</option>
            <option value="trabalho">Trabalho</option>
            <option value="pets">Pets</option>
            <option value="financas">Finanças</option>
            <option value="saude">Saúde/Treino</option>
          </select>
        </div>

        <input
          value={novoTitulo}
          onChange={(e) => setNovoTitulo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAgendarCompromisso()}
          placeholder={`Criação rápida em ${String(diaSelecionado).padStart(
            2,
            "0"
          )}/${String(mesAtivo).padStart(
            2,
            "0"
          )} às ${novaHora}: digite o título e aperte Enter...`}
          className="flex-1 px-3.5 py-2 rounded-xl text-xs font-semibold border outline-none"
          style={{
            background: t.bg,
            color: t.text,
            borderColor: t.border,
          }}
        />

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAgendarCompromisso}
            className="flex-1 lg:flex-initial px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            style={{
              background: tipoItemModal === "tarefa" ? t.primary : t.action,
            }}
          >
            <Plus size={14} /> Agendar Agora
          </button>
          <button
            type="button"
            onClick={() =>
              abrirModalCriacaoRapida(diaSelecionado, novaHora, tipoItemModal)
            }
            className="px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer"
            style={{
              background: t.bg,
              color: t.textSoft,
              borderColor: t.border,
            }}
            title="Abrir mais opções (local, descrição, duração, conta Google)"
          >
            Mais opções
          </button>
        </div>
      </section>

      {/* CORPO PRINCIPAL DO CALENDÁRIO: VISÃO SELECIONADA (ESQUERDA) + PAINEL DO DIA E CRIAÇÃO (DIREITA) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <section
          className="xl:col-span-8 rounded-3xl p-4 sm:p-5 border space-y-4"
          style={{ background: t.card, borderColor: t.border }}
        >
          {/* MODO 1: VISÃO MENSAL (ESTILO GOOGLE AGENDA COM PÍLULAS COLORIDAS) */}
          {visao === "mes" && (
            <>
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {DIAS_SEMANA_CURTO.map((dia) => (
                  <div
                    key={dia}
                    className="text-[11px] font-bold uppercase py-1"
                    style={{ color: t.textSoft }}
                  >
                    {dia}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: offsetInicioMes }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="h-20 sm:h-28 rounded-2xl opacity-25"
                    style={{ background: t.bg }}
                  />
                ))}

                {diasNoMesArray.map((dia) => {
                  const isHoje =
                    dia === hojeReal.getDate() &&
                    mesAtivo === hojeReal.getMonth() + 1 &&
                    anoAtivo === hojeReal.getFullYear();
                  const isSelecionado = dia === diaSelecionado;
                  const isDropTarget = dropTargetDia === dia;
                  const evsDia = eventosFiltrados.filter(
                    (e) => e.diaMes === dia
                  );

                  return (
                    <div
                      key={dia}
                      onClick={() => {
                        if (dia === diaSelecionado) {
                          abrirModalCriacaoRapida(dia, "14:00", "evento");
                        } else {
                          setDiaSelecionado(dia);
                        }
                      }}
                      onDoubleClick={() =>
                        abrirModalCriacaoRapida(dia, "14:00", "evento")
                      }
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dropTargetDia !== dia) setDropTargetDia(dia);
                      }}
                      onDragLeave={() => {
                        if (dropTargetDia === dia) setDropTargetDia(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDropTargetDia(null);
                        if (eventoArrastando) {
                          handleMoverEventoNoCalendario(eventoArrastando, dia);
                          setEventoArrastando(null);
                        }
                      }}
                      className="group h-24 sm:h-32 p-1.5 sm:p-2 rounded-2xl border flex flex-col justify-between text-left transition-all cursor-pointer relative overflow-hidden"
                      style={{
                        background: isDropTarget
                          ? `${t.primary}22`
                          : isSelecionado
                          ? `${t.action}14`
                          : isHoje
                          ? t.cardSubtle
                          : t.bg,
                        borderColor: isDropTarget
                          ? t.primary
                          : isSelecionado
                          ? t.action
                          : isHoje
                          ? t.primary
                          : t.border,
                        borderWidth: isDropTarget ? "2px" : "1px",
                      }}
                      title="Clique para selecionar ou arraste qualquer evento para este dia"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className="text-xs font-mono-num font-bold w-6 h-6 rounded-full flex items-center justify-center"
                          style={{
                            background: isHoje ? t.primary : "transparent",
                            color: isHoje
                              ? "#fff"
                              : isSelecionado
                              ? t.action
                              : t.text,
                          }}
                        >
                          {dia}
                        </span>
                        <div className="flex items-center gap-1">
                          {evsDia.some((x) => x.origem === "gcal") && (
                            <span
                              title="Sincronizado com Google Agenda"
                              className="inline-flex items-center"
                            >
                              <Cloud
                                size={11}
                                style={{ color: t.action }}
                              />
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirModalCriacaoRapida(dia, "14:00", "evento");
                            }}
                            className="w-5 h-5 rounded-lg flex items-center justify-center opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            style={{
                              background: `${t.action}20`,
                              color: t.action,
                            }}
                            title={`Adicionar Evento ou Tarefa no dia ${dia}`}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Pílulas de eventos estilo Google Calendar (arrastáveis entre dias) */}
                      <div className="space-y-1 w-full overflow-hidden">
                        {evsDia.slice(0, 3).map((ev) => {
                          const corCat = getCorHexCategoria(
                            ev.categoria,
                            ev.corCustomHex
                          );
                          return (
                            <div
                              key={ev.id}
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                setEventoArrastando(ev);
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.setData("text/plain", ev.id);
                              }}
                              onDragEnd={() => {
                                setEventoArrastando(null);
                                setDropTargetDia(null);
                                setDropTargetHora(null);
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirEventoNoCalendario(ev);
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold truncate flex items-center gap-1 hover:opacity-90 cursor-grab active:cursor-grabbing select-none"
                              style={{
                                background: `${corCat}22`,
                                color: corCat,
                                borderLeft: `2.5px solid ${corCat}`,
                                textDecoration: ev.concluido
                                  ? "line-through"
                                  : "none",
                                opacity:
                                  eventoArrastando?.id === ev.id ? 0.45 : 1,
                              }}
                              title={`Arraste para mudar de dia · ${ev.horario} ${ev.titulo}${
                                ev.ehRecorrente ? " (Evento Recorrente ↻)" : ""
                              }`}
                            >
                              <span className="font-mono-num hidden sm:inline">
                                {ev.horario}
                              </span>
                              <span className="truncate">
                                {ev.ehRecorrente ? "↻ " : ""}
                                {ev.titulo}
                              </span>
                            </div>
                          );
                        })}
                        {evsDia.length > 3 && (
                          <p
                            className="text-[9px] font-bold pl-1"
                            style={{ color: t.textSoft }}
                          >
                            +{evsDia.length - 3} mais
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* MODO 2: VISÃO SEMANAL EM GRADE DE HORÁRIOS (ESTILO GOOGLE AGENDA) */}
          {visao === "semana" && (
            <div className="space-y-3">
              {/* Cabeçalho dos 7 dias da semana */}
              <div className="grid grid-cols-8 gap-1.5 border-b pb-2" style={{ borderColor: t.border }}>
                <div className="text-[10px] font-mono-num font-bold flex items-center justify-center" style={{ color: t.textSoft }}>
                  GMT-3
                </div>
                {diasVisaoSemanal.map((dia, idx) => {
                  const isSel = dia === diaSelecionado;
                  return (
                    <button
                      key={idx}
                      disabled={!dia}
                      onClick={() =>
                        dia && abrirModalCriacaoRapida(dia, "14:00", "evento")
                      }
                      className="p-1.5 rounded-xl text-center transition-all cursor-pointer disabled:opacity-30"
                      style={{
                        background: isSel ? t.action : t.bg,
                        color: isSel ? "#fff" : t.text,
                      }}
                    >
                      <p className="text-[10px] font-bold uppercase">
                        {DIAS_SEMANA_CURTO[idx]}
                      </p>
                      <p className="text-xs sm:text-sm font-mono-num font-bold">
                        {dia ?? "—"}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Grade Horária Semanal Proporcional (1h = 64px, 15min = 16px = 1/4 do slot) */}
              <div className="max-h-[560px] overflow-y-auto pr-1">
                {horasGrade.map((hora) => {
                  const prefixoHora = String(hora).padStart(2, "0");
                  return (
                    <div
                      key={hora}
                      className="grid grid-cols-8 gap-1.5 h-[64px] border-b relative"
                      style={{ borderColor: `${t.border}80` }}
                    >
                      <div
                        className="text-[11px] font-mono-num font-semibold flex items-start justify-center pt-1 select-none"
                        style={{ color: t.textSoft }}
                      >
                        {prefixoHora}:00
                      </div>

                      {diasVisaoSemanal.map((dia, cIdx) => {
                        if (!dia) {
                          return (
                            <div
                              key={cIdx}
                              className="rounded-lg opacity-20 h-full"
                              style={{ background: t.bg }}
                            />
                          );
                        }
                        const evsSlot = eventosFiltrados.filter((e) => {
                          if (e.diaMes !== dia) return false;
                          const hEv = parseInt(
                            (e.horario || "09:00").split(":")[0],
                            10
                          );
                          return hEv === hora;
                        });

                        return (
                          <div
                            key={cIdx}
                            onClick={(e) => {
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              const relY = Math.max(
                                0,
                                Math.min(63, e.clientY - rect.top)
                              );
                              const quarto = Math.floor((relY / 64) * 4) * 15;
                              const minStr = String(quarto).padStart(2, "0");
                              abrirModalCriacaoRapida(
                                dia,
                                `${prefixoHora}:${minStr}`,
                                tipoItemModal
                              );
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              const relY = Math.max(
                                0,
                                Math.min(63, e.clientY - rect.top)
                              );
                              const quarto = Math.floor((relY / 64) * 4) * 15;
                              const horaAlvo = `${prefixoHora}:${String(
                                quarto
                              ).padStart(2, "0")}`;
                              if (dropTargetDia !== dia) setDropTargetDia(dia);
                              if (dropTargetHora !== horaAlvo)
                                setDropTargetHora(horaAlvo);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              const relY = Math.max(
                                0,
                                Math.min(63, e.clientY - rect.top)
                              );
                              const quarto = Math.floor((relY / 64) * 4) * 15;
                              const horaAlvo = `${prefixoHora}:${String(
                                quarto
                              ).padStart(2, "0")}`;
                              setDropTargetDia(null);
                              setDropTargetHora(null);
                              if (eventoArrastando) {
                                handleMoverEventoNoCalendario(
                                  eventoArrastando,
                                  dia,
                                  horaAlvo
                                );
                                setEventoArrastando(null);
                              }
                            }}
                            className="rounded-lg relative cursor-pointer transition-colors hover:opacity-90 overflow-visible"
                            style={{
                              background:
                                dropTargetDia === dia &&
                                dropTargetHora?.startsWith(prefixoHora)
                                  ? `${t.primary}22`
                                  : dia === diaSelecionado
                                  ? `${t.action}08`
                                  : t.bg,
                            }}
                            title={`Clique ou arraste um evento para o dia ${dia} (${prefixoHora}:00, :15, :30 ou :45)`}
                          >
                            {/* Linha guia de 30 min no meio da hora */}
                            <div
                              className="absolute left-0 right-0 top-1/2 border-t border-dashed pointer-events-none opacity-35"
                              style={{ borderColor: t.border }}
                            />

                            {evsSlot.map((ev, evIdx) => {
                              const corCat = getCorHexCategoria(
                                ev.categoria,
                                ev.corCustomHex
                              );
                              const minInicio =
                                parseInt(
                                  (ev.horario || "09:00").split(":")[1] || "0",
                                  10
                                ) || 0;
                              const durMin = Math.max(
                                10,
                                ev.duracaoMin ||
                                  calcularDuracaoEntreHoras(
                                    ev.horario,
                                    ev.horaFim,
                                    60
                                  )
                              );
                              const topPct = (minInicio / 60) * 100;
                              const heightPx = Math.max(
                                15,
                                Math.round((durMin / 60) * 64)
                              );
                              const totalMesmoSlot = evsSlot.length;
                              const widthPct = 100 / totalMesmoSlot;
                              const leftPct = evIdx * widthPct;

                              return (
                                <div
                                  key={ev.id}
                                  draggable
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    setEventoArrastando(ev);
                                    e.dataTransfer.effectAllowed = "move";
                                    e.dataTransfer.setData("text/plain", ev.id);
                                  }}
                                  onDragEnd={() => {
                                    setEventoArrastando(null);
                                    setDropTargetDia(null);
                                    setDropTargetHora(null);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    abrirEventoNoCalendario(ev);
                                  }}
                                  className="absolute z-10 px-1 rounded-md text-[10px] font-bold leading-none flex items-center truncate shadow-2xs cursor-grab active:cursor-grabbing select-none"
                                  style={{
                                    top: `${topPct}%`,
                                    height: `${heightPx}px`,
                                    left: `${leftPct}%`,
                                    width: `${widthPct}%`,
                                    background:
                                      t.mode === "light"
                                        ? `${corCat}26`
                                        : `${corCat}38`,
                                    color: corCat,
                                    borderLeft: `3px solid ${corCat}`,
                                    opacity:
                                      eventoArrastando?.id === ev.id ? 0.45 : 1,
                                  }}
                                  title={`Arraste para mudar de dia/horário · ${
                                    ev.horario
                                  }${
                                    ev.horaFim ? `–${ev.horaFim}` : ""
                                  } (${durMin} min) — ${ev.titulo}`}
                                >
                                  <span className="truncate">
                                    {ev.ehRecorrente ? "↻ " : ""}
                                    {ev.titulo}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODO 3: VISÃO DIÁRIA PROPORCIONAL AO TEMPO REAL (15 MIN = 1/4 DA HORA, 30 MIN = 1/2, 60 MIN = 1 HORA) */}
          {visao === "dia" && (
            <div className="space-y-3">
              <div
                className="flex items-center justify-between border-b pb-2.5 flex-wrap gap-2"
                style={{ borderColor: t.border }}
              >
                <div>
                  <span
                    className="text-xs font-bold uppercase"
                    style={{ color: t.action }}
                  >
                    Visão Diária Proporcional (Escala de 15 min)
                  </span>
                  <h3 className="text-base font-bold" style={{ color: t.text }}>
                    {
                      DIAS_SEMANA_CURTO[
                        (diaSelecionado + offsetInicioMes - 1) % 7
                      ]
                    }
                    , {diaSelecionado} de {NOMES_MESES[mesAtivo - 1]} de{" "}
                    {anoAtivo}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-mono-num px-2.5 py-1 rounded-xl border"
                    style={{
                      background: t.bg,
                      color: t.textSoft,
                      borderColor: t.border,
                    }}
                  >
                    15 min = 1/4 da hora · 30 min = 1/2
                  </span>
                  <span
                    className="text-xs font-mono-num font-bold px-3 py-1 rounded-xl"
                    style={{ background: t.cardSubtle, color: t.primary }}
                  >
                    {eventosDoDiaSelecionado.length} evento(s)
                  </span>
                </div>
              </div>

              {/* RÉGUA PROPORCIONAL CONTÍNUA DO DIA: 1 HORA = 96px (4 FAIXAS DE 15 MIN = 24px CADA) */}
              {(() => {
                const HORA_ALTURA_PX = 96; // 96px por hora => 24px a cada 15 min (1.6px por minuto)
                const PX_POR_MIN = HORA_ALTURA_PX / 60;
                const horaMinimaGrade = horasGrade[0] ?? 7;
                const totalHoras = horasGrade.length;
                const alturaCanvasDiaPx = totalHoras * HORA_ALTURA_PX;

                // Prepara eventos do dia com minutos de início/fim e colunas caso haja sobreposição no mesmo horário
                const evsPosicionados = eventosDoDiaSelecionado
                  .map((ev) => {
                    const [hh, mm] = (ev.horario || "09:00")
                      .split(":")
                      .map(Number);
                    const inicioMin =
                      (isNaN(hh) ? 9 : hh) * 60 + (isNaN(mm) ? 0 : mm);
                    const durMin = Math.max(
                      10,
                      ev.duracaoMin ||
                        calcularDuracaoEntreHoras(ev.horario, ev.horaFim, 60)
                    );
                    const fimMin = inicioMin + durMin;
                    return { ev, inicioMin, fimMin, durMin };
                  })
                  .sort(
                    (a, b) =>
                      a.inicioMin - b.inicioMin || b.durMin - a.durMin
                  );

                return (
                  <div className="max-h-[580px] overflow-y-auto pr-1 no-scrollbar">
                    <div
                      className="relative w-full rounded-2xl border overflow-hidden select-none"
                      style={{
                        height: `${alturaCanvasDiaPx}px`,
                        background: t.bg,
                        borderColor: t.border,
                      }}
                    >
                      {/* 1. FAIXAS DE HORA (96px) E SUB-FAIXAS CLICÁVEIS DE 15 MIN (24px CADA) */}
                      {horasGrade.map((hora, idxHora) => {
                        const prefixoHora = String(hora).padStart(2, "0");
                        const topHoraPx = idxHora * HORA_ALTURA_PX;

                        return (
                          <div
                            key={hora}
                            className="absolute left-0 right-0 border-b"
                            style={{
                              top: `${topHoraPx}px`,
                              height: `${HORA_ALTURA_PX}px`,
                              borderColor: t.border,
                            }}
                          >
                            {/* Coluna Esquerda: Rótulo da Hora e Marcas :15, :30, :45 */}
                            <div
                              className="absolute left-0 top-0 bottom-0 w-[62px] border-r flex flex-col justify-between py-1 px-2 pointer-events-none"
                              style={{
                                borderColor: `${t.border}90`,
                                background: `${t.card}90`,
                              }}
                            >
                              <span
                                className="text-xs font-mono-num font-bold leading-none"
                                style={{ color: t.text }}
                              >
                                {prefixoHora}:00
                              </span>
                              <span
                                className="text-[9px] font-mono-num leading-none opacity-65"
                                style={{ color: t.textSoft }}
                              >
                                {prefixoHora}:30
                              </span>
                              <span className="text-[9px] opacity-0">.</span>
                            </div>

                            {/* 4 Sub-faixas de 15 minutos (:00, :15, :30, :45) — cada uma ocupa exatos 25% (24px) da hora */}
                            {[0, 15, 30, 45].map((minutoQuarto, qIdx) => {
                              const minStr = String(minutoQuarto).padStart(
                                2,
                                "0"
                              );
                              const horaQuartoStr = `${prefixoHora}:${minStr}`;
                              const quartoInicioMin = hora * 60 + minutoQuarto;
                              const quartoFimMin = quartoInicioMin + 15;
                              const ocupadoNesseQuarto = evsPosicionados.some(
                                (item) =>
                                  item.inicioMin < quartoFimMin &&
                                  item.fimMin > quartoInicioMin
                              );

                              return (
                                <div
                                  key={minutoQuarto}
                                  onClick={() =>
                                    abrirModalCriacaoRapida(
                                      diaSelecionado,
                                      horaQuartoStr,
                                      tipoItemModal
                                    )
                                  }
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = "move";
                                    if (dropTargetDia !== diaSelecionado)
                                      setDropTargetDia(diaSelecionado);
                                    if (dropTargetHora !== horaQuartoStr)
                                      setDropTargetHora(horaQuartoStr);
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    setDropTargetDia(null);
                                    setDropTargetHora(null);
                                    if (eventoArrastando) {
                                      handleMoverEventoNoCalendario(
                                        eventoArrastando,
                                        diaSelecionado,
                                        horaQuartoStr
                                      );
                                      setEventoArrastando(null);
                                    }
                                  }}
                                  className="group absolute left-[62px] right-0 flex items-center px-3 cursor-pointer transition-colors hover:bg-black/5"
                                  style={{
                                    top: `${qIdx * 24}px`,
                                    height: "24px",
                                    background:
                                      dropTargetHora === horaQuartoStr
                                        ? `${t.primary}22`
                                        : "transparent",
                                    borderTop:
                                      qIdx === 0
                                        ? "none"
                                        : qIdx === 2
                                        ? `1px dashed ${t.border}`
                                        : `1px dotted ${t.border}75`,
                                  }}
                                  title={`Clique ou solte um evento às ${horaQuartoStr}`}
                                >
                                  {!ocupadoNesseQuarto && (
                                    <span
                                      className={`text-[10px] italic flex items-center gap-1 transition-opacity ${
                                        qIdx === 0
                                          ? "opacity-55 group-hover:opacity-100"
                                          : "opacity-0 group-hover:opacity-90"
                                      }`}
                                      style={{ color: t.textSoft }}
                                    >
                                      <Plus size={10} />{" "}
                                      {qIdx === 0
                                        ? `Clique ou arraste p/ ${horaQuartoStr}`
                                        : `+ Agendar às ${horaQuartoStr}`}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}

                      {/* 2. BLOCOS PROPORCIONAIS DE EVENTOS E TAREFAS (15 min = 24px = 1/4 da hora; 30 min = 48px = 1/2; 60 min = 96px = 1h) — ARRASTÁVEIS! */}
                      {evsPosicionados.map((item, idx) => {
                        const { ev, inicioMin, fimMin, durMin } = item;
                        const isBeingDraggedVert =
                          dragVerticalDia?.ev.id === ev.id;
                        const minEfetivo = isBeingDraggedVert
                          ? dragVerticalDia.previewMin
                          : inicioMin;
                        const horaExibida = isBeingDraggedVert
                          ? `${String(Math.floor(minEfetivo / 60)).padStart(
                              2,
                              "0"
                            )}:${String(minEfetivo % 60).padStart(2, "0")}`
                          : ev.horario;
                        const horaFimExibida = isBeingDraggedVert
                          ? calcularHoraFim(horaExibida, durMin)
                          : ev.horaFim;

                        const corCat = getCorHexCategoria(
                          ev.categoria,
                          ev.corCustomHex
                        );
                        const offsetMinDesdeTopo = Math.max(
                          0,
                          minEfetivo - horaMinimaGrade * 60
                        );
                        const topPx = offsetMinDesdeTopo * PX_POR_MIN;
                        // Altura estritamente proporcional aos minutos reais (15 min = 24px, 30 min = 48px, 60 min = 96px)
                        const heightPx = Math.max(
                          20,
                          Math.round(durMin * PX_POR_MIN)
                        );

                        // Verifica sobreposição com outros eventos no mesmo intervalo para dividir largura lado a lado
                        const concorrentes = evsPosicionados.filter(
                          (outro) =>
                            outro.inicioMin < fimMin &&
                            outro.fimMin > inicioMin
                        );
                        const colIdx = Math.max(
                          0,
                          concorrentes.findIndex((c) => c.ev.id === ev.id)
                        );
                        const totalCols = Math.max(1, concorrentes.length);
                        const larguraPct = 100 / totalCols;
                        const leftPct = colIdx * larguraPct;

                        const isCurto = durMin <= 20; // 15 min cabe em 1 linha compacta ocupando apenas 1/4 da hora
                        const isMedio = durMin > 20 && durMin <= 45;

                        return (
                          <div
                            key={ev.id || idx}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              setEventoArrastando(ev);
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", ev.id);
                            }}
                            onDragEnd={() => {
                              setEventoArrastando(null);
                              setDropTargetDia(null);
                              setDropTargetHora(null);
                            }}
                            onMouseDown={(e) => {
                              if (e.button !== 0) return;
                              e.stopPropagation();
                              setDragVerticalDia({
                                ev,
                                startY: e.clientY,
                                origMin: inicioMin,
                                previewMin: inicioMin,
                                moved: false,
                              });
                            }}
                            onTouchStart={(e) => {
                              const touch = e.touches[0];
                              if (!touch) return;
                              e.stopPropagation();
                              setDragVerticalDia({
                                ev,
                                startY: touch.clientY,
                                origMin: inicioMin,
                                previewMin: inicioMin,
                                moved: false,
                              });
                            }}
                            style={{
                              top: `${topPx + 1}px`,
                              height: `${Math.max(18, heightPx - 2)}px`,
                              left: `calc(66px + (100% - 74px) * ${
                                leftPct / 100
                              })`,
                              width: `calc((100% - 74px) * ${
                                larguraPct / 100
                              } - 2px)`,
                              background: isBeingDraggedVert
                                ? `${corCat}45`
                                : t.mode === "light"
                                ? `${corCat}22`
                                : `${corCat}35`,
                              borderColor: corCat,
                              borderLeftWidth: "4px",
                              zIndex: isBeingDraggedVert ? 30 : 10,
                            }}
                            className="absolute rounded-xl border px-2.5 overflow-hidden cursor-grab active:cursor-grabbing shadow-2xs transition-opacity hover:opacity-95 flex items-center select-none"
                            title={`Arraste verticalmente (15 em 15 min) ou clique para editar · ${horaExibida}${
                              horaFimExibida ? `–${horaFimExibida}` : ""
                            } (${durMin} min) · ${ev.titulo}`}
                          >
                            {isCurto ? (
                              /* Bloco de 15 min: compacto em linha única para ocupar apenas 1/4 (24px) da hora e deixar os outros 45 min livres! */
                              <div className="flex items-center justify-between gap-2 w-full min-w-0 leading-none">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className="text-[10px] font-mono-num font-bold shrink-0"
                                    style={{ color: corCat }}
                                  >
                                    {horaExibida}
                                    {horaFimExibida ? `–${horaFimExibida}` : ""}
                                  </span>
                                  <span
                                    className="text-xs font-bold truncate"
                                    style={{
                                      color: t.text,
                                      textDecoration: ev.concluido
                                        ? "line-through"
                                        : "none",
                                    }}
                                  >
                                    {ev.ehRecorrente ? "↻ " : ""}
                                    {ev.titulo}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span
                                    className="text-[9px] font-mono-num font-bold px-1.5 py-0.5 rounded"
                                    style={{
                                      background: t.card,
                                      color: corCat,
                                    }}
                                  >
                                    {durMin}m
                                  </span>
                                  <span
                                    className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded hidden sm:inline"
                                    style={{
                                      background: t.card,
                                      color: corCat,
                                    }}
                                  >
                                    {ev.categoria}
                                  </span>
                                  {ev.origem === "gcal" && (
                                    <span
                                      className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5"
                                      style={{
                                        background: t.card,
                                        color: t.action,
                                      }}
                                    >
                                      <Cloud size={9} /> Google
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : isMedio ? (
                              /* Bloco de 30 a 45 min: ocupa 2/4 (48px) ou 3/4 (72px) da hora */
                              <div className="w-full py-1 flex flex-col justify-center min-w-0">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                      className="text-[11px] font-mono-num font-bold shrink-0"
                                      style={{ color: corCat }}
                                    >
                                      {horaExibida}
                                      {horaFimExibida
                                        ? `–${horaFimExibida}`
                                        : ""}{" "}
                                      ({durMin}m)
                                    </span>
                                    <span
                                      className="text-xs font-bold truncate"
                                      style={{
                                        color: t.text,
                                        textDecoration: ev.concluido
                                          ? "line-through"
                                          : "none",
                                      }}
                                    >
                                      {ev.ehRecorrente ? "↻ " : ""}
                                      {ev.titulo}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span
                                      className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                                      style={{
                                        background: t.card,
                                        color: corCat,
                                      }}
                                    >
                                      {ev.categoria}
                                    </span>
                                    {ev.origem === "gcal" && (
                                      <span
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"
                                        style={{
                                          background: t.card,
                                          color: t.action,
                                        }}
                                      >
                                        <Cloud size={9} /> Google
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p
                                  className="text-[10px] truncate mt-0.5"
                                  style={{ color: t.textSoft }}
                                >
                                  {ev.subtitulo}
                                </p>
                              </div>
                            ) : (
                              /* Bloco de 60 min ou mais (1h = 96px, 2h = 192px): ocupa a(s) hora(s) inteira(s) proporcionalmente */
                              <div className="w-full h-full py-2 flex flex-col justify-between min-w-0">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className="text-xs font-mono-num font-bold"
                                      style={{ color: corCat }}
                                    >
                                      {horaExibida}
                                      {horaFimExibida
                                        ? `–${horaFimExibida}`
                                        : ""}{" "}
                                      ({durMin} min)
                                    </span>
                                    {ev.ehRecorrente && (
                                      <span
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                        style={{
                                          background: `${corCat}20`,
                                          color: corCat,
                                        }}
                                      >
                                        ↻ Recorrente
                                      </span>
                                    )}
                                    <span
                                      className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                                      style={{
                                        background: t.card,
                                        color: corCat,
                                      }}
                                    >
                                      {ev.categoria}
                                    </span>
                                    {ev.origem === "gcal" && (
                                      <span
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"
                                        style={{
                                          background: t.card,
                                          color: t.action,
                                        }}
                                      >
                                        <Cloud size={10} /> Google
                                      </span>
                                    )}
                                  </div>
                                  <p
                                    className="text-xs sm:text-sm font-bold mt-1 truncate"
                                    style={{
                                      color: t.text,
                                      textDecoration: ev.concluido
                                        ? "line-through"
                                        : "none",
                                    }}
                                  >
                                    {ev.titulo}
                                  </p>
                                </div>
                                <p
                                  className="text-[11px] truncate"
                                  style={{ color: t.textSoft }}
                                >
                                  {ev.subtitulo}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* MODO 4: VISÃO PROGRAMAÇÃO / AGENDA (LISTA CRONOLÓGICA DO MÊS ESTILO GOOGLE AGENDA) */}
          {visao === "programacao" && (
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {diasNoMesArray.map((dia) => {
                const evsDia = eventosFiltrados.filter((e) => e.diaMes === dia);
                if (evsDia.length === 0) return null;
                const nomeSem =
                  DIAS_SEMANA_CURTO[(dia + offsetInicioMes - 1) % 7];

                return (
                  <div
                    key={dia}
                    onClick={() => setDiaSelecionado(dia)}
                    className="p-3.5 rounded-2xl border space-y-2 cursor-pointer"
                    style={{
                      background:
                        dia === diaSelecionado ? `${t.action}10` : t.bg,
                      borderColor:
                        dia === diaSelecionado ? t.action : t.border,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-mono-num font-bold px-2.5 py-1 rounded-xl"
                        style={{
                          background:
                            dia === diaSelecionado ? t.action : t.cardSubtle,
                          color: dia === diaSelecionado ? "#fff" : t.text,
                        }}
                      >
                        {nomeSem}, {String(dia).padStart(2, "0")}/
                        {String(mesAtivo).padStart(2, "0")}
                      </span>
                      <span
                        className="text-[11px] font-mono-num"
                        style={{ color: t.textSoft }}
                      >
                        {evsDia.length} evento(s)
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {evsDia.map((ev) => {
                        const corCat = getCorHexCategoria(ev.categoria);
                        return (
                          <div
                            key={ev.id}
                            className="p-2.5 rounded-xl flex items-center justify-between gap-2"
                            style={{
                              background: t.card,
                              borderLeft: `4px solid ${corCat}`,
                            }}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-xs font-mono-num font-bold"
                                  style={{ color: corCat }}
                                >
                                  {ev.horario}
                                </span>
                                <span
                                  className="text-xs font-bold truncate"
                                  style={{ color: t.text }}
                                >
                                  {ev.titulo}
                                </span>
                              </div>
                              <p
                                className="text-[11px] truncate"
                                style={{ color: t.textSoft }}
                              >
                                {ev.subtitulo}
                              </p>
                            </div>
                            <span
                              className="text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0"
                              style={{
                                background: `${corCat}18`,
                                color: corCat,
                              }}
                            >
                              {ev.categoria}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {eventosFiltrados.length === 0 && (
                <div className="p-8 text-center space-y-2">
                  <p className="text-sm font-bold">
                    Nenhum evento encontrado para este filtro em{" "}
                    {NOMES_MESES[mesAtivo - 1]}
                  </p>
                  <p className="text-xs" style={{ color: t.textSoft }}>
                    Crie um evento ao lado, fale com a Lala ou sincronize seu
                    Google Agenda.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* COLUNA DIREITA (4 COLUNAS): DETALHES DO DIA SELECIONADO + SINCRONIZAÇÃO GOOGLE + FORMULÁRIO */}
        <section
          className="xl:col-span-4 rounded-3xl p-4 sm:p-5 border space-y-4"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: t.action }}
              >
                Agenda do Dia Selecionado
              </span>
              <h3 className="text-base font-bold" style={{ color: t.text }}>
                Dia {diaSelecionado} de {NOMES_MESES[mesAtivo - 1]} ·{" "}
                {DIAS_SEMANA_CURTO[(diaSelecionado + offsetInicioMes - 1) % 7]}
              </h3>
            </div>

            {eventosDoDiaSelecionado.some((e) => !e.gcalId) && (
              <button
                onClick={handleExportarEventosDoDiaParaGoogle}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer border"
                style={{
                  background: `${t.primary}15`,
                  color: t.primary,
                  borderColor: `${t.primary}40`,
                }}
                title="Enviar eventos deste dia para o Google Agenda"
              >
                <UploadCloud size={13} />
                <span>Enviar p/ Google</span>
              </button>
            )}
          </div>

          {/* Lista de Eventos do Dia Selecionado */}
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto no-scrollbar pr-0.5">
            {eventosDoDiaSelecionado.length === 0 ? (
              <div
                className="p-5 rounded-2xl border text-center space-y-1.5"
                style={{ background: t.bg, borderColor: t.border }}
              >
                <p className="text-xs font-bold" style={{ color: t.text }}>
                  Dia livre em {diaSelecionado}/
                  {String(mesAtivo).padStart(2, "0")}
                </p>
                <p className="text-[11px]" style={{ color: t.textSoft }}>
                  Agende abaixo ou peça para a Lala por voz/texto.
                </p>
              </div>
            ) : (
              eventosDoDiaSelecionado.map((ev) => {
                const corCat = getCorHexCategoria(
                  ev.categoria,
                  ev.corCustomHex
                );
                return (
                  <div
                    key={ev.id}
                    draggable
                    onDragStart={(e) => {
                      setEventoArrastando(ev);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", ev.id);
                    }}
                    onDragEnd={() => {
                      setEventoArrastando(null);
                      setDropTargetDia(null);
                      setDropTargetHora(null);
                    }}
                    onClick={() => abrirEventoNoCalendario(ev)}
                    className="p-3 rounded-2xl border flex items-start justify-between gap-2.5 transition-transform active:scale-[0.99] cursor-grab active:cursor-grabbing select-none"
                    style={{
                      background: t.bg,
                      borderColor: t.border,
                      borderLeftWidth: "4px",
                      borderLeftColor: corCat,
                      opacity: eventoArrastando?.id === ev.id ? 0.45 : 1,
                    }}
                    title="Arraste este evento para qualquer dia ou horário na grade ao lado, ou clique para editar"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="text-[11px] font-mono-num font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
                          style={{ background: t.cardSubtle, color: corCat }}
                        >
                          <Clock size={11} /> {ev.horario}
                        </span>
                        {ev.ehRecorrente && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{
                              background: `${corCat}20`,
                              color: corCat,
                            }}
                          >
                            ↻ Repete
                          </span>
                        )}
                        <span
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md"
                          style={{ background: `${corCat}18`, color: corCat }}
                        >
                          {ev.ehTarefa ? "Tarefa" : ev.categoria}
                        </span>
                        {ev.origem === "gcal" && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 truncate max-w-[160px]"
                            style={{
                              background: `${t.action}18`,
                              color: t.action,
                            }}
                            title={ev.contaEmail || ev.nomeCalendario || "Google Agenda"}
                          >
                            <Cloud size={10} />{" "}
                            {ev.nomeCalendario || ev.contaEmail || "Google Agenda"}
                          </span>
                        )}
                      </div>
                      <p
                        className="text-xs sm:text-sm font-bold truncate"
                        style={{
                          color: t.text,
                          textDecoration: ev.concluido ? "line-through" : "none",
                        }}
                      >
                        {ev.titulo}
                      </p>
                      <p
                        className="text-[11px] truncate"
                        style={{ color: t.textSoft }}
                      >
                        {ev.subtitulo}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {ev.compromissoId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAlternarConclusaoEvento(ev);
                          }}
                          className="p-1.5 rounded-lg cursor-pointer"
                          style={{
                            color: ev.concluido ? t.primary : t.textSoft,
                          }}
                          title="Marcar como concluído"
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      )}
                      {ev.htmlLink && (
                        <a
                          href={ev.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg"
                          style={{ color: t.action }}
                          title="Abrir no Google Calendar"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      {(ev.compromissoId || ev.gcalId) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSolicitarExclusaoEvento(ev);
                          }}
                          className="p-1.5 rounded-lg cursor-pointer"
                          style={{ color: t.danger }}
                          title="Excluir evento"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Formulário Rápido para Agendar Evento ou Tarefa (App + Google Agenda) */}
          <div
            className="p-4 rounded-2xl border space-y-3"
            style={{ background: t.bg, borderColor: t.border }}
          >
            <div className="flex items-center justify-between gap-2">
              <p
                className="text-xs font-bold flex items-center gap-1.5"
                style={{ color: t.text }}
              >
                <Plus size={14} style={{ color: t.action }} /> Adicionar em{" "}
                {String(diaSelecionado).padStart(2, "0")}/
                {String(mesAtivo).padStart(2, "0")}/{anoAtivo}
              </p>
              <div
                className="flex gap-1 p-0.5 rounded-xl border"
                style={{ background: t.card, borderColor: t.border }}
              >
                <button
                  type="button"
                  onClick={() => setTipoItemModal("evento")}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                  style={{
                    background:
                      tipoItemModal === "evento" ? t.action : "transparent",
                    color: tipoItemModal === "evento" ? "#fff" : t.textSoft,
                  }}
                >
                  Evento
                </button>
                <button
                  type="button"
                  onClick={() => setTipoItemModal("tarefa")}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                  style={{
                    background:
                      tipoItemModal === "tarefa" ? t.primary : "transparent",
                    color: tipoItemModal === "tarefa" ? "#fff" : t.textSoft,
                  }}
                >
                  Tarefa
                </button>
              </div>
            </div>

            <input
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAgendarCompromisso()}
              placeholder={
                tipoItemModal === "tarefa"
                  ? "Título da tarefa (ex: Enviar relatório, Comprar ração)..."
                  : "Título do evento (ex: Aula UERJ, Reunião CDT, Vet Nina)..."
              }
              className="w-full px-3 py-2 rounded-xl text-xs outline-none border"
              style={{
                background: t.card,
                color: t.text,
                borderColor: t.border,
              }}
            />

            <input
              value={novoLocal}
              onChange={(e) => setNovoLocal(e.target.value)}
              placeholder="Local, link Meet ou observação (opcional)..."
              className="w-full px-3 py-2 rounded-xl text-xs outline-none border"
              style={{
                background: t.card,
                color: t.text,
                borderColor: t.border,
              }}
            />

            <div className="grid grid-cols-3 gap-2">
              <input
                type="time"
                value={novaHora}
                onChange={(e) => setNovaHora(e.target.value)}
                className="px-2.5 py-2 rounded-xl text-xs font-mono-num outline-none border"
                style={{
                  background: t.card,
                  color: t.text,
                  borderColor: t.border,
                }}
              />
              <select
                value={novaDuracao}
                onChange={(e) => setNovaDuracao(Number(e.target.value))}
                className="px-2.5 py-2 rounded-xl text-xs font-mono-num outline-none border"
                style={{
                  background: t.card,
                  color: t.text,
                  borderColor: t.border,
                }}
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1h</option>
                <option value={90}>1h30</option>
                <option value={120}>2h</option>
              </select>
              <select
                value={novaCat}
                onChange={(e) =>
                  setNovaCat(e.target.value as CategoriaCalendarioApp)
                }
                className="px-2.5 py-2 rounded-xl text-xs font-semibold outline-none border"
                style={{
                  background: t.card,
                  color: t.text,
                  borderColor: t.border,
                }}
              >
                <option value="pessoal">Pessoal</option>
                <option value="uerj">UERJ</option>
                <option value="trabalho">Trabalho</option>
                <option value="pets">Pets</option>
                <option value="financas">Finanças</option>
                <option value="saude">Saúde/Treino</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={novaRecorrencia}
                onChange={(e) =>
                  setNovaRecorrencia(e.target.value as RecorrenciaCompromisso)
                }
                className="px-2.5 py-2 rounded-xl text-xs font-semibold outline-none border"
                style={{
                  background: t.card,
                  color: t.text,
                  borderColor: t.border,
                }}
              >
                <option value="nenhuma">↻ Não se repete</option>
                <option value="diaria">↻ Todos os dias</option>
                <option value="semanal">↻ Toda semana</option>
                <option value="mensal">↻ Todo mês</option>
              </select>

              {novaRecorrencia !== "nenhuma" ? (
                <input
                  type="date"
                  value={novaRecorrenciaAte}
                  onChange={(e) => setNovaRecorrenciaAte(e.target.value)}
                  placeholder="Repetir até..."
                  className="px-2.5 py-2 rounded-xl text-xs font-mono-num outline-none border"
                  style={{
                    background: t.card,
                    color: t.text,
                    borderColor: t.border,
                  }}
                  title="Data final da repetição (opcional)"
                />
              ) : (
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none px-2">
                  <input
                    type="checkbox"
                    checked={enviarNovoParaGoogle}
                    onChange={(e) => setEnviarNovoParaGoogle(e.target.checked)}
                    className="rounded"
                  />
                  <span className="truncate" style={{ color: t.textSoft }}>
                    Sync <strong style={{ color: t.text }}>Google</strong>
                  </span>
                </label>
              )}
            </div>

            {contasGoogle.length > 1 && (
              <select
                value={contaDestinoCriacao}
                onChange={(e) => setContaDestinoCriacao(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs outline-none border"
                style={{
                  background: t.card,
                  color: t.text,
                  borderColor: t.border,
                }}
              >
                <option value="">
                  Agenda destino: {contasGoogle[0]?.email} (Principal)
                </option>
                {contasGoogle.map((acc) => (
                  <option key={acc.email} value={acc.email}>
                    Salvar em: {acc.email}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleAgendarCompromisso}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
              style={{
                background:
                  tipoItemModal === "tarefa" ? t.primary : t.action,
              }}
            >
              <Plus size={14} /> Salvar{" "}
              {tipoItemModal === "tarefa" ? "Tarefa" : "Evento"} em{" "}
              {String(diaSelecionado).padStart(2, "0")}/
              {String(mesAtivo).padStart(2, "0")}
            </button>
          </div>
        </section>
      </div>

      {/* MODAL NATIVO ESTILO GOOGLE AGENDA (AO CLICAR EM QUALQUER DIA OU HORÁRIO DO CALENDÁRIO) */}
      {modalCriacaoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-xs"
            onClick={() => {
              setModalCriacaoAberto(false);
              setEventoEditando(null);
            }}
          />
          <div
            className="relative z-10 w-full max-w-lg rounded-3xl border p-5 shadow-2xl space-y-4"
            style={{
              background: t.card,
              color: t.text,
              borderColor: t.border,
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: t.border }}>
              <div className="flex items-center gap-2">
                <div
                  className="flex gap-1 p-1 rounded-2xl border"
                  style={{ background: t.bg, borderColor: t.border }}
                >
                  <button
                    type="button"
                    onClick={() => setTipoItemModal("evento")}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                    style={{
                      background:
                        tipoItemModal === "evento" ? t.action : "transparent",
                      color: tipoItemModal === "evento" ? "#fff" : t.textSoft,
                    }}
                  >
                    Evento
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoItemModal("tarefa")}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                    style={{
                      background:
                        tipoItemModal === "tarefa" ? t.primary : "transparent",
                      color: tipoItemModal === "tarefa" ? "#fff" : t.textSoft,
                    }}
                  >
                    Tarefa
                  </button>
                </div>
                <span className="text-xs font-mono-num font-bold px-2.5 py-1 rounded-xl" style={{ background: t.cardSubtle, color: t.text }}>
                  {String(diaSelecionado).padStart(2, "0")}/{String(mesAtivo).padStart(2, "0")}/{anoAtivo}
                </span>
              </div>

              <button
                onClick={() => {
                  setModalCriacaoAberto(false);
                  setEventoEditando(null);
                }}
                className="p-1.5 rounded-xl cursor-pointer"
                style={{ color: t.textSoft }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                autoFocus
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAgendarCompromisso()}
                placeholder={
                  tipoItemModal === "tarefa"
                    ? "Adicionar título da tarefa..."
                    : "Adicionar título e horário do evento..."
                }
                className="w-full px-3.5 py-3 rounded-2xl text-sm font-bold outline-none border"
                style={{
                  background: t.bg,
                  color: t.text,
                  borderColor: t.border,
                }}
              />

              {/* Data, Hora, Duração e Categoria */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: t.textSoft }}>
                    Data
                  </label>
                  <input
                    type="date"
                    value={`${anoAtivo}-${String(mesAtivo).padStart(
                      2,
                      "0"
                    )}-${String(diaSelecionado).padStart(2, "0")}`}
                    onChange={(e) => {
                      const parts = e.target.value.split("-").map(Number);
                      if (
                        parts.length === 3 &&
                        parts[0] &&
                        parts[1] &&
                        parts[2]
                      ) {
                        setAnoAtivo(parts[0]);
                        setMesAtivo(parts[1]);
                        setDiaSelecionado(parts[2]);
                      }
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-xs font-mono-num outline-none border"
                    style={{ background: t.bg, color: t.text, borderColor: t.border }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: t.textSoft }}>
                    Horário
                  </label>
                  <input
                    type="time"
                    disabled={diaInteiroModal}
                    value={novaHora}
                    onChange={(e) => setNovaHora(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono-num outline-none border disabled:opacity-40"
                    style={{ background: t.bg, color: t.text, borderColor: t.border }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: t.textSoft }}>
                    Duração
                  </label>
                  <select
                    disabled={diaInteiroModal}
                    value={novaDuracao}
                    onChange={(e) => setNovaDuracao(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-xl text-xs font-mono-num outline-none border disabled:opacity-40"
                    style={{ background: t.bg, color: t.text, borderColor: t.border }}
                  >
                    <option value={5}>5 min</option>
                    <option value={10}>10 min</option>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hora</option>
                    <option value={90}>1h 30m</option>
                    <option value={120}>2 horas</option>
                    <option value={180}>3 horas</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: t.textSoft }}>
                    Categoria
                  </label>
                  <select
                    value={novaCat}
                    onChange={(e) =>
                      setNovaCat(e.target.value as CategoriaCalendarioApp)
                    }
                    className="w-full px-2.5 py-2 rounded-xl text-xs font-bold outline-none border"
                    style={{ background: t.bg, color: t.text, borderColor: t.border }}
                  >
                    <option value="pessoal">Pessoal</option>
                    <option value="uerj">UERJ & Estudos</option>
                    <option value="trabalho">Trabalho / CDT</option>
                    <option value="pets">Pets</option>
                    <option value="financas">Finanças</option>
                    <option value="saude">Saúde & Treino</option>
                  </select>
                </div>
              </div>

              {/* Recorrência estilo Google Agenda */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: t.textSoft }}>
                    Repetição / Recorrência
                  </label>
                  <select
                    value={novaRecorrencia}
                    onChange={(e) =>
                      setNovaRecorrencia(e.target.value as RecorrenciaCompromisso)
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold outline-none border"
                    style={{ background: t.bg, color: t.text, borderColor: t.border }}
                  >
                    <option value="nenhuma">Não se repete (evento único)</option>
                    <option value="diaria">Todos os dias (Diariamente)</option>
                    <option value="semanal">Toda semana neste dia</option>
                    <option value="mensal">Todo mês neste dia</option>
                  </select>
                </div>

                {novaRecorrencia !== "nenhuma" && (
                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: t.textSoft }}>
                      Repetir até (opcional)
                    </label>
                    <input
                      type="date"
                      value={novaRecorrenciaAte}
                      onChange={(e) => setNovaRecorrenciaAte(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs font-mono-num outline-none border"
                      style={{ background: t.bg, color: t.text, borderColor: t.border }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={diaInteiroModal}
                    onChange={(e) => setDiaInteiroModal(e.target.checked)}
                    className="rounded"
                  />
                  <span style={{ color: t.text }}>Dia inteiro</span>
                </label>

                <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enviarNovoParaGoogle}
                    onChange={(e) => setEnviarNovoParaGoogle(e.target.checked)}
                    className="rounded"
                  />
                  <span style={{ color: t.text }}>
                    Sincronizar no <strong>Google Agenda</strong>
                  </span>
                </label>
              </div>

              {/* Escolha de qual e-mail/agenda do Google receberá o evento */}
              {(contasGoogle.length > 0 || calendariosExtras.length > 0) && (
                <div>
                  <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: t.textSoft }}>
                    Conta / Agenda Google de Destino
                  </label>
                  <select
                    value={contaDestinoCriacao}
                    onChange={(e) => setContaDestinoCriacao(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none border"
                    style={{ background: t.bg, color: t.text, borderColor: t.border }}
                  >
                    {contasGoogle.map((acc) => (
                      <option key={acc.email} value={acc.email}>
                        Google Agenda: {acc.email} ({acc.displayName})
                      </option>
                    ))}
                    {calendariosExtras.map((cal) => (
                      <option key={cal.id} value={cal.id}>
                        Agenda vinculada: {cal.nome} ({cal.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <input
                value={novoLocal}
                onChange={(e) => setNovoLocal(e.target.value)}
                placeholder="Adicionar local ou link de videochamada..."
                className="w-full px-3 py-2.5 rounded-xl text-xs outline-none border"
                style={{ background: t.bg, color: t.text, borderColor: t.border }}
              />

              <textarea
                rows={2}
                value={novaDescricao}
                onChange={(e) => setNovaDescricao(e.target.value)}
                placeholder="Adicionar descrição, pauta ou observações..."
                className="w-full px-3 py-2 rounded-xl text-xs outline-none border resize-none"
                style={{ background: t.bg, color: t.text, borderColor: t.border }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: t.border }}>
              {eventoEditando ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSolicitarExclusaoEvento(eventoEditando)}
                    className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer border"
                    style={{
                      background: `${t.danger}15`,
                      color: t.danger,
                      borderColor: `${t.danger}40`,
                    }}
                  >
                    <Trash2 size={13} /> Excluir
                  </button>
                  {eventoEditando.compromissoId && (
                    <button
                      type="button"
                      onClick={() => {
                        handleAlternarConclusaoEvento(eventoEditando);
                        setModalCriacaoAberto(false);
                        setEventoEditando(null);
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer border"
                      style={{
                        background: `${t.primary}15`,
                        color: t.primary,
                        borderColor: `${t.primary}40`,
                      }}
                    >
                      <CheckCircle2 size={13} />{" "}
                      {eventoEditando.concluido ? "Reabrir" : "Concluir"}
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-[11px]" style={{ color: t.textSoft }}>
                  Dica: Arraste qualquer evento na grade para mudar dia/hora
                </span>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setModalCriacaoAberto(false);
                    setEventoEditando(null);
                  }}
                  className="px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer"
                  style={{ background: t.bg, color: t.text, borderColor: t.border }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAgendarCompromisso}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                  style={{
                    background:
                      tipoItemModal === "tarefa" ? t.primary : t.action,
                  }}
                >
                  {eventoEditando
                    ? "Salvar Alterações"
                    : tipoItemModal === "tarefa"
                    ? "Salvar Tarefa"
                    : "Salvar Evento"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO AO ALTERAR / ARRASTAR / EXCLUIR EVENTO QUE SE REPETE (APENAS ESTE / ESTE E OS SEGUINTES / TODOS) */}
      {confirmacaoRecorrencia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setConfirmacaoRecorrencia(null)}
          />
          <div
            className="relative z-10 w-full max-w-md rounded-3xl border p-5 shadow-2xl space-y-4"
            style={{
              background: t.card,
              color: t.text,
              borderColor: t.border,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background:
                      confirmacaoRecorrencia.tipoOperacao === "excluir"
                        ? `${t.danger}18`
                        : `${t.action}18`,
                    color:
                      confirmacaoRecorrencia.tipoOperacao === "excluir"
                        ? t.danger
                        : t.action,
                  }}
                >
                  <RefreshCw size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">
                    {confirmacaoRecorrencia.tipoOperacao === "excluir"
                      ? "Excluir evento recorrente"
                      : "Alterar evento recorrente"}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: t.textSoft }}>
                    Este evento se repete na sua agenda. Como deseja aplicar?
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmacaoRecorrencia(null)}
                className="p-1.5 rounded-xl cursor-pointer"
                style={{ color: t.textSoft }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              className="p-3 rounded-2xl border text-xs font-semibold"
              style={{
                background: t.cardSubtle,
                borderColor: t.border,
                color: t.text,
              }}
            >
              {confirmacaoRecorrencia.resumoAlteracao}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() =>
                  confirmacaoRecorrencia.onEscolherEscopo("este")
                }
                className="w-full p-3.5 rounded-2xl border text-left transition-all hover:opacity-95 cursor-pointer flex items-center justify-between"
                style={{
                  background: t.bg,
                  borderColor: t.primary,
                }}
              >
                <div>
                  <p className="text-xs font-bold" style={{ color: t.text }}>
                    Apenas este evento
                  </p>
                  <p className="text-[11px]" style={{ color: t.textSoft }}>
                    Altera somente a ocorrência do dia{" "}
                    {String(confirmacaoRecorrencia.evento.diaMes).padStart(
                      2,
                      "0"
                    )}
                    /{String(confirmacaoRecorrencia.evento.mes).padStart(2, "0")};
                    os demais continuam iguais.
                  </p>
                </div>
                <ChevronRight size={16} style={{ color: t.primary }} />
              </button>

              <button
                type="button"
                onClick={() =>
                  confirmacaoRecorrencia.onEscolherEscopo("seguintes")
                }
                className="w-full p-3.5 rounded-2xl border text-left transition-all hover:opacity-95 cursor-pointer flex items-center justify-between"
                style={{
                  background: t.bg,
                  borderColor: t.action,
                }}
              >
                <div>
                  <p className="text-xs font-bold" style={{ color: t.text }}>
                    Este e os eventos seguintes
                  </p>
                  <p className="text-[11px]" style={{ color: t.textSoft }}>
                    Mantém o histórico anterior intacto e atualiza desta data em
                    diante.
                  </p>
                </div>
                <ChevronRight size={16} style={{ color: t.action }} />
              </button>

              <button
                type="button"
                onClick={() =>
                  confirmacaoRecorrencia.onEscolherEscopo("todos")
                }
                className="w-full p-3.5 rounded-2xl border text-left transition-all hover:opacity-95 cursor-pointer flex items-center justify-between"
                style={{
                  background: t.bg,
                  borderColor: t.border,
                }}
              >
                <div>
                  <p className="text-xs font-bold" style={{ color: t.text }}>
                    Todos os eventos da série
                  </p>
                  <p className="text-[11px]" style={{ color: t.textSoft }}>
                    Aplica a alteração a todas as ocorrências desta repetição.
                  </p>
                </div>
                <ChevronRight size={16} style={{ color: t.textSoft }} />
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setConfirmacaoRecorrencia(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer"
                style={{
                  background: t.bg,
                  color: t.textSoft,
                  borderColor: t.border,
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO EXPLÍCITA PARA OPERAÇÕES NO GOOGLE AGENDA */}
      {confirmacaoGCal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-xs"
            onClick={() => !executandoConfirmacao && setConfirmacaoGCal(null)}
          />
          <div
            className="relative z-10 w-full max-w-md rounded-3xl border p-5 shadow-2xl space-y-4"
            style={{
              background: t.card,
              color: t.text,
              borderColor: t.border,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background:
                    confirmacaoGCal.tipo === "excluir"
                      ? `${t.danger}18`
                      : `${t.primary}18`,
                  color:
                    confirmacaoGCal.tipo === "excluir" ? t.danger : t.primary,
                }}
              >
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold">
                  {confirmacaoGCal.tituloModal}
                </h3>
                <p
                  className="text-xs mt-1 leading-relaxed"
                  style={{ color: t.textSoft }}
                >
                  {confirmacaoGCal.descricaoModal}
                </p>
              </div>
            </div>

            <div
              className="p-3 rounded-2xl border max-h-40 overflow-y-auto space-y-1.5 text-xs"
              style={{ background: t.cardSubtle, borderColor: t.border }}
            >
              {confirmacaoGCal.itensAfetados.map((item, idx) => (
                <div key={idx} className="font-semibold flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: t.primary }}
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setConfirmacaoGCal(null)}
                disabled={executandoConfirmacao}
                className="px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer"
                style={{
                  background: t.bg,
                  color: t.text,
                  borderColor: t.border,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setExecutandoConfirmacao(true);
                  try {
                    await confirmacaoGCal.onConfirmar();
                    setConfirmacaoGCal(null);
                  } catch (err) {
                    showToast(
                      err instanceof Error
                        ? err.message
                        : "Erro ao atualizar Google Agenda."
                    );
                  } finally {
                    setExecutandoConfirmacao(false);
                  }
                }}
                disabled={executandoConfirmacao}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer disabled:opacity-50"
                style={{
                  background:
                    confirmacaoGCal.tipo === "excluir" ? t.danger : t.primary,
                }}
              >
                {executandoConfirmacao ? "Sincronizando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
