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
  excluirEventoGoogleCalendar,
  GoogleCalendarEventMapped,
  listarEventosGoogleCalendarMes,
  NovoEventoGoogleInput,
} from "../../services/googleCalendarSync";
import { getAccessToken } from "../../services/googleDriveSync";

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
  local?: string;
  categoria: CategoriaCalendarioApp;
  cor: ColorTokenKey;
  concluido?: boolean;
  origem: "app" | "gcal" | "modulo";
  gcalId?: string;
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

  // Estado de sincronização com Google Calendar
  const [eventosGoogle, setEventosGoogle] = useState<
    GoogleCalendarEventMapped[]
  >([]);
  const [sincronizandoGCal, setSincronizandoGCal] = useState<boolean>(false);
  const [ultimaSyncGCal, setUltimaSyncGCal] = useState<string | null>(null);
  const [confirmacaoGCal, setConfirmacaoGCal] =
    useState<ConfirmacaoGoogleCalendarModalState | null>(null);
  const [executandoConfirmacao, setExecutandoConfirmacao] =
    useState<boolean>(false);

  // Formulário rápido para novo evento no dia selecionado
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaHora, setNovaHora] = useState("14:00");
  const [novaDuracao, setNovaDuracao] = useState(60);
  const [novoLocal, setNovoLocal] = useState("");
  const [novaCat, setNovaCat] = useState<CategoriaCalendarioApp>("pessoal");
  const [enviarNovoParaGoogle, setEnviarNovoParaGoogle] = useState<boolean>(
    configCalendario.sincronizarAoCriarNoGoogle
  );

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

  // Carrega eventos do Google Calendar para o mês ativo
  const sincronizarEventosDoMesGoogle = useCallback(
    async (silencioso = false) => {
      const token = await getAccessToken();
      if (!token) {
        if (!silencioso) {
          await onConnectGoogle();
        }
        return;
      }

      setSincronizandoGCal(true);
      try {
        const lista = await listarEventosGoogleCalendarMes(anoAtivo, mesAtivo);
        setEventosGoogle(lista);
        setUltimaSyncGCal(
          new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
        if (!silencioso) {
          showToast(
            `Google Agenda sincronizado: ${lista.length} evento(s) carregados em ${
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

  useEffect(() => {
    if (googleConnected && configCalendario.mostrarGoogleAgenda) {
      sincronizarEventosDoMesGoogle(true);
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
      const mesComp = c.mes ?? mesAtivo;
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

    // 2. Eventos vindos diretamente do Google Agenda
    if (configCalendario.mostrarGoogleAgenda) {
      eventosGoogle.forEach((eg) => {
        if (eg.ano !== anoAtivo || eg.mes !== mesAtivo) return;
        if (gcalIdsJaNosCompromissos.has(eg.gcalId)) return;

        lista.push({
          id: `gcal-${eg.gcalId}`,
          gcalId: eg.gcalId,
          diaMes: eg.diaMes,
          mes: eg.mes,
          ano: eg.ano,
          horario: eg.horaInicio,
          horaFim: eg.horaFim,
          duracaoMin: eg.duracaoMin,
          titulo: eg.titulo,
          subtitulo: eg.diaInteiro
            ? `Dia inteiro · Google Agenda${eg.local ? ` · ${eg.local}` : ""}`
            : `${eg.horaInicio}–${eg.horaFim} · Google Agenda${
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
    if (filtroCategoria === "todas") return todosEventosMes;
    return todosEventosMes.filter((ev) => ev.categoria === filtroCategoria);
  }, [todosEventosMes, filtroCategoria]);

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
    const inicio = Math.min(12, Math.max(5, configCalendario.horaInicioGrade || 7));
    return Array.from({ length: 23 - inicio + 1 }, (_, i) => inicio + i);
  }, [configCalendario.horaInicioGrade]);

  const getCorHexCategoria = (cat: CategoriaCalendarioApp): string => {
    return configCalendario.coresCategorias?.[cat] || t.primary;
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

  const salvarCompromissoLocal = (gcalEventIdCriado?: string) => {
    const abaMap: Record<CategoriaCalendarioApp, Compromisso["aba"]> = {
      uerj: "estudos_trabalho",
      trabalho: "estudos_trabalho",
      pets: "casa_rotinas",
      financas: "financas",
      saude: "saude_pets",
      pessoal: "casa_rotinas",
    };

    const novo: Compromisso = {
      id: Date.now(),
      hora: novaHora,
      duracaoMin: novaDuracao,
      titulo: novoTitulo.trim(),
      local:
        novoLocal.trim() || `Calendário (${novaCat.toUpperCase()})`,
      cor: "primary",
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
  };

  const handleAgendarCompromisso = async () => {
    if (!novoTitulo.trim()) return;

    const token = await getAccessToken();
    if (enviarNovoParaGoogle && token) {
      const inputGCal: NovoEventoGoogleInput = {
        titulo: novoTitulo.trim(),
        local: novoLocal.trim(),
        ano: anoAtivo,
        mes: mesAtivo,
        diaMes: diaSelecionado,
        horaInicio: novaHora,
        duracaoMin: novaDuracao,
        categoria: novaCat,
      };

      setConfirmacaoGCal({
        tipo: "criar",
        tituloModal: "Confirmar criação no Google Agenda?",
        descricaoModal:
          "Este evento será salvo no Calendário do App e também adicionado à sua agenda principal do Google Calendar:",
        itensAfetados: [
          `${inputGCal.titulo} — ${String(diaSelecionado).padStart(
            2,
            "0"
          )}/${String(mesAtivo).padStart(2, "0")}/${anoAtivo} às ${novaHora} (${novaDuracao} min)`,
        ],
        onConfirmar: async () => {
          const criado = await criarEventoGoogleCalendar(inputGCal);
          setEventosGoogle((prev) => [...prev, criado]);
          salvarCompromissoLocal(criado.gcalId);
          showToast(
            `Evento "${criado.titulo}" criado e sincronizado com o Google Agenda!`
          );
        },
      });
      return;
    }

    salvarCompromissoLocal();
    showToast(
      `Evento "${novoTitulo.trim()}" agendado em ${diaSelecionado}/${String(
        mesAtivo
      ).padStart(2, "0")} às ${novaHora}!`
    );
  };

  const handleSolicitarExclusaoEvento = (ev: EventoCalendarioUnificado) => {
    if (ev.gcalId) {
      setConfirmacaoGCal({
        tipo: "excluir",
        tituloModal: "Excluir evento do Google Agenda?",
        descricaoModal:
          "Tem certeza de que deseja remover este evento do seu Google Calendar? Esta ação altera sua agenda Google.",
        itensAfetados: [
          `${ev.titulo} (${ev.diaMes}/${String(ev.mes).padStart(
            2,
            "0"
          )} às ${ev.horario})`,
        ],
        onConfirmar: async () => {
          await excluirEventoGoogleCalendar(ev.gcalId!);
          setEventosGoogle((prev) =>
            prev.filter((x) => x.gcalId !== ev.gcalId)
          );
          if (ev.compromissoId) {
            setCompromissos((prev) =>
              prev.filter((c) => c.id !== ev.compromissoId)
            );
          }
          showToast(`Evento "${ev.titulo}" removido do Google Agenda.`);
        },
      });
      return;
    }

    if (ev.compromissoId) {
      setCompromissos((prev) => prev.filter((c) => c.id !== ev.compromissoId));
      showToast(`Compromisso "${ev.titulo}" removido.`);
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

          {/* Alternador de Visualização igual ao Google Agenda + Botão Sincronizar + Configurações */}
          <div className="flex items-center gap-2 flex-wrap">
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
              onClick={() => sincronizarEventosDoMesGoogle(false)}
              disabled={sincronizandoGCal}
              className="px-3 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              style={{
                background: googleConnected ? `${t.primary}15` : t.action,
                color: googleConnected ? t.primary : "#fff",
                borderColor: googleConnected ? `${t.primary}40` : t.action,
              }}
              title="Sincronizar eventos com o Google Agenda"
            >
              <RefreshCw
                size={13}
                className={sincronizandoGCal ? "animate-spin" : ""}
              />
              <span>
                {sincronizandoGCal
                  ? "Sincronizando..."
                  : googleConnected
                  ? "Sync Google Agenda"
                  : "Conectar Google Agenda"}
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
                    <button
                      key={dia}
                      onClick={() => setDiaSelecionado(dia)}
                      className="h-20 sm:h-28 p-1.5 sm:p-2 rounded-2xl border flex flex-col justify-between text-left transition-all cursor-pointer relative overflow-hidden"
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
                        {evsDia.some((x) => x.origem === "gcal") && (
                          <Cloud
                            size={11}
                            style={{ color: t.action }}
                            title="Sincronizado com Google Agenda"
                          />
                        )}
                      </div>

                      {/* Pílulas de eventos estilo Google Calendar */}
                      <div className="space-y-1 w-full overflow-hidden">
                        {evsDia.slice(0, 3).map((ev) => {
                          const corCat = getCorHexCategoria(ev.categoria);
                          return (
                            <div
                              key={ev.id}
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold truncate flex items-center gap-1"
                              style={{
                                background: `${corCat}22`,
                                color: corCat,
                                borderLeft: `2.5px solid ${corCat}`,
                              }}
                              title={`${ev.horario} ${ev.titulo}`}
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
                    </button>
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
                      onClick={() => dia && setDiaSelecionado(dia)}
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
                        const evsSlot = eventosFiltrados.filter(
                          (e) =>
                            e.diaMes === dia &&
                            e.horario.startsWith(prefixoHora)
                        );

                        return (
                          <div
                            key={cIdx}
                            onClick={() => {
                              setDiaSelecionado(dia);
                              setNovaHora(`${prefixoHora}:00`);
                            }}
                            className="rounded-xl p-1 space-y-1 cursor-pointer transition-colors"
                            style={{
                              background:
                                dia === diaSelecionado
                                  ? `${t.action}08`
                                  : t.bg,
                            }}
                          >
                            {evsSlot.map((ev) => {
                              const corCat = getCorHexCategoria(ev.categoria);
                              return (
                                <div
                                  key={ev.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDiaSelecionado(dia);
                                    if (ev.payloadSheet) openCard(ev.payloadSheet);
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
                  const evsHora = eventosDoDiaSelecionado.filter((e) =>
                    e.horario.startsWith(prefixoHora)
                  );

                  return (
                    <div
                      key={hora}
                      onClick={() => setNovaHora(`${prefixoHora}:00`)}
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
                            className="text-[11px] italic pt-1"
                            style={{ color: `${t.textSoft}80` }}
                          >
                            Clique para agendar às {prefixoHora}:00
                          </p>
                        ) : (
                          evsHora.map((ev) => {
                            const corCat = getCorHexCategoria(ev.categoria);
                            return (
                              <div
                                key={ev.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (ev.payloadSheet) openCard(ev.payloadSheet);
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
                const corCat = getCorHexCategoria(ev.categoria);
                return (
                  <div
                    key={ev.id}
                    onClick={() => ev.payloadSheet && openCard(ev.payloadSheet)}
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
                          {ev.categoria}
                        </span>
                        {ev.origem === "gcal" && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1"
                            style={{
                              background: `${t.action}18`,
                              color: t.action,
                            }}
                          >
                            <Cloud size={10} /> Google Agenda
                          </span>
                        )}
                      </div>
                      <p
                        className="text-xs sm:text-sm font-bold truncate"
                        style={{ color: t.text }}
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
                      {ev.concluido ? (
                        <CheckCircle2 size={15} style={{ color: t.primary }} />
                      ) : (
                        <AlertCircle size={15} style={{ color: corCat }} />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Formulário Rápido para Agendar Evento (App + Google Agenda) */}
          <div
            className="p-4 rounded-2xl border space-y-3"
            style={{ background: t.bg, borderColor: t.border }}
          >
            <p
              className="text-xs font-bold flex items-center gap-1.5"
              style={{ color: t.text }}
            >
              <Plus size={14} style={{ color: t.action }} /> Novo Evento em{" "}
              {String(diaSelecionado).padStart(2, "0")}/
              {String(mesAtivo).padStart(2, "0")}/{anoAtivo}
            </p>

            <input
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              placeholder="Título (ex: Aula UERJ, Reunião CDT, Vet Nina)..."
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
              placeholder="Local ou link (opcional)..."
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

            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enviarNovoParaGoogle}
                onChange={(e) => setEnviarNovoParaGoogle(e.target.checked)}
                className="rounded"
              />
              <span style={{ color: t.textSoft }}>
                Sincronizar este evento com meu{" "}
                <strong style={{ color: t.text }}>Google Agenda</strong>
              </span>
            </label>

            <button
              onClick={handleAgendarCompromisso}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ background: t.action }}
            >
              <Plus size={14} /> Agendar em{" "}
              {String(diaSelecionado).padStart(2, "0")}/
              {String(mesAtivo).padStart(2, "0")}
            </button>
          </div>
        </section>
      </div>

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
