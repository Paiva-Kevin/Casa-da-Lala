import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  ZoomIn,
  Check,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  BottomSheetPayload,
  ColorTokenKey,
  Compromisso,
  TaskItem,
  ThemeTokens,
} from "../../types/lala";
import {
  DIAS_SEMANA_HEADER,
  horaParaMinutos,
  HORAS_INTEIRAS_AGENDA,
  minutosParaHora,
} from "../../data/initialData";

interface AgendaScreenProps {
  t: ThemeTokens;
  compromissos: Compromisso[];
  setCompromissos: React.Dispatch<React.SetStateAction<Compromisso[]>>;
  tarefas: TaskItem[];
  agendarTarefaNoHorario: (
    taskId: number,
    hora: string,
    duracaoMin?: number,
    diaMes?: number
  ) => void;
  openCard: (payload: BottomSheetPayload) => void;
  showToast: (msg: string) => void;
}

const HORA_INICIO_DIA = 7; // 07:00
const HORA_FIM_DIA = 22; // 22:00
const MINUTOS_TOTAIS_TIMELINE = (HORA_FIM_DIA - HORA_INICIO_DIA) * 60; // 900 min

export function AgendaScreen({
  t,
  compromissos,
  setCompromissos,
  tarefas,
  agendarTarefaNoHorario,
  openCard,
  showToast,
}: AgendaScreenProps) {
  const hojeReal = React.useMemo(() => new Date(), []);
  const [diaSelecionado, setDiaSelecionado] = useState<number>(() =>
    new Date().getDate()
  );
  const [mesSelecionado, setMesSelecionado] = useState<number>(
    () => new Date().getMonth() + 1
  );
  const [anoSelecionado, setAnoSelecionado] = useState<number>(() =>
    new Date().getFullYear()
  );

  // Escala em pixels por minuto real: 3.2px/min (192px/hora -> 5 min = 16px exatos, 60 min = 192px exatos)
  const [pxPorMinuto, setPxPorMinuto] = useState<number>(3.2);
  const [horaAtualSimulada, setHoraAtualSimulada] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
  });

  // Formulário de Novo Bloco com Duração Real em Minutos + Criação Inline Direto na Régua
  const [novoTitulo, setNovoTitulo] = useState<string>("");
  const [novaHoraInicio, setNovaHoraInicio] = useState<string>("14:00");
  const [novaDuracaoMin, setNovaDuracaoMin] = useState<number>(30);
  const [novaCor, setNovaCor] = useState<ColorTokenKey>("primary");
  const [novoLocal, setNovoLocal] = useState<string>("");
  const [slotInlineAtivo, setSlotInlineAtivo] = useState<string | null>(null);
  const inputTituloRef = React.useRef<HTMLInputElement | null>(null);

  // Gera dinamicamente os 7 dias da semana (Seg..Dom) ao redor do diaSelecionado
  const diasDaSemanaDinamicos = React.useMemo(() => {
    const baseDate = new Date(anoSelecionado, mesSelecionado - 1, diaSelecionado);
    const jsDay = baseDate.getDay(); // 0=Dom..6=Sab
    const offsetSeg = jsDay === 0 ? -6 : 1 - jsDay;
    const nomes = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(
        anoSelecionado,
        mesSelecionado - 1,
        diaSelecionado + offsetSeg + idx
      );
      return {
        idx,
        label: nomes[idx],
        diaMes: d.getDate(),
        mes: d.getMonth() + 1,
        ano: d.getFullYear(),
      };
    });
  }, [anoSelecionado, mesSelecionado, diaSelecionado]);

  const compromissosDoDia = compromissos
    .filter((c) => {
      if (c.diaMes !== diaSelecionado) return false;
      if (
        c.mes !== undefined &&
        c.mes !== mesSelecionado &&
        c.mes !== mesSelecionado - 1
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => horaParaMinutos(a.hora) - horaParaMinutos(b.hora));

  // Tarefas de Hoje ainda não alocadas na agenda
  const tarefasSemHorario = tarefas.filter(
    (tk) =>
      !tk.feito &&
      tk.horizonte !== "backlog" &&
      tk.manualLock !== "backlog" &&
      !tk.horarioAgendado
  );

  const totalMinutosAlocados = compromissosDoDia.reduce(
    (acc, c) => acc + c.duracaoMin,
    0
  );

  const criarBlocoProporcional = (horaOverride?: string) => {
    if (!novoTitulo.trim()) {
      inputTituloRef.current?.focus();
      return;
    }
    const horaUsada = horaOverride || novaHoraInicio || "14:00";
    const duracaoValida = Math.max(1, Math.min(360, Number(novaDuracaoMin) || 30));
    const dtObj = new Date(anoSelecionado, mesSelecionado - 1, diaSelecionado);
    const diaIdx = (dtObj.getDay() + 6) % 7;

    const novo: Compromisso = {
      id: Date.now(),
      hora: horaUsada,
      duracaoMin: duracaoValida,
      titulo: novoTitulo.trim(),
      local: novoLocal.trim() || "Agenda",
      cor: novaCor,
      aba: "estudos_trabalho",
      diaMes: diaSelecionado,
      mes: mesSelecionado,
      ano: anoSelecionado,
      diaSemanaIdx: diaIdx,
      gcalSynced: false,
    };

    setCompromissos((prev) =>
      [...prev, novo].sort(
        (a, b) => horaParaMinutos(a.hora) - horaParaMinutos(b.hora)
      )
    );
    showToast(
      `"${novo.titulo}" (${duracaoValida} min) agendado no dia ${String(
        diaSelecionado
      ).padStart(2, "0")}/${String(mesSelecionado).padStart(
        2,
        "0"
      )} às ${horaUsada}!`
    );
    setNovoTitulo("");
    setNovoLocal("");
    setSlotInlineAtivo(null);
  };

  const handleCliqueDiretoNaRegua = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = Math.max(0, e.clientY - rect.top);
    const minutosDesdeInicio = Math.round(clickY / pxPorMinuto / 15) * 15;
    const totalMin = HORA_INICIO_DIA * 60 + minutosDesdeInicio;
    const horaClicada = minutosParaHora(totalMin);
    setNovaHoraInicio(horaClicada);
    setSlotInlineAtivo(horaClicada);
    setTimeout(() => {
      inputTituloRef.current?.focus();
    }, 30);
  };

  const alturaTotalCanvasPx = MINUTOS_TOTAIS_TIMELINE * pxPorMinuto;
  const minAgora = horaParaMinutos(horaAtualSimulada);
  const topAgoraPx = Math.max(
    0,
    Math.min(
      alturaTotalCanvasPx,
      (minAgora - HORA_INICIO_DIA * 60) * pxPorMinuto
    )
  );

  return (
    <div className="space-y-5">
      {/* CABEÇALHO DA AGENDA + SELETOR DE DIAS E ESCALA PROPORCIONAL */}
      <section
        className="rounded-3xl p-5 border space-y-4"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar size={17} style={{ color: t.action }} />
              <h2 className="text-base font-bold" style={{ color: t.text }}>
                Agenda Diária · Clique em qualquer horário para criar direto na grade
              </h2>
            </div>
            <p className="text-xs mt-0.5" style={{ color: t.textSoft }}>
              Clique diretamente na linha do tempo abaixo ou use a barra rápida para criar compromissos e tarefas de 5 min a 2h.
            </p>
          </div>

          {/* Controles de Navegação da Semana + Zoom */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const d = new Date(
                    anoSelecionado,
                    mesSelecionado - 1,
                    diaSelecionado - 7
                  );
                  setDiaSelecionado(d.getDate());
                  setMesSelecionado(d.getMonth() + 1);
                  setAnoSelecionado(d.getFullYear());
                }}
                className="px-2.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer"
                style={{ background: t.bg, borderColor: t.border, color: t.text }}
              >
                ← Sem.
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiaSelecionado(hojeReal.getDate());
                  setMesSelecionado(hojeReal.getMonth() + 1);
                  setAnoSelecionado(hojeReal.getFullYear());
                }}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer"
                style={{
                  background: t.bg,
                  borderColor: t.border,
                  color: t.action,
                }}
              >
                Hoje ({String(hojeReal.getDate()).padStart(2, "0")}/
                {String(hojeReal.getMonth() + 1).padStart(2, "0")})
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(
                    anoSelecionado,
                    mesSelecionado - 1,
                    diaSelecionado + 7
                  );
                  setDiaSelecionado(d.getDate());
                  setMesSelecionado(d.getMonth() + 1);
                  setAnoSelecionado(d.getFullYear());
                }}
                className="px-2.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer"
                style={{ background: t.bg, borderColor: t.border, color: t.text }}
              >
                Sem. →
              </button>
            </div>

            <div
              className="flex items-center gap-1 p-1 rounded-xl border"
              style={{ background: t.bg, borderColor: t.border }}
            >
              <ZoomIn size={13} className="ml-1.5" style={{ color: t.textSoft }} />
              {[
                { label: "Compacta", val: 2.0 },
                { label: "Padrão", val: 3.2 },
                { label: "Detalhada", val: 4.5 },
              ].map((z) => (
                <button
                  key={z.label}
                  onClick={() => setPxPorMinuto(z.val)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                  style={{
                    background: pxPorMinuto === z.val ? t.action : "transparent",
                    color: pxPorMinuto === z.val ? "#fff" : t.textSoft,
                  }}
                >
                  {z.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Seletor Dinâmico dos 7 Dias da Semana */}
        <div className="grid grid-cols-7 gap-1.5">
          {diasDaSemanaDinamicos.map((d) => {
            const ativo =
              diaSelecionado === d.diaMes && mesSelecionado === d.mes;
            const qtdDia = compromissos.filter(
              (c) =>
                c.diaMes === d.diaMes &&
                (c.mes === undefined || c.mes === d.mes || c.mes === d.mes - 1)
            ).length;
            return (
              <button
                key={`${d.ano}-${d.mes}-${d.diaMes}`}
                onClick={() => {
                  setDiaSelecionado(d.diaMes);
                  setMesSelecionado(d.mes);
                  setAnoSelecionado(d.ano);
                }}
                className="py-2.5 px-1 rounded-2xl border flex flex-col items-center gap-0.5 transition-all cursor-pointer"
                style={{
                  background: ativo ? t.action : t.bg,
                  borderColor: ativo ? t.action : t.border,
                  color: ativo ? "#fff" : t.text,
                }}
              >
                <span className="text-[10px] font-semibold opacity-80">
                  {d.label}
                </span>
                <span className="text-sm font-bold font-mono-num">
                  {String(d.diaMes).padStart(2, "0")}/
                  {String(d.mes).padStart(2, "0")}
                </span>
                <span
                  className="text-[10px] font-mono-num"
                  style={{ color: ativo ? "#fff" : t.textSoft }}
                >
                  {qtdDia} ev.
                </span>
              </button>
            );
          })}
        </div>

        {/* BARRA DE CRIAÇÃO DIRETA IMEDIATA (1 CLIQUE OU ENTER) */}
        <div
          className="p-3 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          style={{
            background: slotInlineAtivo ? `${t.action}12` : t.bg,
            borderColor: slotInlineAtivo ? t.action : t.border,
          }}
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="text-xs font-mono-num font-bold px-2.5 py-2 rounded-xl"
              style={{ background: t.card, color: t.action }}
            >
              Dia {String(diaSelecionado).padStart(2, "0")}/
              {String(mesSelecionado).padStart(2, "0")}
            </span>
            <input
              type="time"
              value={novaHoraInicio}
              onChange={(e) => setNovaHoraInicio(e.target.value)}
              className="px-2.5 py-2 rounded-xl text-xs font-mono-num font-bold border outline-none"
              style={{
                background: t.card,
                color: t.text,
                borderColor: t.border,
              }}
            />
            <select
              value={novaDuracaoMin}
              onChange={(e) => setNovaDuracaoMin(Number(e.target.value))}
              className="px-2 py-2 rounded-xl text-xs font-mono-num font-semibold border outline-none"
              style={{
                background: t.card,
                color: t.text,
                borderColor: t.border,
              }}
            >
              <option value={5}>5 min</option>
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>1h</option>
              <option value={90}>1h30</option>
              <option value={120}>2h</option>
            </select>
          </div>

          <input
            ref={inputTituloRef}
            value={novoTitulo}
            onChange={(e) => setNovoTitulo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criarBlocoProporcional()}
            placeholder={`Digite o compromisso às ${novaHoraInicio} e aperte Enter...`}
            className="flex-1 px-3.5 py-2 rounded-xl text-xs font-semibold border outline-none"
            style={{
              background: t.card,
              color: t.text,
              borderColor: t.border,
            }}
          />

          <button
            type="button"
            onClick={() => criarBlocoProporcional()}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            style={{ background: t.action }}
          >
            <Plus size={14} /> Agendar às {novaHoraInicio}
          </button>
        </div>
      </section>

      {/* LAYOUT 2 COLUNAS NO DESKTOP: TIMELINE PROPORCIONAL (ESQUERDA) + CRIADOR & TAREFAS SEM HORÁRIO (DIREITA) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* COLUNA 1 (8 COLUNAS): RÉGUA PROPORCIONAL DE TEMPO (MINUTO A MINUTO) */}
        <section
          className="xl:col-span-8 rounded-3xl p-4 sm:p-5 border space-y-3"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b" style={{ borderColor: t.border }}>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ background: t.danger }}
              />
              <span className="text-xs font-bold" style={{ color: t.text }}>
                Dia {String(diaSelecionado).padStart(2, "0")}/
                {String(mesSelecionado).padStart(2, "0")} ·{" "}
                {compromissosDoDia.length} blocos (
                {Math.floor(totalMinutosAlocados / 60)}h{" "}
                {totalMinutosAlocados % 60}m alocados)
              </span>
            </div>

            <span className="text-[11px]" style={{ color: t.textSoft }}>
              Clique em qualquer horário na grade abaixo para agendar nesse horário
            </span>
          </div>

          {/* CANVAS PROPORCIONAL COM RÉGUA DE HORAS E SUBDIVISÕES DE 15M / 5M */}
          <div className="relative overflow-y-auto max-h-[720px] pr-1 no-scrollbar">
            <div
              onClick={handleCliqueDiretoNaRegua}
              className="relative w-full select-none cursor-pointer"
              style={{ height: `${alturaTotalCanvasPx}px` }}
              title="Clique em qualquer horário para criar um compromisso direto na agenda"
            >
              {/* 1. Linhas de Grade de Hora Inteira e Sub-linhas de 15 min / 30 min */}
              {HORAS_INTEIRAS_AGENDA.map((h) => {
                if (h >= HORA_FIM_DIA) return null;
                const minDesdeInicio = (h - HORA_INICIO_DIA) * 60;
                const topHoraPx = minDesdeInicio * pxPorMinuto;
                const alturaUmaHoraPx = 60 * pxPorMinuto;

                return (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t"
                    style={{
                      top: `${topHoraPx}px`,
                      height: `${alturaUmaHoraPx}px`,
                      borderColor: t.border,
                    }}
                  >
                    {/* Rótulo da Hora Inteira */}
                    <span
                      className="absolute -top-2.5 left-0 text-[11px] font-mono-num font-bold px-1 rounded"
                      style={{ background: t.card, color: t.textSoft }}
                    >
                      {String(h).padStart(2, "0")}:00
                    </span>

                    {/* Sub-marca de 15 min */}
                    <div
                      className="absolute left-14 right-0 border-t border-dashed opacity-35"
                      style={{
                        top: `${15 * pxPorMinuto}px`,
                        borderColor: t.border,
                      }}
                    >
                      {pxPorMinuto >= 3.0 && (
                        <span
                          className="absolute -top-2 -left-11 text-[9px] font-mono-num"
                          style={{ color: t.textSoft }}
                        >
                          {String(h).padStart(2, "0")}:15
                        </span>
                      )}
                    </div>

                    {/* Sub-marca de 30 min */}
                    <div
                      className="absolute left-12 right-0 border-t border-dashed opacity-60"
                      style={{
                        top: `${30 * pxPorMinuto}px`,
                        borderColor: t.border,
                      }}
                    >
                      <span
                        className="absolute -top-2 -left-10 text-[9px] font-mono-num"
                        style={{ color: t.textSoft }}
                      >
                        {String(h).padStart(2, "0")}:30
                      </span>
                    </div>

                    {/* Sub-marca de 45 min */}
                    <div
                      className="absolute left-14 right-0 border-t border-dashed opacity-35"
                      style={{
                        top: `${45 * pxPorMinuto}px`,
                        borderColor: t.border,
                      }}
                    >
                      {pxPorMinuto >= 3.0 && (
                        <span
                          className="absolute -top-2 -left-11 text-[9px] font-mono-num"
                          style={{ color: t.textSoft }}
                        >
                          {String(h).padStart(2, "0")}:45
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* 2. Agulha Vermelha do Horário Atual ("AGORA") */}
              {diaSelecionado === hojeReal.getDate() && (
                <div
                  className="absolute left-12 right-0 z-20 pointer-events-none flex items-center"
                  style={{ top: `${topAgoraPx}px` }}
                >
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono-num font-bold text-white -ml-12"
                    style={{ background: t.danger }}
                  >
                    {horaAtualSimulada}
                  </span>
                  <div
                    className="flex-1 h-[2px]"
                    style={{ background: t.danger }}
                  />
                </div>
              )}

              {/* 3. BLOCOS DE COMPROMISSOS COM ALTURA ESTRITAMENTE PROPORCIONAL AOS MINUTOS REAIS */}
              {compromissosDoDia.map((ev) => {
                const inicioMin = horaParaMinutos(ev.hora);
                const fimMin = inicioMin + ev.duracaoMin;
                const horaFimStr = minutosParaHora(fimMin);

                const offsetMin = Math.max(0, inicioMin - HORA_INICIO_DIA * 60);
                const topPx = offsetMin * pxPorMinuto;
                // ALTURA REAL EXATA: se dura 5 min, ocupa exatamente 5 * pxPorMinuto!
                const heightRealPx = Math.max(4, ev.duracaoMin * pxPorMinuto);
                const isMicroBloco = ev.duracaoMin <= 15;

                return (
                  <div
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      openCard({ tipo: "compromisso", id: ev.id });
                    }}
                    style={{
                      top: `${topPx}px`,
                      height: `${heightRealPx}px`,
                    }}
                    className="absolute left-14 right-2 z-10 group cursor-pointer transition-opacity hover:opacity-95"
                  >
                    {/* Barra/Bloco na escala exata do tempo */}
                    <div
                      className="w-full h-full rounded-lg border flex items-center justify-between px-2.5 overflow-visible relative shadow-xs"
                      style={{
                        background:
                          t.mode === "light"
                            ? ev.cor === "action"
                              ? "#FDF2EE"
                              : ev.cor === "alert"
                              ? "#FEF7EC"
                              : ev.cor === "finance"
                              ? "#EFF5F8"
                              : "#F0F6F2"
                            : t.cardSubtle,
                        borderColor: t[ev.cor],
                        borderLeftWidth: "5px",
                      }}
                    >
                      {isMicroBloco ? (
                        /* Para blocos de 5 a 15 min: a caixa colorida mantém a altura proporcional exata (5 min) e o rótulo compacto fica em linha única perfeitamente legível */
                        <div className="flex items-center justify-between w-full gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="text-[10px] font-mono-num font-bold px-1.5 py-0.2 rounded text-white shrink-0"
                              style={{ background: t[ev.cor] }}
                            >
                              {ev.hora}–{horaFimStr} ({ev.duracaoMin}m)
                            </span>
                            <span
                              className="text-xs font-bold truncate"
                              style={{ color: t.text }}
                            >
                              {ev.titulo}
                            </span>
                          </div>
                          <span
                            className="text-[10px] font-mono-num shrink-0 hidden sm:inline"
                            style={{ color: t.textSoft }}
                          >
                            Bloco {ev.duracaoMin} min reais
                          </span>
                        </div>
                      ) : (
                        /* Para blocos maiores (30m, 45m, 60m, 110m): ocupa verticalmente todo o espaço proporcional */
                        <div className="w-full h-full py-1.5 flex flex-col justify-between overflow-hidden">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="text-[10px] font-mono-num font-bold px-1.5 py-0.5 rounded text-white"
                                  style={{ background: t[ev.cor] }}
                                >
                                  {ev.hora} – {horaFimStr} · {ev.duracaoMin} min
                                </span>
                                {ev.local && (
                                  <span
                                    className="text-[11px] truncate"
                                    style={{ color: t.textSoft }}
                                  >
                                    {ev.local}
                                  </span>
                                )}
                              </div>
                              <p
                                className="text-xs sm:text-sm font-bold mt-1 truncate"
                                style={{ color: t.text }}
                              >
                                {ev.titulo}
                              </p>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCompromissos((prev) =>
                                  prev.filter((c) => c.id !== ev.id)
                                );
                                showToast("Bloco removido da timeline");
                              }}
                              className="p-1 rounded-lg opacity-70 hover:opacity-100 cursor-pointer"
                              title="Remover bloco"
                            >
                              <Trash2 size={13} style={{ color: t.textSoft }} />
                            </button>
                          </div>

                          {ev.notas && heightRealPx >= 75 && (
                            <p
                              className="text-[11px] truncate"
                              style={{ color: t.textSoft }}
                            >
                              {ev.notas}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* COLUNA 2 (4 COLUNAS): CRIAR BLOCO COM DURAÇÃO REAL (5M A 2H) + ALOCAR TAREFAS DE HOJE */}
        <div className="xl:col-span-4 space-y-5">
          {/* Criador de Bloco Proporcional */}
          <section
            className="rounded-3xl p-5 border space-y-3.5"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex items-center gap-2">
              <Clock size={16} style={{ color: t.action }} />
              <div>
                <h3 className="text-sm font-bold" style={{ color: t.text }}>
                  Novo Bloco com Duração Exata
                </h3>
                <p className="text-xs" style={{ color: t.textSoft }}>
                  Crie blocos de 5 min, 10 min, 15 min ou qualquer duração real
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <input
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                placeholder="Título (ex: Responder e-mail orientador, Alongar 5m)..."
                className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none border"
                style={{
                  background: t.bg,
                  color: t.text,
                  borderColor: t.border,
                }}
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    className="text-[11px] font-semibold block mb-1"
                    style={{ color: t.textSoft }}
                  >
                    Início (HH:MM)
                  </label>
                  <input
                    type="time"
                    value={novaHoraInicio}
                    onChange={(e) => setNovaHoraInicio(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono-num outline-none border"
                    style={{
                      background: t.bg,
                      color: t.text,
                      borderColor: t.border,
                    }}
                  />
                </div>

                <div>
                  <label
                    className="text-[11px] font-semibold block mb-1"
                    style={{ color: t.textSoft }}
                  >
                    Duração (minutos reais)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={novaDuracaoMin}
                    onChange={(e) =>
                      setNovaDuracaoMin(Math.max(1, Number(e.target.value)))
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono-num font-bold outline-none border"
                    style={{
                      background: t.bg,
                      color: t.text,
                      borderColor: t.border,
                    }}
                  />
                </div>
              </div>

              {/* Botões rápidos de 1 toque para duração exata */}
              <div>
                <span
                  className="text-[11px] font-medium block mb-1"
                  style={{ color: t.textSoft }}
                >
                  Atalhos de duração real:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[5, 10, 15, 25, 45, 60, 90, 120].map((min) => (
                    <button
                      key={min}
                      onClick={() => setNovaDuracaoMin(min)}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono-num font-semibold cursor-pointer transition-colors"
                      style={{
                        background:
                          novaDuracaoMin === min ? t.action : t.cardSubtle,
                        color: novaDuracaoMin === min ? "#fff" : t.text,
                      }}
                    >
                      {min} min
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  value={novoLocal}
                  onChange={(e) => setNovoLocal(e.target.value)}
                  placeholder="Local (ex: UERJ, Casa)..."
                  className="px-3 py-2 rounded-xl text-xs outline-none border"
                  style={{
                    background: t.bg,
                    color: t.text,
                    borderColor: t.border,
                  }}
                />
                <select
                  value={novaCor}
                  onChange={(e) => setNovaCor(e.target.value as ColorTokenKey)}
                  className="px-3 py-2 rounded-xl text-xs outline-none border cursor-pointer"
                  style={{
                    background: t.bg,
                    color: t.text,
                    borderColor: t.border,
                  }}
                >
                  <option value="primary">Verde (UERJ / Casa)</option>
                  <option value="action">Terracota (Treino / Foco)</option>
                  <option value="alert">Âmbar (Trabalho CDT/RCR)</option>
                  <option value="finance">Azul (Finanças)</option>
                </select>
              </div>

              <button
                onClick={criarBlocoProporcional}
                className="w-full py-3 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-transform active:scale-98 cursor-pointer"
                style={{ background: t.action }}
              >
                <Plus size={15} /> Inserir Bloco de {novaDuracaoMin} min às{" "}
                {novaHoraInicio}
              </button>
            </div>
          </section>

          {/* Alocador Rápido de Tarefas de Hoje na Timeline */}
          <section
            className="rounded-3xl p-5 border space-y-3"
            style={{ background: t.card, borderColor: t.border }}
          >
            <h3 className="text-sm font-bold" style={{ color: t.text }}>
              Tarefas de Hoje para Alocar ({tarefasSemHorario.length})
            </h3>
            <p className="text-xs" style={{ color: t.textSoft }}>
              Encaixe cada tarefa com sua duração real na linha do tempo
            </p>

            <div className="space-y-2">
              {tarefasSemHorario.map((tk) => (
                <div
                  key={tk.id}
                  className="p-3 rounded-2xl border flex items-center justify-between gap-2"
                  style={{ background: t.bg, borderColor: t.border }}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-xs font-semibold truncate"
                      style={{ color: t.text }}
                    >
                      {tk.texto}
                    </p>
                    <span
                      className="text-[11px] font-mono-num"
                      style={{ color: t.textSoft }}
                    >
                      Duração: {tk.duracaoMin || 15} min reais
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      agendarTarefaNoHorario(
                        tk.id,
                        novaHoraInicio,
                        tk.duracaoMin || 15,
                        diaSelecionado
                      )
                    }
                    className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white shrink-0 flex items-center gap-1 cursor-pointer"
                    style={{ background: t.primary }}
                  >
                    Alocar {novaHoraInicio} <ArrowRight size={11} />
                  </button>
                </div>
              ))}

              {tarefasSemHorario.length === 0 && (
                <p
                  className="text-xs py-2 text-center"
                  style={{ color: t.primary }}
                >
                  ✓ Todas as tarefas ativas de Hoje já possuem horário na timeline!
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
