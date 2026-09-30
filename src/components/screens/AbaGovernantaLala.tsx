import React, { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import {
  AcaoGovernanta,
  AnexoLala,
  ArquivoRepositorio,
  CartaoCredito,
  CheckinProntidao,
  Compromisso,
  ContaBancaria,
  Disciplina,
  HabitoDiario,
  InteracaoGovernanta,
  ItemListaCompras,
  ItemRefeicao,
  MatrizDecisaoLala,
  PerfilUsuarioCalibrado,
  PetPerfil,
  ProjetoTrabalho,
  TabId,
  TaskItem,
  ThemeTokens,
  TomGovernanta,
} from "../../types/lala";
import {
  consultarLalaUnificada,
  falarTextoComVozDaLala,
  formatarTamanhoBytes,
  lerArquivoParaAnexo,
  pararVozDaLala,
} from "../../services/lalaEngine";
import { LalaAppActionCard } from "../LalaAppActionCard";

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
  repositorio: ArquivoRepositorio[];
  perfilCalibrado?: PerfilUsuarioCalibrado;
  setPerfilCalibrado?: React.Dispatch<React.SetStateAction<PerfilUsuarioCalibrado>>;
  onExecutarAcao: (acao: AcaoGovernanta, interacaoId?: number) => void;
  onIrParaAba?: (aba: TabId) => void;
  showToast: (msg: string) => void;
}

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
  repositorio,
  perfilCalibrado,
  setPerfilCalibrado,
  onExecutarAcao,
  onIrParaAba,
  showToast,
}: AbaGovernantaLalaProps) {
  const [mensagem, setMensagem] = useState("");
  const [gravando, setGravando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [anexosAtuais, setAnexosAtuais] = useState<AnexoLala[]>([]);
  const [painelPerfilAberto, setPainelPerfilAberto] = useState(false);

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const timerGravacaoRef = useRef<number | null>(null);
  const cancelarGravacaoRef = useRef<boolean>(false);
  const transcricaoAcumuladaRef = useRef<string>("");

  const interacoesCronologicas = [...interacoes].reverse();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interacoes.length, processando]);

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

    setCarregandoVozId(interacaoId);
    setIdFalandoAgora(null);

    await falarTextoComVozDaLala(
      texto,
      tom,
      () => {
        setCarregandoVozId(null);
        setIdFalandoAgora(interacaoId);
      },
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
      const lidos = await Promise.all(
        files.map(async (f) => {
          const lido = await lerArquivoParaAnexo(f);
          return { ...lido, intencao: "interpretar" as const };
        })
      );
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
      const lidos = await Promise.all(
        imageFiles.map(async (f) => {
          const lido = await lerArquivoParaAnexo(f);
          return { ...lido, intencao: "interpretar" as const };
        })
      );
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
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.lang = "pt-BR";
        rec.continuous = true;
        rec.interimResults = true;
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
            const dataUrl = typeof reader.result === "string" ? reader.result : "";
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
        showToast("Permita o acesso ao microfone no navegador para falar com a Lala.");
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

  const enviarMensagemParaLala = async (
    textoCustom?: string,
    anexosOverride?: AnexoLala[],
    veioDeVoz?: boolean
  ) => {
    const texto = (textoCustom ?? mensagem).trim();
    const listaAnexos = anexosOverride ?? anexosAtuais;
    if (!texto && listaAnexos.length === 0) return;

    const msgEnviada =
      texto ||
      (listaAnexos.length === 1
        ? `Analise a imagem/arquivo "${listaAnexos[0].nome}" e atualize o que for necessário no aplicativo.`
        : `Analise estas ${listaAnexos.length} imagens/arquivos e atualize os dados no aplicativo.`);

    setMensagem("");
    setAnexosAtuais([]);
    setProcessando(true);

    try {
      const resultado = await consultarLalaUnificada({
        mensagem: msgEnviada,
        tom,
        anexo: listaAnexos[0],
        anexos: listaAnexos,
        contexto: {
          prontidaoScore,
          horasSono: checkin.horasSono,
          dinheiroLivreHoje,
          sachesEstoque: petsPerfil[0]?.estoqueSaches ?? 6,
          tarefasPendentesHoje: tarefas.filter((tk) => !tk.feito).map((tk) => tk.texto),
          compromissosHoje: compromissos.map((c) => `${c.hora} ${c.titulo}`),
          disciplinasUERJ: disciplinas.map(
            (d) => `${d.nome} (${d.horarioSala}) Faltas: ${d.faltasAtuais}/${d.faltasMax}`
          ),
          projetosAtivos: projetos.map((p) => `${p.nome}: ${p.tarefa}`),
          refeicoesDia: refeicoes.map(
            (r) => `${r.horario} ${r.nome}: ${r.descricao} (${r.proteinaG}g P)`
          ),
          listaComprasPendentes: listaCompras
            .filter((i) => !i.comprado)
            .map((i) => `${i.nome} (${i.quantidadeComprar} ${i.unidade})`),
          habitosDia: habitos.map((h) => `${h.titulo} (${h.metaTexto})`),
          contasBancarias: contas.map(
            (c) => `${c.nome} (${c.tipo}): R$ ${c.saldoAtual.toFixed(2)}`
          ),
          cartoesCredito: cartoes.map(
            (cc) =>
              `${cc.nome}: Fatura R$ ${cc.faturaAtual.toFixed(2)} / Limite R$ ${cc.limiteTotal.toFixed(2)}`
          ),
          nomeUsuario: perfilCalibrado?.nomeUsuario,
          instrucoesPersonalizadasLala:
            perfilCalibrado?.instrucoesPersonalizadasLala,
          historicoRecente: interacoes.slice(0, 6).map((it) => ({
            usuario: it.mensagemUsuario,
            lala: it.respostaLala,
          })),
        },
      });

      const autoExecutar = perfilCalibrado?.autonomiaLala !== "confirmar";
      const acoesProcessadas = resultado.acoesPropostas.map((ac) => {
        if (autoExecutar && !ac.executada) {
          onExecutarAcao(ac);
          return { ...ac, executada: true };
        }
        return ac;
      });

      const novaInteracaoId = Date.now();
      const novaInteracao: InteracaoGovernanta = {
        id: novaInteracaoId,
        dataHora: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        mensagemUsuario: msgEnviada,
        ...resultado,
        acoesPropostas: acoesProcessadas,
      };

      setInteracoes((prev) => [novaInteracao, ...prev]);

      if (vozAutomaticaLala || veioDeVoz) {
        reproduzirFalaDaLala(novaInteracaoId, resultado.respostaLala);
      }
    } finally {
      setProcessando(false);
    }
  };

  const renderMatrizComparativa = (matriz: MatrizDecisaoLala) => (
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

  return (
    <div
      className="flex flex-col h-[calc(100vh-140px)] min-h-[540px] max-h-[840px] rounded-3xl border overflow-hidden shadow-sm"
      style={{ backgroundColor: t.card, borderColor: t.border }}
    >
      {/* CABEÇALHO REFINADO DO BATE-PAPO */}
      <div
        className="px-4 sm:px-5 py-3.5 border-b flex items-center justify-between gap-2 shrink-0"
        style={{
          background: `linear-gradient(180deg, ${t.card} 0%, ${t.bg} 100%)`,
          borderColor: t.border,
        }}
      >
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
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold truncate" style={{ color: t.text }}>
                Governanta Lala
              </h2>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline-block"
                style={{ backgroundColor: `${t.primary}18`, color: t.primary }}
              >
                Visão & Voz Ativas
              </span>
            </div>
            <p className="text-[11px] truncate" style={{ color: t.textSoft }}>
              Converse, envie múltiplos prints de contas/extratos ou peça qualquer alteração no app
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Seletor de Tom */}
          <select
            value={tom}
            onChange={(e) => setTom(e.target.value as TomGovernanta)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border outline-none cursor-pointer"
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
            {vozAutomaticaLala ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span className="hidden sm:inline">
              {vozAutomaticaLala ? "Voz ON" : "Mudo"}
            </span>
          </button>

          {/* Botão Editar Dados do Perfil & Memória */}
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

          {interacoes.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setInteracoes((prev) => prev.slice(0, 1));
                showToast("Histórico de conversa limpo.");
              }}
              className="p-1.5 rounded-xl border cursor-pointer hover:opacity-80"
              style={{
                backgroundColor: t.card,
                color: t.textSoft,
                borderColor: t.border,
              }}
              title="Limpar histórico de mensagens"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* PAINEL INLINE EDITÁVEL: MEUS DADOS & MEMÓRIA DA LALA (SUBSTITUI A ANTIGA CALIBRAGEM) */}
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
              <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: t.textSoft }}>
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
                style={{ backgroundColor: t.card, color: t.text, borderColor: t.border }}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: t.textSoft }}>
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
                style={{ backgroundColor: t.card, color: t.text, borderColor: t.border }}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: t.textSoft }}>
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
                style={{ backgroundColor: t.card, color: t.text, borderColor: t.border }}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: t.textSoft }}>
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
                style={{ backgroundColor: t.card, color: t.text, borderColor: t.border }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: t.textSoft }}>
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
                style={{ backgroundColor: t.card, color: t.text, borderColor: t.border }}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: t.textSoft }}>
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
                style={{ backgroundColor: t.card, color: t.text, borderColor: t.border }}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: t.textSoft }}>
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
                style={{ backgroundColor: t.card, color: t.text, borderColor: t.border }}
              />
            </div>
            <div className="col-span-3 sm:col-span-1">
              <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: t.textSoft }}>
                Modo de Ação da Lala
              </label>
              <select
                value={perfilCalibrado.autonomiaLala || "auto"}
                onChange={(e) =>
                  setPerfilCalibrado((prev) => ({
                    ...prev,
                    autonomiaLala: e.target.value as "auto" | "confirmar",
                    calibrado: true,
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-xl text-xs border outline-none"
                style={{ backgroundColor: t.card, color: t.text, borderColor: t.border }}
              >
                <option value="auto">Aplicar direto no App</option>
                <option value="confirmar">Pedir confirmação antes</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ÁREA DE MENSAGENS (ESTILO MENSAGEIRO MODERNO COM WIDGETS VISUAIS DO APP) */}
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
                        listaAnexosMsg.length > 1 ? "grid-cols-2" : "grid-cols-1"
                      }`}
                    >
                      {listaAnexosMsg.map((anx, idx) =>
                        anx.mimeType.startsWith("image/") && anx.base64 ? (
                          <img
                            key={idx}
                            src={`data:${anx.mimeType};base64,${anx.base64}`}
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

              {/* Balão da Lala (Esquerda) + Destaque Visual das Partes do App Alteradas */}
              <div className="flex items-start gap-2.5 sm:gap-3">
                <div
                  className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 text-white mt-0.5 shadow-2xs"
                  style={{
                    background: `linear-gradient(135deg, ${t.primary}, ${t.action})`,
                  }}
                >
                  <Sparkles size={14} />
                </div>

                <div className="max-w-[92%] sm:max-w-[82%] space-y-2.5 flex-1">
                  {/* Texto conversacional da Lala */}
                  <div
                    className="rounded-3xl rounded-tl-md p-4 border shadow-xs space-y-2.5"
                    style={{ backgroundColor: t.card, borderColor: t.border }}
                  >
                    <p
                      className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap"
                      style={{ color: t.text }}
                    >
                      {it.respostaLala}
                    </p>

                    {it.matrizDecisao &&
                      renderMatrizComparativa(it.matrizDecisao)}

                    {/* Rodapé do balão: Ouvir resposta + Horário */}
                    <div className="flex items-center justify-between pt-1">
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

                      <span
                        className="text-[10px] font-mono-num"
                        style={{ color: t.textSoft }}
                      >
                        Lala · {it.dataHora}
                      </span>
                    </div>
                  </div>

                  {/* DESTAQUE VISUAL DE COMPONENTES DO APP ALTERADOS PELA LALA */}
                  {it.acoesPropostas && it.acoesPropostas.length > 0 && (
                    <div className="space-y-2 pl-0.5">
                      <div className="flex items-center gap-1.5 px-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: t.primary }}
                        />
                        <span
                          className="text-[10px] font-extrabold uppercase tracking-wider"
                          style={{ color: t.textSoft }}
                        >
                          Alterações realizadas no aplicativo ({it.acoesPropostas.length})
                        </span>
                      </div>

                      <div className="space-y-2">
                        {it.acoesPropostas.map((ac) => (
                          <LalaAppActionCard
                            key={ac.id}
                            t={t}
                            acao={ac}
                            onExecutar={() => onExecutarAcao(ac, it.id)}
                            onIrParaModulo={onIrParaAba}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {processando && (
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
              <span>Lala está analisando e atualizando o aplicativo...</span>
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

        {/* Strip de Previews quando há 1 ou várias imagens selecionadas */}
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
                    src={`data:${anx.mimeType};base64,${anx.base64}`}
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
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-2xl border shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                backgroundColor:
                  anexosAtuais.length > 0 ? `${t.primary}18` : t.bg,
                color: anexosAtuais.length > 0 ? t.primary : t.textSoft,
                borderColor:
                  anexosAtuais.length > 0 ? t.primary : t.border,
              }}
              title="Anexar 1 ou várias imagens, prints de contas, PDFs ou planilhas"
            >
              <Paperclip size={18} />
            </button>

            <textarea
              rows={1}
              value={mensagem}
              onPaste={handlePaste}
              onChange={(e) => setMensagem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviarMensagemParaLala();
                }
              }}
              placeholder={
                anexosAtuais.length > 0
                  ? `Diga o que a Lala deve fazer com os ${anexosAtuais.length} arquivo(s)...`
                  : "Converse com a Lala, cole prints (Ctrl+V) ou peça alterações no app..."
              }
              className="flex-1 px-4 py-3 rounded-2xl text-xs sm:text-sm outline-none border resize-none max-h-32"
              style={{
                backgroundColor: t.bg,
                color: t.text,
                borderColor: t.border,
              }}
            />

            <button
              type="button"
              onClick={iniciarGravacaoDeVoz}
              className="p-3 rounded-2xl border shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: t.bg,
                color: t.primary,
                borderColor: t.border,
              }}
              title="Gravar áudio para a Lala"
            >
              <Mic size={18} />
            </button>

            <button
              type="button"
              disabled={
                processando ||
                (!mensagem.trim() && anexosAtuais.length === 0)
              }
              onClick={() => enviarMensagemParaLala()}
              className="p-3 rounded-2xl text-white shrink-0 cursor-pointer disabled:opacity-40 transition-all"
              style={{ backgroundColor: t.primary }}
              title="Enviar mensagem"
            >
              <Send size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
