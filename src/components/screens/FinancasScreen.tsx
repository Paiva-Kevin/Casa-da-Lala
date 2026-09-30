import React, { useState } from "react";
import {
  Wallet,
  CreditCard,
  Sparkles,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Upload,
  FileSpreadsheet,
  BellRing,
  Info,
  X,
  Plus,
  Edit3,
  Trash2,
  ChevronRight,
  History,
  Sliders,
} from "lucide-react";
import {
  BancoId,
  CartaoCredito,
  ContaBancaria,
  LancamentoFinanceiro,
  MesFinanceiroKey,
  OrcamentoCategoria,
  ThemeTokens,
} from "../../types/lala";
import { parseGastoNatural } from "../../data/initialData";
import {
  CATALOGO_BANCOS,
  detectarBancoIdPorNome,
  getIdentidadeBanco,
} from "../../utils/bankIdentities";

interface TransacaoImportadaPreview {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
  categoria: OrcamentoCategoria["categoria"];
  selecionada: boolean;
}

function detectarCategoriaAutomatica(
  desc: string
): OrcamentoCategoria["categoria"] {
  const s = desc.toLowerCase();
  if (
    s.includes("pet") ||
    s.includes("cobasi") ||
    s.includes("petz") ||
    s.includes("vet") ||
    s.includes("ração") ||
    s.includes("sache")
  )
    return "Pets";
  if (
    s.includes("uber") ||
    s.includes("99") ||
    s.includes("metro") ||
    s.includes("riocard") ||
    s.includes("passagem") ||
    s.includes("combust")
  )
    return "Transporte";
  if (
    s.includes("luz") ||
    s.includes("enel") ||
    s.includes("claro") ||
    s.includes("vivo") ||
    s.includes("aluguel") ||
    s.includes("condom") ||
    s.includes("agua") ||
    s.includes("internet")
  )
    return "Moradia & Fixos";
  if (
    s.includes("acordo") ||
    s.includes("parcela") ||
    s.includes("fatura") ||
    s.includes("emprest")
  )
    return "Dívida";
  if (
    s.includes("cinema") ||
    s.includes("bar") ||
    s.includes("show") ||
    s.includes("netflix") ||
    s.includes("spotify") ||
    s.includes("ifood") ||
    s.includes("restaurante")
  )
    return "Lazer & Outros";
  return "Mercado";
}

function parseArquivoBancarioSemOpenFinance(conteudo: string): {
  saldoDetectado: number | null;
  transacoes: TransacaoImportadaPreview[];
} {
  const transacoes: TransacaoImportadaPreview[] = [];
  let saldoDetectado: number | null = null;

  if (conteudo.includes("<OFX") || conteudo.includes("<STMTTRN>")) {
    const matchBal = conteudo.match(/<BALAMT>\s*([-+]?\d+(?:[.,]\d+)?)/i);
    if (matchBal) {
      saldoDetectado = parseFloat(matchBal[1].replace(",", "."));
    }

    const blocos = conteudo.split(/<STMTTRN>/i).slice(1);
    blocos.forEach((bloco, idx) => {
      const mAmt = bloco.match(/<TRNAMT>\s*([-+]?\d+(?:[.,]\d+)?)/i);
      const mDate = bloco.match(/<DTPOSTED>\s*(\d{8})/i);
      const mMemo =
        bloco.match(/<MEMO>\s*([^<\r\n]+)/i) ||
        bloco.match(/<NAME>\s*([^<\r\n]+)/i);

      if (mAmt) {
        const rawVal = parseFloat(mAmt[1].replace(",", "."));
        if (!isNaN(rawVal) && rawVal !== 0) {
          const dataFmt = mDate
            ? `${mDate[1].slice(6, 8)}/${mDate[1].slice(4, 6)}`
            : "Hoje";
          const desc = (mMemo ? mMemo[1] : "Movimentação OFX").trim();
          transacoes.push({
            id: `ofx-${idx}-${Date.now()}`,
            data: dataFmt,
            descricao: desc,
            valor: Math.abs(rawVal),
            tipo: rawVal < 0 ? "despesa" : "receita",
            categoria: detectarCategoriaAutomatica(desc),
            selecionada: true,
          });
        }
      }
    });
    return { saldoDetectado, transacoes };
  }

  const linhas = conteudo
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  linhas.forEach((linha, idx) => {
    const matchSaldo = linha.match(
      /saldo(?:\s+atual|\s+dispon[ií]vel|\s+em\s+conta)?[:\s]*R?\$?\s*([-+]?\d{1,3}(?:\.\d{3})*(?:,\d{2})|[-+]?\d+(?:[.,]\d{2}))/i
    );
    if (matchSaldo) {
      const limpo = matchSaldo[1].replace(/\./g, "").replace(",", ".");
      const valS = parseFloat(limpo);
      if (!isNaN(valS)) {
        saldoDetectado = valS;
      }
      return;
    }

    if (
      linha.includes(";") ||
      (linha.includes(",") && linha.split(",").length >= 3)
    ) {
      const sep = linha.includes(";") ? ";" : ",";
      const cols = linha.split(sep).map((c) => c.replace(/^"|"$/g, "").trim());
      if (
        cols.some(
          (c) =>
            c.toLowerCase() === "valor" ||
            c.toLowerCase() === "amount" ||
            c.toLowerCase() === "data"
        )
      ) {
        return;
      }
      const colValor = cols.find((c) =>
        /^[-+]?(?:R\$\s*)?\d+(?:[.,]\d{2})$/.test(c)
      );
      const colData = cols.find((c) => /\d{2}[/-]\d{2}/.test(c));
      const colDesc = cols
        .filter((c) => c !== colValor && c !== colData && c.length > 2)
        .join(" · ");

      if (colValor) {
        const raw = parseFloat(
          colValor.replace(/R\$\s*/i, "").replace(",", ".")
        );
        if (!isNaN(raw) && raw !== 0) {
          const dataCurta = colData
            ? colData.slice(0, 5).replace("-", "/")
            : "Hoje";
          const desc = colDesc || "Importado CSV";
          transacoes.push({
            id: `csv-${idx}-${Date.now()}`,
            data: dataCurta,
            descricao: desc,
            valor: Math.abs(raw),
            tipo: raw < 0 ? "despesa" : "receita",
            categoria: detectarCategoriaAutomatica(desc),
            selecionada: true,
          });
          return;
        }
      }
    }

    const matchValor = linha.match(
      /([-+]?\s*R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})|[-+]?\d{1,3}(?:\.\d{3})*,\d{2}|[-+]?\d+\.\d{2})/i
    );
    if (matchValor) {
      const strVal = matchValor[1]
        .replace(/R\$\s*/i, "")
        .replace(/\s+/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      const numVal = parseFloat(strVal);
      if (!isNaN(numVal) && numVal !== 0) {
        const ehReceita =
          linha.toLowerCase().includes("receb") ||
          linha.toLowerCase().includes("entrada") ||
          linha.toLowerCase().includes("crédito em conta") ||
          linha.includes("+");
        const descLimpa =
          linha
            .replace(matchValor[0], "")
            .replace(/^[-–•:\s]+|[-–•:\s]+$/g, "")
            .trim() || "Notificação Bancária";
        const matchData = linha.match(/(\d{2}\/\d{2})/);
        transacoes.push({
          id: `txt-${idx}-${Date.now()}`,
          data: matchData ? matchData[1] : "Hoje",
          descricao: descLimpa,
          valor: Math.abs(numVal),
          tipo: ehReceita && numVal > 0 ? "receita" : "despesa",
          categoria: detectarCategoriaAutomatica(descLimpa),
          selecionada: true,
        });
      }
    }
  });

  return { saldoDetectado, transacoes };
}

interface FinancasScreenProps {
  t: ThemeTokens;
  mesSelecionado: MesFinanceiroKey;
  setMesSelecionado: (m: MesFinanceiroKey) => void;
  contas: ContaBancaria[];
  setContas: React.Dispatch<React.SetStateAction<ContaBancaria[]>>;
  cartoes: CartaoCredito[];
  setCartoes: React.Dispatch<React.SetStateAction<CartaoCredito[]>>;
  orcamentos: OrcamentoCategoria[];
  setOrcamentos?: React.Dispatch<React.SetStateAction<OrcamentoCategoria[]>>;
  lancamentos: LancamentoFinanceiro[];
  setLancamentos: React.Dispatch<React.SetStateAction<LancamentoFinanceiro[]>>;
  adicionarLancamento: (
    valor: number,
    categoria: OrcamentoCategoria["categoria"],
    descricao: string,
    metodo: "Conta / Pix" | "Cartão de Crédito",
    status: "realizado" | "previsto",
    afetaEstoquePets?: boolean,
    contaId?: number,
    cartaoId?: number,
    tipo?: "despesa" | "receita"
  ) => void;
  dinheiroLivreInfo: {
    livreHoje: number;
    saldoLiquidoDisponivelMes: number;
    saldoContasOperacionais: number;
    despesasPrevistasPendentes: number;
    gastoRealizadoHoje: number;
  };
}

const CATEGORIAS_FINANCAS: OrcamentoCategoria["categoria"][] = [
  "Mercado",
  "Pets",
  "Transporte",
  "Moradia & Fixos",
  "Estudos & UERJ",
  "Dívida",
  "Lazer & Outros",
];

export function FinancasScreen({
  t,
  mesSelecionado,
  setMesSelecionado,
  contas,
  setContas,
  cartoes,
  setCartoes,
  orcamentos,
  setOrcamentos,
  lancamentos,
  setLancamentos,
  adicionarLancamento,
  dinheiroLivreInfo,
}: FinancasScreenProps) {
  const [abaRegistro, setAbaRegistro] = useState<"rapido_ia" | "manual">(
    "rapido_ia"
  );
  const [inputNatural, setInputNatural] = useState("");
  const [filtroFluxo, setFiltroFluxo] = useState<
    "todos" | "receita" | "despesa" | "previsto"
  >("todos");

  const [tipoLanc, setTipoLanc] = useState<"despesa" | "receita">("despesa");
  const [statusLanc, setStatusLanc] = useState<"realizado" | "previsto">(
    "realizado"
  );
  const [metodoLanc, setMetodoLanc] = useState<
    "Conta / Pix" | "Cartão de Crédito"
  >("Conta / Pix");
  const [contaEscolhidaId, setContaEscolhidaId] = useState<number>(
    contas[0]?.id ?? 1
  );
  const [cartaoEscolhidoId, setCartaoEscolhidoId] = useState<number>(
    cartoes[0]?.id ?? 1
  );
  const [valorManual, setValorManual] = useState("");
  const [descManual, setDescManual] = useState("");
  const [catManual, setCatManual] =
    useState<OrcamentoCategoria["categoria"]>("Mercado");

  // Modal de Detalhes e Histórico da Conta Bancária (Estilo Minhas Finanças)
  const [contaDetalheId, setContaDetalheId] = useState<number | null>(null);
  const [filtroExtratoConta, setFiltroExtratoConta] = useState<
    "todos" | "receita" | "despesa" | "previsto"
  >("todos");
  const [editandoDadosConta, setEditandoDadosConta] = useState(false);

  // Lançamento rápido dentro do modal da conta
  const [novoLancContaDesc, setNovoLancContaDesc] = useState("");
  const [novoLancContaVal, setNovoLancContaVal] = useState("");
  const [novoLancContaTipo, setNovoLancContaTipo] = useState<
    "despesa" | "receita"
  >("despesa");
  const [novoLancContaCat, setNovoLancContaCat] =
    useState<OrcamentoCategoria["categoria"]>("Mercado");

  // Modal de Nova Conta Bancária
  const [modalNovaContaOpen, setModalNovaContaOpen] = useState(false);
  const [novaContaNome, setNovaContaNome] = useState("");
  const [novaContaBancoId, setNovaContaBancoId] = useState<BancoId>("nubank");
  const [novaContaTipo, setNovaContaTipo] =
    useState<ContaBancaria["tipo"]>("Corrente / Pix");
  const [novaContaSaldo, setNovaContaSaldo] = useState("");

  // Modal de Detalhes / Edição do Cartão de Crédito
  const [cartaoDetalheId, setCartaoDetalheId] = useState<number | null>(null);
  const [modalNovoCartaoOpen, setModalNovoCartaoOpen] = useState(false);
  const [novoCartaoNome, setNovoCartaoNome] = useState("");
  const [novoCartaoBancoId, setNovoCartaoBancoId] = useState<BancoId>("nubank");
  const [novoCartaoLimite, setNovoCartaoLimite] = useState("2500");
  const [novoCartaoFatura, setNovoCartaoFatura] = useState("0");
  const [novoCartaoFecha, setNovoCartaoFecha] = useState("5");
  const [novoCartaoVence, setNovoCartaoVence] = useState("12");

  // Edição de Lançamento (Movimentação)
  const [lancamentoEditando, setLancamentoEditando] =
    useState<LancamentoFinanceiro | null>(null);

  // Edição de Orçamentos por Categoria
  const [editandoOrcamentos, setEditandoOrcamentos] = useState(false);

  // Importação Bancária Automática Sem Open Finance
  const [painelBancoAberto, setPainelBancoAberto] = useState<boolean>(false);
  const [contaDestinoImportId, setContaDestinoImportId] = useState<number>(
    contas[0]?.id ?? 1
  );
  const [textoNotificacaoBanco, setTextoNotificacaoBanco] = useState("");
  const [saldoDetectadoImport, setSaldoDetectadoImport] = useState<
    number | null
  >(null);
  const [transacoesPreview, setTransacoesPreview] = useState<
    TransacaoImportadaPreview[]
  >([]);
  const [feedbackImport, setFeedbackImport] = useState<string | null>(null);

  // Rastreador Stitch: Parcelas do Acordo
  const [parcelasAcordoPagas, setParcelasAcordoPagas] = useState<number>(5);
  const [totalParcelasAcordo, setTotalParcelasAcordo] = useState<number>(8);
  const pctAcordoQuitado = Math.round(
    (parcelasAcordoPagas / Math.max(1, totalParcelasAcordo)) * 100
  );

  const handleUploadArquivoBanco = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const texto = await file.text();
    const res = parseArquivoBancarioSemOpenFinance(texto);
    setSaldoDetectadoImport(res.saldoDetectado);
    setTransacoesPreview(res.transacoes);
    setFeedbackImport(
      `Arquivo "${file.name}" lido: ${res.transacoes.length} transação(ões)${
        res.saldoDetectado !== null
          ? ` e Saldo R$ ${res.saldoDetectado.toFixed(2)}`
          : ""
      } identificados!`
    );
    e.target.value = "";
  };

  const handleAnalisarTextoBanco = () => {
    if (!textoNotificacaoBanco.trim()) return;
    const res = parseArquivoBancarioSemOpenFinance(textoNotificacaoBanco);
    setSaldoDetectadoImport(res.saldoDetectado);
    setTransacoesPreview(res.transacoes);
    setFeedbackImport(
      `${res.transacoes.length} transação(ões)${
        res.saldoDetectado !== null
          ? ` e Saldo R$ ${res.saldoDetectado.toFixed(2)}`
          : ""
      } identificados no texto!`
    );
  };

  const handleConfirmarImportacaoBancaria = () => {
    const selecionadas = transacoesPreview.filter((t) => t.selecionada);

    if (saldoDetectadoImport !== null) {
      setContas((prev) =>
        prev.map((c) =>
          c.id === contaDestinoImportId
            ? { ...c, saldoAtual: saldoDetectadoImport }
            : c
        )
      );
    }

    selecionadas.forEach((tr) => {
      adicionarLancamento(
        tr.valor,
        tr.categoria,
        tr.descricao,
        "Conta / Pix",
        "realizado",
        tr.categoria === "Pets" && tr.tipo === "despesa",
        contaDestinoImportId,
        undefined,
        tr.tipo
      );
    });

    setFeedbackImport(
      `Importação concluída: ${selecionadas.length} lançamento(s) adicionados${
        saldoDetectadoImport !== null ? " e saldo da conta atualizado" : ""
      }!`
    );
    setTransacoesPreview([]);
    setSaldoDetectadoImport(null);
    setTextoNotificacaoBanco("");
  };

  const lancamentosMes = lancamentos.filter((l) => l.mesKey === mesSelecionado);

  const receitasRealizadas = lancamentosMes
    .filter((l) => l.tipo === "receita" && l.status === "realizado")
    .reduce((acc, l) => acc + l.valor, 0);
  const receitasPrevistas = lancamentosMes
    .filter((l) => l.tipo === "receita")
    .reduce((acc, l) => acc + l.valor, 0);

  const despesasRealizadas = lancamentosMes
    .filter((l) => l.tipo === "despesa" && l.status === "realizado")
    .reduce((acc, l) => acc + l.valor, 0);
  const despesasPrevistas = lancamentosMes
    .filter((l) => l.tipo === "despesa")
    .reduce((acc, l) => acc + l.valor, 0);

  const saldoRealizadoMes = receitasRealizadas - despesasRealizadas;
  const saldoPrevistoFimMes = receitasPrevistas - despesasPrevistas;

  const tetoMensalGlobal = orcamentos.reduce((acc, o) => acc + o.tetoMensal, 0);
  const pctOrcamentoGlobal =
    tetoMensalGlobal > 0
      ? Math.min(100, Math.round((despesasRealizadas / tetoMensalGlobal) * 100))
      : 0;
  const pctOrcamentoPrevistoGlobal =
    tetoMensalGlobal > 0
      ? Math.min(100, Math.round((despesasPrevistas / tetoMensalGlobal) * 100))
      : 0;
  const saldoOrcamentoRestante = Math.max(
    0,
    tetoMensalGlobal - despesasRealizadas
  );

  const lancamentosFiltrados = lancamentosMes.filter((l) => {
    if (filtroFluxo === "receita") return l.tipo === "receita";
    if (filtroFluxo === "despesa") return l.tipo === "despesa";
    if (filtroFluxo === "previsto") return l.status === "previsto";
    return true;
  });

  const submeterNatural = () => {
    const parsed = parseGastoNatural(inputNatural);
    if (!parsed) return;
    adicionarLancamento(
      parsed.valor,
      parsed.categoria,
      parsed.descricao,
      parsed.metodoSugerido,
      "realizado",
      parsed.afetaEstoquePets,
      contas[0]?.id ?? 1,
      cartoes[0]?.id ?? 1,
      "despesa"
    );
    setInputNatural("");
  };

  const submeterManual = () => {
    const val = parseFloat(valorManual.replace(",", "."));
    if (isNaN(val) || val <= 0) return;
    adicionarLancamento(
      val,
      catManual,
      descManual.trim() ||
        `${tipoLanc === "receita" ? "Entrada" : "Saída"} em ${catManual}`,
      metodoLanc,
      statusLanc,
      catManual === "Pets" && tipoLanc === "despesa",
      metodoLanc === "Conta / Pix" ? contaEscolhidaId : undefined,
      metodoLanc === "Cartão de Crédito" ? cartaoEscolhidoId : undefined,
      tipoLanc
    );
    setValorManual("");
    setDescManual("");
  };

  const criarNovaConta = () => {
    const ident = CATALOGO_BANCOS[novaContaBancoId] || CATALOGO_BANCOS.nubank;
    const nomeFinal = novaContaNome.trim() || ident.nomeBanco;
    const saldoNum =
      parseFloat(novaContaSaldo.replace(/\./g, "").replace(",", ".")) || 0;
    const nova: ContaBancaria = {
      id: Date.now(),
      nome: nomeFinal,
      tipo: novaContaTipo,
      saldoAtual: saldoNum,
      cor: ident.corPrimaria,
      bancoId: novaContaBancoId,
    };
    setContas((prev) => [...prev, nova]);
    setNovaContaNome("");
    setNovaContaSaldo("");
    setModalNovaContaOpen(false);
  };

  const criarNovoCartao = () => {
    const ident = CATALOGO_BANCOS[novoCartaoBancoId] || CATALOGO_BANCOS.nubank;
    const nomeFinal = novoCartaoNome.trim() || `Cartão ${ident.nomeBanco}`;
    const lim =
      parseFloat(novoCartaoLimite.replace(/\./g, "").replace(",", ".")) || 2000;
    const fat =
      parseFloat(novoCartaoFatura.replace(/\./g, "").replace(",", ".")) || 0;
    const novo: CartaoCredito = {
      id: Date.now(),
      nome: nomeFinal,
      limiteTotal: lim,
      faturaAtual: fat,
      fechamentoDia: Math.min(31, Math.max(1, Number(novoCartaoFecha) || 5)),
      vencimentoDia: Math.min(31, Math.max(1, Number(novoCartaoVence) || 12)),
      statusFatura: "aberta",
      bancoId: novoCartaoBancoId,
      cor: ident.corPrimaria,
    };
    setCartoes((prev) => [...prev, novo]);
    setNovoCartaoNome("");
    setModalNovoCartaoOpen(false);
  };

  const contaDetalhe =
    contaDetalheId !== null
      ? contas.find((c) => c.id === contaDetalheId) || null
      : null;

  const cartaoDetalhe =
    cartaoDetalheId !== null
      ? cartoes.find((cc) => cc.id === cartaoDetalheId) || null
      : null;

  return (
    <div className="space-y-5">
      {/* TOPO: SELETOR DE MÊS + BOTÃO IMPORTAR EXTRATO */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: t.text }}>
            Finanças · Contas Bancárias, Cartões & Fluxo de Caixa
          </h2>
          <p className="text-xs" style={{ color: t.textSoft }}>
            Clique em qualquer conta, cartão, lançamento ou orçamento para ver o histórico e editar
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPainelBancoAberto((v) => !v)}
            className="px-3.5 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            style={{
              background: painelBancoAberto ? t.primary : `${t.primary}15`,
              color: painelBancoAberto ? "#fff" : t.primary,
              borderColor: `${t.primary}40`,
            }}
          >
            <Upload size={14} />
            <span>Importar Extrato / OFX</span>
          </button>

          <div
            className="grid grid-cols-3 gap-1 p-1 rounded-2xl border sm:w-72"
            style={{ background: t.card, borderColor: t.border }}
          >
            {(
              [
                { id: "2026-08", label: "Agosto" },
                { id: "2026-09", label: "Setembro" },
                { id: "2026-10", label: "Outubro" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => setMesSelecionado(m.id)}
                className="py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                style={{
                  background:
                    mesSelecionado === m.id ? t.finance : "transparent",
                  color: mesSelecionado === m.id ? "#fff" : t.textSoft,
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PAINEL DE IMPORTAÇÃO BANCÁRIA SEM OPEN FINANCE */}
      {painelBancoAberto && (
        <section
          className="rounded-3xl p-5 border space-y-4"
          style={{ background: t.card, borderColor: t.primary }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase"
                  style={{ background: `${t.primary}18`, color: t.primary }}
                >
                  Sem Open Finance · 100% Privado
                </span>
                <h3
                  className="text-sm sm:text-base font-bold"
                  style={{ color: t.text }}
                >
                  Sincronização de Saldo & Extrato (OFX, CSV ou Leitor de Notificações)
                </h3>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: t.textSoft }}>
                Suba o arquivo OFX/CSV exportado do seu banco ou cole o texto de notificações/extrato. Você também pode enviar prints das contas diretamente no <strong>Bate-Papo com a Lala</strong>!
              </p>
            </div>
            <button
              onClick={() => setPainelBancoAberto(false)}
              className="p-1.5 rounded-xl cursor-pointer"
              style={{ color: t.textSoft }}
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div
              className="lg:col-span-5 p-4 rounded-2xl border space-y-3"
              style={{ background: t.bg, borderColor: t.border }}
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} style={{ color: t.primary }} />
                <h4 className="text-xs sm:text-sm font-bold" style={{ color: t.text }}>
                  1. Enviar Extrato OFX ou CSV
                </h4>
              </div>
              <div className="space-y-2">
                <label
                  className="text-[10px] font-bold uppercase block"
                  style={{ color: t.textSoft }}
                >
                  Vincular à Conta:
                </label>
                <select
                  value={contaDestinoImportId}
                  onChange={(e) => setContaDestinoImportId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold outline-none border"
                  style={{ background: t.card, color: t.text, borderColor: t.border }}
                >
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} (Saldo: R$ {c.saldoAtual.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <label
                className="w-full py-3 px-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-xs font-bold cursor-pointer transition-colors"
                style={{
                  borderColor: t.primary,
                  background: `${t.primary}10`,
                  color: t.primary,
                }}
              >
                <Upload size={15} />
                <span>Selecionar Arquivo .OFX, .CSV ou .TXT</span>
                <input
                  type="file"
                  accept=".ofx,.csv,.txt"
                  onChange={handleUploadArquivoBanco}
                  className="hidden"
                />
              </label>
            </div>

            <div
              className="lg:col-span-7 p-4 rounded-2xl border space-y-3"
              style={{ background: t.bg, borderColor: t.border }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BellRing size={16} style={{ color: t.action }} />
                  <h4 className="text-xs sm:text-sm font-bold" style={{ color: t.text }}>
                    2. Colar Notificações / Extrato Copiado
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setTextoNotificacaoBanco(
                      "Saldo atual: R$ 1.640,50\n28/09 Compra aprovada R$ 42,90 Padaria Real\n28/09 Pix enviado R$ 85,00 Petz Racao\n27/09 Pix recebido +R$ 350,00 Reembolso CDT"
                    )
                  }
                  className="text-[10px] font-bold underline cursor-pointer"
                  style={{ color: t.action }}
                >
                  Testar exemplo
                </button>
              </div>
              <textarea
                rows={3}
                value={textoNotificacaoBanco}
                onChange={(e) => setTextoNotificacaoBanco(e.target.value)}
                placeholder={`Exemplo:\nSaldo atual: R$ 1.520,00\nCompra no débito R$ 34,90 Mercado`}
                className="w-full p-3 rounded-xl text-xs font-mono-num outline-none border resize-none"
                style={{ background: t.card, color: t.text, borderColor: t.border }}
              />
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-[11px] flex items-center gap-1"
                  style={{ color: t.textSoft }}
                >
                  <Info size={12} /> Identifica saldo, entradas, saídas e categorias
                </span>
                <button
                  type="button"
                  onClick={handleAnalisarTextoBanco}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                  style={{ background: t.action }}
                >
                  Ler Saldo & Transações
                </button>
              </div>
            </div>
          </div>

          {(saldoDetectadoImport !== null ||
            transacoesPreview.length > 0 ||
            feedbackImport) && (
            <div
              className="p-4 rounded-2xl border space-y-3"
              style={{ background: t.cardSubtle, borderColor: t.border }}
            >
              {feedbackImport && (
                <p className="text-xs font-bold" style={{ color: t.primary }}>
                  ✓ {feedbackImport}
                </p>
              )}
              {(saldoDetectadoImport !== null ||
                transacoesPreview.length > 0) && (
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTransacoesPreview([]);
                      setSaldoDetectadoImport(null);
                    }}
                    className="px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer"
                    style={{ background: t.card, color: t.text, borderColor: t.border }}
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmarImportacaoBancaria}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                    style={{ background: t.primary }}
                  >
                    Confirmar Importação
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* KPIs DO FLUXO DE CAIXA */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          className="rounded-3xl p-4 border space-y-1"
          style={{ background: t.card, borderColor: t.border }}
        >
          <span
            className="text-xs font-semibold block"
            style={{ color: t.textSoft }}
          >
            Dinheiro Livre Hoje
          </span>
          <p
            className="text-2xl font-bold font-mono-num"
            style={{ color: t.finance }}
          >
            R$ {dinheiroLivreInfo.livreHoje.toFixed(2).replace(".", ",")}
          </p>
          <p className="text-[11px] font-mono-num" style={{ color: t.textSoft }}>
            Líquido R$ {dinheiroLivreInfo.saldoLiquidoDisponivelMes.toFixed(0)}{" "}
            ÷ 4d
          </p>
        </div>

        <div
          className="rounded-3xl p-4 border space-y-1"
          style={{ background: t.card, borderColor: t.border }}
        >
          <span
            className="text-xs font-semibold block"
            style={{ color: t.textSoft }}
          >
            Entradas (Mês)
          </span>
          <p
            className="text-2xl font-bold font-mono-num"
            style={{ color: t.primary }}
          >
            +R$ {receitasRealizadas.toFixed(0)}
          </p>
          <p className="text-[11px] font-mono-num" style={{ color: t.textSoft }}>
            Previsto total: R$ {receitasPrevistas.toFixed(0)}
          </p>
        </div>

        <div
          className="rounded-3xl p-4 border space-y-1"
          style={{ background: t.card, borderColor: t.border }}
        >
          <span
            className="text-xs font-semibold block"
            style={{ color: t.textSoft }}
          >
            Saídas (Mês)
          </span>
          <p
            className="text-2xl font-bold font-mono-num"
            style={{ color: t.action }}
          >
            −R$ {despesasRealizadas.toFixed(0)}
          </p>
          <p className="text-[11px] font-mono-num" style={{ color: t.textSoft }}>
            Previsto total: R$ {despesasPrevistas.toFixed(0)}
          </p>
        </div>

        <div
          className="rounded-3xl p-4 border space-y-1"
          style={{ background: t.card, borderColor: t.border }}
        >
          <span
            className="text-xs font-semibold block"
            style={{ color: t.textSoft }}
          >
            Saldo das Contas
          </span>
          <p
            className="text-2xl font-bold font-mono-num"
            style={{
              color:
                contas.reduce((a, c) => a + c.saldoAtual, 0) >= 0
                  ? t.primary
                  : t.danger,
            }}
          >
            R${" "}
            {contas
              .reduce((a, c) => a + c.saldoAtual, 0)
              .toFixed(2)
              .replace(".", ",")}
          </p>
          <p className="text-[11px] font-mono-num" style={{ color: t.textSoft }}>
            Fluxo mês: R$ {saldoRealizadoMes.toFixed(0)} (prev. R${" "}
            {saldoPrevistoFimMes.toFixed(0)})
          </p>
        </div>
      </div>

      {/* SEÇÃO EM DESTAQUE: CARDS PRÓPRIOS DAS CONTAS BANCÁRIAS (ESTILO MINHAS FINANÇAS) */}
      <section
        className="rounded-3xl p-5 border space-y-4"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${t.finance}18`, color: t.finance }}
            >
              <Building2 size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold" style={{ color: t.text }}>
                Minhas Contas Bancárias & Caixinhas ({contas.length})
              </h3>
              <p className="text-xs" style={{ color: t.textSoft }}>
                Clique no card de qualquer conta para abrir o histórico completo, lançar ou editar dados
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalNovaContaOpen(true)}
            className="px-3.5 py-2 rounded-2xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-xs hover:opacity-95 transition-all"
            style={{ backgroundColor: t.finance }}
          >
            <Plus size={14} /> Nova Conta
          </button>
        </div>

        {/* GRID DE CARDS PRÓPRIOS DE CONTAS COM IDENTIDADE VISUAL DO BANCO */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {contas.map((c) => {
            const ident = getIdentidadeBanco(c.nome, c.bancoId, c.cor);
            const movsContaMes = lancamentosMes.filter(
              (l) => l.contaId === c.id && l.metodo === "Conta / Pix"
            );
            const entradasConta = movsContaMes
              .filter((l) => l.tipo === "receita")
              .reduce((acc, l) => acc + l.valor, 0);
            const saidasConta = movsContaMes
              .filter((l) => l.tipo === "despesa")
              .reduce((acc, l) => acc + l.valor, 0);
            const pendentesConta = movsContaMes
              .filter((l) => l.status === "previsto")
              .reduce(
                (acc, l) => acc + (l.tipo === "receita" ? l.valor : -l.valor),
                0
              );
            const saldoPrevistoConta = c.saldoAtual + pendentesConta;

            return (
              <div
                key={c.id}
                onClick={() => {
                  setContaDetalheId(c.id);
                  setEditandoDadosConta(false);
                  setFiltroExtratoConta("todos");
                }}
                className="group rounded-3xl border overflow-hidden cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
                style={{
                  backgroundColor: t.bg,
                  borderColor: `${ident.corPrimaria}45`,
                }}
              >
                {/* Faixa Superior Identidade do Banco */}
                <div
                  className="h-2 w-full"
                  style={{ background: ident.gradiente }}
                />

                <div className="p-4 space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                        style={{ background: ident.gradiente }}
                      >
                        {ident.renderIcone(20)}
                      </div>
                      <div className="min-w-0">
                        <span
                          className="text-[10px] font-extrabold uppercase tracking-wider block truncate"
                          style={{ color: ident.corPrimaria }}
                        >
                          {ident.nomeBanco} · {c.tipo}
                        </span>
                        <h4
                          className="text-sm font-bold truncate leading-snug"
                          style={{ color: t.text }}
                        >
                          {c.nome}
                        </h4>
                      </div>
                    </div>

                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-0.5"
                      style={{
                        backgroundColor: t.cardSubtle,
                        color: t.textSoft,
                      }}
                    >
                      <ChevronRight size={15} />
                    </div>
                  </div>

                  {/* Saldo Atual e Saldo Previsto */}
                  <div
                    className="p-3 rounded-2xl border flex items-baseline justify-between gap-2"
                    style={{ backgroundColor: t.card, borderColor: t.border }}
                  >
                    <div>
                      <span
                        className="text-[10px] font-bold uppercase block"
                        style={{ color: t.textSoft }}
                      >
                        Saldo Atual
                      </span>
                      <p
                        className="text-lg font-extrabold font-mono-num mt-0.5"
                        style={{
                          color: c.saldoAtual >= 0 ? t.text : t.danger,
                        }}
                      >
                        R$ {c.saldoAtual.toFixed(2).replace(".", ",")}
                      </p>
                    </div>

                    <div className="text-right">
                      <span
                        className="text-[10px] font-semibold block"
                        style={{ color: t.textSoft }}
                      >
                        Previsto Mês
                      </span>
                      <span
                        className="text-xs font-mono-num font-bold"
                        style={{ color: ident.corPrimaria }}
                      >
                        R$ {saldoPrevistoConta.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>

                  {/* Rodapé do Card: Resumo de Entradas, Saídas e Quantidade de Lançamentos */}
                  <div className="flex items-center justify-between text-[11px] font-mono-num pt-0.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="font-bold flex items-center gap-0.5"
                        style={{ color: t.primary }}
                      >
                        <ArrowUpRight size={12} /> +R$ {entradasConta.toFixed(0)}
                      </span>
                      <span
                        className="font-bold flex items-center gap-0.5"
                        style={{ color: t.action }}
                      >
                        <ArrowDownRight size={12} /> −R$ {saidasConta.toFixed(0)}
                      </span>
                    </div>

                    <span
                      className="text-[10px] font-semibold flex items-center gap-1"
                      style={{ color: t.textSoft }}
                    >
                      <History size={11} /> {movsContaMes.length} mov.
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* BARRA DE PROGRESSO DO ORÇAMENTO MENSAL CONSOLIDADO */}
      <section
        className="rounded-3xl p-5 border space-y-3"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Wallet size={16} style={{ color: t.finance }} />
              <h3 className="text-sm font-bold" style={{ color: t.text }}>
                Progresso do Orçamento Mensal Consolidado
              </h3>
            </div>
            <p className="text-xs mt-0.5" style={{ color: t.textSoft }}>
              Acompanhamento visual de gastos realizados vs. teto mensal planejado
            </p>
          </div>

          <div className="text-right">
            <span
              className="text-sm font-mono-num font-bold block"
              style={{
                color:
                  pctOrcamentoGlobal >= 90
                    ? t.danger
                    : pctOrcamentoGlobal >= 75
                    ? t.alert
                    : t.primary,
              }}
            >
              R$ {despesasRealizadas.toFixed(2)} / R$ {tetoMensalGlobal.toFixed(0)} ({pctOrcamentoGlobal}%)
            </span>
            <span className="text-[11px] font-mono-num" style={{ color: t.textSoft }}>
              Margem restante: R$ {saldoOrcamentoRestante.toFixed(2)}
            </span>
          </div>
        </div>

        <div
          className="w-full h-3.5 rounded-full overflow-hidden relative"
          style={{ background: t.cardSubtle }}
        >
          <div
            className="h-3.5 rounded-full absolute left-0 top-0 opacity-30 transition-all duration-300"
            style={{
              width: `${pctOrcamentoPrevistoGlobal}%`,
              background: t.finance,
            }}
          />
          <div
            className="h-3.5 rounded-full relative z-10 transition-all duration-300"
            style={{
              width: `${pctOrcamentoGlobal}%`,
              background:
                pctOrcamentoGlobal >= 90
                  ? t.danger
                  : pctOrcamentoGlobal >= 75
                  ? t.alert
                  : t.primary,
            }}
          />
        </div>
      </section>

      {/* GRID PRINCIPAL 2 COLUNAS NO DESKTOP */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Coluna Esquerda (7 cols): Lançamento Rápido + Extrato Editável */}
        <div className="xl:col-span-7 space-y-5">
          {/* Registrar Lançamento */}
          <section
            className="rounded-3xl p-5 border space-y-3.5"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold" style={{ color: t.text }}>
                  Lançamento Rápido no Fluxo
                </h3>
                <p className="text-xs" style={{ color: t.textSoft }}>
                  Digite uma frase natural ou escolha conta/cartão
                </p>
              </div>
              <div
                className="flex gap-1 p-1 rounded-xl"
                style={{ background: t.cardSubtle }}
              >
                <button
                  onClick={() => setAbaRegistro("rapido_ia")}
                  className="px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  style={{
                    background:
                      abaRegistro === "rapido_ia" ? t.card : "transparent",
                    color: abaRegistro === "rapido_ia" ? t.action : t.textSoft,
                  }}
                >
                  <Sparkles size={12} /> 1 Linha
                </button>
                <button
                  onClick={() => setAbaRegistro("manual")}
                  className="px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{
                    background:
                      abaRegistro === "manual" ? t.card : "transparent",
                    color: abaRegistro === "manual" ? t.text : t.textSoft,
                  }}
                >
                  Completo
                </button>
              </div>
            </div>

            {abaRegistro === "rapido_ia" ? (
              <div className="flex gap-2">
                <input
                  value={inputNatural}
                  onChange={(e) => setInputNatural(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submeterNatural()}
                  placeholder='Ex: "18,50 padaria", "45,90 sachê no cartão", "10 xerox UERJ"...'
                  className="flex-1 px-3.5 py-3 rounded-xl text-xs outline-none border"
                  style={{
                    background: t.bg,
                    color: t.text,
                    borderColor: t.border,
                  }}
                />
                <button
                  onClick={submeterNatural}
                  className="px-5 rounded-xl text-xs font-bold text-white cursor-pointer"
                  style={{ background: t.action }}
                >
                  Lançar
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className="grid grid-cols-2 p-1 rounded-xl"
                    style={{ background: t.bg }}
                  >
                    <button
                      onClick={() => setTipoLanc("despesa")}
                      className="py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                      style={{
                        background:
                          tipoLanc === "despesa" ? t.action : "transparent",
                        color: tipoLanc === "despesa" ? "#fff" : t.textSoft,
                      }}
                    >
                      Saída
                    </button>
                    <button
                      onClick={() => setTipoLanc("receita")}
                      className="py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                      style={{
                        background:
                          tipoLanc === "receita" ? t.primary : "transparent",
                        color: tipoLanc === "receita" ? "#fff" : t.textSoft,
                      }}
                    >
                      Entrada
                    </button>
                  </div>

                  <div
                    className="grid grid-cols-2 p-1 rounded-xl"
                    style={{ background: t.bg }}
                  >
                    <button
                      onClick={() => setStatusLanc("realizado")}
                      className="py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                      style={{
                        background:
                          statusLanc === "realizado"
                            ? t.finance
                            : "transparent",
                        color:
                          statusLanc === "realizado" ? "#fff" : t.textSoft,
                      }}
                    >
                      Realizado
                    </button>
                    <button
                      onClick={() => setStatusLanc("previsto")}
                      className="py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                      style={{
                        background:
                          statusLanc === "previsto" ? t.alert : "transparent",
                        color: statusLanc === "previsto" ? "#fff" : t.textSoft,
                      }}
                    >
                      Previsto
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={valorManual}
                    onChange={(e) => setValorManual(e.target.value)}
                    placeholder="Valor R$ (ex: 35,00)"
                    className="p-2.5 rounded-xl text-xs font-mono-num outline-none border"
                    style={{
                      background: t.bg,
                      color: t.text,
                      borderColor: t.border,
                    }}
                  />
                  <select
                    value={catManual}
                    onChange={(e) =>
                      setCatManual(
                        e.target.value as OrcamentoCategoria["categoria"]
                      )
                    }
                    className="p-2.5 rounded-xl text-xs outline-none border"
                    style={{
                      background: t.bg,
                      color: t.text,
                      borderColor: t.border,
                    }}
                  >
                    {CATEGORIAS_FINANCAS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={metodoLanc}
                    onChange={(e) =>
                      setMetodoLanc(
                        e.target.value as "Conta / Pix" | "Cartão de Crédito"
                      )
                    }
                    className="p-2.5 rounded-xl text-xs outline-none border"
                    style={{
                      background: t.bg,
                      color: t.text,
                      borderColor: t.border,
                    }}
                  >
                    <option value="Conta / Pix">Conta / Pix</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                  </select>

                  {metodoLanc === "Conta / Pix" ? (
                    <select
                      value={contaEscolhidaId}
                      onChange={(e) =>
                        setContaEscolhidaId(Number(e.target.value))
                      }
                      className="p-2.5 rounded-xl text-xs outline-none border"
                      style={{
                        background: t.bg,
                        color: t.text,
                        borderColor: t.border,
                      }}
                    >
                      {contas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={cartaoEscolhidoId}
                      onChange={(e) =>
                        setCartaoEscolhidoId(Number(e.target.value))
                      }
                      className="p-2.5 rounded-xl text-xs outline-none border"
                      style={{
                        background: t.bg,
                        color: t.text,
                        borderColor: t.border,
                      }}
                    >
                      {cartoes.map((cc) => (
                        <option key={cc.id} value={cc.id}>
                          {cc.nome}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    value={descManual}
                    onChange={(e) => setDescManual(e.target.value)}
                    placeholder="Descrição..."
                    className="flex-1 p-2.5 rounded-xl text-xs outline-none border"
                    style={{
                      background: t.bg,
                      color: t.text,
                      borderColor: t.border,
                    }}
                  />
                  <button
                    onClick={submeterManual}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white shrink-0 cursor-pointer"
                    style={{ background: t.finance }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Extrato do Fluxo de Caixa (100% Editável ao Clicar) */}
          <section
            className="rounded-3xl p-5 border space-y-3.5"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold" style={{ color: t.text }}>
                  Movimentações do Mês ({lancamentosFiltrados.length})
                </h3>
                <p className="text-[11px]" style={{ color: t.textSoft }}>
                  Toque em qualquer movimentação para editar valor, descrição, conta ou excluir
                </p>
              </div>

              <div className="flex items-center gap-1">
                {(
                  [
                    { id: "todos", label: "Todos" },
                    { id: "receita", label: "Entradas" },
                    { id: "despesa", label: "Saídas" },
                    { id: "previsto", label: "Previstos" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFiltroFluxo(f.id)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer"
                    style={{
                      background:
                        filtroFluxo === f.id ? t.cardSubtle : "transparent",
                      color: filtroFluxo === f.id ? t.text : t.textSoft,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {lancamentosFiltrados.map((l) => {
                const contaObj = contas.find((c) => c.id === l.contaId);
                const cartaoObj = cartoes.find((c) => c.id === l.cartaoId);
                const identConta = contaObj
                  ? getIdentidadeBanco(
                      contaObj.nome,
                      contaObj.bancoId,
                      contaObj.cor
                    )
                  : null;

                return (
                  <div
                    key={l.id}
                    onClick={() => setLancamentoEditando({ ...l })}
                    className="p-3 rounded-2xl border flex items-center justify-between gap-2 cursor-pointer hover:opacity-95 transition-all"
                    style={{ background: t.bg, borderColor: t.border }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {identConta && l.metodo === "Conta / Pix" ? (
                        <div
                          className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: identConta.gradiente }}
                        >
                          {identConta.renderIcone(13)}
                        </div>
                      ) : l.tipo === "receita" ? (
                        <ArrowUpRight size={16} style={{ color: t.primary }} />
                      ) : (
                        <ArrowDownRight size={16} style={{ color: t.action }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-xs sm:text-sm font-semibold truncate"
                          style={{ color: t.text }}
                        >
                          {l.descricao}
                        </p>
                        <p
                          className="text-[11px] font-mono-num truncate"
                          style={{ color: t.textSoft }}
                        >
                          {l.data} · {l.categoria} ·{" "}
                          {l.metodo === "Cartão de Crédito"
                            ? `Cartão ${cartaoObj?.nome || "Crédito"}`
                            : `${contaObj?.nome || "Conta / Pix"}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {l.status === "previsto" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLancamentos((prev) =>
                              prev.map((item) =>
                                item.id === l.id
                                  ? { ...item, status: "realizado" }
                                  : item
                              )
                            );
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white cursor-pointer"
                          style={{ background: t.alert }}
                          title="Toque para efetivar como pago/recebido"
                        >
                          Efetivar ✓
                        </button>
                      )}
                      <span
                        className="text-xs sm:text-sm font-mono-num font-bold"
                        style={{
                          color: l.tipo === "receita" ? t.primary : t.text,
                        }}
                      >
                        {l.tipo === "receita" ? "+" : "−"}R${" "}
                        {l.valor.toFixed(2)}
                      </span>
                      <Edit3 size={13} style={{ color: t.textSoft }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Coluna Direita (5 cols): Cartões de Crédito Clicáveis & Orçamento Editável */}
        <div className="xl:col-span-5 space-y-5">
          {/* Cartões de Crédito com Identidade Visual e Histórico */}
          <section
            className="rounded-3xl p-5 border space-y-3"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={16} style={{ color: t.action }} />
                <div>
                  <h3 className="text-sm font-bold" style={{ color: t.text }}>
                    Cartões de Crédito ({cartoes.length})
                  </h3>
                  <p className="text-[11px]" style={{ color: t.textSoft }}>
                    Clique no cartão p/ ver compras e editar fatura/limite
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNovoCartaoOpen(true)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                style={{ backgroundColor: `${t.action}18`, color: t.action }}
              >
                <Plus size={13} /> Cartão
              </button>
            </div>

            <div className="space-y-2.5">
              {cartoes.map((cc) => {
                const ident = getIdentidadeBanco(cc.nome, cc.bancoId, cc.cor);
                const disponivel = Math.max(0, cc.limiteTotal - cc.faturaAtual);
                const pctUso =
                  cc.limiteTotal > 0
                    ? Math.min(
                        100,
                        Math.round((cc.faturaAtual / cc.limiteTotal) * 100)
                      )
                    : 0;
                return (
                  <div
                    key={cc.id}
                    onClick={() => setCartaoDetalheId(cc.id)}
                    className="p-3.5 rounded-2xl border space-y-2.5 cursor-pointer hover:shadow-xs transition-all"
                    style={{
                      background: t.bg,
                      borderColor: `${ident.corPrimaria}40`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: ident.gradiente }}
                        >
                          {ident.renderIcone(16)}
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-xs font-bold truncate"
                            style={{ color: t.text }}
                          >
                            {cc.nome}
                          </p>
                          <p
                            className="text-[11px] font-mono-num"
                            style={{ color: t.textSoft }}
                          >
                            Fecha dia {cc.fechamentoDia} · Vence dia{" "}
                            {cc.vencimentoDia}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className="text-xs font-bold font-mono-num"
                          style={{ color: t.action }}
                        >
                          Fatura: R$ {cc.faturaAtual.toFixed(2)}
                        </p>
                        <p
                          className="text-[11px] font-mono-num"
                          style={{ color: t.primary }}
                        >
                          Livre: R$ {disponivel.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div
                      className="w-full h-2 rounded-full overflow-hidden"
                      style={{ background: t.cardSubtle }}
                    >
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${pctUso}%`,
                          background:
                            pctUso > 80 ? t.danger : ident.corPrimaria,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Teto Mensal por Categoria (Editável) */}
          <section
            className="rounded-3xl p-5 border space-y-3"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold" style={{ color: t.text }}>
                  Orçamento por Categoria & Quitação
                </h3>
                <p className="text-[11px]" style={{ color: t.textSoft }}>
                  Ajuste os tetos mensais planejados quando quiser
                </p>
              </div>
              {setOrcamentos && (
                <button
                  type="button"
                  onClick={() => setEditandoOrcamentos((v) => !v)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  style={{
                    backgroundColor: editandoOrcamentos
                      ? t.primary
                      : t.cardSubtle,
                    color: editandoOrcamentos ? "#fff" : t.text,
                  }}
                >
                  <Sliders size={12} />
                  {editandoOrcamentos ? "Concluir" : "Editar Tetos"}
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {orcamentos.map((orc) => {
                const gastoCat = lancamentosMes
                  .filter(
                    (l) => l.tipo === "despesa" && l.categoria === orc.categoria
                  )
                  .reduce((acc, l) => acc + l.valor, 0);
                const pct =
                  orc.tetoMensal > 0
                    ? Math.min(
                        100,
                        Math.round((gastoCat / orc.tetoMensal) * 100)
                      )
                    : 0;
                return (
                  <div key={orc.categoria} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium" style={{ color: t.text }}>
                        {orc.categoria}
                      </span>
                      {editandoOrcamentos && setOrcamentos ? (
                        <div className="flex items-center gap-1">
                          <span
                            className="text-[10px]"
                            style={{ color: t.textSoft }}
                          >
                            Teto R$:
                          </span>
                          <input
                            type="number"
                            step="50"
                            value={orc.tetoMensal}
                            onChange={(e) => {
                              const nv = Math.max(
                                0,
                                Number(e.target.value) || 0
                              );
                              setOrcamentos((prev) =>
                                prev.map((o) =>
                                  o.categoria === orc.categoria
                                    ? { ...o, tetoMensal: nv }
                                    : o
                                )
                              );
                            }}
                            className="w-20 px-2 py-0.5 rounded-lg text-xs font-mono-num font-bold text-right border outline-none"
                            style={{
                              backgroundColor: t.bg,
                              color: t.text,
                              borderColor: t.border,
                            }}
                          />
                        </div>
                      ) : (
                        <span
                          className="font-mono-num"
                          style={{ color: t.textSoft }}
                        >
                          R$ {gastoCat.toFixed(0)} / R$ {orc.tetoMensal} ({pct}
                          %)
                        </span>
                      )}
                    </div>
                    <div
                      className="w-full h-1.5 rounded-full overflow-hidden"
                      style={{ background: t.cardSubtle }}
                    >
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${pct}%`,
                          background:
                            pct >= 90
                              ? t.danger
                              : pct >= 75
                              ? t.alert
                              : t.finance,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trilha de Quitação do Acordo */}
            <div
              className="p-3.5 rounded-2xl border space-y-2.5 mt-3"
              style={{ background: t.bg, borderColor: t.border }}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold" style={{ color: t.text }}>
                  Trilha de Quitação do Acordo ({parcelasAcordoPagas}/
                  {totalParcelasAcordo})
                </span>
                {editandoOrcamentos ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px]" style={{ color: t.textSoft }}>
                      Total parcelas:
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={totalParcelasAcordo}
                      onChange={(e) =>
                        setTotalParcelasAcordo(
                          Math.max(1, Math.min(24, Number(e.target.value) || 8))
                        )
                      }
                      className="w-12 px-1.5 py-0.5 rounded text-xs font-mono-num text-center border"
                      style={{
                        backgroundColor: t.card,
                        color: t.text,
                        borderColor: t.border,
                      }}
                    />
                  </div>
                ) : (
                  <span
                    className="font-mono-num font-bold"
                    style={{ color: t.primary }}
                  >
                    {pctAcordoQuitado}% Quitado
                  </span>
                )}
              </div>
              <div className="grid grid-cols-8 gap-1">
                {Array.from({ length: totalParcelasAcordo }, (_, idx) => {
                  const numParcela = idx + 1;
                  const paga = numParcela <= parcelasAcordoPagas;
                  return (
                    <button
                      key={numParcela}
                      onClick={() => setParcelasAcordoPagas(numParcela)}
                      className="h-6 rounded-lg text-[10px] font-mono-num font-bold flex items-center justify-center transition-all cursor-pointer"
                      style={{
                        background: paga ? t.primary : t.cardSubtle,
                        color: paga ? "#fff" : t.textSoft,
                      }}
                      title={`Marcar até parcela ${numParcela}`}
                    >
                      {paga ? <Check size={10} /> : numParcela}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* =====================================================================
          MODAL 1: FICHA COMPLETA E HISTÓRICO DA CONTA BANCÁRIA (ESTILO MINHAS FINANÇAS)
      ===================================================================== */}
      {contaDetalhe && (() => {
        const ident = getIdentidadeBanco(
          contaDetalhe.nome,
          contaDetalhe.bancoId,
          contaDetalhe.cor
        );
        const todasMovsConta = lancamentos.filter(
          (l) => l.contaId === contaDetalhe.id && l.metodo === "Conta / Pix"
        );
        const movsFiltradasConta = todasMovsConta.filter((l) => {
          if (filtroExtratoConta === "receita") return l.tipo === "receita";
          if (filtroExtratoConta === "despesa") return l.tipo === "despesa";
          if (filtroExtratoConta === "previsto") return l.status === "previsto";
          return true;
        });

        const totalReceitasConta = todasMovsConta
          .filter((l) => l.tipo === "receita")
          .reduce((a, b) => a + b.valor, 0);
        const totalDespesasConta = todasMovsConta
          .filter((l) => l.tipo === "despesa")
          .reduce((a, b) => a + b.valor, 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 backdrop-blur-xs"
              style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
              onClick={() => setContaDetalheId(null)}
            />
            <div
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl flex flex-col"
              style={{ backgroundColor: t.card, borderColor: t.border }}
            >
              {/* Cabeçalho com a Identidade Visual do Banco */}
              <div
                className="p-5 text-white flex items-center justify-between gap-3"
                style={{ background: ident.gradiente }}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-black/25 flex items-center justify-center shrink-0 border border-white/20">
                    {ident.renderIcone(24)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-85 block">
                      {ident.nomeBanco} · {contaDetalhe.tipo}
                    </span>
                    <h3 className="text-base sm:text-lg font-extrabold truncate">
                      {contaDetalhe.nome}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditandoDadosConta((v) => !v)}
                    className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 size={13} />
                    <span>{editandoDadosConta ? "Fechar Edição" : "Editar Conta"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setContaDetalheId(null)}
                    className="w-8 h-8 rounded-full bg-black/25 flex items-center justify-center cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Painel de Edição Completa da Conta (Nome, Banco, Tipo, Saldo e Exclusão) */}
                {editandoDadosConta && (
                  <div
                    className="p-4 rounded-2xl border space-y-3"
                    style={{ backgroundColor: t.bg, borderColor: ident.corPrimaria }}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase" style={{ color: t.text }}>
                        Editar Informações da Conta Bancária
                      </h4>
                      {contas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setContas((prev) =>
                              prev.filter((x) => x.id !== contaDetalhe.id)
                            );
                            setContaDetalheId(null);
                          }}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          style={{
                            backgroundColor: `${t.danger}18`,
                            color: t.danger,
                          }}
                        >
                          <Trash2 size={12} /> Excluir Conta
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          className="text-[10px] font-bold uppercase block mb-1"
                          style={{ color: t.textSoft }}
                        >
                          Nome da Conta
                        </label>
                        <input
                          value={contaDetalhe.nome}
                          onChange={(e) => {
                            const nv = e.target.value;
                            setContas((prev) =>
                              prev.map((x) =>
                                x.id === contaDetalhe.id ? { ...x, nome: nv } : x
                              )
                            );
                          }}
                          className="w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none"
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
                          Instituição / Identidade do Banco
                        </label>
                        <select
                          value={detectarBancoIdPorNome(
                            contaDetalhe.nome,
                            contaDetalhe.bancoId
                          )}
                          onChange={(e) => {
                            const bId = e.target.value as BancoId;
                            const info = CATALOGO_BANCOS[bId];
                            setContas((prev) =>
                              prev.map((x) =>
                                x.id === contaDetalhe.id
                                  ? {
                                      ...x,
                                      bancoId: bId,
                                      cor: info.corPrimaria,
                                    }
                                  : x
                              )
                            );
                          }}
                          className="w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none"
                          style={{
                            backgroundColor: t.card,
                            color: t.text,
                            borderColor: t.border,
                          }}
                        >
                          {Object.values(CATALOGO_BANCOS).map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.nomeBanco}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          className="text-[10px] font-bold uppercase block mb-1"
                          style={{ color: t.textSoft }}
                        >
                          Tipo da Conta
                        </label>
                        <select
                          value={contaDetalhe.tipo}
                          onChange={(e) => {
                            const tp = e.target.value as ContaBancaria["tipo"];
                            setContas((prev) =>
                              prev.map((x) =>
                                x.id === contaDetalhe.id ? { ...x, tipo: tp } : x
                              )
                            );
                          }}
                          className="w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none"
                          style={{
                            backgroundColor: t.card,
                            color: t.text,
                            borderColor: t.border,
                          }}
                        >
                          <option value="Corrente / Pix">Corrente / Pix</option>
                          <option value="Recebimento">Recebimento</option>
                          <option value="Reserva">Reserva / Caixinha</option>
                          <option value="Investimentos">Investimentos</option>
                          <option value="Carteira Física">Carteira Física</option>
                        </select>
                      </div>

                      <div>
                        <label
                          className="text-[10px] font-bold uppercase block mb-1"
                          style={{ color: t.textSoft }}
                        >
                          Saldo Atual (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={contaDetalhe.saldoAtual}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setContas((prev) =>
                              prev.map((x) =>
                                x.id === contaDetalhe.id
                                  ? { ...x, saldoAtual: val }
                                  : x
                              )
                            );
                          }}
                          className="w-full px-3 py-2 rounded-xl text-xs font-mono-num font-bold border outline-none"
                          style={{
                            backgroundColor: t.card,
                            color: t.text,
                            borderColor: t.border,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* KPIs Rápidos da Conta */}
                <div className="grid grid-cols-3 gap-3">
                  <div
                    className="p-3.5 rounded-2xl border"
                    style={{ backgroundColor: t.bg, borderColor: t.border }}
                  >
                    <span
                      className="text-[10px] font-bold uppercase block"
                      style={{ color: t.textSoft }}
                    >
                      Saldo Atual (Toque p/ editar)
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      <span
                        className="text-xs font-mono-num font-bold"
                        style={{ color: t.textSoft }}
                      >
                        R$
                      </span>
                      <input
                        type="number"
                        step="10"
                        value={contaDetalhe.saldoAtual}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setContas((prev) =>
                            prev.map((x) =>
                              x.id === contaDetalhe.id
                                ? { ...x, saldoAtual: val }
                                : x
                            )
                          );
                        }}
                        className="w-full text-base font-mono-num font-extrabold bg-transparent outline-none"
                        style={{ color: t.text }}
                      />
                    </div>
                  </div>

                  <div
                    className="p-3.5 rounded-2xl border"
                    style={{ backgroundColor: t.bg, borderColor: t.border }}
                  >
                    <span
                      className="text-[10px] font-bold uppercase block"
                      style={{ color: t.textSoft }}
                    >
                      Entradas na Conta
                    </span>
                    <p
                      className="text-base font-mono-num font-extrabold mt-1"
                      style={{ color: t.primary }}
                    >
                      +R$ {totalReceitasConta.toFixed(2).replace(".", ",")}
                    </p>
                  </div>

                  <div
                    className="p-3.5 rounded-2xl border"
                    style={{ backgroundColor: t.bg, borderColor: t.border }}
                  >
                    <span
                      className="text-[10px] font-bold uppercase block"
                      style={{ color: t.textSoft }}
                    >
                      Saídas na Conta
                    </span>
                    <p
                      className="text-base font-mono-num font-extrabold mt-1"
                      style={{ color: t.action }}
                    >
                      −R$ {totalDespesasConta.toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                </div>

                {/* Adicionar Lançamento Direto nesta Conta */}
                <div
                  className="p-3.5 rounded-2xl border space-y-2.5"
                  style={{ backgroundColor: t.bg, borderColor: t.border }}
                >
                  <span
                    className="text-[11px] font-bold block"
                    style={{ color: t.text }}
                  >
                    + Lançar Movimentação Direto em {contaDetalhe.nome}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <select
                      value={novoLancContaTipo}
                      onChange={(e) =>
                        setNovoLancContaTipo(
                          e.target.value as "despesa" | "receita"
                        )
                      }
                      className="sm:col-span-2 px-2.5 py-2 rounded-xl text-xs font-bold border outline-none"
                      style={{
                        backgroundColor: t.card,
                        color:
                          novoLancContaTipo === "receita"
                            ? t.primary
                            : t.action,
                        borderColor: t.border,
                      }}
                    >
                      <option value="despesa">− Saída</option>
                      <option value="receita">+ Entrada</option>
                    </select>

                    <input
                      value={novoLancContaDesc}
                      onChange={(e) => setNovoLancContaDesc(e.target.value)}
                      placeholder="Descrição (ex: Pix, Mercado, Salário)..."
                      className="sm:col-span-4 px-3 py-2 rounded-xl text-xs border outline-none"
                      style={{
                        backgroundColor: t.card,
                        color: t.text,
                        borderColor: t.border,
                      }}
                    />

                    <input
                      value={novoLancContaVal}
                      onChange={(e) => setNovoLancContaVal(e.target.value)}
                      placeholder="Valor R$"
                      className="sm:col-span-2 px-2.5 py-2 rounded-xl text-xs font-mono-num border outline-none"
                      style={{
                        backgroundColor: t.card,
                        color: t.text,
                        borderColor: t.border,
                      }}
                    />

                    <select
                      value={novoLancContaCat}
                      onChange={(e) =>
                        setNovoLancContaCat(
                          e.target.value as OrcamentoCategoria["categoria"]
                        )
                      }
                      className="sm:col-span-2 px-2 py-2 rounded-xl text-xs border outline-none"
                      style={{
                        backgroundColor: t.card,
                        color: t.text,
                        borderColor: t.border,
                      }}
                    >
                      {CATEGORIAS_FINANCAS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        const val = parseFloat(
                          novoLancContaVal.replace(",", ".")
                        );
                        if (isNaN(val) || val <= 0) return;
                        adicionarLancamento(
                          val,
                          novoLancContaCat,
                          novoLancContaDesc.trim() ||
                            `${
                              novoLancContaTipo === "receita"
                                ? "Entrada"
                                : "Saída"
                            } ${contaDetalhe.nome}`,
                          "Conta / Pix",
                          "realizado",
                          novoLancContaCat === "Pets" &&
                            novoLancContaTipo === "despesa",
                          contaDetalhe.id,
                          undefined,
                          novoLancContaTipo
                        );
                        // Atualiza também o saldo da conta automaticamente
                        setContas((prev) =>
                          prev.map((x) =>
                            x.id === contaDetalhe.id
                              ? {
                                  ...x,
                                  saldoAtual:
                                    novoLancContaTipo === "receita"
                                      ? x.saldoAtual + val
                                      : x.saldoAtual - val,
                                }
                              : x
                          )
                        );
                        setNovoLancContaDesc("");
                        setNovoLancContaVal("");
                      }}
                      className="sm:col-span-2 py-2 px-3 rounded-xl text-xs font-bold text-white cursor-pointer"
                      style={{ backgroundColor: ident.corPrimaria }}
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                {/* Histórico / Extrato Completo da Conta */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs sm:text-sm font-bold" style={{ color: t.text }}>
                      Histórico & Extrato da Conta ({movsFiltradasConta.length})
                    </h4>

                    <div className="flex items-center gap-1">
                      {(
                        [
                          { id: "todos", label: "Todos" },
                          { id: "receita", label: "Entradas" },
                          { id: "despesa", label: "Saídas" },
                          { id: "previsto", label: "Previstos" },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setFiltroExtratoConta(f.id)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer"
                          style={{
                            backgroundColor:
                              filtroExtratoConta === f.id
                                ? t.cardSubtle
                                : "transparent",
                            color:
                              filtroExtratoConta === f.id ? t.text : t.textSoft,
                          }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {movsFiltradasConta.length === 0 ? (
                    <div
                      className="p-6 rounded-2xl border text-center text-xs"
                      style={{
                        backgroundColor: t.bg,
                        borderColor: t.border,
                        color: t.textSoft,
                      }}
                    >
                      Nenhuma movimentação registrada nesta conta para este filtro.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {movsFiltradasConta.map((mov) => (
                        <div
                          key={mov.id}
                          onClick={() => setLancamentoEditando({ ...mov })}
                          className="p-3 rounded-2xl border flex items-center justify-between gap-2 cursor-pointer hover:opacity-90"
                          style={{
                            backgroundColor: t.bg,
                            borderColor: t.border,
                          }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {mov.tipo === "receita" ? (
                              <ArrowUpRight
                                size={15}
                                style={{ color: t.primary }}
                              />
                            ) : (
                              <ArrowDownRight
                                size={15}
                                style={{ color: t.action }}
                              />
                            )}
                            <div className="min-w-0">
                              <p
                                className="text-xs font-bold truncate"
                                style={{ color: t.text }}
                              >
                                {mov.descricao}
                              </p>
                              <p
                                className="text-[10px] font-mono-num"
                                style={{ color: t.textSoft }}
                              >
                                {mov.data} · {mov.categoria} ·{" "}
                                {mov.status === "previsto"
                                  ? "Previsto"
                                  : "Realizado"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className="text-xs font-mono-num font-bold"
                              style={{
                                color:
                                  mov.tipo === "receita" ? t.primary : t.text,
                              }}
                            >
                              {mov.tipo === "receita" ? "+" : "−"}R${" "}
                              {mov.valor.toFixed(2)}
                            </span>
                            <Edit3 size={12} style={{ color: t.textSoft }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =====================================================================
          MODAL 2: CRIAR NOVA CONTA BANCÁRIA COM IDENTIDADE DO BANCO
      ===================================================================== */}
      {modalNovaContaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 backdrop-blur-xs"
            style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
            onClick={() => setModalNovaContaOpen(false)}
          />
          <div
            className="relative w-full max-w-md rounded-3xl p-5 border shadow-2xl space-y-4"
            style={{ backgroundColor: t.card, borderColor: t.border }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: t.text }}>
                Adicionar Conta Bancária / Caixinha
              </h3>
              <button
                onClick={() => setModalNovaContaOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                style={{ backgroundColor: t.cardSubtle }}
              >
                <X size={15} style={{ color: t.textSoft }} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  className="text-[10px] font-bold uppercase block mb-1.5"
                  style={{ color: t.textSoft }}
                >
                  Escolha a Identidade Visual do Banco
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto p-1">
                  {Object.values(CATALOGO_BANCOS).map((b) => {
                    const sel = novaContaBancoId === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setNovaContaBancoId(b.id);
                          if (!novaContaNome.trim()) {
                            setNovaContaNome(b.nomeBanco);
                          }
                        }}
                        className="p-2 rounded-2xl border flex flex-col items-center gap-1 text-center cursor-pointer transition-all"
                        style={{
                          backgroundColor: sel ? `${b.corPrimaria}18` : t.bg,
                          borderColor: sel ? b.corPrimaria : t.border,
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center"
                          style={{ background: b.gradiente }}
                        >
                          {b.renderIcone(15)}
                        </div>
                        <span
                          className="text-[10px] font-bold truncate w-full"
                          style={{ color: t.text }}
                        >
                          {b.nomeBanco.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  className="text-[10px] font-bold uppercase block mb-1"
                  style={{ color: t.textSoft }}
                >
                  Nome da Conta
                </label>
                <input
                  value={novaContaNome}
                  onChange={(e) => setNovaContaNome(e.target.value)}
                  placeholder="Ex: Nubank Principal, Itaú Salário, Caixinha Pets..."
                  className="w-full px-3 py-2.5 rounded-xl text-xs border outline-none"
                  style={{
                    backgroundColor: t.bg,
                    color: t.text,
                    borderColor: t.border,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    className="text-[10px] font-bold uppercase block mb-1"
                    style={{ color: t.textSoft }}
                  >
                    Tipo
                  </label>
                  <select
                    value={novaContaTipo}
                    onChange={(e) =>
                      setNovaContaTipo(e.target.value as ContaBancaria["tipo"])
                    }
                    className="w-full px-3 py-2.5 rounded-xl text-xs border outline-none"
                    style={{
                      backgroundColor: t.bg,
                      color: t.text,
                      borderColor: t.border,
                    }}
                  >
                    <option value="Corrente / Pix">Corrente / Pix</option>
                    <option value="Recebimento">Recebimento</option>
                    <option value="Reserva">Reserva / Caixinha</option>
                    <option value="Investimentos">Investimentos</option>
                    <option value="Carteira Física">Carteira Física</option>
                  </select>
                </div>

                <div>
                  <label
                    className="text-[10px] font-bold uppercase block mb-1"
                    style={{ color: t.textSoft }}
                  >
                    Saldo Inicial (R$)
                  </label>
                  <input
                    value={novaContaSaldo}
                    onChange={(e) => setNovaContaSaldo(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-mono-num border outline-none"
                    style={{
                      backgroundColor: t.bg,
                      color: t.text,
                      borderColor: t.border,
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={criarNovaConta}
                className="w-full py-3 rounded-2xl text-xs font-bold text-white cursor-pointer"
                style={{ backgroundColor: t.primary }}
              >
                Criar Conta Bancária
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: FICHA E HISTÓRICO DO CARTÃO DE CRÉDITO
      ===================================================================== */}
      {cartaoDetalhe && (() => {
        const ident = getIdentidadeBanco(
          cartaoDetalhe.nome,
          cartaoDetalhe.bancoId,
          cartaoDetalhe.cor
        );
        const comprasCartao = lancamentos.filter(
          (l) =>
            l.cartaoId === cartaoDetalhe.id &&
            l.metodo === "Cartão de Crédito"
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 backdrop-blur-xs"
              style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
              onClick={() => setCartaoDetalheId(null)}
            />
            <div
              className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl border shadow-2xl"
              style={{ backgroundColor: t.card, borderColor: t.border }}
            >
              <div
                className="p-5 text-white flex items-center justify-between"
                style={{ background: ident.gradiente }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-black/25 flex items-center justify-center border border-white/20">
                    {ident.renderIcone(20)}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase opacity-80 block">
                      Cartão de Crédito · {ident.nomeBanco}
                    </span>
                    <h3 className="text-base font-extrabold">
                      {cartaoDetalhe.nome}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setCartaoDetalheId(null)}
                  className="w-8 h-8 rounded-full bg-black/25 flex items-center justify-center cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label
                      className="text-[10px] font-bold uppercase block mb-1"
                      style={{ color: t.textSoft }}
                    >
                      Nome do Cartão
                    </label>
                    <input
                      value={cartaoDetalhe.nome}
                      onChange={(e) => {
                        const nv = e.target.value;
                        setCartoes((prev) =>
                          prev.map((x) =>
                            x.id === cartaoDetalhe.id ? { ...x, nome: nv } : x
                          )
                        );
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none"
                      style={{
                        backgroundColor: t.bg,
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
                      Banco
                    </label>
                    <select
                      value={detectarBancoIdPorNome(
                        cartaoDetalhe.nome,
                        cartaoDetalhe.bancoId
                      )}
                      onChange={(e) => {
                        const bId = e.target.value as BancoId;
                        setCartoes((prev) =>
                          prev.map((x) =>
                            x.id === cartaoDetalhe.id
                              ? {
                                  ...x,
                                  bancoId: bId,
                                  cor: CATALOGO_BANCOS[bId].corPrimaria,
                                }
                              : x
                          )
                        );
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none"
                      style={{
                        backgroundColor: t.bg,
                        color: t.text,
                        borderColor: t.border,
                      }}
                    >
                      {Object.values(CATALOGO_BANCOS).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nomeBanco}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label
                      className="text-[10px] font-bold uppercase block mb-1"
                      style={{ color: t.textSoft }}
                    >
                      Fatura Atual (R$)
                    </label>
                    <input
                      type="number"
                      step="10"
                      value={cartaoDetalhe.faturaAtual}
                      onChange={(e) => {
                        const v = Math.max(0, parseFloat(e.target.value) || 0);
                        setCartoes((prev) =>
                          prev.map((x) =>
                            x.id === cartaoDetalhe.id
                              ? { ...x, faturaAtual: v }
                              : x
                          )
                        );
                      }}
                      className="w-full px-2.5 py-2 rounded-xl text-xs font-mono-num font-bold border outline-none"
                      style={{
                        backgroundColor: t.bg,
                        color: t.action,
                        borderColor: t.border,
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="text-[10px] font-bold uppercase block mb-1"
                      style={{ color: t.textSoft }}
                    >
                      Limite Total (R$)
                    </label>
                    <input
                      type="number"
                      step="100"
                      value={cartaoDetalhe.limiteTotal}
                      onChange={(e) => {
                        const v = Math.max(0, parseFloat(e.target.value) || 0);
                        setCartoes((prev) =>
                          prev.map((x) =>
                            x.id === cartaoDetalhe.id
                              ? { ...x, limiteTotal: v }
                              : x
                          )
                        );
                      }}
                      className="w-full px-2.5 py-2 rounded-xl text-xs font-mono-num font-bold border outline-none"
                      style={{
                        backgroundColor: t.bg,
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
                      Dia Fechamento
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={cartaoDetalhe.fechamentoDia}
                      onChange={(e) => {
                        const v = Math.min(
                          31,
                          Math.max(1, Number(e.target.value) || 1)
                        );
                        setCartoes((prev) =>
                          prev.map((x) =>
                            x.id === cartaoDetalhe.id
                              ? { ...x, fechamentoDia: v }
                              : x
                          )
                        );
                      }}
                      className="w-full px-2.5 py-2 rounded-xl text-xs font-mono-num font-bold border outline-none"
                      style={{
                        backgroundColor: t.bg,
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
                      Dia Vencimento
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={cartaoDetalhe.vencimentoDia}
                      onChange={(e) => {
                        const v = Math.min(
                          31,
                          Math.max(1, Number(e.target.value) || 1)
                        );
                        setCartoes((prev) =>
                          prev.map((x) =>
                            x.id === cartaoDetalhe.id
                              ? { ...x, vencimentoDia: v }
                              : x
                          )
                        );
                      }}
                      className="w-full px-2.5 py-2 rounded-xl text-xs font-mono-num font-bold border outline-none"
                      style={{
                        backgroundColor: t.bg,
                        color: t.text,
                        borderColor: t.border,
                      }}
                    />
                  </div>
                </div>

                {/* Lista de Compras no Cartão */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold" style={{ color: t.text }}>
                    Compras lançadas neste cartão ({comprasCartao.length})
                  </h4>
                  {comprasCartao.length === 0 ? (
                    <p className="text-xs" style={{ color: t.textSoft }}>
                      Nenhuma compra individual vinculada a este cartão neste mês.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {comprasCartao.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => setLancamentoEditando({ ...c })}
                          className="p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer"
                          style={{
                            backgroundColor: t.bg,
                            borderColor: t.border,
                          }}
                        >
                          <span className="font-semibold truncate" style={{ color: t.text }}>
                            {c.data} · {c.descricao}
                          </span>
                          <span className="font-mono-num font-bold" style={{ color: t.action }}>
                            R$ {c.valor.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {cartoes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCartoes((prev) =>
                        prev.filter((x) => x.id !== cartaoDetalhe.id)
                      );
                      setCartaoDetalheId(null);
                    }}
                    className="w-full py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{
                      backgroundColor: `${t.danger}15`,
                      color: t.danger,
                    }}
                  >
                    <Trash2 size={13} /> Excluir Cartão de Crédito
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* =====================================================================
          MODAL 4: NOVO CARTÃO DE CRÉDITO
      ===================================================================== */}
      {modalNovoCartaoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 backdrop-blur-xs"
            style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
            onClick={() => setModalNovoCartaoOpen(false)}
          />
          <div
            className="relative w-full max-w-md rounded-3xl p-5 border shadow-2xl space-y-4"
            style={{ backgroundColor: t.card, borderColor: t.border }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: t.text }}>
                Adicionar Cartão de Crédito
              </h3>
              <button
                onClick={() => setModalNovoCartaoOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                style={{ backgroundColor: t.cardSubtle }}
              >
                <X size={15} style={{ color: t.textSoft }} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  className="text-[10px] font-bold uppercase block mb-1"
                  style={{ color: t.textSoft }}
                >
                  Banco Emissor
                </label>
                <select
                  value={novoCartaoBancoId}
                  onChange={(e) => {
                    const b = e.target.value as BancoId;
                    setNovoCartaoBancoId(b);
                    if (!novoCartaoNome.trim()) {
                      setNovoCartaoNome(`Cartão ${CATALOGO_BANCOS[b].nomeBanco}`);
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-bold border outline-none"
                  style={{
                    backgroundColor: t.bg,
                    color: t.text,
                    borderColor: t.border,
                  }}
                >
                  {Object.values(CATALOGO_BANCOS).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nomeBanco}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="text-[10px] font-bold uppercase block mb-1"
                  style={{ color: t.textSoft }}
                >
                  Nome do Cartão
                </label>
                <input
                  value={novoCartaoNome}
                  onChange={(e) => setNovoCartaoNome(e.target.value)}
                  placeholder="Ex: Nubank Roxinho, Itaú Click..."
                  className="w-full px-3 py-2.5 rounded-xl text-xs border outline-none"
                  style={{
                    backgroundColor: t.bg,
                    color: t.text,
                    borderColor: t.border,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    className="text-[10px] font-bold uppercase block mb-1"
                    style={{ color: t.textSoft }}
                  >
                    Limite Total (R$)
                  </label>
                  <input
                    value={novoCartaoLimite}
                    onChange={(e) => setNovoCartaoLimite(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono-num border outline-none"
                    style={{
                      backgroundColor: t.bg,
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
                    Fatura Atual (R$)
                  </label>
                  <input
                    value={novoCartaoFatura}
                    onChange={(e) => setNovoCartaoFatura(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono-num border outline-none"
                    style={{
                      backgroundColor: t.bg,
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
                    Fecha dia
                  </label>
                  <input
                    type="number"
                    value={novoCartaoFecha}
                    onChange={(e) => setNovoCartaoFecha(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono-num border outline-none"
                    style={{
                      backgroundColor: t.bg,
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
                    Vence dia
                  </label>
                  <input
                    type="number"
                    value={novoCartaoVence}
                    onChange={(e) => setNovoCartaoVence(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono-num border outline-none"
                    style={{
                      backgroundColor: t.bg,
                      color: t.text,
                      borderColor: t.border,
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={criarNovoCartao}
                className="w-full py-3 rounded-2xl text-xs font-bold text-white cursor-pointer"
                style={{ backgroundColor: t.action }}
              >
                Salvar Cartão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: EDITAR OU EXCLUIR QUALQUER LANÇAMENTO / MOVIMENTAÇÃO
      ===================================================================== */}
      {lancamentoEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 backdrop-blur-xs"
            style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
            onClick={() => setLancamentoEditando(null)}
          />
          <div
            className="relative w-full max-w-md rounded-3xl p-5 border shadow-2xl space-y-4"
            style={{ backgroundColor: t.card, borderColor: t.border }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: t.text }}>
                Editar Movimentação
              </h3>
              <button
                onClick={() => setLancamentoEditando(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                style={{ backgroundColor: t.cardSubtle }}
              >
                <X size={15} style={{ color: t.textSoft }} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  className="text-[10px] font-bold uppercase block mb-1"
                  style={{ color: t.textSoft }}
                >
                  Descrição
                </label>
                <input
                  value={lancamentoEditando.descricao}
                  onChange={(e) =>
                    setLancamentoEditando({
                      ...lancamentoEditando,
                      descricao: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold border outline-none"
                  style={{
                    backgroundColor: t.bg,
                    color: t.text,
                    borderColor: t.border,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    className="text-[10px] font-bold uppercase block mb-1"
                    style={{ color: t.textSoft }}
                  >
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={lancamentoEditando.valor}
                    onChange={(e) =>
                      setLancamentoEditando({
                        ...lancamentoEditando,
                        valor: Math.max(0, parseFloat(e.target.value) || 0),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono-num font-bold border outline-none"
                    style={{
                      backgroundColor: t.bg,
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
                    Data
                  </label>
                  <input
                    value={lancamentoEditando.data}
                    onChange={(e) =>
                      setLancamentoEditando({
                        ...lancamentoEditando,
                        data: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono-num border outline-none"
                    style={{
                      backgroundColor: t.bg,
                      color: t.text,
                      borderColor: t.border,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    className="text-[10px] font-bold uppercase block mb-1"
                    style={{ color: t.textSoft }}
                  >
                    Tipo
                  </label>
                  <select
                    value={lancamentoEditando.tipo}
                    onChange={(e) =>
                      setLancamentoEditando({
                        ...lancamentoEditando,
                        tipo: e.target.value as "despesa" | "receita",
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none"
                    style={{
                      backgroundColor: t.bg,
                      color: t.text,
                      borderColor: t.border,
                    }}
                  >
                    <option value="despesa">Saída (Despesa)</option>
                    <option value="receita">Entrada (Receita)</option>
                  </select>
                </div>

                <div>
                  <label
                    className="text-[10px] font-bold uppercase block mb-1"
                    style={{ color: t.textSoft }}
                  >
                    Status
                  </label>
                  <select
                    value={lancamentoEditando.status}
                    onChange={(e) =>
                      setLancamentoEditando({
                        ...lancamentoEditando,
                        status: e.target.value as "realizado" | "previsto",
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none"
                    style={{
                      backgroundColor: t.bg,
                      color: t.text,
                      borderColor: t.border,
                    }}
                  >
                    <option value="realizado">Realizado (Pago)</option>
                    <option value="previsto">Previsto (Pendente)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    className="text-[10px] font-bold uppercase block mb-1"
                    style={{ color: t.textSoft }}
                  >
                    Categoria
                  </label>
                  <select
                    value={lancamentoEditando.categoria}
                    onChange={(e) =>
                      setLancamentoEditando({
                        ...lancamentoEditando,
                        categoria: e.target
                          .value as OrcamentoCategoria["categoria"],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs border outline-none"
                    style={{
                      backgroundColor: t.bg,
                      color: t.text,
                      borderColor: t.border,
                    }}
                  >
                    {CATEGORIAS_FINANCAS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className="text-[10px] font-bold uppercase block mb-1"
                    style={{ color: t.textSoft }}
                  >
                    Conta Vinculada
                  </label>
                  <select
                    value={lancamentoEditando.contaId ?? contas[0]?.id ?? 1}
                    onChange={(e) =>
                      setLancamentoEditando({
                        ...lancamentoEditando,
                        metodo: "Conta / Pix",
                        contaId: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs border outline-none"
                    style={{
                      backgroundColor: t.bg,
                      color: t.text,
                      borderColor: t.border,
                    }}
                  >
                    {contas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setLancamentos((prev) =>
                      prev.filter((x) => x.id !== lancamentoEditando.id)
                    );
                    setLancamentoEditando(null);
                  }}
                  className="px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  style={{
                    backgroundColor: `${t.danger}15`,
                    color: t.danger,
                  }}
                >
                  <Trash2 size={14} /> Excluir
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLancamentos((prev) =>
                      prev.map((x) =>
                        x.id === lancamentoEditando.id ? lancamentoEditando : x
                      )
                    );
                    setLancamentoEditando(null);
                  }}
                  className="flex-1 py-2.5 rounded-2xl text-xs font-bold text-white cursor-pointer"
                  style={{ backgroundColor: t.primary }}
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
