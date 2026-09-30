import React, { useState } from "react";
import {
  Check,
  AlertTriangle,
  Package,
  Home,
  Plus,
  Pause,
  Play,
  CalendarClock,
  FastForward,
  Edit3,
  Trash2,
  ArrowUpRight,
  PawPrint,
  Utensils,
  ShoppingBag,
  ChevronRight,
} from "lucide-react";
import {
  BottomSheetPayload,
  ComodoCasa,
  FrequenciaRotina,
  ItemEstoqueCasa,
  ItemListaCompras,
  PetPerfil,
  RotinaComodo,
  ThemeTokens,
} from "../../types/lala";

interface CasaRotinasScreenProps {
  t: ThemeTokens;
  openCard: (payload: BottomSheetPayload) => void;
  comodos: ComodoCasa[];
  setComodos: React.Dispatch<React.SetStateAction<ComodoCasa[]>>;
  estoqueCasa: ItemEstoqueCasa[];
  setEstoqueCasa?: React.Dispatch<React.SetStateAction<ItemEstoqueCasa[]>>;
  ajustarItemEstoqueCasa: (itemId: number, delta: number) => void;
  listaCompras: ItemListaCompras[];
  setListaCompras: React.Dispatch<React.SetStateAction<ItemListaCompras[]>>;
  comprarItemDaListaEReporEstoque: (itemCompra: ItemListaCompras) => void;
  enviarRotinaParaHoje: (rotina: RotinaComodo, comodoNome: string) => void;
  petsPerfil: PetPerfil[];
  setPetsPerfil?: React.Dispatch<React.SetStateAction<PetPerfil[]>>;
  alimentarPet: (petId: number) => void;
  registrarCompraSaches: (pet: PetPerfil) => void;
  showToast: (msg: string) => void;
}

const CICLO_POR_FREQUENCIA: Record<FrequenciaRotina, number> = {
  Diária: 1,
  "3x na semana": 2,
  Semanal: 7,
  Quinzenal: 15,
};

export function CasaPetsScreen({
  t,
  openCard,
  comodos,
  setComodos,
  estoqueCasa,
  setEstoqueCasa,
  ajustarItemEstoqueCasa,
  listaCompras,
  setListaCompras,
  comprarItemDaListaEReporEstoque,
  enviarRotinaParaHoje,
  petsPerfil,
  setPetsPerfil,
  alimentarPet,
  registrarCompraSaches,
  showToast,
}: CasaRotinasScreenProps) {
  const [subAbaCasa, setSubAbaCasa] = useState<
    "rotinas_ambientes" | "estoque_compras"
  >("rotinas_ambientes");
  const [filtroComodoId, setFiltroComodoId] = useState<number | "todos">("todos");
  const [novoComodoNome, setNovoComodoNome] = useState("");
  const [mostrarNovoComodo, setMostrarNovoComodo] = useState(false);
  const [novoEstoqueNome, setNovoEstoqueNome] = useState("");
  const [novoEstoqueMin, setNovoEstoqueMin] = useState("1");
  const [novoEstoqueUn, setNovoEstoqueUn] = useState("un");

  // Edição inline de uma rotina recorrente
  const [rotinaEditandoId, setRotinaEditandoId] = useState<number | null>(null);
  const [editTarefaTexto, setEditTarefaTexto] = useState<string>("");
  const [editFrequencia, setEditFrequencia] =
    useState<FrequenciaRotina>("Semanal");
  const [editTempoMin, setEditTempoMin] = useState<number>(10);

  // Criação de nova rotina recorrente
  const [novoComodoAlvoId, setNovoComodoAlvoId] = useState<number>(
    comodos[0]?.id ?? 1
  );
  const [novaRotinaTexto, setNovaRotinaTexto] = useState<string>("");
  const [novaRotinaFreq, setNovaRotinaFreq] =
    useState<FrequenciaRotina>("Semanal");
  const [novaRotinaMin, setNovaRotinaMin] = useState<number>(10);

  // Novo item de compra
  const [novoItemCompraNome, setNovoItemCompraNome] = useState("");
  const [novoItemCompraPreco, setNovoItemCompraPreco] = useState("");

  // Controles Rápidos Stitch: Fonte de Água Inox e Caixas de Areia (Nina & Tobias)
  const [fonteAguaLimpaHoje, setFonteAguaLimpaHoje] = useState<boolean>(true);
  const [diasFiltroCarvao, setDiasFiltroCarvao] = useState<number>(18);
  const [areiaManhaFeita, setAreiaManhaFeita] = useState<boolean>(true);
  const [areiaNoiteFeita, setAreiaNoiteFeita] = useState<boolean>(false);

  // Rotinas vencidas hoje (exclui pausadas)
  const rotinasVencidasHoje = comodos.flatMap((c) =>
    c.rotinas
      .filter(
        (r) => !r.pausada && !r.feitoHoje && r.diasDesdeUltimaVez >= r.diasCiclo
      )
      .map((r) => ({ ...r, comodoNome: c.nome, comodoId: c.id }))
  );

  const totalMinutosVencidosHoje = rotinasVencidasHoje.reduce(
    (acc, r) => acc + r.tempoEstimadoMin,
    0
  );
  const comodosEmDiaCount = comodos.filter((c) =>
    c.rotinas.every(
      (r) => r.pausada || r.feitoHoje || r.diasDesdeUltimaVez < r.diasCiclo
    )
  ).length;
  const pctCasaEmOrdem =
    comodos.length > 0
      ? Math.round((comodosEmDiaCount / comodos.length) * 100)
      : 100;

  const concluirRotina = (comodoId: number, rotinaId: number) => {
    setComodos((prev) =>
      prev.map((c) =>
        c.id === comodoId
          ? {
              ...c,
              rotinas: c.rotinas.map((r) =>
                r.id === rotinaId
                  ? {
                      ...r,
                      feitoHoje: !r.feitoHoje,
                      diasDesdeUltimaVez: !r.feitoHoje ? 0 : r.diasCiclo,
                      proximaDataLabel: undefined,
                    }
                  : r
              ),
            }
          : c
      )
    );
    showToast("Ciclo da rotina atualizado!");
  };

  // Pausar ou Retomar rotina recorrente
  const alternarPausaRotina = (comodoId: number, rotinaId: number) => {
    setComodos((prev) =>
      prev.map((c) =>
        c.id === comodoId
          ? {
              ...c,
              rotinas: c.rotinas.map((r) =>
                r.id === rotinaId ? { ...r, pausada: !r.pausada } : r
              ),
            }
          : c
      )
    );
    showToast("Status de pausa da rotina atualizado");
  };

  // Adiantar rotina para vencer Hoje
  const adiantarRotinaParaHoje = (comodoId: number, rotina: RotinaComodo, comodoNome: string) => {
    setComodos((prev) =>
      prev.map((c) =>
        c.id === comodoId
          ? {
              ...c,
              rotinas: c.rotinas.map((r) =>
                r.id === rotina.id
                  ? {
                      ...r,
                      pausada: false,
                      feitoHoje: false,
                      diasDesdeUltimaVez: r.diasCiclo,
                      proximaDataLabel: "Adiantada p/ Hoje",
                    }
                  : r
              ),
            }
          : c
      )
    );
    enviarRotinaParaHoje(rotina, comodoNome);
  };

  // Reagendar rotina (adiar em +dias)
  const reagendarRotina = (
    comodoId: number,
    rotinaId: number,
    diasParaAdiar: number
  ) => {
    setComodos((prev) =>
      prev.map((c) =>
        c.id === comodoId
          ? {
              ...c,
              rotinas: c.rotinas.map((r) => {
                if (r.id !== rotinaId) return r;
                const novoDiasDesde = Math.max(
                  0,
                  r.diasCiclo - diasParaAdiar
                );
                return {
                  ...r,
                  feitoHoje: false,
                  diasDesdeUltimaVez: novoDiasDesde,
                  proximaDataLabel: `Reagendada (+${diasParaAdiar}d)`,
                };
              }),
            }
          : c
      )
    );
    showToast(`Rotina reagendada para daqui a ${diasParaAdiar} dia(s)`);
  };

  const iniciarEdicaoRotina = (r: RotinaComodo) => {
    setRotinaEditandoId(r.id);
    setEditTarefaTexto(r.tarefa);
    setEditFrequencia(r.frequencia);
    setEditTempoMin(r.tempoEstimadoMin);
  };

  const salvarEdicaoRotina = (comodoId: number, rotinaId: number) => {
    if (!editTarefaTexto.trim()) return;
    const novoCiclo = CICLO_POR_FREQUENCIA[editFrequencia];
    setComodos((prev) =>
      prev.map((c) =>
        c.id === comodoId
          ? {
              ...c,
              rotinas: c.rotinas.map((r) =>
                r.id === rotinaId
                  ? {
                      ...r,
                      tarefa: editTarefaTexto.trim(),
                      frequencia: editFrequencia,
                      diasCiclo: novoCiclo,
                      tempoEstimadoMin: Math.max(1, Number(editTempoMin) || 10),
                    }
                  : r
              ),
            }
          : c
      )
    );
    setRotinaEditandoId(null);
    showToast("Rotina atualizada com sucesso!");
  };

  const excluirRotina = (comodoId: number, rotinaId: number) => {
    setComodos((prev) =>
      prev.map((c) =>
        c.id === comodoId
          ? {
              ...c,
              rotinas: c.rotinas.filter((r) => r.id !== rotinaId),
            }
          : c
      )
    );
    showToast("Rotina removida do ambiente");
  };

  const criarNovaRotina = () => {
    if (!novaRotinaTexto.trim()) return;
    const diasCiclo = CICLO_POR_FREQUENCIA[novaRotinaFreq];
    const nova: RotinaComodo = {
      id: Date.now(),
      tarefa: novaRotinaTexto.trim(),
      frequencia: novaRotinaFreq,
      diasCiclo,
      diasDesdeUltimaVez: diasCiclo,
      feitoHoje: false,
      tempoEstimadoMin: Math.max(1, Number(novaRotinaMin) || 10),
      pausada: false,
    };

    setComodos((prev) =>
      prev.map((c) =>
        c.id === novoComodoAlvoId
          ? { ...c, rotinas: [...c.rotinas, nova] }
          : c
      )
    );
    setNovaRotinaTexto("");
    showToast("Nova rotina recorrente adicionada!");
  };

  const comodosVisiveis =
    filtroComodoId === "todos"
      ? comodos
      : comodos.filter((c) => c.id === filtroComodoId);

  const sachesTotais = petsPerfil[0]?.estoqueSaches ?? 4;
  const racaoTotalKg = petsPerfil[0]?.estoqueRacaoKg ?? 1.4;
  const diasRestantesSaches = Math.max(0, Math.floor(sachesTotais / 2));
  const diasRestantesRacao = Math.max(
    0,
    Math.floor((racaoTotalKg * 1000) / 110)
  );

  return (
    <div className="space-y-5">
      {/* 1. PAINEL EM DESTAQUE: CUIDADO DOS PETS (NINA & TOBIAS) NA ABA CASA & PETS */}
      <section
        className="rounded-3xl p-5 border space-y-4"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <PawPrint size={18} style={{ color: t.primary }} />
            <div>
              <h3 className="text-sm sm:text-base font-bold" style={{ color: t.text }}>
                Cuidado dos Pets · Nina & Tobias (Atalho de Sachês)
              </h3>
              <p className="text-xs" style={{ color: t.textSoft }}>
                1 toque desconta sachê/ração Urinary do estoque da casa e aciona a Lista de Compras quando crítico
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-xs font-mono-num font-bold px-3 py-1.5 rounded-xl text-white"
              style={{
                background: diasRestantesSaches <= 3 ? t.alert : t.primary,
              }}
            >
              Estoque: {sachesTotais} sachês (~{diasRestantesSaches}d) ·{" "}
              {racaoTotalKg.toFixed(1)}kg ração (~{diasRestantesRacao}d)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {petsPerfil.map((pet) => {
            const ultimoPeso =
              pet.historicoPeso[pet.historicoPeso.length - 1]?.pesoKg ?? 4.0;
            return (
              <div
                key={pet.id}
                className="p-4 rounded-2xl border flex flex-col justify-between space-y-3"
                style={{ background: t.bg, borderColor: t.border }}
              >
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => openCard({ tipo: "pet", id: pet.id })}
                    className="text-left cursor-pointer"
                  >
                    <h4 className="text-sm font-bold" style={{ color: t.text }}>
                      {pet.nome}
                    </h4>
                    <p
                      className="text-xs font-mono-num mt-0.5"
                      style={{ color: t.textSoft }}
                    >
                      Peso: {ultimoPeso} kg · Próx. Vet:{" "}
                      {pet.proximaVet.split("—")[0]}
                    </p>
                  </button>
                  <button
                    onClick={() => openCard({ tipo: "pet", id: pet.id })}
                    className="p-1.5 rounded-xl cursor-pointer"
                    style={{ background: t.cardSubtle }}
                  >
                    <ChevronRight size={14} style={{ color: t.textSoft }} />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: t.textSoft }}>
                    Porções/Sachês hoje:
                  </span>
                  <span
                    className="font-mono-num font-bold"
                    style={{ color: t.primary }}
                  >
                    {pet.alimentadoHojeRefeicoes}/{pet.metaRefeicoesDia} refeições
                  </span>
                </div>

                <button
                  onClick={() => alimentarPet(pet.id)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                  style={{ background: t.primary }}
                >
                  <Utensils size={13} /> Dar 1 Sachê / Alimentar {pet.nome}
                </button>
              </div>
            );
          })}

          {/* Card de Atalho Rápido de Reposição de Sachês */}
          <div
            className="p-4 rounded-2xl border flex flex-col justify-between space-y-3"
            style={{ background: t.bg, borderColor: t.border }}
          >
            <div>
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: t.finance }}
              >
                Atalho Rápido · Estoque Urinary
              </span>
              <h4
                className="text-sm font-bold mt-0.5"
                style={{ color: t.text }}
              >
                Reposição de Sachês Úmidos
              </h4>
              <p className="text-xs mt-1" style={{ color: t.textSoft }}>
                Soma +10 unidades imediatamente ao estoque da Nina e do Tobias e registra R$ 45,90 no fluxo de caixa.
              </p>
            </div>

            {petsPerfil[0] && (
              <button
                onClick={() => registrarCompraSaches(petsPerfil[0])}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                style={{ background: t.finance }}
              >
                <ShoppingBag size={13} /> +10 Sachês no Estoque (R$ 45,90)
              </button>
            )}
          </div>
        </div>

        {/* NOVO PAINEL STITCH: BEM-ESTAR FELINO (FONTE DE ÁGUA INOX, CAIXAS DE AREIA & AUTONOMIA URINARY) */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t"
          style={{ borderColor: t.border }}
        >
          {/* 1. Fonte de Água Inox & Filtro */}
          <div
            className="p-3.5 rounded-2xl border flex items-center justify-between gap-3"
            style={{ background: t.bg, borderColor: t.border }}
          >
            <div className="min-w-0">
              <span
                className="text-[10px] font-bold uppercase tracking-wider block"
                style={{ color: t.primary }}
              >
                Hidratação Renal · Fonte Inox
              </span>
              <p className="text-xs font-bold truncate" style={{ color: t.text }}>
                {fonteAguaLimpaHoje
                  ? "Água fresca trocada hoje ✓"
                  : "Pendente trocar água da fonte"}
              </p>
              <p
                className="text-[11px] font-mono-num"
                style={{ color: t.textSoft }}
              >
                Filtro de carvão: {diasFiltroCarvao}/30 dias
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  setFonteAguaLimpaHoje((v) => !v);
                  showToast("Status da Fonte Inox atualizado!");
                }}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer"
                style={{
                  background: fonteAguaLimpaHoje ? t.primary : t.cardSubtle,
                  color: fonteAguaLimpaHoje ? "#fff" : t.text,
                }}
              >
                {fonteAguaLimpaHoje ? "Em dia ✓" : "Trocar Água"}
              </button>
              <button
                onClick={() => {
                  setDiasFiltroCarvao(1);
                  showToast("Filtro de carvão zerado (30 dias de autonomia)!");
                }}
                className="px-2 py-1.5 rounded-xl text-[10px] font-mono-num cursor-pointer"
                style={{ background: t.cardSubtle, color: t.textSoft }}
                title="Zerar ciclo do filtro de carvão"
              >
                Novo Filtro
              </button>
            </div>
          </div>

          {/* 2. Controle Rápido das Caixas de Areia (Manhã & Noite) */}
          <div
            className="p-3.5 rounded-2xl border flex items-center justify-between gap-3"
            style={{ background: t.bg, borderColor: t.border }}
          >
            <div className="min-w-0">
              <span
                className="text-[10px] font-bold uppercase tracking-wider block"
                style={{ color: t.action }}
              >
                Higiene · 2 Caixas de Areia
              </span>
              <p className="text-xs font-bold truncate" style={{ color: t.text }}>
                Peneirar Manhã & Noite
              </p>
              <p className="text-[11px]" style={{ color: t.textSoft }}>
                Monitoramento urinário preventivo
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  setAreiaManhaFeita((v) => !v);
                  showToast("Turno Manhã das caixas de areia atualizado!");
                }}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer"
                style={{
                  background: areiaManhaFeita ? t.primary : t.cardSubtle,
                  color: areiaManhaFeita ? "#fff" : t.textSoft,
                }}
              >
                Manhã {areiaManhaFeita ? "✓" : ""}
              </button>
              <button
                onClick={() => {
                  setAreiaNoiteFeita((v) => !v);
                  showToast("Turno Noite das caixas de areia atualizado!");
                }}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer"
                style={{
                  background: areiaNoiteFeita ? t.primary : t.cardSubtle,
                  color: areiaNoiteFeita ? "#fff" : t.textSoft,
                }}
              >
                Noite {areiaNoiteFeita ? "✓" : ""}
              </button>
            </div>
          </div>

          {/* 3. Barra Visual de Autonomia Urinary */}
          <div
            className="p-3.5 rounded-2xl border flex flex-col justify-between gap-1.5"
            style={{ background: t.bg, borderColor: t.border }}
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold" style={{ color: t.text }}>
                Autonomia Protocolo Urinary
              </span>
              <span
                className="font-mono-num font-bold"
                style={{
                  color: diasRestantesSaches <= 3 ? t.alert : t.primary,
                }}
              >
                110g/d + 2 sachês/d
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono-num" style={{ color: t.textSoft }}>
                <span>Sachês ({sachesTotais} un)</span>
                <span>~{diasRestantesSaches} dias</span>
              </div>
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ background: t.cardSubtle }}
              >
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (sachesTotais / 20) * 100)}%`,
                    background: diasRestantesSaches <= 3 ? t.alert : t.primary,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BARRA STITCH: SCORE DE ORDEM DA CASA & TEMPO ESTIMADO HOJE */}
      <section
        className="rounded-3xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center font-mono-num font-bold text-xs shrink-0"
            style={{ background: `${t.primary}18`, color: t.primary }}
          >
            {pctCasaEmOrdem}%
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold" style={{ color: t.text }}>
              Índice de Ordem da Casa · {comodosEmDiaCount}/{comodos.length} ambientes em dia
            </h4>
            <p className="text-[11px]" style={{ color: t.textSoft }}>
              {rotinasVencidasHoje.length > 0
                ? `${rotinasVencidasHoje.length} rotina(s) pendente(s) hoje · Tempo total estimado: ~${totalMinutosVencidosHoje} min`
                : "Todos os ambientes estão com a manutenção em dia!"}
            </p>
          </div>
        </div>
        <div className="w-full sm:w-48 h-2 rounded-full overflow-hidden" style={{ background: t.cardSubtle }}>
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{ width: `${pctCasaEmOrdem}%`, background: t.primary }}
          />
        </div>
      </section>

      {/* Seletor Superior: Ambientes & Rotinas Recorrentes vs Estoque & Compras */}
      <div
        className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl border max-w-xl"
        style={{ background: t.card, borderColor: t.border }}
      >
        <button
          onClick={() => setSubAbaCasa("rotinas_ambientes")}
          className="py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          style={{
            background:
              subAbaCasa === "rotinas_ambientes" ? t.action : "transparent",
            color: subAbaCasa === "rotinas_ambientes" ? "#fff" : t.textSoft,
          }}
        >
          Ambientes & Rotinas Editáveis
        </button>
        <button
          onClick={() => setSubAbaCasa("estoque_compras")}
          className="py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          style={{
            background:
              subAbaCasa === "estoque_compras" ? t.action : "transparent",
            color: subAbaCasa === "estoque_compras" ? "#fff" : t.textSoft,
          }}
        >
          Estoque da Casa & Lista ({listaCompras.filter((i) => !i.comprado).length})
        </button>
      </div>

      {subAbaCasa === "rotinas_ambientes" && (
        <div className="space-y-5">
          {/* PAINEL DE ROTINAS VENCIDAS HOJE + FILTRO POR AMBIENTE */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* Coluna Esquerda (5 cols): Rotinas que venceram Hoje + Criador de Nova Rotina */}
            <div className="xl:col-span-5 space-y-5">
              <section
                className="rounded-3xl p-5 border space-y-3.5"
                style={{ background: t.card, borderColor: t.border }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: t.text }}>
                      Rotinas Vencidas Hoje ({rotinasVencidasHoje.length})
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: t.textSoft }}>
                      Conclua, reagende (+1d / +3d) ou pause qualquer rotina sem perder o controle
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {rotinasVencidasHoje.map((rot) => (
                    <div
                      key={rot.id}
                      className="p-3.5 rounded-2xl border space-y-2.5"
                      style={{ background: t.bg, borderColor: t.border }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div
                            className="flex items-center gap-1.5 text-[11px] font-mono-num"
                            style={{ color: t.textSoft }}
                          >
                            <span
                              className="font-semibold"
                              style={{ color: t.action }}
                            >
                              {rot.comodoNome}
                            </span>
                            <span>·</span>
                            <span>{rot.frequencia}</span>
                            <span>·</span>
                            <span>{rot.tempoEstimadoMin} min</span>
                          </div>
                          <p
                            className="text-xs sm:text-sm font-bold mt-0.5"
                            style={{ color: t.text }}
                          >
                            {rot.tarefa}
                          </p>
                        </div>

                        <button
                          onClick={() => concluirRotina(rot.comodoId, rot.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white shrink-0 flex items-center gap-1 cursor-pointer"
                          style={{ background: t.primary }}
                        >
                          <Check size={13} /> Feito
                        </button>
                      </div>

                      {/* Ações rápidas: Enviar p/ Hoje, Reagendar +1d, Pausar */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t" style={{ borderColor: t.border }}>
                        <button
                          onClick={() =>
                            enviarRotinaParaHoje(rot, rot.comodoNome)
                          }
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          style={{ background: t.cardSubtle, color: t.action }}
                        >
                          <ArrowUpRight size={11} /> Levar p/ Tarefas Hoje
                        </button>
                        <button
                          onClick={() =>
                            reagendarRotina(rot.comodoId, rot.id, 1)
                          }
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                          style={{ background: t.cardSubtle, color: t.textSoft }}
                        >
                          <CalendarClock size={11} /> Adiar +1d
                        </button>
                        <button
                          onClick={() =>
                            alternarPausaRotina(rot.comodoId, rot.id)
                          }
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                          style={{ background: t.cardSubtle, color: t.textSoft }}
                        >
                          <Pause size={11} /> Pausar
                        </button>
                      </div>
                    </div>
                  ))}

                  {rotinasVencidasHoje.length === 0 && (
                    <div
                      className="p-5 rounded-2xl border text-center"
                      style={{ background: t.bg, borderColor: t.border }}
                    >
                      <p className="text-xs font-bold" style={{ color: t.primary }}>
                        ✨ Nenhuma rotina pendente no momento!
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: t.textSoft }}>
                        Você pode adiantar qualquer rotina futura nos ambientes ao lado.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* CRIAR NOVA ROTINA RECORRENTE */}
              <section
                className="rounded-3xl p-5 border space-y-3"
                style={{ background: t.card, borderColor: t.border }}
              >
                <h3 className="text-sm font-bold" style={{ color: t.text }}>
                  Adicionar Nova Rotina Recorrente
                </h3>

                <div className="space-y-2.5">
                  <input
                    value={novaRotinaTexto}
                    onChange={(e) => setNovaRotinaTexto(e.target.value)}
                    placeholder="Ex: Higienizar tapete de treino, Limpar filtro do ar..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none border"
                    style={{
                      background: t.bg,
                      color: t.text,
                      borderColor: t.border,
                    }}
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={novoComodoAlvoId}
                      onChange={(e) =>
                        setNovoComodoAlvoId(Number(e.target.value))
                      }
                      className="px-2.5 py-2 rounded-xl text-xs outline-none border cursor-pointer"
                      style={{
                        background: t.bg,
                        color: t.text,
                        borderColor: t.border,
                      }}
                    >
                      {comodos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>

                    <select
                      value={novaRotinaFreq}
                      onChange={(e) =>
                        setNovaRotinaFreq(e.target.value as FrequenciaRotina)
                      }
                      className="px-2.5 py-2 rounded-xl text-xs outline-none border cursor-pointer"
                      style={{
                        background: t.bg,
                        color: t.text,
                        borderColor: t.border,
                      }}
                    >
                      <option value="Diária">Diária (1d)</option>
                      <option value="3x na semana">3x/sem (2d)</option>
                      <option value="Semanal">Semanal (7d)</option>
                      <option value="Quinzenal">Quinzenal (15d)</option>
                    </select>

                    <div className="flex items-center gap-1 px-2.5 py-2 rounded-xl border" style={{ background: t.bg, borderColor: t.border }}>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={novaRotinaMin}
                        onChange={(e) =>
                          setNovaRotinaMin(Math.max(1, Number(e.target.value)))
                        }
                        className="w-full text-xs font-mono-num font-bold outline-none bg-transparent"
                        style={{ color: t.text }}
                      />
                      <span className="text-[10px]" style={{ color: t.textSoft }}>
                        min
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={criarNovaRotina}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{ background: t.action }}
                  >
                    <Plus size={14} /> Criar Rotina no Ambiente
                  </button>
                </div>
              </section>
            </div>

            {/* Coluna Direita (7 cols): Gestão Completa por Ambiente (Pausar, Reagendar, Adiantar, Editar) */}
            <div className="xl:col-span-7 space-y-4">
              {/* Filtro rápido de ambientes */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                <button
                  onClick={() => setFiltroComodoId("todos")}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 border cursor-pointer"
                  style={{
                    background:
                      filtroComodoId === "todos" ? t.action : t.card,
                    color: filtroComodoId === "todos" ? "#fff" : t.textSoft,
                    borderColor:
                      filtroComodoId === "todos" ? t.action : t.border,
                  }}
                >
                  Todos os Ambientes ({comodos.length})
                </button>
                {comodos.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setFiltroComodoId(c.id)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 border cursor-pointer"
                    style={{
                      background:
                        filtroComodoId === c.id ? t.action : t.card,
                      color: filtroComodoId === c.id ? "#fff" : t.textSoft,
                      borderColor:
                        filtroComodoId === c.id ? t.action : t.border,
                    }}
                  >
                    {c.nome}
                  </button>
                ))}
                <button
                  onClick={() => setMostrarNovoComodo((v) => !v)}
                  className="px-3 py-2 rounded-xl text-xs font-bold shrink-0 border cursor-pointer"
                  style={{
                    background: `${t.primary}15`,
                    color: t.primary,
                    borderColor: `${t.primary}40`,
                  }}
                >
                  + Ambiente
                </button>
              </div>

              {mostrarNovoComodo && (
                <div
                  className="p-3.5 rounded-2xl border flex gap-2"
                  style={{ background: t.card, borderColor: t.border }}
                >
                  <input
                    value={novoComodoNome}
                    onChange={(e) => setNovoComodoNome(e.target.value)}
                    placeholder="Nome do novo ambiente (ex: Varanda, Escritório)..."
                    className="flex-1 px-3 py-2 rounded-xl text-xs border outline-none"
                    style={{ background: t.bg, color: t.text, borderColor: t.border }}
                  />
                  <button
                    onClick={() => {
                      if (!novoComodoNome.trim()) return;
                      setComodos((prev) => [
                        ...prev,
                        {
                          id: Date.now(),
                          nome: novoComodoNome.trim(),
                          rotinas: [],
                        },
                      ]);
                      setNovoComodoNome("");
                      setMostrarNovoComodo(false);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                    style={{ background: t.primary }}
                  >
                    Criar
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {comodosVisiveis.map((comodo) => {
                  const pendentesCount = comodo.rotinas.filter(
                    (r) =>
                      !r.pausada &&
                      !r.feitoHoje &&
                      r.diasDesdeUltimaVez >= r.diasCiclo
                  ).length;

                  return (
                    <section
                      key={comodo.id}
                      className="rounded-3xl p-5 border space-y-3.5"
                      style={{ background: t.card, borderColor: t.border }}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() =>
                            openCard({ tipo: "comodo", id: comodo.id })
                          }
                          className="flex items-center gap-2 text-left cursor-pointer"
                        >
                          <Home size={16} style={{ color: t.action }} />
                          <h4
                            className="text-sm sm:text-base font-bold"
                            style={{ color: t.text }}
                          >
                            {comodo.nome}
                          </h4>
                        </button>
                        <span
                          className="text-xs font-mono-num font-semibold"
                          style={{
                            color: pendentesCount > 0 ? t.action : t.primary,
                          }}
                        >
                          {pendentesCount > 0
                            ? `${pendentesCount} vencida(s) hoje`
                            : "Ambiente em dia ✓"}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {comodo.rotinas.map((r) => {
                          const venceu =
                            !r.pausada &&
                            !r.feitoHoje &&
                            r.diasDesdeUltimaVez >= r.diasCiclo;
                          const diasFaltantes = Math.max(
                            0,
                            r.diasCiclo - r.diasDesdeUltimaVez
                          );
                          const editandoEsta = rotinaEditandoId === r.id;

                          return (
                            <div
                              key={r.id}
                              className="p-3.5 rounded-2xl border space-y-2.5 transition-opacity"
                              style={{
                                background: t.bg,
                                borderColor: venceu ? t.action : t.border,
                                opacity: r.pausada ? 0.65 : 1,
                              }}
                            >
                              {editandoEsta ? (
                                /* Modo Edição Completa da Rotina */
                                <div className="space-y-2">
                                  <input
                                    value={editTarefaTexto}
                                    onChange={(e) =>
                                      setEditTarefaTexto(e.target.value)
                                    }
                                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold outline-none border"
                                    style={{
                                      background: t.card,
                                      color: t.text,
                                      borderColor: t.border,
                                    }}
                                  />
                                  <div className="flex flex-wrap items-center gap-2">
                                    <select
                                      value={editFrequencia}
                                      onChange={(e) =>
                                        setEditFrequencia(
                                          e.target.value as FrequenciaRotina
                                        )
                                      }
                                      className="px-2.5 py-1.5 rounded-xl text-xs border outline-none"
                                      style={{
                                        background: t.card,
                                        color: t.text,
                                        borderColor: t.border,
                                      }}
                                    >
                                      <option value="Diária">Diária</option>
                                      <option value="3x na semana">
                                        3x na semana
                                      </option>
                                      <option value="Semanal">Semanal</option>
                                      <option value="Quinzenal">
                                        Quinzenal
                                      </option>
                                    </select>

                                    <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border" style={{ background: t.card, borderColor: t.border }}>
                                      <input
                                        type="number"
                                        min={1}
                                        max={180}
                                        value={editTempoMin}
                                        onChange={(e) =>
                                          setEditTempoMin(
                                            Number(e.target.value)
                                          )
                                        }
                                        className="w-12 text-xs font-mono-num font-bold outline-none bg-transparent"
                                        style={{ color: t.text }}
                                      />
                                      <span
                                        className="text-[10px]"
                                        style={{ color: t.textSoft }}
                                      >
                                        min
                                      </span>
                                    </div>

                                    <div className="ml-auto flex gap-1.5">
                                      <button
                                        onClick={() =>
                                          setRotinaEditandoId(null)
                                        }
                                        className="px-2.5 py-1.5 rounded-xl text-xs"
                                        style={{ color: t.textSoft }}
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        onClick={() =>
                                          salvarEdicaoRotina(comodo.id, r.id)
                                        }
                                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
                                        style={{ background: t.primary }}
                                      >
                                        Salvar
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p
                                        className={`text-xs sm:text-sm font-semibold ${
                                          r.feitoHoje ? "line-through" : ""
                                        }`}
                                        style={{
                                          color: r.feitoHoje
                                            ? t.textSoft
                                            : t.text,
                                        }}
                                      >
                                        {r.tarefa}
                                      </p>
                                      <div
                                        className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono-num mt-0.5"
                                        style={{ color: t.textSoft }}
                                      >
                                        <span>{r.frequencia}</span>
                                        <span>·</span>
                                        <span>~{r.tempoEstimadoMin} min</span>
                                        <span>·</span>
                                        {r.pausada ? (
                                          <span
                                            className="font-bold"
                                            style={{ color: t.alert }}
                                          >
                                            Pausada temporariamente
                                          </span>
                                        ) : r.feitoHoje ? (
                                          <span style={{ color: t.primary }}>
                                            Concluída hoje ✓
                                          </span>
                                        ) : venceu ? (
                                          <span
                                            className="font-bold"
                                            style={{ color: t.action }}
                                          >
                                            {r.proximaDataLabel ||
                                              "Venceu hoje"}
                                          </span>
                                        ) : (
                                          <span>
                                            Próxima em {diasFaltantes}d{" "}
                                            {r.proximaDataLabel
                                              ? `(${r.proximaDataLabel})`
                                              : ""}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        onClick={() =>
                                          concluirRotina(comodo.id, r.id)
                                        }
                                        className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                                        style={{
                                          background: r.feitoHoje
                                            ? t.primary
                                            : t.cardSubtle,
                                          color: r.feitoHoje
                                            ? "#fff"
                                            : t.textSoft,
                                        }}
                                        title="Concluir ciclo hoje"
                                      >
                                        <Check size={14} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* BARRA DE CONTROLE DA ROTINA: PAUSAR, ADIANTAR, REAGENDAR, EDITAR */}
                                  <div
                                    className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t"
                                    style={{ borderColor: t.border }}
                                  >
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <button
                                        onClick={() =>
                                          alternarPausaRotina(comodo.id, r.id)
                                        }
                                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                                        style={{
                                          background: r.pausada
                                            ? t.primary
                                            : t.cardSubtle,
                                          color: r.pausada
                                            ? "#fff"
                                            : t.textSoft,
                                        }}
                                      >
                                        {r.pausada ? (
                                          <>
                                            <Play size={10} /> Retomar
                                          </>
                                        ) : (
                                          <>
                                            <Pause size={10} /> Pausar
                                          </>
                                        )}
                                      </button>

                                      {!venceu && !r.feitoHoje && (
                                        <button
                                          onClick={() =>
                                            adiantarRotinaParaHoje(
                                              comodo.id,
                                              r,
                                              comodo.nome
                                            )
                                          }
                                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                          style={{
                                            background: t.cardSubtle,
                                            color: t.action,
                                          }}
                                          title="Adiantar rotina e puxar para Hoje"
                                        >
                                          <FastForward size={10} /> Adiantar p/
                                          Hoje
                                        </button>
                                      )}

                                      <button
                                        onClick={() =>
                                          reagendarRotina(comodo.id, r.id, 1)
                                        }
                                        className="px-2 py-1 rounded-lg text-[11px] font-mono-num cursor-pointer"
                                        style={{
                                          background: t.cardSubtle,
                                          color: t.textSoft,
                                        }}
                                        title="Reagendar para amanhã (+1d)"
                                      >
                                        +1d
                                      </button>
                                      <button
                                        onClick={() =>
                                          reagendarRotina(comodo.id, r.id, 3)
                                        }
                                        className="px-2 py-1 rounded-lg text-[11px] font-mono-num cursor-pointer"
                                        style={{
                                          background: t.cardSubtle,
                                          color: t.textSoft,
                                        }}
                                        title="Reagendar para daqui a 3 dias"
                                      >
                                        +3d
                                      </button>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => iniciarEdicaoRotina(r)}
                                        className="p-1.5 rounded-lg cursor-pointer"
                                        style={{
                                          background: t.cardSubtle,
                                          color: t.textSoft,
                                        }}
                                        title="Editar rotina"
                                      >
                                        <Edit3 size={12} />
                                      </button>
                                      <button
                                        onClick={() =>
                                          excluirRotina(comodo.id, r.id)
                                        }
                                        className="p-1.5 rounded-lg cursor-pointer"
                                        style={{
                                          background: t.cardSubtle,
                                          color: t.textSoft,
                                        }}
                                        title="Excluir rotina"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: REGULADOR DE ESTOQUE DA CASA & LISTA DE COMPRAS AUTOMÁTICA */}
      {subAbaCasa === "estoque_compras" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <section
            className="xl:col-span-7 rounded-3xl p-5 border space-y-3.5"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div>
              <div className="flex items-center gap-2">
                <Package size={16} style={{ color: t.primary }} />
                <h3 className="text-sm font-bold" style={{ color: t.text }}>
                  Regulador de Estoque da Casa
                </h3>
              </div>
              <p className="text-xs mt-0.5" style={{ color: t.textSoft }}>
                Ajuste com − / +. Ao atingir o mínimo, o item entra automaticamente na Lista de Compras.
              </p>
            </div>

            <div className="space-y-2.5">
              {estoqueCasa.map((item) => {
                const critico = item.quantidadeAtual <= item.quantidadeMinima;
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl border flex items-center justify-between gap-3"
                    style={{
                      background: t.bg,
                      borderColor: critico ? t.alert : t.border,
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span style={{ color: t.textSoft }}>
                          {item.categoria}
                        </span>
                        {critico && (
                          <span
                            className="font-bold flex items-center gap-1"
                            style={{ color: t.alert }}
                          >
                            <AlertTriangle size={11} /> Repor (mín:{" "}
                            {item.quantidadeMinima} {item.unidade})
                          </span>
                        )}
                      </div>
                      {setEstoqueCasa ? (
                        <input
                          value={item.nome}
                          onChange={(e) =>
                            setEstoqueCasa((prev) =>
                              prev.map((x) =>
                                x.id === item.id
                                  ? { ...x, nome: e.target.value }
                                  : x
                              )
                            )
                          }
                          className="w-full text-xs sm:text-sm font-bold mt-0.5 bg-transparent outline-none border-b border-transparent focus:border-current"
                          style={{ color: t.text }}
                        />
                      ) : (
                        <p
                          className="text-xs sm:text-sm font-bold mt-0.5 truncate"
                          style={{ color: t.text }}
                        >
                          {item.nome}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() =>
                          ajustarItemEstoqueCasa(
                            item.id,
                            item.unidade === "kg" ? -0.2 : -1
                          )
                        }
                        className="w-8 h-8 rounded-xl text-sm font-bold flex items-center justify-center cursor-pointer"
                        style={{ background: t.cardSubtle, color: t.text }}
                      >
                        −
                      </button>
                      <span
                        className="text-xs font-mono-num font-bold w-14 text-center"
                        style={{ color: critico ? t.alert : t.text }}
                      >
                        {Number.isInteger(item.quantidadeAtual)
                          ? item.quantidadeAtual
                          : item.quantidadeAtual.toFixed(1)}{" "}
                        {item.unidade}
                      </span>
                      <button
                        onClick={() =>
                          ajustarItemEstoqueCasa(
                            item.id,
                            item.unidade === "kg" ? 0.2 : 1
                          )
                        }
                        className="w-8 h-8 rounded-xl text-sm font-bold flex items-center justify-center cursor-pointer"
                        style={{ background: t.cardSubtle, color: t.text }}
                      >
                        +
                      </button>
                      {setEstoqueCasa && (
                        <button
                          onClick={() =>
                            setEstoqueCasa((prev) =>
                              prev.filter((x) => x.id !== item.id)
                            )
                          }
                          className="p-1.5 rounded-lg cursor-pointer"
                          style={{ color: t.danger }}
                          title="Excluir item do estoque"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {setEstoqueCasa && (
                <div className="flex gap-2 pt-1">
                  <input
                    value={novoEstoqueNome}
                    onChange={(e) => setNovoEstoqueNome(e.target.value)}
                    placeholder="+ Novo item de estoque (ex: Sabão líquido)..."
                    className="flex-1 px-3 py-2 rounded-xl text-xs border outline-none"
                    style={{ background: t.bg, color: t.text, borderColor: t.border }}
                  />
                  <input
                    value={novoEstoqueUn}
                    onChange={(e) => setNovoEstoqueUn(e.target.value)}
                    placeholder="un/kg"
                    className="w-16 px-2 py-2 rounded-xl text-xs border outline-none text-center"
                    style={{ background: t.bg, color: t.text, borderColor: t.border }}
                  />
                  <button
                    onClick={() => {
                      if (!novoEstoqueNome.trim()) return;
                      setEstoqueCasa((prev) => [
                        ...prev,
                        {
                          id: Date.now(),
                          nome: novoEstoqueNome.trim(),
                          categoria: "Despensa & Meal Prep",
                          quantidadeAtual: 2,
                          quantidadeMinima: Math.max(1, Number(novoEstoqueMin) || 1),
                          unidade: novoEstoqueUn.trim() || "un",
                          precoEstimado: 18,
                        },
                      ]);
                      setNovoEstoqueNome("");
                    }}
                    className="px-3.5 rounded-xl text-xs font-semibold text-white cursor-pointer"
                    style={{ background: t.primary }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </div>
          </section>

          <section
            className="xl:col-span-5 rounded-3xl p-5 border space-y-3.5"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div>
              <h3 className="text-sm font-bold" style={{ color: t.text }}>
                Lista de Compras ({listaCompras.filter((i) => !i.comprado).length} pendentes)
              </h3>
              <p className="text-xs mt-0.5" style={{ color: t.textSoft }}>
                Comprar & Repor soma no estoque e registra o gasto em Finanças
              </p>
            </div>

            <div className="space-y-2">
              {listaCompras.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border flex items-center justify-between gap-2"
                  style={{ background: t.bg, borderColor: t.border }}
                >
                  <div className="min-w-0 flex-1">
                    <input
                      value={item.nome}
                      onChange={(e) =>
                        setListaCompras((prev) =>
                          prev.map((x) =>
                            x.id === item.id
                              ? { ...x, nome: e.target.value }
                              : x
                          )
                        )
                      }
                      className={`w-full text-xs sm:text-sm font-semibold bg-transparent outline-none border-b border-transparent focus:border-current ${
                        item.comprado ? "line-through" : ""
                      }`}
                      style={{ color: item.comprado ? t.textSoft : t.text }}
                    />
                    <div
                      className="flex items-center gap-1.5 text-[11px] font-mono-num"
                      style={{ color: t.textSoft }}
                    >
                      <span>{item.categoria} · R$</span>
                      <input
                        type="number"
                        step="0.5"
                        value={item.precoEstimado}
                        onChange={(e) =>
                          setListaCompras((prev) =>
                            prev.map((x) =>
                              x.id === item.id
                                ? {
                                    ...x,
                                    precoEstimado: Math.max(
                                      0,
                                      Number(e.target.value) || 0
                                    ),
                                  }
                                : x
                            )
                          )
                        }
                        className="w-16 bg-transparent outline-none border-b border-transparent focus:border-current"
                        style={{ color: t.textSoft }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!item.comprado ? (
                      <button
                        onClick={() => comprarItemDaListaEReporEstoque(item)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-white shrink-0 cursor-pointer"
                        style={{ background: t.finance }}
                      >
                        Comprar & Repor
                      </button>
                    ) : (
                      <span
                        className="text-xs font-semibold"
                        style={{ color: t.primary }}
                      >
                        Reposto ✓
                      </span>
                    )}
                    <button
                      onClick={() =>
                        setListaCompras((prev) =>
                          prev.filter((x) => x.id !== item.id)
                        )
                      }
                      className="p-1.5 rounded-lg cursor-pointer"
                      style={{ color: t.danger }}
                      title="Remover da lista"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                value={novoItemCompraNome}
                onChange={(e) => setNovoItemCompraNome(e.target.value)}
                placeholder="Ex: Areia gatos, Batata doce..."
                className="flex-1 px-3 py-2.5 rounded-xl text-xs outline-none border"
                style={{
                  background: t.bg,
                  color: t.text,
                  borderColor: t.border,
                }}
              />
              <input
                value={novoItemCompraPreco}
                onChange={(e) => setNovoItemCompraPreco(e.target.value)}
                placeholder="R$"
                className="w-20 px-2.5 py-2.5 rounded-xl text-xs font-mono-num outline-none border"
                style={{
                  background: t.bg,
                  color: t.text,
                  borderColor: t.border,
                }}
              />
              <button
                onClick={() => {
                  if (!novoItemCompraNome.trim()) return;
                  const preco =
                    parseFloat(novoItemCompraPreco.replace(",", ".")) || 25.0;
                  setListaCompras((prev) => [
                    ...prev,
                    {
                      id: Date.now(),
                      nome: novoItemCompraNome.trim(),
                      categoria: "Despensa & Meal Prep",
                      quantidadeComprar: 1,
                      unidade: "un",
                      precoEstimado: preco,
                      comprado: false,
                    },
                  ]);
                  setNovoItemCompraNome("");
                  setNovoItemCompraPreco("");
                }}
                className="px-3.5 rounded-xl text-xs font-semibold text-white cursor-pointer"
                style={{ background: t.action }}
              >
                <Plus size={15} />
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
