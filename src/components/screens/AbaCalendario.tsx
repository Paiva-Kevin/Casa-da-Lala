import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  GraduationCap,
  PawPrint,
  Wallet,
  Sparkles,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Filter,
} from "lucide-react";
import {
  BottomSheetPayload,
  CartaoCredito,
  ColorTokenKey,
  Compromisso,
  Disciplina,
  ItemRadar,
  LancamentoFinanceiro,
  PetPerfil,
  ThemeTokens,
} from "../../types/lala";

export type CategoriaEventoCalendario =
  | "todas"
  | "uerj"
  | "pets"
  | "financas"
  | "pessoal";

export interface EventoCalendarioUnificado {
  id: string;
  diaMes: number;
  horario: string;
  titulo: string;
  subtitulo: string;
  categoria: Exclude<CategoriaEventoCalendario, "todas">;
  cor: ColorTokenKey;
  concluido?: boolean;
  payloadSheet?: BottomSheetPayload;
}

interface AbaCalendarioProps {
  t: ThemeTokens;
  compromissos: Compromisso[];
  setCompromissos: React.Dispatch<React.SetStateAction<Compromisso[]>>;
  disciplinas: Disciplina[];
  petsPerfil: PetPerfil[];
  lancamentos: LancamentoFinanceiro[];
  cartoes: CartaoCredito[];
  radarItens: ItemRadar[];
  openCard: (payload: BottomSheetPayload) => void;
  showToast: (msg: string) => void;
}

const DIAS_SEMANA_CURTO = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function AbaCalendario({
  t,
  compromissos,
  setCompromissos,
  disciplinas,
  petsPerfil,
  lancamentos,
  cartoes,
  radarItens,
  openCard,
  showToast,
}: AbaCalendarioProps) {
  const [visao, setVisao] = useState<"mensal" | "semanal">("mensal");
  const [diaSelecionado, setDiaSelecionado] = useState<number>(27);
  const [filtroCategoria, setFiltroCategoria] =
    useState<CategoriaEventoCalendario>("todas");

  // Formulário rápido para novo evento pessoal/compromisso no dia selecionado
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaHora, setNovaHora] = useState("14:00");
  const [novaDuracao, setNovaDuracao] = useState(45);
  const [novaCat, setNovaCat] =
    useState<Exclude<CategoriaEventoCalendario, "todas">>("pessoal");

  // Extrai o dia do mês a partir de strings como "29/09", "Dia 28", "15/09", etc.
  const extrairDiaSetembro = (textoData: string, fallbackDia: number): number => {
    const matchBarra = textoData.match(/(\d{1,2})\/0?9/);
    if (matchBarra) {
      const d = parseInt(matchBarra[1], 10);
      if (d >= 1 && d <= 30) return d;
    }
    const matchDia = textoData.match(/(\d{1,2})/);
    if (matchDia) {
      const d = parseInt(matchDia[1], 10);
      if (d >= 1 && d <= 30) return d;
    }
    return fallbackDia;
  };

  // Consolida todos os eventos do estado global em Setembro/2026 (30 dias)
  const todosEventosMes = useMemo<EventoCalendarioUnificado[]>(() => {
    const lista: EventoCalendarioUnificado[] = [];

    // 1. Compromissos da Agenda / Timeline
    compromissos.forEach((c) => {
      const catMap: Exclude<CategoriaEventoCalendario, "todas"> =
        c.aba === "estudos_trabalho"
          ? "uerj"
          : c.aba === "financas"
          ? "financas"
          : c.titulo.toLowerCase().includes("nina") ||
            c.titulo.toLowerCase().includes("tobias") ||
            c.titulo.toLowerCase().includes("sachê")
          ? "pets"
          : "pessoal";

      lista.push({
        id: `comp-${c.id}`,
        diaMes: c.diaMes,
        horario: c.hora,
        titulo: c.titulo,
        subtitulo: `${c.duracaoMin} min · ${c.local || "Compromisso agendado"}`,
        categoria: catMap,
        cor: c.cor,
        concluido: c.concluido,
        payloadSheet: { tipo: "compromisso", id: c.id },
      });
    });

    // 2. Aulas & Avaliações UERJ
    disciplinas.forEach((d, idx) => {
      const diaPrazo = extrairDiaSetembro(d.prazo, 28 + (idx % 3));
      lista.push({
        id: `uerj-disc-${d.id}`,
        diaMes: diaPrazo,
        horario: "08:30",
        titulo: `UERJ: ${d.nome}`,
        subtitulo: `${d.horarioSala} · Entrega/Prazo: ${d.prazo}`,
        categoria: "uerj",
        cor: "primary",
        payloadSheet: { tipo: "disciplina", id: d.id },
      });

      d.avaliacoes.forEach((av) => {
        const diaAv = extrairDiaSetembro(av.data, 29);
        lista.push({
          id: `uerj-av-${d.id}-${av.id}`,
          diaMes: diaAv,
          horario: "10:00",
          titulo: `Avaliação ${av.tipo} — ${d.nome}`,
          subtitulo: `Peso ${av.peso} · Data: ${av.data}`,
          categoria: "uerj",
          cor: "alert",
          concluido: av.concluida,
          payloadSheet: { tipo: "disciplina", id: d.id },
        });
      });
    });

    // 3. Vacinas, Consultas Veterinárias e Cuidados Pets (Nina & Tobias)
    petsPerfil.forEach((pet, idx) => {
      const diaVet = extrairDiaSetembro(pet.proximaVet, 26 + idx * 2);
      lista.push({
        id: `pet-vet-${pet.id}`,
        diaMes: diaVet,
        horario: "15:30",
        titulo: `Pet (${pet.nome}): ${pet.proximaVet}`,
        subtitulo: `Estoque atual: ${pet.estoqueSaches} sachês · Ração ${pet.racao}`,
        categoria: "pets",
        cor: "primary",
        payloadSheet: { tipo: "pet", id: pet.id },
      });

      pet.cuidados.forEach((cuid) => {
        const diaCuid = extrairDiaSetembro(cuid.proximaData, 25 + idx);
        lista.push({
          id: `pet-cuid-${pet.id}-${cuid.id}`,
          diaMes: diaCuid,
          horario: "11:00",
          titulo: `${pet.nome} · ${cuid.tipo}`,
          subtitulo: `Próxima dose/cuidado: ${cuid.proximaData} (${cuid.status})`,
          categoria: "pets",
          cor: cuid.status === "atencao" ? "alert" : "primary",
          payloadSheet: { tipo: "pet", id: pet.id },
        });
      });
    });

    // 4. Vencimentos Financeiros & Cartões de Crédito
    cartoes.forEach((ct) => {
      lista.push({
        id: `fin-cartao-${ct.id}`,
        diaMes: Math.min(30, Math.max(1, ct.vencimentoDia)),
        horario: "09:00",
        titulo: `Vencimento Fatura ${ct.nome}`,
        subtitulo: `Fatura atual: R$ ${ct.faturaAtual.toFixed(2)} · Status: ${ct.statusFatura}`,
        categoria: "financas",
        cor: "finance",
        concluido: ct.statusFatura === "paga",
      });
    });

    lancamentos
      .filter((l) => l.mesKey === "2026-09" && l.status === "previsto")
      .forEach((l, idx) => {
        const diaLanc = extrairDiaSetembro(l.data, 28 + (idx % 3));
        lista.push({
          id: `fin-lanc-${l.id}`,
          diaMes: diaLanc,
          horario: "12:00",
          titulo: `${l.tipo === "receita" ? "Recebimento" : "Vencimento"}: ${l.descricao}`,
          subtitulo: `R$ ${l.valor.toFixed(2)} · ${l.categoria} (${l.metodo})`,
          categoria: "financas",
          cor: l.tipo === "receita" ? "primary" : "finance",
        });
      });

    // 5. Eventos do Radar de Preparação
    radarItens.forEach((rad) => {
      const diaRad = extrairDiaSetembro(
        rad.dataEvento,
        Math.min(30, 27 + rad.diasRestantes)
      );
      lista.push({
        id: `rad-${rad.id}`,
        diaMes: diaRad,
        horario: "18:00",
        titulo: `Radar: ${rad.titulo}`,
        subtitulo: `${rad.area} · Em ${rad.diasRestantes} dias (${rad.dataEvento})`,
        categoria:
          rad.area === "UERJ"
            ? "uerj"
            : rad.area === "Finanças"
            ? "financas"
            : rad.area === "Casa & Pets"
            ? "pets"
            : "pessoal",
        cor: rad.cor,
        payloadSheet: { tipo: "radar_item", id: rad.id },
      });
    });

    return lista.sort((a, b) => a.horario.localeCompare(b.horario));
  }, [compromissos, disciplinas, petsPerfil, cartoes, lancamentos, radarItens]);

  const eventosFiltrados = useMemo(() => {
    if (filtroCategoria === "todas") return todosEventosMes;
    return todosEventosMes.filter((ev) => ev.categoria === filtroCategoria);
  }, [todosEventosMes, filtroCategoria]);

  const eventosDoDiaSelecionado = useMemo(
    () => eventosFiltrados.filter((ev) => ev.diaMes === diaSelecionado),
    [eventosFiltrados, diaSelecionado]
  );

  // Setembro 2026 começa numa Terça-feira (offset = 1 na grade Seg..Dom)
  const offsetInicioMes = 1;
  const diasNoMes = Array.from({ length: 30 }, (_, i) => i + 1);

  // Semana ativa centrada no dia selecionado
  const diasVisaoSemanal = useMemo(() => {
    const inicio = Math.max(1, Math.min(24, diaSelecionado - 3));
    return Array.from({ length: 7 }, (_, i) => inicio + i);
  }, [diaSelecionado]);

  const adicionarCompromissoCalendario = () => {
    if (!novoTitulo.trim()) return;
    const corMap: Record<Exclude<CategoriaEventoCalendario, "todas">, ColorTokenKey> = {
      uerj: "primary",
      pets: "primary",
      financas: "finance",
      pessoal: "action",
    };
    const abaMap: Record<
      Exclude<CategoriaEventoCalendario, "todas">,
      Compromisso["aba"]
    > = {
      uerj: "estudos_trabalho",
      pets: "casa_rotinas",
      financas: "financas",
      pessoal: "saude_pets",
    };

    const novo: Compromisso = {
      id: Date.now(),
      hora: novaHora,
      duracaoMin: novaDuracao,
      titulo: novoTitulo.trim(),
      local: `Calendário (${novaCat.toUpperCase()})`,
      cor: corMap[novaCat],
      aba: abaMap[novaCat],
      diaMes: diaSelecionado,
      diaSemanaIdx: (diaSelecionado + offsetInicioMes - 1) % 7,
      gcalSynced: true,
    };

    setCompromissos((prev) => [...prev, novo]);
    setNovoTitulo("");
    showToast(`Evento "${novo.titulo}" agendado para ${diaSelecionado}/09 às ${novaHora}!`);
  };

  const CATEGORIAS_FILTRO: {
    id: CategoriaEventoCalendario;
    label: string;
    corHex: string;
    icon: React.ElementType;
  }[] = [
    { id: "todas", label: "Todos", corHex: t.text, icon: Filter },
    { id: "uerj", label: "Aulas & UERJ", corHex: t.primary, icon: GraduationCap },
    { id: "pets", label: "Nina & Tobias", corHex: t.action, icon: PawPrint },
    { id: "financas", label: "Vencimentos", corHex: t.finance, icon: Wallet },
    { id: "pessoal", label: "Pessoal & Rotina", corHex: t.alert, icon: Sparkles },
  ];

  const getCorHexCategoria = (cat: Exclude<CategoriaEventoCalendario, "todas">) => {
    switch (cat) {
      case "uerj":
        return t.primary;
      case "pets":
        return t.action;
      case "financas":
        return t.finance;
      case "pessoal":
        return t.alert;
    }
  };

  return (
    <div className="space-y-5">
      {/* CABEÇALHO DO CALENDÁRIO GLOBAL + ALTERNADOR MENSAL / SEMANAL */}
      <section
        className="rounded-3xl p-5 border space-y-4"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: `${t.action}18`, color: t.action }}
            >
              <CalendarIcon size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold" style={{ color: t.text }}>
                Calendário Integrado · Setembro 2026
              </h2>
              <p className="text-xs" style={{ color: t.textSoft }}>
                Aulas UERJ, Consultas/Vacinas Pet, Vencimentos Financeiros e Compromissos
              </p>
            </div>
          </div>

          <div
            className="grid grid-cols-2 gap-1 p-1 rounded-2xl border sm:w-56"
            style={{ background: t.bg, borderColor: t.border }}
          >
            <button
              onClick={() => setVisao("mensal")}
              className="py-1.5 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              style={{
                background: visao === "mensal" ? t.action : "transparent",
                color: visao === "mensal" ? "#fff" : t.textSoft,
              }}
            >
              Mês Inteiro
            </button>
            <button
              onClick={() => setVisao("semanal")}
              className="py-1.5 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              style={{
                background: visao === "semanal" ? t.action : "transparent",
                color: visao === "semanal" ? "#fff" : t.textSoft,
              }}
            >
              Semana Foco
            </button>
          </div>
        </div>

        {/* FILTROS POR CATEGORIA COM MARCADORES COLORIDOS */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIAS_FILTRO.map((cat) => {
            const Icon = cat.icon;
            const ativo = filtroCategoria === cat.id;
            const totalCat =
              cat.id === "todas"
                ? todosEventosMes.length
                : todosEventosMes.filter((e) => e.categoria === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => setFiltroCategoria(cat.id)}
                className="px-3 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 shrink-0 border transition-all cursor-pointer"
                style={{
                  background: ativo ? t.cardSubtle : t.bg,
                  borderColor: ativo ? cat.corHex : t.border,
                  color: ativo ? t.text : t.textSoft,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: cat.corHex }}
                />
                <Icon size={13} style={{ color: cat.corHex }} />
                <span>{cat.label}</span>
                <span
                  className="text-[10px] font-mono-num px-1.5 py-0.5 rounded-md"
                  style={{ background: t.card, color: t.textSoft }}
                >
                  {totalCat}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* GRADE PRINCIPAL: CALENDÁRIO (ESQUERDA) + DETALHES DO DIA SELECIONADO (DIREITA) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* COLUNA ESQUERDA (7 COLUNAS): GRADE MENSAL OU SEMANAL */}
        <section
          className="xl:col-span-7 rounded-3xl p-5 border space-y-4"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: t.text }}>
                {visao === "mensal"
                  ? "Setembro 2026 (Visão Mensal)"
                  : `Semana de ${diasVisaoSemanal[0]}/09 a ${diasVisaoSemanal[6]}/09`}
              </span>
              <span
                className="text-[11px] font-mono-num px-2 py-0.5 rounded-lg"
                style={{ background: t.cardSubtle, color: t.primary }}
              >
                Hoje: 27/09
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setDiaSelecionado((d) => Math.max(1, d - 1))}
                className="p-1.5 rounded-xl border cursor-pointer"
                style={{ background: t.bg, borderColor: t.border, color: t.text }}
                title="Dia anterior"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => setDiaSelecionado(27)}
                className="px-2.5 py-1 rounded-xl text-xs font-semibold border cursor-pointer"
                style={{ background: t.bg, borderColor: t.border, color: t.action }}
              >
                Hoje
              </button>
              <button
                onClick={() => setDiaSelecionado((d) => Math.min(30, d + 1))}
                className="p-1.5 rounded-xl border cursor-pointer"
                style={{ background: t.bg, borderColor: t.border, color: t.text }}
                title="Próximo dia"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {visao === "mensal" ? (
            <>
              {/* Cabeçalho dos dias da semana */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {DIAS_SEMANA_CURTO.map((dia) => (
                  <div
                    key={dia}
                    className="text-[11px] font-bold uppercase py-1"
                    style={{ color: t.textSoft }}
                  >
                    {dia}
                  </div>
                ))}
              </div>

              {/* Células do Mês */}
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: offsetInicioMes }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="h-16 sm:h-20 rounded-2xl opacity-30"
                    style={{ background: t.bg }}
                  />
                ))}

                {diasNoMes.map((dia) => {
                  const isHoje = dia === 27;
                  const isSelecionado = dia === diaSelecionado;
                  const evsDia = eventosFiltrados.filter((e) => e.diaMes === dia);

                  return (
                    <button
                      key={dia}
                      onClick={() => setDiaSelecionado(dia)}
                      className="h-16 sm:h-20 p-2 rounded-2xl border flex flex-col justify-between text-left transition-all cursor-pointer relative overflow-hidden"
                      style={{
                        background: isSelecionado
                          ? `${t.action}15`
                          : isHoje
                          ? t.cardSubtle
                          : t.bg,
                        borderColor: isSelecionado
                          ? t.action
                          : isHoje
                          ? t.primary
                          : t.border,
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className="text-xs font-mono-num font-bold"
                          style={{
                            color: isSelecionado
                              ? t.action
                              : isHoje
                              ? t.primary
                              : t.text,
                          }}
                        >
                          {dia}
                        </span>
                        {isHoje && (
                          <span
                            className="text-[9px] font-bold px-1 rounded"
                            style={{ background: t.primary, color: "#fff" }}
                          >
                            HOJE
                          </span>
                        )}
                      </div>

                      {/* Marcadores visuais coloridos por categoria */}
                      <div className="space-y-0.5 w-full">
                        <div className="flex items-center gap-1 flex-wrap">
                          {evsDia.slice(0, 4).map((ev) => (
                            <span
                              key={ev.id}
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{
                                background: getCorHexCategoria(ev.categoria),
                              }}
                              title={ev.titulo}
                            />
                          ))}
                          {evsDia.length > 4 && (
                            <span
                              className="text-[9px] font-mono-num"
                              style={{ color: t.textSoft }}
                            >
                              +{evsDia.length - 4}
                            </span>
                          )}
                        </div>
                        {evsDia[0] && (
                          <p
                            className="text-[10px] truncate hidden sm:block leading-tight"
                            style={{ color: t.textSoft }}
                          >
                            {evsDia[0].titulo}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* VISÃO SEMANAL DETALHADA */
            <div className="space-y-2.5">
              {diasVisaoSemanal.map((dia) => {
                const evsDia = eventosFiltrados.filter((e) => e.diaMes === dia);
                const nomeDiaSemana =
                  DIAS_SEMANA_CURTO[(dia + offsetInicioMes - 1) % 7];
                const isSelecionado = dia === diaSelecionado;
                const isHoje = dia === 27;

                return (
                  <div
                    key={dia}
                    onClick={() => setDiaSelecionado(dia)}
                    className="p-3.5 rounded-2xl border transition-all cursor-pointer"
                    style={{
                      background: isSelecionado ? `${t.action}12` : t.bg,
                      borderColor: isSelecionado
                        ? t.action
                        : isHoje
                        ? t.primary
                        : t.border,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-mono-num font-bold px-2.5 py-1 rounded-xl"
                          style={{
                            background: isSelecionado ? t.action : t.cardSubtle,
                            color: isSelecionado ? "#fff" : t.text,
                          }}
                        >
                          {nomeDiaSemana}, {dia}/09
                        </span>
                        {isHoje && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: `${t.primary}22`, color: t.primary }}
                          >
                            Hoje
                          </span>
                        )}
                      </div>
                      <span
                        className="text-xs font-mono-num"
                        style={{ color: t.textSoft }}
                      >
                        {evsDia.length} evento(s)
                      </span>
                    </div>

                    {evsDia.length === 0 ? (
                      <p className="text-xs italic" style={{ color: t.textSoft }}>
                        Dia livre para estudo ou descanso
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {evsDia.map((ev) => (
                          <div
                            key={ev.id}
                            className="px-3 py-2 rounded-xl flex items-center justify-between gap-2"
                            style={{ background: t.card }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{
                                  background: getCorHexCategoria(ev.categoria),
                                }}
                              />
                              <span
                                className="text-xs font-mono-num font-semibold shrink-0"
                                style={{ color: t.textSoft }}
                              >
                                {ev.horario}
                              </span>
                              <span
                                className="text-xs font-bold truncate"
                                style={{ color: t.text }}
                              >
                                {ev.titulo}
                              </span>
                            </div>
                            <span
                              className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md shrink-0"
                              style={{
                                background: t.cardSubtle,
                                color: getCorHexCategoria(ev.categoria),
                              }}
                            >
                              {ev.categoria}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* COLUNA DIREITA (5 COLUNAS): AGENDA DO DIA SELECIONADO + CRIAR EVENTO */}
        <section
          className="xl:col-span-5 rounded-3xl p-5 border space-y-4"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div className="flex items-center justify-between">
            <div>
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: t.action }}
              >
                Programação do Dia
              </span>
              <h3 className="text-base font-bold" style={{ color: t.text }}>
                Dia {diaSelecionado} de Setembro ·{" "}
                {DIAS_SEMANA_CURTO[(diaSelecionado + offsetInicioMes - 1) % 7]}
              </h3>
            </div>
            <span
              className="text-xs font-mono-num font-bold px-3 py-1 rounded-xl"
              style={{ background: t.cardSubtle, color: t.text }}
            >
              {eventosDoDiaSelecionado.length} itens
            </span>
          </div>

          {/* Lista de Eventos do Dia Selecionado */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto no-scrollbar pr-0.5">
            {eventosDoDiaSelecionado.length === 0 ? (
              <div
                className="p-6 rounded-2xl border text-center space-y-1.5"
                style={{ background: t.bg, borderColor: t.border }}
              >
                <p className="text-xs font-bold" style={{ color: t.text }}>
                  Nenhum evento filtrado para {diaSelecionado}/09
                </p>
                <p className="text-[11px]" style={{ color: t.textSoft }}>
                  Adicione um compromisso abaixo ou altere o filtro de categoria.
                </p>
              </div>
            ) : (
              eventosDoDiaSelecionado.map((ev) => {
                const corCat = getCorHexCategoria(ev.categoria);
                return (
                  <div
                    key={ev.id}
                    onClick={() => ev.payloadSheet && openCard(ev.payloadSheet)}
                    className="p-3.5 rounded-2xl border flex items-start justify-between gap-3 transition-transform active:scale-[0.99] cursor-pointer"
                    style={{
                      background: t.bg,
                      borderColor: t.border,
                      borderLeftWidth: "4px",
                      borderLeftColor: corCat,
                    }}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[11px] font-mono-num font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
                          style={{ background: t.cardSubtle, color: corCat }}
                        >
                          <Clock size={11} /> {ev.horario}
                        </span>
                        <span
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md"
                          style={{ background: `${corCat}18`, color: corCat }}
                        >
                          {ev.categoria}
                        </span>
                      </div>
                      <p
                        className="text-xs sm:text-sm font-bold truncate"
                        style={{ color: t.text }}
                      >
                        {ev.titulo}
                      </p>
                      <p
                        className="text-[11px] truncate"
                        style={{ color: t.textSoft }}
                      >
                        {ev.subtitulo}
                      </p>
                    </div>

                    <div className="shrink-0 pt-1">
                      {ev.concluido ? (
                        <CheckCircle2 size={16} style={{ color: t.primary }} />
                      ) : (
                        <AlertCircle size={16} style={{ color: corCat }} />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Formulário Rápido para Agendar Evento no Dia Selecionado */}
          <div
            className="p-4 rounded-2xl border space-y-3"
            style={{ background: t.bg, borderColor: t.border }}
          >
            <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: t.text }}>
              <Plus size={14} style={{ color: t.action }} /> Novo Evento em{" "}
              {diaSelecionado}/09
            </p>

            <input
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              placeholder="Título (ex: Monitoria UERJ, Vacina Tobias, Pagar Luz)..."
              className="w-full px-3 py-2 rounded-xl text-xs outline-none border"
              style={{
                background: t.card,
                color: t.text,
                borderColor: t.border,
              }}
            />

            <div className="grid grid-cols-3 gap-2">
              <input
                type="time"
                value={novaHora}
                onChange={(e) => setNovaHora(e.target.value)}
                className="px-2.5 py-2 rounded-xl text-xs font-mono-num outline-none border"
                style={{
                  background: t.card,
                  color: t.text,
                  borderColor: t.border,
                }}
              />
              <select
                value={novaDuracao}
                onChange={(e) => setNovaDuracao(Number(e.target.value))}
                className="px-2.5 py-2 rounded-xl text-xs font-mono-num outline-none border"
                style={{
                  background: t.card,
                  color: t.text,
                  borderColor: t.border,
                }}
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1h</option>
                <option value={90}>1h30</option>
              </select>
              <select
                value={novaCat}
                onChange={(e) =>
                  setNovaCat(
                    e.target.value as Exclude<CategoriaEventoCalendario, "todas">
                  )
                }
                className="px-2.5 py-2 rounded-xl text-xs font-semibold outline-none border"
                style={{
                  background: t.card,
                  color: t.text,
                  borderColor: t.border,
                }}
              >
                <option value="pessoal">Pessoal</option>
                <option value="uerj">UERJ</option>
                <option value="pets">Pets</option>
                <option value="financas">Finanças</option>
              </select>
            </div>

            <button
              onClick={adicionarCompromissoCalendario}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ background: t.action }}
            >
              <Plus size={14} /> Agendar em {diaSelecionado}/09
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
