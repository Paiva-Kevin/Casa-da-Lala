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
  origem: "app" | "gcal" | "modulo";
  gcalId?: string;
  calendarId?: string;
  contaEmail?: string;
  nomeCalendario?: string;
  htmlLink?: string;
  compromissoId?: number;
  payloadSheet?: BottomSheetPayload;
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

export function AbaCalendario({
  t,
  compromissos,
  setCompromissos,
  disciplinas,
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

  // Formulário rápido para novo evento no dia selecionado e Modal Nativo estilo Google Agenda
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaHora, setNovaHora] = useState("14:00");
  const [novaDuracao, setNovaDuracao] = useState(60);
  const [novoLocal, setNovoLocal] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novaCat, setNovaCat] = useState<CategoriaCalendarioApp>("pessoal");
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
        if (!silencioso) {
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

  // Consolida todos os eventos do App + Módulos + Google Agenda para o mês/ano ativo
  const todosEventosMes = useMemo<EventoCalendarioUnificado[]>(() => {
    const lista: EventoCalendarioUnificado[] = [];
    const gcalIdsJaNosCompromissos = new Set<string>();

    // 1. Compromissos nativos do App
    compromissos.forEach((c) => {
      const mesComp =
        c.mes === undefined
          ? mesAtivo
          : c.mes === 0
          ? 1
          : c.mes;
      const anoComp = c.ano ?? anoAtivo;
      if (mesComp !== mesAtivo || anoComp !== anoAtivo) return;

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

      lista.push({
        id: `comp-${c.id}`,
        compromissoId: c.id,
        diaMes: Math.min(diasNoMesCount, Math.max(1, c.diaMes)),
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
        origem: c.gcalEventId ? "gcal" : "app",
        gcalId: c.gcalEventId,
        payloadSheet: { tipo: "compromisso", id: c.id },
      });
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
          duracaoMin: eg.duracaoMin,
          titulo: eg.titulo,
          descricao: eg.descricao,
          ehTarefa: eg.titulo.startsWith("[Tarefa]") || eg.titulo.startsWith("☑"),
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

    // 3. Aulas Semanais & Avaliações da UERJ
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

        if (diasSemanaDisc.length > 0) {
          diasNoMesArray.forEach((dia) => {
            const diaSemana = (dia + offsetInicioMes - 1) % 7;
            if (diasSemanaDisc.includes(diaSemana)) {
              lista.push({
                id: `uerj-aula-${d.id}-dia-${dia}`,
                diaMes: dia,
                mes: mesAtivo,
                ano: anoAtivo,
                horario: horaAula,
                horaFim: calcularHoraFim(horaAula, 110),
                duracaoMin: 110,
                titulo: `Aula UERJ: ${d.nome}`,
                subtitulo: `${d.horarioSala} · ${d.professor}`,
                local: d.horarioSala,
                categoria: "uerj",
                cor: "primary",
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
              diaMes: dia,
              mes: mesAtivo,
              ano: anoAtivo,
              horario: horaAula,
              horaFim: calcularHoraFim(horaAula, 110),
              duracaoMin: 110,
              titulo: `UERJ: ${d.nome}`,
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
    setModalCriacaoAberto(true);
  };

  // Abre um evento/tarefa existente para visualização, conclusão ou edição
  const abrirEventoNoCalendario = (ev: EventoCalendarioUnificado) => {
    setDiaSelecionado(ev.diaMes);
    if (ev.payloadSheet && ev.origem === "modulo") {
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
    setContaDestinoCriacao(ev.contaEmail || ev.calendarId || "");
    setModalCriacaoAberto(true);
  };

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
      : tipoItemModal === "tarefa"
      ? 30
      : Number(novaDuracao) || 60;

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
      if (eventoEditando.compromissoId) {
        setCompromissos((prev) =>
          prev.map((c) =>
            c.id === eventoEditando.compromissoId
              ? {
                  ...c,
                  titulo: tituloFormatado,
                  hora: diaInteiroModal ? "08:00" : novaHora,
                  duracaoMin: novaDuracao,
                  local: novoLocal.trim() || c.local,
                  categoriaCalendario: novaCat,
                  diaMes: diaSelecionado,
                  mes: mesAtivo,
                  ano: anoAtivo,
                }
              : c
          )
        );
      }

      setModalCriacaoAberto(false);
      const editRef = eventoEditando;
      setEventoEditando(null);

      if (editRef.gcalId && navigator.onLine) {
        try {
          const atualizado = await atualizarEventoGoogleCalendar(
            editRef.gcalId,
            {
              titulo: tituloFormatado,
              descricao: novaDescricao.trim(),
              local: novoLocal.trim(),
              ano: anoAtivo,
              mes: mesAtivo,
              diaMes: diaSelecionado,
              horaInicio: diaInteiroModal ? "08:00" : novaHora,
              duracaoMin: novaDuracao,
              diaInteiro: diaInteiroModal,
              categoria: novaCat,
              targetAccountEmail:
                contaDestinoCriacao || editRef.contaEmail,
              targetCalendarId: editRef.calendarId || "primary",
            }
          );
          setEventosGoogle((prev) =>
            prev.map((x) =>
              x.gcalId === editRef.gcalId ? atualizado : x
            )
          );
          showToast(`"${atualizado.titulo}" atualizado na Agenda e no Google!`);
        } catch {
          showToast(`"${tituloFormatado}" atualizado na Agenda local!`);
        }
      } else {
        showToast(`"${tituloFormatado}" atualizado na Agenda!`);
      }
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
        duracaoMin: tipoItemModal === "tarefa" ? 30 : novaDuracao,
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
              onClick={() => setTipoItemModal("evento")}
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
              onClick={() => setTipoItemModal("tarefa")}
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
                      className="group h-24 sm:h-32 p-1.5 sm:p-2 rounded-2xl border flex flex-col justify-between text-left transition-all cursor-pointer relative overflow-hidden"
                      style={{
                        background: isSelecionado
                          ? `${t.action}14`
                          : isHoje
                          ? t.cardSubtle
                          : t.bg,
                        borderColor: isSelecionado
                          ? t.action
                          : isHoje
                          ? t.primary
                          : t.border,
                      }}
                      title="Clique para selecionar ou clique novamente no dia para criar Evento / Tarefa"
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
                            <Cloud
                              size={11}
                              style={{ color: t.action }}
                              title="Sincronizado com Google Agenda"
                            />
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

                      {/* Pílulas de eventos estilo Google Calendar */}
                      <div className="space-y-1 w-full overflow-hidden">
                        {evsDia.slice(0, 3).map((ev) => {
                          const corCat = getCorHexCategoria(
                            ev.categoria,
                            ev.corCustomHex
                          );
                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirEventoNoCalendario(ev);
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold truncate flex items-center gap-1 hover:opacity-90"
                              style={{
                                background: `${corCat}22`,
                                color: corCat,
                                borderLeft: `2.5px solid ${corCat}`,
                                textDecoration: ev.concluido
                                  ? "line-through"
                                  : "none",
                              }}
                              title={`${ev.horario} ${ev.titulo}${
                                ev.nomeCalendario
                                  ? ` (${ev.nomeCalendario})`
                                  : ""
                              }`}
                            >
                              <span className="font-mono-num hidden sm:inline">
                                {ev.horario}
                              </span>
                              <span className="truncate">{ev.titulo}</span>
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

              {/* Grade Horária Semanal */}
              <div className="max-h-[520px] overflow-y-auto space-y-1 pr-1">
                {horasGrade.map((hora) => {
                  const prefixoHora = String(hora).padStart(2, "0");
                  return (
                    <div
                      key={hora}
                      className="grid grid-cols-8 gap-1.5 min-h-[54px] border-b py-1"
                      style={{ borderColor: `${t.border}80` }}
                    >
                      <div
                        className="text-[11px] font-mono-num font-semibold flex items-start justify-center pt-1"
                        style={{ color: t.textSoft }}
                      >
                        {prefixoHora}:00
                      </div>

                      {diasVisaoSemanal.map((dia, cIdx) => {
                        if (!dia) {
                          return (
                            <div
                              key={cIdx}
                              className="rounded-lg opacity-20"
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
                            onClick={() =>
                              abrirModalCriacaoRapida(
                                dia,
                                `${prefixoHora}:00`,
                                "evento"
                              )
                            }
                            className="rounded-xl p-1 space-y-1 cursor-pointer transition-colors hover:opacity-90"
                            style={{
                              background:
                                dia === diaSelecionado
                                  ? `${t.action}08`
                                  : t.bg,
                            }}
                            title={`Clique para criar Evento ou Tarefa no dia ${dia} às ${prefixoHora}:00`}
                          >
                            {evsSlot.map((ev) => {
                              const corCat = getCorHexCategoria(
                                ev.categoria,
                                ev.corCustomHex
                              );
                              return (
                                <div
                                  key={ev.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    abrirEventoNoCalendario(ev);
                                  }}
                                  className="p-1 rounded-lg text-[10px] font-bold leading-tight truncate"
                                  style={{
                                    background: `${corCat}24`,
                                    color: corCat,
                                    borderLeft: `3px solid ${corCat}`,
                                  }}
                                  title={`${ev.horario} — ${ev.titulo}`}
                                >
                                  {ev.titulo}
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

          {/* MODO 3: VISÃO DIÁRIA HORA A HORA (ESTILO GOOGLE AGENDA) */}
          {visao === "dia" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: t.border }}>
                <div>
                  <span className="text-xs font-bold uppercase" style={{ color: t.action }}>
                    Visão Diária Detalhada
                  </span>
                  <h3 className="text-base font-bold" style={{ color: t.text }}>
                    {DIAS_SEMANA_CURTO[(diaSelecionado + offsetInicioMes - 1) % 7]},{" "}
                    {diaSelecionado} de {NOMES_MESES[mesAtivo - 1]} de {anoAtivo}
                  </h3>
                </div>
                <span
                  className="text-xs font-mono-num font-bold px-3 py-1 rounded-xl"
                  style={{ background: t.cardSubtle, color: t.primary }}
                >
                  {eventosDoDiaSelecionado.length} evento(s)
                </span>
              </div>

              <div className="max-h-[520px] overflow-y-auto space-y-1.5 pr-1">
                {horasGrade.map((hora) => {
                  const prefixoHora = String(hora).padStart(2, "0");
                  const evsHora = eventosDoDiaSelecionado.filter((e) => {
                    const hEv = parseInt(
                      (e.horario || "09:00").split(":")[0],
                      10
                    );
                    return hEv === hora;
                  });

                  return (
                    <div
                      key={hora}
                      onClick={() =>
                        abrirModalCriacaoRapida(
                          diaSelecionado,
                          `${prefixoHora}:00`,
                          "evento"
                        )
                      }
                      className="grid grid-cols-[60px_1fr] gap-3 items-start p-2 rounded-2xl border transition-colors cursor-pointer"
                      style={{
                        background: evsHora.length > 0 ? `${t.cardSubtle}` : t.bg,
                        borderColor: t.border,
                      }}
                    >
                      <span
                        className="text-xs font-mono-num font-bold pt-1"
                        style={{ color: t.textSoft }}
                      >
                        {prefixoHora}:00
                      </span>

                      <div className="space-y-1.5">
                        {evsHora.length === 0 ? (
                          <p
                            className="text-[11px] italic pt-1 flex items-center gap-1"
                            style={{ color: `${t.textSoft}80` }}
                          >
                            <Plus size={11} /> Clique para criar Evento ou Tarefa às {prefixoHora}:00
                          </p>
                        ) : (
                          evsHora.map((ev) => {
                            const corCat = getCorHexCategoria(
                              ev.categoria,
                              ev.corCustomHex
                            );
                            return (
                              <div
                                key={ev.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  abrirEventoNoCalendario(ev);
                                }}
                                className="p-2.5 rounded-xl flex items-center justify-between gap-2"
                                style={{
                                  background: `${corCat}18`,
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
                                      {ev.horaFim ? `–${ev.horaFim}` : ""}
                                    </span>
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
                                    className="text-xs sm:text-sm font-bold mt-0.5"
                                    style={{ color: t.text }}
                                  >
                                    {ev.titulo}
                                  </p>
                                  <p
                                    className="text-[11px]"
                                    style={{ color: t.textSoft }}
                                  >
                                    {ev.subtitulo}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                    onClick={() => abrirEventoNoCalendario(ev)}
                    className="p-3 rounded-2xl border flex items-start justify-between gap-2.5 transition-transform active:scale-[0.99] cursor-pointer"
                    style={{
                      background: t.bg,
                      borderColor: t.border,
                      borderLeftWidth: "4px",
                      borderLeftColor: corCat,
                    }}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="text-[11px] font-mono-num font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
                          style={{ background: t.cardSubtle, color: corCat }}
                        >
                          <Clock size={11} /> {ev.horario}
                        </span>
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

            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enviarNovoParaGoogle}
                onChange={(e) => setEnviarNovoParaGoogle(e.target.checked)}
                className="rounded"
              />
              <span style={{ color: t.textSoft }}>
                Sincronizar com meu{" "}
                <strong style={{ color: t.text }}>Google Agenda</strong>
              </span>
            </label>

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

              {/* Data, Hora, Duração e Dia Inteiro */}
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
                    disabled={diaInteiroModal || tipoItemModal === "tarefa"}
                    value={novaDuracao}
                    onChange={(e) => setNovaDuracao(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-xl text-xs font-mono-num outline-none border disabled:opacity-40"
                    style={{ background: t.bg, color: t.text, borderColor: t.border }}
                  >
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
                  Dica: Clique em qualquer dia ou horário da grade para abrir
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
