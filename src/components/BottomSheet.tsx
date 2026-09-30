import React, { useState } from "react";
import {
  X,
  Check,
  Syringe,
  Weight,
  ShoppingBag,
  Star,
  CalendarClock,
  Clock,
  Trash2,
  Download,
  ExternalLink,
  BookOpen,
  Quote,
  AlertTriangle,
  Activity,
  Moon,
  Brain,
} from "lucide-react";
import {
  Artigo,
  BottomSheetPayload,
  CheckinProntidao,
  ComodoCasa,
  Compromisso,
  Disciplina,
  FaseArtigo,
  ItemRadar,
  LancamentoFinanceiro,
  LivroLeitura,
  PetPerfil,
  ProjetoTrabalho,
  RecorrenciaCompromisso,
  TaskItem,
  ThemeTokens,
} from "../types/lala";
import {
  calcularProntidaoDetalhada,
  calcularScorePrioridade,
  calcularSituacaoNotaDisciplina,
  FASES_ARTIGO,
  HORARIOS_LINHA_DO_TEMPO,
} from "../data/initialData";

interface BottomSheetProps {
  t: ThemeTokens;
  payload: BottomSheetPayload;
  onClose: () => void;
  disciplinas: Disciplina[];
  setDisciplinas: React.Dispatch<React.SetStateAction<Disciplina[]>>;
  artigos: Artigo[];
  setArtigos: React.Dispatch<React.SetStateAction<Artigo[]>>;
  livros: LivroLeitura[];
  setLivros: React.Dispatch<React.SetStateAction<LivroLeitura[]>>;
  streakLeitura: number;
  setStreakLeitura: React.Dispatch<React.SetStateAction<number>>;
  petsPerfil: PetPerfil[];
  alimentarPet: (petId: number) => void;
  registrarCompraSaches: (pet: PetPerfil) => void;
  atualizarPet: (pet: PetPerfil) => void;
  projetos: ProjetoTrabalho[];
  setProjetos: React.Dispatch<React.SetStateAction<ProjetoTrabalho[]>>;
  tarefas: TaskItem[];
  setTarefas: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  promoverP1: (id: number) => void;
  adiarPraAmanha: (id: number) => void;
  agendarTarefaNoHorario: (taskId: number, hora: string, diaMes?: number) => void;
  compromissos: Compromisso[];
  setCompromissos: React.Dispatch<React.SetStateAction<Compromisso[]>>;
  lancamentos: LancamentoFinanceiro[];
  checkin: CheckinProntidao;
  setCheckin: React.Dispatch<React.SetStateAction<CheckinProntidao>>;
  volumeSemana: number[];
  ultimoSRPE: number;
  radarItens: ItemRadar[];
  setRadarItens: React.Dispatch<React.SetStateAction<ItemRadar[]>>;
  enviarEtapaRadarParaHoje: (radarId: number, etapaId: number) => void;
  comodos: ComodoCasa[];
  setComodos: React.Dispatch<React.SetStateAction<ComodoCasa[]>>;
}

export function BottomSheet({
  t,
  payload,
  onClose,
  disciplinas,
  setDisciplinas,
  artigos,
  setArtigos,
  livros,
  setLivros,
  setStreakLeitura,
  petsPerfil,
  alimentarPet,
  registrarCompraSaches,
  atualizarPet,
  projetos,
  setProjetos,
  tarefas,
  setTarefas,
  promoverP1,
  adiarPraAmanha,
  agendarTarefaNoHorario,
  compromissos,
  setCompromissos,
  lancamentos,
  checkin,
  setCheckin,
  volumeSemana,
  ultimoSRPE,
  radarItens,
  setRadarItens,
  enviarEtapaRadarParaHoje,
  comodos,
  setComodos,
}: BottomSheetProps) {
  const [novaAvalTipo, setNovaAvalTipo] = useState("");
  const [novaAvalData, setNovaAvalData] = useState("");
  const [novaCitAutor, setNovaCitAutor] = useState("");
  const [novaCitTrecho, setNovaCitTrecho] = useState("");
  const [novoPesoPet, setNovoPesoPet] = useState("");
  const [novaSubtarefa, setNovaSubtarefa] = useState("");
  const [novaEtapaDias, setNovaEtapaDias] = useState("3");
  const [novaEtapaAcao, setNovaEtapaAcao] = useState("");
  const [novaRotinaComodo, setNovaRotinaComodo] = useState("");
  const [escopoCompromisso, setEscopoCompromisso] = useState<
    "este" | "seguintes" | "todos"
  >("todos");
  const [abaPlanilha, setAbaPlanilha] = useState<
    | "Financas"
    | "Casa_e_Cuidado"
    | "Graduacao_UERJ"
    | "Trabalho_Projetos"
    | "Treinos_Atleta"
    | "Leitura"
  >("Financas");

  const disciplina =
    payload.tipo === "disciplina"
      ? disciplinas.find((d) => d.id === Number(payload.id))
      : undefined;
  const artigo =
    payload.tipo === "artigo"
      ? artigos.find((a) => a.id === Number(payload.id))
      : undefined;
  const livro =
    payload.tipo === "leitura"
      ? livros.find((l) => l.id === Number(payload.id))
      : undefined;
  const pet =
    payload.tipo === "pet"
      ? petsPerfil.find((p) => p.id === Number(payload.id))
      : undefined;
  const projeto =
    payload.tipo === "projeto"
      ? projetos.find((p) => p.id === Number(payload.id))
      : undefined;
  const tarefa =
    payload.tipo === "tarefa"
      ? tarefas.find((tk) => tk.id === Number(payload.id))
      : undefined;
  const compromisso =
    payload.tipo === "compromisso"
      ? compromissos.find((c) => c.id === Number(payload.id))
      : undefined;
  const radarItem =
    payload.tipo === "radar_item"
      ? radarItens.find((r) => r.id === Number(payload.id))
      : undefined;
  const comodo =
    payload.tipo === "comodo"
      ? comodos.find((c) => c.id === Number(payload.id))
      : undefined;

  let titulo = "";
  let subtitulo = "";

  if (disciplina) {
    titulo = disciplina.nome;
    subtitulo = `${disciplina.professor} · ${disciplina.horarioSala}`;
  } else if (artigo) {
    titulo = artigo.nome;
    subtitulo = `Pipeline Heptabase · Fase: ${artigo.fase}`;
  } else if (livro) {
    titulo = livro.titulo;
    subtitulo = `${livro.autor} · ${livro.tipo}`;
  } else if (pet) {
    titulo = `${pet.nome} — Ficha & Estoque`;
    subtitulo = `Ração ${pet.racao}`;
  } else if (projeto) {
    titulo = projeto.nome;
    subtitulo = `${projeto.papel} · Prazo: ${projeto.prazo}`;
  } else if (tarefa) {
    titulo = tarefa.texto;
    subtitulo = `Score Lala: ${calcularScorePrioridade(tarefa).toFixed(1)} / 10`;
  } else if (compromisso) {
    titulo = compromisso.titulo;
    subtitulo = `${compromisso.hora} (${compromisso.duracaoMin} min) · Dia ${compromisso.diaMes}/09`;
  } else if (payload.tipo === "checkin_prontidao") {
    titulo = "Check-in de Prontidão (30s)";
    subtitulo = "Cálculo transparente de recuperação diária (Estilo Bevel)";
  } else if (radarItem) {
    titulo = radarItem.titulo;
    subtitulo = `Data: ${radarItem.dataEvento} (Faltam ${radarItem.diasRestantes} dias)`;
  } else if (comodo) {
    titulo = comodo.nome;
    subtitulo = "Ciclos de manutenção da casa (só aparece quando vence)";
  } else if (payload.tipo === "planilha") {
    titulo = "Lala_Memoria_Base";
    subtitulo = "Espelho ao vivo das 6 abas da planilha";
  }

  const detalhesProntidao = calcularProntidaoDetalhada(
    checkin,
    volumeSemana,
    ultimoSRPE
  );

  const exportarCSV = () => {
    const linhas: string[] = ["Aba,Item,Detalhe,Valor_ou_Status"];
    lancamentos.forEach((l) =>
      linhas.push(`Financas,"${l.descricao}",${l.categoria},${l.valor.toFixed(2)}`)
    );
    petsPerfil.forEach((p) =>
      linhas.push(`Casa_e_Cuidado,"${p.nome}","${p.proximaVet}","${p.estoqueSaches} saches"`)
    );
    disciplinas.forEach((d) =>
      linhas.push(`Graduacao_UERJ,"${d.nome}","${d.prazo}","Faltas ${d.faltasAtuais}/${d.faltasMax}"`)
    );
    projetos.forEach((pr) =>
      linhas.push(`Trabalho_Projetos,"${pr.nome}","${pr.tarefa}","${pr.prioridade}"`)
    );
    const blob = new Blob([linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Lala_Memoria_Base.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div
        className="absolute inset-0 backdrop-blur-[2px]"
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-[420px] max-h-[88vh] overflow-y-auto rounded-t-[28px] p-5 pb-9 shadow-2xl animate-sheet-up no-scrollbar"
        style={{ background: t.card, color: t.text }}
      >
        <div
          className="w-10 h-1.5 rounded-full mx-auto mb-3.5 opacity-35"
          style={{ background: t.textSoft }}
        />

        <div className="flex justify-between items-start gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold leading-snug" style={{ color: t.text }}>
              {titulo}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: t.textSoft }}>
              {subtitulo}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: t.cardSubtle }}
          >
            <X size={17} style={{ color: t.textSoft }} />
          </button>
        </div>

        {/* 1. FICHA MODULAR DE DISCIPLINA UERJ (100% EDITÁVEL) */}
        {disciplina && (() => {
          const sit = calcularSituacaoNotaDisciplina(disciplina);
          const corBarraFaltas =
            sit.riscoFaltas === "critico"
              ? t.danger
              : sit.riscoFaltas === "atencao"
              ? t.alert
              : t.primary;

          return (
            <div className="space-y-4">
              {/* Edição dos dados básicos da Disciplina */}
              <div
                className="p-3.5 rounded-2xl space-y-2.5 border"
                style={{ background: t.bg, borderColor: t.border }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase" style={{ color: t.textSoft }}>
                    Dados da Disciplina (Editáveis)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDisciplinas((prev) => prev.filter((d) => d.id !== disciplina.id));
                      onClose();
                    }}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    style={{ background: `${t.danger}15`, color: t.danger }}
                  >
                    <Trash2 size={11} /> Excluir Matéria
                  </button>
                </div>
                <input
                  value={disciplina.nome}
                  onChange={(e) =>
                    setDisciplinas((prev) =>
                      prev.map((d) =>
                        d.id === disciplina.id ? { ...d, nome: e.target.value } : d
                      )
                    )
                  }
                  placeholder="Nome da disciplina..."
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold outline-none border"
                  style={{ background: t.card, color: t.text, borderColor: t.border }}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={disciplina.professor}
                    onChange={(e) =>
                      setDisciplinas((prev) =>
                        prev.map((d) =>
                          d.id === disciplina.id
                            ? { ...d, professor: e.target.value }
                            : d
                        )
                      )
                    }
                    placeholder="Professor(a)"
                    className="px-2.5 py-1.5 rounded-xl text-xs outline-none border"
                    style={{ background: t.card, color: t.text, borderColor: t.border }}
                  />
                  <input
                    value={disciplina.horarioSala}
                    onChange={(e) =>
                      setDisciplinas((prev) =>
                        prev.map((d) =>
                          d.id === disciplina.id
                            ? { ...d, horarioSala: e.target.value }
                            : d
                        )
                      )
                    }
                    placeholder="Horário & Sala"
                    className="px-2.5 py-1.5 rounded-xl text-xs outline-none border"
                    style={{ background: t.card, color: t.text, borderColor: t.border }}
                  />
                </div>
              </div>

              <div
                className="p-3.5 rounded-2xl space-y-2 border"
                style={{ background: t.bg, borderColor: t.border }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold" style={{ color: t.text }}>
                    Limite de 25% de Faltas
                  </span>
                  <div className="flex items-center gap-1.5 font-mono-num">
                    <input
                      type="number"
                      min={0}
                      value={disciplina.faltasAtuais}
                      onChange={(e) =>
                        setDisciplinas((prev) =>
                          prev.map((d) =>
                            d.id === disciplina.id
                              ? { ...d, faltasAtuais: Math.max(0, Number(e.target.value) || 0) }
                              : d
                          )
                        )
                      }
                      className="w-11 px-1.5 py-0.5 rounded text-center text-xs font-bold border"
                      style={{ background: t.card, color: t.text, borderColor: t.border }}
                    />
                    <span>/</span>
                    <input
                      type="number"
                      min={1}
                      value={disciplina.faltasMax}
                      onChange={(e) =>
                        setDisciplinas((prev) =>
                          prev.map((d) =>
                            d.id === disciplina.id
                              ? { ...d, faltasMax: Math.max(1, Number(e.target.value) || 15) }
                              : d
                          )
                        )
                      }
                      className="w-11 px-1.5 py-0.5 rounded text-center text-xs font-bold border"
                      style={{ background: t.card, color: t.text, borderColor: t.border }}
                    />
                  </div>
                </div>

                <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: t.cardSubtle }}>
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, sit.pctFaltasLimite)}%`,
                      background: corBarraFaltas,
                    }}
                  />
                </div>

                {sit.riscoFaltas !== "seguro" && (
                  <p className="text-[11px] flex items-center gap-1 font-medium" style={{ color: corBarraFaltas }}>
                    <AlertTriangle size={12} />
                    {sit.riscoFaltas === "critico"
                      ? "Risco crítico de reprovação por falta! Não falte mais."
                      : `Atenção: restam apenas ${disciplina.faltasMax - disciplina.faltasAtuais} faltas disponíveis.`}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() =>
                      setDisciplinas((prev) =>
                        prev.map((d) =>
                          d.id === disciplina.id
                            ? { ...d, presencas: d.presencas + 1 }
                            : d
                        )
                      )
                    }
                    className="flex-1 py-2 rounded-xl text-xs font-semibold text-white"
                    style={{ background: t.primary }}
                  >
                    + Presença ({disciplina.presencas})
                  </button>
                  <button
                    onClick={() =>
                      setDisciplinas((prev) =>
                        prev.map((d) =>
                          d.id === disciplina.id
                            ? {
                                ...d,
                                faltasAtuais: Math.min(d.faltasMax, d.faltasAtuais + 1),
                              }
                            : d
                        )
                      )
                    }
                    className="flex-1 py-2 rounded-xl text-xs font-semibold text-white"
                    style={{ background: t.action }}
                  >
                    + Registrar Falta
                  </button>
                </div>
              </div>

              {/* Avaliações + Nota Necessária */}
              <div
                className="p-3.5 rounded-2xl space-y-2.5 border"
                style={{ background: t.bg, borderColor: t.border }}
              >
                <span className="text-xs font-semibold block" style={{ color: t.text }}>
                  Avaliações & Cálculo de Média (Meta {disciplina.mediaAprovacao.toFixed(1)})
                </span>
                <p
                  className="text-xs font-medium px-2.5 py-1.5 rounded-xl"
                  style={{ background: t.cardSubtle, color: t.finance }}
                >
                  {sit.mensagem}
                </p>

                <div className="space-y-2">
                  {disciplina.avaliacoes.map((av) => (
                    <div
                      key={av.id}
                      className="p-2.5 rounded-xl flex items-center justify-between gap-2"
                      style={{ background: t.card }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate" style={{ color: t.text }}>
                          {av.tipo}
                        </p>
                        <p className="text-[11px] font-mono-num" style={{ color: t.textSoft }}>
                          Data: {av.data} · Peso {av.peso}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px]" style={{ color: t.textSoft }}>
                          Nota:
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          value={av.notaObtida ?? ""}
                          placeholder="—"
                          onChange={(e) => {
                            const raw = e.target.value;
                            const num = raw === "" ? null : parseFloat(raw);
                            setDisciplinas((prev) =>
                              prev.map((d) =>
                                d.id === disciplina.id
                                  ? {
                                      ...d,
                                      avaliacoes: d.avaliacoes.map((a) =>
                                        a.id === av.id
                                          ? { ...a, notaObtida: num, concluida: num !== null }
                                          : a
                                      ),
                                    }
                                  : d
                              )
                            );
                          }}
                          className="w-14 px-2 py-1 rounded-lg text-xs font-mono-num text-center outline-none"
                          style={{ background: t.cardSubtle, color: t.text }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-1.5 pt-1">
                  <input
                    value={novaAvalTipo}
                    onChange={(e) => setNovaAvalTipo(e.target.value)}
                    placeholder="Ex: P2, Seminário..."
                    className="flex-1 px-2.5 py-1.5 rounded-xl text-xs outline-none"
                    style={{ background: t.card, color: t.text }}
                  />
                  <input
                    value={novaAvalData}
                    onChange={(e) => setNovaAvalData(e.target.value)}
                    placeholder="Data"
                    className="w-20 px-2 py-1.5 rounded-xl text-xs font-mono-num outline-none"
                    style={{ background: t.card, color: t.text }}
                  />
                  <button
                    onClick={() => {
                      if (!novaAvalTipo.trim()) return;
                      setDisciplinas((prev) =>
                        prev.map((d) =>
                          d.id === disciplina.id
                            ? {
                                ...d,
                                avaliacoes: [
                                  ...d.avaliacoes,
                                  {
                                    id: Date.now(),
                                    tipo: novaAvalTipo.trim(),
                                    data: novaAvalData.trim() || "A definir",
                                    peso: 1,
                                    notaObtida: null,
                                  },
                                ],
                              }
                            : d
                        )
                      );
                      setNovaAvalTipo("");
                      setNovaAvalData("");
                    }}
                    className="px-3 rounded-xl text-xs font-semibold text-white"
                    style={{ background: t.action }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Leituras Obrigatórias */}
              <div
                className="p-3.5 rounded-2xl space-y-2 border"
                style={{ background: t.bg, borderColor: t.border }}
              >
                <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: t.text }}>
                  <BookOpen size={13} style={{ color: t.primary }} /> Leituras obrigatórias da semana
                </p>
                {disciplina.leiturasSemana.map((lt) => (
                  <button
                    key={lt.id}
                    onClick={() =>
                      setDisciplinas((prev) =>
                        prev.map((d) =>
                          d.id === disciplina.id
                            ? {
                                ...d,
                                leiturasSemana: d.leiturasSemana.map((l) =>
                                  l.id === lt.id ? { ...l, lido: !l.lido } : l
                                ),
                              }
                            : d
                        )
                      )
                    }
                    className="w-full p-2.5 rounded-xl flex items-center justify-between text-left text-xs"
                    style={{ background: t.card }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: lt.lido ? t.primary : "transparent",
                          border: `1.5px solid ${t.primary}`,
                        }}
                      >
                        {lt.lido && <Check size={10} color="#fff" />}
                      </span>
                      <span
                        className={`truncate ${lt.lido ? "line-through" : ""}`}
                        style={{ color: lt.lido ? t.textSoft : t.text }}
                      >
                        {lt.titulo}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono-num shrink-0 ml-2" style={{ color: t.textSoft }}>
                      {lt.paginas}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {disciplina.linksUteis.map((lk) => (
                  <a
                    key={lk.id}
                    href={lk.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 border"
                    style={{ background: t.bg, borderColor: t.border, color: t.finance }}
                  >
                    <ExternalLink size={12} /> {lk.rotulo}
                  </a>
                ))}
              </div>

              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: t.textSoft }}>
                  Caderno da Disciplina
                </p>
                <textarea
                  value={disciplina.anotacoes}
                  onChange={(e) =>
                    setDisciplinas((prev) =>
                      prev.map((d) =>
                        d.id === disciplina.id ? { ...d, anotacoes: e.target.value } : d
                      )
                    )
                  }
                  className="w-full p-3 rounded-2xl text-xs outline-none resize-none border"
                  style={{ background: t.bg, color: t.text, borderColor: t.border }}
                  rows={3}
                />
              </div>
            </div>
          );
        })()}

        {/* 2. ARTIGOS & FICHAMENTOS (SEGUNDO CÉREBRO - 100% EDITÁVEL) */}
        {artigo && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl border space-y-2.5" style={{ background: t.bg, borderColor: t.border }}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase" style={{ color: t.textSoft }}>
                    Editar Artigo
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setArtigos((prev) => prev.filter((a) => a.id !== artigo.id));
                      onClose();
                    }}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    style={{ background: `${t.danger}15`, color: t.danger }}
                  >
                    <Trash2 size={11} /> Excluir
                  </button>
                </div>
                <input
                  value={artigo.nome}
                  onChange={(e) =>
                    setArtigos((prev) =>
                      prev.map((a) => (a.id === artigo.id ? { ...a, nome: e.target.value } : a))
                    )
                  }
                  placeholder="Título do artigo..."
                  className="w-full px-3 py-1.5 rounded-xl text-xs font-bold outline-none border"
                  style={{ background: t.card, color: t.text, borderColor: t.border }}
                />
                <input
                  value={artigo.subtitulo}
                  onChange={(e) =>
                    setArtigos((prev) =>
                      prev.map((a) => (a.id === artigo.id ? { ...a, subtitulo: e.target.value } : a))
                    )
                  }
                  placeholder="Subtítulo / Foco..."
                  className="w-full px-3 py-1.5 rounded-xl text-xs outline-none border"
                  style={{ background: t.card, color: t.text, borderColor: t.border }}
                />
                <input
                  value={artigo.periódicoAlvo}
                  onChange={(e) =>
                    setArtigos((prev) =>
                      prev.map((a) =>
                        a.id === artigo.id ? { ...a, periódicoAlvo: e.target.value } : a
                      )
                    )
                  }
                  placeholder="Periódico alvo..."
                  className="w-full px-3 py-1.5 rounded-xl text-xs outline-none border"
                  style={{ background: t.card, color: t.primary, borderColor: t.border }}
                />
              </div>

              {/* Status de Leitura no Segundo Cérebro (Para Ler, Lendo, Concluído) */}
              <div className="space-y-1 pt-1">
                <span className="text-[11px] font-semibold block" style={{ color: t.textSoft }}>
                  Status de Leitura (Segundo Cérebro):
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["Para Ler", "Lendo", "Concluído"] as const).map((statusOp) => {
                    const statusAtual =
                      artigo.statusLeitura ||
                      (artigo.fase === "Triagem"
                        ? "Para Ler"
                        : artigo.fase === "Submissão"
                        ? "Concluído"
                        : "Lendo");
                    const isAtivo = statusAtual === statusOp;
                    const corBotao =
                      statusOp === "Concluído"
                        ? t.primary
                        : statusOp === "Lendo"
                        ? t.action
                        : t.finance;
                    return (
                      <button
                        key={statusOp}
                        onClick={() =>
                          setArtigos((prev) =>
                            prev.map((a) =>
                              a.id === artigo.id
                                ? { ...a, statusLeitura: statusOp }
                                : a
                            )
                          )
                        }
                        className="py-1.5 px-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        style={{
                          background: isAtivo ? corBotao : t.cardSubtle,
                          color: isAtivo ? "#fff" : t.textSoft,
                        }}
                      >
                        {statusOp}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              {FASES_ARTIGO.map((fase: FaseArtigo, idx: number) => {
                const idxAtual = FASES_ARTIGO.indexOf(artigo.fase);
                const concluida = idx < idxAtual;
                const atual = idx === idxAtual;
                return (
                  <button
                    key={fase}
                    onClick={() =>
                      setArtigos((prev) =>
                        prev.map((a) => (a.id === artigo.id ? { ...a, fase } : a))
                      )
                    }
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left"
                    style={{ background: atual ? t.cardSubtle : "transparent" }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: concluida || atual ? t.action : "transparent",
                        border: `2px solid ${t.action}`,
                      }}
                    >
                      {concluida && <Check size={11} color="#fff" />}
                    </span>
                    <span
                      className="text-xs flex-1"
                      style={{
                        color: atual ? t.text : t.textSoft,
                        fontWeight: atual ? 700 : 500,
                      }}
                    >
                      {idx + 1}. {fase}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: t.text }}>
                <Quote size={13} style={{ color: t.action }} /> Fichas de Citação ({artigo.citacoes.length})
              </p>
              {artigo.citacoes.map((cit) => (
                <div
                  key={cit.id}
                  className="p-3 rounded-2xl border space-y-1"
                  style={{ background: t.bg, borderColor: t.border }}
                >
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold" style={{ color: t.text }}>
                      {cit.autorAno} · {cit.pagina}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px]"
                      style={{ background: t.cardSubtle, color: t.action }}
                    >
                      {cit.tag}
                    </span>
                  </div>
                  <p className="text-xs italic leading-relaxed" style={{ color: t.textSoft }}>
                    "{cit.trecho}"
                  </p>
                </div>
              ))}

              <div
                className="p-3 rounded-2xl space-y-2 border"
                style={{ background: t.cardSubtle, borderColor: t.border }}
              >
                <input
                  value={novaCitAutor}
                  onChange={(e) => setNovaCitAutor(e.target.value)}
                  placeholder="Autor e ano (ex: Silva et al., 2024)"
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                  style={{ background: t.card, color: t.text }}
                />
                <textarea
                  value={novaCitTrecho}
                  onChange={(e) => setNovaCitTrecho(e.target.value)}
                  placeholder="Trecho fichado ou síntese..."
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none"
                  style={{ background: t.card, color: t.text }}
                  rows={2}
                />
                <button
                  onClick={() => {
                    if (!novaCitAutor.trim() || !novaCitTrecho.trim()) return;
                    setArtigos((prev) =>
                      prev.map((a) =>
                        a.id === artigo.id
                          ? {
                              ...a,
                              citacoes: [
                                ...a.citacoes,
                                {
                                  id: Date.now(),
                                  autorAno: novaCitAutor.trim(),
                                  pagina: "p. —",
                                  trecho: novaCitTrecho.trim(),
                                  tag: "Fichamento",
                                },
                              ],
                            }
                          : a
                      )
                    );
                    setNovaCitAutor("");
                    setNovaCitTrecho("");
                  }}
                  className="w-full py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ background: t.action }}
                >
                  + Adicionar Ficha de Citação
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. LEITURA (100% EDITÁVEL) */}
        {livro && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl border space-y-2.5" style={{ background: t.bg, borderColor: t.border }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase" style={{ color: t.textSoft }}>
                  Editar Livro
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLivros((prev) => prev.filter((l) => l.id !== livro.id));
                    onClose();
                  }}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  style={{ background: `${t.danger}15`, color: t.danger }}
                >
                  <Trash2 size={11} /> Excluir Livro
                </button>
              </div>
              <input
                value={livro.titulo}
                onChange={(e) =>
                  setLivros((prev) =>
                    prev.map((l) => (l.id === livro.id ? { ...l, titulo: e.target.value } : l))
                  )
                }
                placeholder="Título do livro..."
                className="w-full px-3 py-2 rounded-xl text-xs font-bold outline-none border"
                style={{ background: t.card, color: t.text, borderColor: t.border }}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={livro.autor}
                  onChange={(e) =>
                    setLivros((prev) =>
                      prev.map((l) => (l.id === livro.id ? { ...l, autor: e.target.value } : l))
                    )
                  }
                  placeholder="Autor(a)"
                  className="px-3 py-1.5 rounded-xl text-xs outline-none border"
                  style={{ background: t.card, color: t.text, borderColor: t.border }}
                />
                <select
                  value={livro.tipo}
                  onChange={(e) =>
                    setLivros((prev) =>
                      prev.map((l) =>
                        l.id === livro.id
                          ? { ...l, tipo: e.target.value as LivroLeitura["tipo"] }
                          : l
                      )
                    )
                  }
                  className="px-3 py-1.5 rounded-xl text-xs outline-none border"
                  style={{ background: t.card, color: t.text, borderColor: t.border }}
                >
                  <option value="Acadêmico">Acadêmico</option>
                  <option value="Fantasia">Fantasia / Lazer</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[10px] block mb-1" style={{ color: t.textSoft }}>
                    Páginas Lidas
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={livro.paginasLidas}
                    onChange={(e) =>
                      setLivros((prev) =>
                        prev.map((l) =>
                          l.id === livro.id
                            ? { ...l, paginasLidas: Math.max(0, Number(e.target.value) || 0) }
                            : l
                        )
                      )
                    }
                    className="w-full px-3 py-1.5 rounded-xl text-xs font-mono-num font-bold outline-none border"
                    style={{ background: t.card, color: t.text, borderColor: t.border }}
                  />
                </div>
                <div>
                  <span className="text-[10px] block mb-1" style={{ color: t.textSoft }}>
                    Total de Páginas
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={livro.paginasTotal}
                    onChange={(e) =>
                      setLivros((prev) =>
                        prev.map((l) =>
                          l.id === livro.id
                            ? { ...l, paginasTotal: Math.max(1, Number(e.target.value) || 100) }
                            : l
                        )
                      )
                    }
                    className="w-full px-3 py-1.5 rounded-xl text-xs font-mono-num font-bold outline-none border"
                    style={{ background: t.card, color: t.text, borderColor: t.border }}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[5, 15, 30].map((pags) => (
                <button
                  key={pags}
                  onClick={() => {
                    setLivros((prev) =>
                      prev.map((l) =>
                        l.id === livro.id
                          ? {
                              ...l,
                              paginasLidas: Math.min(l.paginasTotal, l.paginasLidas + pags),
                            }
                          : l
                      )
                    );
                    setStreakLeitura((s) => Math.max(s, 7));
                  }}
                  className="py-3 rounded-xl text-xs font-semibold text-white cursor-pointer"
                  style={{ background: t.action }}
                >
                  +{pags} páginas
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. PET (NINA / TOBIAS - 100% EDITÁVEL) */}
        {pet && (
          <div className="space-y-4">
            <div
              className="p-3.5 rounded-2xl space-y-2.5 border"
              style={{ background: t.bg, borderColor: t.border }}
            >
              <span className="text-[10px] font-bold uppercase block" style={{ color: t.textSoft }}>
                Editar Perfil & Estoque do Pet
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] block mb-0.5" style={{ color: t.textSoft }}>
                    Nome do Pet
                  </label>
                  <input
                    value={pet.nome}
                    onChange={(e) => atualizarPet({ ...pet, nome: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border outline-none"
                    style={{ background: t.card, color: t.text, borderColor: t.border }}
                  />
                </div>
                <div>
                  <label className="text-[10px] block mb-0.5" style={{ color: t.textSoft }}>
                    Ração / Dieta
                  </label>
                  <input
                    value={pet.racao}
                    onChange={(e) => atualizarPet({ ...pet, racao: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs border outline-none"
                    style={{ background: t.card, color: t.text, borderColor: t.border }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] block mb-0.5" style={{ color: t.textSoft }}>
                    Sachês (un)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={pet.estoqueSaches}
                    onChange={(e) =>
                      atualizarPet({
                        ...pet,
                        estoqueSaches: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs font-mono-num font-bold border outline-none"
                    style={{ background: t.card, color: t.primary, borderColor: t.border }}
                  />
                </div>
                <div>
                  <label className="text-[10px] block mb-0.5" style={{ color: t.textSoft }}>
                    Ração (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={pet.estoqueRacaoKg}
                    onChange={(e) =>
                      atualizarPet({
                        ...pet,
                        estoqueRacaoKg: Math.max(0, parseFloat(e.target.value) || 0),
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs font-mono-num font-bold border outline-none"
                    style={{ background: t.card, color: t.text, borderColor: t.border }}
                  />
                </div>
                <div>
                  <label className="text-[10px] block mb-0.5" style={{ color: t.textSoft }}>
                    Refeições/dia
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={pet.metaRefeicoesDia}
                    onChange={(e) =>
                      atualizarPet({
                        ...pet,
                        metaRefeicoesDia: Math.max(1, Number(e.target.value) || 2),
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs font-mono-num font-bold border outline-none"
                    style={{ background: t.card, color: t.text, borderColor: t.border }}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] block mb-0.5" style={{ color: t.textSoft }}>
                  Próxima Consulta Veterinária / Observação
                </label>
                <input
                  value={pet.proximaVet}
                  onChange={(e) => atualizarPet({ ...pet, proximaVet: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs border outline-none"
                  style={{ background: t.card, color: t.text, borderColor: t.border }}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => alimentarPet(pet.id)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white cursor-pointer"
                  style={{ background: t.primary }}
                >
                  Alimentar {pet.nome} ({pet.alimentadoHojeRefeicoes}/{pet.metaRefeicoesDia})
                </button>
                <button
                  onClick={() => registrarCompraSaches(pet)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1 cursor-pointer"
                  style={{ background: t.finance }}
                >
                  <ShoppingBag size={13} /> +10 Sachês
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: t.text }}>
                <Syringe size={13} style={{ color: t.action }} /> Vacinas, Vermífugo & Exames
              </p>
              {pet.cuidados.map((c) => (
                <div
                  key={c.id}
                  className="p-2.5 rounded-xl flex items-center justify-between text-xs border"
                  style={{ background: t.bg, borderColor: t.border }}
                >
                  <div>
                    <p className="font-semibold" style={{ color: t.text }}>
                      {c.tipo}
                    </p>
                    <p className="text-[10px]" style={{ color: t.textSoft }}>
                      Última: {c.dataRealizada} · Próxima: {c.proximaData}
                    </p>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-white"
                    style={{ background: c.status === "em dia" ? t.primary : t.alert }}
                  >
                    {c.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: t.text }}>
                <Weight size={13} style={{ color: t.primary }} /> Peso:{" "}
                {pet.historicoPeso.map((h) => `${h.pesoKg}kg (${h.data})`).join(" → ")}
              </p>
              <div className="flex gap-2">
                <input
                  value={novoPesoPet}
                  onChange={(e) => setNovoPesoPet(e.target.value)}
                  placeholder="Novo peso em kg (ex: 3.9)"
                  className="flex-1 px-3 py-2 rounded-xl text-xs outline-none font-mono-num"
                  style={{ background: t.bg, color: t.text }}
                />
                <button
                  onClick={() => {
                    const val = parseFloat(novoPesoPet.replace(",", "."));
                    if (isNaN(val) || val <= 0) return;
                    atualizarPet({
                      ...pet,
                      historicoPeso: [...pet.historicoPeso, { data: "hoje", pesoKg: val }],
                    });
                    setNovoPesoPet("");
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ background: t.action }}
                >
                  Salvar peso
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. CHECK-IN DE PRONTIDÃO DIÁRIO (30s) */}
        {payload.tipo === "checkin_prontidao" && (
          <div className="space-y-4">
            <div
              className="p-3.5 rounded-2xl space-y-2 border"
              style={{ background: t.bg, borderColor: t.border }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: t.text }}>
                  Prontidão Resultante
                </span>
                <span className="text-lg font-bold font-mono-num" style={{ color: t.primary }}>
                  {detalhesProntidao.scoreTotal}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-[10px] font-mono-num text-center pt-1">
                <div className="p-2 rounded-xl" style={{ background: t.card }}>
                  <p style={{ color: t.textSoft }}>Sono</p>
                  <p className="font-bold text-xs" style={{ color: t.text }}>
                    +{detalhesProntidao.scoreSono}
                  </p>
                </div>
                <div className="p-2 rounded-xl" style={{ background: t.card }}>
                  <p style={{ color: t.textSoft }}>Corpo</p>
                  <p className="font-bold text-xs" style={{ color: t.text }}>
                    +{detalhesProntidao.scoreCorpo}
                  </p>
                </div>
                <div className="p-2 rounded-xl" style={{ background: t.card }}>
                  <p style={{ color: t.textSoft }}>Mente</p>
                  <p className="font-bold text-xs" style={{ color: t.text }}>
                    +{detalhesProntidao.scoreMente}
                  </p>
                </div>
                <div className="p-2 rounded-xl" style={{ background: t.card }}>
                  <p style={{ color: t.textSoft }}>Fadiga sRPE</p>
                  <p className="font-bold text-xs" style={{ color: t.danger }}>
                    −{detalhesProntidao.penalidadeCarga}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5">
                    <Moon size={13} style={{ color: t.primary }} /> Horas de sono
                  </span>
                  <b className="font-mono-num">{checkin.horasSono}h</b>
                </div>
                <input
                  type="range"
                  min={4}
                  max={10}
                  step={0.5}
                  value={checkin.horasSono}
                  onChange={(e) =>
                    setCheckin((prev) => ({
                      ...prev,
                      horasSono: Number(e.target.value),
                      realizadoHoje: true,
                    }))
                  }
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5">
                    <Activity size={13} style={{ color: t.action }} /> Recuperação física (1–5)
                  </span>
                  <b className="font-mono-num">{checkin.energiaFisica}/5</b>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={checkin.energiaFisica}
                  onChange={(e) =>
                    setCheckin((prev) => ({
                      ...prev,
                      energiaFisica: Number(e.target.value),
                      realizadoHoje: true,
                    }))
                  }
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5">
                    <Brain size={13} style={{ color: t.finance }} /> Foco mental (1–5)
                  </span>
                  <b className="font-mono-num">{checkin.focoMental}/5</b>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={checkin.focoMental}
                  onChange={(e) =>
                    setCheckin((prev) => ({
                      ...prev,
                      focoMental: Number(e.target.value),
                      realizadoHoje: true,
                    }))
                  }
                  className="w-full"
                />
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl text-xs font-semibold text-white"
              style={{ background: t.primary }}
            >
              Confirmar Check-in de Hoje
            </button>
          </div>
        )}

        {/* 6. RADAR DE PREPARAÇÃO */}
        {radarItem && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl text-xs leading-relaxed" style={{ background: t.bg, color: t.textSoft }}>
              O <b>Radar de Preparação</b> divide provas e entregas em passos antecipados (ex: 1 semana antes, 3 dias antes, na véspera) que você puxa direto para <b>Hoje</b>.
            </div>

            <div className="space-y-2">
              {radarItem.etapas.map((et) => (
                <div
                  key={et.id}
                  className="p-3 rounded-2xl border flex items-center justify-between gap-2"
                  style={{ background: t.bg, borderColor: t.border }}
                >
                  <div className="min-w-0 flex-1">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md inline-block mb-1"
                      style={{ background: t.cardSubtle, color: t.action }}
                    >
                      {et.rotuloTempo}
                    </span>
                    <p
                      className={`text-xs font-medium ${et.concluida ? "line-through" : ""}`}
                      style={{ color: et.concluida ? t.textSoft : t.text }}
                    >
                      {et.acao}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!et.enviadaParaHoje && !et.concluida && (
                      <button
                        onClick={() => enviarEtapaRadarParaHoje(radarItem.id, et.id)}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-white"
                        style={{ background: t.action }}
                      >
                        Puxar p/ Hoje
                      </button>
                    )}
                    <button
                      onClick={() =>
                        setRadarItens((prev) =>
                          prev.map((r) =>
                            r.id === radarItem.id
                              ? {
                                  ...r,
                                  etapas: r.etapas.map((e) =>
                                    e.id === et.id ? { ...e, concluida: !e.concluida } : e
                                  ),
                                }
                              : r
                          )
                        )
                      }
                      className="w-7 h-7 rounded-xl flex items-center justify-center"
                      style={{
                        background: et.concluida ? t.primary : t.cardSubtle,
                        color: et.concluida ? "#fff" : t.textSoft,
                      }}
                    >
                      <Check size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-1.5">
              <select
                value={novaEtapaDias}
                onChange={(e) => setNovaEtapaDias(e.target.value)}
                className="px-2.5 py-2 rounded-xl text-xs outline-none"
                style={{ background: t.bg, color: t.text }}
              >
                <option value="7">1 semana antes</option>
                <option value="3">3 dias antes</option>
                <option value="1">Na véspera</option>
              </select>
              <input
                value={novaEtapaAcao}
                onChange={(e) => setNovaEtapaAcao(e.target.value)}
                placeholder="Novo passo preparatório..."
                className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: t.bg, color: t.text }}
              />
              <button
                onClick={() => {
                  if (!novaEtapaAcao.trim()) return;
                  const dias = Number(novaEtapaDias);
                  const rotulo =
                    dias === 7
                      ? "1 semana antes"
                      : dias === 3
                      ? "3 dias antes"
                      : "Na véspera";
                  setRadarItens((prev) =>
                    prev.map((r) =>
                      r.id === radarItem.id
                        ? {
                            ...r,
                            etapas: [
                              ...r.etapas,
                              {
                                id: Date.now(),
                                diasAntes: dias,
                                rotuloTempo: rotulo,
                                acao: novaEtapaAcao.trim(),
                                concluida: false,
                              },
                            ],
                          }
                        : r
                    )
                  );
                  setNovaEtapaAcao("");
                }}
                className="px-3 rounded-xl text-xs font-semibold text-white"
                style={{ background: t.action }}
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* 7. CÔMODO DA CASA */}
        {comodo && (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed" style={{ color: t.textSoft }}>
              Cada rotina tem um <b>ciclo automático</b> (Diária, 3x na semana, Semanal). Ela só entra em <i>Rotinas Pendentes Hoje</i> quando os dias desde a última vez atingem o ciclo.
            </p>
            <div className="space-y-2">
              {comodo.rotinas.map((rot) => {
                const pendente = !rot.feitoHoje && rot.diasDesdeUltimaVez >= rot.diasCiclo;
                return (
                  <div
                    key={rot.id}
                    className="p-3 rounded-2xl border flex items-center justify-between gap-2"
                    style={{ background: t.bg, borderColor: t.border }}
                  >
                    <div>
                      <p className="text-xs font-semibold" style={{ color: t.text }}>
                        {rot.tarefa}
                      </p>
                      <p className="text-[11px]" style={{ color: pendente ? t.action : t.textSoft }}>
                        Ciclo: {rot.frequencia} ({rot.tempoEstimadoMin} min) ·{" "}
                        {rot.feitoHoje
                          ? "Feita hoje ✓"
                          : pendente
                          ? "Venceu hoje"
                          : `Em dia (faltam ${rot.diasCiclo - rot.diasDesdeUltimaVez}d)`}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setComodos((prev) =>
                          prev.map((c) =>
                            c.id === comodo.id
                              ? {
                                  ...c,
                                  rotinas: c.rotinas.map((r) =>
                                    r.id === rot.id
                                      ? {
                                          ...r,
                                          feitoHoje: !r.feitoHoje,
                                          diasDesdeUltimaVez: !r.feitoHoje ? 0 : r.diasCiclo,
                                        }
                                      : r
                                  ),
                                }
                              : c
                          )
                        )
                      }
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                      style={{
                        background: rot.feitoHoje ? t.primary : t.cardSubtle,
                        color: rot.feitoHoje ? "#fff" : t.text,
                      }}
                    >
                      {rot.feitoHoje ? "Feito ✓" : "Concluir"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-1.5 pt-1">
              <input
                value={novaRotinaComodo}
                onChange={(e) => setNovaRotinaComodo(e.target.value)}
                placeholder="Nova rotina neste cômodo..."
                className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: t.bg, color: t.text }}
              />
              <button
                onClick={() => {
                  if (!novaRotinaComodo.trim()) return;
                  setComodos((prev) =>
                    prev.map((c) =>
                      c.id === comodo.id
                        ? {
                            ...c,
                            rotinas: [
                              ...c.rotinas,
                              {
                                id: Date.now(),
                                tarefa: novaRotinaComodo.trim(),
                                frequencia: "Semanal",
                                diasCiclo: 7,
                                diasDesdeUltimaVez: 7,
                                feitoHoje: false,
                                tempoEstimadoMin: 10,
                              },
                            ],
                          }
                        : c
                    )
                  );
                  setNovaRotinaComodo("");
                }}
                className="px-3 rounded-xl text-xs font-semibold text-white"
                style={{ background: t.action }}
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* 8. PROJETO DE TRABALHO (100% EDITÁVEL) */}
        {projeto && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl border space-y-2.5" style={{ background: t.bg, borderColor: t.border }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase" style={{ color: t.textSoft }}>
                  Dados do Projeto
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setProjetos((prev) => prev.filter((p) => p.id !== projeto.id));
                    onClose();
                  }}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  style={{ background: `${t.danger}15`, color: t.danger }}
                >
                  <Trash2 size={11} /> Excluir Projeto
                </button>
              </div>
              <input
                value={projeto.nome}
                onChange={(e) =>
                  setProjetos((prev) =>
                    prev.map((p) =>
                      p.id === projeto.id ? { ...p, nome: e.target.value } : p
                    )
                  )
                }
                placeholder="Nome do projeto..."
                className="w-full px-3 py-2 rounded-xl text-xs font-bold outline-none border"
                style={{ background: t.card, color: t.text, borderColor: t.border }}
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={projeto.papel}
                  onChange={(e) =>
                    setProjetos((prev) =>
                      prev.map((p) =>
                        p.id === projeto.id ? { ...p, papel: e.target.value } : p
                      )
                    )
                  }
                  placeholder="Papel / Frente"
                  className="px-2.5 py-1.5 rounded-xl text-xs outline-none border"
                  style={{ background: t.card, color: t.text, borderColor: t.border }}
                />
                <input
                  value={projeto.prazo}
                  onChange={(e) =>
                    setProjetos((prev) =>
                      prev.map((p) =>
                        p.id === projeto.id ? { ...p, prazo: e.target.value } : p
                      )
                    )
                  }
                  placeholder="Prazo"
                  className="px-2.5 py-1.5 rounded-xl text-xs outline-none border"
                  style={{ background: t.card, color: t.text, borderColor: t.border }}
                />
                <select
                  value={projeto.prioridade}
                  onChange={(e) =>
                    setProjetos((prev) =>
                      prev.map((p) =>
                        p.id === projeto.id
                          ? { ...p, prioridade: e.target.value as ProjetoTrabalho["prioridade"] }
                          : p
                      )
                    )
                  }
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold outline-none border"
                  style={{ background: t.card, color: t.text, borderColor: t.border }}
                >
                  <option value="alta">Alta</option>
                  <option value="média">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] block mb-1" style={{ color: t.textSoft }}>
                  Entregável Principal Ativo
                </span>
                <input
                  value={projeto.tarefa}
                  onChange={(e) =>
                    setProjetos((prev) =>
                      prev.map((p) =>
                        p.id === projeto.id ? { ...p, tarefa: e.target.value } : p
                      )
                    )
                  }
                  className="w-full p-2.5 rounded-xl text-xs font-semibold outline-none border"
                  style={{ background: t.card, color: t.text, borderColor: t.border }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              {projeto.subtarefas.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() =>
                    setProjetos((prev) =>
                      prev.map((p) =>
                        p.id === projeto.id
                          ? {
                              ...p,
                              subtarefas: p.subtarefas.map((s) =>
                                s.id === sub.id ? { ...s, feito: !s.feito } : s
                              ),
                            }
                          : p
                      )
                    )
                  }
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left text-xs"
                  style={{ background: t.bg }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: sub.feito ? t.action : "transparent",
                      border: `1.5px solid ${t.action}`,
                    }}
                  >
                    {sub.feito && <Check size={10} color="#fff" />}
                  </span>
                  <span className={sub.feito ? "line-through" : ""}>{sub.texto}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                value={novaSubtarefa}
                onChange={(e) => setNovaSubtarefa(e.target.value)}
                placeholder="Adicionar subtarefa..."
                className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: t.bg, color: t.text }}
              />
              <button
                onClick={() => {
                  if (!novaSubtarefa.trim()) return;
                  setProjetos((prev) =>
                    prev.map((p) =>
                      p.id === projeto.id
                        ? {
                            ...p,
                            subtarefas: [
                              ...p.subtarefas,
                              { id: Date.now(), texto: novaSubtarefa.trim(), feito: false },
                            ],
                          }
                        : p
                    )
                  );
                  setNovaSubtarefa("");
                }}
                className="px-3 rounded-xl text-xs font-semibold text-white"
                style={{ background: t.action }}
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* 9. TAREFA / PRIORIDADE (100% EDITÁVEL) */}
        {tarefa && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl border space-y-2.5" style={{ background: t.bg, borderColor: t.border }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase" style={{ color: t.textSoft }}>
                  Editar Tarefa
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTarefas((prev) => prev.filter((tk) => tk.id !== tarefa.id));
                    onClose();
                  }}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  style={{ background: `${t.danger}15`, color: t.danger }}
                >
                  <Trash2 size={11} /> Excluir Tarefa
                </button>
              </div>
              <input
                value={tarefa.texto}
                onChange={(e) =>
                  setTarefas((prev) =>
                    prev.map((tk) =>
                      tk.id === tarefa.id ? { ...tk, texto: e.target.value } : tk
                    )
                  )
                }
                className="w-full px-3 py-2 rounded-xl text-xs font-bold outline-none border"
                style={{ background: t.card, color: t.text, borderColor: t.border }}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] block mb-0.5" style={{ color: t.textSoft }}>
                    Duração (min)
                  </span>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={tarefa.duracaoMin || 15}
                    onChange={(e) =>
                      setTarefas((prev) =>
                        prev.map((tk) =>
                          tk.id === tarefa.id
                            ? { ...tk, duracaoMin: Math.max(5, Number(e.target.value) || 15) }
                            : tk
                        )
                      )
                    }
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs font-mono-num border outline-none"
                    style={{ background: t.card, color: t.text, borderColor: t.border }}
                  />
                </div>
                <div>
                  <span className="text-[10px] block mb-0.5" style={{ color: t.textSoft }}>
                    Prazo / Rótulo
                  </span>
                  <input
                    value={tarefa.prazoFixo || ""}
                    onChange={(e) =>
                      setTarefas((prev) =>
                        prev.map((tk) =>
                          tk.id === tarefa.id ? { ...tk, prazoFixo: e.target.value } : tk
                        )
                      )
                    }
                    placeholder="Ex: Hoje, Sex..."
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs border outline-none"
                    style={{ background: t.card, color: t.text, borderColor: t.border }}
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl space-y-2" style={{ background: t.bg }}>
              <p className="text-xs font-semibold" style={{ color: t.text }}>
                Matriz de Priorização da Lala
              </p>
              {(
                [
                  { key: "impacto", label: "Impacto (30%)" },
                  { key: "urgencia", label: "Urgência (25%)" },
                  { key: "facilidade", label: "Facilidade (25%)" },
                  { key: "retorno", label: "Retorno (20%)" },
                ] as const
              ).map((crit) => (
                <div key={crit.key} className="flex items-center justify-between gap-3">
                  <span className="text-xs w-28" style={{ color: t.textSoft }}>
                    {crit.label}
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={tarefa[crit.key]}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTarefas((prev) =>
                        prev.map((tk) =>
                          tk.id === tarefa.id ? { ...tk, [crit.key]: val } : tk
                        )
                      );
                    }}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono-num w-5 text-right">{tarefa[crit.key]}</span>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs mb-1.5" style={{ color: t.textSoft }}>
                Alocar na Linha do Tempo de Hoje
              </p>
              <div className="flex flex-wrap gap-1.5">
                {HORARIOS_LINHA_DO_TEMPO.map((h) => (
                  <button
                    key={h}
                    onClick={() => {
                      agendarTarefaNoHorario(tarefa.id, h);
                      onClose();
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-mono-num"
                    style={{
                      background: tarefa.horarioAgendado === h ? t.action : t.bg,
                      color: tarefa.horarioAgendado === h ? "#fff" : t.text,
                    }}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  promoverP1(tarefa.id);
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-2xl text-xs font-semibold text-white flex items-center justify-center gap-1"
                style={{ background: t.action }}
              >
                <Star size={13} /> Fixar P1
              </button>
              <button
                onClick={() => {
                  adiarPraAmanha(tarefa.id);
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1"
                style={{ background: t.bg, color: t.textSoft }}
              >
                <CalendarClock size={13} /> Mover p/ Backlog
              </button>
            </div>
          </div>
        )}

        {/* 10. COMPROMISSO (100% EDITÁVEL) */}
        {compromisso && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl space-y-3" style={{ background: t.bg }}>
              <div>
                <span className="text-[10px] font-bold uppercase block mb-1" style={{ color: t.textSoft }}>
                  Título do Compromisso
                </span>
                <input
                  value={compromisso.titulo}
                  onChange={(e) => {
                    const novoTitulo = e.target.value;
                    setCompromissos((prev) =>
                      prev.map((c) =>
                        c.id === compromisso.id ? { ...c, titulo: novoTitulo } : c
                      )
                    );
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold outline-none border"
                  style={{ background: t.card, color: t.text, borderColor: t.border }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] block mb-1" style={{ color: t.textSoft }}>
                    Duração (min)
                  </span>
                  <input
                    type="number"
                    step={5}
                    min={5}
                    value={compromisso.duracaoMin}
                    onChange={(e) => {
                      const dur = Math.max(5, Number(e.target.value) || 30);
                      setCompromissos((prev) =>
                        prev.map((c) =>
                          c.id === compromisso.id ? { ...c, duracaoMin: dur } : c
                        )
                      );
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs font-mono-num font-bold outline-none border"
                    style={{ background: t.card, color: t.text, borderColor: t.border }}
                  />
                </div>
                <div>
                  <span className="text-[10px] block mb-1" style={{ color: t.textSoft }}>
                    Dia do Mês
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={compromisso.diaMes}
                    onChange={(e) => {
                      const dm = Math.min(31, Math.max(1, Number(e.target.value) || 1));
                      setCompromissos((prev) =>
                        prev.map((c) =>
                          c.id === compromisso.id ? { ...c, diaMes: dm } : c
                        )
                      );
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs font-mono-num font-bold outline-none border"
                    style={{ background: t.card, color: t.text, borderColor: t.border }}
                  />
                </div>
              </div>

              <div>
                <span className="text-[10px] block mb-1" style={{ color: t.textSoft }}>
                  Observações / Local
                </span>
                <input
                  value={compromisso.notas || ""}
                  onChange={(e) => {
                    const nt = e.target.value;
                    setCompromissos((prev) =>
                      prev.map((c) =>
                        c.id === compromisso.id ? { ...c, notas: nt } : c
                      )
                    );
                  }}
                  placeholder="Local, sala ou observação..."
                  className="w-full px-3 py-1.5 rounded-xl text-xs outline-none border"
                  style={{ background: t.card, color: t.text, borderColor: t.border }}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5" style={{ color: t.textSoft }}>
                  <Clock size={13} /> Horário na agenda:
                </span>
                <input
                  type="time"
                  value={compromisso.hora}
                  onChange={(e) => {
                    const novaHora = e.target.value;
                    if (!novaHora) return;
                    const ehRec =
                      (compromisso.recorrencia &&
                        compromisso.recorrencia !== "nenhuma") ||
                      Boolean(compromisso.recorrenciaSerieId);
                    setCompromissos((prev) => {
                      if (ehRec && escopoCompromisso === "este") {
                        const hoje = new Date();
                        const ano = compromisso.ano ?? hoje.getFullYear();
                        const mes = compromisso.mes ?? hoje.getMonth() + 1;
                        const dataIso = `${ano}-${String(mes).padStart(
                          2,
                          "0"
                        )}-${String(compromisso.diaMes).padStart(2, "0")}`;
                        if (
                          compromisso.recorrencia &&
                          compromisso.recorrencia !== "nenhuma"
                        ) {
                          return [
                            ...prev.map((c) =>
                              c.id === compromisso.id
                                ? {
                                    ...c,
                                    datasExcluidasRecorrencia: [
                                      ...(c.datasExcluidasRecorrencia || []),
                                      dataIso,
                                    ],
                                  }
                                : c
                            ),
                            {
                              ...compromisso,
                              id: Date.now(),
                              hora: novaHora,
                              recorrencia: "nenhuma",
                              datasExcluidasRecorrencia: [],
                            },
                          ];
                        }
                      }
                      const keySerie =
                        compromisso.recorrenciaSerieId ||
                        compromisso.titulo.trim().toLowerCase();
                      return prev
                        .map((c) => {
                          const k =
                            c.recorrenciaSerieId ||
                            c.titulo.trim().toLowerCase();
                          if (
                            c.id === compromisso.id ||
                            (ehRec &&
                              escopoCompromisso === "todos" &&
                              k === keySerie)
                          ) {
                            return { ...c, hora: novaHora };
                          }
                          return c;
                        })
                        .sort((a, b) => a.hora.localeCompare(b.hora));
                    });
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono-num font-bold outline-none"
                  style={{ background: t.card, color: t.text }}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span style={{ color: t.textSoft }}>Repetição (Recorrência):</span>
                <select
                  value={compromisso.recorrencia || "nenhuma"}
                  onChange={(e) => {
                    const rec = e.target.value as RecorrenciaCompromisso;
                    setCompromissos((prev) =>
                      prev.map((c) =>
                        c.id === compromisso.id
                          ? {
                              ...c,
                              recorrencia: rec,
                              recorrenciaSerieId:
                                rec !== "nenhuma"
                                  ? c.recorrenciaSerieId || `serie-${c.id}`
                                  : undefined,
                            }
                          : c
                      )
                    );
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold outline-none"
                  style={{ background: t.card, color: t.text }}
                >
                  <option value="nenhuma">Não se repete</option>
                  <option value="diaria">Todo dia</option>
                  <option value="semanal">Toda semana</option>
                  <option value="mensal">Todo mês</option>
                </select>
              </div>

              {((compromisso.recorrencia &&
                compromisso.recorrencia !== "nenhuma") ||
                compromisso.recorrenciaSerieId) && (
                <div className="pt-1 space-y-1.5 border-t" style={{ borderColor: t.border }}>
                  <p className="text-[11px] font-semibold" style={{ color: t.textSoft }}>
                    Aplicar alterações ou exclusão em:
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: "este", label: "Só este" },
                        { id: "seguintes", label: "Este e seg." },
                        { id: "todos", label: "Todos" },
                      ] as const
                    ).map((op) => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setEscopoCompromisso(op.id)}
                        className="py-1.5 px-2 rounded-lg text-[11px] font-bold cursor-pointer"
                        style={{
                          background:
                            escopoCompromisso === op.id ? t.action : t.card,
                          color:
                            escopoCompromisso === op.id ? "#fff" : t.textSoft,
                        }}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {compromisso.notas && (
                <p className="text-xs" style={{ color: t.textSoft }}>
                  {compromisso.notas}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                const ehRec =
                  (compromisso.recorrencia &&
                    compromisso.recorrencia !== "nenhuma") ||
                  Boolean(compromisso.recorrenciaSerieId);
                const keySerie =
                  compromisso.recorrenciaSerieId ||
                  compromisso.titulo.trim().toLowerCase();
                setCompromissos((prev) => {
                  if (ehRec && escopoCompromisso === "todos") {
                    return prev.filter((c) => {
                      const k =
                        c.recorrenciaSerieId ||
                        c.titulo.trim().toLowerCase();
                      return c.id !== compromisso.id && k !== keySerie;
                    });
                  }
                  return prev.filter((c) => c.id !== compromisso.id);
                });
                onClose();
              }}
              className="w-full py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5"
              style={{ background: t.bg, color: t.danger }}
            >
              <Trash2 size={14} /> Remover da agenda (
              {escopoCompromisso === "este"
                ? "apenas este evento"
                : escopoCompromisso === "seguintes"
                ? "este e seguintes"
                : "série"}
              )
            </button>
          </div>
        )}

        {/* 11. PLANILHA */}
        {payload.tipo === "planilha" && (
          <div className="space-y-3">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {(
                [
                  "Financas",
                  "Casa_e_Cuidado",
                  "Graduacao_UERJ",
                  "Trabalho_Projetos",
                  "Treinos_Atleta",
                  "Leitura",
                ] as const
              ).map((aba) => (
                <button
                  key={aba}
                  onClick={() => setAbaPlanilha(aba)}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-mono-num shrink-0"
                  style={{
                    background: abaPlanilha === aba ? t.action : t.bg,
                    color: abaPlanilha === aba ? "#fff" : t.textSoft,
                  }}
                >
                  {aba}
                </button>
              ))}
            </div>

            <div className="p-3 rounded-2xl text-xs space-y-1.5 max-h-52 overflow-y-auto" style={{ background: t.bg }}>
              {abaPlanilha === "Financas" &&
                lancamentos.map((l) => (
                  <div key={l.id} className="flex justify-between">
                    <span>
                      {l.data} · {l.descricao} ({l.status})
                    </span>
                    <span className="font-mono-num font-semibold">
                      {l.tipo === "despesa" ? "-" : "+"}R$ {l.valor.toFixed(2)}
                    </span>
                  </div>
                ))}
              {abaPlanilha === "Casa_e_Cuidado" &&
                petsPerfil.map((p) => (
                  <div key={p.id} className="flex justify-between">
                    <span>{p.nome} ({p.racao})</span>
                    <span className="font-mono-num">{p.estoqueSaches} sachês</span>
                  </div>
                ))}
              {abaPlanilha === "Graduacao_UERJ" &&
                disciplinas.map((d) => (
                  <div key={d.id} className="flex justify-between">
                    <span>{d.nome}</span>
                    <span className="font-mono-num">Faltas: {d.faltasAtuais}/{d.faltasMax}</span>
                  </div>
                ))}
              {abaPlanilha === "Trabalho_Projetos" &&
                projetos.map((p) => (
                  <div key={p.id} className="flex justify-between">
                    <span>{p.nome}</span>
                    <span>{p.prazo}</span>
                  </div>
                ))}
              {abaPlanilha === "Treinos_Atleta" && (
                <p>Volume sRPE Semanal: {volumeSemana.join(" · ")}</p>
              )}
              {abaPlanilha === "Leitura" &&
                livros.map((l) => (
                  <div key={l.id} className="flex justify-between">
                    <span>{l.titulo}</span>
                    <span className="font-mono-num">{l.paginasLidas}/{l.paginasTotal}p</span>
                  </div>
                ))}
            </div>

            <button
              onClick={exportarCSV}
              className="w-full py-2.5 rounded-2xl text-xs font-semibold text-white flex items-center justify-center gap-1.5"
              style={{ background: t.finance }}
            >
              <Download size={14} /> Exportar CSV Lala_Memoria_Base
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
