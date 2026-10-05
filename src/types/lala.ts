export type ThemeMode = "light" | "dark" | "survival";

export interface ThemeTokens {
  mode: ThemeMode;
  bg: string;
  card: string;
  cardSubtle: string;
  border: string;
  primary: string;
  action: string;
  finance: string;
  alert: string;
  danger: string;
  text: string;
  textSoft: string;
}

export type TabId =
  | "inicio"
  | "agenda"
  | "calendario"
  | "governanta_lala"
  | "estudos_trabalho"
  | "casa_rotinas"
  | "saude_pets"
  | "financas";

export type ModoInteracaoLala =
  | "comando"
  | "devaneio"
  | "desabafo"
  | "orientacao"
  | "informacao";

export type TomGovernanta =
  | "equilibrada"
  | "acolhedora"
  | "executiva"
  | "treinadora";

export type CategoriaAprendizadoLala =
  | "contexto"
  | "acao_usuario"
  | "decisao"
  | "rotina"
  | "forma_de_uso";

export interface ItemAprendizadoLala {
  id: string;
  categoria: CategoriaAprendizadoLala;
  texto: string;
  origem:
    | "conversa"
    | "edicao_acao"
    | "confirmacao_acao"
    | "desfazer_acao"
    | "uso_app"
    | "acao_app"
    | "manual";
  dataHora: string;
}

export interface PerfilUsuarioCalibrado {
  nomeUsuario: string;
  cursoUERJ: string;
  periodoUERJ: string;
  frentesTrabalho: string;
  metaHorasSono: number;
  metaProteinaG: number;
  metaKcal: number;
  calibrado: boolean;
  ultimaCalibracao?: string;
  tomLala?: TomGovernanta;
  autonomiaLala?: "auto" | "confirmar";
  instrucoesPersonalizadasLala?: string;
  horarioAcordar?: string;
  horarioDormir?: string;
  tiposAutomatizados?: AcaoGovernanta["tipo"][];
  contagemConfirmacoesPorTipo?: Partial<Record<AcaoGovernanta["tipo"], number>>;
  regrasAprendidasLala?: string[];
  itensMemoriaViva?: ItemAprendizadoLala[];
  ultimaLimpezaChatEm?: number;
  diaProximoPagamento?: number;
}

export type IntencaoImportacaoArquivo =
  | "auto"
  | "interpretar"
  | "calendario"
  | "tarefas"
  | "financas"
  | "compras_dieta"
  | "estudos"
  | "treino"
  | "guardar"
  | "dieta"
  | "grade";

export interface AnexoLala {
  nome: string;
  mimeType: string;
  tamanhoBytes: number;
  base64?: string;
  textoExtraido?: string;
  intencao?: IntencaoImportacaoArquivo;
  instrucaoUsuario?: string;
  guardarCopiaNoSegundoCerebro?: boolean;
  areaRepositorio?: ArquivoRepositorio["area"];
}

export interface ConfiguracaoCalendarioApp {
  visaoPadrao: "dia" | "semana" | "mes" | "programacao";
  horaInicioGrade: number; // ex: 6, 7, 8
  mostrarAulasUERJ: boolean;
  mostrarPets: boolean;
  mostrarFinancas: boolean;
  mostrarRadar: boolean;
  mostrarGoogleAgenda: boolean;
  sincronizarAoCriarNoGoogle: boolean;
  coresCategorias: {
    uerj: string;
    trabalho: string;
    pets: string;
    financas: string;
    saude: string;
    pessoal: string;
  };
}

export interface AcaoGovernanta {
  id: string;
  tipo:
    | "CRIAR_TAREFA"
    | "AGENDAR_COMPROMISSO"
    | "REGISTRAR_GASTO"
    | "REGISTRAR_RECEITA"
    | "ALIMENTAR_PETS"
    | "REGISTRAR_SRPE"
    | "GUARDAR_SEGUNDO_CEREBRO"
    | "ALIVIAR_AGENDA_HOJE"
    | "ATIVAR_MODO_SOS"
    | "ATUALIZAR_DIETA_E_COMPRAS"
    | "ATUALIZAR_GRADE_UERJ"
    | "ATUALIZAR_CONTAS_FINANCAS"
    | "ATUALIZAR_PETS"
    | "CRIAR_LISTA_COMPRAS"
    | "ATUALIZAR_TREINO"
    | "ATUALIZAR_PROJETOS_TRABALHO"
    | "ATUALIZAR_HABITOS"
    | "ATUALIZAR_METAS_RADAR"
    | "ATUALIZAR_PERFIL_CHECKIN"
    | "ATUALIZAR_CHECKIN_SAUDE"
    | "ATUALIZAR_PERFIL"
    | "LIMPAR_DADOS_EXEMPLO";
  titulo: string;
  detalhe: string;
  executada: boolean;
  desfeita?: boolean;
  recusada?: boolean;
  editadaPeloUsuario?: boolean;
  executadaEm?: string;
  payload?: {
    texto?: string;
    valor?: number;
    categoriaGasto?: OrcamentoCategoria["categoria"];
    data?: string;
    diaVencimento?: number | null;
    semData?: boolean;
    statusGasto?: "realizado" | "previsto";
    recorrente?: boolean;
    substituirLancamentos?: boolean;
    srpe?: number;
    areaNota?: ArquivoRepositorio["area"];
    anexo?: AnexoLala;
    substituirExistentes?: boolean;
    lancamentosAjuste?: {
      descricao: string;
      valor: number;
      tipo?: "despesa" | "receita";
      status?: "previsto" | "realizado";
      data?: string;
      diaVencimento?: number | null;
      semData?: boolean;
      recorrente?: boolean;
      categoria?: OrcamentoCategoria["categoria"];
      metodo?: "Conta / Pix" | "Cartão de Crédito";
      contaNome?: string;
    }[];
    compromissos?: {
      titulo: string;
      hora: string;
      duracaoMin?: number;
       diaMes?: number;
      mes?: number;
      ano?: number;
      local?: string;
      categoria?: "uerj" | "trabalho" | "pets" | "financas" | "saude" | "pessoal" | "radar" | "rotina";
      categoriaCalendario?: "uerj" | "trabalho" | "pets" | "financas" | "saude" | "pessoal" | "radar" | "rotina";
      sincronizarGoogle?: boolean;
    }[];
    refeicoes?: {
      horario: string;
      nome: string;
      descricao: string;
      proteinaG: number;
      kcal: number;
    }[];
    itensCompras?: {
      nome: string;
      categoria: "Pets" | "Despensa & Meal Prep" | "Limpeza & Casa" | "Higiene";
      quantidadeComprar: number;
      unidade: string;
      precoEstimado: number;
    }[];
    disciplinas?: {
      nome: string;
      professor: string;
      horarioSala: string;
      aulasTotaisSemestre?: number;
      faltasMax?: number;
    }[];
    contasAjuste?: {
      nome: string;
      saldoAtual: number;
    }[];
    cartoesAjuste?: {
      nome: string;
      faturaAtual: number;
      limiteTotal?: number;
      fechamentoDia?: number;
      vencimentoDia?: number;
    }[];
    petsAjuste?: {
      nome: string;
      racao?: string;
      racaoTipo?: string;
      estoqueSaches?: number;
      estoqueRacaoKg?: number;
      metaRefeicoesDia?: number;
      proximaVet?: string;
      proximaVacina?: string;
    }[];
    estoquePetsAjuste?: {
      estoqueSaches?: number;
      estoqueRacaoKg?: number;
    };
    fichaTreino?: {
      nome: string;
      modalidade?: ModalidadeTreino;
      foco: string;
      duracaoEstimadaMin?: number;
      exercicios: {
        nome: string;
        series: number;
        reps: string;
        cargaKg?: number;
        descansoSeg?: number;
        notaTecnica?: string;
      }[];
    };
    fichasTreino?: {
      nome: string;
      modalidade?: ModalidadeTreino;
      foco: string;
      duracaoEstimadaMin?: number;
      exercicios: {
        nome: string;
        series: number;
        reps: string;
        cargaKg?: number;
        descansoSeg?: number;
        notaTecnica?: string;
      }[];
    }[];
    projetos?: {
      nome: string;
      papel?: string;
      tarefa: string;
      prazo?: string;
      prioridade?: "alta" | "média" | "baixa";
      progresso?: number;
      subtarefas?: string[];
    }[];
    projetosTrabalho?: {
      nome: string;
      papel?: string;
      tarefa: string;
      prazo?: string;
      prioridade?: "alta" | "média" | "baixa";
      progresso?: number;
      subtarefas?: string[];
    }[];
    habitos?: {
      titulo: string;
      categoria?: "Saúde" | "Estudos" | "Casa & Pets" | "Mente";
      metaTexto?: string;
    }[];
    habitosLista?: {
      titulo: string;
      categoria?: "Saúde" | "Estudos" | "Casa & Pets" | "Mente";
      metaTexto?: string;
    }[];
    metas?: {
      titulo: string;
      categoria?: string;
      prazo?: string;
      marcos?: string[];
    }[];
    metasLista?: {
      titulo: string;
      categoria?: string;
      prazo?: string;
      horizonte?: string;
      progresso?: number;
      metaAlvoTexto?: string;
      marcos?: string[];
    }[];
    radarLista?: {
      titulo: string;
      area?: "UERJ" | "Trabalho" | "Casa & Pets" | "Corpo" | "Finanças";
      dataEvento?: string;
      diasRestantes?: number;
      etapas?: string[];
    }[];
    perfilCheckin?: {
      nomeUsuario?: string;
      cursoUERJ?: string;
      periodoUERJ?: string;
      frentesTrabalho?: string;
      horasSono?: number;
      energiaFisica?: number;
      focoMental?: number;
      metaHorasSono?: number;
      metaProteinaG?: number;
      metaKcal?: number;
    };
    checkinAjuste?: {
      horasSono?: number;
      qualidadeSono?: number;
      energiaFisica?: number;
      energia?: number;
      focoMental?: number;
      dorMuscular?: number;
      estresse?: number;
      hidratacaoLitros?: number;
    };
    perfilAjuste?: {
      nomeUsuario?: string;
      cursoUERJ?: string;
      periodoUERJ?: string;
      frentesTrabalho?: string;
      metaHorasSono?: number;
      metaProteinaG?: number;
      metaKcal?: number;
    };
  };
}

export interface MatrizDecisaoLala {
  cenarioA?: string;
  cenarioB?: string;
  dilema?: string;
  opcaoA?: {
    nome: string;
    scoreFinal: number;
    pontosFortes: string[];
  };
  opcaoB?: {
    nome: string;
    scoreFinal: number;
    pontosFortes: string[];
  };
  vereditoLala: string;
}

export interface SnapshotEstadoAcaoLala {
  tarefas?: TaskItem[];
  compromissos?: Compromisso[];
  contas?: ContaBancaria[];
  cartoes?: CartaoCredito[];
  lancamentos?: LancamentoFinanceiro[];
  petsPerfil?: PetPerfil[];
  estoqueCasa?: ItemEstoqueCasa[];
  listaCompras?: ItemListaCompras[];
  refeicoes?: ItemRefeicao[];
  fichasTreino?: FichaTreino[];
  disciplinas?: Disciplina[];
  projetos?: ProjetoTrabalho[];
  habitos?: HabitoDiario[];
  metas?: MetaItem[];
  radarItens?: ItemRadar[];
  checkin?: CheckinProntidao;
  perfilCalibrado?: PerfilUsuarioCalibrado;
  repositorio?: ArquivoRepositorio[];
  ultimoSRPE?: number;
  volumeSemana?: number[];
}

export interface RegistroHistoricoAcaoLala {
  id: string;
  acaoId: string;
  interacaoId?: number;
  dataHora: string;
  acao: AcaoGovernanta;
  desfeita: boolean;
  editadaPeloUsuario?: boolean;
  notaAprendizado?: string;
  snapshotAntes: SnapshotEstadoAcaoLala;
}

export interface InteracaoGovernanta {
  id: number;
  dataHora: string;
  modo: ModoInteracaoLala;
  processandoResposta?: boolean;
  humorUsuario?: string;
  mensagemUsuario: string;
  transcricaoAudioUsuario?: string;
  audioUsuarioBase64?: string;
  audioLalaBase64?: string;
  enviadoPorAudio?: boolean;
  nomeAnexo?: string;
  anexo?: AnexoLala;
  anexos?: AnexoLala[];
  respostaLala: string;
  tags?: string[];
  tituloCard?: string;
  acoesPropostas?: AcaoGovernanta[];
  matrizDecisao?: MatrizDecisaoLala;
  guardadoNoCofre?: boolean;
  sugestoesResposta?: string[];
  novaRegraAprendida?: string;
  aprendizadosExtraidos?: {
    categoria: CategoriaAprendizadoLala;
    texto: string;
  }[];
  automatizarTipos?: AcaoGovernanta["tipo"][];
  pedirConfirmacaoTipos?: AcaoGovernanta["tipo"][];
}

export type AbaTipo = TabId;

export type StatusLeitura = "Para Ler" | "Lendo" | "Concluído";

export type ColorTokenKey = "primary" | "action" | "finance" | "alert";

export type TaskCategoryFilter = "todas" | "uerj" | "trabalho" | "casa" | "pessoal";

export type TaskHorizon = "hoje" | "semana" | "backlog";

export interface TaskItem {
  id: number;
  texto: string;
  aba: Exclude<TabId, "inicio">;
  categoriaFiltro: Exclude<TaskCategoryFilter, "todas">;
  cor: ColorTokenKey;
  feito: boolean;
  // Critérios da fórmula: Score = Impacto*30% + Urgência*25% + Facilidade*25% + Retorno*20%
  impacto: number; // 1-10
  urgencia: number; // 1-10
  facilidade: number; // 1-10
  retorno: number; // 1-10
  horizonte?: TaskHorizon; // Fluxo bidirecional: "hoje" | "semana" | "backlog"
  manualLock?: "p1" | "top3" | "adiada" | "backlog" | null;
  horarioAgendado?: string | null; // ex: "07:30", "14:00"
  duracaoMin?: number; // ex: 5, 10, 15, 45, 60
  prazoFixo?: string; // ex: "28/09", ou vazio se sem prazo fixo (Backlog)
  diaAgendado?: number; // dia do mês (ex: 27)
  origemRadarId?: number;
}

export interface HabitoDiario {
  id: number;
  titulo: string;
  icone: "droplets" | "book" | "dumbbell" | "paw" | "sparkles" | "sun";
  categoria: "Saúde" | "Estudos" | "Casa & Pets" | "Mente";
  cor: ColorTokenKey;
  feitoHoje: boolean;
  streakAtual: number;
  melhorStreak: number;
  // Histórico últimos 7 dias (SEG..DOM): true = concluído
  historicoSemana: boolean[];
  metaTexto?: string; // ex: "5 min", "2,8L", "15 págs"
}

export type RecorrenciaCompromisso = "nenhuma" | "diaria" | "semanal" | "mensal";

export interface Compromisso {
  id: number;
  hora: string; // "07:30", "08:00", "12:15" (qualquer HH:MM)
  duracaoMin: number; // duração exata em minutos (ex: 5, 10, 15, 45, 110)
  titulo: string;
  local?: string;
  cor: ColorTokenKey;
  aba: Exclude<TabId, "inicio">;
  diaMes: number; // 1..31
  mes?: number; // 1..12
  ano?: number; // ex: 2026
  diaSemanaIdx: number; // 0=SEG .. 6=DOM
  notas?: string;
  gcalSynced?: boolean;
  gcalEventId?: string;
  categoriaCalendario?: "uerj" | "trabalho" | "pets" | "financas" | "saude" | "pessoal";
  taskId?: number;
  concluido?: boolean;
  recorrencia?: RecorrenciaCompromisso;
  serieRecorrenciaId?: string;
  recorrenciaSerieId?: string;
  excecoesDatas?: string[]; // Datas "YYYY-MM-DD" excluídas ou separadas desta série
  datasExcluidasRecorrencia?: string[];
  dataFimRecorrencia?: string; // Data limite "YYYY-MM-DD" (inclusive) quando a série foi dividida em "este e os seguintes"
  recorrenciaAteData?: string;
}

// ---------- NO RADAR (7 A 14 DIAS) ----------
export interface EtapaPreparacaoRadar {
  id: number;
  diasAntes: number;
  rotuloTempo: string;
  acao: string;
  concluida: boolean;
  enviadaParaHoje?: boolean;
}

export interface ItemRadar {
  id: number;
  titulo: string;
  dataEvento: string;
  diasRestantes: number;
  area: "UERJ" | "Trabalho" | "Casa & Pets" | "Corpo" | "Finanças";
  cor: ColorTokenKey;
  etapas: EtapaPreparacaoRadar[];
}

// ---------- METAS COM MARCOS INTERMEDIÁRIOS ----------
export interface MarcoMeta {
  id: number;
  texto: string;
  concluido: boolean;
}

export interface MetaItem {
  id: number;
  titulo: string;
  categoria: string;
  prazo: string;
  cor: ColorTokenKey;
  marcos: MarcoMeta[];
}

// ---------- CHECK-IN DE PRONTIDÃO DIÁRIO (30s) ----------
export interface CheckinProntidao {
  horasSono: number;
  qualidadeSono: number;
  energiaFisica: number;
  focoMental: number;
  realizadoHoje: boolean;
  nota?: string;
}

// ---------- GRADUAÇÃO UERJ & ESTUDOS ----------
export interface AvaliacaoDisciplina {
  id: number;
  tipo: string;
  data: string;
  peso: number;
  notaObtida?: number | null;
  concluida?: boolean;
}

export interface LeituraObrigatoria {
  id: number;
  titulo: string;
  paginas: string;
  lido: boolean;
}

export interface LinkUtilDisciplina {
  id: number;
  rotulo: string;
  url: string;
}

export interface Disciplina {
  id: number;
  nome: string;
  professor: string;
  horarioSala: string;
  prazo: string;
  status: "estudando" | "pendente" | "em dia";
  aulasTotaisSemestre: number;
  faltasAtuais: number;
  faltasMax: number;
  presencas: number;
  mediaAprovacao: number;
  avaliacoes: AvaliacaoDisciplina[];
  leiturasSemana: LeituraObrigatoria[];
  linksUteis: LinkUtilDisciplina[];
  anotacoes: string;
}

export type FaseArtigo =
  | "Triagem"
  | "Leitura ativa"
  | "Fichamento/Notas"
  | "Escrita/Citações"
  | "Submissão";

export interface FichaCitacao {
  id: number;
  autorAno: string;
  pagina: string;
  trecho: string;
  tag: string;
}

export interface Artigo {
  id: number;
  nome: string;
  subtitulo: string;
  periódicoAlvo: string;
  fase: FaseArtigo;
  statusLeitura?: StatusLeitura;
  notas: string;
  citacoes: FichaCitacao[];
}

export interface LivroLeitura {
  id: number;
  tipo: "Acadêmico" | "Fantasia";
  titulo: string;
  autor: string;
  paginasLidas: number;
  paginasTotal: number;
}

// ---------- SAÚDE & TREINOS (CHEERLEADING, GINÁSTICA, MUSCULAÇÃO) ----------
export type ModalidadeTreino = "Musculação" | "Cheerleading" | "Ginástica";

export interface SerieExercicio {
  id: number;
  numero: number;
  cargaOuDetalhe: string | number;
  repsOuTempo: string | number;
  qualidadeOuHit?: string;
  concluida: boolean;
}

export interface ExercicioTreino {
  id: number;
  nome: string;
  modalidade: ModalidadeTreino;
  notaTecnica?: string;
  descansoSeg: number;
  series: SerieExercicio[];
}

export interface FichaTreino {
  id: number;
  nome: string;
  modalidade: ModalidadeTreino;
  foco: string;
  duracaoEstimadaMin?: number;
  ultimaRealizacao?: string;
  exercicios: ExercicioTreino[];
}

export interface ItemRefeicao {
  id: number;
  horario: string;
  nome: string;
  descricao: string;
  proteinaG: number;
  kcal: number;
  feito: boolean;
}

// ---------- CASA & ROTINAS EDITÁVEIS ----------
export type FrequenciaRotina = "Diária" | "3x na semana" | "Semanal" | "Quinzenal";

export interface RotinaComodo {
  id: number;
  tarefa: string;
  frequencia: FrequenciaRotina;
  diasCiclo: number; // 1, 2, 7, 15
  diasDesdeUltimaVez: number; // se >= diasCiclo e !pausada, está Pendente Hoje
  feitoHoje: boolean;
  tempoEstimadoMin: number;
  pausada?: boolean; // permite pausar rotinas recorrentes
  proximaDataLabel?: string; // caso reagendada manualmente
}

export interface ComodoCasa {
  id: number;
  nome: string;
  icone: string;
  rotinas: RotinaComodo[];
}

export interface ItemEstoqueCasa {
  id: number;
  nome: string;
  categoria: "Pets" | "Despensa & Meal Prep" | "Limpeza & Casa" | "Higiene";
  quantidadeAtual: number;
  quantidadeMinima: number;
  unidade: string;
  consumoDiarioEstimado?: number;
  precoEstimadoReposicao: number;
}

export interface ItemListaCompras {
  id: number;
  nome: string;
  categoria: "Pets" | "Despensa & Meal Prep" | "Limpeza & Casa" | "Higiene";
  quantidadeComprar: number;
  unidade: string;
  precoEstimado: number;
  origemEstoqueId?: number;
  comprado: boolean;
}

export interface VacinaCuidadoPet {
  id: number;
  tipo: string;
  dataRealizada: string;
  proximaData: string;
  status: "em dia" | "atencao";
}

export interface PetPerfil {
  id: number;
  nome: string;
  racao: string;
  consumoRacaoGramasDia: number;
  consumoSachesDia: number;
  proximaVet: string;
  estoqueSaches: number;
  estoqueRacaoKg: number;
  alimentadoHojeRefeicoes: number;
  sachesDadosHoje?: number;
  metaRefeicoesDia: number;
  historicoPeso: { data: string; pesoKg: number }[];
  cuidados: VacinaCuidadoPet[];
  observacoes: string;
}

// ---------- TRABALHO & ENTREGÁVEIS DE PROJETOS ----------
export type StatusEntregavel = "Planejado" | "Em Produção" | "Revisão" | "Entregue";

export interface EntregavelProjeto {
  id: number;
  titulo: string;
  prazo: string;
  status: StatusEntregavel;
  duracaoEstimadaMin: number;
  concluido: boolean;
}

export interface ProjetoTrabalho {
  id: number;
  nome: string;
  papel: string;
  tarefa: string; // Entregável principal ativo
  prazo: string;
  prioridade: "alta" | "média" | "baixa";
  statusProjeto?: StatusEntregavel;
  notas: string;
  subtarefas: { id: number; texto: string; feito: boolean; prazo?: string }[];
}

// ---------- FINANÇAS ----------
export type MesFinanceiroKey = "2026-08" | "2026-09" | "2026-10";

export type BancoId =
  | "nubank"
  | "itau"
  | "inter"
  | "bradesco"
  | "santander"
  | "bb"
  | "caixa"
  | "c6"
  | "picpay"
  | "mercadopago"
  | "xp"
  | "btg"
  | "carteira"
  | "outro";

export interface ContaBancaria {
  id: number;
  nome: string;
  tipo:
    | "Corrente / Pix"
    | "Recebimento"
    | "Reserva"
    | "Investimentos"
    | "Carteira Física";
  saldoAtual: number;
  cor: string;
  bancoId?: BancoId;
  agenciaConta?: string;
  metaReserva?: number;
}

export interface CartaoCredito {
  id: number;
  nome: string;
  limiteTotal: number;
  faturaAtual: number;
  fechamentoDia: number;
  vencimentoDia: number;
  statusFatura: "aberta" | "fechada" | "paga";
  bancoId?: BancoId;
  cor?: string;
}

export interface OrcamentoCategoria {
  categoria:
    | "Mercado"
    | "Pets"
    | "Transporte"
    | "Moradia & Fixos"
    | "Estudos & UERJ"
    | "Dívida"
    | "Lazer & Outros"
    | "Compras Avulsas"
    | (string & {});
  tetoMensal: number;
  semTetoDefinido?: boolean;
}

export interface LancamentoFinanceiro {
  id: number;
  mesKey: MesFinanceiroKey;
  data: string;
  descricao: string;
  tipo: "despesa" | "receita";
  status: "realizado" | "previsto";
  metodo: "Conta / Pix" | "Cartão de Crédito";
  contaId?: number;
  cartaoId?: number;
  categoria: OrcamentoCategoria["categoria"];
  valor: number;
  recorrente?: boolean;
  diaVencimento?: number | null;
  semData?: boolean;
}

// ---------- REPOSITÓRIO DE ARQUIVOS & SEGUNDO CÉREBRO ----------
export interface ArquivoRepositorio {
  id: number;
  titulo: string;
  area: "UERJ" | "Artigos" | "CDT & RCR" | "Casa & Pets" | "Finanças" | "Pessoal";
  tipo: "PDF / Doc" | "Link Externo" | "Nota Rápida" | "Planilha" | "Imagem / Foto";
  urlOuConteudo: string;
  dataCriacao: string;
  fixado?: boolean;
  statusLeitura?: StatusLeitura;
  anexoBase64?: string;
  mimeType?: string;
  nomeArquivoOriginal?: string;
  tamanhoBytes?: number;
}

export type BottomSheetType =
  | "disciplina"
  | "artigo"
  | "leitura"
  | "pet"
  | "projeto"
  | "compromisso"
  | "tarefa"
  | "checkin_prontidao"
  | "radar_item"
  | "comodo"
  | "planilha";

export interface BottomSheetPayload {
  tipo: BottomSheetType;
  id?: number | string;
}
