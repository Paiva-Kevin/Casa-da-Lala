import React, { useRef, useState } from "react";
import {
  X,
  Mic,
  Send,
  Wallet,
  CheckCircle2,
  PawPrint,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Paperclip,
  FileText,
  FolderOpen,
  Utensils,
  GraduationCap,
  Dumbbell,
  SlidersHorizontal,
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
  TabId,
  TaskCategoryFilter,
  TaskItem,
  ThemeMode,
  ThemeTokens,
} from "../types/lala";
import { parseGastoNatural } from "../data/initialData";
import {
  consultarLalaUnificada,
  formatarTamanhoBytes,
  lerArquivoParaAnexo,
} from "../services/lalaEngine";
import { FileImportChooserCard } from "./FileImportChooserCard";

interface SmartBrainModalProps {
  t: ThemeTokens;
  open: boolean;
  onClose: () => void;
  adicionarLancamento: (
    valor: number,
    categoria: OrcamentoCategoria["categoria"],
    descricao: string,
    metodo: "Conta / Pix" | "Cartão de Crédito",
    status: "realizado" | "previsto",
    afetaEstoquePets?: boolean
  ) => void;
  tarefas: TaskItem[];
  setTarefas: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  alimentarPet: (petId: number) => void;
  registrarSRPEHoje: (srpe: number) => void;
  setRepositorio: React.Dispatch<React.SetStateAction<ArquivoRepositorio[]>>;
  interacoesLala: InteracaoGovernanta[];
  setInteracoesLala: React.Dispatch<React.SetStateAction<InteracaoGovernanta[]>>;
  petsPerfil: PetPerfil[];
  dinheiroLivreHoje: number;
  prontidaoScore: number;
  checkin: CheckinProntidao;
  disciplinas: Disciplina[];
  projetos: ProjetoTrabalho[];
  perfilCalibrado?: PerfilUsuarioCalibrado;
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
  irParaLalaCompleta: () => void;
  executarAcaoDaLala: (acao: AcaoGovernanta, interacaoId?: number) => void;
  onOpenCalibracao: () => void;
  showToast: (msg: string) => void;
}

export function SmartBrainModal({
  t,
  open,
  onClose,
  adicionarLancamento,
  tarefas,
  setTarefas,
  alimentarPet,
  registrarSRPEHoje,
  setRepositorio,
  interacoesLala,
  setInteracoesLala,
  petsPerfil,
  dinheiroLivreHoje,
  prontidaoScore,
  checkin,
  disciplinas,
  projetos,
  perfilCalibrado,
  irParaLalaCompleta,
  executarAcaoDaLala,
  onOpenCalibracao,
  showToast,
}: SmartBrainModalProps) {
  const [abaRapida, setAbaRapida] = useState<
    "lala" | "gasto" | "tarefa" | "pets"
  >("lala");
  const [textoLivre, setTextoLivre] = useState("");
  const [gravandoVoz, setGravandoVoz] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [anexoAtual, setAnexoAtual] = useState<AnexoLala | null>(null);
  const [pastaGuardar] =
    useState<ArquivoRepositorio["area"]>("Pessoal");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Campos manuais rápidos para Gasto
  const [gastoValor, setGastoValor] = useState("");
  const [gastoDesc, setGastoDesc] = useState("");
  const [gastoCat, setGastoCat] =
    useState<OrcamentoCategoria["categoria"]>("Mercado");
  const [gastoMetodo, setGastoMetodo] = useState<
    "Conta / Pix" | "Cartão de Crédito"
  >("Conta / Pix");

  // Campos manuais rápidos para Tarefa
  const [tarefaTexto, setTarefaTexto] = useState("");
  const [tarefaCategoria, setTarefaCategoria] =
    useState<Exclude<TaskCategoryFilter, "todas">>("uerj");
  const [tarefaTravaP1, setTarefaTravaP1] = useState(false);

  if (!open) return null;

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
      showToast(`Arquivo "${file.name}" carregado! Escolha o que deseja fazer com ele.`);
    } catch {
      showToast("Não foi possível ler este arquivo.");
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
      titulo: tituloCustom || textoLivre.trim() || anexoAtual.nome,
      area: pastaAlvo,
      tipo: isImg ? "Imagem / Foto" : "PDF / Doc",
      urlOuConteudo:
        anexoAtual.textoExtraido?.slice(0, 240) ||
        `Arquivo anexado (${formatarTamanhoBytes(anexoAtual.tamanhoBytes)}) — salvo via Acesso Rápido da Lala`,
      dataCriacao: "Hoje (via Lala)",
      fixado: true,
      statusLeitura: "Para Ler",
      anexoBase64: anexoAtual.base64,
      mimeType: anexoAtual.mimeType,
      nomeArquivoOriginal: anexoAtual.nome,
      tamanhoBytes: anexoAtual.tamanhoBytes,
    };
    setRepositorio((prev) => [novoArq, ...prev]);
    showToast(`"${anexoAtual.nome}" guardado em ${pastaAlvo}!`);
    setAnexoAtual(null);
    setTextoLivre("");
  };

  const iniciarReconhecimentoVoz = () => {
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
          setTextoLivre((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setGravandoVoz(false);
        };
        recognition.onerror = () => {
          setGravandoVoz(false);
        };
        recognition.onend = () => setGravandoVoz(false);
        recognition.start();
        return;
      } catch {
        setGravandoVoz(false);
      }
    }

    setGravandoVoz(true);
    setTimeout(() => {
      setGravandoVoz(false);
      const frases = [
        "Gastei 18,50 na padaria com café no Pix",
        "Alimentei a Nina e o Tobias agora",
        "Agendar reunião amanhã às 15h",
        "Estou cansada hoje, alivia minha agenda?",
      ];
      setTextoLivre(frases[Math.floor(Math.random() * frases.length)]);
    }, 700);
  };

  // Falar com a Lala (Unificado: voz, texto ou arquivo/imagem anexado)
  const falarComALala = async (
    intencaoForcada?: IntencaoImportacaoArquivo,
    promptForcado?: string,
    pastaEscolhida?: ArquivoRepositorio["area"],
    guardarCopia = true
  ) => {
    const txt = (promptForcado ?? textoLivre).trim();
    if (!txt && !anexoAtual) return;
    const lower = txt.toLowerCase();

    const anexoParaEnviar: AnexoLala | undefined = anexoAtual
      ? {
          ...anexoAtual,
          intencao: intencaoForcada || anexoAtual.intencao || "auto",
          areaRepositorio: pastaEscolhida || pastaGuardar,
          guardarCopiaNoSegundoCerebro: guardarCopia,
        }
      : undefined;

    setProcessando(true);
    setTextoLivre("");
    setAnexoAtual(null);

    let executouDireto = false;

    if (!anexoParaEnviar) {
      if (
        (lower.includes("alimentei") ||
          lower.includes("dei sachê") ||
          lower.includes("dei ração")) &&
        (lower.includes("nina") ||
          lower.includes("tobias") ||
          lower.includes("gatos"))
      ) {
        alimentarPet(1);
        alimentarPet(2);
        executouDireto = true;
      }

      const matchSrpe = lower.match(/srpe\s*(\d+)/);
      if (matchSrpe) {
        const val = Math.min(10, Math.max(1, parseInt(matchSrpe[1], 10)));
        registrarSRPEHoje(val);
        executouDireto = true;
      }

      const parsedGasto = parseGastoNatural(txt);
      if (
        parsedGasto &&
        (lower.includes("r$") ||
          lower.includes("reais") ||
          lower.includes("gastei") ||
          lower.includes("comprei") ||
          lower.includes("pix") ||
          lower.includes("padaria") ||
          lower.includes("mercado") ||
          lower.includes("uber") ||
          /^\d+([.,]\d+)?\s+/.test(lower))
      ) {
        adicionarLancamento(
          parsedGasto.valor,
          parsedGasto.categoria,
          parsedGasto.descricao,
          parsedGasto.metodoSugerido,
          "realizado",
          parsedGasto.afetaEstoquePets
        );
        executouDireto = true;
      }
    }

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
      instrucoesPersonalizadasLala: perfilCalibrado?.instrucoesPersonalizadasLala,
      horarioAcordar: perfilCalibrado?.horarioAcordar,
      horarioDormir: perfilCalibrado?.horarioDormir,
    };

    try {
      const msgEfetiva =
        txt ||
        (anexoParaEnviar
          ? `Lala, enviei o arquivo "${anexoParaEnviar.nome}" (${
              intencaoForcada || "analisar"
            }).`
          : "");
      const resultado = await consultarLalaUnificada(
        msgEfetiva,
        ctx,
        anexoParaEnviar
      );

      // Respeita a calibração de autonomia da Lala (auto vs confirmar)
      const deveAutoExecutar = perfilCalibrado?.autonomiaLala !== "confirmar";
      const acoesMarcadas = (resultado.acoesPropostas || []).map((a) => {
        if (executouDireto) {
          return { ...a, executada: true };
        }
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
        acoesPropostas: acoesMarcadas,
      };

      setInteracoesLala((prev) => [novaInteracao, ...prev]);
    } finally {
      setProcessando(false);
    }
  };

  const salvarGastoManual = () => {
    const val = parseFloat(gastoValor.replace(",", "."));
    if (isNaN(val) || val <= 0) return;
    adicionarLancamento(
      val,
      gastoCat,
      gastoDesc.trim() || `Lançamento em ${gastoCat}`,
      gastoMetodo,
      "realizado",
      gastoCat === "Pets"
    );
    setGastoValor("");
    setGastoDesc("");
    onClose();
  };

  const salvarTarefaManual = () => {
    if (!tarefaTexto.trim()) return;
    const mapaAba: Record<
      Exclude<TaskCategoryFilter, "todas">,
      { aba: Exclude<TabId, "inicio">; cor: TaskItem["cor"] }
    > = {
      uerj: { aba: "estudos_trabalho", cor: "primary" },
      trabalho: { aba: "estudos_trabalho", cor: "alert" },
      casa: { aba: "casa_rotinas", cor: "primary" },
      pessoal: { aba: "saude_pets", cor: "action" },
    };
    const cfg = mapaAba[tarefaCategoria];
    const nova: TaskItem = {
      id: Date.now(),
      texto: tarefaTexto.trim(),
      aba: cfg.aba,
      categoriaFiltro: tarefaCategoria,
      cor: cfg.cor,
      feito: false,
      impacto: tarefaTravaP1 ? 10 : 8,
      urgencia: tarefaTravaP1 ? 9 : 7,
      facilidade: 7,
      retorno: 8,
      horizonte: "hoje",
      manualLock: tarefaTravaP1 ? "p1" : null,
      duracaoMin: 25,
    };
    setTarefas((prev) => [nova, ...prev]);
    showToast(
      tarefaTravaP1
        ? "Tarefa fixada como Prioridade #1 de Hoje!"
        : "Tarefa adicionada em Hoje!"
    );
    setTarefaTexto("");
    onClose();
  };

  const ultimaInteracao = interacoesLala[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 backdrop-blur-xs"
        style={{ background: "rgba(0,0,0,0.52)" }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-[480px] rounded-t-[30px] p-5 pb-8 shadow-2xl space-y-3.5 max-h-[90vh] overflow-y-auto"
        style={{ background: t.card, color: t.text }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              style={{
                background: `linear-gradient(135deg, ${t.primary}, ${t.action})`,
                color: "#fff",
              }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                Lala · Acesso Rápido
              </h2>
              <p style={{ color: t.textSoft }} className="text-[11px] mt-0.5">
                Voz, texto, upload de arquivos/fotos (dieta, grade, notas) e
                comandos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                onClose();
                onOpenCalibracao();
              }}
              style={{ background: t.cardSubtle, color: t.primary }}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              title="Calibrar informações do app"
            >
              <SlidersHorizontal size={12} /> Calibrar
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: t.cardSubtle }}
            >
              <X size={16} style={{ color: t.textSoft }} />
            </button>
          </div>
        </div>

        {/* Abas Rápidas: Falar com a Lala (padrão) ou atalhos diretos */}
        <div
          className="grid grid-cols-4 gap-1 p-1 rounded-2xl"
          style={{ background: t.cardSubtle }}
        >
          {(
            [
              { id: "lala", label: "Lala (IA/Arq)", icon: Sparkles },
              { id: "gasto", label: "+ Gasto", icon: Wallet },
              { id: "tarefa", label: "+ Tarefa", icon: CheckCircle2 },
              { id: "pets", label: "Nina/Tobias", icon: PawPrint },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setAbaRapida(m.id)}
              className="py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              style={{
                background: abaRapida === m.id ? t.primary : "transparent",
                color: abaRapida === m.id ? "#fff" : t.textSoft,
              }}
            >
              <m.icon size={13} />
              {m.label}
            </button>
          ))}
        </div>

        {abaRapida === "lala" && (
          <div className="space-y-3">
            {/* Input oculto para qualquer arquivo ou foto */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.csv,.md,.json,.doc,.docx"
              onChange={handleSelecionarArquivo}
              className="hidden"
            />

            {/* Card universal quando um arquivo ou imagem está anexado */}
            {anexoAtual && (
              <FileImportChooserCard
                t={t}
                anexo={anexoAtual}
                compact
                onClear={() => setAnexoAtual(null)}
                onConfirmImport={(
                  intencao,
                  instrucao,
                  pastaDestino,
                  guardarCopia
                ) =>
                  falarComALala(
                    intencao,
                    instrucao,
                    pastaDestino,
                    guardarCopia
                  )
                }
                onSaveOnly={(pastaDestino, tituloCustom) =>
                  guardarAnexoDiretoNoSegundoCerebro(pastaDestino, tituloCustom)
                }
              />
            )}

            <div className="flex gap-1.5 items-end">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-11 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer border"
                style={{
                  background: anexoAtual ? `${t.primary}20` : t.cardSubtle,
                  color: t.primary,
                  borderColor: anexoAtual ? t.primary : t.border,
                }}
                title="Anexar qualquer arquivo ou imagem (escolher importar ou guardar)"
              >
                <Paperclip size={18} />
              </button>

              <textarea
                rows={2}
                value={textoLivre}
                onChange={(e) => setTextoLivre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    falarComALala();
                  }
                }}
                placeholder='Fale, digite ou anexe um arquivo no clipe 📎 para importar eventos, tarefas, gastos, compras ou guardar...'
                className="flex-1 p-3 rounded-2xl text-xs outline-none resize-none leading-relaxed"
                style={{ background: t.cardSubtle, color: t.text }}
              />

              <button
                onClick={iniciarReconhecimentoVoz}
                className="w-11 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer"
                style={{
                  background: gravandoVoz ? t.danger : t.action,
                  color: "#fff",
                }}
                title="Falar por voz com a Lala"
              >
                <Mic size={18} />
              </button>

              <button
                onClick={() => falarComALala()}
                disabled={processando || (!textoLivre.trim() && !anexoAtual)}
                className="w-11 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                style={{
                  background: t.primary,
                  color: "#fff",
                }}
                title="Enviar para a Lala"
              >
                <Send size={17} />
              </button>
            </div>

            {gravandoVoz && (
              <div
                className="p-2.5 rounded-xl flex items-center justify-between text-xs animate-pulse"
                style={{ background: t.cardSubtle, color: t.action }}
              >
                <span>🎙️ A Lala está te ouvindo... fale naturalmente</span>
                <span className="font-mono">PT-BR</span>
              </div>
            )}

            {/* Barra rápida de Upload e Sugestões */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer border"
                style={{
                  background: `${t.primary}14`,
                  color: t.primary,
                  borderColor: `${t.primary}35`,
                }}
              >
                <Paperclip size={11} /> Subir Arquivo / Foto (Importar ou Guardar)
              </button>
              {[
                "18,50 padaria no Pix",
                "Agendar reunião amanhã às 14h",
                "Tô cansada hoje, alivia meu dia?",
              ].map((sug) => (
                <button
                  key={sug}
                  onClick={() => setTextoLivre(sug)}
                  className="text-[11px] px-2.5 py-1 rounded-full cursor-pointer"
                  style={{ background: t.cardSubtle, color: t.textSoft }}
                >
                  "{sug}"
                </button>
              ))}
            </div>

            {/* Resposta Imediata da Lala + Ações 1-Toque */}
            {ultimaInteracao && (
              <div
                style={{ background: t.cardSubtle, borderColor: t.border }}
                className="p-3.5 rounded-2xl border space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span
                    style={{ color: t.primary }}
                    className="text-[11px] font-bold flex items-center gap-1.5"
                  >
                    <Sparkles size={12} /> {ultimaInteracao.tituloCard || "Lala"}
                  </span>
                  <span
                    style={{ color: t.textSoft }}
                    className="text-[10px] font-mono"
                  >
                    {ultimaInteracao.dataHora}
                  </span>
                </div>

                {ultimaInteracao.nomeAnexo && (
                  <div
                    style={{ backgroundColor: t.card, borderColor: t.border }}
                    className="px-2.5 py-1.5 rounded-xl border text-[11px] flex items-center gap-1.5"
                  >
                    <Paperclip size={12} style={{ color: t.primary }} />
                    <span className="font-semibold truncate">
                      {ultimaInteracao.nomeAnexo}
                    </span>
                  </div>
                )}

                <p className="text-xs leading-relaxed whitespace-pre-line">
                  {ultimaInteracao.respostaLala}
                </p>

                {ultimaInteracao.acoesPropostas &&
                  ultimaInteracao.acoesPropostas.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {ultimaInteracao.acoesPropostas.map((ac) => (
                        <div
                          key={ac.id}
                          style={{
                            backgroundColor: t.card,
                            borderColor: ac.executada ? t.primary : t.border,
                          }}
                          className="p-2.5 rounded-xl border flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">
                              {ac.titulo}
                            </p>
                            <p
                              style={{ color: t.textSoft }}
                              className="text-[10px] truncate"
                            >
                              {ac.detalhe}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              executarAcaoDaLala(ac, ultimaInteracao.id)
                            }
                            disabled={ac.executada}
                            style={{
                              backgroundColor: ac.executada
                                ? t.primary
                                : t.action,
                              color: "#fff",
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-80"
                          >
                            {ac.executada ? (
                              <>
                                <CheckCircle2 size={12} /> Feito
                              </>
                            ) : (
                              <>
                                Confirmar <ArrowRight size={12} />
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}

            <button
              onClick={() => {
                onClose();
                irParaLalaCompleta();
              }}
              style={{
                backgroundColor: `${t.primary}15`,
                color: t.primary,
                borderColor: `${t.primary}35`,
              }}
              className="w-full py-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Abrir Histórico & Espaço Completo da Lala</span>
              <ExternalLink size={13} />
            </button>
          </div>
        )}

        {abaRapida === "gasto" && (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <input
                value={gastoValor}
                onChange={(e) => setGastoValor(e.target.value)}
                placeholder="Valor R$ (ex: 25,90)"
                className="p-3 rounded-xl text-xs font-mono outline-none"
                style={{ background: t.cardSubtle, color: t.text }}
              />
              <select
                value={gastoMetodo}
                onChange={(e) =>
                  setGastoMetodo(
                    e.target.value as "Conta / Pix" | "Cartão de Crédito"
                  )
                }
                className="p-3 rounded-xl text-xs outline-none"
                style={{ background: t.cardSubtle, color: t.text }}
              >
                <option value="Conta / Pix">Conta / Pix</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
              </select>
            </div>
            <input
              value={gastoDesc}
              onChange={(e) => setGastoDesc(e.target.value)}
              placeholder="Descrição (ex: Almoço UERJ, Sachês Urinary)..."
              className="w-full p-3 rounded-xl text-xs outline-none"
              style={{ background: t.cardSubtle, color: t.text }}
            />
            <select
              value={gastoCat}
              onChange={(e) =>
                setGastoCat(e.target.value as OrcamentoCategoria["categoria"])
              }
              className="w-full p-3 rounded-xl text-xs outline-none"
              style={{ background: t.cardSubtle, color: t.text }}
            >
              <option value="Mercado">Mercado</option>
              <option value="Pets">Pets (Nina & Tobias)</option>
              <option value="Transporte">Transporte</option>
              <option value="Estudos & UERJ">Estudos & UERJ</option>
              <option value="Moradia & Fixos">Moradia & Fixos</option>
              <option value="Dívida">Dívida</option>
              <option value="Lazer & Outros">Lazer & Outros</option>
            </select>
            <button
              onClick={salvarGastoManual}
              className="w-full py-3 rounded-2xl text-xs font-semibold text-white cursor-pointer"
              style={{ background: t.finance }}
            >
              Registrar lançamento
            </button>
          </div>
        )}

        {abaRapida === "tarefa" && (
          <div className="space-y-2.5">
            <input
              value={tarefaTexto}
              onChange={(e) => setTarefaTexto(e.target.value)}
              placeholder="O que precisa ser feito?"
              className="w-full p-3 rounded-xl text-xs outline-none"
              style={{ background: t.cardSubtle, color: t.text }}
            />
            <div className="flex items-center justify-between gap-2">
              <select
                value={tarefaCategoria}
                onChange={(e) =>
                  setTarefaCategoria(
                    e.target.value as Exclude<TaskCategoryFilter, "todas">
                  )
                }
                className="flex-1 p-3 rounded-xl text-xs outline-none"
                style={{ background: t.cardSubtle, color: t.text }}
              >
                <option value="uerj">UERJ & Estudos</option>
                <option value="trabalho">Trabalho (CDT / RCR)</option>
                <option value="casa">Casa & Gatos</option>
                <option value="pessoal">Pessoal / Treino</option>
              </select>
              <button
                onClick={() => setTarefaTravaP1((v) => !v)}
                className="px-3 py-3 rounded-xl text-xs font-semibold cursor-pointer"
                style={{
                  background: tarefaTravaP1 ? t.action : t.cardSubtle,
                  color: tarefaTravaP1 ? "#fff" : t.textSoft,
                }}
              >
                Fixar em P1
              </button>
            </div>
            <button
              onClick={salvarTarefaManual}
              className="w-full py-3 rounded-2xl text-xs font-semibold text-white cursor-pointer"
              style={{ background: t.action }}
            >
              Criar tarefa agora
            </button>
          </div>
        )}

        {abaRapida === "pets" && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                alimentarPet(1);
                onClose();
              }}
              className="p-3 rounded-2xl text-xs font-semibold text-left space-y-1 cursor-pointer"
              style={{ background: t.cardSubtle, color: t.text }}
            >
              <PawPrint size={16} style={{ color: t.primary }} />
              <p>Alimentar Nina</p>
              <p className="text-[10px]" style={{ color: t.textSoft }}>
                Baixa 1 sachê/ração do estoque
              </p>
            </button>
            <button
              onClick={() => {
                alimentarPet(2);
                onClose();
              }}
              className="p-3 rounded-2xl text-xs font-semibold text-left space-y-1 cursor-pointer"
              style={{ background: t.cardSubtle, color: t.text }}
            >
              <PawPrint size={16} style={{ color: t.primary }} />
              <p>Alimentar Tobias</p>
              <p className="text-[10px]" style={{ color: t.textSoft }}>
                Baixa 1 sachê/ração do estoque
              </p>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
