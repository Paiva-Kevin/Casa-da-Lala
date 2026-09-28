import React, { useEffect, useState } from "react";
import {
  X,
  Check,
  Play,
  Pause,
  Plus,
  Timer,
  Flame,
  Trophy,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import {
  ExercicioTreino,
  FichaTreino,
  ModalidadeTreino,
  SerieExercicio,
  ThemeTokens,
} from "../types/lala";

interface LiveWorkoutModalProps {
  t: ThemeTokens;
  ficha: FichaTreino;
  onClose: () => void;
  onUpdateFicha: (fichaAtualizada: FichaTreino) => void;
  onFinishWorkout: (fichaAtualizada: FichaTreino, srpeFinal: number, duracaoMin: number) => void;
}

export function LiveWorkoutModal({
  t,
  ficha,
  onClose,
  onUpdateFicha,
  onFinishWorkout,
}: LiveWorkoutModalProps) {
  const [fichaLocal, setFichaLocal] = useState<FichaTreino>(ficha);
  const [segundosTreino, setSegundosTreino] = useState<number>(0);
  const [pausado, setPausado] = useState<boolean>(false);
  const [descansoRestante, setDescansoRestante] = useState<number>(0);
  const [etapaFinalizacao, setEtapaFinalizacao] = useState<boolean>(false);
  const [srpeEscolhido, setSrpeEscolhido] = useState<number>(6);
  const [novoExercicioNome, setNovoExercicioNome] = useState<string>("");

  // Cronômetro geral do treino ao vivo
  useEffect(() => {
    if (pausado || etapaFinalizacao) return;
    const id = window.setInterval(() => {
      setSegundosTreino((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [pausado, etapaFinalizacao]);

  // Timer de descanso automático entre séries (estilo Hevy)
  useEffect(() => {
    if (descansoRestante <= 0) return;
    const id = window.setInterval(() => {
      setDescansoRestante((d) => Math.max(0, d - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [descansoRestante]);

  const formatTime = (totalSec: number) => {
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const atualizarSerie = (
    exId: number,
    serieId: number,
    patch: Partial<SerieExercicio>,
    dispararDescansoSeg?: number
  ) => {
    const nova: FichaTreino = {
      ...fichaLocal,
      exercicios: fichaLocal.exercicios.map((ex) =>
        ex.id === exId
          ? {
              ...ex,
              series: ex.series.map((s) =>
                s.id === serieId ? { ...s, ...patch } : s
              ),
            }
          : ex
      ),
    };
    setFichaLocal(nova);
    onUpdateFicha(nova);
    if (patch.concluida && dispararDescansoSeg) {
      setDescansoRestante(dispararDescansoSeg);
    }
  };

  const adicionarSerie = (exId: number) => {
    const nova: FichaTreino = {
      ...fichaLocal,
      exercicios: fichaLocal.exercicios.map((ex) => {
        if (ex.id !== exId) return ex;
        const ultima = ex.series[ex.series.length - 1];
        const novaSerie: SerieExercicio = {
          id: Date.now() + Math.random(),
          numero: ex.series.length + 1,
          cargaOuDetalhe: ultima ? ultima.cargaOuDetalhe : ex.modalidade === "Musculação" ? 20 : "4 tentativas",
          repsOuTempo: ultima ? ultima.repsOuTempo : ex.modalidade === "Musculação" ? 8 : "3 acertos",
          qualidadeOuHit: ultima ? ultima.qualidadeOuHit : "Firme",
          concluida: false,
        };
        return { ...ex, series: [...ex.series, novaSerie] };
      }),
    };
    setFichaLocal(nova);
    onUpdateFicha(nova);
  };

  const adicionarExercicioDuranteTreino = () => {
    if (!novoExercicioNome.trim()) return;
    const mod: ModalidadeTreino = fichaLocal.modalidade;
    const novoEx: ExercicioTreino = {
      id: Date.now(),
      nome: novoExercicioNome.trim(),
      modalidade: mod,
      descansoSeg: 60,
      notaTecnica: "Adicionado durante a sessão",
      series: [
        {
          id: Date.now() + 1,
          numero: 1,
          cargaOuDetalhe: mod === "Musculação" ? 20 : mod === "Cheerleading" ? "5 tentativas" : "Livre",
          repsOuTempo: mod === "Musculação" ? 10 : mod === "Cheerleading" ? "4 acertos" : "20s",
          qualidadeOuHit: mod === "Cheerleading" ? "Hit 80%" : "Cravado",
          concluida: false,
        },
      ],
    };
    const nova = {
      ...fichaLocal,
      exercicios: [...fichaLocal.exercicios, novoEx],
    };
    setFichaLocal(nova);
    onUpdateFicha(nova);
    setNovoExercicioNome("");
  };

  // Estatísticas ao vivo da sessão
  const totalSeries = fichaLocal.exercicios.reduce(
    (acc, ex) => acc + ex.series.length,
    0
  );
  const seriesConcluidas = fichaLocal.exercicios.reduce(
    (acc, ex) => acc + ex.series.filter((s) => s.concluida).length,
    0
  );

  // Volume total em kg (para exercícios de musculação)
  const volumeTotalKg = fichaLocal.exercicios.reduce((acc, ex) => {
    if (ex.modalidade !== "Musculação") return acc;
    return (
      acc +
      ex.series
        .filter((s) => s.concluida)
        .reduce((sum, s) => {
          const kg = parseFloat(String(s.cargaOuDetalhe)) || 0;
          const reps = parseFloat(String(s.repsOuTempo)) || 0;
          return sum + kg * reps;
        }, 0)
    );
  }, 0);

  const getColunasLabels = (mod: ModalidadeTreino) => {
    if (mod === "Cheerleading") {
      return { col1: "Tentativas / Base", col2: "Acertos / Passagens", col3: "Hit / Estabilidade" };
    }
    if (mod === "Ginástica") {
      return { col1: "Aparelho / Solo", col2: "Tempo / Linhas", col3: "Aterrissagem" };
    }
    return { col1: "Carga (kg)", col2: "Repetições", col3: "RPE / Nota" };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 backdrop-blur-xs"
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-[430px] h-[92vh] sm:h-[86vh] rounded-t-[28px] sm:rounded-[28px] flex flex-col overflow-hidden shadow-2xl animate-sheet-up"
        style={{ background: t.bg, color: t.text }}
      >
        {/* TOPO FIXO DO PLAYER DE TREINO AO VIVO (ESTILO HEVY) */}
        <div
          className="px-4 pt-4 pb-3 border-b flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: t.cardSubtle }}
              aria-label="Minimizar treino"
            >
              <X size={17} style={{ color: t.textSoft }} />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: t.action }}
                />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.action }}>
                  Treino ao Vivo · {fichaLocal.modalidade}
                </span>
              </div>
              <h2 className="text-sm font-bold truncate max-w-[200px]" style={{ color: t.text }}>
                {fichaLocal.nome}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPausado((p) => !p)}
              className="px-2.5 py-1.5 rounded-xl flex items-center gap-1 text-xs font-mono-num font-semibold"
              style={{ background: t.cardSubtle, color: t.text }}
            >
              {pausado ? <Play size={12} /> : <Pause size={12} />}
              {formatTime(segundosTreino)}
            </button>
            <button
              onClick={() => setEtapaFinalizacao(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
              style={{ background: t.primary }}
            >
              Finalizar
            </button>
          </div>
        </div>

        {/* BARRA DE DESCANSO ATIVO + RESUMO RÁPIDO */}
        <div
          className="px-4 py-2.5 flex items-center justify-between text-xs border-b"
          style={{
            background: descansoRestante > 0 ? t.action : t.cardSubtle,
            color: descansoRestante > 0 ? "#FFFFFF" : t.textSoft,
            borderColor: t.border,
          }}
        >
          {descansoRestante > 0 ? (
            <>
              <div className="flex items-center gap-2 font-semibold">
                <Timer size={15} />
                <span>Descanso ativo: {formatTime(descansoRestante)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setDescansoRestante((d) => d + 15)}
                  className="px-2 py-0.5 rounded-lg bg-white/20 text-white font-mono-num text-[11px]"
                >
                  +15s
                </button>
                <button
                  onClick={() => setDescansoRestante(0)}
                  className="px-2 py-0.5 rounded-lg bg-white/20 text-white text-[11px]"
                >
                  Pular
                </button>
              </div>
            </>
          ) : (
            <>
              <span>
                Séries concluídas:{" "}
                <b style={{ color: t.text }} className="font-mono-num">
                  {seriesConcluidas}/{totalSeries}
                </b>
              </span>
              {volumeTotalKg > 0 ? (
                <span>
                  Volume total:{" "}
                  <b style={{ color: t.text }} className="font-mono-num">
                    {volumeTotalKg} kg
                  </b>
                </span>
              ) : (
                <button
                  onClick={() => setDescansoRestante(60)}
                  className="flex items-center gap-1 font-medium"
                  style={{ color: t.action }}
                >
                  <Timer size={13} /> Timer 60s
                </button>
              )}
            </>
          )}
        </div>

        {/* CORPO DO TREINO OU TELA DE FINALIZAÇÃO (sRPE) */}
        {etapaFinalizacao ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div
              className="p-4 rounded-2xl text-center space-y-2"
              style={{ background: t.card }}
            >
              <div
                className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
                style={{ background: t.cardSubtle, color: t.action }}
              >
                <Trophy size={22} />
              </div>
              <h3 className="text-base font-bold" style={{ color: t.text }}>
                Fechar sessão de {fichaLocal.modalidade}
              </h3>
              <p className="text-xs" style={{ color: t.textSoft }}>
                {seriesConcluidas} de {totalSeries} séries registradas · Tempo:{" "}
                {Math.max(1, Math.round(segundosTreino / 60))} min
              </p>
            </div>

            <div
              className="p-4 rounded-2xl space-y-3"
              style={{ background: t.card }}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold" style={{ color: t.text }}>
                  Qual foi o esforço percebido da sessão (sRPE)?
                </span>
                <span
                  className="text-sm font-bold font-mono-num px-2.5 py-0.5 rounded-full"
                  style={{
                    background: srpeEscolhido >= 8 ? t.danger : t.primary,
                    color: "#fff",
                  }}
                >
                  {srpeEscolhido}/10
                </span>
              </div>

              <input
                type="range"
                min={1}
                max={10}
                value={srpeEscolhido}
                onChange={(e) => setSrpeEscolhido(Number(e.target.value))}
                className="w-full accent-[#D47A5D]"
              />

              <div className="flex justify-between text-[10px]" style={{ color: t.textSoft }}>
                <span>1–3 Leve / Técnico</span>
                <span>4–6 Moderado</span>
                <span>7–8 Forte</span>
                <span>9–10 Exaustivo</span>
              </div>

              <p className="text-xs pt-1 leading-relaxed" style={{ color: t.textSoft }}>
                Esse sRPE alimenta a planilha <b>Treinos_Atleta</b> e recalibra
                automaticamente sua <b>Prontidão</b> na tela Hoje.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEtapaFinalizacao(false)}
                className="flex-1 py-3 rounded-2xl text-xs font-semibold"
                style={{ background: t.card, color: t.textSoft }}
              >
                Voltar ao treino
              </button>
              <button
                onClick={() =>
                  onFinishWorkout(
                    { ...fichaLocal, ultimaRealizacao: "Hoje" },
                    srpeEscolhido,
                    Math.max(15, Math.round(segundosTreino / 60))
                  )
                }
                className="flex-1 py-3 rounded-2xl text-xs font-semibold text-white"
                style={{ background: t.action }}
              >
                Salvar Treino & sRPE
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
            {fichaLocal.exercicios.map((ex) => {
              const labels = getColunasLabels(ex.modalidade);
              return (
                <div
                  key={ex.id}
                  className="rounded-2xl p-3.5 space-y-2.5 border"
                  style={{ background: t.card, borderColor: t.border }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold" style={{ color: t.text }}>
                        {ex.nome}
                      </h4>
                      {ex.notaTecnica && (
                        <p className="text-[11px] mt-0.5" style={{ color: t.textSoft }}>
                          Foco técnico: {ex.notaTecnica}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-md font-medium shrink-0"
                      style={{ background: t.cardSubtle, color: t.textSoft }}
                    >
                      Descanso {ex.descansoSeg}s
                    </span>
                  </div>

                  {/* Cabeçalho das séries adaptado à modalidade */}
                  <div
                    className="grid grid-cols-12 gap-1.5 text-[10px] font-medium pt-1"
                    style={{ color: t.textSoft }}
                  >
                    <span className="col-span-1 text-center">#</span>
                    <span className="col-span-4">{labels.col1}</span>
                    <span className="col-span-3 text-center">{labels.col2}</span>
                    <span className="col-span-3 text-center">{labels.col3}</span>
                    <span className="col-span-1 text-center">✓</span>
                  </div>

                  {/* Linhas de cada série */}
                  <div className="space-y-1.5">
                    {ex.series.map((s) => (
                      <div
                        key={s.id}
                        className="grid grid-cols-12 gap-1.5 items-center py-1 px-1 rounded-xl transition-colors"
                        style={{
                          background: s.concluida
                            ? t.mode === "light"
                              ? "#EBF3EE"
                              : "rgba(110, 158, 129, 0.16)"
                            : "transparent",
                        }}
                      >
                        <span
                          className="col-span-1 text-xs font-mono-num text-center font-semibold"
                          style={{ color: t.textSoft }}
                        >
                          {s.numero}
                        </span>

                        <input
                          value={s.cargaOuDetalhe}
                          onChange={(e) =>
                            atualizarSerie(ex.id, s.id, {
                              cargaOuDetalhe: e.target.value,
                            })
                          }
                          className="col-span-4 text-xs px-2 py-1.5 rounded-lg outline-none font-mono-num"
                          style={{ background: t.cardSubtle, color: t.text }}
                        />

                        <input
                          value={s.repsOuTempo}
                          onChange={(e) =>
                            atualizarSerie(ex.id, s.id, {
                              repsOuTempo: e.target.value,
                            })
                          }
                          className="col-span-3 text-xs text-center px-1.5 py-1.5 rounded-lg outline-none font-mono-num"
                          style={{ background: t.cardSubtle, color: t.text }}
                        />

                        <input
                          value={s.qualidadeOuHit || ""}
                          onChange={(e) =>
                            atualizarSerie(ex.id, s.id, {
                              qualidadeOuHit: e.target.value,
                            })
                          }
                          placeholder="Nota"
                          className="col-span-3 text-[11px] text-center px-1.5 py-1.5 rounded-lg outline-none"
                          style={{ background: t.cardSubtle, color: t.text }}
                        />

                        <button
                          onClick={() =>
                            atualizarSerie(
                              ex.id,
                              s.id,
                              { concluida: !s.concluida },
                              !s.concluida ? ex.descansoSeg : undefined
                            )
                          }
                          className="col-span-1 w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition-transform active:scale-90"
                          style={{
                            background: s.concluida ? t.primary : t.cardSubtle,
                            color: s.concluida ? "#fff" : t.textSoft,
                          }}
                          aria-label="Concluir série"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => adicionarSerie(ex.id)}
                    className="w-full py-1.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1"
                    style={{ background: t.cardSubtle, color: t.textSoft }}
                  >
                    <Plus size={13} /> Adicionar Série
                  </button>
                </div>
              );
            })}

            {/* Adicionar exercício extra durante o treino */}
            <div
              className="rounded-2xl p-3 flex gap-2 border"
              style={{ background: t.card, borderColor: t.border }}
            >
              <input
                value={novoExercicioNome}
                onChange={(e) => setNovoExercicioNome(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && adicionarExercicioDuranteTreino()
                }
                placeholder={`+ Novo elemento/exercício de ${fichaLocal.modalidade}...`}
                className="flex-1 text-xs px-3 py-2 rounded-xl outline-none"
                style={{ background: t.cardSubtle, color: t.text }}
              />
              <button
                onClick={adicionarExercicioDuranteTreino}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ background: t.action }}
              >
                Incluir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
