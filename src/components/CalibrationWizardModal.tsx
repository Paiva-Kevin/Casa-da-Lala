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
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import {
  AnexoLala,
  CartaoCredito,
  CheckinProntidao,
  ContaBancaria,
  Disciplina,
  ItemListaCompras,
  ItemRefeicao,
  PerfilUsuarioCalibrado,
  PetPerfil,
  ThemeTokens,
} from "../types/lala";
import {
  extrairIngredientesParaListaCompras,
  lerArquivoParaAnexo,
} from "../services/lalaEngine";

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
  onEnviarAnexoParaLala: (anexo: AnexoLala, promptInicial: string) => Promise<void>;
  onAbrirLalaComPrompt: (promptInicial: string) => void;
  onLimparDadosExemplo?: () => void;
  showToast: (msg: string) => void;
}

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
  checkin,
  setCheckin,
  onEnviarAnexoParaLala,
  onAbrirLalaComPrompt,
  onLimparDadosExemplo,
  showToast,
}: CalibrationWizardModalProps) {
  const [passo, setPasso] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [processandoUpload, setProcessandoUpload] = useState(false);

  // Inputs para adicionar novos itens rapidamente
  const [novaDiscNome, setNovaDiscNome] = useState("");
  const [novaDiscHorario, setNovaDiscHorario] = useState("");
  const [novaDiscProf, setNovaDiscProf] = useState("");

  const [novaRefHorario, setNovaRefHorario] = useState("08:00");
  const [novaRefNome, setNovaRefNome] = useState("");
  const [novaRefDesc, setNovaRefDesc] = useState("");
  const [novaRefProt, setNovaRefProt] = useState("30");

  const inputGradeRef = useRef<HTMLInputElement | null>(null);
  const inputDietaRef = useRef<HTMLInputElement | null>(null);

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
    showToast("Informações calibradas! A Lala já ajustou sua rotina.");
    onClose();
  };

  const handleUploadGrade = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessandoUpload(true);
    try {
      const anexo = await lerArquivoParaAnexo(file, "grade", "UERJ");
      await onEnviarAnexoParaLala(
        anexo,
        `Lala, subi o arquivo "${file.name}" com a minha grade da UERJ. Interprete minhas disciplinas, horários e salas, atualize minha Grade UERJ e aloque na Agenda!`
      );
      showToast(`Lala interpretou "${file.name}" e preparou sua Grade UERJ!`);
    } finally {
      setProcessandoUpload(false);
      e.target.value = "";
    }
  };

  const handleUploadDieta = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessandoUpload(true);
    try {
      const anexo = await lerArquivoParaAnexo(file, "dieta", "Casa & Pets");
      await onEnviarAnexoParaLala(
        anexo,
        `Lala, subi o arquivo "${file.name}" com a minha dieta. Interprete meu cardápio de refeições e já gere automaticamente a Lista de Compras de mercado com os ingredientes!`
      );
      showToast(
        `Lala interpretou sua dieta "${file.name}" e gerou o Cardápio + Lista de Compras!`
      );
    } finally {
      setProcessandoUpload(false);
      e.target.value = "";
    }
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
                p.nome.toLowerCase().includes(ext.nome.slice(0, 10).toLowerCase())
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
      `Lala adicionou ${extraidos.length} ingredientes da sua dieta na Lista de Compras!`
    );
  };

  const adicionarDisciplinaManual = () => {
    if (!novaDiscNome.trim()) return;
    const nova: Disciplina = {
      id: Date.now(),
      nome: novaDiscNome.trim(),
      professor: novaDiscProf.trim() || "Docente UERJ",
      horarioSala: novaDiscHorario.trim() || "Seg/Qua 08h-10h",
      prazo: "Semestre Atual",
      status: "em dia",
      aulasTotaisSemestre: 30,
      faltasAtuais: 0,
      faltasMax: 7,
      presencas: 0,
      mediaAprovacao: 7.0,
      avaliacoes: [
        { id: Date.now() + 1, tipo: "P1", data: "A definir", peso: 1, notaObtida: null },
      ],
      leiturasSemana: [],
      linksUteis: [],
      anotacoes: "",
    };
    setDisciplinas((prev) => [...prev, nova]);
    setNovaDiscNome("");
    setNovaDiscHorario("");
    setNovaDiscProf("");
    showToast(`Disciplina "${nova.nome}" adicionada na Grade UERJ!`);
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

  const ETAPAS = [
    { num: 1, label: "1. Você & Rotina", icon: UserCheck },
    { num: 2, label: "2. Finanças", icon: Wallet },
    { num: 3, label: "3. Grade UERJ", icon: GraduationCap },
    { num: 4, label: "4. Dieta & Compras", icon: Utensils },
    { num: 5, label: "5. Casa & Pets", icon: PawPrint },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 backdrop-blur-xs"
        style={{ background: "rgba(0,0,0,0.58)" }}
        onClick={onClose}
      />

      <div
        style={{ backgroundColor: t.card, color: t.text, borderColor: t.border }}
        className="relative w-full max-w-2xl rounded-3xl border shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto space-y-4"
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3">
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
                Calibração Inteligente · Casa da Lala
              </span>
              <h2 className="text-base sm:text-lg font-bold mt-0.5">
                Vamos calibrar o app para a sua vida real
              </h2>
              <p style={{ color: t.textSoft }} className="text-xs">
                Você pode preencher conversando livremente com a Lala a qualquer
                momento, subir arquivos ou ajustar abaixo.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onLimparDadosExemplo && (
              <button
                onClick={() => {
                  onLimparDadosExemplo();
                  onClose();
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
                <span>Zerar Dados de Exemplo</span>
              </button>
            )}
            <button
              onClick={onClose}
              style={{ backgroundColor: t.cardSubtle, color: t.textSoft }}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Barra de Passos */}
        <div
          style={{ backgroundColor: t.cardSubtle }}
          className="grid grid-cols-5 gap-1 p-1 rounded-2xl"
        >
          {ETAPAS.map((et) => {
            const Icon = et.icon;
            const ativo = passo === et.num;
            return (
              <button
                key={et.num}
                onClick={() => setPasso(et.num)}
                style={{
                  backgroundColor: ativo ? t.primary : "transparent",
                  color: ativo ? "#fff" : t.textSoft,
                }}
                className="py-2 px-1.5 rounded-xl text-[11px] font-bold flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer transition-all"
              >
                <Icon size={13} />
                <span className="truncate max-w-full">{et.label}</span>
              </button>
            );
          })}
        </div>

        {/* PASSO 1: VOCÊ & ROTINA */}
        {passo === 1 && (
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
                  Curso / Faculdade & Período
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

            <div
              style={{
                backgroundColor: `${t.action}12`,
                borderColor: `${t.action}35`,
              }}
              className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 flex-wrap"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-bold" style={{ color: t.action }}>
                  Quer calibrar conversando com a Lala por voz ou texto?
                </p>
                <p style={{ color: t.textSoft }} className="text-[11px]">
                  Você pode falar tudo de uma vez (seu saldo, matérias, dieta e
                  rotina) e a Lala arruma cada aba pra você.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onAbrirLalaComPrompt(
                    "Lala, me ajuda a calibrar minhas informações iniciais: quero ajustar meu saldo bancário, minha grade da UERJ e minha dieta!"
                  );
                }}
                style={{ backgroundColor: t.action, color: "#fff" }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 cursor-pointer"
              >
                Calibrar com a Lala
              </button>
            </div>
          </div>
        )}

        {/* PASSO 2: FINANÇAS REAIS (SALDOS & CARTÕES) */}
        {passo === 2 && (
          <div className="space-y-3.5">
            <p style={{ color: t.textSoft }} className="text-xs">
              Ajuste o saldo atual das suas contas e a fatura dos cartões para o
              cálculo de <strong>Dinheiro Livre Hoje</strong> ficar 100% exato:
            </p>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: t.primary }}>
                Suas Contas Bancárias / Pix
              </p>
              {contas.map((c) => (
                <div
                  key={c.id}
                  style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
                  className="p-3 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 gap-2 items-center"
                >
                  <input
                    value={c.nome}
                    onChange={(e) =>
                      setContas((prev) =>
                        prev.map((item) =>
                          item.id === c.id ? { ...item, nome: e.target.value } : item
                        )
                      )
                    }
                    style={{ backgroundColor: t.card, color: t.text }}
                    className="p-2.5 rounded-xl text-xs font-semibold outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold" style={{ color: t.textSoft }}>
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
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: t.finance }}>
                Seus Cartões de Crédito
              </p>
              {cartoes.map((ct) => (
                <div
                  key={ct.id}
                  style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
                  className="p-3 rounded-2xl border grid grid-cols-1 sm:grid-cols-3 gap-2 items-center"
                >
                  <input
                    value={ct.nome}
                    onChange={(e) =>
                      setCartoes((prev) =>
                        prev.map((item) =>
                          item.id === ct.id ? { ...item, nome: e.target.value } : item
                        )
                      )
                    }
                    style={{ backgroundColor: t.card, color: t.text }}
                    className="p-2.5 rounded-xl text-xs font-semibold outline-none"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px]" style={{ color: t.textSoft }}>
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
                    <span className="text-[11px]" style={{ color: t.textSoft }}>
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

        {/* PASSO 3: GRADE UERJ & ESTUDOS */}
        {passo === 3 && (
          <div className="space-y-3.5">
            <input
              ref={inputGradeRef}
              type="file"
              accept="image/*,.pdf,.txt,.csv,.doc,.docx"
              onChange={handleUploadGrade}
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => inputGradeRef.current?.click()}
                disabled={processandoUpload}
                style={{
                  backgroundColor: `${t.primary}15`,
                  borderColor: t.primary,
                  color: t.primary,
                }}
                className="p-3.5 rounded-2xl border text-left flex items-center gap-3 cursor-pointer"
              >
                <div
                  style={{ backgroundColor: t.primary, color: "#fff" }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                >
                  <Upload size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold">
                    {processandoUpload
                      ? "Lendo arquivo da Grade..."
                      : "Subir Arquivo ou Foto da Grade UERJ"}
                  </p>
                  <p style={{ color: t.textSoft }} className="text-[11px]">
                    A Lala lê o PDF/imagem e cadastra as disciplinas + agenda
                  </p>
                </div>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onAbrirLalaComPrompt(
                    "Lala, me ajuda a montar minha grade da UERJ deste semestre para conciliar com trabalho e treinos!"
                  );
                }}
                style={{
                  backgroundColor: `${t.action}14`,
                  borderColor: t.action,
                  color: t.action,
                }}
                className="p-3.5 rounded-2xl border text-left flex items-center gap-3 cursor-pointer"
              >
                <div
                  style={{ backgroundColor: t.action, color: "#fff" }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                >
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold">
                    Pedir ajuda da Lala p/ montar a Grade
                  </p>
                  <p style={{ color: t.textSoft }} className="text-[11px]">
                    Planeje horários sem conflito com CDT/RCR e Cheer
                  </p>
                </div>
              </button>
            </div>

            {/* Adicionar Disciplina Manualmente */}
            <div
              style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
              className="p-3 rounded-2xl border space-y-2"
            >
              <p className="text-xs font-bold">
                Adicionar Disciplina Manualmente
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  value={novaDiscNome}
                  onChange={(e) => setNovaDiscNome(e.target.value)}
                  placeholder="Nome da matéria..."
                  style={{ backgroundColor: t.card, color: t.text }}
                  className="p-2.5 rounded-xl text-xs outline-none"
                />
                <input
                  value={novaDiscHorario}
                  onChange={(e) => setNovaDiscHorario(e.target.value)}
                  placeholder="Horário/Sala (ex: Seg/Qua 08h)"
                  style={{ backgroundColor: t.card, color: t.text }}
                  className="p-2.5 rounded-xl text-xs outline-none"
                />
                <div className="flex gap-1.5">
                  <input
                    value={novaDiscProf}
                    onChange={(e) => setNovaDiscProf(e.target.value)}
                    placeholder="Professor(a)"
                    style={{ backgroundColor: t.card, color: t.text }}
                    className="flex-1 p-2.5 rounded-xl text-xs outline-none"
                  />
                  <button
                    onClick={adicionarDisciplinaManual}
                    style={{ backgroundColor: t.primary, color: "#fff" }}
                    className="px-3 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de Disciplinas Atuais */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {disciplinas.map((d) => (
                <div
                  key={d.id}
                  style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
                  className="p-2.5 rounded-xl border flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <input
                      value={d.nome}
                      onChange={(e) =>
                        setDisciplinas((prev) =>
                          prev.map((x) =>
                            x.id === d.id ? { ...x, nome: e.target.value } : x
                          )
                        )
                      }
                      style={{ backgroundColor: t.card, color: t.text }}
                      className="p-2 rounded-lg text-xs font-bold outline-none"
                    />
                    <input
                      value={d.horarioSala}
                      onChange={(e) =>
                        setDisciplinas((prev) =>
                          prev.map((x) =>
                            x.id === d.id
                              ? { ...x, horarioSala: e.target.value }
                              : x
                          )
                        )
                      }
                      style={{ backgroundColor: t.card, color: t.textSoft }}
                      className="p-2 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <button
                    onClick={() =>
                      setDisciplinas((prev) => prev.filter((x) => x.id !== d.id))
                    }
                    className="p-1.5 rounded-lg cursor-pointer"
                    style={{ color: t.danger }}
                    title="Remover disciplina"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PASSO 4: DIETA, REFEIÇÕES & LISTA DE COMPRAS AUTOMÁTICA */}
        {passo === 4 && (
          <div className="space-y-3.5">
            <input
              ref={inputDietaRef}
              type="file"
              accept="image/*,.pdf,.txt,.csv,.doc,.docx"
              onChange={handleUploadDieta}
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => inputDietaRef.current?.click()}
                disabled={processandoUpload}
                style={{
                  backgroundColor: `${t.primary}15`,
                  borderColor: t.primary,
                  color: t.primary,
                }}
                className="p-3.5 rounded-2xl border text-left flex items-center gap-3 cursor-pointer"
              >
                <div
                  style={{ backgroundColor: t.primary, color: "#fff" }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                >
                  <Upload size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold">
                    {processandoUpload
                      ? "Lala interpretando sua Dieta..."
                      : "Subir Arquivo/Foto da Minha Dieta"}
                  </p>
                  <p style={{ color: t.textSoft }} className="text-[11px]">
                    A Lala atualiza as refeições e cria a Lista de Compras!
                  </p>
                </div>
              </button>

              <button
                onClick={gerarComprasDaDietaAtual}
                style={{
                  backgroundColor: `${t.finance}15`,
                  borderColor: t.finance,
                  color: t.finance,
                }}
                className="p-3.5 rounded-2xl border text-left flex items-center gap-3 cursor-pointer"
              >
                <div
                  style={{ backgroundColor: t.finance, color: "#fff" }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                >
                  <ShoppingCart size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold">
                    Gerar Lista de Compras da Dieta Atual
                  </p>
                  <p style={{ color: t.textSoft }} className="text-[11px]">
                    Lê o cardápio abaixo e envia os ingredientes pro Mercado
                  </p>
                </div>
              </button>
            </div>

            {/* Adicionar Refeição Manualmente */}
            <div
              style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
              className="p-3 rounded-2xl border space-y-2"
            >
              <p className="text-xs font-bold">Adicionar Refeição na Dieta</p>
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
                  placeholder="Ovos, aveia, frango..."
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
                    onClick={adicionarRefeicaoManual}
                    style={{ backgroundColor: t.primary, color: "#fff" }}
                    className="px-3 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de Refeições */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {refeicoes.map((r) => (
                <div
                  key={r.id}
                  style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
                  className="p-2.5 rounded-xl border flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <input
                      value={`${r.horario} — ${r.nome}`}
                      onChange={(e) => {
                        const partes = e.target.value.split("—");
                        setRefeicoes((prev) =>
                          prev.map((item) =>
                            item.id === r.id
                              ? {
                                  ...item,
                                  horario: (partes[0] || r.horario).trim(),
                                  nome: (partes[1] || partes[0] || r.nome).trim(),
                                }
                              : item
                          )
                        );
                      }}
                      style={{ backgroundColor: t.card, color: t.text }}
                      className="p-2 rounded-lg text-xs font-bold outline-none"
                    />
                    <input
                      value={r.descricao}
                      onChange={(e) =>
                        setRefeicoes((prev) =>
                          prev.map((item) =>
                            item.id === r.id
                              ? { ...item, descricao: e.target.value }
                              : item
                          )
                        )
                      }
                      style={{ backgroundColor: t.card, color: t.textSoft }}
                      className="p-2 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <button
                    onClick={() =>
                      setRefeicoes((prev) =>
                        prev.filter((item) => item.id !== r.id)
                      )
                    }
                    className="p-1.5 cursor-pointer"
                    style={{ color: t.danger }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PASSO 5: CASA & PETS */}
        {passo === 5 && (
          <div className="space-y-3.5">
            <p style={{ color: t.textSoft }} className="text-xs">
              Configure seus pets e o estoque inicial de sachês/ração para a Lala
              monitorar a reposição automática:
            </p>

            <div className="space-y-2.5">
              {petsPerfil.map((pet) => (
                <div
                  key={pet.id}
                  style={{ backgroundColor: t.cardSubtle, borderColor: t.border }}
                  className="p-3.5 rounded-2xl border space-y-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label
                        style={{ color: t.textSoft }}
                        className="text-[10px] font-bold uppercase block mb-0.5"
                      >
                        Nome do Pet
                      </label>
                      <input
                        value={pet.nome}
                        onChange={(e) =>
                          setPetsPerfil((prev) =>
                            prev.map((p) =>
                              p.id === pet.id ? { ...p, nome: e.target.value } : p
                            )
                          )
                        }
                        style={{ backgroundColor: t.card, color: t.text }}
                        className="w-full p-2 rounded-xl text-xs font-bold outline-none"
                      />
                    </div>
                    <div>
                      <label
                        style={{ color: t.textSoft }}
                        className="text-[10px] font-bold uppercase block mb-0.5"
                      >
                        Ração / Dieta Pet
                      </label>
                      <input
                        value={pet.racao}
                        onChange={(e) =>
                          setPetsPerfil((prev) =>
                            prev.map((p) =>
                              p.id === pet.id ? { ...p, racao: e.target.value } : p
                            )
                          )
                        }
                        style={{ backgroundColor: t.card, color: t.text }}
                        className="w-full p-2 rounded-xl text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label
                        style={{ color: t.textSoft }}
                        className="text-[10px] font-bold uppercase block mb-0.5"
                      >
                        Estoque Atual de Sachês (un)
                      </label>
                      <input
                        type="number"
                        value={pet.estoqueSaches}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          setPetsPerfil((prev) =>
                            prev.map((p) => ({ ...p, estoqueSaches: val }))
                          );
                        }}
                        style={{ backgroundColor: t.card, color: t.primary }}
                        className="w-full p-2 rounded-xl text-xs font-mono font-bold outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rodapé de Navegação */}
        <div
          style={{ borderColor: t.border }}
          className="pt-3 border-t flex items-center justify-between gap-2 flex-wrap"
        >
          <div>
            {passo > 1 && (
              <button
                onClick={() => setPasso((p) => Math.max(1, p - 1) as 1 | 2 | 3 | 4 | 5)}
                style={{ backgroundColor: t.cardSubtle, color: t.text }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={14} /> Anterior
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={concluirCalibracao}
              style={{
                backgroundColor: passo === 5 ? t.primary : t.cardSubtle,
                color: passo === 5 ? "#fff" : t.text,
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={14} />
              <span>Salvar & Concluir Calibração</span>
            </button>

            {passo < 5 && (
              <button
                onClick={() => setPasso((p) => Math.min(5, p + 1) as 1 | 2 | 3 | 4 | 5)}
                style={{ backgroundColor: t.primary, color: "#fff" }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span>Próximo</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
