import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  ZoomIn,
  ArrowRight,
  Repeat,
  GripVertical,
  X,
} from "lucide-react";
import {
  BottomSheetPayload,
  ColorTokenKey,
  Compromisso,
  RecorrenciaCompromisso,
  TaskItem,
  ThemeTokens,
} from "../../types/lala";
import {
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

type EscopoRecorrenciaAgenda = "este" | "seguintes" | "todos";

function formatIsoDate(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function AgendaScreen({
  t,
  compromissos,
  setCompromissos,
  tarefas,
  agendarTarefaNoHorario,
  openCard,
  showToast,
}: AgendaScreenProps) {
  const hojeReal = useMemo(() => new Date(), []);
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
  const [horaAtualSimulada] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
  });

  // Formulário de Novo Bloco com Duração Real em Minutos + Recorrência + Criação Inline Direto na Régua
  const [novoTitulo, setNovoTitulo] = useState<string>("");
  const [novaHoraInicio, setNovaHoraInicio] = useState<string>("14:00");
  const [novaDuracaoMin, setNovaDuracaoMin] = useState<number>(30);
  const [novaCor, setNovaCor] = useState<ColorTokenKey>("primary");
  const [novoLocal, setNovoLocal] = useState<string>("");
  const [novaRecorrencia, setNovaRecorrencia] =
    useState<RecorrenciaCompromisso>("nenhuma");
  const [slotInlineAtivo, setSlotInlineAtivo] = useState<string | null>(null);
  const inputTituloRef = React.useRef<HTMLInputElement | null>(null);

  // Estado de Drag & Drop (arrastar verticalmente na régua de horas ou soltar em outro dia da semana)
  const [compArrastando, setCompArrastando] = useState<Compromisso | null>(
    null
  );
  const [dropTargetDiaKey, setDropTargetDiaKey] = useState<string | null>(null);
  const [dragVertical, setDragVertical] = useState<{
    comp: Compromisso;
    startY: number;
    origMin: number;
    previewMin: number;
    moved: boolean;
  } | null>(null);

  // Modal de confirmação quando um evento recorrente é movido ou excluído
  const [confirmacaoRecorrencia, setConfirmacaoRecorrencia] = useState<{
    comp: Compromisso;
    dataOcorrenciaIso: string;
    resumo: string;
    onConfirmar: (escopo: EscopoRecorrenciaAgenda) => void;
  } | null>(null);

  // Gera dinamicamente os 7 dias da semana (Seg..Dom) ao redor do diaSelecionado
  const diasDaSemanaDinamicos = useMemo(() => {
    const baseDate = new Date(
      anoSelecionado,
      mesSelecionado - 1,
      diaSelecionado
    );
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

  // Conta ocorrências repetidas por série ou título para detectar recorrência
  const contagemSeriesMap = useMemo(() => {
    const map = new Map<string, number>();
    compromissos.forEach((c) => {
      const key = c.recorrenciaSerieId || c.titulo.trim().toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [compromissos]);

  const verificarCompromissoNoDia = useCallback(
    (c: Compromisso, ano: number, mes: number, dia: number): boolean => {
      const dataAlvoIso = formatIsoDate(ano, mes, dia);
      if ((c.datasExcluidasRecorrencia || []).includes(dataAlvoIso)) {
        return false;
      }
      const mesComp =
        c.mes === undefined ? mes : c.mes === 0 ? 1 : c.mes;
      const anoComp = c.ano ?? ano;
      const rec = c.recorrencia || "nenhuma";

      if (rec === "nenhuma") {
        return c.diaMes === dia && mesComp === mes && anoComp === ano;
      }

      const dataInicioIso = formatIsoDate(anoComp, mesComp, c.diaMes);
      if (dataAlvoIso < dataInicioIso) return false;
      if (c.recorrenciaAteData && dataAlvoIso > c.recorrenciaAteData) {
        return false;
      }

      if (rec === "diaria") return true;
      if (rec === "semanal") {
        const jsDayAlvo = new Date(ano, mes - 1, dia).getDay();
        const idxAlvo = (jsDayAlvo + 6) % 7;
        const jsDayOrig = new Date(anoComp, mesComp - 1, c.diaMes).getDay();
        const idxOrig = c.diaSemanaIdx ?? (jsDayOrig + 6) % 7;
        return idxAlvo === idxOrig;
      }
      if (rec === "mensal") {
        return c.diaMes === dia;
      }
      return false;
    },
    []
  );

  const compromissosDoDia = useMemo(() => {
    return compromissos
      .filter((c) =>
        verificarCompromissoNoDia(
          c,
          anoSelecionado,
          mesSelecionado,
          diaSelecionado
        )
      )
      .sort((a, b) => horaParaMinutos(a.hora) - horaParaMinutos(b.hora));
  }, [
    compromissos,
    verificarCompromissoNoDia,
    anoSelecionado,
    mesSelecionado,
    diaSelecionado,
  ]);

  const ehCompromissoRecorrente = useCallback(
    (c: Compromisso): boolean => {
      if (c.recorrencia && c.recorrencia !== "nenhuma") return true;
      const key = c.recorrenciaSerieId || c.titulo.trim().toLowerCase();
      return (contagemSeriesMap.get(key) || 0) > 1;
    },
    [contagemSeriesMap]
  );

  // Move um compromisso para novo dia/horário respeitando o escopo ("este", "seguintes", "todos")
  const aplicarMovimentacaoCompromisso = useCallback(
    (
      comp: Compromisso,
      novoDia: number,
      novoMes: number,
      novoAno: number,
      novaHoraStr: string,
      escopo: EscopoRecorrenciaAgenda
    ) => {
      const dataOcorrenciaIso = formatIsoDate(
        anoSelecionado,
        mesSelecionado,
        diaSelecionado
      );
      const dataAnteriorIso = (() => {
        const dt = new Date(
          anoSelecionado,
          mesSelecionado - 1,
          diaSelecionado
        );
        dt.setDate(dt.getDate() - 1);
        return formatIsoDate(
          dt.getFullYear(),
          dt.getMonth() + 1,
          dt.getDate()
        );
      })();
      const novoDiaSemanaIdx =
        (new Date(novoAno, novoMes - 1, novoDia).getDay() + 6) % 7;
      const keySerie =
        comp.recorrenciaSerieId || comp.titulo.trim().toLowerCase();

      setCompromissos((prev) => {
        if (escopo === "este" && ehCompromissoRecorrente(comp)) {
          if (comp.recorrencia && comp.recorrencia !== "nenhuma") {
            const novoAvulso: Compromisso = {
              ...comp,
              id: Date.now(),
              diaMes: novoDia,
              mes: novoMes,
              ano: novoAno,
              diaSemanaIdx: novoDiaSemanaIdx,
              hora: novaHoraStr,
              recorrencia: "nenhuma",
              datasExcluidasRecorrencia: [],
            };
            return [
              ...prev.map((item) =>
                item.id === comp.id
                  ? {
                      ...item,
                      datasExcluidasRecorrencia: [
                        ...(item.datasExcluidasRecorrencia || []),
                        dataOcorrenciaIso,
                      ],
                    }
                  : item
              ),
              novoAvulso,
            ];
          }
          return prev.map((item) =>
            item.id === comp.id
              ? {
                  ...item,
                  diaMes: novoDia,
                  mes: novoMes,
                  ano: novoAno,
                  diaSemanaIdx: novoDiaSemanaIdx,
                  hora: novaHoraStr,
                  recorrenciaSerieId: undefined,
                }
              : item
          );
        }

        if (escopo === "seguintes" && ehCompromissoRecorrente(comp)) {
          if (comp.recorrencia && comp.recorrencia !== "nenhuma") {
            const novaSerieFuturo: Compromisso = {
              ...comp,
              id: Date.now(),
              diaMes: novoDia,
              mes: novoMes,
              ano: novoAno,
              diaSemanaIdx: novoDiaSemanaIdx,
              hora: novaHoraStr,
              recorrenciaSerieId: `serie-${Date.now()}`,
              datasExcluidasRecorrencia: [],
              recorrenciaAteData: comp.recorrenciaAteData,
            };
            return [
              ...prev.map((item) =>
                item.id === comp.id
                  ? { ...item, recorrenciaAteData: dataAnteriorIso }
                  : item
              ),
              novaSerieFuturo,
            ];
          }
          return prev.map((item) => {
            const itemKey =
              item.recorrenciaSerieId || item.titulo.trim().toLowerCase();
            const dataItemIso = formatIsoDate(
              item.ano ?? anoSelecionado,
              item.mes ?? mesSelecionado,
              item.diaMes
            );
            if (itemKey === keySerie && dataItemIso >= dataOcorrenciaIso) {
              return {
                ...item,
                hora: novaHoraStr,
                diaMes: item.id === comp.id ? novoDia : item.diaMes,
                mes: item.id === comp.id ? novoMes : item.mes,
                ano: item.id === comp.id ? novoAno : item.ano,
              };
            }
            return item;
          });
        }

        // escopo === "todos" ou evento único
        return prev.map((item) => {
          const itemKey =
            item.recorrenciaSerieId || item.titulo.trim().toLowerCase();
          if (
            item.id === comp.id ||
            (ehCompromissoRecorrente(comp) && itemKey === keySerie)
          ) {
            return {
              ...item,
              hora: novaHoraStr,
              diaMes: item.id === comp.id ? novoDia : item.diaMes,
              mes: item.id === comp.id ? novoMes : item.mes,
              ano: item.id === comp.id ? novoAno : item.ano,
              diaSemanaIdx:
                item.id === comp.id ? novoDiaSemanaIdx : item.diaSemanaIdx,
            };
          }
          return item;
        });
      });

      showToast(
        `Movido para ${String(novoDia).padStart(2, "0")}/${String(
          novoMes
        ).padStart(2, "0")} às ${novaHoraStr}${
          escopo === "este"
            ? " (apenas este evento)"
            : escopo === "seguintes"
            ? " (este e os seguintes)"
            : ehCompromissoRecorrente(comp)
            ? " (toda a série)"
            : ""
        }!`
      );
    },
    [
      anoSelecionado,
      mesSelecionado,
      diaSelecionado,
      ehCompromissoRecorrente,
      setCompromissos,
      showToast,
    ]
  );

  const solicitarMovimentacaoCompromisso = useCallback(
    (
      comp: Compromisso,
      novoDia: number,
      novoMes: number,
      novoAno: number,
      novaHoraStr: string
    ) => {
      if (
        novoDia === diaSelecionado &&
        novoMes === mesSelecionado &&
        novoAno === anoSelecionado &&
        novaHoraStr === comp.hora
      ) {
        return;
      }

      if (ehCompromissoRecorrente(comp)) {
        const dataOcorrenciaIso = formatIsoDate(
          anoSelecionado,
          mesSelecionado,
          diaSelecionado
        );
        setConfirmacaoRecorrencia({
          comp,
          dataOcorrenciaIso,
          resumo: `Mover "${comp.titulo}" para ${String(novoDia).padStart(
            2,
            "0"
          )}/${String(novoMes).padStart(2, "0")} às ${novaHoraStr}`,
          onConfirmar: (escopo) => {
            setConfirmacaoRecorrencia(null);
            aplicarMovimentacaoCompromisso(
              comp,
              novoDia,
              novoMes,
              novoAno,
              novaHoraStr,
              escopo
            );
          },
        });
      } else {
        aplicarMovimentacaoCompromisso(
          comp,
          novoDia,
          novoMes,
          novoAno,
          novaHoraStr,
          "este"
        );
      }
    },
    [
      diaSelecionado,
      mesSelecionado,
      anoSelecionado,
      ehCompromissoRecorrente,
      aplicarMovimentacaoCompromisso,
    ]
  );

  const solicitarExclusaoCompromisso = (comp: Compromisso) => {
    const dataOcorrenciaIso = formatIsoDate(
      anoSelecionado,
      mesSelecionado,
      diaSelecionado
    );
    const keySerie =
      comp.recorrenciaSerieId || comp.titulo.trim().toLowerCase();

    if (ehCompromissoRecorrente(comp)) {
      setConfirmacaoRecorrencia({
        comp,
        dataOcorrenciaIso,
        resumo: `Excluir "${comp.titulo}" (${String(diaSelecionado).padStart(
          2,
          "0"
        )}/${String(mesSelecionado).padStart(2, "0")})`,
        onConfirmar: (escopo) => {
          setConfirmacaoRecorrencia(null);
          setCompromissos((prev) => {
            if (escopo === "este") {
              if (comp.recorrencia && comp.recorrencia !== "nenhuma") {
                return prev.map((item) =>
                  item.id === comp.id
                    ? {
                        ...item,
                        datasExcluidasRecorrencia: [
                          ...(item.datasExcluidasRecorrencia || []),
                          dataOcorrenciaIso,
                        ],
                      }
                    : item
                );
              }
              return prev.filter((item) => item.id !== comp.id);
            }
            if (escopo === "seguintes") {
              const dtAnt = new Date(
                anoSelecionado,
                mesSelecionado - 1,
                diaSelecionado
              );
              dtAnt.setDate(dtAnt.getDate() - 1);
              const isoAnt = formatIsoDate(
                dtAnt.getFullYear(),
                dtAnt.getMonth() + 1,
                dtAnt.getDate()
              );
              if (comp.recorrencia && comp.recorrencia !== "nenhuma") {
                return prev.map((item) =>
                  item.id === comp.id
                    ? { ...item, recorrenciaAteData: isoAnt }
                    : item
                );
              }
              return prev.filter((item) => {
                const k =
                  item.recorrenciaSerieId || item.titulo.trim().toLowerCase();
                const dIso = formatIsoDate(
                  item.ano ?? anoSelecionado,
                  item.mes ?? mesSelecionado,
                  item.diaMes
                );
                return !(k === keySerie && dIso >= dataOcorrenciaIso);
              });
            }
            return prev.filter((item) => {
              const k =
                item.recorrenciaSerieId || item.titulo.trim().toLowerCase();
              return item.id !== comp.id && k !== keySerie;
            });
          });
          showToast("Compromisso removido da timeline!");
        },
      });
    } else {
      setCompromissos((prev) => prev.filter((c) => c.id !== comp.id));
      showToast("Bloco removido da timeline");
    }
  };

  // Listener global para arraste vertical contínuo na régua proporcional (snap de 15 em 15 min)
  useEffect(() => {
    if (!dragVertical) return;

    const handleMove = (clientY: number) => {
      const deltaY = clientY - dragVertical.startY;
      if (Math.abs(deltaY) < 6 && !dragVertical.moved) return;
      const deltaMin = Math.round(deltaY / pxPorMinuto / 15) * 15;
      const novoMin = Math.max(
        HORA_INICIO_DIA * 60,
        Math.min((HORA_FIM_DIA - 1) * 60 + 45, dragVertical.origMin + deltaMin)
      );
      setDragVertical((prev) =>
        prev ? { ...prev, previewMin: novoMin, moved: true } : null
      );
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientY);
    };

    const onEnd = () => {
      setDragVertical((atual) => {
        if (atual && atual.moved && atual.previewMin !== atual.origMin) {
          const novaHoraStr = minutosParaHora(atual.previewMin);
          setTimeout(() => {
            solicitarMovimentacaoCompromisso(
              atual.comp,
              diaSelecionado,
              mesSelecionado,
              anoSelecionado,
              novaHoraStr
            );
          }, 0);
        }
        return null;
      });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [
    dragVertical,
    pxPorMinuto,
    diaSelecionado,
    mesSelecionado,
    anoSelecionado,
    solicitarMovimentacaoCompromisso,
  ]);

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
    const duracaoValida = Math.max(
      1,
      Math.min(360, Number(novaDuracaoMin) || 30)
    );
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
      recorrencia: novaRecorrencia,
      recorrenciaSerieId:
        novaRecorrencia !== "nenhuma" ? `serie-${Date.now()}` : undefined,
      gcalSynced: false,
    };

    setCompromissos((prev) =>
      [...prev, novo].sort(
        (a, b) => horaParaMinutos(a.hora) - horaParaMinutos(b.hora)
      )
    );
    showToast(
      `"${novo.titulo}" (${duracaoValida} min${
        novaRecorrencia !== "nenhuma" ? ` · ${novaRecorrencia}` : ""
      }) agendado no dia ${String(diaSelecionado).padStart(2, "0")}/${String(
        mesSelecionado
      ).padStart(2, "0")} às ${horaUsada}!`
    );
    setNovoTitulo("");
    setNovoLocal("");
    setSlotInlineAtivo(null);
  };

  const handleCliqueDiretoNaRegua = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragVertical?.moved) return;
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
      {/* CABEÇALHO DA AGENDA + SELETOR DE DIAS (COM DROP TARGET) E ESCALA PROPORCIONAL */}
      <section
        className="rounded-3xl p-5 border space-y-4"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar size={17} style={{ color: t.action }} />
              <h2 className="text-base font-bold" style={{ color: t.text }}>
                Agenda Diária · Arraste blocos no horário ou solte em outro dia da semana
              </h2>
            </div>
            <p className="text-xs mt-0.5" style={{ color: t.textSoft }}>
              Clique em qualquer horário para criar direto na grade ou arraste um compromisso para mudar de hora ou de dia.
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
                style={{
                  background: t.bg,
                  borderColor: t.border,
                  color: t.text,
                }}
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
                style={{
                  background: t.bg,
                  borderColor: t.border,
                  color: t.text,
                }}
              >
                Sem. →
              </button>
            </div>

            <div
              className="flex items-center gap-1 p-1 rounded-xl border"
              style={{ background: t.bg, borderColor: t.border }}
            >
              <ZoomIn
                size={13}
                className="ml-1.5"
                style={{ color: t.textSoft }}
              />
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
                    background:
                      pxPorMinuto === z.val ? t.action : "transparent",
                    color: pxPorMinuto === z.val ? "#fff" : t.textSoft,
                  }}
                >
                  {z.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Seletor Dinâmico dos 7 Dias da Semana (aceita Drag & Drop de qualquer compromisso) */}
        <div className="grid grid-cols-7 gap-1.5">
          {diasDaSemanaDinamicos.map((d) => {
            const keyStr = `${d.ano}-${d.mes}-${d.diaMes}`;
            const ativo =
              diaSelecionado === d.diaMes && mesSelecionado === d.mes;
            const isDropTarget = dropTargetDiaKey === keyStr;
            const qtdDia = compromissos.filter((c) =>
              verificarCompromissoNoDia(c, d.ano, d.mes, d.diaMes)
            ).length;
            return (
              <button
                key={keyStr}
                onClick={() => {
                  setDiaSelecionado(d.diaMes);
                  setMesSelecionado(d.mes);
                  setAnoSelecionado(d.ano);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dropTargetDiaKey !== keyStr) setDropTargetDiaKey(keyStr);
                }}
                onDragLeave={() => {
                  if (dropTargetDiaKey === keyStr) setDropTargetDiaKey(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDropTargetDiaKey(null);
                  if (compArrastando) {
                    const comp = compArrastando;
                    setCompArrastando(null);
                    solicitarMovimentacaoCompromisso(
                      comp,
                      d.diaMes,
                      d.mes,
                      d.ano,
                      comp.hora
                    );
                  }
                }}
                className="py-2.5 px-1 rounded-2xl border flex flex-col items-center gap-0.5 transition-all cursor-pointer"
                style={{
                  background: isDropTarget
                    ? `${t.primary}25`
                    : ativo
                    ? t.action
                    : t.bg,
                  borderColor: isDropTarget
                    ? t.primary
                    : ativo
                    ? t.action
                    : t.border,
                  color: ativo && !isDropTarget ? "#fff" : t.text,
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
                  style={{
                    color: ativo && !isDropTarget ? "#fff" : t.textSoft,
                  }}
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
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
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
            <select
              value={novaRecorrencia}
              onChange={(e) =>
                setNovaRecorrencia(e.target.value as RecorrenciaCompromisso)
              }
              className="px-2 py-2 rounded-xl text-xs font-semibold border outline-none"
              style={{
                background: t.card,
                color: t.text,
                borderColor: t.border,
              }}
              title="Repetição do evento"
            >
              <option value="nenhuma">Não repete</option>
              <option value="diaria">Todo dia</option>
              <option value="semanal">Toda semana</option>
              <option value="mensal">Todo mês</option>
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
          <div
            className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b"
            style={{ borderColor: t.border }}
          >
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
              Arraste qualquer bloco para cima/baixo (15 min) ou solte em outro dia acima
            </span>
          </div>

          {/* CANVAS PROPORCIONAL COM RÉGUA DE HORAS E SUBDIVISÕES DE 15M / 5M */}
          <div className="relative overflow-y-auto max-h-[720px] pr-1 no-scrollbar">
            <div
              onClick={handleCliqueDiretoNaRegua}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!compArrastando) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const dropY = Math.max(0, e.clientY - rect.top);
                const minDesdeInicio = Math.round(dropY / pxPorMinuto / 15) * 15;
                const horaDrop = minutosParaHora(
                  HORA_INICIO_DIA * 60 + minDesdeInicio
                );
                const comp = compArrastando;
                setCompArrastando(null);
                solicitarMovimentacaoCompromisso(
                  comp,
                  diaSelecionado,
                  mesSelecionado,
                  anoSelecionado,
                  horaDrop
                );
              }}
              className="relative w-full select-none cursor-pointer"
              style={{ height: `${alturaTotalCanvasPx}px` }}
              title="Clique em qualquer horário para criar ou arraste um bloco na régua"
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

              {/* 3. BLOCOS DE COMPROMISSOS COM ALTURA ESTRITAMENTE PROPORCIONAL E ARRASTE VERTICAL */}
              {compromissosDoDia.map((ev) => {
                const isDraggingThis =
                  dragVertical && dragVertical.comp.id === ev.id;
                const inicioMin = isDraggingThis
                  ? dragVertical.previewMin
                  : horaParaMinutos(ev.hora);
                const horaExibida = isDraggingThis
                  ? minutosParaHora(inicioMin)
                  : ev.hora;
                const fimMin = inicioMin + ev.duracaoMin;
                const horaFimStr = minutosParaHora(fimMin);

                const offsetMin = Math.max(0, inicioMin - HORA_INICIO_DIA * 60);
                const topPx = offsetMin * pxPorMinuto;
                const heightRealPx = Math.max(22, ev.duracaoMin * pxPorMinuto);
                const isMicroBloco = ev.duracaoMin <= 15;
                const isRec = ehCompromissoRecorrente(ev);

                return (
                  <div
                    key={`${ev.id}-${diaSelecionado}`}
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      setCompArrastando(ev);
                      e.dataTransfer.setData("text/plain", String(ev.id));
                    }}
                    onDragEnd={() => {
                      setCompArrastando(null);
                      setDropTargetDiaKey(null);
                    }}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      e.stopPropagation();
                      const origMin = horaParaMinutos(ev.hora);
                      setDragVertical({
                        comp: ev,
                        startY: e.clientY,
                        origMin,
                        previewMin: origMin,
                        moved: false,
                      });
                    }}
                    onTouchStart={(e) => {
                      if (e.touches.length !== 1) return;
                      e.stopPropagation();
                      const origMin = horaParaMinutos(ev.hora);
                      setDragVertical({
                        comp: ev,
                        startY: e.touches[0].clientY,
                        origMin,
                        previewMin: origMin,
                        moved: false,
                      });
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (dragVertical?.moved) return;
                      openCard({ tipo: "compromisso", id: ev.id });
                    }}
                    style={{
                      top: `${topPx}px`,
                      height: `${heightRealPx}px`,
                      zIndex: isDraggingThis ? 30 : 10,
                    }}
                    className="absolute left-14 right-2 group cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md"
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
                        <div className="flex items-center justify-between w-full gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <GripVertical
                              size={11}
                              style={{ color: t.textSoft }}
                              className="shrink-0 opacity-60"
                            />
                            <span
                              className="text-[10px] font-mono-num font-bold px-1.5 py-0.2 rounded text-white shrink-0"
                              style={{ background: t[ev.cor] }}
                            >
                              {horaExibida}–{horaFimStr} ({ev.duracaoMin}m)
                            </span>
                            <span
                              className="text-xs font-bold truncate"
                              style={{ color: t.text }}
                            >
                              {ev.titulo}
                            </span>
                            {isRec && (
                              <Repeat
                                size={11}
                                style={{ color: t[ev.cor] }}
                                className="shrink-0"
                              />
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              solicitarExclusaoCompromisso(ev);
                            }}
                            className="p-0.5 rounded opacity-70 hover:opacity-100 cursor-pointer"
                            title="Remover bloco"
                          >
                            <Trash2 size={12} style={{ color: t.textSoft }} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-full py-1.5 flex flex-col justify-between overflow-hidden">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <GripVertical
                                  size={12}
                                  style={{ color: t.textSoft }}
                                  className="shrink-0 opacity-60"
                                />
                                <span
                                  className="text-[10px] font-mono-num font-bold px-1.5 py-0.5 rounded text-white"
                                  style={{ background: t[ev.cor] }}
                                >
                                  {horaExibida} – {horaFimStr} · {ev.duracaoMin}{" "}
                                  min
                                </span>
                                {isRec && (
                                  <span
                                    className="text-[10px] font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                                    style={{
                                      background: `${t[ev.cor]}18`,
                                      color: t[ev.cor],
                                    }}
                                  >
                                    <Repeat size={10} /> Recorrente
                                  </span>
                                )}
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
                                solicitarExclusaoCompromisso(ev);
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
                  Novo Bloco com Duração Exata & Recorrência
                </h3>
                <p className="text-xs" style={{ color: t.textSoft }}>
                  Crie blocos de 5 min a 2h (únicos ou recorrentes)
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

              <div>
                <label
                  className="text-[11px] font-semibold block mb-1"
                  style={{ color: t.textSoft }}
                >
                  Repetição (Recorrência)
                </label>
                <select
                  value={novaRecorrencia}
                  onChange={(e) =>
                    setNovaRecorrencia(
                      e.target.value as RecorrenciaCompromisso
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold outline-none border cursor-pointer"
                  style={{
                    background: t.bg,
                    color: t.text,
                    borderColor: t.border,
                  }}
                >
                  <option value="nenhuma">Não se repete (apenas neste dia)</option>
                  <option value="diaria">Todos os dias (Diário)</option>
                  <option value="semanal">Toda semana neste dia da semana</option>
                  <option value="mensal">Todo mês neste dia do mês</option>
                </select>
              </div>

              <button
                onClick={() => criarBlocoProporcional()}
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

      {/* MODAL DE CONFIRMAÇÃO DE EVENTO RECORRENTE (APENAS ESTE, ESTE E OS SEGUINTES, TODOS) */}
      {confirmacaoRecorrencia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 backdrop-blur-xs"
            style={{ background: "rgba(0,0,0,0.55)" }}
            onClick={() => setConfirmacaoRecorrencia(null)}
          />
          <div
            className="relative w-full max-w-md rounded-3xl p-5 border shadow-2xl space-y-4 z-10"
            style={{ background: t.card, borderColor: t.border, color: t.text }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${t.action}18`, color: t.action }}
                >
                  <Repeat size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: t.text }}>
                    Evento Recorrente na Agenda
                  </h3>
                  <p className="text-xs" style={{ color: t.textSoft }}>
                    {confirmacaoRecorrencia.resumo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmacaoRecorrencia(null)}
                className="p-1.5 rounded-xl cursor-pointer"
                style={{ background: t.cardSubtle, color: t.textSoft }}
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: t.textSoft }}>
              Este compromisso faz parte de uma repetição. Como você deseja
              aplicar esta alteração?
            </p>

            <div className="space-y-2">
              <button
                onClick={() => confirmacaoRecorrencia.onConfirmar("este")}
                className="w-full p-3 rounded-2xl border text-left transition-all cursor-pointer hover:opacity-90"
                style={{ background: t.bg, borderColor: t.border }}
              >
                <p className="text-xs font-bold" style={{ color: t.text }}>
                  Apenas este evento
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: t.textSoft }}>
                  Altera somente a ocorrência do dia{" "}
                  {String(diaSelecionado).padStart(2, "0")}/
                  {String(mesSelecionado).padStart(2, "0")}. Os demais dias
                  continuam intactos.
                </p>
              </button>

              <button
                onClick={() => confirmacaoRecorrencia.onConfirmar("seguintes")}
                className="w-full p-3 rounded-2xl border text-left transition-all cursor-pointer hover:opacity-90"
                style={{ background: t.bg, borderColor: t.border }}
              >
                <p className="text-xs font-bold" style={{ color: t.action }}>
                  Este e os eventos seguintes
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: t.textSoft }}>
                  Atualiza desta data em diante, preservando o histórico
                  anterior.
                </p>
              </button>

              <button
                onClick={() => confirmacaoRecorrencia.onConfirmar("todos")}
                className="w-full p-3 rounded-2xl border text-left transition-all cursor-pointer hover:opacity-90"
                style={{ background: t.bg, borderColor: t.border }}
              >
                <p className="text-xs font-bold" style={{ color: t.primary }}>
                  Todos os eventos da série
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: t.textSoft }}>
                  Altera todas as repetições deste compromisso na agenda.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
