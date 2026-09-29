import React, { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Mic,
  Send,
  CheckCircle2,
  PawPrint,
  FolderOpen,
  ArrowRight,
  Scale,
  BatteryCharging,
  Compass,
  Plus,
  Paperclip,
  Utensils,
  SlidersHorizontal,
  Download,
  MessageCircle,
  LayoutList,
  Trash2,
} from "lucide-react";
import {
  AcaoGovernanta,
  AnexoLala,
  ArquivoRepositorio,
  CheckinProntidao,
  Disciplina,
  IntencaoImportacaoArquivo,
  InteracaoGovernanta,
  OrcamentoCategoria,
  PerfilUsuarioCalibrado,
  PetPerfil,
  ProjetoTrabalho,
  TaskItem,
  ThemeMode,
  ThemeTokens,
} from "../../types/lala";
import {
  consultarLalaUnificada,
  formatarTamanhoBytes,
  lerArquivoParaAnexo,
} from "../../services/lalaEngine";
import { FileImportChooserCard } from "../FileImportChooserCard";

interface AbaGovernantaLalaProps {
  t: ThemeTokens;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  interacoes: InteracaoGovernanta[];
  setInteracoes: React.Dispatch<React.SetStateAction<InteracaoGovernanta[]>>;
  tarefas: TaskItem[];
  setTarefas: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  petsPerfil: PetPerfil[];
  alimentarPet: (petId: number) => void;
  adicionarLancamento: (
    valor: number,
    categoria: OrcamentoCategoria["categoria"],
    descricao: string,
    metodo: "Conta / Pix" | "Cartão de Crédito",
    status: "realizado" | "previsto",
    afetaEstoquePets?: boolean
  ) => void;
  registrarSRPEHoje: (srpe: number) => void;
  setRepositorio: React.Dispatch<React.SetStateAction<ArquivoRepositorio[]>>;
  dinheiroLivreHoje: number;
  prontidaoScore: number;
  checkin: CheckinProntidao;
  disciplinas: Disciplina[];
  projetos: ProjetoTrabalho[];
  perfilCalibrado?: PerfilUsuarioCalibrado;
  executarAcaoDaLala: (acao: AcaoGovernanta, interacaoId?: number) => void;
  onOpenCalibracao: () => void;
  showToast: (msg: string) => void;
}

export function AbaGovernantaLala({
  t,
  interacoes,
  setInteracoes,
  tarefas,
  setTarefas,
  petsPerfil,
  setRepositorio,
  dinheiroLivreHoje,
  prontidaoScore,
  checkin,
  disciplinas,
  projetos,
  perfilCalibrado,
  executarAcaoDaLala,
  onOpenCalibracao,
  showToast,
}: AbaGovernantaLalaProps) {
  const [mensagem, setMensagem] = useState<string>("");
  const [gravandoVoz, setGravandoVoz] = useState<boolean>(false);
  const [processando, setProcessando] = useState<boolean>(false);
  const [anexoAtual, setAnexoAtual] = useState<AnexoLala | null>(null);
  const [pastaGuardar] = useState<ArquivoRepositorio["area"]>("Pessoal");
  const [filtroHistorico, setFiltroHistorico] = useState<
    "tudo" | "devaneio" | "desabafo" | "orientacao" | "comando"
  >("tudo");
  const [modoVisualizacao, setModoVisualizacao] = useState<"chat" | "cards">(
    "chat"
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const tarefasHojePendentes = tarefas.filter(
    (tk) => !tk.feito && tk.horizonte === "hoje"
  );
  const tarefaP1 =
    tarefasHojePendentes.find((tk) => tk.manualLock === "p1") ||
    tarefasHojePendentes[0];
  const sachesRestantes = petsPerfil[0]?.estoqueSaches ?? 0;

  // Rola suavemente para a última mensagem do bate-papo sempre que chega nova interação ou está digitando
  useEffect(() => {
    if (modoVisualizacao === "chat" && chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [interacoes.length, processando, modoVisualizacao]);

  const handleSelecionarArquivo = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const lido = await lerArquivoParaAnexo(file, "auto", pastaGuardar);
      setAnexoAtual(lido);
      showToast(
        `Arquivo "${file.name}" carregado! Escolha o que deseja fazer ou importar.`
      );
    } catch {
      showToast("Erro ao ler o arquivo selecionado.");
    } finally {
      e.target.value = "";
    }
  };

  const guardarAnexoDiretoNoSegundoCerebro = (
    pastaEscolhida?: ArquivoRepositorio["area"],
    tituloCustom?: string
  ) => {
    if (!anexoAtual) return;
    const pastaAlvo = pastaEscolhida || pastaGuardar;
    const isImg = anexoAtual.mimeType.startsWith("image/");
    const novoArq: ArquivoRepositorio = {
      id: Date.now(),
      titulo: tituloCustom || mensagem.trim() || anexoAtual.nome,
      area: pastaAlvo,
      tipo: isImg ? "Imagem / Foto" : "PDF / Doc",
      urlOuConteudo:
        anexoAtual.textoExtraido?.slice(0, 260) ||
        `Arquivo anexado (${formatarTamanhoBytes(anexoAtual.tamanhoBytes)}) — salvo na pasta ${pastaAlvo}`,
      dataCriacao: "Hoje (via Lala)",
      fixado: true,
      statusLeitura: "Para Ler",
      anexoBase64: anexoAtual.base64,
      mimeType: anexoAtual.mimeType,
      nomeArquivoOriginal: anexoAtual.nome,
      tamanhoBytes: anexoAtual.tamanhoBytes,
    };
    setRepositorio((prev) => [novoArq, ...prev]);

    const novaInteracao: InteracaoGovernanta = {
      id: Date.now(),
      dataHora: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      modo: "comando",
      nomeAnexo: anexoAtual.nome,
      anexo: anexoAtual,
      tituloCard: `Arquivo guardado em ${pastaAlvo}`,
      tags: ["Segundo Cérebro", pastaAlvo, "Arquivo"],
      mensagemUsuario:
        tituloCustom ||
        mensagem.trim() ||
        `Guardar "${anexoAtual.nome}" em ${pastaAlvo}`,
      respostaLala: `Guardei o arquivo "${anexoAtual.nome}" diretamente na pasta **${pastaAlvo}** do seu Segundo Cérebro! Você pode visualizá-lo ou baixá-lo a qualquer momento pelo menu lateral ou aqui no nosso bate-papo.`,
      guardadoNoCofre: true,
      sugestoesResposta: [
        "Também quero extrair tarefas desse arquivo",
        "Como está minha agenda de hoje?",
      ],
    };
    setInteracoes((prev) => [novaInteracao, ...prev]);

    setAnexoAtual(null);
    setMensagem("");
    showToast(`"${anexoAtual.nome}" guardado no Segundo Cérebro!`);
  };

  const iniciarVoz = () => {
    const SpeechRec =
      (
        window as unknown as {
          SpeechRecognition?: unknown;
          webkitSpeechRecognition?: unknown;
        }
      ).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition = new (SpeechRec as any)();
        recognition.lang = "pt-BR";
        recognition.interimResults = false;
        setGravandoVoz(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript || "";
          setMensagem((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setGravandoVoz(false);
        };
        recognition.onerror = () => setGravandoVoz(false);
        recognition.onend = () => setGravandoVoz(false);
        recognition.start();
        return;
      } catch {
        setGravandoVoz(false);
      }
    } else {
      showToast("Reconhecimento de voz nativo indisponível neste navegador.");
    }
  };

  const enviarParaLala = async (
    textoCustom?: string,
    intencaoForcada?: IntencaoImportacaoArquivo,
    pastaEscolhida?: ArquivoRepositorio["area"],
    guardarCopia = true
  ) => {
    const txt = (textoCustom ?? mensagem).trim();
    if (!txt && !anexoAtual) return;

    const anexoParaEnviar: AnexoLala | undefined = anexoAtual
      ? {
          ...anexoAtual,
          intencao: intencaoForcada || anexoAtual.intencao || "auto",
          areaRepositorio: pastaEscolhida || pastaGuardar,
          guardarCopiaNoSegundoCerebro: guardarCopia,
        }
      : undefined;

    setProcessando(true);
    if (!textoCustom) setMensagem("");
    setAnexoAtual(null);

    const historicoConversa = [...interacoes]
      .slice(0, 8)
      .reverse()
      .map((it) => ({
        usuario: it.mensagemUsuario,
        lala: it.respostaLala,
        dataHora: it.dataHora,
      }));

    const ctx = {
      nomeUsuario: perfilCalibrado?.nomeUsuario,
      prontidaoScore,
      horasSono: checkin.horasSono,
      dinheiroLivreHoje: Math.round(dinheiroLivreHoje),
      sachesRestantes,
      tarefasHojeCount: tarefasHojePendentes.length,
      prioridade1: tarefaP1?.texto || "Nenhuma pendente",
      disciplinasUERJ: disciplinas.map((d) => d.nome),
      projetosAtivos: projetos.map((p) => `${p.nome}: ${p.tarefa}`),
      tomLala: perfilCalibrado?.tomLala,
      autonomiaLala: perfilCalibrado?.autonomiaLala,
      instrucoesPersonalizadasLala:
        perfilCalibrado?.instrucoesPersonalizadasLala,
      horarioAcordar: perfilCalibrado?.horarioAcordar,
      horarioDormir: perfilCalibrado?.horarioDormir,
      historicoConversa,
    };

    try {
      const msgEfetiva =
        txt ||
        (anexoParaEnviar
          ? `Lala, analise o arquivo "${anexoParaEnviar.nome}" (${
              intencaoForcada || "interpretar"
            })`
          : "");
      const resultado = await consultarLalaUnificada(
        msgEfetiva,
        ctx,
        anexoParaEnviar
      );

      // Respeita a autonomia calibrada da Lala ("auto" vs "confirmar")
      const deveAutoExecutar = perfilCalibrado?.autonomiaLala !== "confirmar";
      const acoesAutoExecutadas = (resultado.acoesPropostas || []).map((a) => {
        const autoExecTypes: AcaoGovernanta["tipo"][] = [
          "CRIAR_TAREFA",
          "AGENDAR_COMPROMISSO",
          "REGISTRAR_GASTO",
          "REGISTRAR_RECEITA",
          "ALIMENTAR_PETS",
          "REGISTRAR_SRPE",
          "GUARDAR_SEGUNDO_CEREBRO",
          "ATUALIZAR_DIETA_E_COMPRAS",
          "ATUALIZAR_GRADE_UERJ",
          "ATUALIZAR_CONTAS_FINANCAS",
          "ATUALIZAR_PETS",
          "CRIAR_LISTA_COMPRAS",
          "ATUALIZAR_TREINO",
          "ATUALIZAR_PROJETOS_TRABALHO",
          "ATUALIZAR_HABITOS",
          "ATUALIZAR_METAS_RADAR",
          "ATUALIZAR_PERFIL_CHECKIN",
          "LIMPAR_DADOS_EXEMPLO",
        ];
        if (deveAutoExecutar && autoExecTypes.includes(a.tipo)) {
          executarAcaoDaLala(a);
          return { ...a, executada: true };
        }
        return a;
      });

      const novaInteracao: InteracaoGovernanta = {
        id: Date.now(),
        dataHora: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        mensagemUsuario: msgEfetiva,
        ...resultado,
        acoesPropostas: acoesAutoExecutadas,
      };
      setInteracoes((prev) => [novaInteracao, ...prev]);
    } finally {
      setProcessando(false);
    }
  };

  const interacoesFiltradas = interacoes.filter((i) =>
    filtroHistorico === "tudo" ? true : i.modo === filtroHistorico
  );

  // No modo bate-papo, mostramos em ordem cronológica (mais antigas em cima, mais novas embaixo)
  const mensagensChatCronologicas = [...interacoesFiltradas].reverse();
  const ultimaInteracao = interacoes[0];

  const sugestoesAtivas =
    ultimaInteracao?.sugestoesResposta &&
    ultimaInteracao.sugestoesResposta.length > 0
      ? ultimaInteracao.sugestoesResposta
      : [
          "Oi Lala! Como está meu resumo de hoje?",
          "Me ajuda a organizar minhas prioridades de agora",
          "Estou cansada hoje, alivia minha agenda?",
          "Dei sachê pra Nina e pro Tobias",
        ];

  return (
    <div className="space-y-3">
      {/* CONTAINER PRINCIPAL DO BATE-PAPO COM A LALA */}
      <div
        style={{ backgroundColor: t.card, borderColor: t.border }}
        className="rounded-3xl border shadow-sm overflow-hidden flex flex-col"
      >
        {/* 1. CABEÇALHO COMPACTO ESTILO MENSAGEIRO (WHATSAPP / CHAT) */}
        <div
          style={{ backgroundColor: t.card, borderColor: t.border }}
          className="px-4 py-3 border-b flex items-center justify-between gap-2 flex-wrap"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div
                style={{
                  background: `linear-gradient(135deg, ${t.primary}, ${t.action})`,
                  color: "#fff",
                }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs font-bold text-base"
              >
                L
              </div>
              <span
                className="w-2.5 h-2.5 rounded-full border-2 absolute -bottom-0.5 -right-0.5"
                style={{
                  backgroundColor: "#22c55e",
                  borderColor: t.card,
                }}
                title="Lala Online"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className="text-sm sm:text-base font-bold tracking-tight truncate"
                  style={{ color: t.text }}
                >
                  Bate-Papo com a Lala
                </h1>
                <span
                  style={{
                    backgroundColor: "#22c55e20",
                    color: "#16a34a",
                  }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                >
                  Online agora
                </span>
              </div>
              <p
                style={{ color: t.textSoft }}
                className="text-[11px] truncate mt-0.5"
              >
                Prontidão {prontidaoScore}% · Livre R${" "}
                {dinheiroLivreHoje.toFixed(0)} · {sachesRestantes} sachês · Tom:{" "}
                {perfilCalibrado?.tomLala || "Equilibrada"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div
              className="flex items-center p-0.5 rounded-xl border"
              style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
            >
              <button
                type="button"
                onClick={() => setModoVisualizacao("chat")}
                style={{
                  backgroundColor:
                    modoVisualizacao === "chat" ? t.primary : "transparent",
                  color: modoVisualizacao === "chat" ? "#fff" : t.textSoft,
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <MessageCircle size={12} />
                <span>Chat</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVisualizacao("cards")}
                style={{
                  backgroundColor:
                    modoVisualizacao === "cards" ? t.primary : "transparent",
                  color: modoVisualizacao === "cards" ? "#fff" : t.textSoft,
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <LayoutList size={12} />
                <span>Cards</span>
              </button>
            </div>

            {interacoes.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setInteracoes((prev) => prev.slice(0, 1));
                  showToast("Conversas anteriores limpas!");
                }}
                style={{
                  backgroundColor: t.cardSubtle,
                  color: t.textSoft,
                  borderColor: t.border,
                }}
                className="p-2 rounded-xl border hover:opacity-80 cursor-pointer"
                title="Limpar histórico antigo do bate-papo"
              >
                <Trash2 size={13} />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenCalibracao}
              style={{
                backgroundColor: `${t.primary}15`,
                color: t.primary,
                borderColor: `${t.primary}35`,
              }}
              className="px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <SlidersHorizontal size={12} />
              <span className="hidden sm:inline">Calibrar</span>
            </button>
          </div>
        </div>

        {/* 2. JANELA DE MENSAGENS DO BATE-PAPO (LOGO NO TOPO, SEM POLUIÇÃO) */}
        {modoVisualizacao === "chat" && (
          <div
            ref={chatScrollRef}
            style={{
              backgroundColor: t.bg,
            }}
            className="p-3.5 sm:p-5 space-y-4 max-h-[52vh] min-h-[300px] overflow-y-auto"
          >
            {mensagensChatCronologicas.length === 0 && (
              <div className="py-12 text-center space-y-2">
                <Sparkles
                  size={24}
                  style={{ color: t.primary }}
                  className="mx-auto opacity-80"
                />
                <p className="text-xs font-bold" style={{ color: t.text }}>
                  Comece um bate-papo com a Lala!
                </p>
                <p
                  className="text-[11px] max-w-md mx-auto"
                  style={{ color: t.textSoft }}
                >
                  Mande um "Oi Lala", conte como foi seu dia, peça ajuda para
                  decidir algo ou envie qualquer comando/arquivo no campo abaixo.
                </p>
              </div>
            )}

            {mensagensChatCronologicas.map((item) => (
              <div key={item.id} className="space-y-2.5">
                {/* BALÃO DA USUÁRIA (DIREITA) */}
                <div className="flex justify-end">
                  <div
                    style={{
                      background: `linear-gradient(135deg, ${t.primary}, ${t.action})`,
                      color: "#fff",
                    }}
                    className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs px-3.5 py-2.5 shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] opacity-85 font-semibold">
                      <span>Você</span>
                      <span className="font-mono">{item.dataHora}</span>
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                      {item.mensagemUsuario}
                    </p>

                    {(item.anexo || item.nomeAnexo) && (
                      <div
                        style={{
                          backgroundColor: "rgba(255,255,255,0.16)",
                          borderColor: "rgba(255,255,255,0.28)",
                        }}
                        className="p-2 rounded-xl border flex items-center justify-between gap-2 text-white"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {item.anexo?.mimeType?.startsWith("image/") &&
                          item.anexo.base64 ? (
                            <img
                              src={item.anexo.base64}
                              alt={item.anexo.nome}
                              className="w-10 h-10 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <Paperclip size={14} className="shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold truncate">
                              {item.anexo?.nome || item.nomeAnexo}
                            </p>
                            {item.anexo?.tamanhoBytes && (
                              <p className="text-[10px] opacity-80">
                                {formatarTamanhoBytes(item.anexo.tamanhoBytes)}
                              </p>
                            )}
                          </div>
                        </div>
                        {item.anexo?.base64 && (
                          <a
                            href={item.anexo.base64}
                            download={item.anexo.nome}
                            className="px-2 py-1 rounded-lg bg-white/20 text-[10px] font-bold flex items-center gap-1 shrink-0"
                          >
                            <Download size={11} /> Baixar
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* BALÃO DA LALA (ESQUERDA) */}
                <div className="flex items-start gap-2.5">
                  <div
                    style={{
                      background: `linear-gradient(135deg, ${t.primary}, ${t.action})`,
                      color: "#fff",
                    }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs shadow-xs mt-0.5"
                  >
                    L
                  </div>

                  <div
                    style={{
                      backgroundColor: t.card,
                      borderColor: t.border,
                      color: t.text,
                    }}
                    className="max-w-[90%] sm:max-w-[82%] rounded-2xl rounded-tl-xs p-3.5 border shadow-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          style={{
                            backgroundColor: `${t.primary}15`,
                            color: t.primary,
                          }}
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1"
                        >
                          <Sparkles size={10} />
                          {item.tituloCard || "Lala"}
                        </span>
                      </div>
                      <span
                        style={{ color: t.textSoft }}
                        className="text-[10px] font-mono"
                      >
                        {item.dataHora}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                      {item.respostaLala}
                    </p>

                    {/* Matriz de Decisão dentro do balão do bate-papo */}
                    {item.matrizDecisao && (
                      <div
                        style={{
                          backgroundColor: `${t.action}10`,
                          borderColor: `${t.action}40`,
                        }}
                        className="p-3 rounded-2xl border space-y-2"
                      >
                        <div className="flex items-center gap-1.5">
                          <Scale size={13} style={{ color: t.action }} />
                          <p
                            style={{ color: t.action }}
                            className="text-[11px] font-bold uppercase tracking-wider"
                          >
                            Balança de Decisão da Lala
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div
                            style={{
                              backgroundColor: t.cardSubtle,
                              borderColor: t.border,
                            }}
                            className="p-2.5 rounded-xl border"
                          >
                            <p
                              style={{ color: t.primary }}
                              className="text-[10px] font-bold uppercase"
                            >
                              Caminho A
                            </p>
                            <p className="mt-0.5">
                              {item.matrizDecisao.cenarioA}
                            </p>
                          </div>
                          <div
                            style={{
                              backgroundColor: t.cardSubtle,
                              borderColor: t.border,
                            }}
                            className="p-2.5 rounded-xl border"
                          >
                            <p
                              style={{ color: t.finance }}
                              className="text-[10px] font-bold uppercase"
                            >
                              Caminho B
                            </p>
                            <p className="mt-0.5">
                              {item.matrizDecisao.cenarioB}
                            </p>
                          </div>
                        </div>
                        <div
                          style={{ backgroundColor: t.cardSubtle }}
                          className="p-2.5 rounded-xl text-xs font-semibold"
                        >
                          ✨ <strong>Veredito:</strong>{" "}
                          {item.matrizDecisao.vereditoLala}
                        </div>
                      </div>
                    )}

                    {/* Ações Propostas em 1-Toque dentro do balão */}
                    {item.acoesPropostas && item.acoesPropostas.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {item.acoesPropostas.map((acao) => (
                          <div
                            key={acao.id}
                            style={{
                              backgroundColor: acao.executada
                                ? `${t.primary}12`
                                : t.cardSubtle,
                              borderColor: acao.executada
                                ? t.primary
                                : t.border,
                            }}
                            className="p-2.5 rounded-xl border flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">
                                {acao.titulo}
                              </p>
                              <p
                                style={{ color: t.textSoft }}
                                className="text-[10px] truncate"
                              >
                                {acao.detalhe}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => executarAcaoDaLala(acao, item.id)}
                              disabled={acao.executada}
                              style={{
                                backgroundColor: acao.executada
                                  ? t.primary
                                  : t.action,
                                color: "#fff",
                              }}
                              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-80"
                            >
                              {acao.executada ? (
                                <>
                                  <CheckCircle2 size={12} /> Feito
                                </>
                              ) : (
                                <>
                                  Executar <ArrowRight size={12} />
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Atalhos rápidos caso seja uma conversa livre */}
                    {(!item.acoesPropostas ||
                      item.acoesPropostas.length === 0) && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            const nova: TaskItem = {
                              id: Date.now(),
                              texto: item.mensagemUsuario.slice(0, 65),
                              aba: "estudos_trabalho",
                              categoriaFiltro: "pessoal",
                              cor: "action",
                              feito: false,
                              impacto: 8,
                              urgencia: 7,
                              facilidade: 8,
                              retorno: 8,
                              horizonte: "hoje",
                              manualLock: "top3",
                              duracaoMin: 20,
                            };
                            setTarefas((prev) => [nova, ...prev]);
                            showToast("Transformado em Tarefa de Hoje!");
                          }}
                          style={{
                            backgroundColor: t.cardSubtle,
                            color: t.text,
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={11} /> Virar Tarefa Hoje
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRepositorio((prev) => [
                              {
                                id: Date.now(),
                                titulo: item.tituloCard || "Nota do Bate-Papo",
                                area: "Pessoal",
                                tipo: "Nota Rápida",
                                urlOuConteudo: `${item.mensagemUsuario} — ${item.respostaLala}`,
                                dataCriacao: "Hoje",
                                fixado: true,
                                statusLeitura: "Para Ler",
                              },
                              ...prev,
                            ]);
                            showToast("Salvo no Segundo Cérebro!");
                          }}
                          style={{
                            backgroundColor: `${t.action}16`,
                            color: t.action,
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <FolderOpen size={11} /> Guardar Nota
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Indicador de "Lala está digitando..." no bate-papo */}
            {processando && (
              <div className="flex items-start gap-2.5 animate-pulse">
                <div
                  style={{
                    background: `linear-gradient(135deg, ${t.primary}, ${t.action})`,
                    color: "#fff",
                  }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs"
                >
                  L
                </div>
                <div
                  style={{ backgroundColor: t.card, borderColor: t.border }}
                  className="rounded-2xl rounded-tl-xs px-4 py-3 border text-xs font-medium flex items-center gap-2"
                >
                  <Sparkles size={13} style={{ color: t.primary }} />
                  <span>A Lala está digitando...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. RODAPÉ DE DIGITAÇÃO DO BATE-PAPO (SEMPRE VISÍVEL E INTEGRADO) */}
        <div
          style={{ backgroundColor: t.card, borderColor: t.border }}
          className="p-3.5 sm:p-4 border-t space-y-2.5"
        >
          {/* Sugestões rápidas em 1 linha horizontal para continuar o papo */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {sugestoesAtivas.map((sug) => (
              <button
                key={sug}
                type="button"
                disabled={processando}
                onClick={() => enviarParaLala(sug)}
                style={{
                  backgroundColor: `${t.primary}12`,
                  borderColor: `${t.primary}35`,
                  color: t.primary,
                }}
                className="px-3 py-1 rounded-full border text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer hover:opacity-90 active:scale-98 transition-all disabled:opacity-50"
              >
                <MessageCircle size={11} />
                <span>{sug}</span>
              </button>
            ))}
          </div>

          {/* Input oculto para qualquer arquivo ou foto */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.txt,.csv,.md,.json,.doc,.docx"
            onChange={handleSelecionarArquivo}
            className="hidden"
          />

          {/* Card Universal de Escolha de Ação / Importação quando há arquivo anexado */}
          {anexoAtual && (
            <FileImportChooserCard
              t={t}
              anexo={anexoAtual}
              onClear={() => setAnexoAtual(null)}
              onConfirmImport={(
                intencao,
                instrucao,
                pastaDestino,
                guardarCopia
              ) =>
                enviarParaLala(instrucao, intencao, pastaDestino, guardarCopia)
              }
              onSaveOnly={(pastaDestino, tituloCustom) =>
                guardarAnexoDiretoNoSegundoCerebro(pastaDestino, tituloCustom)
              }
            />
          )}

          {/* Barra de Mensagem Estilo Chat */}
          <div className="flex gap-2 items-end">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                backgroundColor: anexoAtual ? `${t.primary}20` : t.cardSubtle,
                color: t.primary,
                borderColor: anexoAtual ? t.primary : t.border,
              }}
              className="w-11 h-11 rounded-2xl border flex items-center justify-center cursor-pointer shrink-0 transition-transform active:scale-95"
              title="Anexar Arquivo ou Foto no bate-papo"
            >
              <Paperclip size={18} />
            </button>

            <textarea
              ref={textareaRef}
              rows={2}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviarParaLala();
                }
              }}
              placeholder="Digite aqui para bater papo com a Lala..."
              style={{
                backgroundColor: t.cardSubtle,
                color: t.text,
                borderColor: t.border,
              }}
              className="flex-1 px-3.5 py-2.5 rounded-2xl border text-xs sm:text-sm outline-none resize-none leading-relaxed"
            />

            <button
              type="button"
              onClick={iniciarVoz}
              style={{
                backgroundColor: gravandoVoz ? t.danger : t.cardSubtle,
                color: gravandoVoz ? "#fff" : t.action,
                borderColor: t.border,
              }}
              className="w-11 h-11 rounded-2xl border flex items-center justify-center cursor-pointer shrink-0 transition-transform active:scale-95"
              title="Falar por áudio com a Lala"
            >
              <Mic size={18} />
            </button>

            <button
              type="button"
              onClick={() => enviarParaLala()}
              disabled={processando || (!mensagem.trim() && !anexoAtual)}
              style={{ backgroundColor: t.primary, color: "#fff" }}
              className="px-4 h-11 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer shrink-0 disabled:opacity-50 transition-transform active:scale-95"
              title="Enviar mensagem para a Lala"
            >
              <Send size={15} />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </div>

          {gravandoVoz && (
            <div
              className="p-2.5 rounded-xl flex items-center justify-between text-xs animate-pulse"
              style={{ background: t.cardSubtle, color: t.action }}
            >
              <span>
                🎙️ A Lala está te ouvindo no bate-papo... fale naturalmente
              </span>
              <span className="font-mono">PT-BR</span>
            </div>
          )}

          {/* Atalhos Rápidos Compactos */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5 no-scrollbar">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                backgroundColor: `${t.primary}14`,
                borderColor: `${t.primary}40`,
                color: t.primary,
              }}
              className="px-2.5 py-1 rounded-xl border text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Paperclip size={11} />
              Subir Arquivo / Foto
            </button>

            <button
              type="button"
              onClick={() =>
                enviarParaLala(
                  "Lala, analisa minha dieta atual e gera automaticamente a Lista de Compras de mercado com os ingredientes da semana!",
                  "dieta"
                )
              }
              style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
              className="px-2.5 py-1 rounded-xl border text-[10px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Utensils size={11} style={{ color: t.primary }} />
              Dieta → Compras
            </button>

            <button
              type="button"
              onClick={() =>
                enviarParaLala(
                  "Lala, hoje estou sobrecarregada e cansada. Me acolhe e alivia minha agenda mantendo só o essencial."
                )
              }
              style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
              className="px-2.5 py-1 rounded-xl border text-[10px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <BatteryCharging size={11} style={{ color: t.danger }} />
              Aliviar agenda
            </button>

            <button
              type="button"
              onClick={() =>
                enviarParaLala(
                  "Estou travada sem saber por onde começar agora. Me ajuda a decidir entre minhas prioridades?"
                )
              }
              style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
              className="px-2.5 py-1 rounded-xl border text-[10px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Compass size={11} style={{ color: t.action }} />
              Me orienta no foco
            </button>

            <button
              type="button"
              onClick={() =>
                enviarParaLala("Alimentei a Nina e o Tobias agora com sachê")
              }
              style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
              className="px-2.5 py-1 rounded-xl border text-[10px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <PawPrint size={11} style={{ color: t.finance }} />
              Dei sachê pros gatos
            </button>
          </div>
        </div>
      </div>

      {/* VISÃO ALTERNATIVA EM CARDS + FILTROS (SE A USUÁRIA CLICAR EM "CARDS") */}
      {modoVisualizacao === "cards" && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { id: "tudo", label: "Tudo" },
                { id: "comando", label: "Comandos & Arquivos" },
                { id: "orientacao", label: "Orientações" },
                { id: "devaneio", label: "Ideias" },
                { id: "desabafo", label: "Acolhimento" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroHistorico(f.id)}
                style={{
                  backgroundColor:
                    filtroHistorico === f.id ? t.primary : t.cardSubtle,
                  color: filtroHistorico === f.id ? "#fff" : t.textSoft,
                  borderColor: t.border,
                }}
                className="px-2.5 py-1 rounded-xl border text-[11px] font-bold cursor-pointer transition-colors"
              >
                {f.label}
              </button>
            ))}
          </div>

          {interacoesFiltradas.map((item) => (
            <div
              key={item.id}
              style={{ backgroundColor: t.card, borderColor: t.border }}
              className="p-4 sm:p-5 rounded-3xl border shadow-xs space-y-3.5"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    style={{
                      backgroundColor: `${t.primary}15`,
                      color: t.primary,
                    }}
                    className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1"
                  >
                    <Sparkles size={11} />
                    {item.tituloCard || "Lala"}
                  </span>
                  {item.tags?.map((tg) => (
                    <span
                      key={tg}
                      style={{
                        backgroundColor: t.cardSubtle,
                        color: t.textSoft,
                      }}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                    >
                      #{tg}
                    </span>
                  ))}
                </div>
                <span
                  style={{ color: t.textSoft }}
                  className="text-[11px] font-mono"
                >
                  {item.dataHora}
                </span>
              </div>

              <div
                style={{
                  backgroundColor: t.cardSubtle,
                  borderColor: t.border,
                }}
                className="p-3 rounded-2xl border text-xs space-y-2"
              >
                <p className="font-medium leading-relaxed">
                  "{item.mensagemUsuario}"
                </p>

                {(item.anexo || item.nomeAnexo) && (
                  <div
                    style={{ backgroundColor: t.card, borderColor: t.border }}
                    className="p-2.5 rounded-xl border flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.anexo?.mimeType?.startsWith("image/") &&
                      item.anexo.base64 ? (
                        <img
                          src={item.anexo.base64}
                          alt={item.anexo.nome}
                          className="w-12 h-12 rounded-lg object-cover border shrink-0"
                          style={{ borderColor: t.border }}
                        />
                      ) : (
                        <Paperclip
                          size={15}
                          style={{ color: t.primary }}
                          className="shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">
                          {item.anexo?.nome || item.nomeAnexo}
                        </p>
                        {item.anexo?.tamanhoBytes && (
                          <p
                            style={{ color: t.textSoft }}
                            className="text-[10px]"
                          >
                            {formatarTamanhoBytes(item.anexo.tamanhoBytes)}
                          </p>
                        )}
                      </div>
                    </div>
                    {item.anexo?.base64 && (
                      <a
                        href={item.anexo.base64}
                        download={item.anexo.nome}
                        style={{
                          backgroundColor: `${t.primary}15`,
                          color: t.primary,
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0"
                      >
                        <Download size={12} /> Baixar
                      </a>
                    )}
                  </div>
                )}
              </div>

              <p
                style={{ color: t.text }}
                className="text-xs sm:text-sm leading-relaxed whitespace-pre-line"
              >
                {item.respostaLala}
              </p>

              {item.acoesPropostas && item.acoesPropostas.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {item.acoesPropostas.map((acao) => (
                    <div
                      key={acao.id}
                      style={{
                        backgroundColor: acao.executada
                          ? `${t.primary}12`
                          : t.cardSubtle,
                        borderColor: acao.executada ? t.primary : t.border,
                      }}
                      className="p-3 rounded-2xl border flex items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">
                          {acao.titulo}
                        </p>
                        <p
                          style={{ color: t.textSoft }}
                          className="text-[11px] truncate"
                        >
                          {acao.detalhe}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => executarAcaoDaLala(acao, item.id)}
                        disabled={acao.executada}
                        style={{
                          backgroundColor: acao.executada
                            ? t.primary
                            : t.action,
                          color: "#fff",
                        }}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-75"
                      >
                        {acao.executada ? (
                          <>
                            <CheckCircle2 size={12} /> Feito
                          </>
                        ) : (
                          <>
                            Executar <ArrowRight size={12} />
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
