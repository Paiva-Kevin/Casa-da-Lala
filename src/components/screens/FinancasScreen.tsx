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
      {/* TOPO: SELETOR DE MÊS + RESUMO DE FLUXO DE CAIXA SIMPLIFICADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: t.text }}>
            Finanças · Fluxo de Caixa Simplificado
          </h2>
          <p className="text-xs" style={{ color: t.textSoft }}>
            Visão direta de Entradas, Saídas, Dinheiro Livre Hoje e Contas
          </p>
        </div>

        <div
          className="grid grid-cols-3 gap-1 p-1 rounded-2xl border sm:w-80"
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
