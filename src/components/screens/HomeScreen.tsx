import React, { useState } from "react";
import {
  Check,
  Play,
  Pause,
  Compass,
  Target,
  Wallet,
  Activity,
  Flame,
  CalendarClock,
  ArrowRight,
  ArrowLeft,
  Plus,
  Droplets,
  BookOpen,
  Dumbbell,
  PawPrint,
  Sparkles,
  Sun,
  Archive,
  Layers,
  Star,
  Clock,
  Search,
} from "lucide-react";
import {
  BottomSheetPayload,
  CheckinProntidao,
  Compromisso,
  HabitoDiario,
  ItemRadar,
  MetaItem,
  PetPerfil,
  TabId,
  TaskCategoryFilter,
  TaskHorizon,
  TaskItem,
  ThemeTokens,
} from "../../types/lala";
import {
  calcularProntidaoDetalhada,
  calcularScorePrioridade,
  FILTROS_TAREFAS_HOJE,
} from "../../data/initialData";
import { AgendaScreen } from "./AgendaScreen";

interface HomeScreenProps {
  t: ThemeTokens;
  survivalMode: boolean;
  prioridades: TaskItem[];
  todasTarefas: TaskItem[];
  setTarefas: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  toggleFeito: (id: number) => void;
  promoverP1: (id: number) => void;
  moverTarefaHorizonte: (
    id: number,
    destino: TaskHorizon,
    comoP1?: boolean
  ) => void;
  agendarTarefaNoHorario: (
    taskId: number,
    hora: string,
    duracaoMin?: number,
    diaMes?: number
  ) => void;
  habitos: HabitoDiario[];
  toggleHabitoHoje: (id: number) => void;
  adicionarHabito: (titulo: string, metaTexto: string) => void;
  compromissos: Compromisso[];
  setCompromissos: React.Dispatch<React.SetStateAction<Compromisso[]>>;
  radarItens: ItemRadar[];
  enviarEtapaRadarParaHoje: (radarId: number, etapaId: number) => void;
  metas: MetaItem[];
  setMetas: React.Dispatch<React.SetStateAction<MetaItem[]>>;
  dinheiroLivreInfo: {
    livreHoje: number;
    saldoLiquidoDisponivelMes: number;
    saldoContasOperacionais: number;
    despesasPrevistasPendentes: number;
    gastoRealizadoHoje: number;
  };
  checkin: CheckinProntidao;
  volumeSemana: number[];
  ultimoSRPE: number;
  petsPerfil: PetPerfil[];
  alimentarPet: (petId: number) => void;
  openCard: (payload: BottomSheetPayload) => void;
  irParaAba: (aba: TabId) => void;
  iniciarFocoNaTarefa: (task: TaskItem) => void;
  focoAtivoTask: TaskItem | null;
  segundosFocoRestantes: number;
  focoRodando: boolean;
  setFocoRodando: React.Dispatch<React.SetStateAction<boolean>>;
  encerrarFoco: () => void;
  showToast: (msg: string) => void;
}

export function HomeScreen({
  t,
  survivalMode,
  prioridades,
  todasTarefas,
  setTarefas,
  toggleFeito,
  promoverP1,
  moverTarefaHorizonte,
  agendarTarefaNoHorario,
  habitos,
  toggleHabitoHoje,
  adicionarHabito,
  compromissos,
  setCompromissos,
  radarItens,
  enviarEtapaRadarParaHoje,
  metas,
  setMetas,
  dinheiroLivreInfo,
  checkin,
  volumeSemana,
  ultimoSRPE,
  petsPerfil,
  alimentarPet,
  openCard,
  irParaAba,
  iniciarFocoNaTarefa,
  focoAtivoTask,
  segundosFocoRestantes,
  focoRodando,
  setFocoRodando,
  encerrarFoco,
  showToast,
}: HomeScreenProps) {
  // Gestão Bidirecional: Hoje <-> Semana <-> Backlog
  const [abaFluxo, setAbaFluxo] = useState<TaskHorizon>("hoje");
  const [filtroCat, setFiltroCat] = useState<TaskCategoryFilter>("todas");
  const [buscaBacklog, setBuscaBacklog] = useState<string>("");
  const [novaTarefaTexto, setNovaTarefaTexto] = useState<string>("");
  const [novaTarefaDuracao, setNovaTarefaDuracao] = useState<number>(15);
  const [novaTarefaDestino, setNovaTarefaDestino] = useState<TaskHorizon>("hoje");

  // Novo Hábito Rápido
  const [mostrarFormHabito, setMostrarFormHabito] = useState<boolean>(false);
  const [novoHabitoTitulo, setNovoHabitoTitulo] = useState<string>("");
  const [novoHabitoMeta, setNovoHabitoMeta] = useState<string>("10 min");

  // Novo Marco em Meta
  const [metaExpandidaInput, setMetaExpandidaInput] = useState<number | null>(null);
  const [novoMarcoTexto, setNovoMarcoTexto] = useState<string>("");

  // Controle Rápido de Hidratação (Stitch Widget Integrado)
  const [aguaConsumidaMl, setAguaConsumidaMl] = useState<number>(2100);
  const metaAguaMl = 2800;
  const pctAgua = Math.min(100, Math.round((aguaConsumidaMl / metaAguaMl) * 100));

  const detalhesProntidao = calcularProntidaoDetalhada(
    checkin,
    volumeSemana,
    ultimoSRPE
  );

  // Normaliza o horizonte da tarefa (compatibilidade com estado salvo anterior)
  const getHorizonte = (tk: TaskItem): TaskHorizon => {
    if (tk.horizonte) return tk.horizonte;
    if (tk.manualLock === "backlog" || tk.manualLock === "adiada") return "backlog";
    return "hoje";
  };

  const tarefasHoje = todasTarefas.filter((tk) => getHorizonte(tk) === "hoje");
  const tarefasSemana = todasTarefas.filter((tk) => getHorizonte(tk) === "semana");
  const tarefasBacklog = todasTarefas.filter((tk) => getHorizonte(tk) === "backlog");

  const listaHorizonteAtivo =
    abaFluxo === "hoje"
      ? tarefasHoje
      : abaFluxo === "semana"
      ? tarefasSemana
      : tarefasBacklog;

  const tarefasFiltradas = listaHorizonteAtivo.filter((tk) => {
    const matchCat = filtroCat === "todas" || tk.categoriaFiltro === filtroCat;
    const matchBusca =
      !buscaBacklog.trim() ||
      tk.texto.toLowerCase().includes(buscaBacklog.toLowerCase());
    return matchCat && matchBusca;
  });

  // Progresso percentual dos Hábitos Diários e das Tarefas de Hoje
  const habitosConcluidos = habitos.filter((h) => h.feitoHoje).length;
  const pctHabitosHoje =
    habitos.length > 0 ? Math.round((habitosConcluidos / habitos.length) * 100) : 0;

  const tarefasHojeConcluidas = tarefasHoje.filter((tk) => tk.feito).length;
  const pctTarefasHoje =
    tarefasHoje.length > 0
      ? Math.round((tarefasHojeConcluidas / tarefasHoje.length) * 100)
      : 0;

  const compromissosHoje = compromissos
    .filter((c) => c.diaMes === 27)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const renderHabitoIcon = (icone: HabitoDiario["icone"], corHex: string) => {
    switch (icone) {
      case "droplets":
        return <Droplets size={15} style={{ color: corHex }} />;
      case "book":
        return <BookOpen size={15} style={{ color: corHex }} />;
      case "dumbbell":
        return <Dumbbell size={15} style={{ color: corHex }} />;
      case "paw":
        return <PawPrint size={15} style={{ color: corHex }} />;
      case "sun":
        return <Sun size={15} style={{ color: corHex }} />;
      default:
        return <Sparkles size={15} style={{ color: corHex }} />;
    }
  };

  const criarNovaTarefa = () => {
    if (!novaTarefaTexto.trim()) return;
    const cat: Exclude<TaskCategoryFilter, "todas"> =
      filtroCat === "todas" ? "uerj" : filtroCat;
    const abaMap: Record<Exclude<TaskCategoryFilter, "todas">, Exclude<TabId, "inicio">> = {
      uerj: "estudos_trabalho",
      trabalho: "estudos_trabalho",
      casa: "casa_rotinas",
      pessoal: "saude_pets",
    };

    const nova: TaskItem = {
      id: Date.now(),
      texto: novaTarefaTexto.trim(),
      aba: abaMap[cat],
      categoriaFiltro: cat,
      cor: cat === "trabalho" ? "alert" : cat === "pessoal" ? "action" : "primary",
      feito: false,
      impacto: 8,
      urgencia: novaTarefaDestino === "hoje" ? 8 : novaTarefaDestino === "semana" ? 6 : 3,
      facilidade: 8,
      retorno: 8,
      horizonte: novaTarefaDestino,
      manualLock: novaTarefaDestino === "backlog" ? "backlog" : null,
      duracaoMin: novaTarefaDuracao,
      prazoFixo: novaTarefaDestino === "hoje" ? "Hoje" : undefined,
    };

    setTarefas((prev) => [nova, ...prev]);
    setAbaFluxo(novaTarefaDestino);
    setNovaTarefaTexto("");
  };

  return (
    <div className="space-y-5">
      {/* NOVO BANNER STITCH: SÍNTESE DO DIA, ANEL DE PRONTIDÃO & AÇÕES RÁPIDAS (ÁGUA + SACHÊS) */}
      <section
        className="rounded-3xl p-5 border flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex items-center gap-4 min-w-0">
          {/* Anel Circular SVG de Prontidão (Stitch Radial Gauge) */}
          <button
            onClick={() => openCard({ tipo: "checkin_prontidao" })}
            className="relative w-16 h-16 shrink-0 flex items-center justify-center cursor-pointer transition-transform active:scale-95"
            title="Abrir Check-in de Prontidão"
          >
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke={t.cardSubtle}
                strokeWidth="6"
              />
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke={t.primary}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 26}
                strokeDashoffset={
                  2 * Math.PI * 26 * (1 - detalhesProntidao.scoreTotal / 100)
                }
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-xs font-mono-num font-bold leading-none"
                style={{ color: t.primary }}
              >
                {detalhesProntidao.scoreTotal}%
              </span>
              <span
                className="text-[9px] font-semibold mt-0.5"
                style={{ color: t.textSoft }}
              >
                Pronta
              </span>
            </div>
          </button>

          <div className="min-w-0">
            <div
              className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono-num"
              style={{ color: t.textSoft }}
            >
              <span className="font-bold" style={{ color: t.action }}>
                DOM · 27 SET 2026
              </span>
              <span>·</span>
              <span>UERJ Semestre 2026.2</span>
              <span>·</span>
              <span>Sono {checkin.horasSono}h</span>
            </div>
            <h2
              className="text-base sm:text-lg font-bold tracking-tight mt-0.5 truncate"
              style={{ color: t.text }}
            >
              Bom dia, Lala · Visão Diária & Foco
            </h2>
            <p className="text-xs mt-0.5 truncate" style={{ color: t.textSoft }}>
              {detalhesProntidao.statusTexto}
            </p>
          </div>
        </div>

        {/* Widgets Rápidos do Topo (Hidratação Atleta + Sachês Nina & Tobias) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 lg:w-[450px] shrink-0">
          {/* Card Rápido: Hidratação 2,8L */}
          <div
            className="p-3 rounded-2xl border flex flex-col justify-between gap-2"
            style={{ background: t.bg, borderColor: t.border }}
          >
            <div className="flex items-center justify-between text-xs">
              <span
                className="font-bold flex items-center gap-1.5"
                style={{ color: t.text }}
              >
                <Droplets size={14} style={{ color: t.finance }} /> Hidratação
              </span>
              <span
                className="font-mono-num font-bold"
                style={{ color: t.finance }}
              >
                {(aguaConsumidaMl / 1000).toFixed(2).replace(".", ",")}L / 2,8L
              </span>
            </div>
            <div
              className="w-full h-1.5 rounded-full overflow-hidden"
              style={{ background: t.cardSubtle }}
            >
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${pctAgua}%`, background: t.finance }}
              />
            </div>
            <div className="flex items-center justify-between gap-1.5">
              <button
                onClick={() => {
                  setAguaConsumidaMl((v) => Math.min(4000, v + 250));
                  showToast("+250ml de água registrados!");
                }}
                className="flex-1 py-1 rounded-lg text-[11px] font-mono-num font-bold cursor-pointer transition-transform active:scale-95"
                style={{ background: t.cardSubtle, color: t.finance }}
              >
                +250ml
              </button>
              <button
                onClick={() => {
                  setAguaConsumidaMl((v) => Math.min(4000, v + 500));
                  showToast("+500ml (Garrafa UERJ) registrados!");
                }}
                className="flex-1 py-1 rounded-lg text-[11px] font-mono-num font-bold text-white cursor-pointer transition-transform active:scale-95"
                style={{ background: t.finance }}
              >
                +500ml
              </button>
            </div>
          </div>

          {/* Card Rápido: Sachês Nina & Tobias */}
          <div
            className="p-3 rounded-2xl border flex flex-col justify-between gap-2"
            style={{ background: t.bg, borderColor: t.border }}
          >
            <div className="flex items-center justify-between text-xs">
              <span
                className="font-bold flex items-center gap-1.5"
                style={{ color: t.text }}
              >
                <PawPrint size={14} style={{ color: t.primary }} /> Nina & Tobias
              </span>
              <span
                className="font-mono-num font-bold"
                style={{ color: t.primary }}
              >
                {petsPerfil[0]?.estoqueSaches ?? 6} sachês
              </span>
            </div>
            <p className="text-[11px] truncate" style={{ color: t.textSoft }}>
              Refeições hoje: {petsPerfil[0]?.alimentadoHojeRefeicoes ?? 1}/
              {petsPerfil[0]?.metaRefeicoesDia ?? 2} · Urinary
            </p>
            <div className="flex items-center gap-1.5">
              {petsPerfil.map((pet) => (
                <button
                  key={pet.id}
                  onClick={() => alimentarPet(pet.id)}
                  className="flex-1 py-1 rounded-lg text-[11px] font-bold text-white cursor-pointer transition-transform active:scale-95"
                  style={{ background: t.primary }}
                >
                  + {pet.nome}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PLAYER DE MODO FOCO (SE ATIVO) OU BARRA DE RESUMO DE HOJE */}
      {focoAtivoTask ? (
        <div
          className="rounded-3xl p-5 border shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{ background: t.action, color: "#FFFFFF", borderColor: t.action }}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              <span className="text-xs font-bold tracking-wide">
                Sessão de Foco Imersivo · {focoAtivoTask.duracaoMin || 25} min
              </span>
            </div>
            <h2 className="text-base md:text-lg font-bold">{focoAtivoTask.texto}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl font-mono-num font-bold bg-black/20 px-4 py-2 rounded-2xl">
              {formatTimer(segundosFocoRestantes)}
            </span>
            <button
              onClick={() => setFocoRodando((r) => !r)}
              className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {focoRodando ? <Pause size={14} /> : <Play size={14} />}
              {focoRodando ? "Pausar" : "Retomar"}
            </button>
            <button
              onClick={() => {
                toggleFeito(focoAtivoTask.id);
                encerrarFoco();
              }}
              className="px-4 py-2.5 rounded-xl bg-white text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              style={{ color: t.action }}
            >
              <Check size={14} /> Concluir Agora
            </button>
            <button
              onClick={encerrarFoco}
              className="px-3 py-2.5 rounded-xl bg-black/25 text-xs font-medium cursor-pointer"
            >
              Encerrar
            </button>
          </div>
        </div>
      ) : (
        /* KPI CARDS DO TOPO: PRONTIDÃO, PROGRESSO DO DIA, DINHEIRO LIVRE & ATALHO AGENDA */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => openCard({ tipo: "checkin_prontidao" })}
            className="rounded-2xl p-4 border text-left transition-transform active:scale-[0.99] cursor-pointer"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: t.textSoft }}>
                Prontidão Diária
              </span>
              <Activity size={15} style={{ color: t.primary }} />
            </div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-bold font-mono-num" style={{ color: t.primary }}>
                {detalhesProntidao.scoreTotal}%
              </span>
              <span className="text-xs font-mono-num" style={{ color: t.textSoft }}>
                Sono {checkin.horasSono}h
              </span>
            </div>
            <p className="text-[11px] mt-1 truncate" style={{ color: t.textSoft }}>
              Calibrar check-in de 30s
            </p>
          </button>

          <div
            className="rounded-2xl p-4 border text-left"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: t.textSoft }}>
                Ritmo de Hoje
              </span>
              <Flame size={15} style={{ color: t.action }} />
            </div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-bold font-mono-num" style={{ color: t.text }}>
                {pctHabitosHoje}%
              </span>
              <span className="text-xs font-mono-num" style={{ color: t.textSoft }}>
                hábitos · {pctTarefasHoje}% tarefas
              </span>
            </div>
            <div
              className="w-full h-1.5 rounded-full overflow-hidden mt-2"
              style={{ background: t.cardSubtle }}
            >
              <div
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.round((pctHabitosHoje + pctTarefasHoje) / 2)}%`,
                  background: t.action,
                }}
              />
            </div>
          </div>

          <button
            onClick={() => irParaAba("financas")}
            className="rounded-2xl p-4 border text-left transition-transform active:scale-[0.99] cursor-pointer"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: t.textSoft }}>
                Dinheiro Livre Hoje
              </span>
              <Wallet size={15} style={{ color: t.finance }} />
            </div>
            <p className="text-2xl font-bold font-mono-num mt-1.5" style={{ color: t.finance }}>
              R$ {dinheiroLivreInfo.livreHoje.toFixed(2).replace(".", ",")}
            </p>
            <p className="text-[11px] mt-1 truncate" style={{ color: t.textSoft }}>
              Líquido R$ {dinheiroLivreInfo.saldoLiquidoDisponivelMes.toFixed(0)} ÷ 4 dias
            </p>
          </button>

          <button
            onClick={() => {
              const el = document.getElementById("timeline-integrada-inicio");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="rounded-2xl p-4 border text-left transition-transform active:scale-[0.99] cursor-pointer"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: t.textSoft }}>
                Timeline Proporcional
              </span>
              <CalendarClock size={15} style={{ color: t.action }} />
            </div>
            <p className="text-sm font-bold mt-1.5 truncate" style={{ color: t.text }}>
              {compromissosHoje.length} blocos hoje
            </p>
            <p className="text-[11px] mt-1 truncate" style={{ color: t.action }}>
              Ir p/ timeline integrada (5m a 2h) ↓
            </p>
          </button>
        </div>
      )}

      {/* MODO SOBREVIVÊNCIA: FOCO ESTRITO NA P1 + GATOS */}
      {survivalMode && (
        <section
          className="rounded-3xl p-5 border space-y-3"
          style={{ background: t.card, borderColor: t.border }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: t.action }}>
            Modo Sobrevivência Ativo · Cuidado Essencial Nina & Tobias
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {petsPerfil.map((pet) => (
              <button
                key={pet.id}
                onClick={() => alimentarPet(pet.id)}
                className="p-4 rounded-2xl text-left border flex items-center justify-between cursor-pointer"
                style={{ background: t.bg, borderColor: t.border }}
              >
                <div>
                  <p className="text-sm font-bold">{pet.nome}</p>
                  <p className="text-xs font-mono-num" style={{ color: t.textSoft }}>
                    Refeições hoje: {pet.alimentadoHojeRefeicoes}/{pet.metaRefeicoesDia} · Sachês: {pet.estoqueSaches} un
                  </p>
                </div>
                <span
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white"
                  style={{ background: t.action }}
                >
                  + Dar Sachê
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* GRID PRINCIPAL RESPONSIVO (2 COLUNAS NO DESKTOP, 1 COLUNA NO MOBILE) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* COLUNA ESQUERDA (7 COLUNAS NO DESKTOP): TOP 3 PRIORIDADES + GESTÃO BIDIRECIONAL HOJE <-> BACKLOG */}
        <div className="xl:col-span-7 space-y-5">
          {/* 1. PRIORIDADES DO DIA (TOP 3) */}
          <section
            className="rounded-3xl p-5 border space-y-3.5"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold" style={{ color: t.text }}>
                  Prioridades de Hoje (Top {prioridades.length})
                </h3>
                <p className="text-xs" style={{ color: t.textSoft }}>
                  Ordenadas pelo Score Lala ou fixadas manualmente · 1 toque para iniciar foco
                </p>
              </div>
              <button
                onClick={() => {
                  const el = document.getElementById("timeline-integrada-inicio");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer shrink-0"
                style={{ background: t.cardSubtle, color: t.action }}
              >
                Ver na Timeline ↓
              </button>
            </div>

            <div className="space-y-2.5">
              {prioridades.map((p, idx) => {
                const score = calcularScorePrioridade(p);
                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                    style={{
                      background: t.bg,
                      borderColor: idx === 0 ? t.action : t.border,
                    }}
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      <button
                        onClick={() => toggleFeito(p.id)}
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 transition-transform active:scale-90 cursor-pointer"
                        style={{
                          background: p.feito ? t.primary : "transparent",
                          border: `2px solid ${p.feito ? t.primary : t.action}`,
                        }}
                        aria-label="Concluir prioridade"
                      >
                        {p.feito && <Check size={13} color="#fff" />}
                      </button>

                      <button
                        onClick={() => openCard({ tipo: "tarefa", id: p.id })}
                        className="flex-1 text-left min-w-0 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[11px] font-mono-num font-bold px-2 py-0.5 rounded-md"
                            style={{
                              background: idx === 0 ? t.action : t.cardSubtle,
                              color: idx === 0 ? "#fff" : t.text,
                            }}
                          >
                            P{idx + 1}
                          </span>
                          <span
                            className={`text-sm font-semibold ${
                              p.feito ? "line-through" : ""
                            }`}
                            style={{ color: p.feito ? t.textSoft : t.text }}
                          >
                            {p.texto}
                          </span>
                        </div>
                        <div
                          className="flex items-center gap-2 text-xs font-mono-num mt-1"
                          style={{ color: t.textSoft }}
                        >
                          <span>Score {score.toFixed(1)}</span>
                          <span>·</span>
                          <span>{p.duracaoMin || 30} min</span>
                          {p.horarioAgendado && (
                            <>
                              <span>·</span>
                              <span style={{ color: t.action }}>
                                Agendado {p.horarioAgendado}
                              </span>
                            </>
                          )}
                        </div>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {!p.feito && (
                        <button
                          onClick={() => iniciarFocoNaTarefa(p)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                          style={{ background: t.action }}
                        >
                          <Play size={12} fill="#fff" /> Foco
                        </button>
                      )}
                      <button
                        onClick={() => moverTarefaHorizonte(p.id, "backlog")}
                        className="px-2.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1 cursor-pointer"
                        style={{ background: t.cardSubtle, color: t.textSoft }}
                        title="Mover de Hoje para o Backlog"
                      >
                        <Archive size={13} />
                        <span className="hidden sm:inline">Backlog</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2. GESTÃO BIDIRECIONAL: HOJE ↔ SEMANA ↔ BACKLOG ORGANIZADO (REQ 4) */}
          {!survivalMode && (
            <section
              className="rounded-3xl p-5 border space-y-4"
              style={{ background: t.card, borderColor: t.border }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers size={16} style={{ color: t.action }} />
                    <h3 className="text-sm font-bold" style={{ color: t.text }}>
                      Fluxo Bidirecional: Hoje ↔ Semana ↔ Backlog
                    </h3>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: t.textSoft }}>
                    Mova tarefas sem prazo para o Backlog para limpar seu Hoje e traga de volta com 1 toque quando quiser
                  </p>
                </div>
              </div>

              {/* Abas do Horizonte de Tempo */}
              <div
                className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl border"
                style={{ background: t.bg, borderColor: t.border }}
              >
                <button
                  onClick={() => setAbaFluxo("hoje")}
                  className="py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  style={{
                    background: abaFluxo === "hoje" ? t.action : "transparent",
                    color: abaFluxo === "hoje" ? "#fff" : t.textSoft,
                  }}
                >
                  <span>Hoje</span>
                  <span className="font-mono-num px-1.5 py-0.2 rounded-md text-[11px] bg-black/10">
                    {tarefasHoje.length}
                  </span>
                </button>

                <button
                  onClick={() => setAbaFluxo("semana")}
                  className="py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  style={{
                    background: abaFluxo === "semana" ? t.finance : "transparent",
                    color: abaFluxo === "semana" ? "#fff" : t.textSoft,
                  }}
                >
                  <span>Esta Semana</span>
                  <span className="font-mono-num px-1.5 py-0.2 rounded-md text-[11px] bg-black/10">
                    {tarefasSemana.length}
                  </span>
                </button>

                <button
                  onClick={() => setAbaFluxo("backlog")}
                  className="py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  style={{
                    background: abaFluxo === "backlog" ? t.primary : "transparent",
                    color: abaFluxo === "backlog" ? "#fff" : t.textSoft,
                  }}
                >
                  <Archive size={13} />
                  <span>Backlog</span>
                  <span className="font-mono-num px-1.5 py-0.2 rounded-md text-[11px] bg-black/10">
                    {tarefasBacklog.length}
                  </span>
                </button>
              </div>

              {/* Filtros de Categoria + Busca Rápida */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {FILTROS_TAREFAS_HOJE.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFiltroCat(f.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer"
                      style={{
                        background: filtroCat === f.id ? t.cardSubtle : "transparent",
                        color: filtroCat === f.id ? t.text : t.textSoft,
                        border: `1px solid ${
                          filtroCat === f.id ? t.action : t.border
                        }`,
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border sm:w-52"
                  style={{ background: t.bg, borderColor: t.border }}
                >
                  <Search size={13} style={{ color: t.textSoft }} />
                  <input
                    value={buscaBacklog}
                    onChange={(e) => setBuscaBacklog(e.target.value)}
                    placeholder="Buscar tarefa..."
                    className="w-full text-xs outline-none bg-transparent"
                    style={{ color: t.text }}
                  />
                </div>
              </div>

              {/* Explicação contextual do horizonte selecionado */}
              <div
                className="px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between"
                style={{ background: t.cardSubtle, color: t.textSoft }}
              >
                {abaFluxo === "hoje" && (
                  <span>
                    Exibindo apenas o que você escolheu fazer <b>Hoje</b>. Ficou apertado? Envie para <b>Semana</b> ou <b>Backlog</b>.
                  </span>
                )}
                {abaFluxo === "semana" && (
                  <span>
                    Tarefas planejadas para os <b>próximos dias da semana</b>. Traga para <b>Hoje</b> quando abrir espaço.
                  </span>
                )}
                {abaFluxo === "backlog" && (
                  <span>
                    <b>Backlog Sem Prazo Fixo:</b> Suas ideias e pendências futuras ficam guardadas por área sem poluir a tela de Hoje.
                  </span>
                )}
              </div>

              {/* Lista de Tarefas com Botões Bidirecionais */}
              <div className="space-y-2">
                {tarefasFiltradas.map((tk) => {
                  const h = getHorizonte(tk);
                  const score = calcularScorePrioridade(tk);
                  return (
                    <div
                      key={tk.id}
                      className="p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors"
                      style={{ background: t.bg, borderColor: t.border }}
                    >
                      <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                        <button
                          onClick={() => toggleFeito(tk.id)}
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 cursor-pointer"
                          style={{
                            background: tk.feito ? t.primary : "transparent",
                            border: `1.5px solid ${
                              tk.feito ? t.primary : t.textSoft
                            }`,
                          }}
                        >
                          {tk.feito && <Check size={11} color="#fff" />}
                        </button>

                        <button
                          onClick={() => openCard({ tipo: "tarefa", id: tk.id })}
                          className="text-left min-w-0 flex-1 cursor-pointer"
                        >
                          <p
                            className={`text-xs sm:text-sm font-semibold ${
                              tk.feito ? "line-through" : ""
                            }`}
                            style={{ color: tk.feito ? t.textSoft : t.text }}
                          >
                            {tk.texto}
                          </p>
                          <div
                            className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono-num mt-0.5"
                            style={{ color: t.textSoft }}
                          >
                            <span
                              className="font-semibold uppercase"
                              style={{ color: t[tk.cor] }}
                            >
                              {tk.categoriaFiltro}
                            </span>
                            <span>·</span>
                            <span>{tk.duracaoMin || 15} min</span>
                            <span>·</span>
                            <span>Score {score.toFixed(1)}</span>
                            {tk.horarioAgendado && (
                              <>
                                <span>·</span>
                                <span style={{ color: t.action }}>
                                  às {tk.horarioAgendado}
                                </span>
                              </>
                            )}
                            {!tk.prazoFixo && h === "backlog" && (
                              <>
                                <span>·</span>
                                <span>Sem prazo fixo</span>
                              </>
                            )}
                          </div>
                        </button>
                      </div>

                      {/* AÇÕES BIDIRECIONAIS DEPENDENDO DE ONDE A TAREFA ESTÁ */}
                      <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center shrink-0">
                        {h === "hoje" ? (
                          <>
                            <button
                              onClick={() => promoverP1(tk.id)}
                              className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                              style={{
                                background:
                                  tk.manualLock === "p1" ? t.action : t.cardSubtle,
                                color: tk.manualLock === "p1" ? "#fff" : t.text,
                              }}
                              title="Fixar como Prioridade 1 de Hoje"
                            >
                              <Star size={11} /> P1
                            </button>
                            <button
                              onClick={() =>
                                agendarTarefaNoHorario(
                                  tk.id,
                                  tk.horarioAgendado || "15:30",
                                  tk.duracaoMin || 15
                                )
                              }
                              className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                              style={{ background: t.cardSubtle, color: t.text }}
                              title="Alocar duração real na Agenda"
                            >
                              <Clock size={11} /> {tk.duracaoMin || 15}m
                            </button>
                            <button
                              onClick={() => moverTarefaHorizonte(tk.id, "semana")}
                              className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                              style={{ background: t.cardSubtle, color: t.finance }}
                              title="Mover para Esta Semana"
                            >
                              Semana <ArrowRight size={11} />
                            </button>
                            <button
                              onClick={() => moverTarefaHorizonte(tk.id, "backlog")}
                              className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                              style={{ background: t.cardSubtle, color: t.textSoft }}
                              title="Guardar no Backlog (sem poluir Hoje)"
                            >
                              Backlog <ArrowRight size={11} />
                            </button>
                          </>
                        ) : (
                          /* Tarefa está em SEMANA ou BACKLOG -> Permite trazer de volta para HOJE ou SEMANA */
                          <>
                            <button
                              onClick={() =>
                                moverTarefaHorizonte(tk.id, "hoje", false)
                              }
                              className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                              style={{ background: t.primary }}
                            >
                              <ArrowLeft size={11} /> Trazer p/ Hoje
                            </button>
                            <button
                              onClick={() =>
                                moverTarefaHorizonte(tk.id, "hoje", true)
                              }
                              className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-white flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                              style={{ background: t.action }}
                              title="Trazer direto como Prioridade 1 de Hoje"
                            >
                              <Star size={11} /> Hoje (P1)
                            </button>
                            {h === "backlog" ? (
                              <button
                                onClick={() =>
                                  moverTarefaHorizonte(tk.id, "semana", false)
                                }
                                className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer"
                                style={{
                                  background: t.cardSubtle,
                                  color: t.finance,
                                }}
                              >
                                → Semana
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  moverTarefaHorizonte(tk.id, "backlog", false)
                                }
                                className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer"
                                style={{
                                  background: t.cardSubtle,
                                  color: t.textSoft,
                                }}
                              >
                                → Backlog
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {tarefasFiltradas.length === 0 && (
                  <div
                    className="p-6 rounded-2xl border text-center space-y-1"
                    style={{ background: t.bg, borderColor: t.border }}
                  >
                    <p className="text-xs font-semibold" style={{ color: t.text }}>
                      Nenhuma tarefa neste filtro ({abaFluxo.toUpperCase()})
                    </p>
                    <p className="text-[11px]" style={{ color: t.textSoft }}>
                      Adicione uma nova tarefa abaixo ou alterne entre Hoje, Semana e Backlog.
                    </p>
                  </div>
                )}
              </div>

              {/* Barra de Criação de Tarefa com Escolha de Destino (Hoje / Semana / Backlog) e Duração Real */}
              <div
                className="p-3.5 rounded-2xl border space-y-2.5"
                style={{ background: t.bg, borderColor: t.border }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold" style={{ color: t.text }}>
                    Nova tarefa ou ideia sem prazo:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px]" style={{ color: t.textSoft }}>
                      Duração real:
                    </span>
                    {[5, 15, 30, 45, 60].map((min) => (
                      <button
                        key={min}
                        onClick={() => setNovaTarefaDuracao(min)}
                        className="px-2 py-1 rounded-lg text-[11px] font-mono-num font-semibold cursor-pointer"
                        style={{
                          background:
                            novaTarefaDuracao === min ? t.action : t.cardSubtle,
                          color: novaTarefaDuracao === min ? "#fff" : t.textSoft,
                        }}
                      >
                        {min}m
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={novaTarefaTexto}
                    onChange={(e) => setNovaTarefaTexto(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && criarNovaTarefa()}
                    placeholder="Ex: Enviar comprovante UERJ (5m), Ideia de leitura pro Backlog..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl text-xs outline-none border"
                    style={{
                      background: t.card,
                      color: t.text,
                      borderColor: t.border,
                    }}
                  />
                  <div className="flex gap-1.5">
                    <select
                      value={novaTarefaDestino}
                      onChange={(e) =>
                        setNovaTarefaDestino(e.target.value as TaskHorizon)
                      }
                      className="px-3 py-2.5 rounded-xl text-xs font-semibold outline-none border cursor-pointer"
                      style={{
                        background: t.card,
                        color: t.text,
                        borderColor: t.border,
                      }}
                    >
                      <option value="hoje">Salvar em Hoje</option>
                      <option value="semana">Salvar na Semana</option>
                      <option value="backlog">Salvar no Backlog (Sem prazo)</option>
                    </select>
                    <button
                      onClick={criarNovaTarefa}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1 shrink-0 cursor-pointer"
                      style={{ background: t.action }}
                    >
                      <Plus size={14} /> Criar
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* COLUNA DIREITA (5 COLUNAS NO DESKTOP): PAINEL DE HÁBITOS DIÁRIOS (1 TOQUE + STREAK) + METAS + RADAR */}
        {!survivalMode && (
          <div className="xl:col-span-5 space-y-5">
            {/* 3. PAINEL VISUAL DE HÁBITOS DIÁRIOS (1 TOQUE, STREAK E PROGRESSO PERCENTUAL - REQ 5) */}
            <section
              className="rounded-3xl p-5 border space-y-4"
              style={{ background: t.card, borderColor: t.border }}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Flame size={16} style={{ color: t.action }} />
                    <h3 className="text-sm font-bold" style={{ color: t.text }}>
                      Hábitos Diários · 1 Toque & Sequência
                    </h3>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: t.textSoft }}>
                    Toque para marcar hoje e manter sua sequência ativa
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className="text-base font-mono-num font-bold"
                    style={{ color: t.primary }}
                  >
                    {pctHabitosHoje}%
                  </span>
                  <span
                    className="block text-[10px] font-mono-num"
                    style={{ color: t.textSoft }}
                  >
                    {habitosConcluidos}/{habitos.length} hoje
                  </span>
                </div>
              </div>

              {/* Barra de Progresso Geral dos Hábitos */}
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ background: t.cardSubtle }}
              >
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ width: `${pctHabitosHoje}%`, background: t.primary }}
                />
              </div>

              {/* Lista Visual de Hábitos Diários */}
              <div className="space-y-2.5">
                {habitos.map((hab) => {
                  const diasLabels = ["S", "T", "Q", "Q", "S", "S", "D"];
                  return (
                    <div
                      key={hab.id}
                      onClick={() => toggleHabitoHoje(hab.id)}
                      className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99]"
                      style={{
                        background: hab.feitoHoje
                          ? t.mode === "light"
                            ? "#F2F7F4"
                            : "rgba(125, 179, 145, 0.12)"
                          : t.bg,
                        borderColor: hab.feitoHoje ? t.primary : t.border,
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Botão de 1 Toque */}
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                          style={{
                            background: hab.feitoHoje ? t.primary : t.cardSubtle,
                            color: hab.feitoHoje ? "#fff" : t[hab.cor],
                          }}
                        >
                          {hab.feitoHoje ? (
                            <Check size={17} strokeWidth={2.5} />
                          ) : (
                            renderHabitoIcon(hab.icone, t[hab.cor])
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p
                              className={`text-xs sm:text-sm font-bold truncate ${
                                hab.feitoHoje ? "line-through opacity-85" : ""
                              }`}
                              style={{ color: t.text }}
                            >
                              {hab.titulo}
                            </p>
                          </div>

                          <div
                            className="flex items-center gap-2 text-[11px] font-mono-num mt-0.5"
                            style={{ color: t.textSoft }}
                          >
                            <span
                              className="font-semibold flex items-center gap-0.5"
                              style={{ color: t.action }}
                            >
                              🔥 {hab.streakAtual}d seguidos
                            </span>
                            <span>·</span>
                            <span>Recorde {hab.melhorStreak}d</span>
                            {hab.metaTexto && (
                              <>
                                <span>·</span>
                                <span>{hab.metaTexto}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Mini-histórico de 7 dias da semana */}
                      <div className="flex items-center gap-1 shrink-0">
                        {hab.historicoSemana.map((feitoDia, idxDia) => (
                          <div
                            key={idxDia}
                            className="flex flex-col items-center gap-0.5"
                          >
                            <span
                              className="text-[9px] font-mono-num"
                              style={{ color: t.textSoft }}
                            >
                              {diasLabels[idxDia]}
                            </span>
                            <span
                              className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                              style={{
                                background: feitoDia ? t.primary : t.cardSubtle,
                              }}
                            >
                              {feitoDia && <Check size={8} color="#fff" />}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Adicionar Novo Hábito Diário */}
              {mostrarFormHabito ? (
                <div
                  className="p-3 rounded-2xl border space-y-2"
                  style={{ background: t.bg, borderColor: t.border }}
                >
                  <div className="flex gap-2">
                    <input
                      value={novoHabitoTitulo}
                      onChange={(e) => setNovoHabitoTitulo(e.target.value)}
                      placeholder="Nome do hábito (ex: Alongar posterior 5m)..."
                      className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                      style={{ background: t.card, color: t.text }}
                    />
                    <input
                      value={novoHabitoMeta}
                      onChange={(e) => setNovoHabitoMeta(e.target.value)}
                      placeholder="Meta (5 min)"
                      className="w-24 px-2.5 py-2 rounded-xl text-xs font-mono-num outline-none"
                      style={{ background: t.card, color: t.text }}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setMostrarFormHabito(false)}
                      className="px-3 py-1.5 rounded-xl text-xs"
                      style={{ color: t.textSoft }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        if (!novoHabitoTitulo.trim()) return;
                        adicionarHabito(novoHabitoTitulo.trim(), novoHabitoMeta.trim());
                        setNovoHabitoTitulo("");
                        setMostrarFormHabito(false);
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white"
                      style={{ background: t.primary }}
                    >
                      Salvar Hábito
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setMostrarFormHabito(true)}
                  className="w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border cursor-pointer"
                  style={{
                    background: t.bg,
                    borderColor: t.border,
                    color: t.textSoft,
                  }}
                >
                  <Plus size={13} /> Novo Hábito Diário
                </button>
              )}
            </section>

            {/* 4. METAS ATIVAS COM PROGRESSO PERCENTUAL & MARCOS DE 1 TOQUE (REQ 5) */}
            <section
              className="rounded-3xl p-5 border space-y-4"
              style={{ background: t.card, borderColor: t.border }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target size={16} style={{ color: t.primary }} />
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: t.text }}>
                      Metas & Progresso Percentual
                    </h3>
                    <p className="text-xs" style={{ color: t.textSoft }}>
                      Marcos intermediários com atualização em tempo real
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {metas.map((meta) => {
                  const feitos = meta.marcos.filter((m) => m.concluido).length;
                  const pct =
                    meta.marcos.length > 0
                      ? Math.round((feitos / meta.marcos.length) * 100)
                      : 0;
                  return (
                    <div
                      key={meta.id}
                      className="p-4 rounded-2xl border space-y-2.5"
                      style={{ background: t.bg, borderColor: t.border }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div
                            className="flex items-center gap-1.5 text-[11px] font-medium"
                            style={{ color: t[meta.cor] }}
                          >
                            <span>{meta.categoria}</span>
                            <span>·</span>
                            <span>Prazo {meta.prazo}</span>
                          </div>
                          <p
                            className="text-xs sm:text-sm font-bold mt-0.5"
                            style={{ color: t.text }}
                          >
                            {meta.titulo}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className="text-sm font-mono-num font-bold"
                            style={{ color: t[meta.cor] }}
                          >
                            {pct}%
                          </span>
                          <span
                            className="block text-[10px] font-mono-num"
                            style={{ color: t.textSoft }}
                          >
                            {feitos}/{meta.marcos.length} marcos
                          </span>
                        </div>
                      </div>

                      <div
                        className="w-full h-2 rounded-full overflow-hidden"
                        style={{ background: t.cardSubtle }}
                      >
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%`, background: t[meta.cor] }}
                        />
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {meta.marcos.map((mc) => (
                          <button
                            key={mc.id}
                            onClick={() =>
                              setMetas((prev) =>
                                prev.map((mt) =>
                                  mt.id === meta.id
                                    ? {
                                        ...mt,
                                        marcos: mt.marcos.map((m) =>
                                          m.id === mc.id
                                            ? { ...m, concluido: !m.concluido }
                                            : m
                                        ),
                                      }
                                    : mt
                                )
                              )
                            }
                            className="w-full flex items-center gap-2.5 text-left text-xs py-1 cursor-pointer"
                          >
                            <span
                              className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors"
                              style={{
                                background: mc.concluido
                                  ? t.primary
                                  : "transparent",
                                border: `1.5px solid ${
                                  mc.concluido ? t.primary : t.textSoft
                                }`,
                              }}
                            >
                              {mc.concluido && <Check size={10} color="#fff" />}
                            </span>
                            <span
                              className={mc.concluido ? "line-through" : ""}
                              style={{
                                color: mc.concluido ? t.textSoft : t.text,
                              }}
                            >
                              {mc.texto}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Adicionar novo marco à meta */}
                      {metaExpandidaInput === meta.id ? (
                        <div className="flex gap-1.5 pt-1">
                          <input
                            value={novoMarcoTexto}
                            onChange={(e) => setNovoMarcoTexto(e.target.value)}
                            placeholder="Novo marco intermediário..."
                            className="flex-1 px-2.5 py-1.5 rounded-xl text-xs outline-none"
                            style={{ background: t.card, color: t.text }}
                          />
                          <button
                            onClick={() => {
                              if (!novoMarcoTexto.trim()) return;
                              setMetas((prev) =>
                                prev.map((mt) =>
                                  mt.id === meta.id
                                    ? {
                                        ...mt,
                                        marcos: [
                                          ...mt.marcos,
                                          {
                                            id: Date.now(),
                                            texto: novoMarcoTexto.trim(),
                                            concluido: false,
                                          },
                                        ],
                                      }
                                    : mt
                                )
                              );
                              setNovoMarcoTexto("");
                              setMetaExpandidaInput(null);
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
                            style={{ background: t.primary }}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setMetaExpandidaInput(meta.id)}
                          className="text-[11px] font-semibold pt-0.5 cursor-pointer"
                          style={{ color: t.textSoft }}
                        >
                          + Adicionar etapa na meta
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 5. RADAR DE PREPARAÇÃO (7 A 14 DIAS) */}
            <section
              className="rounded-3xl p-5 border space-y-3.5"
              style={{ background: t.card, borderColor: t.border }}
            >
              <div className="flex items-center gap-2">
                <Compass size={16} style={{ color: t.action }} />
                <div>
                  <h3 className="text-sm font-bold" style={{ color: t.text }}>
                    Radar de Preparação (7 a 14 dias)
                  </h3>
                  <p className="text-xs" style={{ color: t.textSoft }}>
                    Antecipe provas e entregáveis puxando passos para Hoje
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {radarItens.map((rad) => {
                  const concluidas = rad.etapas.filter((e) => e.concluida).length;
                  const proximaEtapa = rad.etapas.find((e) => !e.concluida);

                  return (
                    <div
                      key={rad.id}
                      className="p-3.5 rounded-2xl border space-y-2"
                      style={{ background: t.bg, borderColor: t.border }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() =>
                            openCard({ tipo: "radar_item", id: rad.id })
                          }
                          className="text-left flex-1 min-w-0 cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 text-[11px] font-mono-num">
                            <span
                              className="font-semibold"
                              style={{ color: t[rad.cor] }}
                            >
                              {rad.area} · {rad.dataEvento}
                            </span>
                            <span>·</span>
                            <span
                              className="font-bold"
                              style={{ color: t.action }}
                            >
                              Faltam {rad.diasRestantes}d
                            </span>
                          </div>
                          <p
                            className="text-xs sm:text-sm font-bold mt-0.5 truncate"
                            style={{ color: t.text }}
                          >
                            {rad.titulo}
                          </p>
                        </button>

                        <span
                          className="text-xs font-mono-num"
                          style={{ color: t.textSoft }}
                        >
                          {concluidas}/{rad.etapas.length}
                        </span>
                      </div>

                      {proximaEtapa && (
                        <div
                          className="p-2.5 rounded-xl flex items-center justify-between gap-2"
                          style={{ background: t.card }}
                        >
                          <div className="min-w-0 flex-1">
                            <span
                              className="text-[10px] font-bold block"
                              style={{ color: t.action }}
                            >
                              {proximaEtapa.rotuloTempo}:
                            </span>
                            <span
                              className="text-xs truncate block"
                              style={{ color: t.text }}
                            >
                              {proximaEtapa.acao}
                            </span>
                          </div>
                          {!proximaEtapa.enviadaParaHoje ? (
                            <button
                              onClick={() =>
                                enviarEtapaRadarParaHoje(rad.id, proximaEtapa.id)
                              }
                              className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white shrink-0 cursor-pointer"
                              style={{ background: t.action }}
                            >
                              Trazer p/ Hoje
                            </button>
                          ) : (
                            <span
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg shrink-0"
                              style={{
                                background: t.cardSubtle,
                                color: t.primary,
                              }}
                            >
                              Em Hoje ✓
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* 6. TIMELINE PROPORCIONAL & COMPROMISSOS INTEGRADOS NA ABA INÍCIO */}
      {!survivalMode && (
        <div id="timeline-integrada-inicio" className="pt-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <CalendarClock size={18} style={{ color: t.action }} />
              <div>
                <h3 className="text-sm sm:text-base font-bold" style={{ color: t.text }}>
                  Timeline Proporcional & Compromissos do Dia
                </h3>
                <p className="text-xs" style={{ color: t.textSoft }}>
                  Integrada ao Início · Blocos com altura exata em minutos (5m a 2h) e alocação rápida
                </p>
              </div>
            </div>
          </div>

          <AgendaScreen
            t={t}
            compromissos={compromissos}
            setCompromissos={setCompromissos}
            tarefas={todasTarefas}
            agendarTarefaNoHorario={agendarTarefaNoHorario}
            openCard={openCard}
            showToast={showToast}
          />
        </div>
      )}
    </div>
  );
}
