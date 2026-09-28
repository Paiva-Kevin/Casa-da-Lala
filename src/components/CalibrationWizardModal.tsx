import React, { useRef, useState } from "react";
import {
  Sparkles,
  X,
  CheckCircle2,
  Wallet,
  GraduationCap,
  Utensils,
  PawPrint,
  UserCheck,
  Upload,
  Plus,
  Trash2,
  ShoppingCart,
  Mic,
  Send,
  SlidersHorizontal,
  Bot,
  ShieldCheck,
} from "lucide-react";
import {
  AnexoLala,
  ArquivoRepositorio,
  CartaoCredito,
  CheckinProntidao,
  ContaBancaria,
  Disciplina,
  IntencaoImportacaoArquivo,
  ItemListaCompras,
  ItemRefeicao,
  PerfilUsuarioCalibrado,
  PetPerfil,
  ThemeTokens,
  TomGovernanta,
} from "../types/lala";
import {
  extrairIngredientesParaListaCompras,
  lerArquivoParaAnexo,
} from "../services/lalaEngine";
import { FileImportChooserCard } from "./FileImportChooserCard";

interface CalibrationWizardModalProps {
  t: ThemeTokens;
  open: boolean;
  onClose: () => void;
  perfilUsuario: PerfilUsuarioCalibrado;
  setPerfilUsuario: React.Dispatch<React.SetStateAction<PerfilUsuarioCalibrado>>;
  contas: ContaBancaria[];
  setContas: React.Dispatch<React.SetStateAction<ContaBancaria[]>>;
  cartoes: CartaoCredito[];
  setCartoes: React.Dispatch<React.SetStateAction<CartaoCredito[]>>;
  disciplinas: Disciplina[];
  setDisciplinas: React.Dispatch<React.SetStateAction<Disciplina[]>>;
  refeicoes: ItemRefeicao[];
  setRefeicoes: React.Dispatch<React.SetStateAction<ItemRefeicao[]>>;
  listaCompras: ItemListaCompras[];
  setListaCompras: React.Dispatch<React.SetStateAction<ItemListaCompras[]>>;
  petsPerfil: PetPerfil[];
  setPetsPerfil: React.Dispatch<React.SetStateAction<PetPerfil[]>>;
  checkin: CheckinProntidao;
  setCheckin: React.Dispatch<React.SetStateAction<CheckinProntidao>>;
  setRepositorio?: React.Dispatch<React.SetStateAction<ArquivoRepositorio[]>>;
  onEnviarAnexoParaLala: (
    anexo: AnexoLala,
    promptInicial: string
  ) => Promise<void>;
  onAbrirLalaComPrompt: (promptInicial: string) => void;
  onLimparDadosExemplo?: () => void;
  showToast: (msg: string) => void;
}

const TONS_LALA: {
  id: TomGovernanta;
  label: string;
  desc: string;
}[] = [
  {
    id: "equilibrada",
    label: "Equilibrada & Prática",
    desc: "Calorosa na medida certa, objetiva e focada em organizar seu dia sem pressão.",
  },
  {
    id: "acolhedora",
    label: "Acolhedora & Gentil",
    desc: "Prioriza seu bem-estar emocional, reduz cobranças e protege seu descanso.",
  },
  {
    id: "executiva",
    label: "Executiva & Direta",
    desc: "Respostas curtas, foco em prazos, números, finanças e execução rápida.",
  },
  {
    id: "treinadora",
    label: "Treinadora de Alta Performance",
    desc: "Motivadora, acompanha metas, consistência de treinos, estudos e hábitos.",
  },
];

export function CalibrationWizardModal({
  t,
  open,
  onClose,
  perfilUsuario,
  setPerfilUsuario,
  contas,
  setContas,
  cartoes,
  setCartoes,
  disciplinas,
  setDisciplinas,
  refeicoes,
  setRefeicoes,
  setListaCompras,
  petsPerfil,
  setPetsPerfil,
  setCheckin,
  setRepositorio,
  onEnviarAnexoParaLala,
  onLimparDadosExemplo,
  showToast,
}: CalibrationWizardModalProps) {
  const [aba, setAba] = useState<
    "lala_ia" | "importar_arquivo" | "rotina" | "financas" | "modulos"
  >("lala_ia");

  const [falaCalibracao, setFalaCalibracao] = useState("");
  const [gravandoVoz, setGravandoVoz] = useState(false);
  const [processandoCalibracaoIA, setProcessandoCalibracaoIA] = useState(false);
  const [ultimoFeedbackLala, setUltimoFeedbackLala] = useState<string | null>(
    null
  );

  // Estado universal para quando o usuário sobe um arquivo dentro da calibração
  const [anexoCalibracao, setAnexoCalibracao] = useState<AnexoLala | null>(
    null
  );
  const fileInputUniversalRef = useRef<HTMLInputElement | null>(null);

  // Inputs para adicionar novos itens rapidamente
  const [novaDiscNome, setNovaDiscNome] = useState("");
  const [novaDiscHorario, setNovaDiscHorario] = useState("");
  const [novaDiscProf, setNovaDiscProf] = useState("");

  const [novaRefHorario, setNovaRefHorario] = useState("08:00");
  const [novaRefNome, setNovaRefNome] = useState("");
  const [novaRefDesc, setNovaRefDesc] = useState("");
  const [novaRefProt, setNovaRefProt] = useState("30");

  if (!open) return null;

  const concluirCalibracao = () => {
    setPerfilUsuario((prev) => ({
      ...prev,
      calibrado: true,
      ultimaCalibracao: new Date().toLocaleDateString("pt-BR"),
    }));
    setCheckin((prev) => ({
      ...prev,
      horasSono: perfilUsuario.metaHorasSono || prev.horasSono,
    }));
    showToast("Calibração da Lala e preferências salvas com sucesso!");
    onClose();
  };

  const iniciarVozCalibracao = () => {
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
          setFalaCalibracao((prev) =>
            prev ? `${prev} ${transcript}` : transcript
          );
          setGravandoVoz(false);
        };
        recognition.onerror = () => setGravandoVoz(false);
        recognition.onend = () => setGravandoVoz(false);
        recognition.start();
        return;
      } catch {
        setGravandoVoz(false);
      }
    }
    showToast("Digite ou use o microfone do teclado para falar com a Lala.");
  };

  const handleCalibrarPorConversa = async () => {
    if (!falaCalibracao.trim()) return;
    const texto = falaCalibracao.trim();
    setProcessandoCalibracaoIA(true);
    try {
      await onEnviarAnexoParaLala(
        {
          nome: "Calibração da Lala",
          mimeType: "text/plain",
          tamanhoBytes: texto.length,
          intencao: "auto",
          guardarCopiaNoSegundoCerebro: false,
        },
        texto
      );
      setPerfilUsuario((prev) => ({
        ...prev,
        calibrado: true,
        ultimaCalibracao: new Date().toLocaleDateString("pt-BR"),
      }));
      setUltimoFeedbackLala(
        `Calibrado! A Lala processou: "${texto.slice(
          0,
          90
        )}${texto.length > 90 ? "..." : ""}" e já atualizou o aplicativo.`
      );
      setFalaCalibracao("");
      showToast("A Lala calibrou o app com o que você disse!");
    } finally {
      setProcessandoCalibracaoIA(false);
    }
  };

  const handleSelecionarArquivoUniversal = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const lido = await lerArquivoParaAnexo(file, "auto", "Pessoal");
      setAnexoCalibracao(lido);
      setAba("importar_arquivo");
      showToast(
        `Arquivo "${file.name}" carregado! Escolha abaixo o que fazer ou importar.`
      );
    } catch {
      showToast("Não foi possível ler o arquivo.");
    } finally {
      e.target.value = "";
    }
  };

  const handleConfirmarImportacaoUniversal = async (
    intencao: IntencaoImportacaoArquivo,
    instrucaoCustom: string,
    pastaDestino: ArquivoRepositorio["area"],
    guardarCopia: boolean
  ) => {
    if (!anexoCalibracao) return;
    setProcessandoCalibracaoIA(true);
    try {
      await onEnviarAnexoParaLala(
        {
          ...anexoCalibracao,
          intencao,
          areaRepositorio: pastaDestino,
          guardarCopiaNoSegundoCerebro: guardarCopia,
        },
        instrucaoCustom
      );
      setUltimoFeedbackLala(
        `Arquivo "${anexoCalibracao.nome}" importado com sucesso pela Lala!`
      );
      setAnexoCalibracao(null);
      showToast(`"${anexoCalibracao.nome}" processado e importado!`);
    } finally {
      setProcessandoCalibracaoIA(false);
    }
  };

  const handleSalvarApenasNoSegundoCerebro = (
    pastaDestino: ArquivoRepositorio["area"],
    tituloCustom?: string
  ) => {
    if (!anexoCalibracao) return;
    if (setRepositorio) {
      const isImg = anexoCalibracao.mimeType.startsWith("image/");
      setRepositorio((prev) => [
        {
          id: Date.now(),
          titulo: tituloCustom || anexoCalibracao.nome,
          area: pastaDestino,
          tipo: isImg ? "Imagem / Foto" : "PDF / Doc",
          urlOuConteudo:
            anexoCalibracao.textoExtraido?.slice(0, 240) ||
            `Arquivo salvo na pasta ${pastaDestino}`,
          dataCriacao: "Hoje",
          fixado: true,
          statusLeitura: "Para Ler",
          anexoBase64: anexoCalibracao.base64,
          mimeType: anexoCalibracao.mimeType,
          nomeArquivoOriginal: anexoCalibracao.nome,
          tamanhoBytes: anexoCalibracao.tamanhoBytes,
        },
        ...prev,
      ]);
    }
    showToast(`"${anexoCalibracao.nome}" salvo em ${pastaDestino}!`);
    setAnexoCalibracao(null);
  };

  const gerarComprasDaDietaAtual = () => {
    const textoTodasRefeicoes = refeicoes
      .map((r) => `${r.nome} ${r.descricao}`)
      .join(" ");
    const extraidos = extrairIngredientesParaListaCompras(textoTodasRefeicoes);
    setListaCompras((prev) => {
      const novos: ItemListaCompras[] = extraidos
        .filter(
          (ext) =>
            !prev.some(
              (p) =>
                !p.comprado &&
                p.nome
                  .toLowerCase()
                  .includes(ext.nome.slice(0, 10).toLowerCase())
            )
        )
        .map((ext, idx) => ({
          id: Date.now() + idx,
          nome: ext.nome,
          categoria: ext.categoria,
          quantidadeComprar: ext.quantidadeComprar,
          unidade: ext.unidade,
          precoEstimado: ext.precoEstimado,
          comprado: false,
        }));
      return [...novos, ...prev];
    });
    showToast(
      `Lala adicionou ${extraidos.length} ingredientes na Lista de Compras!`
    );
  };

  const adicionarDisciplinaManual = () => {
    if (!novaDiscNome.trim()) return;
    const nova: Disciplina = {
      id: Date.now(),
      nome: novaDiscNome.trim(),
      professor: novaDiscProf.trim() || "Docente",
      horarioSala: novaDiscHorario.trim() || "Seg/Qua 08h-10h",
      prazo: "Semestre Atual",
      status: "em dia",
      aulasTotaisSemestre: 30,
      faltasAtuais: 0,
      faltasMax: 7,
      presencas: 0,
      mediaAprovacao: 7.0,
      avaliacoes: [
        {
          id: Date.now() + 1,
          tipo: "P1",
          data: "A definir",
          peso: 1,
          notaObtida: null,
        },
      ],
      leiturasSemana: [],
      linksUteis: [],
      anotacoes: "",
    };
    setDisciplinas((prev) => [...prev, nova]);
    setNovaDiscNome("");
    setNovaDiscHorario("");
    setNovaDiscProf("");
    showToast(`Matéria/Curso "${nova.nome}" adicionado!`);
  };

  const adicionarRefeicaoManual = () => {
    if (!novaRefNome.trim() || !novaRefDesc.trim()) return;
    const prot = parseInt(novaRefProt, 10) || 25;
    const nova: ItemRefeicao = {
      id: Date.now(),
      horario: novaRefHorario || "12:00",
      nome: novaRefNome.trim(),
      descricao: novaRefDesc.trim(),
      proteinaG: prot,
      kcal: prot * 14,
      feito: false,
    };
    setRefeicoes((prev) => [...prev, nova]);
    setNovaRefNome("");
    setNovaRefDesc("");
    showToast(`Refeição "${nova.nome}" adicionada ao cardápio!`);
  };

  const ABAS = [
    { id: "lala_ia", label: "1. Calibrar Lala (IA)", icon: Bot },
    { id: "importar_arquivo", label: "2. Importar Arquivo", icon: Upload },
    { id: "rotina", label: "3. Perfil & Horários", icon: UserCheck },
    { id: "financas", label: "4. Finanças", icon: Wallet },
    { id: "modulos", label: "5. Estudos, Dieta & Pets", icon: SlidersHorizontal },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 backdrop-blur-xs"
        style={{ background: "rgba(0,0,0,0.58)" }}
        onClick={onClose}
      />

      <div
        style={{
          backgroundColor: t.card,
          color: t.text,
          borderColor: t.border,
        }}
        className="relative w-full max-w-3xl rounded-3xl border shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto space-y-4"
      >
        <input
          ref={fileInputUniversalRef}
          type="file"
          accept="image/*,.pdf,.txt,.csv,.md,.json,.doc,.docx"
          onChange={handleSelecionarArquivoUniversal}
          className="hidden"
        />

        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              style={{
                background: `linear-gradient(135deg, ${t.primary}, ${t.action})`,
                color: "#fff",
              }}
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
            >
              <Sparkles size={20} />
            </div>
            <div>
              <span
                style={{
                  backgroundColor: `${t.primary}18`,
                  color: t.primary,
                }}
                className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
              >
                Central de Calibração & Importação Universal
              </span>
              <h2 className="text-base sm:text-lg font-bold mt-0.5">
                Calibre a Lala, suas regras e importe qualquer arquivo
              </h2>
              <p style={{ color: t.textSoft }} className="text-xs">
                Converse com a Lala, ajuste o comportamento dela ou suba um
                arquivo escolhendo exatamente o que fazer com ele.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputUniversalRef.current?.click()}
              style={{
                backgroundColor: `${t.action}15`,
                color: t.action,
                borderColor: `${t.action}40`,
              }}
              className="px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Upload size={13} />
              <span>Subir Arquivo</span>
            </button>
            {onLimparDadosExemplo && (
              <button
                type="button"
                onClick={() => {
                  onLimparDadosExemplo();
                  showToast("Dados de exemplo zerados!");
                }}
                style={{
                  backgroundColor: `${t.danger}16`,
                  color: t.danger,
                  borderColor: `${t.danger}40`,
                }}
                className="px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                title="Apagar todos os dados de exemplo do app para começar limpo"
              >
                <Trash2 size={13} />
                <span>Zerar Exemplos</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{ backgroundColor: t.cardSubtle, color: t.textSoft }}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Barra de Abas Flexível */}
        <div
          style={{ backgroundColor: t.cardSubtle }}
          className="grid grid-cols-2 sm:grid-cols-5 gap-1 p-1 rounded-2xl"
        >
          {ABAS.map((item) => {
            const Icon = item.icon;
            const ativo = aba === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setAba(item.id)}
                style={{
                  backgroundColor: ativo ? t.primary : "transparent",
                  color: ativo ? "#fff" : t.textSoft,
                }}
                className="py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Icon size={13} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {ultimoFeedbackLala && (
          <div
            style={{
              backgroundColor: `${t.primary}15`,
              borderColor: t.primary,
              color: t.text,
            }}
            className="p-3 rounded-2xl border text-xs flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} style={{ color: t.primary }} />
              <span className="font-semibold">{ultimoFeedbackLala}</span>
            </div>
            <button
              type="button"
              onClick={() => setUltimoFeedbackLala(null)}
              className="text-[11px] underline cursor-pointer"
              style={{ color: t.textSoft }}
            >
              Fechar
            </button>
          </div>
        )}

        {/* ABA 1: CALIBRAR A LALA (CONVERSA DIRETA + PERSONALIDADE + REGRAS PESSOAIS) */}
        {aba === "lala_ia" && (
          <div className="space-y-4">
            {/* Caixa de Calibração por Conversa Direta */}
            <div
              style={{
                backgroundColor: `${t.primary}10`,
                borderColor: `${t.primary}40`,
              }}
              className="p-4 rounded-2xl border space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p
                  className="text-xs font-bold flex items-center gap-1.5"
                  style={{ color: t.primary }}
                >
                  <Sparkles size={14} /> Converse com a Lala agora para calibrar
                  qualquer coisa da sua vida
                </p>
                <span className="text-[10px]" style={{ color: t.textSoft }}>
                  Voz ou Texto · Atualiza o app na hora
                </span>
              </div>

              <div className="flex gap-2 items-end">
                <textarea
                  rows={3}
                  value={falaCalibracao}
                  onChange={(e) => setFalaCalibracao(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleCalibrarPorConversa();
                    }
                  }}
                  placeholder='Ex: "Lala, me chamo Maria, meu saldo no Nubank é R$ 1.250, tenho reunião toda terça às 14h, não marque nada antes das 08h e me ajude a manter foco nos entregáveis do trabalho!"'
                  style={{
                    backgroundColor: t.card,
                    color: t.text,
                    borderColor: t.border,
                  }}
                  className="flex-1 p-3 rounded-xl border text-xs outline-none resize-none leading-relaxed"
                />
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={iniciarVozCalibracao}
                    style={{
                      backgroundColor: gravandoVoz ? t.danger : t.card,
                      color: gravandoVoz ? "#fff" : t.action,
                      borderColor: t.border,
                    }}
                    className="w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer"
                    title="Falar por voz"
                  >
                    <Mic size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleCalibrarPorConversa}
                    disabled={processandoCalibracaoIA || !falaCalibracao.trim()}
                    style={{ backgroundColor: t.primary, color: "#fff" }}
                    className="px-3.5 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send size={13} />
                    <span>
                      {processandoCalibracaoIA ? "Calibrando..." : "Aplicar"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Tom de Voz da Lala */}
            <div className="space-y-2">
              <label
                style={{ color: t.textSoft }}
                className="text-[11px] font-bold uppercase block"
              >
                Como você prefere que a Lala converse e aja com você?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TONS_LALA.map((tom) => {
                  const ativo =
                    (perfilUsuario.tomLala || "equilibrada") === tom.id;
                  return (
                    <button
                      key={tom.id}
                      type="button"
                      onClick={() =>
                        setPerfilUsuario((p) => ({ ...p, tomLala: tom.id }))
                      }
                      style={{
                        backgroundColor: ativo ? `${t.primary}18` : t.cardSubtle,
                        borderColor: ativo ? t.primary : t.border,
                        color: t.text,
                      }}
                      className="p-3 rounded-2xl border text-left space-y-1 cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{tom.label}</span>
                        {ativo && (
                          <CheckCircle2
                            size={14}
                            style={{ color: t.primary }}
                          />
                        )}
                      </div>
                      <p
                        style={{ color: t.textSoft }}
                        className="text-[11px] leading-snug"
                      >
                        {tom.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Autonomia da Lala */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  setPerfilUsuario((p) => ({ ...p, autonomiaLala: "auto" }))
                }
                style={{
                  backgroundColor:
                    (perfilUsuario.autonomiaLala || "auto") === "auto"
                      ? `${t.action}16`
                      : t.cardSubtle,
                  borderColor:
                    (perfilUsuario.autonomiaLala || "auto") === "auto"
                      ? t.action
                      : t.border,
                }}
                className="p-3 rounded-2xl border text-left flex items-start gap-2.5 cursor-pointer"
              >
                <Sparkles
                  size={16}
                  style={{ color: t.action }}
                  className="shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-xs font-bold">
                    Autonomia Total (Aplicar na Hora)
                  </p>
                  <p style={{ color: t.textSoft }} className="text-[11px]">
                    Quando você falar um gasto, tarefa ou evento, a Lala já
                    cadastra direto sem pedir confirmação extra.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setPerfilUsuario((p) => ({
                    ...p,
                    autonomiaLala: "confirmar",
                  }))
                }
                style={{
                  backgroundColor:
                    perfilUsuario.autonomiaLala === "confirmar"
                      ? `${t.primary}16`
                      : t.cardSubtle,
                  borderColor:
                    perfilUsuario.autonomiaLala === "confirmar"
                      ? t.primary
                      : t.border,
                }}
                className="p-3 rounded-2xl border text-left flex items-start gap-2.5 cursor-pointer"
              >
                <ShieldCheck
                  size={16}
                  style={{ color: t.primary }}
                  className="shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-xs font-bold">
                    Sempre Pedir Minha Confirmação
                  </p>
                  <p style={{ color: t.textSoft }} className="text-[11px]">
                    A Lala prepara os cartões de ação e aguarda você tocar em
                    "Confirmar / Executar" antes de alterar o app.
                  </p>
                </div>
              </button>
            </div>

            {/* Regras e Instruções Fixas da Usuária para a Lala */}
            <div>
              <label
                style={{ color: t.textSoft }}
                className="text-[11px] font-bold uppercase block mb-1"
              >
                Suas Regras e Instruções Pessoais para a Lala (Memória Fixa)
              </label>
              <textarea
                rows={3}
                value={perfilUsuario.instrucoesPersonalizadasLala || ""}
                onChange={(e) =>
                  setPerfilUsuario((p) => ({
                    ...p,
                    instrucoesPersonalizadasLala: e.target.value,
                  }))
                }
                placeholder="Ex: Não agende compromissos antes das 08:30; quartas à noite são livres; me lembre sempre de beber água; quando eu estiver cansada, sugira blocos curtos de 15 min..."
                style={{
                  backgroundColor: t.cardSubtle,
                  color: t.text,
                  borderColor: t.border,
                }}
                className="w-full p-3 rounded-xl border text-xs outline-none resize-none leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* ABA 2: CENTRAL UNIVERSAL DE UPLOAD E IMPORTAÇÃO DE ARQUIVOS */}
        {aba === "importar_arquivo" && (
          <div className="space-y-4">
            {!anexoCalibracao ? (
              <div
                onClick={() => fileInputUniversalRef.current?.click()}
                style={{
                  backgroundColor: t.cardSubtle,
                  borderColor: t.primary,
                }}
                className="p-6 rounded-3xl border-2 border-dashed text-center space-y-2.5 cursor-pointer hover:opacity-95 transition-opacity"
              >
                <div
                  style={{ backgroundColor: `${t.primary}20`, color: t.primary }}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
                >
                  <Upload size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold">
                    Clique para escolher qualquer arquivo, foto, PDF, print ou
                    planilha
                  </p>
                  <p
                    style={{ color: t.textSoft }}
                    className="text-xs max-w-lg mx-auto mt-1"
                  >
                    Assim que você selecionar o arquivo, você escolhe o que
                    fazer com ele: importar eventos para o Calendário, importar
                    tarefas/projetos, lançar gastos/extrato, criar lista de
                    compras, atualizar estudos/treinos ou apenas guardar no
                    Segundo Cérebro!
                  </p>
                </div>
              </div>
            ) : (
              <FileImportChooserCard
                t={t}
                anexo={anexoCalibracao}
                onClear={() => setAnexoCalibracao(null)}
                onConfirmImport={handleConfirmarImportacaoUniversal}
                onSaveOnly={handleSalvarApenasNoSegundoCerebro}
              />
            )}
          </div>
        )}

        {/* ABA 3: PERFIL, HORÁRIOS & METAS DIÁRIAS */}
        {aba === "rotina" && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  style={{ color: t.textSoft }}
                  className="text-[11px] font-bold uppercase block mb-1"
                >
                  Como a Lala deve te chamar?
                </label>
                <input
                  value={perfilUsuario.nomeUsuario}
                  onChange={(e) =>
                    setPerfilUsuario((p) => ({
                      ...p,
                      nomeUsuario: e.target.value,
                    }))
                  }
                  placeholder="Seu nome ou apelido"
                  style={{
                    backgroundColor: t.cardSubtle,
                    color: t.text,
                    borderColor: t.border,
                  }}
                  className="w-full p-3 rounded-xl border text-xs outline-none"
                />
              </div>
              <div>
                <label
                  style={{ color: t.textSoft }}
                  className="text-[11px] font-bold uppercase block mb-1"
                >
                  Faculdade / Curso ou Área Principal
                </label>
                <input
                  value={perfilUsuario.cursoUERJ}
                  onChange={(e) =>
                    setPerfilUsuario((p) => ({
                      ...p,
                      cursoUERJ: e.target.value,
                    }))
                  }
                  placeholder="Ex: Educação Física — UERJ"
                  style={{
                    backgroundColor: t.cardSubtle,
                    color: t.text,
                    borderColor: t.border,
                  }}
                  className="w-full p-3 rounded-xl border text-xs outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  style={{ color: t.textSoft }}
                  className="text-[11px] font-bold uppercase block mb-1"
                >
                  Frentes de Trabalho / Projetos
                </label>
                <input
                  value={perfilUsuario.frentesTrabalho}
                  onChange={(e) =>
                    setPerfilUsuario((p) => ({
                      ...p,
                      frentesTrabalho: e.target.value,
                    }))
                  }
                  placeholder="Ex: CDT, RCR, Iniciação Científica"
                  style={{
                    backgroundColor: t.cardSubtle,
                    color: t.text,
                    borderColor: t.border,
                  }}
                  className="w-full p-3 rounded-xl border text-xs outline-none"
                />
              </div>
              <div>
                <label
                  style={{ color: t.textSoft }}
                  className="text-[11px] font-bold uppercase block mb-1"
                >
                  Horário habitual de Acordar
                </label>
                <input
                  type="time"
                  value={perfilUsuario.horarioAcordar || "07:00"}
                  onChange={(e) =>
                    setPerfilUsuario((p) => ({
                      ...p,
                      horarioAcordar: e.target.value,
                    }))
                  }
                  style={{
                    backgroundColor: t.cardSubtle,
                    color: t.text,
                    borderColor: t.border,
                  }}
                  className="w-full p-3 rounded-xl border text-xs font-mono outline-none"
                />
              </div>
              <div>
                <label
                  style={{ color: t.textSoft }}
                  className="text-[11px] font-bold uppercase block mb-1"
                >
                  Horário habitual de Dormir
                </label>
                <input
                  type="time"
                  value={perfilUsuario.horarioDormir || "23:00"}
                  onChange={(e) =>
                    setPerfilUsuario((p) => ({
                      ...p,
                      horarioDormir: e.target.value,
                    }))
                  }
                  style={{
                    backgroundColor: t.cardSubtle,
                    color: t.text,
                    borderColor: t.border,
                  }}
                  className="w-full p-3 rounded-xl border text-xs font-mono outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  style={{ color: t.textSoft }}
                  className="text-[11px] font-bold uppercase block mb-1"
                >
                  Meta de Sono por Noite (h)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={perfilUsuario.metaHorasSono}
                  onChange={(e) =>
                    setPerfilUsuario((p) => ({
                      ...p,
                      metaHorasSono: parseFloat(e.target.value) || 7.5,
                    }))
                  }
                  style={{
                    backgroundColor: t.cardSubtle,
                    color: t.text,
                    borderColor: t.border,
                  }}
                  className="w-full p-3 rounded-xl border text-xs font-mono outline-none"
                />
              </div>
              <div>
                <label
                  style={{ color: t.textSoft }}
                  className="text-[11px] font-bold uppercase block mb-1"
                >
                  Meta Diária Proteína (g)
                </label>
                <input
                  type="number"
                  value={perfilUsuario.metaProteinaG}
                  onChange={(e) =>
                    setPerfilUsuario((p) => ({
                      ...p,
                      metaProteinaG: parseInt(e.target.value, 10) || 135,
                    }))
                  }
                  style={{
                    backgroundColor: t.cardSubtle,
                    color: t.text,
                    borderColor: t.border,
                  }}
                  className="w-full p-3 rounded-xl border text-xs font-mono outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: FINANÇAS REAIS (SALDOS & CARTÕES) */}
        {aba === "financas" && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p style={{ color: t.textSoft }} className="text-xs">
                Ajuste o saldo atual das suas contas e a fatura dos cartões para
                o cálculo de <strong>Dinheiro Livre Hoje</strong>:
              </p>
              <button
                type="button"
                onClick={() =>
                  setContas((prev) => [
                    ...prev,
                    {
                      id: Date.now(),
                      nome: "Nova Conta / Reserva",
                      tipo: "Corrente / Pix",
                      saldoAtual: 0,
                      cor: t.primary,
                    },
                  ])
                }
                style={{ backgroundColor: `${t.primary}15`, color: t.primary }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} /> Nova Conta
              </button>
            </div>

            <div className="space-y-2">
              {contas.map((c) => (
                <div
                  key={c.id}
                  style={{
                    backgroundColor: t.cardSubtle,
                    borderColor: t.border,
                  }}
                  className="p-3 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 gap-2 items-center"
                >
                  <input
                    value={c.nome}
                    onChange={(e) =>
                      setContas((prev) =>
                        prev.map((item) =>
                          item.id === c.id
                            ? { ...item, nome: e.target.value }
                            : item
                        )
                      )
                    }
                    style={{ backgroundColor: t.card, color: t.text }}
                    className="p-2.5 rounded-xl text-xs font-semibold outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-mono font-bold"
                      style={{ color: t.textSoft }}
                    >
                      Saldo R$:
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={c.saldoAtual}
                      onChange={(e) =>
                        setContas((prev) =>
                          prev.map((item) =>
                            item.id === c.id
                              ? {
                                  ...item,
                                  saldoAtual: parseFloat(e.target.value) || 0,
                                }
                              : item
                          )
                        )
                      }
                      style={{ backgroundColor: t.card, color: t.primary }}
                      className="flex-1 p-2.5 rounded-xl text-xs font-mono font-bold outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setContas((prev) =>
                          prev.filter((item) => item.id !== c.id)
                        )
                      }
                      style={{ color: t.danger }}
                      className="p-1.5 cursor-pointer"
                      title="Remover conta"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <p
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: t.finance }}
                >
                  Seus Cartões de Crédito
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setCartoes((prev) => [
                      ...prev,
                      {
                        id: Date.now(),
                        nome: "Novo Cartão",
                        limiteTotal: 2000,
                        faturaAtual: 0,
                        fechamentoDia: 20,
                        vencimentoDia: 28,
                        statusFatura: "aberta",
                      },
                    ])
                  }
                  style={{
                    backgroundColor: `${t.finance}15`,
                    color: t.finance,
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} /> Novo Cartão
                </button>
              </div>
              {cartoes.map((ct) => (
                <div
                  key={ct.id}
                  style={{
                    backgroundColor: t.cardSubtle,
                    borderColor: t.border,
                  }}
                  className="p-3 rounded-2xl border grid grid-cols-1 sm:grid-cols-3 gap-2 items-center"
                >
                  <input
                    value={ct.nome}
                    onChange={(e) =>
                      setCartoes((prev) =>
                        prev.map((item) =>
                          item.id === ct.id
                            ? { ...item, nome: e.target.value }
                            : item
                        )
                      )
                    }
                    style={{ backgroundColor: t.card, color: t.text }}
                    className="p-2.5 rounded-xl text-xs font-semibold outline-none"
                  />
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[11px]"
                      style={{ color: t.textSoft }}
                    >
                      Fatura R$:
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={ct.faturaAtual}
                      onChange={(e) =>
                        setCartoes((prev) =>
                          prev.map((item) =>
                            item.id === ct.id
                              ? {
                                  ...item,
                                  faturaAtual: parseFloat(e.target.value) || 0,
                                }
                              : item
                          )
                        )
                      }
                      style={{ backgroundColor: t.card, color: t.danger }}
                      className="w-full p-2.5 rounded-xl text-xs font-mono font-bold outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[11px]"
                      style={{ color: t.textSoft }}
                    >
                      Limite R$:
                    </span>
                    <input
                      type="number"
                      step="10"
                      value={ct.limiteTotal}
                      onChange={(e) =>
                        setCartoes((prev) =>
                          prev.map((item) =>
                            item.id === ct.id
                              ? {
                                  ...item,
                                  limiteTotal: parseFloat(e.target.value) || 0,
                                }
                              : item
                          )
                        )
                      }
                      style={{ backgroundColor: t.card, color: t.text }}
                      className="w-full p-2.5 rounded-xl text-xs font-mono outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA 5: MÓDULOS (ESTUDOS, DIETA/COMPRAS & PETS) */}
        {aba === "modulos" && (
          <div className="space-y-4">
            {/* Seção Estudos / Disciplinas */}
            <div
              style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
              className="p-3.5 rounded-2xl border space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold flex items-center gap-1.5">
                  <GraduationCap size={14} style={{ color: t.primary }} />
                  Matérias / Cursos / Estudos ({disciplinas.length})
                </p>
                <button
                  type="button"
                  onClick={() => fileInputUniversalRef.current?.click()}
                  style={{ color: t.primary }}
                  className="text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Upload size={12} /> Importar de arquivo
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  value={novaDiscNome}
                  onChange={(e) => setNovaDiscNome(e.target.value)}
                  placeholder="Nome da matéria ou curso..."
                  style={{ backgroundColor: t.card, color: t.text }}
                  className="p-2 rounded-xl text-xs outline-none"
                />
                <input
                  value={novaDiscHorario}
                  onChange={(e) => setNovaDiscHorario(e.target.value)}
                  placeholder="Horário/Sala (ex: Seg/Qua 08h)"
                  style={{ backgroundColor: t.card, color: t.text }}
                  className="p-2 rounded-xl text-xs outline-none"
                />
                <div className="flex gap-1.5">
                  <input
                    value={novaDiscProf}
                    onChange={(e) => setNovaDiscProf(e.target.value)}
                    placeholder="Professor(a)"
                    style={{ backgroundColor: t.card, color: t.text }}
                    className="flex-1 p-2 rounded-xl text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={adicionarDisciplinaManual}
                    style={{ backgroundColor: t.primary, color: "#fff" }}
                    className="px-3 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {disciplinas.map((d) => (
                  <div
                    key={d.id}
                    style={{ backgroundColor: t.card, borderColor: t.border }}
                    className="p-2 rounded-xl border flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-bold truncate">{d.nome}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[11px] truncate"
                        style={{ color: t.textSoft }}
                      >
                        {d.horarioSala}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDisciplinas((prev) =>
                            prev.filter((x) => x.id !== d.id)
                          )
                        }
                        style={{ color: t.danger }}
                        className="cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Seção Nutrição & Compras */}
            <div
              style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
              className="p-3.5 rounded-2xl border space-y-2.5"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-bold flex items-center gap-1.5">
                  <Utensils size={14} style={{ color: t.action }} />
                  Cardápio & Lista de Compras ({refeicoes.length} refeições)
                </p>
                <button
                  type="button"
                  onClick={gerarComprasDaDietaAtual}
                  style={{ color: t.finance }}
                  className="text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ShoppingCart size={12} /> Enviar ingredientes p/ Lista de
                  Compras
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input
                  value={novaRefHorario}
                  onChange={(e) => setNovaRefHorario(e.target.value)}
                  placeholder="07:30"
                  style={{ backgroundColor: t.card, color: t.text }}
                  className="p-2 rounded-xl text-xs font-mono outline-none"
                />
                <input
                  value={novaRefNome}
                  onChange={(e) => setNovaRefNome(e.target.value)}
                  placeholder="Ex: Café da Manhã"
                  style={{ backgroundColor: t.card, color: t.text }}
                  className="p-2 rounded-xl text-xs outline-none"
                />
                <input
                  value={novaRefDesc}
                  onChange={(e) => setNovaRefDesc(e.target.value)}
                  placeholder="Ovos, aveia, fruta..."
                  style={{ backgroundColor: t.card, color: t.text }}
                  className="p-2 rounded-xl text-xs outline-none"
                />
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={novaRefProt}
                    onChange={(e) => setNovaRefProt(e.target.value)}
                    placeholder="Ptn(g)"
                    style={{ backgroundColor: t.card, color: t.text }}
                    className="w-full p-2 rounded-xl text-xs font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={adicionarRefeicaoManual}
                    style={{ backgroundColor: t.primary, color: "#fff" }}
                    className="px-3 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Seção Pets */}
            <div
              style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
              className="p-3.5 rounded-2xl border space-y-2.5"
            >
              <p className="text-xs font-bold flex items-center gap-1.5">
                <PawPrint size={14} style={{ color: t.primary }} />
                Pets & Estoque
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {petsPerfil.map((pet) => (
                  <div
                    key={pet.id}
                    style={{ backgroundColor: t.card, borderColor: t.border }}
                    className="p-2.5 rounded-xl border flex items-center justify-between gap-2"
                  >
                    <input
                      value={pet.nome}
                      onChange={(e) =>
                        setPetsPerfil((prev) =>
                          prev.map((p) =>
                            p.id === pet.id
                              ? { ...p, nome: e.target.value }
                              : p
                          )
                        )
                      }
                      style={{ backgroundColor: t.cardSubtle, color: t.text }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold outline-none w-28"
                    />
                    <div className="flex items-center gap-1.5 text-xs">
                      <span style={{ color: t.textSoft }}>Sachês:</span>
                      <input
                        type="number"
                        value={pet.estoqueSaches}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          setPetsPerfil((prev) =>
                            prev.map((p) => ({ ...p, estoqueSaches: val }))
                          );
                        }}
                        style={{
                          backgroundColor: t.cardSubtle,
                          color: t.primary,
                        }}
                        className="w-16 px-2 py-1.5 rounded-lg text-xs font-mono font-bold outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div
          style={{ borderColor: t.border }}
          className="pt-3 border-t flex items-center justify-between gap-2 flex-wrap"
        >
          <span className="text-[11px]" style={{ color: t.textSoft }}>
            Dica: Você pode recalibrar ou importar arquivos a qualquer momento.
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              style={{ backgroundColor: t.cardSubtle, color: t.text }}
              className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={concluirCalibracao}
              style={{ backgroundColor: t.primary, color: "#fff" }}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={14} />
              <span>Salvar Calibração</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
