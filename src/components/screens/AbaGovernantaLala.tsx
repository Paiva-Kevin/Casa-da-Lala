import React, { useRef, useState } from "react";
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
  FileText,
  Utensils,
  GraduationCap,
  Dumbbell,
  SlidersHorizontal,
  X,
  Download,
} from "lucide-react";
import {
  AcaoGovernanta,
  AnexoLala,
  ArquivoRepositorio,
  CheckinProntidao,
  Disciplina,
  InteracaoGovernanta,
  OrcamentoCategoria,
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
  executarAcaoDaLala,
  onOpenCalibracao,
  showToast,
}: AbaGovernantaLalaProps) {
  const [mensagem, setMensagem] = useState<string>("");
  const [gravandoVoz, setGravandoVoz] = useState<boolean>(false);
  const [processando, setProcessando] = useState<boolean>(false);
  const [anexoAtual, setAnexoAtual] = useState<AnexoLala | null>(null);
  const [pastaGuardar, setPastaGuardar] =
    useState<ArquivoRepositorio["area"]>("Pessoal");
  const [filtroHistorico, setFiltroHistorico] = useState<
    "tudo" | "devaneio" | "desabafo" | "orientacao" | "comando"
  >("tudo");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const tarefasHojePendentes = tarefas.filter(
    (tk) => !tk.feito && tk.horizonte === "hoje"
  );
  const tarefaP1 =
    tarefasHojePendentes.find((tk) => tk.manualLock === "p1") ||
    tarefasHojePendentes[0];
  const sachesRestantes = petsPerfil[0]?.estoqueSaches ?? 0;

  const handleSelecionarArquivo = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const lido = await lerArquivoParaAnexo(file, "auto", pastaGuardar);
      setAnexoAtual(lido);
      showToast(`Arquivo "${file.name}" anexado na Lala!`);
    } catch {
      showToast("Erro ao ler o arquivo selecionado.");
    } finally {
      e.target.value = "";
    }
  };

  const guardarAnexoDiretoNoSegundoCerebro = () => {
    if (!anexoAtual) return;
    const isImg = anexoAtual.mimeType.startsWith("image/");
    const novoArq: ArquivoRepositorio = {
      id: Date.now(),
      titulo: mensagem.trim() || anexoAtual.nome,
      area: pastaGuardar,
      tipo: isImg ? "Imagem / Foto" : "PDF / Doc",
      urlOuConteudo:
        anexoAtual.textoExtraido?.slice(0, 260) ||
        `Arquivo anexado (${formatarTamanhoBytes(anexoAtual.tamanhoBytes)}) — salvo na pasta ${pastaGuardar}`,
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
      tituloCard: `Arquivo guardado em ${pastaGuardar}`,
      tags: ["Segundo Cérebro", pastaGuardar, "Arquivo"],
      mensagemUsuario:
        mensagem.trim() || `Guardar "${anexoAtual.nome}" em ${pastaGuardar}`,
      respostaLala: `Guardei o arquivo "${anexoAtual.nome}" diretamente na pasta **${pastaGuardar}** do seu Segundo Cérebro! Você pode visualizá-lo ou baixá-lo a qualquer momento pelo menu lateral ou aqui na linha do tempo.`,
      guardadoNoCofre: true,
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
    intencaoForcada?: AnexoLala["intencao"]
  ) => {
    const txt = (textoCustom ?? mensagem).trim();
    if (!txt && !anexoAtual) return;

    const anexoParaEnviar: AnexoLala | undefined = anexoAtual
      ? {
          ...anexoAtual,
          intencao: intencaoForcada || anexoAtual.intencao || "auto",
          areaRepositorio: pastaGuardar,
        }
      : undefined;

    setProcessando(true);
    if (!textoCustom) setMensagem("");
    setAnexoAtual(null);

    const ctx = {
      prontidaoScore,
      horasSono: checkin.horasSono,
      dinheiroLivreHoje: Math.round(dinheiroLivreHoje),
      sachesRestantes,
      tarefasHojeCount: tarefasHojePendentes.length,
      prioridade1: tarefaP1?.texto || "Nenhuma pendente",
      disciplinasUERJ: disciplinas.map((d) => d.nome),
      projetosAtivos: projetos.map((p) => `${p.nome}: ${p.tarefa}`),
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

      // Executa automaticamente as ações de preenchimento/atualização para que a conversa com a Lala preencha o app de forma livre e imediata
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
        if (autoExecTypes.includes(a.tipo)) {
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

  return (
    <div className="space-y-5">
      {/* CARD UNIFICADO DA LALA: PULSO DA VIDA + UPLOAD + ENTRADA ÚNICA */}
      <div
        style={{ backgroundColor: t.card, borderColor: t.border }}
        className="p-5 rounded-3xl border shadow-xs space-y-4"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3.5">
            <div
              style={{
                background: `linear-gradient(135deg, ${t.primary}, ${t.action})`,
                color: "#fff",
              }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm font-bold text-lg"
            >
              L
            </div>
            <div>
              <h1
                className="text-lg sm:text-xl font-bold tracking-tight"
                style={{ color: t.text }}
              >
                Lala
              </h1>
              <p
                style={{ color: t.textSoft }}
                className="text-xs mt-0.5 leading-relaxed"
              >
                Sua governanta pessoal. Fale, digite ou suba arquivos/fotos (sua
                dieta, grade da UERJ, treinos, comprovantes ou documentos para
                guardar) — eu interpreto e organizo tudo no app.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenCalibracao}
            style={{
              backgroundColor: `${t.primary}15`,
              color: t.primary,
              borderColor: `${t.primary}35`,
            }}
            className="px-3.5 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <SlidersHorizontal size={14} />
            <span>Calibrar Dados do App</span>
          </button>
        </div>

        {/* Pulso Vivo em 1 Linha */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div
            style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
            className="p-2.5 rounded-2xl border"
          >
            <p
              style={{ color: t.textSoft }}
              className="text-[10px] font-bold uppercase"
            >
              Prontidão
            </p>
            <p
              style={{ color: t.primary }}
              className="text-xs sm:text-sm font-bold font-mono mt-0.5"
            >
              {prontidaoScore}% ({checkin.horasSono}h sono)
            </p>
          </div>
          <div
            style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
            className="p-2.5 rounded-2xl border"
          >
            <p
              style={{ color: t.textSoft }}
              className="text-[10px] font-bold uppercase"
            >
              Livre Hoje
            </p>
            <p
              style={{ color: t.finance }}
              className="text-xs sm:text-sm font-bold font-mono mt-0.5"
            >
              R$ {dinheiroLivreHoje.toFixed(2).replace(".", ",")}
            </p>
          </div>
          <div
            style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
            className="p-2.5 rounded-2xl border"
          >
            <p
              style={{ color: t.textSoft }}
              className="text-[10px] font-bold uppercase"
            >
              Nina & Tobias
            </p>
            <p
              style={{ color: sachesRestantes <= 4 ? t.danger : t.text }}
              className="text-xs sm:text-sm font-bold font-mono mt-0.5"
            >
              {sachesRestantes} sachês
            </p>
          </div>
          <div
            style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
            className="p-2.5 rounded-2xl border"
          >
            <p
              style={{ color: t.textSoft }}
              className="text-[10px] font-bold uppercase"
            >
              Prioridade #1
            </p>
            <p className="text-xs font-bold truncate mt-0.5">
              {tarefaP1 ? tarefaP1.texto : "Tudo em dia!"}
            </p>
          </div>
        </div>

        {/* Input oculto para qualquer arquivo ou foto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.txt,.csv,.md,.json,.doc,.docx"
          onChange={handleSelecionarArquivo}
          className="hidden"
        />

        {/* Card de Preview e Ações Rápidas quando há arquivo/foto anexado */}
        {anexoAtual && (
          <div
            style={{
              backgroundColor: `${t.primary}12`,
              borderColor: `${t.primary}45`,
            }}
            className="p-4 rounded-2xl border space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {anexoAtual.mimeType.startsWith("image/") &&
                anexoAtual.base64 ? (
                  <img
                    src={anexoAtual.base64}
                    alt={anexoAtual.nome}
                    className="w-14 h-14 rounded-xl object-cover border shrink-0"
                    style={{ borderColor: t.border }}
                  />
                ) : (
                  <div
                    style={{ backgroundColor: t.primary, color: "#fff" }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  >
                    <FileText size={20} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold truncate">
                    {anexoAtual.nome}
                  </p>
                  <p style={{ color: t.textSoft }} className="text-[11px]">
                    {formatarTamanhoBytes(anexoAtual.tamanhoBytes)} · Escolha
                    abaixo o que a Lala deve fazer (ou digite uma instrução e
                    envie):
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAnexoAtual(null)}
                className="p-1.5 rounded-full cursor-pointer"
                style={{ backgroundColor: t.card, color: t.textSoft }}
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <button
                onClick={() =>
                  enviarParaLala(
                    `Lala, interprete minha dieta do arquivo "${anexoAtual.nome}", atualize meu cardápio de refeições e já gere automaticamente a Lista de Compras de mercado!`,
                    "dieta"
                  )
                }
                style={{ backgroundColor: t.card, borderColor: t.border }}
                className="p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer text-left"
              >
                <Utensils size={15} style={{ color: t.primary }} className="shrink-0" />
                <span>Interpretar Dieta → Cardápio + Compras</span>
              </button>

              <button
                onClick={() =>
                  enviarParaLala(
                    `Lala, interprete minha grade da UERJ do arquivo "${anexoAtual.nome}", cadastre as disciplinas e aloque os horários na Agenda!`,
                    "grade"
                  )
                }
                style={{ backgroundColor: t.card, borderColor: t.border }}
                className="p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer text-left"
              >
                <GraduationCap
                  size={15}
                  style={{ color: t.action }}
                  className="shrink-0"
                />
                <span>Interpretar Grade UERJ + Agenda</span>
              </button>

              <button
                onClick={() =>
                  enviarParaLala(
                    `Lala, interprete minha ficha de treino do arquivo "${anexoAtual.nome}" e atualize meus treinos!`,
                    "treino"
                  )
                }
                style={{ backgroundColor: t.card, borderColor: t.border }}
                className="p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer text-left"
              >
                <Dumbbell
                  size={15}
                  style={{ color: t.finance }}
                  className="shrink-0"
                />
                <span>Interpretar Ficha de Treino</span>
              </button>

              <div className="flex items-center gap-1.5">
                <select
                  value={pastaGuardar}
                  onChange={(e) =>
                    setPastaGuardar(
                      e.target.value as ArquivoRepositorio["area"]
                    )
                  }
                  style={{
                    backgroundColor: t.card,
                    color: t.text,
                    borderColor: t.border,
                  }}
                  className="p-2.5 rounded-xl text-xs font-bold outline-none border"
                >
                  <option value="Pessoal">Pessoal</option>
                  <option value="UERJ">UERJ</option>
                  <option value="Casa & Pets">Casa/Dieta</option>
                  <option value="Finanças">Finanças</option>
                  <option value="Artigos">Artigos</option>
                  <option value="CDT & RCR">CDT/RCR</option>
                </select>
                <button
                  onClick={guardarAnexoDiretoNoSegundoCerebro}
                  style={{ backgroundColor: t.action, color: "#fff" }}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FolderOpen size={14} /> Só Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Entrada Única e Fluida (Voz, Texto ou Arquivo/Imagem) */}
        <div className="space-y-2.5">
          <div className="flex gap-2 items-end">
            <textarea
              rows={3}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviarParaLala();
                }
              }}
              placeholder='Converse, dê comandos ou anexe um arquivo no clipe 📎: "Subi minha dieta, cria a lista de compras", "Me ajuda a montar a grade da UERJ", "Gastei 22 no café", "Tô exausta hoje"...'
              style={{
                backgroundColor: t.cardSubtle,
                color: t.text,
                borderColor: t.border,
              }}
              className="flex-1 p-3.5 rounded-2xl border text-xs sm:text-sm outline-none resize-none leading-relaxed"
            />
            <div className="flex flex-col gap-1.5 shrink-0">
              <div className="flex gap-1.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    backgroundColor: anexoAtual
                      ? `${t.primary}20`
                      : t.cardSubtle,
                    color: t.primary,
                    borderColor: anexoAtual ? t.primary : t.border,
                  }}
                  className="w-11 h-11 rounded-2xl border flex items-center justify-center cursor-pointer"
                  title="Anexar Arquivo ou Foto (Dieta, Grade, PDF, Imagem ou Guardar)"
                >
                  <Paperclip size={18} />
                </button>
                <button
                  onClick={iniciarVoz}
                  style={{
                    backgroundColor: gravandoVoz ? t.danger : t.cardSubtle,
                    color: gravandoVoz ? "#fff" : t.action,
                    borderColor: t.border,
                  }}
                  className="w-11 h-11 rounded-2xl border flex items-center justify-center cursor-pointer"
                  title="Falar por áudio com a Lala"
                >
                  <Mic size={18} />
                </button>
              </div>
              <button
                onClick={() => enviarParaLala()}
                disabled={processando || (!mensagem.trim() && !anexoAtual)}
                style={{ backgroundColor: t.primary, color: "#fff" }}
                className="w-full h-11 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer disabled:opacity-50"
                title="Enviar para a Lala"
              >
                <Send size={15} />
                <span>Enviar</span>
              </button>
            </div>
          </div>

          {/* Atalhos Rápidos de 1-Toque (Upload Dieta, Grade, Desabafo, Orientação) */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                backgroundColor: `${t.primary}14`,
                borderColor: `${t.primary}40`,
                color: t.primary,
              }}
              className="px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Paperclip size={13} />
              Subir Arquivo / Foto (Dieta, Grade ou Guardar)
            </button>

            <button
              onClick={() =>
                enviarParaLala(
                  "Lala, me ajuda a montar minha grade da UERJ deste semestre para conciliar com meu trabalho e meus treinos!"
                )
              }
              style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
              className="px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <GraduationCap size={13} style={{ color: t.action }} />
              Montar minha Grade UERJ
            </button>

            <button
              onClick={() =>
                enviarParaLala(
                  "Lala, analisa minha dieta atual e gera automaticamente a Lista de Compras de mercado com os ingredientes da semana!",
                  "dieta"
                )
              }
              style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
              className="px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Utensils size={13} style={{ color: t.primary }} />
              Dieta → Gerar Lista de Compras
            </button>

            <button
              onClick={() =>
                enviarParaLala(
                  "Lala, hoje estou sobrecarregada e cansada. Me acolhe e alivia minha agenda mantendo só o essencial."
                )
              }
              style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
              className="px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <BatteryCharging size={13} style={{ color: t.danger }} />
              Dia pesado (Aliviar agenda)
            </button>

            <button
              onClick={() =>
                enviarParaLala(
                  "Estou travada sem saber por onde começar agora. Me ajuda a decidir entre minhas prioridades?"
                )
              }
              style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
              className="px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Compass size={13} style={{ color: t.action }} />
              Me orienta no que focar
            </button>

            <button
              onClick={() =>
                enviarParaLala("Alimentei a Nina e o Tobias agora com sachê")
              }
              style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
              className="px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <PawPrint size={13} style={{ color: t.finance }} />
              Dei sachê pra Nina e Tobias
            </button>
          </div>
        </div>
      </div>

      {/* FILTRO LEVE DO FLUXO DE MEMÓRIA DA LALA */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: t.textSoft }}
        >
          Linha do Tempo com a Lala
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: "tudo", label: "Tudo" },
              { id: "comando", label: "Comandos & Arquivos" },
              { id: "devaneio", label: "Devaneios" },
              { id: "desabafo", label: "Desabafos" },
              { id: "orientacao", label: "Orientações" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltroHistorico(f.id)}
              style={{
                backgroundColor:
                  filtroHistorico === f.id ? t.primary : t.card,
                color: filtroHistorico === f.id ? "#fff" : t.textSoft,
                borderColor: t.border,
              }}
              className="px-2.5 py-1 rounded-xl border text-[11px] font-bold cursor-pointer"
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* FLUXO UNIFICADO DE RESPOSTAS, ARQUIVOS, DECISÕES E AÇÕES DA LALA */}
      <div className="space-y-3">
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

              {/* Exibe preview do anexo caso tenha sido enviado */}
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
                        <p style={{ color: t.textSoft }} className="text-[10px]">
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

            {/* Matriz de Decisão automática */}
            {item.matrizDecisao && (
              <div
                style={{
                  backgroundColor: `${t.action}10`,
                  borderColor: `${t.action}40`,
                }}
                className="p-3.5 rounded-2xl border space-y-2.5"
              >
                <div className="flex items-center gap-1.5">
                  <Scale size={14} style={{ color: t.action }} />
                  <p
                    style={{ color: t.action }}
                    className="text-xs font-bold uppercase tracking-wider"
                  >
                    Balança de Decisão da Lala
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div
                    style={{
                      backgroundColor: t.card,
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
                    <p className="mt-0.5">{item.matrizDecisao.cenarioA}</p>
                  </div>
                  <div
                    style={{
                      backgroundColor: t.card,
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
                    <p className="mt-0.5">{item.matrizDecisao.cenarioB}</p>
                  </div>
                </div>
                <div
                  style={{ backgroundColor: t.card }}
                  className="p-2.5 rounded-xl text-xs font-semibold"
                >
                  ✨ <strong>Recomendação da Lala:</strong>{" "}
                  {item.matrizDecisao.vereditoLala}
                </div>
              </div>
            )}

            {/* Botões de Ação em 1-Toque gerados pela Lala */}
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
                      onClick={() => executarAcaoDaLala(acao, item.id)}
                      disabled={acao.executada}
                      style={{
                        backgroundColor: acao.executada ? t.primary : t.action,
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

            {/* Atalhos para transformar qualquer devaneio/conversa em Tarefa ou Nota do Segundo Cérebro */}
            {(!item.acoesPropostas || item.acoesPropostas.length === 0) && (
              <div className="flex items-center gap-2 pt-1">
                <button
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
                  style={{ backgroundColor: t.cardSubtle, color: t.text }}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Virar Tarefa Hoje
                </button>
                <button
                  onClick={() => {
                    setRepositorio((prev) => [
                      {
                        id: Date.now(),
                        titulo: item.tituloCard || "Nota da Lala",
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
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <FolderOpen size={12} /> Guardar no Segundo Cérebro
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
