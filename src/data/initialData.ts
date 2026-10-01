import {
  ArquivoRepositorio,
  Artigo,
  CartaoCredito,
  CheckinProntidao,
  ComodoCasa,
  Compromisso,
  ContaBancaria,
  Disciplina,
  FaseArtigo,
  FichaTreino,
  HabitoDiario,
  ItemEstoqueCasa,
  ItemListaCompras,
  ItemRadar,
  ItemRefeicao,
  LancamentoFinanceiro,
  LivroLeitura,
  MetaItem,
  OrcamentoCategoria,
  PetPerfil,
  ProjetoTrabalho,
  TaskCategoryFilter,
  TaskItem,
  ThemeMode,
  ThemeTokens,
} from "../types/lala";

export const THEMES: Record<ThemeMode, ThemeTokens> = {
  light: {
    mode: "light",
    bg: "#F7F5F1",
    card: "#FFFFFF",
    cardSubtle: "#EFECE6",
    border: "#E5E0D8",
    primary: "#5B8C6E",
    action: "#CC6B4E",
    finance: "#2E5266",
    alert: "#D18428",
    danger: "#D14338",
    text: "#1B232E",
    textSoft: "#586272",
  },
  dark: {
    mode: "dark",
    bg: "#111418",
    card: "#191D24",
    cardSubtle: "#222831",
    border: "#2D3440",
    primary: "#7DB391",
    action: "#E08266",
    finance: "#6396B3",
    alert: "#E5A552",
    danger: "#E85D4C",
    text: "#F3F4F6",
    textSoft: "#9CA3AF",
  },
  survival: {
    mode: "survival",
    bg: "#141414",
    card: "#1F1F1F",
    cardSubtle: "#292929",
    border: "#3D2927",
    primary: "#E85D4C",
    action: "#E85D4C",
    finance: "#E85D4C",
    alert: "#E85D4C",
    danger: "#E85D4C",
    text: "#F5F5F5",
    textSoft: "#A3A3A3",
  },
};

export const FASES_ARTIGO: FaseArtigo[] = [
  "Triagem",
  "Leitura ativa",
  "Fichamento/Notas",
  "Escrita/Citações",
  "Submissão",
];

export const FILTROS_TAREFAS_HOJE: { id: TaskCategoryFilter; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "uerj", label: "UERJ" },
  { id: "trabalho", label: "Trabalho" },
  { id: "casa", label: "Casa" },
  { id: "pessoal", label: "Pessoal" },
];

/**
 * Fórmula oficial de priorização da Lala:
 * Score = Impacto * 30% + Urgência * 25% + Facilidade * 25% + Retorno * 20%
 */
export function calcularScorePrioridade(
  t: Pick<TaskItem, "impacto" | "urgencia" | "facilidade" | "retorno">
): number {
  const raw =
    t.impacto * 0.3 +
    t.urgencia * 0.25 +
    t.facilidade * 0.25 +
    t.retorno * 0.2;
  return Math.round(raw * 10) / 10;
}

/**
 * Converte horário "HH:MM" para minutos desde 00:00
 */
export function horaParaMinutos(hora: string): number {
  const partes = hora.split(":");
  const h = parseInt(partes[0] || "0", 10);
  const m = parseInt(partes[1] || "0", 10);
  return h * 60 + m;
}

/**
 * Converte minutos desde 00:00 para "HH:MM"
 */
export function minutosParaHora(totalMin: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMin)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Cálculo transparente de Prontidão Diária:
 * Combina Check-in de 30s (Sono, Energia Física, Foco Mental) + Fadiga de Treino (sRPE).
 */
export function calcularProntidaoDetalhada(
  checkin: CheckinProntidao,
  volumeSemana: number[],
  ultimoSRPE: number
): {
  scoreTotal: number;
  scoreSono: number;
  scoreCorpo: number;
  scoreMente: number;
  penalidadeCarga: number;
  statusTexto: string;
} {
  const ratioHoras = Math.min(1.1, checkin.horasSono / 7.5);
  const scoreSono = Math.round(ratioHoras * 22 + (checkin.qualidadeSono / 5) * 18);
  const scoreCorpo = Math.round((checkin.energiaFisica / 5) * 35);
  const scoreMente = Math.round((checkin.focoMental / 5) * 25);

  const ativos = volumeSemana.filter((v) => v > 0);
  const mediaSemana =
    ativos.length > 0 ? ativos.reduce((a, b) => a + b, 0) / ativos.length : 4;
  const penalidadeCarga = Math.max(
    0,
    Math.round((ultimoSRPE - 5) * 2.5 + (mediaSemana - 5) * 1.5)
  );

  const bruto = scoreSono + scoreCorpo + scoreMente - penalidadeCarga;
  const scoreTotal = Math.max(25, Math.min(99, bruto));

  let statusTexto = "Prontidão alta · Ótimo dia para carga forte e estudo denso";
  if (scoreTotal < 55) {
    statusTexto = "Recuperação baixa · Priorize o essencial e reduza volume";
  } else if (scoreTotal < 78) {
    statusTexto = "Prontidão moderada · Ritmo sustentável (UERJ + treino técnico)";
  }

  return {
    scoreTotal,
    scoreSono: Math.min(40, scoreSono),
    scoreCorpo: Math.min(35, scoreCorpo),
    scoreMente: Math.min(25, scoreMente),
    penalidadeCarga,
    statusTexto,
  };
}

/**
 * Cálculo de Nota Necessária na UERJ:
 */
export function calcularSituacaoNotaDisciplina(d: Disciplina): {
  mediaParcial: number | null;
  notaNecessariaProxima: number | null;
  mensagem: string;
  riscoFaltas: "seguro" | "atencao" | "critico";
  pctFaltasLimite: number;
} {
  const pctFaltasLimite = Math.round((d.faltasAtuais / d.faltasMax) * 100);
  let riscoFaltas: "seguro" | "atencao" | "critico" = "seguro";
  if (pctFaltasLimite >= 75) riscoFaltas = "critico";
  else if (pctFaltasLimite >= 50) riscoFaltas = "atencao";

  const comNota = d.avaliacoes.filter(
    (av) => typeof av.notaObtida === "number" && av.notaObtida !== null
  );
  const semNota = d.avaliacoes.filter(
    (av) => av.notaObtida === undefined || av.notaObtida === null
  );

  const pesoTotal = d.avaliacoes.reduce((acc, av) => acc + (av.peso || 1), 0);
  const somaPonderadaAtual = comNota.reduce(
    (acc, av) => acc + (av.notaObtida || 0) * (av.peso || 1),
    0
  );
  const pesoCumprido = comNota.reduce((acc, av) => acc + (av.peso || 1), 0);
  const pesoRestante = semNota.reduce((acc, av) => acc + (av.peso || 1), 0);

  const mediaParcial =
    pesoCumprido > 0
      ? Math.round((somaPonderadaAtual / pesoCumprido) * 10) / 10
      : null;

  if (pesoRestante === 0 && pesoTotal > 0) {
    const final = Math.round((somaPonderadaAtual / pesoTotal) * 10) / 10;
    return {
      mediaParcial: final,
      notaNecessariaProxima: 0,
      mensagem:
        final >= d.mediaAprovacao
          ? `Aprovada direto com média ${final}!`
          : `Média ${final} · Atenção para exame final`,
      riscoFaltas,
      pctFaltasLimite,
    };
  }

  const pontosTotaisParaSete = d.mediaAprovacao * (pesoTotal || 2);
  const pontosFaltantes = Math.max(0, pontosTotaisParaSete - somaPonderadaAtual);
  const notaNecessaria =
    pesoRestante > 0
      ? Math.round((pontosFaltantes / pesoRestante) * 10) / 10
      : d.mediaAprovacao;

  const msg =
    comNota.length === 0
      ? `Meta de média ${d.mediaAprovacao.toFixed(1)} para passar sem final`
      : `Média parcial ${mediaParcial?.toFixed(1)} · Precisa de ${notaNecessaria.toFixed(
          1
        )} na próxima avaliação`;

  return {
    mediaParcial,
    notaNecessariaProxima: notaNecessaria,
    mensagem: msg,
    riscoFaltas,
    pctFaltasLimite,
  };
}

/**
 * Cálculo automático de "Dinheiro Livre Hoje"
 */
export function calcularDinheiroLivreHoje(
  contas: ContaBancaria[],
  lancamentosMes: LancamentoFinanceiro[],
  diasRestantesMes = 4
): {
  livreHoje: number;
  saldoLiquidoDisponivelMes: number;
  saldoContasOperacionais: number;
  despesasPrevistasPendentes: number;
  gastoRealizadoHoje: number;
} {
  const saldoContasOperacionais = contas
    .filter((c) => c.tipo !== "Reserva")
    .reduce((acc, c) => acc + c.saldoAtual, 0);

  const despesasPrevistasPendentes = lancamentosMes
    .filter((l) => l.tipo === "despesa" && l.status === "previsto")
    .reduce((acc, l) => acc + l.valor, 0);

  const receitasPrevistasPendentes = lancamentosMes
    .filter((l) => l.tipo === "receita" && l.status === "previsto")
    .reduce((acc, l) => acc + l.valor, 0);

  const gastoRealizadoHoje = lancamentosMes
    .filter(
      (l) => l.tipo === "despesa" && l.status === "realizado" && l.data === "hoje"
    )
    .reduce((acc, l) => acc + l.valor, 0);

  const saldoLiquidoDisponivelMes = Math.max(
    0,
    saldoContasOperacionais +
      receitasPrevistasPendentes -
      despesasPrevistasPendentes
  );

  const divisor = Math.max(1, diasRestantesMes);
  const cotaBaseDia = saldoLiquidoDisponivelMes / divisor;
  const livreHoje = Math.max(
    0,
    Math.round((cotaBaseDia - gastoRealizadoHoje) * 100) / 100
  );

  return {
    livreHoje,
    saldoLiquidoDisponivelMes,
    saldoContasOperacionais,
    despesasPrevistasPendentes,
    gastoRealizadoHoje,
  };
}

// ---------- DADOS INICIAIS ----------

export const INITIAL_CHECKIN: CheckinProntidao = {
  horasSono: 7.5,
  qualidadeSono: 4,
  energiaFisica: 4,
  focoMental: 4,
  realizadoHoje: true,
  nota: "Acordei disposta, leve cansaço de ombro do treino de stunting.",
};

export const INITIAL_HABITOS: HabitoDiario[] = [
  {
    id: 1,
    titulo: "Hidratação Atleta (2,8L Água)",
    icone: "droplets",
    categoria: "Saúde",
    cor: "primary",
    feitoHoje: true,
    streakAtual: 14,
    melhorStreak: 21,
    historicoSemana: [true, true, true, true, true, true, true],
    metaTexto: "2,8L / dia",
  },
  {
    id: 2,
    titulo: "Creatina 5g + Mobilidade Punho/Ombro",
    icone: "dumbbell",
    categoria: "Saúde",
    cor: "action",
    feitoHoje: true,
    streakAtual: 9,
    melhorStreak: 15,
    historicoSemana: [true, true, false, true, true, true, true],
    metaTexto: "5 min",
  },
  {
    id: 3,
    titulo: "Sachê Úmido + Fonte Limpa (Nina & Tobias)",
    icone: "paw",
    categoria: "Casa & Pets",
    cor: "primary",
    feitoHoje: true,
    streakAtual: 32,
    melhorStreak: 32,
    historicoSemana: [true, true, true, true, true, true, true],
    metaTexto: "2x / dia",
  },
  {
    id: 4,
    titulo: "Leitura Acadêmica ou Literatura (15 págs)",
    icone: "book",
    categoria: "Estudos",
    cor: "finance",
    feitoHoje: false,
    streakAtual: 6,
    melhorStreak: 12,
    historicoSemana: [true, true, true, true, true, true, false],
    metaTexto: "20 min",
  },
  {
    id: 5,
    titulo: "Destralhar Bancada & Preparar Mochila UERJ",
    icone: "sparkles",
    categoria: "Mente",
    cor: "alert",
    feitoHoje: false,
    streakAtual: 5,
    melhorStreak: 10,
    historicoSemana: [true, false, true, true, true, true, false],
    metaTexto: "5 min",
  },
];

export const INITIAL_TAREFAS: TaskItem[] = [
  // TAREFAS DE HOJE
  {
    id: 1,
    texto: "Fichamento — artigo Fisiologia UERJ (Foster sRPE)",
    aba: "estudos_trabalho",
    categoriaFiltro: "uerj",
    cor: "primary",
    feito: false,
    impacto: 9,
    urgencia: 9,
    facilidade: 7,
    retorno: 9,
    horizonte: "hoje",
    manualLock: "p1",
    horarioAgendado: "10:00",
    duracaoMin: 45,
    prazoFixo: "28/09",
    diaAgendado: 27,
  },
  {
    id: 2,
    texto: "Treino técnico Cheer + Mobilidade de ombro",
    aba: "saude_pets",
    categoriaFiltro: "pessoal",
    cor: "action",
    feito: false,
    impacto: 8,
    urgencia: 8,
    facilidade: 8,
    retorno: 8,
    horizonte: "hoje",
    manualLock: "top3",
    horarioAgendado: "17:30",
    duracaoMin: 60,
    prazoFixo: "Hoje",
    diaAgendado: 27,
  },
  {
    id: 3,
    texto: "Fechar grade de horários CDT e enviar no grupo",
    aba: "estudos_trabalho",
    categoriaFiltro: "trabalho",
    cor: "alert",
    feito: false,
    impacto: 9,
    urgencia: 8,
    facilidade: 6,
    retorno: 8,
    horizonte: "hoje",
    manualLock: "top3",
    horarioAgendado: "14:00",
    duracaoMin: 45,
    prazoFixo: "28/09",
    diaAgendado: 27,
  },
  {
    id: 4,
    texto: "Peneirar caixa de areia + água fresca (Nina & Tobias)",
    aba: "casa_rotinas",
    categoriaFiltro: "casa",
    cor: "primary",
    feito: false,
    impacto: 8,
    urgencia: 8,
    facilidade: 9,
    retorno: 8,
    horizonte: "hoje",
    manualLock: null,
    horarioAgendado: "07:30",
    duracaoMin: 5,
    prazoFixo: "Hoje",
  },
  {
    id: 5,
    texto: "Pix pro Márcio — R$ 10,00 (racha xerox Fisiologia)",
    aba: "financas",
    categoriaFiltro: "pessoal",
    cor: "finance",
    feito: false,
    impacto: 6,
    urgencia: 8,
    facilidade: 10,
    retorno: 6,
    horizonte: "hoje",
    manualLock: null,
    horarioAgendado: "12:15",
    duracaoMin: 5,
    prazoFixo: "Hoje",
  },

  // TAREFAS DA SEMANA
  {
    id: 6,
    texto: "Revisar plano de aula de Didática (entrega dia 30/09)",
    aba: "estudos_trabalho",
    categoriaFiltro: "uerj",
    cor: "primary",
    feito: false,
    impacto: 8,
    urgencia: 7,
    facilidade: 6,
    retorno: 8,
    horizonte: "semana",
    manualLock: null,
    duracaoMin: 40,
    prazoFixo: "30/09",
  },
  {
    id: 7,
    texto: "Responder equipe RCR sobre ajuste de contagem (1:42)",
    aba: "estudos_trabalho",
    categoriaFiltro: "trabalho",
    cor: "alert",
    feito: false,
    impacto: 7,
    urgencia: 6,
    facilidade: 8,
    retorno: 7,
    horizonte: "semana",
    manualLock: null,
    duracaoMin: 15,
    prazoFixo: "01/10",
  },

  // BACKLOG ORGANIZADO (SEM PRAZO FIXO — NÃO POLUI O HOJE, MAS NÃO SOME)
  {
    id: 8,
    texto: "Organizar pasta de certificados de horas complementares UERJ",
    aba: "estudos_trabalho",
    categoriaFiltro: "uerj",
    cor: "primary",
    feito: false,
    impacto: 7,
    urgencia: 3,
    facilidade: 8,
    retorno: 8,
    horizonte: "backlog",
    manualLock: "backlog",
    duracaoMin: 25,
  },
  {
    id: 9,
    texto: "Montar playlist aquecimento acrobático para turmas CDT",
    aba: "estudos_trabalho",
    categoriaFiltro: "trabalho",
    cor: "alert",
    feito: false,
    impacto: 6,
    urgencia: 3,
    facilidade: 9,
    retorno: 7,
    horizonte: "backlog",
    manualLock: "backlog",
    duracaoMin: 20,
  },
  {
    id: 10,
    texto: "Pesquisar preço de filtro de carvão reserva para fonte dos gatos",
    aba: "casa_rotinas",
    categoriaFiltro: "casa",
    cor: "primary",
    feito: false,
    impacto: 7,
    urgencia: 4,
    facilidade: 9,
    retorno: 7,
    horizonte: "backlog",
    manualLock: "backlog",
    duracaoMin: 10,
  },
  {
    id: 11,
    texto: "Gravar vídeo de evolução na Parada de Mãos (Handstand 30s)",
    aba: "saude_pets",
    categoriaFiltro: "pessoal",
    cor: "action",
    feito: false,
    impacto: 6,
    urgencia: 2,
    facilidade: 8,
    retorno: 8,
    horizonte: "backlog",
    manualLock: "backlog",
    duracaoMin: 15,
  },
];

export const INITIAL_COMPROMISSOS: Compromisso[] = [
  {
    id: 100,
    hora: "07:30",
    duracaoMin: 5,
    titulo: "Peneirar areia Nina & Tobias (Micro-bloco 5m)",
    local: "Área de Serviço",
    cor: "primary",
    aba: "casa_rotinas",
    diaMes: 27,
    diaSemanaIdx: 6,
    notas: "Bloco rápido de 5 minutos reais na timeline proporcional.",
    gcalSynced: true,
    taskId: 4,
  },
  {
    id: 1001,
    hora: "07:35",
    duracaoMin: 10,
    titulo: "Servir Sachê Urinary + Água Fresca",
    local: "Cozinha",
    cor: "primary",
    aba: "saude_pets",
    diaMes: 27,
    diaSemanaIdx: 6,
    notas: "10 minutos reais antes de sair para a UERJ.",
    gcalSynced: true,
  },
  {
    id: 101,
    hora: "08:00",
    duracaoMin: 110,
    titulo: "Aula UERJ — Fisiologia do Exercício",
    local: "Bloco F · Sala 302",
    cor: "primary",
    aba: "estudos_trabalho",
    diaMes: 27,
    diaSemanaIdx: 6,
    notas: "Sistemas energéticos e fadiga periférica.",
    gcalSynced: true,
  },
  {
    id: 102,
    hora: "10:00",
    duracaoMin: 45,
    titulo: "Fichamento — artigo Fisiologia UERJ",
    local: "Biblioteca UERJ",
    cor: "primary",
    aba: "estudos_trabalho",
    diaMes: 27,
    diaSemanaIdx: 6,
    notas: "Bloco de foco alocado das Prioridades do Dia (45 min).",
    gcalSynced: true,
    taskId: 1,
  },
  {
    id: 1025,
    hora: "12:15",
    duracaoMin: 5,
    titulo: "Pix pro Márcio (R$ 10 xerox) + Creatina 5g",
    local: "Celular",
    cor: "finance",
    aba: "financas",
    diaMes: 27,
    diaSemanaIdx: 6,
    notas: "Tarefa rápida de 5 min reais antes do almoço.",
    gcalSynced: true,
    taskId: 5,
  },
  {
    id: 103,
    hora: "12:30",
    duracaoMin: 50,
    titulo: "Almoço Meal Prep + Descanso",
    local: "Casa",
    cor: "primary",
    aba: "casa_rotinas",
    diaMes: 27,
    diaSemanaIdx: 6,
    gcalSynced: true,
  },
  {
    id: 104,
    hora: "14:00",
    duracaoMin: 45,
    titulo: "CDT — Fechar grade de horários Outubro",
    local: "Remoto / Notebook",
    cor: "alert",
    aba: "estudos_trabalho",
    diaMes: 27,
    diaSemanaIdx: 6,
    gcalSynced: true,
    taskId: 3,
  },
  {
    id: 1045,
    hora: "16:15",
    duracaoMin: 15,
    titulo: "Lanche Pré-Treino + Enfaixar Punho",
    local: "Casa",
    cor: "action",
    aba: "saude_pets",
    diaMes: 27,
    diaSemanaIdx: 6,
    gcalSynced: true,
  },
  {
    id: 105,
    hora: "17:30",
    duracaoMin: 90,
    titulo: "Treino RCR — Stunting & Pirâmide",
    local: "Ginásio",
    cor: "action",
    aba: "saude_pets",
    diaMes: 27,
    diaSemanaIdx: 6,
    notas: "Passagem limpa da sequência central.",
    gcalSynced: true,
    taskId: 2,
  },
  {
    id: 106,
    hora: "09:00",
    duracaoMin: 120,
    titulo: "Prova P1 — Fisiologia do Exercício",
    local: "UERJ · Sala 302",
    cor: "primary",
    aba: "estudos_trabalho",
    diaMes: 28,
    diaSemanaIdx: 0,
    gcalSynced: true,
  },
  {
    id: 107,
    hora: "18:30",
    duracaoMin: 90,
    titulo: "Aula Didática + Entrega Plano de Aula",
    local: "UERJ",
    cor: "primary",
    aba: "estudos_trabalho",
    diaMes: 30,
    diaSemanaIdx: 2,
    gcalSynced: true,
  },
];

export const INITIAL_RADAR: ItemRadar[] = [
  {
    id: 1,
    titulo: "Prova P1 de Fisiologia do Exercício",
    dataEvento: "28/09",
    diasRestantes: 1,
    area: "UERJ",
    cor: "primary",
    etapas: [
      {
        id: 11,
        diasAntes: 7,
        rotuloTempo: "1 semana antes",
        acao: "Reunir slides e capítulos de bioenergética",
        concluida: true,
      },
      {
        id: 12,
        diasAntes: 3,
        rotuloTempo: "3 dias antes",
        acao: "Resolver questões antigas + fichamento",
        concluida: true,
      },
      {
        id: 13,
        diasAntes: 1,
        rotuloTempo: "Na véspera (Hoje)",
        acao: "Revisão rápida de 30min dos mapas mentais",
        concluida: false,
        enviadaParaHoje: true,
      },
    ],
  },
  {
    id: 2,
    titulo: "Entrega do Plano de Aula — Didática",
    dataEvento: "30/09",
    diasRestantes: 3,
    area: "UERJ",
    cor: "primary",
    etapas: [
      {
        id: 21,
        diasAntes: 7,
        rotuloTempo: "1 semana antes",
        acao: "Escolher tema e objetivos pedagógicos (BNCC)",
        concluida: true,
      },
      {
        id: 22,
        diasAntes: 3,
        rotuloTempo: "3 dias antes (Hoje)",
        acao: "Redigir metodologia e avaliação da aula de 50 min",
        concluida: false,
        enviadaParaHoje: true,
      },
      {
        id: 23,
        diasAntes: 1,
        rotuloTempo: "Na véspera",
        acao: "Formatar PDF na ABNT e subir no AVA/SIGA",
        concluida: false,
      },
    ],
  },
  {
    id: 3,
    titulo: "Apresentação Coreografia Campeonato RCR",
    dataEvento: "05/10",
    diasRestantes: 8,
    area: "Trabalho",
    cor: "action",
    etapas: [
      {
        id: 31,
        diasAntes: 7,
        rotuloTempo: "1 semana antes",
        acao: "Fechar contagem das 8 oitavas da pirâmide",
        concluida: false,
      },
      {
        id: 32,
        diasAntes: 3,
        rotuloTempo: "3 dias antes",
        acao: "Passagem completa valendo nota (Full-out)",
        concluida: false,
      },
      {
        id: 33,
        diasAntes: 1,
        rotuloTempo: "Na véspera",
        acao: "Conferir uniforme, fita rígida e música backup",
        concluida: false,
      },
    ],
  },
];

export const INITIAL_METAS: MetaItem[] = [
  {
    id: 1,
    titulo: "Submeter Artigo 1 (Carga sRPE no Cheerleading)",
    categoria: "UERJ & Pesquisa",
    prazo: "Nov 2026",
    cor: "primary",
    marcos: [
      { id: 101, texto: "Triagem de 15 artigos no PubMed", concluido: true },
      { id: 102, texto: "Fichar as 12 referências principais", concluido: true },
      { id: 103, texto: "Escrever Introdução e Métodos", concluido: false },
      { id: 104, texto: "Revisão do orientador e submissão RBCE", concluido: false },
    ],
  },
  {
    id: 2,
    titulo: "Quitar acordo do cartão & montar reserva de R$ 1.000",
    categoria: "Finanças",
    prazo: "Dez 2026",
    cor: "finance",
    marcos: [
      { id: 201, texto: "Pagar parcelas de Julho, Agosto e Setembro em dia", concluido: true },
      { id: 202, texto: "Manter gastos diários dentro do Dinheiro Livre", concluido: true },
      { id: 203, texto: "Guardar R$ 250 da bolsa/CDT em Outubro", concluido: false },
    ],
  },
  {
    id: 3,
    titulo: "Cravar Full-Up & Parada de Mãos 30s livre",
    categoria: "Atleta (Cheer & Ginástica)",
    prazo: "Out 2026",
    cor: "action",
    marcos: [
      { id: 301, texto: "Estabilizar prancha escapular e handstand na parede", concluido: true },
      { id: 302, texto: "Acertar 80% de hit rate no stunt em grupo", concluido: false },
      { id: 303, texto: "Sustentar 30s livres sem passo na aterrissagem", concluido: false },
    ],
  },
];

export const INITIAL_DISCIPLINAS: Disciplina[] = [
  {
    id: 1,
    nome: "Fisiologia do Exercício",
    professor: "Prof. Dr. Marcos Paulo",
    horarioSala: "Ter/Qui 08:00–11:30 · Bloco F Sala 302",
    prazo: "Prova P1 28/09",
    status: "estudando",
    aulasTotaisSemestre: 32,
    faltasAtuais: 5,
    faltasMax: 8,
    presencas: 14,
    mediaAprovacao: 7.0,
    avaliacoes: [
      { id: 101, tipo: "Prova P1 (Bioenergética)", data: "28/09", peso: 1, notaObtida: null, concluida: false },
      { id: 102, tipo: "Seminário de Artigo (Grupo)", data: "15/10", peso: 1, notaObtida: 8.5, concluida: true },
      { id: 103, tipo: "Prova P2 (Cardiorrespiratório)", data: "19/11", peso: 2, notaObtida: null, concluida: false },
    ],
    leiturasSemana: [
      { id: 1, titulo: "Cap. 4 McArdle — Transferência de Energia no Exercício", paginas: "p. 134–162", lido: true },
      { id: 2, titulo: "Artigo Foster (2001) — Monitoramento de carga via sRPE", paginas: "12 págs", lido: false },
    ],
    linksUteis: [
      { id: 1, rotulo: "Drive da Turma (Slides + Provas antigas)", url: "https://drive.google.com" },
      { id: 2, rotulo: "Aluno Online / SIGA UERJ", url: "https://www.alunoonline.uerj.br" },
    ],
    anotacoes:
      "Focar na diferença de ressíntese de PCr entre séries de alta intensidade (stunting vs tumbling). Na P1 cai cálculo de lactato e VO2máx.",
  },
  {
    id: 2,
    nome: "Didática da Educação Física",
    professor: "Profa. Dra. Helena Castro",
    horarioSala: "Qua 09:00–12:30 · Pavilhão João Lyra Filho Sala 408",
    prazo: "Entrega 30/09",
    status: "pendente",
    aulasTotaisSemestre: 32,
    faltasAtuais: 2,
    faltasMax: 8,
    presencas: 15,
    mediaAprovacao: 7.0,
    avaliacoes: [
      { id: 201, tipo: "Plano de Aula Ensino Médio", data: "30/09", peso: 1, notaObtida: null, concluida: false },
      { id: 202, tipo: "Microaula Prática na Quadra", data: "28/10", peso: 1, notaObtida: 7.8, concluida: true },
      { id: 203, tipo: "Relatório Reflexivo Final", data: "25/11", peso: 1, notaObtida: null, concluida: false },
    ],
    leiturasSemana: [
      { id: 1, titulo: "Coletivo de Autores — Metodologia do Ensino de Ed. Física", paginas: "Cap. 2 e 3", lido: true },
      { id: 2, titulo: "Diretrizes BNCC para Esportes e Ginásticas", paginas: "p. 215–230", lido: false },
    ],
    linksUteis: [
      { id: 1, rotulo: "Pasta de Textos Didática (Drive)", url: "https://drive.google.com" },
      { id: 2, rotulo: "Modelo ABNT Plano de Aula", url: "https://docs.google.com" },
    ],
    anotacoes: "Estruturar sequência didática de 50 min sobre ginástica acrobática cooperativa na escola.",
  },
  {
    id: 3,
    nome: "Metodologia Científica",
    professor: "Prof. Dr. Ricardo Vianna",
    horarioSala: "Sex 08:00–10:40 · Bloco F Sala 310",
    prazo: "Em dia",
    status: "em dia",
    aulasTotaisSemestre: 32,
    faltasAtuais: 0,
    faltasMax: 8,
    presencas: 16,
    mediaAprovacao: 7.0,
    avaliacoes: [
      { id: 301, tipo: "Fichamento Crítico P1", data: "12/09", peso: 1, notaObtida: 9.0, concluida: true },
      { id: 302, tipo: "Entrega do Pré-Projeto", data: "24/10", peso: 1, notaObtida: null, concluida: false },
    ],
    leiturasSemana: [
      { id: 1, titulo: "Desenho de estudos observacionais no esporte", paginas: "p. 40–62", lido: true },
    ],
    linksUteis: [
      { id: 1, rotulo: "Repositório PubMed / SciELO", url: "https://pubmed.ncbi.nlm.nih.gov" },
    ],
    anotacoes: "Recorte amostral definido: atletas universitários de Cheerleading do Rio de Janeiro.",
  },
];

export const INITIAL_ARTIGOS: Artigo[] = [
  {
    id: 1,
    nome: "Artigo 1 — Carga Interna no Cheerleading",
    subtitulo: "Monitoramento de carga interna (sRPE) e prontidão neuromuscular em atletas de Cheerleading",
    periódicoAlvo: "Revista Brasileira de Ciências do Esporte (RBCE)",
    fase: "Fichamento/Notas",
    notas: "12 artigos triados no PubMed. Faltam sintetizar 2 estudos sobre lesões de punho/ombro em bases e flyers.",
    citacoes: [
      {
        id: 1,
        autorAno: "Foster et al. (2001)",
        pagina: "p. 112",
        trecho: "O método da percepção subjetiva de esforço da sessão (sRPE = PSE × duração em minutos) apresenta alta correlação com zonas de frequência cardíaca em modalidades acíclicas.",
        tag: "Método sRPE",
      },
      {
        id: 2,
        autorAno: "Shields & Smith (2019)",
        pagina: "p. 48",
        trecho: "As demandas de stunting e tumbling exigem controle excêntrico elevado na recepção, justificando o controle semanal de monotonia e strain.",
        tag: "Biomecânica Cheer",
      },
    ],
  },
  {
    id: 2,
    nome: "Artigo 2 — Ginástica & Aderência Escolar",
    subtitulo: "Pedagogia da ginástica coletiva e motivação intrínseca no Ensino Médio",
    periódicoAlvo: "Movimento (UFRGS)",
    fase: "Leitura ativa",
    notas: "Cruzando dados observados nas aulas de Didática da UERJ com literatura de autodeterminação.",
    citacoes: [
      {
        id: 3,
        autorAno: "Deci & Ryan (2000)",
        pagina: "p. 71",
        trecho: "O suporte à autonomia e ao sentimento de competência em tarefas motoras cooperativas reduz a evasão nas aulas de Educação Física.",
        tag: "Motivação",
      },
    ],
  },
];

export const INITIAL_LIVROS: LivroLeitura[] = [
  {
    id: 1,
    tipo: "Acadêmico",
    titulo: "Fisiologia do Exercício (McArdle)",
    autor: "McArdle, Katch & Katch",
    paginasLidas: 148,
    paginasTotal: 320,
  },
  {
    id: 2,
    tipo: "Fantasia",
    titulo: "O Nome do Vento",
    autor: "Patrick Rothfuss",
    paginasLidas: 442,
    paginasTotal: 660,
  },
];

export const INITIAL_FICHAS_TREINO: FichaTreino[] = [
  {
    id: 1,
    nome: "Treino A — Cheerleading (Stunting & Pyramids)",
    modalidade: "Cheerleading",
    foco: "Estabilidade de base/flyer, tempo de música e taxa de acerto (Hit Rate)",
    ultimaRealizacao: "25/09",
    exercicios: [
      {
        id: 101,
        nome: "Extension Prep & Lib (Estabilidade)",
        modalidade: "Cheerleading",
        notaTecnica: "Travar core e linha de punho-ombro antes da subida",
        descansoSeg: 60,
        series: [
          { id: 1, numero: 1, cargaOuDetalhe: "5 tentativas", repsOuTempo: "4 acertos", qualidadeOuHit: "Hit 80% · Firme", concluida: true },
          { id: 2, numero: 2, cargaOuDetalhe: "5 tentativas", repsOuTempo: "5 acertos", qualidadeOuHit: "Hit 100% · Cravado", concluida: false },
          { id: 3, numero: 3, cargaOuDetalhe: "5 tentativas", repsOuTempo: "4 acertos", qualidadeOuHit: "Hit 80%", concluida: false },
        ],
      },
      {
        id: 102,
        nome: "Full-Up para Plataforma",
        modalidade: "Cheerleading",
        notaTecnica: "Dip curto de perna, explosão de quadril no tempo 3",
        descansoSeg: 90,
        series: [
          { id: 4, numero: 1, cargaOuDetalhe: "4 tentativas", repsOuTempo: "3 acertos", qualidadeOuHit: "Hit 75%", concluida: false },
          { id: 5, numero: 2, cargaOuDetalhe: "4 tentativas", repsOuTempo: "4 acertos", qualidadeOuHit: "Hit 100%", concluida: false },
        ],
      },
      {
        id: 103,
        nome: "Sequência de Jumps (Toe Touch + Pike)",
        modalidade: "Cheerleading",
        notaTecnica: "Peito alto, rotação de quadril e aterrissagem pés juntos",
        descansoSeg: 60,
        series: [
          { id: 6, numero: 1, cargaOuDetalhe: "Contagem 8x", repsOuTempo: "3 passagens", qualidadeOuHit: "Sincronizado", concluida: false },
          { id: 7, numero: 2, cargaOuDetalhe: "Contagem 8x", repsOuTempo: "3 passagens", qualidadeOuHit: "Boa altura", concluida: false },
        ],
      },
    ],
  },
  {
    id: 2,
    nome: "Treino B — Ginástica Acrobática & Tumbling",
    modalidade: "Ginástica",
    foco: "Inversões, parada de mãos, potência de solo e recepção limpa",
    ultimaRealizacao: "23/09",
    exercicios: [
      {
        id: 201,
        nome: "Handstand (Parada de Mãos Livre)",
        modalidade: "Ginástica",
        notaTecnica: "Empurrar o chão pelos ombros, costelas fechadas e glúteo ativo",
        descansoSeg: 60,
        series: [
          { id: 21, numero: 1, cargaOuDetalhe: "Livre no solo", repsOuTempo: "22s", qualidadeOuHit: "Alinhada", concluida: false },
          { id: 22, numero: 2, cargaOuDetalhe: "Livre no solo", repsOuTempo: "25s", qualidadeOuHit: "Cravada", concluida: false },
          { id: 23, numero: 3, cargaOuDetalhe: "Livre no solo", repsOuTempo: "20s", qualidadeOuHit: "1 passo saída", concluida: false },
        ],
      },
      {
        id: 202,
        nome: "Rodante + Flic-Flac (Tumbling linha)",
        modalidade: "Ginástica",
        notaTecnica: "Bloqueio rápido de ombro e impulsão elástica de tornozelo",
        descansoSeg: 90,
        series: [
          { id: 24, numero: 1, cargaOuDetalhe: "Passagem solo", repsOuTempo: "3 linhas", qualidadeOuHit: "Aterrissagem limpa", concluida: false },
          { id: 25, numero: 2, cargaOuDetalhe: "Passagem solo", repsOuTempo: "3 linhas", qualidadeOuHit: "Cravado", concluida: false },
        ],
      },
      {
        id: 203,
        nome: "Hollow Body Hold + Mobilidade Torácica",
        modalidade: "Ginástica",
        notaTecnica: "Lombar 100% colada no tatame",
        descansoSeg: 45,
        series: [
          { id: 26, numero: 1, cargaOuDetalhe: "Isometria", repsOuTempo: "40s", qualidadeOuHit: "Tensão máxima", concluida: false },
          { id: 27, numero: 2, cargaOuDetalhe: "Isometria", repsOuTempo: "40s", qualidadeOuHit: "Tensão máxima", concluida: false },
        ],
      },
    ],
  },
  {
    id: 3,
    nome: "Treino C — Musculação (Força & Potência)",
    modalidade: "Musculação",
    foco: "Tripla extensão, estabilidade escapular e prevenção de lesão",
    ultimaRealizacao: "24/09",
    exercicios: [
      {
        id: 301,
        nome: "Agachamento Livre com Barra",
        modalidade: "Musculação",
        notaTecnica: "Descida controlada 2s, subida explosiva",
        descansoSeg: 90,
        series: [
          { id: 31, numero: 1, cargaOuDetalhe: 40, repsOuTempo: 8, qualidadeOuHit: "RPE 7", concluida: true },
          { id: 32, numero: 2, cargaOuDetalhe: 44, repsOuTempo: 8, qualidadeOuHit: "RPE 8", concluida: false },
          { id: 33, numero: 3, cargaOuDetalhe: 44, repsOuTempo: 8, qualidadeOuHit: "RPE 8", concluida: false },
          { id: 34, numero: 4, cargaOuDetalhe: 46, repsOuTempo: 6, qualidadeOuHit: "RPE 8.5", concluida: false },
        ],
      },
      {
        id: 302,
        nome: "Push Press Overhead (Potência de Ombro)",
        modalidade: "Musculação",
        notaTecnica: "Transferência de força das pernas pro encaixe de stunt",
        descansoSeg: 75,
        series: [
          { id: 35, numero: 1, cargaOuDetalhe: 26, repsOuTempo: 6, qualidadeOuHit: "Explosivo", concluida: false },
          { id: 36, numero: 2, cargaOuDetalhe: 28, repsOuTempo: 6, qualidadeOuHit: "Explosivo", concluida: false },
          { id: 37, numero: 3, cargaOuDetalhe: 28, repsOuTempo: 6, qualidadeOuHit: "Firme", concluida: false },
        ],
      },
      {
        id: 303,
        nome: "Levantamento Terra Romeno (RDL)",
        modalidade: "Musculação",
        notaTecnica: "Proteção de posteriores para saltos e recepções",
        descansoSeg: 90,
        series: [
          { id: 38, numero: 1, cargaOuDetalhe: 50, repsOuTempo: 8, qualidadeOuHit: "Controle", concluida: false },
          { id: 39, numero: 2, cargaOuDetalhe: 52, repsOuTempo: 8, qualidadeOuHit: "Controle", concluida: false },
          { id: 40, numero: 3, cargaOuDetalhe: 52, repsOuTempo: 8, qualidadeOuHit: "Controle", concluida: false },
        ],
      },
    ],
  },
];

export const INITIAL_DIETA_REFEICOES: ItemRefeicao[] = [
  {
    id: 1,
    horario: "07:00",
    nome: "Café Pré-UERJ",
    descricao: "Overnight oats com whey/iogurte + 2 ovos mexidos + café",
    proteinaG: 28,
    kcal: 430,
    feito: true,
  },
  {
    id: 2,
    horario: "12:30",
    nome: "Almoço (Marmita Meal Prep)",
    descricao: "150g frango desfiado + 160g batata doce/arroz + brócolis e azeite",
    proteinaG: 42,
    kcal: 560,
    feito: true,
  },
  {
    id: 3,
    horario: "16:15",
    nome: "Lanche Pré-Treino (RCR / Ginástica)",
    descricao: "Pão integral com doce de leite ou banana + creatina 5g",
    proteinaG: 12,
    kcal: 310,
    feito: false,
  },
  {
    id: 4,
    horario: "20:15",
    nome: "Jantar Pós-Treino Recuperador",
    descricao: "Omelete 3 ovos com queijo minas + tapioca ou arroz e feijão",
    proteinaG: 34,
    kcal: 510,
    feito: false,
  },
  {
    id: 5,
    horario: "Dia todo",
    nome: "Hidratação Atleta (Meta 2,8L)",
    descricao: "Garrafa térmica 1L na UERJ + 1L no treino + 800ml em casa",
    proteinaG: 0,
    kcal: 0,
    feito: false,
  },
];

// ---------- CASA, CÔMODOS, ESTOQUE & GATOS ----------
export const INITIAL_COMODOS: ComodoCasa[] = [
  {
    id: 1,
    nome: "Cozinha & Meal Prep",
    icone: "utensils",
    rotinas: [
      {
        id: 101,
        tarefa: "Lavar louça do dia e deixar bancada livre",
        frequencia: "Diária",
        diasCiclo: 1,
        diasDesdeUltimaVez: 1,
        feitoHoje: false,
        tempoEstimadoMin: 10,
        pausada: false,
      },
      {
        id: 102,
        tarefa: "Preparar marmitas da semana (Frango + Raízes)",
        frequencia: "Semanal",
        diasCiclo: 7,
        diasDesdeUltimaVez: 5,
        feitoHoje: false,
        tempoEstimadoMin: 45,
        pausada: false,
      },
      {
        id: 103,
        tarefa: "Limpar fogão e revisar validade da geladeira",
        frequencia: "Semanal",
        diasCiclo: 7,
        diasDesdeUltimaVez: 7,
        feitoHoje: false,
        tempoEstimadoMin: 15,
        pausada: false,
      },
    ],
  },
  {
    id: 2,
    nome: "Sala & Cantinho dos Gatos",
    icone: "sofa",
    rotinas: [
      {
        id: 201,
        tarefa: "Peneirar caixas de areia da Nina e do Tobias",
        frequencia: "Diária",
        diasCiclo: 1,
        diasDesdeUltimaVez: 1,
        feitoHoje: false,
        tempoEstimadoMin: 5,
        pausada: false,
      },
      {
        id: 202,
        tarefa: "Lavar fonte de águainox e trocar filtro se necessário",
        frequencia: "3x na semana",
        diasCiclo: 2,
        diasDesdeUltimaVez: 2,
        feitoHoje: false,
        tempoEstimadoMin: 8,
        pausada: false,
      },
      {
        id: 203,
        tarefa: "Aspirar pelos do sofá e passar pano úmido",
        frequencia: "3x na semana",
        diasCiclo: 2,
        diasDesdeUltimaVez: 1,
        feitoHoje: false,
        tempoEstimadoMin: 12,
        pausada: false,
      },
    ],
  },
  {
    id: 3,
    nome: "Quarto & Estudos",
    icone: "bed",
    rotinas: [
      {
        id: 301,
        tarefa: "Arrumar cama e deixar mochila da UERJ/Treino pronta",
        frequencia: "Diária",
        diasCiclo: 1,
        diasDesdeUltimaVez: 0,
        feitoHoje: true,
        tempoEstimadoMin: 5,
        pausada: false,
      },
      {
        id: 302,
        tarefa: "Trocar roupa de cama e fronhas",
        frequencia: "Semanal",
        diasCiclo: 7,
        diasDesdeUltimaVez: 7,
        feitoHoje: false,
        tempoEstimadoMin: 10,
        pausada: false,
      },
      {
        id: 303,
        tarefa: "Destralhar escrivaninha de artigos e recibos",
        frequencia: "Semanal",
        diasCiclo: 7,
        diasDesdeUltimaVez: 3,
        feitoHoje: false,
        tempoEstimadoMin: 10,
        pausada: false,
      },
    ],
  },
  {
    id: 4,
    nome: "Banheiro & Lavanderia",
    icone: "bath",
    rotinas: [
      {
        id: 401,
        tarefa: "Lavar roupas de treino (Cheer / Ginástica)",
        frequencia: "3x na semana",
        diasCiclo: 2,
        diasDesdeUltimaVez: 2,
        feitoHoje: false,
        tempoEstimadoMin: 10,
        pausada: false,
      },
      {
        id: 402,
        tarefa: "Higienizar pia, espelho e vaso sanitário",
        frequencia: "Semanal",
        diasCiclo: 7,
        diasDesdeUltimaVez: 4,
        feitoHoje: false,
        tempoEstimadoMin: 15,
        pausada: false,
      },
    ],
  },
];

export const INITIAL_ESTOQUE_CASA: ItemEstoqueCasa[] = [
  {
    id: 1,
    nome: "Sachês Úmidos Urinary (Nina & Tobias)",
    categoria: "Pets",
    quantidadeAtual: 4,
    quantidadeMinima: 6,
    unidade: "un",
    consumoDiarioEstimado: 2,
    precoEstimadoReposicao: 45.9,
  },
  {
    id: 2,
    nome: "Ração Seca Urinary S/O",
    categoria: "Pets",
    quantidadeAtual: 1.4,
    quantidadeMinima: 0.8,
    unidade: "kg",
    consumoDiarioEstimado: 0.11,
    precoEstimadoReposicao: 149.9,
  },
  {
    id: 3,
    nome: "Areia Biodegradável Viva Verde",
    categoria: "Pets",
    quantidadeAtual: 1,
    quantidadeMinima: 1,
    unidade: "pct",
    consumoDiarioEstimado: 0.08,
    precoEstimadoReposicao: 59.9,
  },
  {
    id: 4,
    nome: "Peito de Frango (Meal Prep)",
    categoria: "Despensa & Meal Prep",
    quantidadeAtual: 1,
    quantidadeMinima: 2,
    unidade: "kg",
    consumoDiarioEstimado: 0.25,
    precoEstimadoReposicao: 24.9,
  },
  {
    id: 5,
    nome: "Ovos (Cartela)",
    categoria: "Despensa & Meal Prep",
    quantidadeAtual: 6,
    quantidadeMinima: 8,
    unidade: "un",
    consumoDiarioEstimado: 3,
    precoEstimadoReposicao: 22.0,
  },
  {
    id: 6,
    nome: "Café em Pó & Aveia",
    categoria: "Despensa & Meal Prep",
    quantidadeAtual: 2,
    quantidadeMinima: 1,
    unidade: "pct",
    precoEstimadoReposicao: 19.5,
  },
  {
    id: 7,
    nome: "Detergente & Sabão Líquido Roupas Treino",
    categoria: "Limpeza & Casa",
    quantidadeAtual: 1,
    quantidadeMinima: 1,
    unidade: "frasco",
    precoEstimadoReposicao: 26.0,
  },
];

export const INITIAL_LISTA_COMPRAS: ItemListaCompras[] = [
  {
    id: 1,
    nome: "Sachês Úmidos Urinary (Pack 10 un)",
    categoria: "Pets",
    quantidadeComprar: 10,
    unidade: "un",
    precoEstimado: 45.9,
    origemEstoqueId: 1,
    comprado: false,
  },
  {
    id: 2,
    nome: "Peito de Frango para Marmitas (2 kg)",
    categoria: "Despensa & Meal Prep",
    quantidadeComprar: 2,
    unidade: "kg",
    precoEstimado: 44.0,
    origemEstoqueId: 4,
    comprado: false,
  },
  {
    id: 3,
    nome: "Cartela com 20 Ovos",
    categoria: "Despensa & Meal Prep",
    quantidadeComprar: 20,
    unidade: "un",
    precoEstimado: 22.0,
    origemEstoqueId: 5,
    comprado: false,
  },
];

export const INITIAL_PETS_PERFIL: PetPerfil[] = [
  {
    id: 1,
    nome: "Nina",
    racao: "Royal Canin Urinary S/O",
    consumoRacaoGramasDia: 50,
    consumoSachesDia: 1,
    proximaVet: "15/10 — Check-up renal + Ultrassom",
    estoqueSaches: 4,
    estoqueRacaoKg: 1.4,
    alimentadoHojeRefeicoes: 2,
    sachesDadosHoje: 1,
    metaRefeicoesDia: 3,
    historicoPeso: [
      { data: "10/07", pesoKg: 3.7 },
      { data: "10/08", pesoKg: 3.8 },
      { data: "15/09", pesoKg: 3.9 },
    ],
    cuidados: [
      { id: 1, tipo: "Vacina Quádrupla (V4)", dataRealizada: "12/03/2026", proximaData: "12/03/2027", status: "em dia" },
      { id: 2, tipo: "Vermífugo Milbemax", dataRealizada: "15/06/2026", proximaData: "15/10/2026", status: "atencao" },
      { id: 3, tipo: "Exame Urina + Creatinina", dataRealizada: "10/07/2026", proximaData: "15/10/2026", status: "atencao" },
    ],
    observacoes: "Ama sachê morno com 2 colheres extras de água filtrada para proteger os rins.",
  },
  {
    id: 2,
    nome: "Tobias",
    racao: "Royal Canin Urinary S/O",
    consumoRacaoGramasDia: 60,
    consumoSachesDia: 1,
    proximaVet: "15/10 — Vacina anual + Avaliação de peso",
    estoqueSaches: 4,
    estoqueRacaoKg: 1.4,
    alimentadoHojeRefeicoes: 2,
    sachesDadosHoje: 1,
    metaRefeicoesDia: 3,
    historicoPeso: [
      { data: "10/07", pesoKg: 4.7 },
      { data: "10/08", pesoKg: 4.6 },
      { data: "15/09", pesoKg: 4.5 },
    ],
    cuidados: [
      { id: 1, tipo: "Vacina Antirrábica", dataRealizada: "18/10/2025", proximaData: "15/10/2026", status: "atencao" },
      { id: 2, tipo: "Vermífugo Milbemax", dataRealizada: "15/06/2026", proximaData: "15/10/2026", status: "atencao" },
      { id: 3, tipo: "Controle de Peso (Meta 4.4kg)", dataRealizada: "15/09/2026", proximaData: "15/10/2026", status: "em dia" },
    ],
    observacoes: "Tende a roubar a porção da Nina se deixar os potes juntos. Alimentar separado.",
  },
];

export const INITIAL_PROJETOS: ProjetoTrabalho[] = [
  {
    id: 1,
    nome: "CDT — Cia de Dança e Treinamento",
    papel: "Instrutora & Coordenação de Grade",
    tarefa: "Entregável: Grade Oficial de Outubro + Alocação de Salas",
    prazo: "28/09",
    prioridade: "alta",
    statusProjeto: "Revisão",
    notas: "Garantir que as turmas de terça e quinta não conflitem com as provas da UERJ.",
    subtarefas: [
      { id: 1, texto: "Auditar conflitos com calendário de provas UERJ", feito: true, prazo: "25/09" },
      { id: 2, texto: "Homologar sala 2 para turma iniciante", feito: true, prazo: "26/09" },
      { id: 3, texto: "Publicar PDF da grade final no grupo da coordenação", feito: false, prazo: "28/09" },
    ],
  },
  {
    id: 2,
    nome: "RCR — Equipe Competitiva Cheer",
    papel: "Atleta & Limpeza de Rotina",
    tarefa: "Entregável: Mapa de Contagem Musical 8 Oitavas (Pirâmide 1:42)",
    prazo: "01/10",
    prioridade: "média",
    statusProjeto: "Em Produção",
    notas: "Transição da pirâmide central no minuto 1:42 precisa de 2 oitavas limpas.",
    subtarefas: [
      { id: 1, texto: "Cortar faixa de áudio de treino no tempo 1:42", feito: true, prazo: "24/09" },
      { id: 2, texto: "Marcar entradas de base e backspot no vídeo", feito: false, prazo: "29/09" },
      { id: 3, texto: "Validar passagem Full-Out valendo nota no sábado", feito: false, prazo: "01/10" },
    ],
  },
  {
    id: 3,
    nome: "Chaos — Integração & Captação",
    papel: "Organização de Seletiva",
    tarefa: "Entregável: Kit de Recepção & Escala de Avaliadores",
    prazo: "08/10",
    prioridade: "baixa",
    statusProjeto: "Planejado",
    notas: "Treinos abertos de integração na primeira semana de outubro.",
    subtarefas: [
      { id: 1, texto: "Montar formulário de inscrição + termo de saúde", feito: true, prazo: "22/09" },
      { id: 2, texto: "Dividir duplas de veteranos para apadrinhamento", feito: false, prazo: "05/10" },
    ],
  },
];

// ---------- FINANÇAS ----------
export const INITIAL_CONTAS: ContaBancaria[] = [
  {
    id: 1,
    nome: "Nubank (Conta / Pix)",
    bancoId: "nubank",
    tipo: "Corrente / Pix",
    saldoAtual: 385.5,
    cor: "#820AD1",
  },
  {
    id: 2,
    nome: "PicPay",
    bancoId: "picpay",
    tipo: "Corrente / Pix",
    saldoAtual: 240.0,
    cor: "#11C76F",
  },
  {
    id: 3,
    nome: "Reserva / Caixinha",
    bancoId: "nubank",
    tipo: "Reserva",
    saldoAtual: 420.0,
    cor: "#2E5266",
  },
];

export const INITIAL_CARTOES: CartaoCredito[] = [
  {
    id: 1,
    nome: "Nubank Roxinho",
    limiteTotal: 1200.0,
    faturaAtual: 468.9,
    fechamentoDia: 2,
    vencimentoDia: 9,
    statusFatura: "aberta",
  },
  {
    id: 2,
    nome: "Banco Inter (Compras Casa/Pets)",
    limiteTotal: 800.0,
    faturaAtual: 195.8,
    fechamentoDia: 5,
    vencimentoDia: 12,
    statusFatura: "aberta",
  },
];

export const INITIAL_ORCAMENTOS: OrcamentoCategoria[] = [
  { categoria: "Mercado", tetoMensal: 550 },
  { categoria: "Pets", tetoMensal: 280 },
  { categoria: "Transporte", tetoMensal: 180 },
  { categoria: "Moradia & Fixos", tetoMensal: 650 },
  { categoria: "Estudos & UERJ", tetoMensal: 120 },
  { categoria: "Dívida", tetoMensal: 250 },
  { categoria: "Lazer & Outros", tetoMensal: 160 },
];

export const INITIAL_LANCAMENTOS: LancamentoFinanceiro[] = [
  {
    id: 1,
    mesKey: "2026-09",
    data: "05/09",
    descricao: "Bolsa Acadêmica UERJ",
    tipo: "receita",
    status: "realizado",
    metodo: "Conta / Pix",
    contaId: 2,
    categoria: "Estudos & UERJ",
    valor: 700.0,
  },
  {
    id: 2,
    mesKey: "2026-09",
    data: "10/09",
    descricao: "Aulas & Coreografia CDT",
    tipo: "receita",
    status: "realizado",
    metodo: "Conta / Pix",
    contaId: 1,
    categoria: "Moradia & Fixos",
    valor: 1450.0,
  },
  {
    id: 3,
    mesKey: "2026-09",
    data: "10/09",
    descricao: "Rateio Contas Casa (Luz + Internet + Condomínio)",
    tipo: "despesa",
    status: "realizado",
    metodo: "Conta / Pix",
    contaId: 1,
    categoria: "Moradia & Fixos",
    valor: 580.0,
  },
  {
    id: 4,
    mesKey: "2026-09",
    data: "18/09",
    descricao: "Parcela 5/8 Acordo Quitação",
    tipo: "despesa",
    status: "realizado",
    metodo: "Conta / Pix",
    contaId: 1,
    categoria: "Dívida",
    valor: 210.0,
  },
  {
    id: 5,
    mesKey: "2026-09",
    data: "20/09",
    descricao: "Areia Biodegradável + Sachês Urinary",
    tipo: "despesa",
    status: "realizado",
    metodo: "Cartão de Crédito",
    cartaoId: 2,
    categoria: "Pets",
    valor: 115.9,
  },
  {
    id: 6,
    mesKey: "2026-09",
    data: "21/09",
    descricao: "Recarga Riocard UERJ / Treinos",
    tipo: "despesa",
    status: "realizado",
    metodo: "Conta / Pix",
    contaId: 2,
    categoria: "Transporte",
    valor: 64.0,
  },
  {
    id: 7,
    mesKey: "2026-09",
    data: "22/09",
    descricao: "Mercado Meal Prep (Frango, Ovos, Raízes)",
    tipo: "despesa",
    status: "realizado",
    metodo: "Conta / Pix",
    contaId: 1,
    categoria: "Mercado",
    valor: 187.4,
  },
  {
    id: 8,
    mesKey: "2026-09",
    data: "29/09",
    descricao: "Reposição Ração Urinary + Sachês fim de mês",
    tipo: "despesa",
    status: "previsto",
    metodo: "Conta / Pix",
    contaId: 1,
    categoria: "Pets",
    valor: 95.0,
  },
  {
    id: 9,
    mesKey: "2026-09",
    data: "30/09",
    descricao: "Cachê Workshop Ginástica / Cheer",
    tipo: "receita",
    status: "previsto",
    metodo: "Conta / Pix",
    contaId: 1,
    categoria: "Lazer & Outros",
    valor: 220.0,
  },
  {
    id: 20,
    mesKey: "2026-08",
    data: "05/08",
    descricao: "Bolsa UERJ + CDT Agosto",
    tipo: "receita",
    status: "realizado",
    metodo: "Conta / Pix",
    contaId: 1,
    categoria: "Moradia & Fixos",
    valor: 2150.0,
  },
  {
    id: 21,
    mesKey: "2026-08",
    data: "25/08",
    descricao: "Despesas Totais Agosto",
    tipo: "despesa",
    status: "realizado",
    metodo: "Conta / Pix",
    contaId: 1,
    categoria: "Mercado",
    valor: 1890.0,
  },
  {
    id: 30,
    mesKey: "2026-10",
    data: "05/10",
    descricao: "Bolsa Acadêmica UERJ (Prevista)",
    tipo: "receita",
    status: "previsto",
    metodo: "Conta / Pix",
    contaId: 2,
    categoria: "Estudos & UERJ",
    valor: 700.0,
  },
  {
    id: 31,
    mesKey: "2026-10",
    data: "10/10",
    descricao: "Salário CDT Outubro (Previsto)",
    tipo: "receita",
    status: "previsto",
    metodo: "Conta / Pix",
    contaId: 1,
    categoria: "Moradia & Fixos",
    valor: 1550.0,
  },
  {
    id: 32,
    mesKey: "2026-10",
    data: "09/10",
    descricao: "Fatura Nubank + Parcela 6/8 Acordo",
    tipo: "despesa",
    status: "previsto",
    metodo: "Conta / Pix",
    contaId: 1,
    categoria: "Dívida",
    valor: 678.9,
  },
];

export const INITIAL_REPOSITORIO: ArquivoRepositorio[] = [
  {
    id: 1,
    titulo: "Ementa & Cronograma Fisiologia do Exercício 2026.2",
    area: "UERJ",
    tipo: "PDF / Doc",
    urlOuConteudo: "Provas: P1 (28/09) e P2 (19/11). Bibliografia base: McArdle 8ª ed.",
    dataCriacao: "15/08",
    fixado: true,
  },
  {
    id: 2,
    titulo: "Pasta PubMed — 12 Artigos Carga Interna sRPE no Cheerleading",
    area: "Artigos",
    tipo: "Link Externo",
    urlOuConteudo: "https://pubmed.ncbi.nlm.nih.gov",
    dataCriacao: "02/09",
    fixado: true,
  },
  {
    id: 3,
    titulo: "Contagem Musical Coreografia Campeonato RCR (8 Oitavas)",
    area: "CDT & RCR",
    tipo: "Nota Rápida",
    urlOuConteudo: "Oitavas 1-2: Abertura Jumps | 3-4: Stunt Lib | 5-6: Tumbling cruzado | 7-8: Pirâmide central (1:42)",
    dataCriacao: "19/09",
    fixado: true,
  },
  {
    id: 4,
    titulo: "Protocolo Renal da Nina (Dra. Camila — Vet)",
    area: "Casa & Pets",
    tipo: "Nota Rápida",
    urlOuConteudo: "Ração Urinary S/O exclusiva + 1 sachê úmido/dia diluído em 2 colheres de água morna. Retorno em 15/10.",
    dataCriacao: "10/07",
  },
  {
    id: 5,
    titulo: "Planilha Mestre Lala_Memoria_Base (6 Abas)",
    area: "Finanças",
    tipo: "Planilha",
    urlOuConteudo: "Sincronizada: Financas, Casa_e_Cuidado, Graduacao_UERJ, Trabalho_Projetos, Treinos_Atleta, Leitura",
    dataCriacao: "01/09",
  },
];

export const HORARIOS_LINHA_DO_TEMPO = [
  "07:00",
  "07:30",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "12:30",
  "14:00",
  "15:30",
  "17:30",
  "19:30",
  "21:00",
];

export const HORAS_INTEIRAS_AGENDA = [
  7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
];

export const HORARIOS_GRADE = HORARIOS_LINHA_DO_TEMPO;

export const DIAS_SEMANA_HEADER = [
  { label: "SEG", idx: 0, diaMes: 21 },
  { label: "TER", idx: 1, diaMes: 22 },
  { label: "QUA", idx: 2, diaMes: 23 },
  { label: "QUI", idx: 3, diaMes: 24 },
  { label: "SEX", idx: 4, diaMes: 25 },
  { label: "SAB", idx: 5, diaMes: 26 },
  { label: "DOM", idx: 6, diaMes: 27 },
];

export function parseGastoNatural(input: string): {
  valor: number;
  categoria: OrcamentoCategoria["categoria"];
  descricao: string;
  afetaEstoquePets: boolean;
  metodoSugerido: "Conta / Pix" | "Cartão de Crédito";
} | null {
  const limpo = input.trim();
  if (!limpo) return null;

  const matchValor = limpo.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!matchValor) return null;

  const valor = parseFloat(matchValor[1].replace(",", "."));
  if (isNaN(valor) || valor <= 0) return null;

  const lower = limpo.toLowerCase();
  let categoria: OrcamentoCategoria["categoria"] = "Lazer & Outros";
  let afetaEstoquePets = false;
  let metodoSugerido: "Conta / Pix" | "Cartão de Crédito" = "Conta / Pix";

  if (
    lower.includes("cartão") ||
    lower.includes("cartao") ||
    lower.includes("crédito") ||
    lower.includes("credito")
  ) {
    metodoSugerido = "Cartão de Crédito";
  }

  if (
    lower.includes("sachê") ||
    lower.includes("sache") ||
    lower.includes("ração") ||
    lower.includes("racao") ||
    lower.includes("nina") ||
    lower.includes("tobias") ||
    lower.includes("pet") ||
    lower.includes("vet") ||
    lower.includes("areia")
  ) {
    categoria = "Pets";
    if (
      lower.includes("sachê") ||
      lower.includes("sache") ||
      lower.includes("ração") ||
      lower.includes("racao")
    ) {
      afetaEstoquePets = true;
    }
  } else if (
    lower.includes("uber") ||
    lower.includes("ônibus") ||
    lower.includes("onibus") ||
    lower.includes("metrô") ||
    lower.includes("metro") ||
    lower.includes("riocard") ||
    lower.includes("passagem") ||
    lower.includes("transporte")
  ) {
    categoria = "Transporte";
  } else if (
    lower.includes("mercado") ||
    lower.includes("feira") ||
    lower.includes("padaria") ||
    lower.includes("almoço") ||
    lower.includes("almoco") ||
    lower.includes("lanche") ||
    lower.includes("comida") ||
    lower.includes("café") ||
    lower.includes("frango") ||
    lower.includes("ovo")
  ) {
    categoria = "Mercado";
  } else if (
    lower.includes("xerox") ||
    lower.includes("uerj") ||
    lower.includes("livro") ||
    lower.includes("impressão") ||
    lower.includes("apostila")
  ) {
    categoria = "Estudos & UERJ";
  } else if (
    lower.includes("dívida") ||
    lower.includes("divida") ||
    lower.includes("parcela") ||
    lower.includes("acordo")
  ) {
    categoria = "Dívida";
  } else if (
    lower.includes("luz") ||
    lower.includes("internet") ||
    lower.includes("aluguel")
  ) {
    categoria = "Moradia & Fixos";
  }

  const descricaoSemNumero = limpo
    .replace(/r\$\s*/i, "")
    .replace(matchValor[0], "")
    .replace(/^(\s*(reais|real|de|no|na|pro|pra|com|em)\s*)+/i, "")
    .trim();

  const descricao =
    descricaoSemNumero.length > 1
      ? descricaoSemNumero.charAt(0).toUpperCase() + descricaoSemNumero.slice(1)
      : `Gasto em ${categoria}`;

  return { valor, categoria, descricao, afetaEstoquePets, metodoSugerido };
}
