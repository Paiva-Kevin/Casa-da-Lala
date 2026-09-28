import React, { useState } from "react";
import {
  Wallet,
  CreditCard,
  Sparkles,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Filter,
  Upload,
  FileSpreadsheet,
  BellRing,
  Info,
  X,
} from "lucide-react";
import {
  CartaoCredito,
  ContaBancaria,
  LancamentoFinanceiro,
  MesFinanceiroKey,
  OrcamentoCategoria,
  ThemeTokens,
} from "../../types/lala";
import { parseGastoNatural } from "../../data/initialData";

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

function parseArquivoBancarioSemOpenFinance(
  conteudo: string
): {
  saldoDetectado: number | null;
  transacoes: TransacaoImportadaPreview[];
} {
  const transacoes: TransacaoImportadaPreview[] = [];
  let saldoDetectado: number | null = null;

  // 1. Verifica se é arquivo OFX (Nubank, Itaú, BB, Bradesco, Inter, Santander, C6, Caixa)
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

  // 2. Verifica linhas de CSV ou texto colado de Notificações / SMS / Extrato Bancário
  const linhas = conteudo
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  linhas.forEach((linha, idx) => {
    // Detecta linha de saldo: ex "Saldo atual: R$ 1.450,90" ou "Saldo em conta 980,00"
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

    // Se for CSV separado por vírgula ou ponto-e-vírgula (ex: Data,Valor,Identificador,Descrição)
    if (linha.includes(";") || (linha.includes(",") && linha.split(",").length >= 3)) {
      const sep = linha.includes(";") ? ";" : ",";
      const cols = linha.split(sep).map((c) => c.replace(/^"|"$/g, "").trim());
      // Ignora cabeçalho
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

    // 3. Texto de Notificação / SMS / Extrato copiado (ex: "Compra aprovada R$ 45,90 Padaria" ou "Pix recebido R$ 300,00")
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

export function FinancasScreen({
  t,
  mesSelecionado,
  setMesSelecionado,
  contas,
  setContas,
  cartoes,
  orcamentos,
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

  // Importação Bancária Automática Sem Open Finance (OFX / CSV / Leitor de Notificações e Saldo)
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

  // Rastreador Stitch: Parcelas do Acordo (8 parcelas totais)
  const [parcelasAcordoPagas, setParcelasAcordoPagas] = useState<number>(5);
  const totalParcelasAcordo = 8;
  const pctAcordoQuitado = Math.round(
    (parcelasAcordoPagas / totalParcelasAcordo) * 100
  );

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

  // Orçamento Mensal Global Consolidado (Barra de Progresso Visual)
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
      1,
      1,
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

  return (
    <div className="space-y-5">
      {/* TOPO: SELETOR DE MÊS + BOTÃO VINCULAR/IMPORTAR BANCO SEM OPEN FINANCE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: t.text }}>
            Finanças · Fluxo de Caixa & Sincronização Bancária
          </h2>
          <p className="text-xs" style={{ color: t.textSoft }}>
            Visão direta de Entradas, Saídas, Dinheiro Livre Hoje e Importação sem Open Finance
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
            <span>Importar Banco (Sem Open Finance)</span>
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

      {/* PAINEL DE VINCULAÇÃO / IMPORTAÇÃO BANCÁRIA SEM OPEN FINANCE (OFX, CSV E ESPELHO DE NOTIFICAÇÕES) */}
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
                <h3 className="text-sm sm:text-base font-bold" style={{ color: t.text }}>
                  Sincronização de Saldo & Extrato (Estilo GuiaBolso / OFX / Leitor de Notificações)
                </h3>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: t.textSoft }}>
                <strong style={{ color: t.text }}>Como funcionava antes vs. hoje:</strong>{" "}
                Antigamente, apps como o GuiaBolso usavam uma leitura direta com a senha de consulta do banco (<em>screen scraping</em>). Hoje os bancos bloqueiam login direto de terceiros por causa da biometria facial/token, mas você consegue a <strong>mesma importação automática de saldo e transações sem usar Open Finance</strong> de duas formas instantâneas:
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
            {/* Método 1: Arquivo OFX / CSV do App do Banco */}
            <div
              className="lg:col-span-5 p-4 rounded-2xl border space-y-3"
              style={{ background: t.bg, borderColor: t.border }}
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} style={{ color: t.primary }} />
                <h4 className="text-xs sm:text-sm font-bold" style={{ color: t.text }}>
                  1. Enviar Extrato OFX ou CSV (Atualiza Saldo + Gastos)
                </h4>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: t.textSoft }}>
                No app do seu banco (Nubank, Itaú, BB, Inter, Bradesco, Santander, C6), toque em <strong>Exportar Extrato → OFX ou CSV</strong> e selecione aqui. O arquivo OFX já traz seu <strong>saldo exato</strong> e todas as transações categorizadas:
              </p>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase block" style={{ color: t.textSoft }}>
                  Vincular à Conta do App:
                </label>
                <select
                  value={contaDestinoImportId}
                  onChange={(e) => setContaDestinoImportId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold outline-none border"
                  style={{ background: t.card, color: t.text, borderColor: t.border }}
                >
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} (Saldo atual: R$ {c.saldoAtual.toFixed(2)})
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

            {/* Método 2: Colar Notificações / SMS / Linhas do Extrato */}
            <div
              className="lg:col-span-7 p-4 rounded-2xl border space-y-3"
              style={{ background: t.bg, borderColor: t.border }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BellRing size={16} style={{ color: t.action }} />
                  <h4 className="text-xs sm:text-sm font-bold" style={{ color: t.text }}>
                    2. Leitor de Notificações Bancárias / Extrato Copiado
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
                  Testar com exemplo
                </button>
              </div>
              <p className="text-[11px]" style={{ color: t.textSoft }}>
                Cole abaixo notificações do celular, SMS do banco ou linhas copiadas do aplicativo do banco (inclusive <code className="font-mono">Saldo atual: R$ ...</code>):
              </p>

              <textarea
                rows={3}
                value={textoNotificacaoBanco}
                onChange={(e) => setTextoNotificacaoBanco(e.target.value)}
                placeholder={`Exemplo:\nSaldo atual: R$ 1.520,00\nCompra no débito R$ 34,90 Mercado\nPix recebido +R$ 200,00`}
                className="w-full p-3 rounded-xl text-xs font-mono-num outline-none border resize-none"
                style={{ background: t.card, color: t.text, borderColor: t.border }}
              />

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] flex items-center gap-1" style={{ color: t.textSoft }}>
                  <Info size={12} /> Identifica saldo, entradas, saídas e categorias sozinho
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

          {/* Preview dos itens lidos antes de confirmar */}
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

              {saldoDetectadoImport !== null && (
                <div
                  className="p-3 rounded-xl border flex items-center justify-between"
                  style={{ background: t.card, borderColor: t.primary }}
                >
                  <span className="text-xs font-bold" style={{ color: t.text }}>
                    Novo Saldo Identificado para{" "}
                    {contas.find((c) => c.id === contaDestinoImportId)?.nome}:
                  </span>
                  <span
                    className="text-sm font-mono-num font-bold"
                    style={{ color: t.primary }}
                  >
                    R$ {saldoDetectadoImport.toFixed(2)}
                  </span>
                </div>
              )}

              {transacoesPreview.length > 0 && (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {transacoesPreview.map((tr) => (
                    <div
                      key={tr.id}
                      className="p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs"
                      style={{ background: t.card, borderColor: t.border }}
                    >
                      <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tr.selecionada}
                          onChange={(e) =>
                            setTransacoesPreview((prev) =>
                              prev.map((x) =>
                                x.id === tr.id
                                  ? { ...x, selecionada: e.target.checked }
                                  : x
                              )
                            )
                          }
                        />
                        <span className="font-mono-num text-[11px]" style={{ color: t.textSoft }}>
                          {tr.data}
                        </span>
                        <span className="font-bold truncate" style={{ color: t.text }}>
                          {tr.descricao}
                        </span>
                      </label>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={tr.categoria}
                          onChange={(e) =>
                            setTransacoesPreview((prev) =>
                              prev.map((x) =>
                                x.id === tr.id
                                  ? {
                                      ...x,
                                      categoria: e.target
                                        .value as OrcamentoCategoria["categoria"],
                                    }
                                  : x
                              )
                            )
                          }
                          className="px-2 py-1 rounded-lg text-[11px] border outline-none"
                          style={{ background: t.bg, color: t.text, borderColor: t.border }}
                        >
                          {orcamentos.map((o) => (
                            <option key={o.categoria} value={o.categoria}>
                              {o.categoria}
                            </option>
                          ))}
                        </select>
                        <span
                          className="font-mono-num font-bold"
                          style={{
                            color: tr.tipo === "receita" ? t.primary : t.action,
                          }}
                        >
                          {tr.tipo === "receita" ? "+" : "−"}R${" "}
                          {tr.valor.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
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
                    Confirmar & Atualizar Saldo/Fluxo
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* KPIs DO FLUXO DE CAIXA SIMPLIFICADO (4 COLUNAS NO DESKTOP, 2 NO MOBILE) */}
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
            Saldo do Fluxo
          </span>
          <p
            className="text-2xl font-bold font-mono-num"
            style={{
              color: saldoRealizadoMes >= 0 ? t.primary : t.danger,
            }}
          >
            R$ {saldoRealizadoMes.toFixed(2)}
          </p>
          <p className="text-[11px] font-mono-num" style={{ color: t.textSoft }}>
            Fechamento prev.: R$ {saldoPrevistoFimMes.toFixed(0)}
          </p>
        </div>
      </div>

      {/* BARRA DE PROGRESSO VISUAL DO ORÇAMENTO MENSAL CONSOLIDADO */}
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

          <div className="flex items-center gap-3">
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
                Margem restante no teto: R$ {saldoOrcamentoRestante.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div
          className="w-full h-3.5 rounded-full overflow-hidden relative"
          style={{ background: t.cardSubtle }}
        >
          {/* Barra tracejada/suave do previsto total */}
          <div
            className="h-3.5 rounded-full absolute left-0 top-0 opacity-30 transition-all duration-300"
            style={{
              width: `${pctOrcamentoPrevistoGlobal}%`,
              background: t.finance,
            }}
          />
          {/* Barra sólida do realizado */}
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

        <div className="flex items-center justify-between text-[11px] font-mono-num" style={{ color: t.textSoft }}>
          <span>Realizado: {pctOrcamentoGlobal}% do orçamento</span>
          <span>Projeção com previstos: {pctOrcamentoPrevistoGlobal}%</span>
        </div>
      </section>

      {/* GRID PRINCIPAL 2 COLUNAS NO DESKTOP */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Coluna Esquerda (7 cols): Lançamento Rápido + Extrato do Fluxo de Caixa */}
        <div className="xl:col-span-7 space-y-5">
          {/* Registrar Lançamento Simplificado */}
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
                  Digite uma frase natural ou detalhe conta/cartão
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
              <div className="space-y-2">
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
                    {orcamentos.map((o) => (
                      <option key={o.categoria} value={o.categoria}>
                        {o.categoria}
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

          {/* Extrato do Fluxo de Caixa com Filtros */}
          <section
            className="rounded-3xl p-5 border space-y-3.5"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold" style={{ color: t.text }}>
                Movimentações do Mês ({lancamentosFiltrados.length})
              </h3>

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
                const nomeConta = contas
                  .find((c) => c.id === l.contaId)
                  ?.nome.split(" ")[0];
                const nomeCartao = cartoes
                  .find((c) => c.id === l.cartaoId)
                  ?.nome.split(" ")[0];
                return (
                  <div
                    key={l.id}
                    className="p-3 rounded-2xl border flex items-center justify-between gap-2"
                    style={{ background: t.bg, borderColor: t.border }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {l.tipo === "receita" ? (
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
                          className="text-[11px] font-mono-num"
                          style={{ color: t.textSoft }}
                        >
                          {l.data} · {l.categoria} ·{" "}
                          {l.metodo === "Cartão de Crédito"
                            ? `Cartão ${nomeCartao || "Crédito"}`
                            : `Conta ${nomeConta || "Pix"}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {l.status === "previsto" && (
                        <button
                          onClick={() =>
                            setLancamentos((prev) =>
                              prev.map((item) =>
                                item.id === l.id
                                  ? { ...item, status: "realizado" }
                                  : item
                              )
                            )
                          }
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
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Coluna Direita (5 cols): Contas, Cartões & Teto por Categoria */}
        <div className="xl:col-span-5 space-y-5">
          {/* Contas Bancárias */}
          <section
            className="rounded-3xl p-5 border space-y-3"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={16} style={{ color: t.finance }} />
                <h3 className="text-sm font-bold" style={{ color: t.text }}>
                  Contas & Caixinhas
                </h3>
              </div>
              <span className="text-[11px]" style={{ color: t.textSoft }}>
                Toque no saldo p/ ajustar
              </span>
            </div>

            <div className="space-y-2">
              {contas.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-2xl border flex items-center justify-between gap-2"
                  style={{ background: t.bg, borderColor: t.border }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-8 rounded-full shrink-0"
                      style={{ background: c.cor }}
                    />
                    <div className="min-w-0">
                      <p
                        className="text-xs sm:text-sm font-bold truncate"
                        style={{ color: t.text }}
                      >
                        {c.nome}
                      </p>
                      <p className="text-[11px]" style={{ color: t.textSoft }}>
                        {c.tipo}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className="text-xs font-mono-num"
                      style={{ color: t.textSoft }}
                    >
                      R$
                    </span>
                    <input
                      type="number"
                      step="10"
                      value={c.saldoAtual}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setContas((prev) =>
                          prev.map((item) =>
                            item.id === c.id
                              ? { ...item, saldoAtual: val }
                              : item
                          )
                        );
                      }}
                      className="w-20 px-2 py-1 rounded-lg text-xs font-mono-num font-bold text-right outline-none"
                      style={{ background: t.card, color: t.text }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Cartões de Crédito */}
          <section
            className="rounded-3xl p-5 border space-y-3"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex items-center gap-2">
              <CreditCard size={16} style={{ color: t.action }} />
              <h3 className="text-sm font-bold" style={{ color: t.text }}>
                Cartões de Crédito
              </h3>
            </div>

            <div className="space-y-2.5">
              {cartoes.map((cc) => {
                const disponivel = Math.max(0, cc.limiteTotal - cc.faturaAtual);
                const pctUso = Math.min(
                  100,
                  Math.round((cc.faturaAtual / cc.limiteTotal) * 100)
                );
                return (
                  <div
                    key={cc.id}
                    className="p-3.5 rounded-2xl border space-y-2"
                    style={{ background: t.bg, borderColor: t.border }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold" style={{ color: t.text }}>
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
                      <div className="text-right">
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
                          background: pctUso > 75 ? t.alert : t.finance,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Teto Mensal por Categoria */}
          <section
            className="rounded-3xl p-5 border space-y-3"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: t.text }}>
                Orçamento & Quitação
              </h3>
              <span
                className="text-xs font-mono-num font-bold"
                style={{ color: t.primary }}
              >
                Acordo 5/8 (62%)
              </span>
            </div>

            <div className="space-y-2">
              {orcamentos.map((orc) => {
                const gastoCat = lancamentosMes
                  .filter(
                    (l) => l.tipo === "despesa" && l.categoria === orc.categoria
                  )
                  .reduce((acc, l) => acc + l.valor, 0);
                const pct = Math.min(
                  100,
                  Math.round((gastoCat / orc.tetoMensal) * 100)
                );
                return (
                  <div key={orc.categoria} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium" style={{ color: t.text }}>
                        {orc.categoria}
                      </span>
                      <span
                        className="font-mono-num"
                        style={{ color: t.textSoft }}
                      >
                        R$ {gastoCat.toFixed(0)} / R$ {orc.tetoMensal} ({pct}%)
                      </span>
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

            {/* NOVO COMPONENTE STITCH: TRILHA DE QUITAÇÃO DO ACORDO (8 PARCELAS) & RESERVA PETS */}
            <div
              className="p-3.5 rounded-2xl border space-y-2.5 mt-3"
              style={{ background: t.bg, borderColor: t.border }}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold" style={{ color: t.text }}>
                  Trilha de Quitação do Acordo ({parcelasAcordoPagas}/
                  {totalParcelasAcordo})
                </span>
                <span
                  className="font-mono-num font-bold"
                  style={{ color: t.primary }}
                >
                  {pctAcordoQuitado}% Quitado
                </span>
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
              <p className="text-[11px]" style={{ color: t.textSoft }}>
                Toque em uma parcela para simular/atualizar progresso de quitação
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
