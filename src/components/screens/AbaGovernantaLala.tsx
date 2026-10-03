import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Mic,
  Send,
  Scale,
  Plus,
  Paperclip,
  Trash2,
  Volume2,
  VolumeX,
  Square,
  X,
  FileText,
  UserCog,
  Check,
  MessageSquare,
  History,
  Zap,
  ShieldAlert,
  RotateCcw,
  Pencil,
  CheckCircle2,
  Search,
  Brain,
} from "lucide-react";
import {
  AcaoGovernanta,
  AnexoLala,
  ArquivoRepositorio,
  CartaoCredito,
  CategoriaAprendizadoLala,
  CheckinProntidao,
  Compromisso,
  ContaBancaria,
  Disciplina,
  HabitoDiario,
  InteracaoGovernanta,
  ItemAprendizadoLala,
  ItemListaCompras,
  ItemRefeicao,
  LancamentoFinanceiro,
  MatrizDecisaoLala,
  PerfilUsuarioCalibrado,
  PetPerfil,
  ProjetoTrabalho,
  RegistroHistoricoAcaoLala,
  TabId,
  TaskItem,
  ThemeTokens,
  TomGovernanta,
} from "../../types/lala";
import {
  consolidarMemoriaAntesDeLimparChat,
  consultarLalaUnificada,
  falarTextoComVozDaLala,
  formatarTamanhoBytes,
  lerArquivoParaAnexo,
  pararVozDaLala,
  processarMensagemLocalLala,
} from "../../services/lalaEngine";
import { LalaAppActionCard, getNomeAmigavelTipoAcao } from "../LalaAppActionCard";

interface AbaGovernantaLalaProps {
  t: ThemeTokens;
  tom: TomGovernanta;
  setTom: (tom: TomGovernanta) => void;
  interacoes: InteracaoGovernanta[];
  setInteracoes: React.Dispatch<React.SetStateAction<InteracaoGovernanta[]>>;
  tarefas: TaskItem[];
  compromissos: Compromisso[];
  disciplinas: Disciplina[];
  projetos: ProjetoTrabalho[];
  refeicoes: ItemRefeicao[];
  listaCompras: ItemListaCompras[];
  habitos: HabitoDiario[];
  petsPerfil: PetPerfil[];
  checkin: CheckinProntidao;
  prontidaoScore: number;
  dinheiroLivreHoje: number;
  contas?: ContaBancaria[];
  cartoes?: CartaoCredito[];
  lancamentos?: LancamentoFinanceiro[];
  repositorio: ArquivoRepositorio[];
  perfilCalibrado?: PerfilUsuarioCalibrado;
  setPerfilCalibrado?: React.Dispatch<React.SetStateAction<PerfilUsuarioCalibrado>>;
  historicoAcoesLala?: RegistroHistoricoAcaoLala[];
  onExecutarAcao: (acao: AcaoGovernanta, interacaoId?: number) => void;
  onDesfazerAcao?: (acaoId: string) => void;
  onRecusarAcao?: (acaoId: string, interacaoId?: number) => void;
  onEditarEExecutarAcao?: (
    acaoAtualizada: AcaoGovernanta,
    notaAprendizado?: string,
    interacaoId?: number
  ) => void;
  onToggleAutomacaoTipo?: (
    tipo: AcaoGovernanta["tipo"],
    automatizar: boolean
  ) => void;
  onIrParaAba?: (aba: TabId) => void;
  showToast: (msg: string) => void;
}

const PROCESSOS_CONFIGURAVEIS: {
  tipo: AcaoGovernanta["tipo"];
  nome: string;
  descricao: string;
}[] = [
  {
    tipo: "REGISTRAR_GASTO",
    nome: "Lançamento de Gastos & Despesas",
    descricao: "Registrar gastos no extrato e abater do Dinheiro Livre",
  },
  {
    tipo: "REGISTRAR_RECEITA",
    nome: "Lançamento de Receitas & Entradas",
    descricao: "Registrar entradas de dinheiro, Pix recebidos, bolsas e salários",
  },
  {
    tipo: "ATUALIZAR_CONTAS_FINANCAS",
    nome: "Saldos Bancários & Cartões de Crédito",
    descricao: "Atualizar saldos de contas e faturas/limites a partir de prints ou mensagens",
  },
  {
    tipo: "CRIAR_TAREFA",
    nome: "Criação de Tarefas & Prioridades",
    descricao: "Adicionar tarefas na lista priorizada de Hoje ou da Semana",
  },
  {
    tipo: "AGENDAR_COMPROMISSO",
    nome: "Compromissos na Agenda & Calendário",
    descricao: "Agendar eventos com horário e sincronização com Google Calendar",
  },
  {
    tipo: "ALIMENTAR_PETS",
    nome: "Alimentação & Sachês dos Pets",
    descricao: "Dar baixa em sachês/ração da Nina e do Tobias",
  },
  {
    tipo: "ATUALIZAR_PETS",
    nome: "Estoque, Ração & Veterinária dos Pets",
    descricao: "Atualizar estoque de sachês, kg de ração e datas de vacina/vet",
  },
  {
    tipo: "ATUALIZAR_DIETA_E_COMPRAS",
    nome: "Cardápio da Dieta & Meal Prep",
    descricao: "Importar refeições, horários, proteínas e calorias do plano alimentar",
  },
  {
    tipo: "CRIAR_LISTA_COMPRAS",
    nome: "Lista de Compras de Mercado",
    descricao: "Adicionar itens, quantidades e preços estimados na lista de mercado",
  },
  {
    tipo: "ATUALIZAR_GRADE_UERJ",
    nome: "Grade de Disciplinas UERJ",
    descricao: "Atualizar matérias, professores, salas e horários do semestre",
  },
  {
    tipo: "ATUALIZAR_PROJETOS_TRABALHO",
    nome: "Projetos de Trabalho & Entregas",
    descricao: "Criar ou atualizar entregáveis e prazos de trabalho",
  },
  {
    tipo: "ATUALIZAR_TREINO",
    nome: "Planilha de Treino & Exercícios",
    descricao: "Importar ou ajustar séries, repetições e cargas da ficha de treino",
  },
  {
    tipo: "ATUALIZAR_HABITOS",
    nome: "Hábitos Diários",
    descricao: "Adicionar ou ajustar hábitos rastreados diariamente",
  },
  {
    tipo: "ATUALIZAR_METAS_RADAR",
    nome: "Metas & Radar de Prazos",
    descricao: "Cadastrar metas maiores ou prazos importantes no radar",
  },
];

export function AbaGovernantaLala({
  t,
  tom,
  setTom,
  interacoes,
  setInteracoes,
  tarefas,
  compromissos,
  disciplinas,
  projetos,
  refeicoes,
  listaCompras,
  habitos,
  petsPerfil,
  checkin,
  prontidaoScore,
  dinheiroLivreHoje,
  contas = [],
  cartoes = [],
  lancamentos = [],
  perfilCalibrado,
  setPerfilCalibrado,
  historicoAcoesLala = [],
  onExecutarAcao,
  onDesfazerAcao,
  onRecusarAcao,
  onEditarEExecutarAcao,
  onToggleAutomacaoTipo,
  onIrParaAba,
  showToast,
}: AbaGovernantaLalaProps) {
  const [subAba, setSubAba] = useState<"chat" | "historico" | "aprendizado">(
    "chat"
  );
  const [filtroHistorico, setFiltroHistorico] = useState<
    "todas" | "pendentes" | "aplicadas" | "editadas" | "desfeitas"
  >("todas");
  const [buscaHistorico, setBuscaHistorico] = useState("");
  const [novaRegraInput, setNovaRegraInput] = useState("");
  const [editandoRegraIdx, setEditandoRegraIdx] = useState<number | null>(null);
  const [editandoRegraTexto, setEditandoRegraTexto] = useState("");

  const [mensagem, setMensagem] = useState<string>(() => {
    try {
      return localStorage.getItem("casa_lala_chat_draft") || "";
    } catch {
      return "";
    }
  });
  const [gravando, setGravando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [envioEmAndamento, setEnvioEmAndamento] = useState<{
    texto: string;
    anexos: AnexoLala[];
    hora: string;
  } | null>(null);
  const [anexosAtuais, setAnexosAtuais] = useState<AnexoLala[]>([]);
  const [painelPerfilAberto, setPainelPerfilAberto] = useState(false);

  // Salva rascunho da mensagem automaticamente para não perder texto digitado ao atualizar/trocar aba
  useEffect(() => {
    try {
      if (mensagem) {
        localStorage.setItem("casa_lala_chat_draft", mensagem);
      } else {
        localStorage.removeItem("casa_lala_chat_draft");
      }
    } catch {
      // ignore
    }
  }, [mensagem]);

  // Memória Viva (5 dimensões: contexto, acao_usuario, decisao, rotina, forma_de_uso)
  const [filtroCategoriaMemoria, setFiltroCategoriaMemoria] = useState<
    "todas" | CategoriaAprendizadoLala
  >("todas");
  const [novaMemoriaCategoria, setNovaMemoriaCategoria] =
    useState<CategoriaAprendizadoLala>("contexto");
  const [novaMemoriaTexto, setNovaMemoriaTexto] = useState("");
  const [editandoMemoriaId, setEditandoMemoriaId] = useState<string | null>(
    null
  );
  const [editandoMemoriaTexto, setEditandoMemoriaTexto] = useState("");

  // Voice conversation state
  const [segundosGravacao, setSegundosGravacao] = useState(0);
  const [transcricaoAoVivo, setTranscricaoAoVivo] = useState("");
  const [vozAutomaticaLala, setVozAutomaticaLala] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("casa_lala_voz_auto");
      return v === null ? true : v === "true";
    } catch {
      return true;
    }
  });
  const [idFalandoAgora, setIdFalandoAgora] = useState<number | null>(null);
  const [carregandoVozId, setCarregandoVozId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerGravacaoRef = useRef<number | null>(null);
  const cancelarGravacaoRef = useRef<boolean>(false);
  const transcricaoAcumuladaRef = useRef<string>("");

  // Guarda apenas os IDs das ações cujo aviso/notificação no topo o usuário ocultou (sem recusar a ação!)
  const [idsPendentesAvisoOculto, setIdsPendentesAvisoOculto] = useState<
    string[]
  >(() => {
    try {
      const raw = localStorage.getItem("casa_lala_aviso_pendentes_ocultos");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(Math.max(el.scrollHeight, 54), 176);
    el.style.height = `${nextHeight}px`;
  }, [mensagem]);

  const interacoesCronologicas = useMemo(
    () => [...interacoes].reverse(),
    [interacoes]
  );

  // Count actions waiting for confirmation across chat
  const acoesPendentesConfirmacao = useMemo(() => {
    const lista: {
      acao: AcaoGovernanta;
      interacaoId: number;
      dataHora: string;
      mensagemUsuario: string;
    }[] = [];
    for (const it of interacoes) {
      for (const ac of it.acoesPropostas || []) {
        if (!ac.executada && !ac.recusada && !ac.desfeita) {
          lista.push({
            acao: ac,
            interacaoId: it.id,
            dataHora: it.dataHora,
            mensagemUsuario: it.mensagemUsuario,
          });
        }
      }
    }
    return lista;
  }, [interacoes]);

  const acoesPendentesVisiveisNoAviso = useMemo(
    () =>
      acoesPendentesConfirmacao.filter(
        (item) => !idsPendentesAvisoOculto.includes(item.acao.id)
      ),
    [acoesPendentesConfirmacao, idsPendentesAvisoOculto]
  );

  useEffect(() => {
    if (subAba === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [interacoes.length, processando, subAba]);

  useEffect(() => {
    return () => {
      pararVozDaLala();
      if (timerGravacaoRef.current) {
        window.clearInterval(timerGravacaoRef.current);
      }
    };
  }, []);

  const toggleVozAutomatica = () => {
    setVozAutomaticaLala((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("casa_lala_voz_auto", String(next));
      } catch {
        // ignore
      }
      if (!next) {
        pararVozDaLala();
        setIdFalandoAgora(null);
        setCarregandoVozId(null);
      }
      showToast(
        next
          ? "Voz da Lala ativada: ela responderá falando!"
          : "Voz automática da Lala silenciada."
      );
      return next;
    });
  };

  const reproduzirFalaDaLala = async (interacaoId: number, texto: string) => {
    if (idFalandoAgora === interacaoId) {
      pararVozDaLala();
      setIdFalandoAgora(null);
      setCarregandoVozId(null);
      return;
    }

    setCarregandoVozId(null);
    setIdFalandoAgora(interacaoId);

    await falarTextoComVozDaLala(
      texto,
      tom,
      undefined,
      () => {
        setCarregandoVozId(null);
        setIdFalandoAgora((atual) => (atual === interacaoId ? null : atual));
      }
    );
  };

  const handleSelecionarArquivos = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files: File[] = Array.from(fileList);
    try {
      const lidos: AnexoLala[] = [];
      for (const f of files) {
        const lido = await lerArquivoParaAnexo(f);
        lidos.push({ ...lido, intencao: "interpretar" as const });
      }
      setAnexosAtuais((prev) => [...prev, ...lidos]);
      showToast(
        lidos.length === 1
          ? `Imagem/arquivo "${lidos[0].nome}" anexado!`
          : `${lidos.length} imagens/arquivos anexados de uma vez!`
      );
    } catch {
      showToast("Não foi possível ler um dos arquivos selecionados.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      const lidos: AnexoLala[] = [];
      for (const f of imageFiles) {
        const lido = await lerArquivoParaAnexo(f);
        lidos.push({ ...lido, intencao: "interpretar" as const });
      }
      setAnexosAtuais((prev) => [...prev, ...lidos]);
      showToast(`${lidos.length} print(s) colado(s) no chat!`);
    }
  };

  const formatarTempoGravacao = (seg: number) => {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const limparTimersEReconhecimento = () => {
    if (timerGravacaoRef.current) {
      window.clearInterval(timerGravacaoRef.current);
      timerGravacaoRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  };

  const iniciarGravacaoDeVoz = async () => {
    pararVozDaLala();
    setIdFalandoAgora(null);
    cancelarGravacaoRef.current = false;
    transcricaoAcumuladaRef.current = "";
    setTranscricaoAoVivo("");
    setSegundosGravacao(0);

    const SpeechRecognition =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.lang = "pt-BR";
        rec.continuous = true;
        rec.interimResults = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (event: any) => {
          let textoFinal = "";
          let textoInterim = "";
          for (let i = 0; i < event.results.length; i++) {
            const tr = event.results[i][0]?.transcript || "";
            if (event.results[i].isFinal) {
              textoFinal += tr + " ";
            } else {
              textoInterim += tr;
            }
          }
          const combinado = `${textoFinal}${textoInterim}`.trim();
          if (combinado) {
            transcricaoAcumuladaRef.current = combinado;
            setTranscricaoAoVivo(combinado);
          }
        };
        rec.start();
        recognitionRef.current = rec;
      } catch {
        // fallback MediaRecorder
      }
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((tr) => tr.stop());
          limparTimersEReconhecimento();
          setGravando(false);

          if (cancelarGravacaoRef.current) {
            setTranscricaoAoVivo("");
            return;
          }

          const audioBlob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl =
              typeof reader.result === "string" ? reader.result : "";
            const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : "";
            const anexoVoz: AnexoLala = {
              nome: `Mensagem de Voz (${new Date().toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}).webm`,
              mimeType: audioBlob.type || "audio/webm",
              tamanhoBytes: audioBlob.size,
              base64,
              intencao: "interpretar",
            };

            const textoCapturado =
              transcricaoAcumuladaRef.current.trim() ||
              mensagem.trim() ||
              "🎙️ Mensagem de voz enviada para a Lala";

            setTranscricaoAoVivo("");
            transcricaoAcumuladaRef.current = "";

            enviarMensagemParaLala(textoCapturado, [anexoVoz], true);
          };
          reader.readAsDataURL(audioBlob);
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
        setGravando(true);
        timerGravacaoRef.current = window.setInterval(() => {
          setSegundosGravacao((s) => s + 1);
        }, 1000);
        return;
      } catch {
        limparTimersEReconhecimento();
        showToast(
          "Permita o acesso ao microfone no navegador para falar com a Lala."
        );
      }
    } else {
      showToast("Gravação de áudio não disponível neste navegador.");
    }
  };

  const pararEEnviarAudio = () => {
    cancelarGravacaoRef.current = false;
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    } else {
      limparTimersEReconhecimento();
      setGravando(false);
      const textoCapturado = transcricaoAcumuladaRef.current.trim();
      if (textoCapturado) {
        enviarMensagemParaLala(textoCapturado, undefined, true);
      }
    }
  };

  const cancelarAudio = () => {
    cancelarGravacaoRef.current = true;
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    } else {
      limparTimersEReconhecimento();
      setGravando(false);
    }
    setTranscricaoAoVivo("");
    transcricaoAcumuladaRef.current = "";
    showToast("Gravação de áudio cancelada.");
  };

  // Verifica se um tipo de ação deve ser executado automaticamente ou se pede confirmação
  const deveExecutarAutomaticamente = (tipo: AcaoGovernanta["tipo"]) => {
    const modoGlobal = perfilCalibrado?.autonomiaLala ?? "confirmar";
    if (modoGlobal === "auto") return true;
    const tiposAuto = perfilCalibrado?.tiposAutomatizados || [];
    return tiposAuto.includes(tipo);
  };

  const enviarMensagemParaLala = async (
    textoCustom?: string,
    anexosOverride?: AnexoLala[],
    veioDeVoz?: boolean,
    reusarInteracaoId?: number
  ) => {
    const texto = (textoCustom ?? mensagem).trim();
    const listaAnexos = anexosOverride ?? anexosAtuais;
    if (!texto && listaAnexos.length === 0) return;

    const msgEnviada =
      texto ||
      (listaAnexos.length === 1
        ? `Analise a imagem/arquivo "${listaAnexos[0].nome}" e atualize o que for necessário no aplicativo.`
        : `Analise estas ${listaAnexos.length} imagens/arquivos e atualize os dados no aplicativo.`);

    const horaEnvio = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (textoCustom === undefined) {
      setMensagem("");
      try {
        localStorage.removeItem("casa_lala_chat_draft");
      } catch {
        // ignore
      }
    }
    if (anexosOverride === undefined) {
      setAnexosAtuais([]);
    }
    setProcessando(true);
    setEnvioEmAndamento(null);

    const novaInteracaoId = reusarInteracaoId || Date.now();

    // Persiste a mensagem da usuária IMEDIATAMENTE no histórico antes mesmo da chamada de rede
    // para garantir que nenhuma parte da conversa jamais suma se a página recarregar ou oscilar!
    const interacaoPendente: InteracaoGovernanta = {
      id: novaInteracaoId,
      dataHora: horaEnvio,
      modo: "comando",
      processandoResposta: true,
      mensagemUsuario: msgEnviada,
      respostaLala:
        listaAnexos.length > 0
          ? `Lendo seus ${listaAnexos.length} arquivo(s)/print(s) e preparando tudo...`
          : "Analisando sua mensagem e preparando tudo para você...",
      anexo: listaAnexos.length > 0 ? listaAnexos[0] : undefined,
      anexos: listaAnexos.length > 0 ? listaAnexos : undefined,
      acoesPropostas: [],
    };

    setInteracoes((prev) => {
      const jaExiste = prev.some((it) => it.id === novaInteracaoId);
      if (jaExiste) {
        return prev.map((it) =>
          it.id === novaInteracaoId ? interacaoPendente : it
        );
      }
      return [interacaoPendente, ...prev];
    });

    // Se a usuária fez uma pergunta de acompanhamento sobre prints/contas enviados na mensagem anterior sem reanexar,
    // recupera automaticamente os anexos das interações recentes para a Lala enxergar as imagens!
    let anexosParaAnalise = listaAnexos;
    if (
      listaAnexos.length === 0 &&
      /\b(print|prints|foto|fotos|imagem|imagens|anexo|anexos|leu|ler|leia|faltou|esqueceu|errado|errou|novamente|de novo|tente|tenta|conta|contas|saldo|saldos|banco|picpay|nubank|inter|ita[uú]|cart[aã]o|fatura|finan[çc]as)\b/i.test(
        msgEnviada
      )
    ) {
      const interacaoComAnexo = interacoes
        .slice(0, 12)
        .find(
          (it) =>
            it.id !== novaInteracaoId &&
            ((it.anexos && it.anexos.length > 0) || it.anexo)
        );
      if (interacaoComAnexo) {
        anexosParaAnalise =
          interacaoComAnexo.anexos && interacaoComAnexo.anexos.length > 0
            ? interacaoComAnexo.anexos
            : interacaoComAnexo.anexo
            ? [interacaoComAnexo.anexo]
            : [];
      }
    }

    try {
      const resultado = await consultarLalaUnificada(
        msgEnviada,
        {
          nomeUsuario: perfilCalibrado?.nomeUsuario,
          prontidaoScore,
          horasSono: checkin.horasSono,
          dinheiroLivreHoje,
          sachesRestantes: petsPerfil[0]?.estoqueSaches ?? 6,
          tarefasHojeCount: tarefas.filter((tk) => !tk.feito).length,
          prioridade1:
            tarefas.find((tk) => !tk.feito)?.texto || "Organizar rotina do dia",
          disciplinasUERJ: disciplinas.map(
            (d) =>
              `${d.nome} (${d.horarioSala}) Faltas: ${d.faltasAtuais}/${d.faltasMax}`
          ),
          projetosAtivos: projetos.map((p) => `${p.nome}: ${p.tarefa}`),
          contasBancarias: contas.map((c) => ({
            nome: c.nome,
            saldoAtual: c.saldoAtual,
          })),
          cartoesCredito: cartoes.map((cc) => ({
            nome: cc.nome,
            faturaAtual: cc.faturaAtual,
            limiteTotal: cc.limiteTotal,
            vencimentoDia: cc.vencimentoDia,
          })),
          gastosPrevistosERecorrentes: lancamentos.slice(0, 35).map(
            (l) =>
              `${l.descricao}: R$ ${Number(l.valor || 0)
                .toFixed(2)
                .replace(".", ",")} (${l.status}, ${
                l.semData ? "Sem data" : l.data || "Sem data"
              }${l.recorrente ? ", recorrente" : ""})`
          ),
          tomLala: tom,
          autonomiaLala: perfilCalibrado?.autonomiaLala ?? "confirmar",
          tiposAutomatizados: perfilCalibrado?.tiposAutomatizados || [],
          regrasAprendidasLala: perfilCalibrado?.regrasAprendidasLala || [],
          itensMemoriaViva: perfilCalibrado?.itensMemoriaViva || [],
          ultimasAcoesNoApp: historicoAcoesLala
            .slice(0, 15)
            .map(
              (h) =>
                `${h.acao.titulo} (${
                  h.desfeita
                    ? "desfeita pela usuária"
                    : h.editadaPeloUsuario
                    ? "editada pela usuária"
                    : "confirmada"
                })`
            ),
          instrucoesPersonalizadasLala:
            perfilCalibrado?.instrucoesPersonalizadasLala,
          horarioAcordar: perfilCalibrado?.horarioAcordar,
          horarioDormir: perfilCalibrado?.horarioDormir,
          historicoConversa: interacoes
            .filter((it) => it.id !== novaInteracaoId && !it.processandoResposta)
            .slice(0, 25)
            .reverse()
            .map((it) => ({
              usuario: it.mensagemUsuario,
              lala: it.respostaLala,
              dataHora: it.dataHora,
              acoesResumo:
                it.acoesPropostas && it.acoesPropostas.length > 0
                  ? it.acoesPropostas
                      .map(
                        (a) =>
                          `${a.tipo}: ${a.titulo} (${
                            a.executada
                              ? "confirmada"
                              : a.recusada
                              ? "recusada"
                              : a.desfeita
                              ? "desfeita"
                              : "aguardando confirmação"
                          })`
                      )
                      .join(" | ")
                  : undefined,
            })),
        },
        anexosParaAnalise
      );

      const agoraHora = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Processa aprendizados nas 5 dimensões ou pedidos de automação vindos pelo chat
      if (setPerfilCalibrado) {
        if (
          resultado.aprendizadosExtraidos &&
          resultado.aprendizadosExtraidos.length > 0
        ) {
          setPerfilCalibrado((prev) => {
            const atuais = [...(prev.itensMemoriaViva || [])];
            for (const ap of resultado.aprendizadosExtraidos || []) {
              const limpo = (ap.texto || "").trim();
              if (
                limpo &&
                !atuais.some(
                  (m) => m.texto.toLowerCase() === limpo.toLowerCase()
                )
              ) {
                atuais.unshift({
                  id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  categoria: ap.categoria,
                  texto: limpo,
                  origem: "conversa",
                  dataHora: agoraHora,
                });
              }
            }
            return {
              ...prev,
              itensMemoriaViva: atuais.slice(0, 80),
            };
          });
        }

        if (resultado.novaRegraAprendida) {
          const regra = resultado.novaRegraAprendida.trim();
          setPerfilCalibrado((prev) => {
            const atuais = prev.regrasAprendidasLala || [];
            const memAtuais = [...(prev.itensMemoriaViva || [])];
            if (
              !memAtuais.some(
                (m) => m.texto.toLowerCase() === regra.toLowerCase()
              )
            ) {
              memAtuais.unshift({
                id: `mem-regra-${Date.now()}`,
                categoria: "forma_de_uso",
                texto: regra,
                origem: "conversa",
                dataHora: agoraHora,
              });
            }
            if (atuais.includes(regra)) {
              return { ...prev, itensMemoriaViva: memAtuais.slice(0, 80) };
            }
            return {
              ...prev,
              regrasAprendidasLala: [regra, ...atuais],
              itensMemoriaViva: memAtuais.slice(0, 80),
            };
          });
        }

        if (
          resultado.automatizarTipos &&
          resultado.automatizarTipos.length > 0
        ) {
          setPerfilCalibrado((prev) => {
            const atuais = new Set(prev.tiposAutomatizados || []);
            resultado.automatizarTipos!.forEach((tp) => atuais.add(tp));
            return {
              ...prev,
              tiposAutomatizados: Array.from(atuais),
            };
          });
          showToast(
            `⚡ Processo automatizado pela Lala a seu pedido!`
          );
        }

        if (
          resultado.pedirConfirmacaoTipos &&
          resultado.pedirConfirmacaoTipos.length > 0
        ) {
          setPerfilCalibrado((prev) => {
            const remover = new Set(resultado.pedirConfirmacaoTipos || []);
            return {
              ...prev,
              tiposAutomatizados: (prev.tiposAutomatizados || []).filter(
                (tp) => !remover.has(tp)
              ),
            };
          });
          showToast(
            `🛡️ Lala voltará a pedir confirmação antes de aplicar esse processo.`
          );
        }
      }

      const acoesProcessadas = (resultado.acoesPropostas || []).map((ac) => {
        const autoParaEsteTipo = deveExecutarAutomaticamente(ac.tipo);
        if (autoParaEsteTipo && !ac.executada) {
          onExecutarAcao(ac, novaInteracaoId);
          return { ...ac, executada: true, executadaEm: agoraHora };
        }
        return { ...ac, executada: false };
      });

      const novaInteracao: InteracaoGovernanta = {
        id: novaInteracaoId,
        dataHora: agoraHora,
        processandoResposta: false,
        mensagemUsuario: msgEnviada,
        ...resultado,
        anexo:
          listaAnexos.length > 0
            ? resultado.anexo || listaAnexos[0]
            : undefined,
        anexos:
          listaAnexos.length > 0
            ? resultado.anexos && resultado.anexos.length > 0
              ? resultado.anexos
              : listaAnexos
            : undefined,
        acoesPropostas: acoesProcessadas,
      };

      setInteracoes((prev) => {
        const existe = prev.some((it) => it.id === novaInteracaoId);
        if (existe) {
          return prev.map((it) =>
            it.id === novaInteracaoId ? novaInteracao : it
          );
        }
        return [novaInteracao, ...prev];
      });

      if (vozAutomaticaLala || veioDeVoz) {
        reproduzirFalaDaLala(novaInteracaoId, resultado.respostaLala);
      }
    } catch {
      setInteracoes((prev) =>
        prev.map((it) =>
          it.id === novaInteracaoId
            ? {
                ...it,
                processandoResposta: false,
                respostaLala:
                  "Tive uma oscilação momentânea ao concluir esta resposta, mas sua mensagem está salva aqui. Clique em 'Reanalisar' logo abaixo para eu processar imediatamente!",
              }
            : it
        )
      );
    } finally {
      setProcessando(false);
      setEnvioEmAndamento(null);
    }
  };

  const forcarConclusaoInteracao = useCallback(
    (interacaoId?: number) => {
      const it =
        interacoes.find((i) =>
          interacaoId ? i.id === interacaoId : i.processandoResposta
        ) || interacoes[0];
      if (!it) {
        setProcessando(false);
        setEnvioEmAndamento(null);
        return;
      }
      const targetId = it.id;
      const anx =
        it.anexos && it.anexos.length > 0
          ? it.anexos
          : it.anexo
          ? [it.anexo]
          : [];
      const primeiroAnexo = anx[0];

      const local = processarMensagemLocalLala(
        it.mensagemUsuario,
        {
          nomeUsuario: perfilCalibrado?.nomeUsuario,
          prontidaoScore,
          horasSono: checkin.horasSono,
          dinheiroLivreHoje,
          sachesRestantes: petsPerfil[0]?.estoqueSaches ?? 6,
          tarefasHojeCount: tarefas.filter((tk) => !tk.feito).length,
          prioridade1:
            tarefas.find((tk) => !tk.feito)?.texto || "Organizar rotina do dia",
          disciplinasUERJ: disciplinas.map(
            (d) =>
              `${d.nome} (${d.horarioSala}) Faltas: ${d.faltasAtuais}/${d.faltasMax}`
          ),
          projetosAtivos: projetos.map((p) => `${p.nome}: ${p.tarefa}`),
          contasBancarias: contas.map((c) => ({
            nome: c.nome,
            saldoAtual: c.saldoAtual,
          })),
          cartoesCredito: cartoes.map((cc) => ({
            nome: cc.nome,
            faturaAtual: cc.faturaAtual,
            limiteTotal: cc.limiteTotal,
            vencimentoDia: cc.vencimentoDia,
          })),
          gastosPrevistosERecorrentes: lancamentos.slice(0, 35).map(
            (l) =>
              `${l.descricao}: R$ ${Number(l.valor || 0)
                .toFixed(2)
                .replace(".", ",")}`
          ),
          tomLala: tom,
          autonomiaLala: perfilCalibrado?.autonomiaLala ?? "confirmar",
          tiposAutomatizados: perfilCalibrado?.tiposAutomatizados || [],
          regrasAprendidasLala: perfilCalibrado?.regrasAprendidasLala || [],
          itensMemoriaViva: perfilCalibrado?.itensMemoriaViva || [],
        },
        primeiroAnexo
      );

      const agoraHora = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const acoesProcessadas = (local.acoesPropostas || []).map(
        (ac: AcaoGovernanta) => {
          const autoParaEsteTipo = deveExecutarAutomaticamente(ac.tipo);
        if (autoParaEsteTipo && !ac.executada) {
          onExecutarAcao(ac, targetId);
          return { ...ac, executada: true, executadaEm: agoraHora };
        }
        return { ...ac, executada: false };
      });

      setInteracoes((prev) =>
        prev.map((item) =>
          item.id === targetId
            ? {
                ...item,
                ...local,
                id: targetId,
                processandoResposta: false,
                dataHora: agoraHora,
                acoesPropostas: acoesProcessadas,
              }
            : item
        )
      );
      setProcessando(false);
      setEnvioEmAndamento(null);
      showToast("Análise concluída com sucesso!");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      interacoes,
      perfilCalibrado,
      prontidaoScore,
      checkin,
      dinheiroLivreHoje,
      petsPerfil,
      tarefas,
      disciplinas,
      projetos,
      contas,
      cartoes,
      lancamentos,
      tom,
      onExecutarAcao,
      showToast,
    ]
  );

  const cancelarInteracao = useCallback(
    (interacaoId?: number) => {
      setInteracoes((prev) =>
        prev.map((item) =>
          interacaoId === undefined || item.id === interacaoId
            ? {
                ...item,
                processandoResposta: false,
                respostaLala: item.processandoResposta
                  ? "Análise cancelada. Pode me mandar outra mensagem ou reenviar o arquivo quando quiser!"
                  : item.respostaLala,
              }
            : item
        )
      );
      setProcessando(false);
      setEnvioEmAndamento(null);
      showToast("Chat liberado.");
    },
    [setInteracoes, showToast]
  );

  // Se uma mensagem ficou com processandoResposta: true (ex: página recarregou durante análise ou travou desde mais cedo), retoma ou auto-conclui!
  const retomouPendenteRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (processando) return;
    const pendente = interacoes.find(
      (it) => it.processandoResposta === true
    );
    if (!pendente) return;

    if (!retomouPendenteRef.current.has(pendente.id)) {
      retomouPendenteRef.current.add(pendente.id);
      // Se a mensagem foi enviada há mais de 10 segundos (ex: o usuário recarregou ou estava travada desde mais cedo), conclui direto!
      const eraDeMaisCedo = Date.now() - pendente.id > 10000;
      if (eraDeMaisCedo) {
        forcarConclusaoInteracao(pendente.id);
        return;
      }
      const anx =
        pendente.anexos && pendente.anexos.length > 0
          ? pendente.anexos
          : pendente.anexo
          ? [pendente.anexo]
          : [];
      enviarMensagemParaLala(
        pendente.mensagemUsuario,
        anx,
        false,
        pendente.id
      );
    } else {
      // Já tentou retomar e continuou pendente: conclui localmente após 3 segundos
      const timer = window.setTimeout(() => {
        forcarConclusaoInteracao(pendente.id);
      }, 3000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interacoes, processando, forcarConclusaoInteracao]);

  // Combina ações pendentes no chat + histórico de ações executadas/editadas/desfeitas
  const itensHistoricoUnificado = useMemo(() => {
    const idsNoHistorico = new Set(historicoAcoesLala.map((h) => h.acaoId));
    const pendentesComoHistorico: RegistroHistoricoAcaoLala[] =
      acoesPendentesConfirmacao
        .filter((p) => !idsNoHistorico.has(p.acao.id))
        .map((p) => ({
          id: `pend-${p.acao.id}`,
          acaoId: p.acao.id,
          interacaoId: p.interacaoId,
          dataHora: p.dataHora,
          acao: p.acao,
          desfeita: false,
          editadaPeloUsuario: false,
          snapshotAntes: {},
        }));

    const todos = [...pendentesComoHistorico, ...historicoAcoesLala];

    return todos.filter((item) => {
      if (filtroHistorico === "pendentes") {
        if (item.acao.executada || item.acao.recusada || item.desfeita)
          return false;
      } else if (filtroHistorico === "aplicadas") {
        if (!item.acao.executada || item.desfeita) return false;
      } else if (filtroHistorico === "editadas") {
        if (!item.editadaPeloUsuario && !item.acao.editadaPeloUsuario)
          return false;
      } else if (filtroHistorico === "desfeitas") {
        if (!item.desfeita && !item.acao.desfeita) return false;
      }

      if (buscaHistorico.trim()) {
        const q = buscaHistorico.toLowerCase();
        const matchTitulo = item.acao.titulo.toLowerCase().includes(q);
        const matchDetalhe = item.acao.detalhe.toLowerCase().includes(q);
        const matchTipo = getNomeAmigavelTipoAcao(item.acao.tipo)
          .toLowerCase()
          .includes(q);
        const matchNota = (item.notaAprendizado || "")
          .toLowerCase()
          .includes(q);
        return matchTitulo || matchDetalhe || matchTipo || matchNota;
      }

      return true;
    });
  }, [
    historicoAcoesLala,
    acoesPendentesConfirmacao,
    filtroHistorico,
    buscaHistorico,
  ]);

  const adicionarRegraManual = () => {
    const limpa = novaRegraInput.trim();
    if (!limpa || !setPerfilCalibrado) return;
    setPerfilCalibrado((prev) => ({
      ...prev,
      regrasAprendidasLala: [limpa, ...(prev.regrasAprendidasLala || [])],
    }));
    setNovaRegraInput("");
    showToast("🧠 Nova regra de aprendizado adicionada à memória da Lala!");
  };

  const salvarEdicaoRegra = (idx: number) => {
    const limpa = editandoRegraTexto.trim();
    if (!limpa || !setPerfilCalibrado) return;
    setPerfilCalibrado((prev) => {
      const lista = [...(prev.regrasAprendidasLala || [])];
      lista[idx] = limpa;
      return { ...prev, regrasAprendidasLala: lista };
    });
    setEditandoRegraIdx(null);
    setEditandoRegraTexto("");
    showToast("Regra atualizada!");
  };

  const removerRegraAprendida = (idx: number) => {
    if (!setPerfilCalibrado) return;
    setPerfilCalibrado((prev) => ({
      ...prev,
      regrasAprendidasLala: (prev.regrasAprendidasLala || []).filter(
        (_, i) => i !== idx
      ),
    }));
    showToast("Regra removida da memória da Lala.");
  };

  const renderMatrizComparativa = (matriz: MatrizDecisaoLala) => {
    if (!matriz.opcaoA || !matriz.opcaoB) {
      return (
        <div
          className="mt-3 p-3.5 rounded-2xl border space-y-2"
          style={{ backgroundColor: t.bg, borderColor: t.border }}
        >
          {matriz.cenarioA && (
            <p className="text-xs" style={{ color: t.text }}>
              <strong>Cenário A:</strong> {matriz.cenarioA}
            </p>
          )}
          {matriz.cenarioB && (
            <p className="text-xs" style={{ color: t.text }}>
              <strong>Cenário B:</strong> {matriz.cenarioB}
            </p>
          )}
          <p className="text-xs font-medium" style={{ color: t.text }}>
            <strong style={{ color: t.primary }}>Veredito:</strong>{" "}
            {matriz.vereditoLala}
          </p>
        </div>
      );
    }

    return (
      <div
        className="mt-3 p-3.5 rounded-2xl border space-y-2.5"
        style={{ backgroundColor: t.bg, borderColor: t.border }}
      >
        <div className="flex items-center gap-2">
          <Scale size={14} style={{ color: t.action }} />
          <span className="text-xs font-bold" style={{ color: t.text }}>
            {matriz.dilema}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[matriz.opcaoA, matriz.opcaoB].map((op, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl border space-y-1"
              style={{ backgroundColor: t.card, borderColor: t.border }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: t.text }}>
                  {op.nome}
                </span>
                <span
                  className="text-[10px] font-mono-num font-bold px-1.5 py-0.5 rounded-md text-white"
                  style={{ backgroundColor: idx === 0 ? t.primary : t.action }}
                >
                  {op.scoreFinal}/10
                </span>
              </div>
              <p className="text-[11px]" style={{ color: t.primary }}>
                + {op.pontosFortes.join(" · ")}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs font-medium" style={{ color: t.text }}>
          <strong style={{ color: t.primary }}>Veredito:</strong>{" "}
          {matriz.vereditoLala}
        </p>
      </div>
    );
  };

  const modoAutonomiaAtual = perfilCalibrado?.autonomiaLala ?? "confirmar";
  const tiposAutomatizadosAtuais = perfilCalibrado?.tiposAutomatizados || [];
  const contagensConfirmacao =
    perfilCalibrado?.contagemConfirmacoesPorTipo || {};
  const regrasAprendidas = perfilCalibrado?.regrasAprendidasLala || [];

  return (
    <div
      className="flex flex-col h-[calc(100vh-130px)] min-h-[560px] max-h-[860px] rounded-3xl border overflow-hidden shadow-sm"
      style={{ backgroundColor: t.card, borderColor: t.border }}
    >
      {/* CABEÇALHO REFINADO DA LALA */}
      <div
        className="px-4 sm:px-5 pt-3.5 pb-2.5 border-b space-y-2.5 shrink-0"
        style={{
          background: `linear-gradient(180deg, ${t.card} 0%, ${t.bg} 100%)`,
          borderColor: t.border,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${t.primary}, ${t.action})`,
                }}
              >
                <Sparkles size={18} />
              </div>
              <span
                className="w-3 h-3 rounded-full border-2 absolute -bottom-0.5 -right-0.5"
                style={{ backgroundColor: "#10B981", borderColor: t.card }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className="text-sm sm:text-base font-bold truncate"
                  style={{ color: t.text }}
                >
                  Governanta Lala
                </h2>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    backgroundColor:
                      modoAutonomiaAtual === "confirmar"
                        ? `${t.alert}18`
                        : `${t.primary}18`,
                    color:
                      modoAutonomiaAtual === "confirmar" ? t.alert : t.primary,
                  }}
                >
                  {modoAutonomiaAtual === "confirmar" ? (
                    <>
                      <ShieldAlert size={11} />
                      <span>
                        Modo Confirmação & Aprendizado
                        {tiposAutomatizadosAtuais.length > 0
                          ? ` (${tiposAutomatizadosAtuais.length} auto)`
                          : ""}
                      </span>
                    </>
                  ) : (
                    <>
                      <Zap size={11} />
                      <span>Modo Automático Ativo</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-[11px] truncate" style={{ color: t.textSoft }}>
                Todas as ações têm confirmação, edição para ensinar a Lala e botão de desfazer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Seletor de Tom */}
            <select
              value={tom}
              onChange={(e) => setTom(e.target.value as TomGovernanta)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border outline-none cursor-pointer hidden sm:block"
              style={{
                backgroundColor: t.card,
                color: t.text,
                borderColor: t.border,
              }}
              title="Personalidade da Lala"
            >
              <option value="equilibrada">Tom: Equilibrada</option>
              <option value="acolhedora">Tom: Acolhedora</option>
              <option value="executiva">Tom: Executiva</option>
              <option value="treinadora">Tom: Treinadora</option>
            </select>

            {/* Toggle Voz */}
            <button
              type="button"
              onClick={toggleVozAutomatica}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-all"
              style={{
                backgroundColor: vozAutomaticaLala ? `${t.primary}18` : t.card,
                color: vozAutomaticaLala ? t.primary : t.textSoft,
                borderColor: vozAutomaticaLala ? t.primary : t.border,
              }}
              title="Ativar/desativar resposta falada da Lala"
            >
              {vozAutomaticaLala ? (
                <Volume2 size={14} />
              ) : (
                <VolumeX size={14} />
              )}
              <span className="hidden md:inline">
                {vozAutomaticaLala ? "Voz ON" : "Mudo"}
              </span>
            </button>

            {/* Botão Editar Dados do Perfil */}
            {perfilCalibrado && setPerfilCalibrado && (
              <button
                type="button"
                onClick={() => setPainelPerfilAberto((v) => !v)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-all"
                style={{
                  backgroundColor: painelPerfilAberto ? t.action : t.card,
                  color: painelPerfilAberto ? "#fff" : t.text,
                  borderColor: painelPerfilAberto ? t.action : t.border,
                }}
                title="Editar suas informações básicas e preferências"
              >
                <UserCog size={14} />
                <span className="hidden md:inline">Meus Dados</span>
              </button>
            )}

            {(interacoes.length > 1 ||
              (interacoes.length === 1 && interacoes[0]?.id !== 1)) &&
              subAba === "chat" && (
                <button
                  type="button"
                  onClick={() => {
                    // 1. Antes de limpar o chat, extrai e salva todas as informações, aprendizados, regras e saldos na Memória Viva!
                    const consolidado = consolidarMemoriaAntesDeLimparChat(
                      interacoes,
                      perfilCalibrado
                    );
                    const agoraTs = Date.now();
                    if (setPerfilCalibrado) {
                      setPerfilCalibrado((prev) => ({
                        ...prev,
                        itensMemoriaViva:
                          consolidado.itensMemoriaVivaAtualizados,
                        regrasAprendidasLala:
                          consolidado.regrasAprendidasAtualizadas,
                        ultimaLimpezaChatEm: agoraTs,
                      }));
                    }

                    // 2. Limpa apenas os balões antigos da tela de chat, mantendo um card inicial limpo e confirmando que a memória continua guardada
                    const agoraHora = new Date().toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    setInteracoes([
                      {
                        id: 1,
                        dataHora: agoraHora,
                        modo: "informacao",
                        tituloCard: "Bate-Papo com a Lala",
                        tags: ["Memória Preservada", "Governanta"],
                        mensagemUsuario: "Oi Lala!",
                        respostaLala:
                          "Limpei o histórico visual do nosso bate-papo para deixar a tela organizada, mas fique tranquila: todas as suas informações importantes, preferências, regras e aprendizados continuam 100% guardados na minha Memória Viva! Como posso te ajudar agora?",
                        guardadoNoCofre: true,
                        acoesPropostas: [],
                      },
                    ]);
                    showToast(
                      "Chat limpo! As memórias e informações importantes da Lala foram preservadas."
                    );
                  }}
                  className="px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: t.card,
                    color: t.textSoft,
                    borderColor: t.border,
                  }}
                  title="Limpar mensagens do chat mantendo todas as memórias e informações aprendidas pela Lala"
                >
                  <Trash2 size={13} />
                  <span className="hidden sm:inline">Limpar Chat</span>
                </button>
              )}
          </div>
        </div>

        {/* SUB-NAVEGAÇÃO DA LALA: BATE-PAPO | HISTÓRICO DE AÇÕES (EDITAR/DESFAZER) | APRENDIZADO & AUTOMAÇÕES */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5">
          <button
            type="button"
            onClick={() => setSubAba("chat")}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-all shrink-0"
            style={{
              backgroundColor: subAba === "chat" ? t.primary : t.card,
              color: subAba === "chat" ? "#fff" : t.text,
              borderColor: subAba === "chat" ? t.primary : t.border,
            }}
          >
            <MessageSquare size={13} />
            <span>Bate-Papo</span>
            {acoesPendentesConfirmacao.length > 0 && (
              <span
                className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold"
                style={{
                  backgroundColor:
                    subAba === "chat" ? "#ffffff" : `${t.alert}25`,
                  color: subAba === "chat" ? t.primary : t.alert,
                }}
              >
                {acoesPendentesConfirmacao.length} pendente
                {acoesPendentesConfirmacao.length > 1 ? "s" : ""}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubAba("historico")}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-all shrink-0"
            style={{
              backgroundColor: subAba === "historico" ? t.primary : t.card,
              color: subAba === "historico" ? "#fff" : t.text,
              borderColor: subAba === "historico" ? t.primary : t.border,
            }}
          >
            <History size={13} />
            <span>Histórico de Ações (Editar / Desfazer)</span>
            <span
              className="px-1.5 py-0.2 rounded-full text-[10px] font-mono-num font-bold"
              style={{
                backgroundColor:
                  subAba === "historico" ? "rgba(255,255,255,0.22)" : t.cardSubtle,
                color: subAba === "historico" ? "#fff" : t.textSoft,
              }}
            >
              {historicoAcoesLala.length + acoesPendentesConfirmacao.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubAba("aprendizado")}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-all shrink-0"
            style={{
              backgroundColor: subAba === "aprendizado" ? t.primary : t.card,
              color: subAba === "aprendizado" ? "#fff" : t.text,
              borderColor: subAba === "aprendizado" ? t.primary : t.border,
            }}
          >
            <Brain size={13} />
            <span>Confirmações & Automações</span>
            {(regrasAprendidas.length > 0 ||
              tiposAutomatizadosAtuais.length > 0) && (
              <span
                className="px-1.5 py-0.2 rounded-full text-[10px] font-mono-num font-bold"
                style={{
                  backgroundColor:
                    subAba === "aprendizado"
                      ? "rgba(255,255,255,0.22)"
                      : `${t.primary}18`,
                  color: subAba === "aprendizado" ? "#fff" : t.primary,
                }}
              >
                {regrasAprendidas.length + tiposAutomatizadosAtuais.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* PAINEL INLINE EDITÁVEL: MEUS DADOS & MEMÓRIA DA LALA */}
      {painelPerfilAberto && perfilCalibrado && setPerfilCalibrado && (
        <div
          className="px-4 sm:px-5 py-3.5 border-b space-y-3 shrink-0 animate-fade-in"
          style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold" style={{ color: t.text }}>
                Suas Informações Básicas & Preferências (100% Editáveis)
              </h3>
              <p className="text-[11px]" style={{ color: t.textSoft }}>
                Altere aqui ou simplesmente diga no chat para a Lala atualizar para você
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPerfilCalibrado((prev) => ({ ...prev, calibrado: true }));
                setPainelPerfilAberto(false);
                showToast("Informações do perfil salvas!");
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
              style={{ backgroundColor: t.primary }}
            >
              <Check size={13} /> Concluir
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div>
              <label
                className="text-[10px] font-bold uppercase block mb-1"
                style={{ color: t.textSoft }}
              >
                Seu Nome
              </label>
              <input
                value={perfilCalibrado.nomeUsuario}
                onChange={(e) =>
                  setPerfilCalibrado((prev) => ({
                    ...prev,
                    nomeUsuario: e.target.value,
                    calibrado: true,
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-xl text-xs border outline-none"
                style={{
                  backgroundColor: t.card,
                  color: t.text,
                  borderColor: t.border,
                }}
              />
            </div>
            <div>
              <label
                className="text-[10px] font-bold uppercase block mb-1"
                style={{ color: t.textSoft }}
              >
                Curso / Universidade
              </label>
              <input
                value={perfilCalibrado.cursoUERJ}
                onChange={(e) =>
                  setPerfilCalibrado((prev) => ({
                    ...prev,
                    cursoUERJ: e.target.value,
                    calibrado: true,
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-xl text-xs border outline-none"
                style={{
                  backgroundColor: t.card,
                  color: t.text,
                  borderColor: t.border,
                }}
              />
            </div>
            <div>
              <label
                className="text-[10px] font-bold uppercase block mb-1"
                style={{ color: t.textSoft }}
              >
                Período / Semestre
              </label>
              <input
                value={perfilCalibrado.periodoUERJ}
                onChange={(e) =>
                  setPerfilCalibrado((prev) => ({
                    ...prev,
                    periodoUERJ: e.target.value,
                    calibrado: true,
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-xl text-xs border outline-none"
                style={{
                  backgroundColor: t.card,
                  color: t.text,
                  borderColor: t.border,
                }}
              />
            </div>
            <div>
              <label
                className="text-[10px] font-bold uppercase block mb-1"
                style={{ color: t.textSoft }}
              >
                Frentes de Trabalho
              </label>
              <input
                value={perfilCalibrado.frentesTrabalho}
                onChange={(e) =>
                  setPerfilCalibrado((prev) => ({
                    ...prev,
                    frentesTrabalho: e.target.value,
                    calibrado: true,
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-xl text-xs border outline-none"
                style={{
                  backgroundColor: t.card,
                  color: t.text,
                  borderColor: t.border,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            <div>
              <label
                className="text-[10px] font-bold uppercase block mb-1"
                style={{ color: t.textSoft }}
              >
                Meta Sono (h)
              </label>
              <input
                type="number"
                step="0.5"
                value={perfilCalibrado.metaHorasSono}
                onChange={(e) =>
                  setPerfilCalibrado((prev) => ({
                    ...prev,
                    metaHorasSono: Number(e.target.value) || 7.5,
                    calibrado: true,
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-xl text-xs font-mono-num border outline-none"
                style={{
                  backgroundColor: t.card,
                  color: t.text,
                  borderColor: t.border,
                }}
              />
            </div>
            <div>
              <label
                className="text-[10px] font-bold uppercase block mb-1"
                style={{ color: t.textSoft }}
              >
                Meta Proteína (g)
              </label>
              <input
                type="number"
                value={perfilCalibrado.metaProteinaG}
                onChange={(e) =>
                  setPerfilCalibrado((prev) => ({
                    ...prev,
                    metaProteinaG: Number(e.target.value) || 135,
                    calibrado: true,
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-xl text-xs font-mono-num border outline-none"
                style={{
                  backgroundColor: t.card,
                  color: t.text,
                  borderColor: t.border,
                }}
              />
            </div>
            <div>
              <label
                className="text-[10px] font-bold uppercase block mb-1"
                style={{ color: t.textSoft }}
              >
                Meta Calorias (kcal)
              </label>
              <input
                type="number"
                value={perfilCalibrado.metaKcal}
                onChange={(e) =>
                  setPerfilCalibrado((prev) => ({
                    ...prev,
                    metaKcal: Number(e.target.value) || 2150,
                    calibrado: true,
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-xl text-xs font-mono-num border outline-none"
                style={{
                  backgroundColor: t.card,
                  color: t.text,
                  borderColor: t.border,
                }}
              />
            </div>
            <div className="col-span-3 sm:col-span-1">
              <label
                className="text-[10px] font-bold uppercase block mb-1"
                style={{ color: t.textSoft }}
              >
                Modo Padrão da Lala
              </label>
              <select
                value={perfilCalibrado.autonomiaLala || "confirmar"}
                onChange={(e) =>
                  setPerfilCalibrado((prev) => ({
                    ...prev,
                    autonomiaLala: e.target.value as "auto" | "confirmar",
                    calibrado: true,
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-xl text-xs border outline-none"
                style={{
                  backgroundColor: t.card,
                  color: t.text,
                  borderColor: t.border,
                }}
              >
                <option value="confirmar">
                  Pedir confirmação (Aprendendo)
                </option>
                <option value="auto">Aplicar tudo automático</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ==================== VISÃO 1: BATE-PAPO COM A LALA ==================== */}
      {subAba === "chat" && (
        <>
          {/* Faixa rápida de ações aguardando confirmação, se houver (Limpar oculta apenas a notificação sem dispensar a ação!) */}
          {acoesPendentesVisiveisNoAviso.length > 0 && (
            <div
              className="px-4 py-2 border-b flex items-center justify-between gap-2 shrink-0"
              style={{
                backgroundColor: `${t.alert}14`,
                borderColor: `${t.alert}40`,
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert
                  size={14}
                  className="shrink-0"
                  style={{ color: t.alert }}
                />
                <span
                  className="text-xs font-bold truncate"
                  style={{ color: t.text }}
                >
                  Você tem {acoesPendentesVisiveisNoAviso.length} ação(ões) da Lala aguardando sua revisão ou confirmação
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const novosIds = Array.from(
                      new Set([
                        ...idsPendentesAvisoOculto,
                        ...acoesPendentesVisiveisNoAviso.map((a) => a.acao.id),
                      ])
                    );
                    setIdsPendentesAvisoOculto(novosIds);
                    try {
                      localStorage.setItem(
                        "casa_lala_aviso_pendentes_ocultos",
                        JSON.stringify(novosIds)
                      );
                    } catch {
                      // ignore
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer hover:opacity-85 transition-opacity"
                  style={{
                    backgroundColor: t.card,
                    color: t.textSoft,
                    borderColor: t.border,
                  }}
                  title="Ocultar apenas esta faixa de aviso (as ações continuam salvas no chat e em Pendentes)"
                >
                  Limpar aviso
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubAba("historico");
                    setFiltroHistorico("pendentes");
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
                  style={{
                    backgroundColor: t.alert,
                    color: "#fff",
                  }}
                >
                  Ver Pendentes
                </button>
              </div>
            </div>
          )}

          {/* FAIXA DE RESGATE SE HOUVER ANÁLISE TRAVADA OU EM PROCESSAMENTO */}
          {(processando || interacoes.some((it) => it.processandoResposta === true)) && (
            <div
              className="px-4 py-2 border-b flex items-center justify-between gap-2 shrink-0 animate-in fade-in"
              style={{
                backgroundColor: `${t.primary}15`,
                borderColor: `${t.primary}40`,
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles
                  size={14}
                  className="animate-spin shrink-0"
                  style={{ color: t.primary }}
                />
                <span
                  className="text-xs font-bold truncate"
                  style={{ color: t.text }}
                >
                  Lala está processando uma mensagem ou arquivo. Demorando?
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => forcarConclusaoInteracao()}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer shadow-2xs hover:opacity-90"
                  style={{ backgroundColor: t.primary }}
                  title="Concluir imediatamente e gerar as ações"
                >
                  <Zap size={11} /> Concluir Agora
                </button>
                <button
                  type="button"
                  onClick={() => cancelarInteracao()}
                  className="px-2 py-1 rounded-lg text-[11px] font-medium border cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: t.card,
                    color: t.textSoft,
                    borderColor: t.border,
                  }}
                  title="Cancelar e liberar o chat"
                >
                  Liberar Chat
                </button>
              </div>
            </div>
          )}

          <div
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5"
            style={{ backgroundColor: t.bg }}
          >
            {interacoesCronologicas.map((it) => {
              const listaAnexosMsg =
                it.anexos && it.anexos.length > 0
                  ? it.anexos
                  : it.anexo
                  ? [it.anexo]
                  : [];

              const qtdPendentesCard = (it.acoesPropostas || []).filter(
                (a) => !a.executada && !a.recusada && !a.desfeita
              ).length;

              return (
                <div key={it.id} className="space-y-3">
                  {/* Balão do Usuário (Direita) */}
                  <div className="flex justify-end">
                    <div
                      className="max-w-[85%] sm:max-w-[72%] rounded-3xl rounded-tr-md px-4 py-3 text-white shadow-xs space-y-2.5"
                      style={{
                        background: `linear-gradient(135deg, ${t.primary} 0%, ${t.primary}E6 100%)`,
                      }}
                    >
                      {listaAnexosMsg.length > 0 && (
                        <div
                          className={`grid gap-2 ${
                            listaAnexosMsg.length > 1
                              ? "grid-cols-2"
                              : "grid-cols-1"
                          }`}
                        >
                          {listaAnexosMsg.map((anx, idx) =>
                            anx.mimeType.startsWith("image/") && anx.base64 ? (
                              <img
                                key={idx}
                                src={
                                  anx.base64.startsWith("data:")
                                    ? anx.base64
                                    : `data:${anx.mimeType};base64,${anx.base64}`
                                }
                                alt={anx.nome}
                                className="max-h-52 w-full rounded-2xl object-cover border border-white/20"
                              />
                            ) : (
                              <div
                                key={idx}
                                className="px-3 py-2 rounded-xl bg-black/20 text-[11px] flex items-center gap-2 truncate"
                              >
                                <FileText size={13} />
                                <span className="truncate">{anx.nome}</span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                        {it.mensagemUsuario}
                      </p>
                      <span className="block text-[10px] text-white/75 text-right font-mono-num">
                        {it.dataHora}
                      </span>
                    </div>
                  </div>

                  {/* Balão da Lala (Esquerda) + Cards Interativos de Ação */}
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div
                      className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 text-white mt-0.5 shadow-2xs"
                      style={{
                        background: `linear-gradient(135deg, ${t.primary}, ${t.action})`,
                      }}
                    >
                      <Sparkles
                        size={14}
                        className={it.processandoResposta ? "animate-spin" : ""}
                      />
                    </div>

                    <div className="max-w-[94%] sm:max-w-[85%] space-y-2.5 flex-1">
                      {/* Texto conversacional da Lala */}
                      <div
                        className="rounded-3xl rounded-tl-md p-4 border shadow-xs space-y-2.5"
                        style={{
                          backgroundColor: t.card,
                          borderColor: it.processandoResposta ? t.primary : t.border,
                        }}
                      >
                        <p
                          className={`text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                            it.processandoResposta ? "animate-pulse font-medium" : ""
                          }`}
                          style={{
                            color: it.processandoResposta ? t.primary : t.text,
                          }}
                        >
                          {it.respostaLala}
                        </p>

                        {it.processandoResposta && (
                          <div
                            className="mt-2.5 p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in"
                            style={{
                              backgroundColor: `${t.primary}12`,
                              borderColor: `${t.primary}30`,
                            }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Sparkles
                                size={14}
                                className="animate-spin shrink-0"
                                style={{ color: t.primary }}
                              />
                              <span
                                className="text-xs font-semibold"
                                style={{ color: t.text }}
                              >
                                Lendo seu arquivo... Demorando?
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => forcarConclusaoInteracao(it.id)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-xs hover:opacity-90"
                                style={{ backgroundColor: t.primary }}
                                title="Concluir análise imediatamente e montar as ações"
                              >
                                <Zap size={13} />
                                <span>Concluir Agora</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => cancelarInteracao(it.id)}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-medium border cursor-pointer hover:opacity-80"
                                style={{
                                  backgroundColor: t.card,
                                  color: t.textSoft,
                                  borderColor: t.border,
                                }}
                                title="Cancelar e liberar o chat"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                        {it.matrizDecisao &&
                          renderMatrizComparativa(it.matrizDecisao)}

                        {/* Rodapé do balão: Ouvir resposta + Reanalisar + Horário */}
                        {!it.processandoResposta && (
                          <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  reproduzirFalaDaLala(it.id, it.respostaLala)
                                }
                                className="px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                                style={{
                                  backgroundColor:
                                    idFalandoAgora === it.id
                                      ? t.action
                                      : carregandoVozId === it.id
                                      ? `${t.primary}20`
                                      : t.cardSubtle,
                                  color:
                                    idFalandoAgora === it.id ? "#fff" : t.textSoft,
                                }}
                              >
                                {idFalandoAgora === it.id ? (
                                  <>
                                    <Square size={10} fill="#fff" />
                                    <span>Parar voz</span>
                                  </>
                                ) : carregandoVozId === it.id ? (
                                  <>
                                    <Volume2 size={12} className="animate-pulse" />
                                    <span>Gerando voz...</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 size={12} />
                                    <span>Ouvir</span>
                                  </>
                                )}
                              </button>

                              {it.id !== 1 && (
                                <button
                                  type="button"
                                  disabled={processando}
                                  onClick={() => {
                                    const anexosParaReenviar =
                                      it.anexos && it.anexos.length > 0
                                        ? it.anexos
                                        : it.anexo
                                        ? [it.anexo]
                                        : [];
                                    enviarMensagemParaLala(
                                      it.mensagemUsuario,
                                      anexosParaReenviar,
                                      false,
                                      it.id
                                    );
                                  }}
                                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all hover:opacity-85"
                                  style={{
                                    backgroundColor: `${t.primary}15`,
                                    color: t.primary,
                                  }}
                                  title="Pedir para a Lala ler e analisar novamente esta mensagem e os prints anexados"
                                >
                                  <RotateCcw size={11} />
                                  <span>Reanalisar</span>
                                </button>
                              )}
                            </div>

                            <span
                              className="text-[10px] font-mono-num"
                              style={{ color: t.textSoft }}
                            >
                              Lala · {it.dataHora}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* DESTAQUE VISUAL DE AÇÕES DA LALA (CONFIRMAR, EDITAR OU DESFAZER) */}
                      {it.acoesPropostas && it.acoesPropostas.length > 0 && (
                        <div className="space-y-2 pl-0.5">
                          <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    qtdPendentesCard > 0 ? t.alert : t.primary,
                                }}
                              />
                              <span
                                className="text-[10px] font-extrabold uppercase tracking-wider"
                                style={{ color: t.textSoft }}
                              >
                                {qtdPendentesCard > 0
                                  ? `Ações propostas pela Lala (${qtdPendentesCard} aguardando sua confirmação)`
                                  : `Ações desta conversa (${it.acoesPropostas.length})`}
                              </span>
                            </div>

                            {qtdPendentesCard > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  it.acoesPropostas?.forEach((ac) => {
                                    if (
                                      !ac.executada &&
                                      !ac.recusada &&
                                      !ac.desfeita
                                    ) {
                                      onExecutarAcao(ac, it.id);
                                    }
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer"
                                style={{ backgroundColor: t.primary }}
                              >
                                <CheckCircle2 size={11} />
                                Confirmar todas ({qtdPendentesCard})
                              </button>
                            )}
                          </div>

                          <div className="space-y-2.5">
                            {it.acoesPropostas.map((ac) => {
                              const regHist = historicoAcoesLala.find(
                                (h) => h.acaoId === ac.id
                              );
                              const isAuto =
                                modoAutonomiaAtual === "auto" ||
                                tiposAutomatizadosAtuais.includes(ac.tipo);
                              const numConf =
                                contagensConfirmacao[ac.tipo] || 0;

                              return (
                                <LalaAppActionCard
                                  key={ac.id}
                                  t={t}
                                  acao={ac}
                                  dataHora={regHist?.dataHora || it.dataHora}
                                  notaAprendizado={regHist?.notaAprendizado}
                                  tipoAutomatizado={isAuto}
                                  confirmacoesDesteTipo={numConf}
                                  onExecutar={() => onExecutarAcao(ac, it.id)}
                                  onDesfazer={
                                    onDesfazerAcao
                                      ? () => onDesfazerAcao(ac.id)
                                      : undefined
                                  }
                                  onRecusar={
                                    onRecusarAcao
                                      ? () => onRecusarAcao(ac.id, it.id)
                                      : undefined
                                  }
                                  onEditarEExecutar={
                                    onEditarEExecutarAcao
                                      ? (acaoEditada, nota) =>
                                          onEditarEExecutarAcao(
                                            acaoEditada,
                                            nota,
                                            it.id
                                          )
                                      : undefined
                                  }
                                  onToggleAutomacaoTipo={onToggleAutomacaoTipo}
                                  onIrParaModulo={onIrParaAba}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {processando && envioEmAndamento && (
              <div className="space-y-3">
                {envioEmAndamento && (
                  <div className="flex justify-end">
                    <div
                      className="max-w-[85%] sm:max-w-[72%] rounded-3xl rounded-tr-md px-4 py-3 text-white shadow-xs space-y-2.5 opacity-95"
                      style={{
                        background: `linear-gradient(135deg, ${t.primary} 0%, ${t.primary}E6 100%)`,
                      }}
                    >
                      {envioEmAndamento.anexos.length > 0 && (
                        <div
                          className={`grid gap-2 ${
                            envioEmAndamento.anexos.length > 1
                              ? "grid-cols-2"
                              : "grid-cols-1"
                          }`}
                        >
                          {envioEmAndamento.anexos.map((anx, idx) =>
                            anx.mimeType.startsWith("image/") && anx.base64 ? (
                              <img
                                key={idx}
                                src={
                                  anx.base64.startsWith("data:")
                                    ? anx.base64
                                    : `data:${anx.mimeType};base64,${anx.base64}`
                                }
                                alt={anx.nome}
                                className="max-h-52 w-full rounded-2xl object-cover border border-white/20"
                              />
                            ) : (
                              <div
                                key={idx}
                                className="px-3 py-2 rounded-xl bg-black/20 text-[11px] flex items-center gap-2 truncate"
                              >
                                <FileText size={13} />
                                <span className="truncate">{anx.nome}</span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                        {envioEmAndamento.texto}
                      </p>
                      <span className="block text-[10px] text-white/75 text-right font-mono-num">
                        {envioEmAndamento.hora}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2.5">
                  <div
                    className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 text-white"
                    style={{
                      background: `linear-gradient(135deg, ${t.primary}, ${t.action})`,
                    }}
                  >
                    <Sparkles size={14} className="animate-spin" />
                  </div>
                  <div
                    className="rounded-3xl rounded-tl-md px-4 py-3 border text-xs font-medium flex items-center gap-2"
                    style={{
                      backgroundColor: t.card,
                      borderColor: t.border,
                      color: t.textSoft,
                    }}
                  >
                    <MessageSquare size={13} style={{ color: t.primary }} />
                    <span>
                      {envioEmAndamento && envioEmAndamento.anexos.length > 0
                        ? `Lala está lendo seus ${envioEmAndamento.anexos.length} arquivo(s)/print(s) e preparando as ações...`
                        : "Lala está preparando as ações para você revisar..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* BARRA INFERIOR DE MENSAGEM E MULTI-UPLOAD */}
          <div
            className="p-3 sm:p-4 border-t space-y-2.5 shrink-0"
            style={{ backgroundColor: t.card, borderColor: t.border }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.csv,.ofx,.txt,.ics,.json,audio/*"
              onChange={handleSelecionarArquivos}
              className="hidden"
            />

            {anexosAtuais.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {anexosAtuais.map((anx, idx) => (
                  <div
                    key={idx}
                    className="relative group shrink-0 rounded-2xl border p-1.5 flex items-center gap-2"
                    style={{ backgroundColor: t.bg, borderColor: t.primary }}
                  >
                    {anx.mimeType.startsWith("image/") && anx.base64 ? (
                      <img
                        src={
                          anx.base64.startsWith("data:")
                            ? anx.base64
                            : `data:${anx.mimeType};base64,${anx.base64}`
                        }
                        alt={anx.nome}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                          backgroundColor: `${t.primary}15`,
                          color: t.primary,
                        }}
                      >
                        <Paperclip size={16} />
                      </div>
                    )}
                    <div className="max-w-[110px] pr-5">
                      <p
                        className="text-[11px] font-bold truncate"
                        style={{ color: t.text }}
                      >
                        {anx.nome}
                      </p>
                      <p
                        className="text-[10px] font-mono-num"
                        style={{ color: t.textSoft }}
                      >
                        {formatarTamanhoBytes(anx.tamanhoBytes)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setAnexosAtuais((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-black/60 text-white cursor-pointer"
                      title="Remover anexo"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-14 px-3 rounded-2xl border border-dashed flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer"
                  style={{ borderColor: t.primary, color: t.primary }}
                >
                  <Plus size={14} /> + Imagens
                </button>
              </div>
            )}

            {gravando ? (
              <div
                className="p-2.5 rounded-2xl border flex items-center justify-between gap-3"
                style={{
                  backgroundColor: `${t.danger}12`,
                  borderColor: t.danger,
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full animate-ping shrink-0"
                    style={{ backgroundColor: t.danger }}
                  />
                  <span
                    className="text-xs font-mono-num font-bold shrink-0"
                    style={{ color: t.danger }}
                  >
                    {formatarTempoGravacao(segundosGravacao)}
                  </span>
                  <span
                    className="text-xs truncate"
                    style={{ color: t.textSoft }}
                  >
                    {transcricaoAoVivo || "Ouvindo você..."}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={cancelarAudio}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer"
                    style={{
                      backgroundColor: t.card,
                      color: t.textSoft,
                      borderColor: t.border,
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={pararEEnviarAudio}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                    style={{ backgroundColor: t.primary }}
                  >
                    <Send size={13} /> Enviar Áudio
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="rounded-3xl border p-2.5 sm:p-3 space-y-2 shadow-2xs transition-all"
                style={{
                  backgroundColor: t.bg,
                  borderColor:
                    mensagem.trim() || anexosAtuais.length > 0
                      ? t.primary
                      : t.border,
                }}
              >
                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={mensagem}
                  onPaste={handlePaste}
                  onChange={(e) => setMensagem(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter sozinho SEMPRE pula linha (especialmente no celular).
                    // No computador, Ctrl+Enter ou Cmd+Enter envia rapidamente.
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      enviarMensagemParaLala();
                    }
                  }}
                  placeholder={
                    anexosAtuais.length > 0
                      ? `Diga o que a Lala deve fazer com os ${anexosAtuais.length} arquivo(s)...`
                      : "Escreva para a Lala (Enter pula linha · toque em Enviar para mandar)..."
                  }
                  className="w-full px-1.5 py-1 text-sm leading-relaxed outline-none bg-transparent resize-none min-h-[54px] max-h-44 overflow-y-auto"
                  style={{
                    color: t.text,
                  }}
                />

                <div
                  className="flex items-center justify-between gap-2 pt-1.5 border-t"
                  style={{ borderColor: `${t.border}80` }}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer hover:opacity-85 transition-opacity"
                      style={{
                        backgroundColor:
                          anexosAtuais.length > 0 ? `${t.primary}18` : t.card,
                        color: anexosAtuais.length > 0 ? t.primary : t.text,
                        borderColor:
                          anexosAtuais.length > 0 ? t.primary : t.border,
                      }}
                      title="Anexar 1 ou várias imagens, prints de contas, PDFs ou planilhas"
                    >
                      <Paperclip size={15} style={{ color: t.primary }} />
                      <span>Anexar</span>
                    </button>

                    <button
                      type="button"
                      onClick={iniciarGravacaoDeVoz}
                      className="px-3 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer hover:opacity-85 transition-opacity"
                      style={{
                        backgroundColor: t.card,
                        color: t.text,
                        borderColor: t.border,
                      }}
                      title="Gravar áudio para a Lala"
                    >
                      <Mic size={15} style={{ color: t.action }} />
                      <span>Áudio</span>
                    </button>

                    {mensagem.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setMensagem("")}
                        className="px-2.5 py-2 rounded-2xl text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:opacity-80"
                        style={{
                          backgroundColor: t.cardSubtle,
                          color: t.textSoft,
                        }}
                        title="Apagar rascunho da caixa de texto"
                      >
                        <X size={12} />
                        <span>Limpar texto</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="hidden sm:inline text-[10px] font-medium"
                      style={{ color: t.textSoft }}
                    >
                      Enter pula linha
                    </span>
                    <button
                      type="button"
                      disabled={
                        processando ||
                        (!mensagem.trim() && anexosAtuais.length === 0)
                      }
                      onClick={() => enviarMensagemParaLala()}
                      className="px-4 py-2 rounded-2xl text-xs font-bold text-white flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 transition-all shadow-xs"
                      style={{ backgroundColor: t.primary }}
                      title="Enviar mensagem para a Lala"
                    >
                      <span>Enviar</span>
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ==================== VISÃO 2: HISTÓRICO DE AÇÕES DA LALA (EDITAR / DESFAZER) ==================== */}
      {subAba === "historico" && (
        <div
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
          style={{ backgroundColor: t.bg }}
        >
          {/* Cabeçalho e Filtros do Histórico */}
          <div
            className="p-4 rounded-2xl border space-y-3"
            style={{ backgroundColor: t.card, borderColor: t.border }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: t.text }}>
                  <History size={16} style={{ color: t.primary }} />
                  Central de Histórico & Controle de Ações da Lala
                </h3>
                <p className="text-xs" style={{ color: t.textSoft }}>
                  Veja tudo o que a Lala propôs ou alterou no app. Você pode confirmar, editar qualquer detalhe (para ela aprender) ou desfazer a ação restaurando os dados anteriores.
                </p>
              </div>

              <div className="relative min-w-[210px]">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: t.textSoft }}
                />
                <input
                  value={buscaHistorico}
                  onChange={(e) => setBuscaHistorico(e.target.value)}
                  placeholder="Buscar ação, valor ou módulo..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border outline-none"
                  style={{
                    backgroundColor: t.bg,
                    color: t.text,
                    borderColor: t.border,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                {
                  id: "todas",
                  label: `Todas (${
                    historicoAcoesLala.length + acoesPendentesConfirmacao.length
                  })`,
                },
                {
                  id: "pendentes",
                  label: `⏳ Aguardando Confirmação (${acoesPendentesConfirmacao.length})`,
                },
                {
                  id: "aplicadas",
                  label: `✅ Aplicadas (${
                    historicoAcoesLala.filter((h) => !h.desfeita).length
                  })`,
                },
                {
                  id: "editadas",
                  label: `✏️ Editadas por Mim (${
                    historicoAcoesLala.filter((h) => h.editadaPeloUsuario)
                      .length
                  })`,
                },
                {
                  id: "desfeitas",
                  label: `↩️ Desfeitas (${
                    historicoAcoesLala.filter((h) => h.desfeita).length
                  })`,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setFiltroHistorico(
                      tab.id as
                        | "todas"
                        | "pendentes"
                        | "aplicadas"
                        | "editadas"
                        | "desfeitas"
                    )
                  }
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all"
                  style={{
                    backgroundColor:
                      filtroHistorico === tab.id ? t.primary : t.bg,
                    color: filtroHistorico === tab.id ? "#fff" : t.textSoft,
                    borderColor:
                      filtroHistorico === tab.id ? t.primary : t.border,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Cards de Ação no Histórico */}
          {itensHistoricoUnificado.length === 0 ? (
            <div
              className="p-8 rounded-2xl border text-center space-y-2"
              style={{ backgroundColor: t.card, borderColor: t.border }}
            >
              <RotateCcw
                size={28}
                className="mx-auto opacity-50"
                style={{ color: t.primary }}
              />
              <p className="text-sm font-bold" style={{ color: t.text }}>
                Nenhuma ação encontrada neste filtro
              </p>
              <p className="text-xs max-w-md mx-auto" style={{ color: t.textSoft }}>
                Assim que você conversar com a Lala ou enviar prints de contas, agendas ou tarefas, todas as ações propostas e realizadas aparecerão aqui para você editar ou desfazer quando quiser.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {itensHistoricoUnificado.map((item) => {
                const isAuto =
                  modoAutonomiaAtual === "auto" ||
                  tiposAutomatizadosAtuais.includes(item.acao.tipo);
                const numConf = contagensConfirmacao[item.acao.tipo] || 0;

                return (
                  <LalaAppActionCard
                    key={item.id}
                    t={t}
                    acao={item.acao}
                    dataHora={item.dataHora}
                    notaAprendizado={item.notaAprendizado}
                    tipoAutomatizado={isAuto}
                    confirmacoesDesteTipo={numConf}
                    onExecutar={() =>
                      onExecutarAcao(item.acao, item.interacaoId)
                    }
                    onDesfazer={
                      onDesfazerAcao
                        ? () => onDesfazerAcao(item.acaoId)
                        : undefined
                    }
                    onRecusar={
                      onRecusarAcao
                        ? () => onRecusarAcao(item.acaoId, item.interacaoId)
                        : undefined
                    }
                    onEditarEExecutar={
                      onEditarEExecutarAcao
                        ? (acaoEditada, nota) =>
                            onEditarEExecutarAcao(
                              acaoEditada,
                              nota,
                              item.interacaoId
                            )
                        : undefined
                    }
                    onToggleAutomacaoTipo={onToggleAutomacaoTipo}
                    onIrParaModulo={onIrParaAba}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== VISÃO 3: APRENDIZADO & AUTOMAÇÕES PROGRESSIVAS ==================== */}
      {subAba === "aprendizado" && (
        <div
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5"
          style={{ backgroundColor: t.bg }}
        >
          {/* 1. Modo Geral de Confirmação vs Automação */}
          <div
            className="p-4 sm:p-5 rounded-2xl border space-y-3.5"
            style={{ backgroundColor: t.card, borderColor: t.border }}
          >
            <div>
              <h3
                className="text-sm font-bold flex items-center gap-2"
                style={{ color: t.text }}
              >
                <ShieldAlert size={16} style={{ color: t.primary }} />
                Como a Lala deve agir no início vs. no futuro?
              </h3>
              <p className="text-xs mt-0.5" style={{ color: t.textSoft }}>
                De início, mantenha no modo <strong>Pedir Confirmação</strong> para revisar e editar as ações da Lala. Conforme ela for acertando do seu jeito, você pode automatizar processos específicos abaixo!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!setPerfilCalibrado) return;
                  setPerfilCalibrado((prev) => ({
                    ...prev,
                    autonomiaLala: "confirmar",
                  }));
                  showToast(
                    "🛡️ Modo Confirmação ativado: a Lala pedirá sua aprovação antes de alterar o app (exceto nos processos que você automatizar abaixo)."
                  );
                }}
                className="p-3.5 rounded-2xl border-2 text-left space-y-1.5 cursor-pointer transition-all"
                style={{
                  backgroundColor:
                    modoAutonomiaAtual === "confirmar"
                      ? `${t.primary}12`
                      : t.bg,
                  borderColor:
                    modoAutonomiaAtual === "confirmar" ? t.primary : t.border,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-extrabold flex items-center gap-1.5"
                    style={{ color: t.text }}
                  >
                    <ShieldAlert size={14} style={{ color: t.primary }} />
                    Pedir Confirmação (Aprendendo com Você)
                  </span>
                  {modoAutonomiaAtual === "confirmar" && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: t.primary }}
                    >
                      ATIVO
                    </span>
                  )}
                </div>
                <p className="text-[11px]" style={{ color: t.textSoft }}>
                  A Lala prepara o card da ação no chat e aguarda você clicar em <strong>Confirmar</strong> ou <strong>Editar</strong>. Apenas os processos marcados como "Automatizado" na lista abaixo rodam direto.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!setPerfilCalibrado) return;
                  setPerfilCalibrado((prev) => ({
                    ...prev,
                    autonomiaLala: "auto",
                  }));
                  showToast(
                    "⚡ Modo Automático Total ativado: a Lala aplicará tudo imediatamente (você ainda pode editar ou desfazer no Histórico)."
                  );
                }}
                className="p-3.5 rounded-2xl border-2 text-left space-y-1.5 cursor-pointer transition-all"
                style={{
                  backgroundColor:
                    modoAutonomiaAtual === "auto" ? `${t.action}12` : t.bg,
                  borderColor:
                    modoAutonomiaAtual === "auto" ? t.action : t.border,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-extrabold flex items-center gap-1.5"
                    style={{ color: t.text }}
                  >
                    <Zap size={14} style={{ color: t.action }} />
                    Automático Total (Executar Tudo Direto)
                  </span>
                  {modoAutonomiaAtual === "auto" && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: t.action }}
                    >
                      ATIVO
                    </span>
                  )}
                </div>
                <p className="text-[11px]" style={{ color: t.textSoft }}>
                  A Lala executa todas as alterações direto no app sem perguntar antes. Você continua podendo revisar, editar ou desfazer tudo no Histórico.
                </p>
              </button>
            </div>
          </div>

          {/* 2. Memória Viva da Lala em 5 Dimensões (Contexto, Ações, Decisões, Rotina e Forma de Uso) */}
          <div
            className="p-4 sm:p-5 rounded-2xl border space-y-4"
            style={{ backgroundColor: t.card, borderColor: t.border }}
          >
            <div>
              <h3
                className="text-sm font-bold flex items-center gap-2"
                style={{ color: t.text }}
              >
                <Brain size={16} style={{ color: t.primary }} />
                Memória Viva da Lala — O que ela aprende sobre você (
                {(perfilCalibrado?.itensMemoriaViva || []).length})
              </h3>
              <p className="text-xs mt-0.5" style={{ color: t.textSoft }}>
                A Lala absorve automaticamente seu <strong>Contexto</strong>,{" "}
                <strong>Suas Ações</strong>, <strong>Decisões</strong>,{" "}
                <strong>Rotina</strong> e a <strong>Forma como você usa ela</strong>{" "}
                a cada conversa e a cada ação confirmada ou editada.
              </p>
            </div>

            {/* Filtros das 5 dimensões */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { id: "todas", label: "Todas as Dimensões" },
                  { id: "contexto", label: "1. Contexto" },
                  { id: "acao_usuario", label: "2. Suas Ações" },
                  { id: "decisao", label: "3. Decisões" },
                  { id: "rotina", label: "4. Sua Rotina" },
                  { id: "forma_de_uso", label: "5. Forma de Uso" },
                ] as {
                  id: "todas" | CategoriaAprendizadoLala;
                  label: string;
                }[]
              ).map((cat) => {
                const ativo = filtroCategoriaMemoria === cat.id;
                const qtd =
                  cat.id === "todas"
                    ? (perfilCalibrado?.itensMemoriaViva || []).length
                    : (perfilCalibrado?.itensMemoriaViva || []).filter(
                        (m) => m.categoria === cat.id
                      ).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFiltroCategoriaMemoria(cat.id)}
                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer transition-all flex items-center gap-1.5"
                    style={{
                      backgroundColor: ativo ? t.primary : t.bg,
                      color: ativo ? "#fff" : t.textSoft,
                      borderColor: ativo ? t.primary : t.border,
                    }}
                  >
                    <span>{cat.label}</span>
                    <span
                      className="px-1.5 py-0.2 rounded-full text-[10px] font-mono-num"
                      style={{
                        backgroundColor: ativo
                          ? "rgba(255,255,255,0.22)"
                          : t.cardSubtle,
                        color: ativo ? "#fff" : t.textSoft,
                      }}
                    >
                      {qtd}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Ensinar novo aprendizado diretamente em qualquer uma das 5 dimensões */}
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={novaMemoriaCategoria}
                onChange={(e) =>
                  setNovaMemoriaCategoria(
                    e.target.value as CategoriaAprendizadoLala
                  )
                }
                className="px-3 py-2 rounded-xl text-xs font-bold border outline-none"
                style={{
                  backgroundColor: t.bg,
                  color: t.text,
                  borderColor: t.border,
                }}
              >
                <option value="contexto">Contexto</option>
                <option value="acao_usuario">Suas Ações</option>
                <option value="decisao">Decisões</option>
                <option value="rotina">Sua Rotina</option>
                <option value="forma_de_uso">Forma de Uso</option>
              </select>
              <input
                value={novaMemoriaTexto}
                onChange={(e) => setNovaMemoriaTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const limpo = novaMemoriaTexto.trim();
                    if (!limpo || !setPerfilCalibrado) return;
                    const agoraHora = new Date().toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    setPerfilCalibrado((prev) => ({
                      ...prev,
                      itensMemoriaViva: [
                        {
                          id: `mem-man-${Date.now()}`,
                          categoria: novaMemoriaCategoria,
                          texto: limpo,
                          origem: "manual",
                          dataHora: agoraHora,
                        },
                        ...(prev.itensMemoriaViva || []),
                      ],
                    }));
                    setNovaMemoriaTexto("");
                    showToast("🧠 Novo aprendizado salvo na Memória Viva da Lala!");
                  }
                }}
                placeholder="Ensine algo sobre seu contexto, rotina, decisões ou como prefere usar a Lala..."
                className="flex-1 px-3 py-2 rounded-xl text-xs border outline-none"
                style={{
                  backgroundColor: t.bg,
                  color: t.text,
                  borderColor: t.border,
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const limpo = novaMemoriaTexto.trim();
                  if (!limpo || !setPerfilCalibrado) return;
                  const agoraHora = new Date().toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  setPerfilCalibrado((prev) => ({
                    ...prev,
                    itensMemoriaViva: [
                      {
                        id: `mem-man-${Date.now()}`,
                        categoria: novaMemoriaCategoria,
                        texto: limpo,
                        origem: "manual",
                        dataHora: agoraHora,
                      },
                      ...(prev.itensMemoriaViva || []),
                    ],
                  }));
                  setNovaMemoriaTexto("");
                  showToast("🧠 Novo aprendizado salvo na Memória Viva da Lala!");
                }}
                disabled={!novaMemoriaTexto.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                style={{ backgroundColor: t.primary }}
              >
                <Plus size={14} /> Memorizar
              </button>
            </div>

            {/* Lista de Itens da Memória Viva */}
            {(() => {
              const listaMem = (perfilCalibrado?.itensMemoriaViva || []).filter(
                (m) =>
                  filtroCategoriaMemoria === "todas" ||
                  m.categoria === filtroCategoriaMemoria
              );
              if (listaMem.length === 0) {
                return (
                  <div
                    className="p-4 rounded-xl border text-xs"
                    style={{
                      backgroundColor: t.bg,
                      borderColor: t.border,
                      color: t.textSoft,
                    }}
                  >
                    A Lala registrará automaticamente aprendizados aqui conforme você conversar com ela, confirmar, editar ou desfazer ações!
                  </div>
                );
              }
              return (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {listaMem.map((item) => {
                    const labelCat =
                      item.categoria === "contexto"
                        ? "Contexto"
                        : item.categoria === "acao_usuario"
                        ? "Sua Ação"
                        : item.categoria === "decisao"
                        ? "Decisão"
                        : item.categoria === "rotina"
                        ? "Rotina"
                        : "Forma de Uso";
                    const labelOrigem =
                      item.origem === "conversa"
                        ? "Na conversa"
                        : item.origem === "edicao_acao"
                        ? "Da sua edição"
                        : item.origem === "acao_app"
                        ? "Da sua ação"
                        : "Ensinado por você";

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border flex items-center justify-between gap-2"
                        style={{ backgroundColor: t.bg, borderColor: t.border }}
                      >
                        {editandoMemoriaId === item.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              value={editandoMemoriaTexto}
                              onChange={(e) =>
                                setEditandoMemoriaTexto(e.target.value)
                              }
                              className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border outline-none"
                              style={{
                                backgroundColor: t.card,
                                color: t.text,
                                borderColor: t.primary,
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const limpo = editandoMemoriaTexto.trim();
                                if (!limpo || !setPerfilCalibrado) return;
                                setPerfilCalibrado((prev) => ({
                                  ...prev,
                                  itensMemoriaViva: (
                                    prev.itensMemoriaViva || []
                                  ).map((m) =>
                                    m.id === item.id
                                      ? { ...m, texto: limpo }
                                      : m
                                  ),
                                }));
                                setEditandoMemoriaId(null);
                                showToast("Memória atualizada!");
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-white cursor-pointer"
                              style={{ backgroundColor: t.primary }}
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditandoMemoriaId(null)}
                              className="px-2 py-1 rounded-lg text-xs border cursor-pointer"
                              style={{
                                backgroundColor: t.card,
                                color: t.textSoft,
                                borderColor: t.border,
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase"
                                  style={{
                                    backgroundColor: `${t.primary}18`,
                                    color: t.primary,
                                  }}
                                >
                                  {labelCat}
                                </span>
                                <span
                                  className="text-[10px] font-medium"
                                  style={{ color: t.textSoft }}
                                >
                                  {labelOrigem} · {item.dataHora}
                                </span>
                              </div>
                              <p
                                className="text-xs leading-relaxed"
                                style={{ color: t.text }}
                              >
                                {item.texto}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditandoMemoriaId(item.id);
                                  setEditandoMemoriaTexto(item.texto);
                                }}
                                className="p-1.5 rounded-lg border cursor-pointer"
                                style={{
                                  backgroundColor: t.card,
                                  color: t.textSoft,
                                  borderColor: t.border,
                                }}
                                title="Editar memória"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!setPerfilCalibrado) return;
                                  setPerfilCalibrado((prev) => ({
                                    ...prev,
                                    itensMemoriaViva: (
                                      prev.itensMemoriaViva || []
                                    ).filter((m) => m.id !== item.id),
                                  }));
                                  showToast("Item removido da memória da Lala.");
                                }}
                                className="p-1.5 rounded-lg border cursor-pointer"
                                style={{
                                  backgroundColor: t.card,
                                  color: t.danger,
                                  borderColor: t.border,
                                }}
                                title="Remover memória"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* 2.5. Regras Diretas & Preferências que a Lala aprendeu com você */}
          <div
            className="p-4 sm:p-5 rounded-2xl border space-y-3.5"
            style={{ backgroundColor: t.card, borderColor: t.border }}
          >
            <div>
              <h3
                className="text-sm font-bold flex items-center gap-2"
                style={{ color: t.text }}
              >
                <Brain size={16} style={{ color: t.action }} />
                O que a Lala já aprendeu com suas edições e instruções ({regrasAprendidas.length})
              </h3>
              <p className="text-xs mt-0.5" style={{ color: t.textSoft }}>
                Sempre que você edita uma ação da Lala ou ensina algo no chat, a regra fica salva aqui para ela acertar de primeira nas próximas vezes.
              </p>
            </div>

            {/* Adicionar nova regra manualmente */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={novaRegraInput}
                onChange={(e) => setNovaRegraInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    adicionarRegraManual();
                  }
                }}
                placeholder="Ex: Sempre que eu mandar Uber, lance na categoria Transporte & UERJ..."
                className="flex-1 px-3 py-2 rounded-xl text-xs border outline-none"
                style={{
                  backgroundColor: t.bg,
                  color: t.text,
                  borderColor: t.border,
                }}
              />
              <button
                type="button"
                onClick={adicionarRegraManual}
                disabled={!novaRegraInput.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                style={{ backgroundColor: t.primary }}
              >
                <Plus size={14} /> Ensinar Regra à Lala
              </button>
            </div>

            {regrasAprendidas.length === 0 ? (
              <div
                className="p-4 rounded-xl border text-xs"
                style={{
                  backgroundColor: t.bg,
                  borderColor: t.border,
                  color: t.textSoft,
                }}
              >
                Ainda não há regras registradas. Quando a Lala propuser uma ação e você clicar em <strong>"Editar Ação"</strong> (ou escrever uma regra acima), ela memorizará seu jeito aqui!
              </div>
            ) : (
              <div className="space-y-2">
                {regrasAprendidas.map((regra, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border flex items-center justify-between gap-2"
                    style={{ backgroundColor: t.bg, borderColor: t.border }}
                  >
                    {editandoRegraIdx === idx ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          value={editandoRegraTexto}
                          onChange={(e) =>
                            setEditandoRegraTexto(e.target.value)
                          }
                          className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border outline-none"
                          style={{
                            backgroundColor: t.card,
                            color: t.text,
                            borderColor: t.primary,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => salvarEdicaoRegra(idx)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-white cursor-pointer"
                          style={{ backgroundColor: t.primary }}
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditandoRegraIdx(null)}
                          className="px-2 py-1 rounded-lg text-xs border cursor-pointer"
                          style={{
                            backgroundColor: t.card,
                            color: t.textSoft,
                            borderColor: t.border,
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-2 min-w-0">
                          <span
                            className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                            style={{
                              backgroundColor: `${t.primary}18`,
                              color: t.primary,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <p
                            className="text-xs leading-relaxed"
                            style={{ color: t.text }}
                          >
                            {regra}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditandoRegraIdx(idx);
                              setEditandoRegraTexto(regra);
                            }}
                            className="p-1.5 rounded-lg border cursor-pointer"
                            style={{
                              backgroundColor: t.card,
                              color: t.textSoft,
                              borderColor: t.border,
                            }}
                            title="Editar regra"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removerRegraAprendida(idx)}
                            className="p-1.5 rounded-lg border cursor-pointer"
                            style={{
                              backgroundColor: t.card,
                              color: t.danger,
                              borderColor: t.border,
                            }}
                            title="Excluir regra"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Automação por Processo (Pedir Confirmação vs Automatizado) */}
          <div
            className="p-4 sm:p-5 rounded-2xl border space-y-3.5"
            style={{ backgroundColor: t.card, borderColor: t.border }}
          >
            <div>
              <h3
                className="text-sm font-bold flex items-center gap-2"
                style={{ color: t.text }}
              >
                <Zap size={16} style={{ color: t.primary }} />
                Automação por Processo (Automatize só o que já estiver redondo)
              </h3>
              <p className="text-xs mt-0.5" style={{ color: t.textSoft }}>
                Escolha quais tipos de ação ainda precisam da sua confirmação e quais a Lala já pode fazer sozinha automaticamente.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {PROCESSOS_CONFIGURAVEIS.map((proc) => {
                const jaAutomatizado =
                  modoAutonomiaAtual === "auto" ||
                  tiposAutomatizadosAtuais.includes(proc.tipo);
                const numConfirmacoes = contagensConfirmacao[proc.tipo] || 0;

                return (
                  <div
                    key={proc.tipo}
                    className="p-3.5 rounded-2xl border flex items-center justify-between gap-3"
                    style={{
                      backgroundColor: jaAutomatizado
                        ? `${t.primary}08`
                        : t.bg,
                      borderColor: jaAutomatizado ? t.primary : t.border,
                    }}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-xs font-bold"
                          style={{ color: t.text }}
                        >
                          {proc.nome}
                        </span>
                        <span
                          className="text-[10px] font-mono-num font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: t.cardSubtle,
                            color: t.textSoft,
                          }}
                        >
                          {numConfirmacoes}x confirmada
                          {numConfirmacoes === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p
                        className="text-[11px] leading-snug"
                        style={{ color: t.textSoft }}
                      >
                        {proc.descricao}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (modoAutonomiaAtual === "auto" && setPerfilCalibrado) {
                          // Se estava em auto global e clicou para pedir confirmação neste processo, muda para modo confirmar mantendo os outros
                          const todosMenosEste = PROCESSOS_CONFIGURAVEIS.map(
                            (p) => p.tipo
                          ).filter((tp) => tp !== proc.tipo);
                          setPerfilCalibrado((prev) => ({
                            ...prev,
                            autonomiaLala: "confirmar",
                            tiposAutomatizados: todosMenosEste,
                          }));
                          showToast(
                            `🛡️ "${proc.nome}" agora pedirá sua confirmação antes!`
                          );
                          return;
                        }
                        if (onToggleAutomacaoTipo) {
                          onToggleAutomacaoTipo(proc.tipo, !jaAutomatizado);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 flex items-center gap-1.5 border cursor-pointer transition-all"
                      style={{
                        backgroundColor: jaAutomatizado ? t.primary : t.card,
                        color: jaAutomatizado ? "#fff" : t.alert,
                        borderColor: jaAutomatizado ? t.primary : t.alert,
                      }}
                    >
                      {jaAutomatizado ? (
                        <>
                          <Zap size={12} />
                          <span>Automatizado</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert size={12} />
                          <span>Pedir Confirmação</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
