import React, { useEffect, useRef, useState } from "react";
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
  SlidersHorizontal,
  MessageCircle,
  Volume2,
  Square,
  Trash2,
} from "lucide-react";
import {
  AcaoGovernanta,
  AnexoLala,
  ArquivoRepositorio,
  CartaoCredito,
  CheckinProntidao,
  ContaBancaria,
  Disciplina,
  IntencaoImportacaoArquivo,
  InteracaoGovernanta,
  LancamentoFinanceiro,
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
  consolidarMemoriaAntesDeLimparChat,
  consultarLalaUnificada,
  falarTextoComVozDaLala,
  formatarTamanhoBytes,
  lerArquivoParaAnexo,
  pararVozDaLala,
} from "../services/lalaEngine";
import { LalaAppActionCard } from "./LalaAppActionCard";

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
  contas?: ContaBancaria[];
  cartoes?: CartaoCredito[];
  lancamentos?: LancamentoFinanceiro[];
  perfilCalibrado?: PerfilUsuarioCalibrado;
  setPerfilCalibrado?: React.Dispatch<React.SetStateAction<PerfilUsuarioCalibrado>>;
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
  irParaLalaCompleta: () => void;
  executarAcaoDaLala: (acao: AcaoGovernanta, interacaoId?: number) => void;
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
  contas = [],
  cartoes = [],
  lancamentos = [],
  perfilCalibrado,
  setPerfilCalibrado,
  irParaLalaCompleta,
  executarAcaoDaLala,
  onDesfazerAcao,
  onRecusarAcao,
  onEditarEExecutarAcao,
  onToggleAutomacaoTipo,
  onOpenCalibracao,
  showToast,
}: SmartBrainModalProps) {
  const [abaRapida, setAbaRapida] = useState<
    "lala" | "gasto" | "tarefa" | "pets"
  >("lala");
  const [textoLivre, setTextoLivre] = useState("");
  const [gravandoVoz, setGravandoVoz] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [anexosAtuais, setAnexosAtuais] = useState<AnexoLala[]>([]);
  const [pastaGuardar] = useState<ArquivoRepositorio["area"]>("Pessoal");
  const [falandoId, setFalandoId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const miniChatScrollRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

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

  useEffect(() => {
    if (open && abaRapida === "lala" && miniChatScrollRef.current) {
      miniChatScrollRef.current.scrollTo({
        top: miniChatScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [open, abaRapida, interacoesLala.length, processando]);

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
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const filesArray: File[] = Array.from(files);
    try {
      const lidos = await Promise.all(
        filesArray.map((f) => lerArquivoParaAnexo(f, "auto", pastaGuardar))
      );
      setAnexosAtuais((prev) => [...prev, ...lidos]);
      showToast(
        lidos.length === 1
          ? `"${lidos[0].nome}" anexado!`
          : `${lidos.length} imagens/arquivos anexados!`
      );
    } catch {
      showToast("Não foi possível ler este arquivo.");
    } finally {
      e.target.value = "";
    }
  };

  const iniciarReconhecimentoVoz = async () => {
    if (gravandoVoz && mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      return;
    }

    pararVozDaLala();
    setFalandoId(null);
    audioChunksRef.current = [];
    let transcricaoCapturada = "";

    const SpeechRec =
      (
        window as unknown as {
          SpeechRecognition?: unknown;
          webkitSpeechRecognition?: unknown;
        }
      ).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let recognition: any = null;
    if (SpeechRec) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition = new (SpeechRec as any)();
        recognition.lang = "pt-BR";
        recognition.continuous = true;
        recognition.interimResults = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let parcial = "";
          for (let i = 0; i < event.results.length; i++) {
            parcial += event.results[i][0].transcript + " ";
          }
          transcricaoCapturada = parcial.trim();
          setTextoLivre(transcricaoCapturada);
        };
        recognition.start();
      } catch {
        // ignore
      }
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            audioChunksRef.current.push(ev.data);
          }
        };
        recorder.onstop = async () => {
          setGravandoVoz(false);
          if (recognition) {
            try {
              recognition.stop();
            } catch {
              // ignore
            }
          }
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((tr) => tr.stop());
            mediaStreamRef.current = null;
          }
          const mimeType = recorder.mimeType || "audio/webm";
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          if (blob.size > 0) {
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(String(reader.result || ""));
              reader.readAsDataURL(blob);
            });
            const anexoAudio: AnexoLala = {
              nome: "Áudio de voz",
              mimeType,
              tamanhoBytes: blob.size,
              base64,
              intencao: "auto",
              guardarCopiaNoSegundoCerebro: false,
            };
            await falarComALala(
              "auto",
              transcricaoCapturada || "🎤 [Mensagem de Áudio]",
              undefined,
              false,
              anexoAudio,
              true
            );
          }
        };
        recorder.start();
        setGravandoVoz(true);
        return;
      } catch {
        setGravandoVoz(false);
      }
    }

    showToast("Toque no microfone e permita o acesso para conversar por áudio com a Lala.");
  };

  // Falar com a Lala (Unificado: voz, texto ou 1/vários arquivos/imagens anexados)
  const falarComALala = async (
    intencaoForcada?: IntencaoImportacaoArquivo,
    promptForcado?: string,
    pastaEscolhida?: ArquivoRepositorio["area"],
    guardarCopia = true,
    anexoAudioDireto?: AnexoLala,
    responderEmVoz = false
  ) => {
    const txt = (promptForcado ?? textoLivre).trim();
    const listaBase = anexoAudioDireto ? [anexoAudioDireto] : anexosAtuais;
    if (!txt && listaBase.length === 0) return;
    const lower = txt.toLowerCase();

    const listaParaEnviar: AnexoLala[] = listaBase.map((ab) => ({
      ...ab,
      intencao: intencaoForcada || ab.intencao || "auto",
      areaRepositorio: pastaEscolhida || pastaGuardar,
      guardarCopiaNoSegundoCerebro: anexoAudioDireto ? false : guardarCopia,
    }));

    setProcessando(true);
    setTextoLivre("");
    if (!anexoAudioDireto) setAnexosAtuais([]);

    const historicoConversa = [...interacoesLala]
      .filter((it) => !it.processandoResposta)
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
      tomLala: perfilCalibrado?.tomLala,
      autonomiaLala: perfilCalibrado?.autonomiaLala ?? "confirmar",
      tiposAutomatizados: perfilCalibrado?.tiposAutomatizados || [],
      regrasAprendidasLala: perfilCalibrado?.regrasAprendidasLala || [],
      itensMemoriaViva: perfilCalibrado?.itensMemoriaViva || [],
      instrucoesPersonalizadasLala:
        perfilCalibrado?.instrucoesPersonalizadasLala,
      horarioAcordar: perfilCalibrado?.horarioAcordar,
      horarioDormir: perfilCalibrado?.horarioDormir,
      historicoConversa,
    };

    const idNova = Date.now();
    const agoraHoraEnvio = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const msgEfetiva =
      txt ||
      (listaParaEnviar.length > 0
        ? `Lala, analise ${
            listaParaEnviar.length === 1
              ? `a imagem/arquivo "${listaParaEnviar[0].nome}"`
              : `estas ${listaParaEnviar.length} imagens/arquivos`
          } e atualize o aplicativo para mim.`
        : "");

    // Persiste a mensagem imediatamente antes da chamada à IA
    const interacaoPendente: InteracaoGovernanta = {
      id: idNova,
      dataHora: agoraHoraEnvio,
      modo: "comando",
      processandoResposta: true,
      mensagemUsuario:
        msgEfetiva === "🎤 [Mensagem de Áudio]"
          ? "🎤 Mensagem de áudio enviada"
          : msgEfetiva,
      respostaLala: "Analisando sua mensagem e preparando tudo...",
      anexo: listaParaEnviar.length > 0 ? listaParaEnviar[0] : undefined,
      anexos: listaParaEnviar.length > 0 ? listaParaEnviar : undefined,
      acoesPropostas: [],
    };
    setInteracoesLala((prev) => [interacaoPendente, ...prev]);

    try {
      let anexosParaAnalise = listaParaEnviar;
      if (
        listaParaEnviar.length === 0 &&
        /\b(print|prints|foto|fotos|imagem|imagens|anexo|anexos|leu|ler|leia|faltou|esqueceu|errado|errou|novamente|de novo|tente|tenta|conta|contas|saldo|saldos|banco|picpay|nubank|inter|ita[uú]|cart[aã]o|fatura|finan[çc]as)\b/i.test(
          msgEfetiva
        )
      ) {
        const interacaoComAnexo = interacoesLala
          .slice(0, 12)
          .find(
            (it) =>
              it.id !== idNova &&
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

      const resultado = await consultarLalaUnificada(
        msgEfetiva,
        ctx,
        anexosParaAnalise
      );

      // Respeita o modo de confirmação por padrão e as automações progressivas por tipo
      const modoGlobal = perfilCalibrado?.autonomiaLala ?? "confirmar";
      const tiposAuto = perfilCalibrado?.tiposAutomatizados || [];
      const agoraHora = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

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
                  id: `mem-modal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
            if (atuais.includes(regra)) return prev;
            return {
              ...prev,
              regrasAprendidasLala: [regra, ...atuais],
            };
          });
        }
      }

      const acoesMarcadas = (resultado.acoesPropostas || []).map((a) => {
        const deveAutoExecutar =
          modoGlobal === "auto" || tiposAuto.includes(a.tipo);
        if (deveAutoExecutar && !a.executada) {
          executarAcaoDaLala(a, idNova);
          return { ...a, executada: true, executadaEm: agoraHora };
        }
        return { ...a, executada: false };
      });

      const novaInteracao: InteracaoGovernanta = {
        id: idNova,
        dataHora: agoraHora,
        processandoResposta: false,
        mensagemUsuario:
          resultado.transcricaoAudioUsuario ||
          (msgEfetiva === "🎤 [Mensagem de Áudio]"
            ? "🎤 Mensagem de áudio enviada"
            : msgEfetiva),
        ...resultado,
        anexo:
          listaParaEnviar.length > 0
            ? resultado.anexo || listaParaEnviar[0]
            : undefined,
        anexos:
          listaParaEnviar.length > 0
            ? resultado.anexos && resultado.anexos.length > 0
              ? resultado.anexos
              : listaParaEnviar
            : undefined,
        acoesPropostas: acoesMarcadas,
      };

      setInteracoesLala((prev) => {
        const existe = prev.some((it) => it.id === idNova);
        if (existe) {
          return prev.map((it) => (it.id === idNova ? novaInteracao : it));
        }
        return [novaInteracao, ...prev];
      });

      const vozAtivaSalva =
        typeof window !== "undefined" &&
        window.localStorage.getItem("casa_lala_voz_ativa") !== "0";
      if (responderEmVoz || vozAtivaSalva) {
        setFalandoId(idNova);
        falarTextoComVozDaLala(
          resultado.respostaLala,
          perfilCalibrado?.tomLala,
          undefined,
          () => setFalandoId((curr) => (curr === idNova ? null : curr))
        ).then(({ audioBase64 }) => {
          if (audioBase64) {
            setInteracoesLala((prev) =>
              prev.map((it) =>
                it.id === idNova ? { ...it, audioLalaBase64: audioBase64 } : it
              )
            );
          }
        });
      }
    } catch {
      setInteracoesLala((prev) =>
        prev.map((it) =>
          it.id === idNova
            ? {
                ...it,
                processandoResposta: false,
                respostaLala:
                  "Tive uma oscilação momentânea, mas sua mensagem está salva no bate-papo. Você pode reanalisar na aba da Lala!",
              }
            : it
        )
      );
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

  const ultimasMensagensChat = [...interacoesLala.slice(0, 5)].reverse();
  const ultimaInteracao = interacoesLala[0];
  const sugestoesRapidas =
    ultimaInteracao?.sugestoesResposta &&
    ultimaInteracao.sugestoesResposta.length > 0
      ? ultimaInteracao.sugestoesResposta
      : [
          "Oi Lala! Como está meu dia hoje?",
          "18,50 padaria no Pix",
          "Agendar reunião amanhã às 14h",
          "Tô cansada hoje, alivia meu dia?",
        ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 backdrop-blur-xs"
        style={{ background: "rgba(0,0,0,0.52)" }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-[500px] rounded-t-[30px] p-5 pb-8 shadow-2xl space-y-3.5 max-h-[92vh] overflow-y-auto"
        style={{ background: t.card, color: t.text }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                style={{
                  background: `linear-gradient(135deg, ${t.primary}, ${t.action})`,
                  color: "#fff",
                }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
              >
                <Sparkles size={18} />
              </div>
              <span
                className="w-2.5 h-2.5 rounded-full border-2 absolute -bottom-0.5 -right-0.5"
                style={{
                  backgroundColor: "#22c55e",
                  borderColor: t.card,
                }}
              />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                Bate-Papo Rápido com a Lala
              </h2>
              <p style={{ color: t.textSoft }} className="text-[11px] mt-0.5">
                Converse por voz ou texto, tire dúvidas, lance comandos ou suba
                arquivos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {(interacoesLala.length > 1 ||
              (interacoesLala.length === 1 && interacoesLala[0]?.id !== 1)) && (
              <button
                onClick={() => {
                  const consolidado = consolidarMemoriaAntesDeLimparChat(
                    interacoesLala,
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
                  const agoraHora = new Date().toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  setInteracoesLala([
                    {
                      id: 1,
                      dataHora: agoraHora,
                      modo: "informacao",
                      tituloCard: "Bate-Papo com a Lala",
                      tags: ["Memória Preservada", "Governanta"],
                      mensagemUsuario: "Oi Lala!",
                      respostaLala:
                        "Limpei o histórico visual do nosso bate-papo, mas fique tranquila: todas as suas informações importantes, preferências, regras e aprendizados continuam 100% guardados na minha Memória Viva!",
                      guardadoNoCofre: true,
                      acoesPropostas: [],
                    },
                  ]);
                  showToast(
                    "Chat limpo! As memórias e informações importantes da Lala foram preservadas."
                  );
                }}
                style={{ background: t.cardSubtle, color: t.textSoft }}
                className="p-2 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                title="Limpar conversa preservando todas as memórias da Lala"
              >
                <Trash2 size={13} />
              </button>
            )}
            <button
              onClick={() => {
                onClose();
                irParaLalaCompleta();
              }}
              style={{ background: t.cardSubtle, color: t.primary }}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              title="Abrir tela cheia do Bate-Papo com a Lala"
            >
              <ExternalLink size={12} /> Tela Cheia
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

        {/* Abas Rápidas: Bate-Papo com a Lala (padrão) ou atalhos diretos */}
        <div
          className="grid grid-cols-4 gap-1 p-1 rounded-2xl"
          style={{ background: t.cardSubtle }}
        >
          {(
            [
              { id: "lala", label: "Bate-Papo", icon: MessageCircle },
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
            {/* MINI JANELA DE BATE-PAPO AO VIVO */}
            <div
              ref={miniChatScrollRef}
              style={{ backgroundColor: t.bg, borderColor: t.border }}
              className="p-3 rounded-2xl border space-y-3 max-h-[270px] overflow-y-auto"
            >
              {ultimasMensagensChat.map((item) => {
                const anexosItem =
                  item.anexos && item.anexos.length > 0
                    ? item.anexos
                    : item.anexo
                    ? [item.anexo]
                    : [];
                return (
                <div key={item.id} className="space-y-2">
                  {/* Balão Usuária */}
                  <div className="flex justify-end">
                    <div
                      style={{
                        background: `linear-gradient(135deg, ${t.primary}, ${t.action})`,
                        color: "#fff",
                      }}
                      className="max-w-[85%] rounded-2xl rounded-tr-xs px-3 py-2 text-xs leading-relaxed shadow-2xs space-y-1.5"
                    >
                      {anexosItem.length > 0 && (
                        <div
                          className={`grid gap-1.5 ${
                            anexosItem.length > 1
                              ? "grid-cols-2"
                              : "grid-cols-1"
                          }`}
                        >
                          {anexosItem.map((anx, idx) =>
                            anx.mimeType.startsWith("image/") && anx.base64 ? (
                              <img
                                key={idx}
                                src={
                                  anx.base64.startsWith("data:")
                                    ? anx.base64
                                    : `data:${anx.mimeType};base64,${anx.base64}`
                                }
                                alt={anx.nome}
                                className="max-h-32 w-full rounded-xl object-cover border border-white/20"
                              />
                            ) : null
                          )}
                        </div>
                      )}
                      <p>{item.mensagemUsuario}</p>
                      <span className="block text-right text-[9px] font-mono opacity-80 mt-0.5">
                        {item.dataHora}
                      </span>
                    </div>
                  </div>

                  {/* Balão Lala */}
                  <div className="flex items-start gap-2">
                    <div
                      style={{
                        background: `linear-gradient(135deg, ${t.primary}, ${t.action})`,
                        color: "#fff",
                      }}
                      className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5"
                    >
                      L
                    </div>
                    <div
                      style={{
                        backgroundColor: t.card,
                        borderColor: t.border,
                        color: t.text,
                      }}
                      className="max-w-[88%] rounded-2xl rounded-tl-xs p-3 border space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            style={{ color: t.primary }}
                            className="text-[10px] font-bold flex items-center gap-1"
                          >
                            <Sparkles size={10} /> {item.tituloCard || "Lala"}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              if (falandoId === item.id) {
                                pararVozDaLala();
                                setFalandoId(null);
                                return;
                              }
                              setFalandoId(item.id);
                              await falarTextoComVozDaLala(
                                item.respostaLala,
                                perfilCalibrado?.tomLala,
                                item.audioLalaBase64,
                                () =>
                                  setFalandoId((curr) =>
                                    curr === item.id ? null : curr
                                  )
                              );
                            }}
                            style={{
                              backgroundColor:
                                falandoId === item.id
                                  ? t.action
                                  : `${t.action}15`,
                              color: falandoId === item.id ? "#fff" : t.action,
                            }}
                            className="px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {falandoId === item.id ? (
                              <>
                                <Square size={8} fill="currentColor" /> Parar
                              </>
                            ) : (
                              <>
                                <Volume2 size={10} /> Ouvir
                              </>
                            )}
                          </button>
                        </div>
                        <span
                          style={{ color: t.textSoft }}
                          className="text-[9px] font-mono"
                        >
                          {item.dataHora}
                        </span>
                      </div>

                      <p className="text-xs leading-relaxed whitespace-pre-line">
                        {item.respostaLala}
                      </p>

                      {item.acoesPropostas &&
                        item.acoesPropostas.length > 0 && (
                          <div className="space-y-1.5 pt-1.5">
                            {item.acoesPropostas.map((ac) => (
                              <LalaAppActionCard
                                key={ac.id}
                                t={t}
                                acao={ac}
                                compact
                                tipoAutomatizado={
                                  (perfilCalibrado?.autonomiaLala ??
                                    "confirmar") === "auto" ||
                                  (
                                    perfilCalibrado?.tiposAutomatizados || []
                                  ).includes(ac.tipo)
                                }
                                confirmacoesDesteTipo={
                                  (perfilCalibrado?.contagemConfirmacoesPorTipo ||
                                    {})[ac.tipo] || 0
                                }
                                onExecutar={() =>
                                  executarAcaoDaLala(ac, item.id)
                                }
                                onDesfazer={
                                  onDesfazerAcao
                                    ? () => onDesfazerAcao(ac.id)
                                    : undefined
                                }
                                onRecusar={
                                  onRecusarAcao
                                    ? () => onRecusarAcao(ac.id, item.id)
                                    : undefined
                                }
                                onEditarEExecutar={
                                  onEditarEExecutarAcao
                                    ? (acaoEditada, nota) =>
                                        onEditarEExecutarAcao(
                                          acaoEditada,
                                          nota,
                                          item.id
                                        )
                                    : undefined
                                }
                                onToggleAutomacaoTipo={onToggleAutomacaoTipo}
                              />
                            ))}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
                );
              })}

              {processando && (
                <div className="flex items-center gap-2 text-xs animate-pulse px-2 py-1">
                  <Sparkles size={13} style={{ color: t.primary }} />
                  <span style={{ color: t.textSoft }}>
                    A Lala está digitando...
                  </span>
                </div>
              )}
            </div>

            {/* Input oculto para 1 ou vários arquivos/fotos */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.csv,.md,.json,.doc,.docx"
              onChange={handleSelecionarArquivo}
              className="hidden"
            />

            {/* Tira compacta de miniaturas quando há imagens anexadas */}
            {anexosAtuais.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {anexosAtuais.map((anx, idx) => (
                  <div
                    key={`${anx.nome}-${idx}`}
                    style={{
                      backgroundColor: t.cardSubtle,
                      borderColor: t.border,
                    }}
                    className="relative shrink-0 rounded-xl border p-1.5 flex items-center gap-2 pr-7"
                  >
                    {anx.mimeType.startsWith("image/") && anx.base64 ? (
                      <img
                        src={anx.base64}
                        alt={anx.nome}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <Paperclip size={14} style={{ color: t.primary }} />
                    )}
                    <div className="max-w-[95px] min-w-0">
                      <p className="text-[11px] font-semibold truncate">
                        {anx.nome}
                      </p>
                      <p
                        style={{ color: t.textSoft }}
                        className="text-[9px] font-mono"
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
                      style={{ backgroundColor: t.card, color: t.text }}
                      className="w-5 h-5 rounded-full border flex items-center justify-center absolute top-1 right-1 cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Barra de entrada do Bate-Papo */}
            <div className="flex gap-1.5 items-end">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer border relative"
                style={{
                  background:
                    anexosAtuais.length > 0 ? `${t.primary}20` : t.cardSubtle,
                  color: t.primary,
                  borderColor: anexosAtuais.length > 0 ? t.primary : t.border,
                }}
                title="Anexar 1 ou várias imagens/arquivos"
              >
                <Paperclip size={18} />
                {anexosAtuais.length > 0 && (
                  <span
                    style={{ backgroundColor: t.primary, color: "#fff" }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  >
                    {anexosAtuais.length}
                  </span>
                )}
              </button>

              <textarea
                rows={2}
                value={textoLivre}
                onChange={(e) => setTextoLivre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    falarComALala();
                  }
                }}
                placeholder="Mensagem para a Lala (Enter pula linha)..."
                className="flex-1 px-3.5 py-2.5 rounded-2xl text-sm outline-none resize-none leading-relaxed min-h-[52px] max-h-36"
                style={{ background: t.cardSubtle, color: t.text }}
              />

              <button
                type="button"
                onClick={iniciarReconhecimentoVoz}
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer"
                style={{
                  background: gravandoVoz ? t.danger : t.action,
                  color: "#fff",
                }}
                title="Falar por voz com a Lala"
              >
                <Mic size={18} />
              </button>

              <button
                type="button"
                onClick={() => falarComALala()}
                disabled={
                  processando ||
                  (!textoLivre.trim() && anexosAtuais.length === 0)
                }
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                style={{
                  background: t.primary,
                  color: "#fff",
                }}
                title="Enviar mensagem para a Lala"
              >
                <Send size={17} />
              </button>
            </div>

            {gravandoVoz && (
              <div
                className="p-2.5 rounded-xl flex items-center justify-between text-xs animate-pulse"
                style={{ background: t.cardSubtle, color: t.action }}
              >
                <span>
                  🎙️ Gravando áudio... toque novamente no microfone para enviar
                </span>
                <span className="font-mono">PT-BR</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                irParaLalaCompleta();
              }}
              style={{
                backgroundColor: `${t.primary}15`,
                color: t.primary,
                borderColor: `${t.primary}35`,
              }}
              className="w-full py-2 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Abrir Bate-Papo em Tela Cheia</span>
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
