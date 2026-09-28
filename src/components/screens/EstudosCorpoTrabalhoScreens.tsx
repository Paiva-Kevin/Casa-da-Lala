import React, { useState } from "react";
import {
  ChevronRight,
  Flame,
  Play,
  Check,
  AlertTriangle,
  BookOpen,
  Quote,
  ExternalLink,
  Utensils,
  Star,
  PawPrint,
  ShoppingBag,
  Briefcase,
  GraduationCap,
  Layers,
  Plus,
  Activity,
  Moon,
  Brain,
} from "lucide-react";
import {
  Artigo,
  BottomSheetPayload,
  CheckinProntidao,
  Disciplina,
  FaseArtigo,
  FichaTreino,
  ItemRefeicao,
  LivroLeitura,
  ModalidadeTreino,
  ProjetoTrabalho,
  StatusEntregavel,
  ThemeTokens,
} from "../../types/lala";
import {
  calcularProntidaoDetalhada,
  calcularSituacaoNotaDisciplina,
  FASES_ARTIGO,
} from "../../data/initialData";

// ============================================================================
// 1. MÓDULO UNIFICADO: ESTUDOS & TRABALHO (ENTREGÁVEIS UERJ, ARTIGOS, LEITURAS & PROJETOS)
// ============================================================================
interface EstudosTrabalhoScreenProps {
  t: ThemeTokens;
  openCard: (payload: BottomSheetPayload) => void;
  disciplinas: Disciplina[];
  setDisciplinas: React.Dispatch<React.SetStateAction<Disciplina[]>>;
  artigos: Artigo[];
  setArtigos: React.Dispatch<React.SetStateAction<Artigo[]>>;
  livros: LivroLeitura[];
  streakLeitura: number;
  projetos: ProjetoTrabalho[];
  setProjetos: React.Dispatch<React.SetStateAction<ProjetoTrabalho[]>>;
  enviarProjetoParaPrioridades: (proj: ProjetoTrabalho) => void;
  abrirCalibracao?: () => void;
}

const ETAPAS_ENTREGAVEL: StatusEntregavel[] = [
  "Planejado",
  "Em Produção",
  "Revisão",
  "Entregue",
];

export function EstudosTrabalhoScreen({
  t,
  openCard,
  disciplinas,
  setDisciplinas,
  artigos,
  setArtigos,
  livros,
  streakLeitura,
  projetos,
  setProjetos,
  enviarProjetoParaPrioridades,
  abrirCalibracao,
}: EstudosTrabalhoScreenProps) {
  const [seg, setSeg] = useState<
    "visao_unificada" | "uerj" | "projetos_trabalho" | "artigos_leitura"
  >("visao_unificada");
  const [mostrarNovaDisciplina, setMostrarNovaDisciplina] = useState(false);
  const [novaDiscNome, setNovaDiscNome] = useState("");
  const [novaDiscHorario, setNovaDiscHorario] = useState("SEG/QUA · 07:30 · Sala 302");
  const [novaDiscProf, setNovaDiscProf] = useState("");

  const [novoSubEntregavel, setNovoSubEntregavel] = useState<
    Record<number, string>
  >({});
  const [mostrarNovoArtigo, setMostrarNovoArtigo] = useState<boolean>(false);
  const [novoArtigoTitulo, setNovoArtigoTitulo] = useState<string>("");
  const [novoArtigoPeriodico, setNovoArtigoPeriodico] = useState<string>(
    "Revista Brasileira de Ciências do Esporte"
  );

  const todasAvaliacoesTimeline = disciplinas.flatMap((d) =>
    d.avaliacoes.map((av) => ({
      ...av,
      disciplinaNome: d.nome,
      disciplinaId: d.id,
    }))
  );

  const totalFaltasSemestre = disciplinas.reduce(
    (acc, d) => acc + d.faltasAtuais,
    0
  );
  const totalMaxFaltasSemestre = disciplinas.reduce(
    (acc, d) => acc + d.faltasMax,
    0
  );
  const totalLeituras = disciplinas.reduce(
    (acc, d) => acc + d.leiturasSemana.length,
    0
  );
  const leiturasConcluidas = disciplinas.reduce(
    (acc, d) => acc + d.leiturasSemana.filter((l) => l.lido).length,
    0
  );

  const criarNovoArtigo = () => {
    if (!novoArtigoTitulo.trim()) return;
    const novo: Artigo = {
      id: Date.now(),
      nome: novoArtigoTitulo.trim(),
      subtitulo: "Novo fichamento e revisão bibliográfica no Heptabase",
      periódicoAlvo: novoArtigoPeriodico.trim() || "Periódico Qualis A",
      fase: "Triagem",
      statusLeitura: "Para Ler",
      notas: "Artigo adicionado ao pipeline.",
      citacoes: [],
    };
    setArtigos((prev) => [novo, ...prev]);
    setNovoArtigoTitulo("");
    setMostrarNovoArtigo(false);
  };

  return (
    <div className="space-y-5">
      {/* NOVO PAINEL STITCH: MÉTRICAS ACADÊMICAS UERJ, PIPELINE HEPTABASE & ENTREGÁVEIS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          className="rounded-2xl p-4 border space-y-1"
          style={{ background: t.card, borderColor: t.border }}
        >
          <span
            className="text-xs font-semibold block"
            style={{ color: t.textSoft }}
          >
            CR Estimado · UERJ
          </span>
          <p
            className="text-2xl font-bold font-mono-num"
            style={{ color: t.primary }}
          >
            8,4{" "}
            <span
              className="text-xs font-normal"
              style={{ color: t.textSoft }}
            >
              / 10
            </span>
          </p>
          <p className="text-[11px]" style={{ color: t.textSoft }}>
            Meta 7,0+ sem exame final
          </p>
        </div>

        <div
          className="rounded-2xl p-4 border space-y-1"
          style={{ background: t.card, borderColor: t.border }}
        >
          <span
            className="text-xs font-semibold block"
            style={{ color: t.textSoft }}
          >
            Margem de Faltas (25%)
          </span>
          <p
            className="text-2xl font-bold font-mono-num"
            style={{ color: t.text }}
          >
            {totalFaltasSemestre}/{totalMaxFaltasSemestre}
          </p>
          <p className="text-[11px]" style={{ color: t.primary }}>
            Frequência segura em {disciplinas.length} matérias
          </p>
        </div>

        <div
          className="rounded-2xl p-4 border space-y-1"
          style={{ background: t.card, borderColor: t.border }}
        >
          <span
            className="text-xs font-semibold block"
            style={{ color: t.textSoft }}
          >
            Leituras & Heptabase
          </span>
          <p
            className="text-2xl font-bold font-mono-num"
            style={{ color: t.finance }}
          >
            {leiturasConcluidas}/{totalLeituras}
          </p>
          <p className="text-[11px]" style={{ color: t.textSoft }}>
            {artigos.length} artigos ativos · Streak {streakLeitura}d
          </p>
        </div>

        <div
          className="rounded-2xl p-4 border space-y-1"
          style={{ background: t.card, borderColor: t.border }}
        >
          <span
            className="text-xs font-semibold block"
            style={{ color: t.textSoft }}
          >
            Projetos CDT / RCR
          </span>
          <p
            className="text-2xl font-bold font-mono-num"
            style={{ color: t.action }}
          >
            {projetos.length} ativos
          </p>
          <p className="text-[11px]" style={{ color: t.textSoft }}>
            Orientados a entregáveis concretos
          </p>
        </div>
      </div>

      {/* Navegação Interna do Módulo Unificado Estudos & Trabalho */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-2xl border"
        style={{ background: t.card, borderColor: t.border }}
      >
        {(
          [
            { id: "visao_unificada", label: "Visão Geral Entregáveis" },
            { id: "uerj", label: "UERJ (Faltas & Provas)" },
            { id: "projetos_trabalho", label: "Projetos (CDT / RCR)" },
            { id: "artigos_leitura", label: "Artigos & Leituras" },
          ] as const
        ).map((s) => (
          <button
            key={s.id}
            onClick={() => setSeg(s.id)}
            className="py-2 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            style={{
              background: seg === s.id ? t.action : "transparent",
              color: seg === s.id ? "#fff" : t.textSoft,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* SEÇÃO 1: PROJETOS & ENTREGÁVEIS DE TRABALHO (SEM MODELO "SÓ TAREFAS") */}
      {(seg === "visao_unificada" || seg === "projetos_trabalho") && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase size={16} style={{ color: t.alert }} />
              <div>
                <h3 className="text-sm font-bold" style={{ color: t.text }}>
                  Projetos & Entregáveis de Trabalho (CDT, RCR & Chaos)
                </h3>
                <p className="text-xs" style={{ color: t.textSoft }}>
                  Gestão orientada a entregáveis concretos, estágio de produção e marcos de validação
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {projetos.map((p) => {
              const feitas = p.subtarefas.filter((s) => s.feito).length;
              const pct =
                p.subtarefas.length > 0
                  ? Math.round((feitas / p.subtarefas.length) * 100)
                  : 0;
              const statusAtual: StatusEntregavel =
                p.statusProjeto ||
                (pct === 100
                  ? "Entregue"
                  : pct >= 60
                  ? "Revisão"
                  : "Em Produção");
              const idxFase = ETAPAS_ENTREGAVEL.indexOf(statusAtual);

              return (
                <div
                  key={p.id}
                  className="rounded-3xl p-5 border flex flex-col justify-between space-y-4"
                  style={{ background: t.card, borderColor: t.border }}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => openCard({ tipo: "projeto", id: p.id })}
                        className="text-left flex-1 cursor-pointer"
                      >
                        <div
                          className="flex items-center gap-1.5 text-[11px] font-mono-num"
                          style={{ color: t.textSoft }}
                        >
                          <span
                            className="font-bold uppercase"
                            style={{
                              color:
                                p.prioridade === "alta"
                                  ? t.action
                                  : p.prioridade === "média"
                                  ? t.alert
                                  : t.primary,
                            }}
                          >
                            Prioridade {p.prioridade}
                          </span>
                          <span>·</span>
                          <span>Entrega {p.prazo}</span>
                        </div>
                        <h4
                          className="text-sm font-bold mt-0.5"
                          style={{ color: t.text }}
                        >
                          {p.nome}
                        </h4>
                        <p className="text-[11px]" style={{ color: t.textSoft }}>
                          {p.papel}
                        </p>
                      </button>

                      <span
                        className="text-xs font-mono-num font-bold"
                        style={{ color: t.primary }}
                      >
                        {pct}%
                      </span>
                    </div>

                    {/* Card do Entregável Principal */}
                    <div
                      className="p-3 rounded-2xl border space-y-2"
                      style={{ background: t.bg, borderColor: t.border }}
                    >
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider block"
                        style={{ color: t.action }}
                      >
                        Entregável Principal Ativo
                      </span>
                      <p
                        className="text-xs font-bold leading-snug"
                        style={{ color: t.text }}
                      >
                        {p.tarefa}
                      </p>

                      {/* Régua de Estágio do Entregável */}
                      <div className="grid grid-cols-4 gap-1 pt-1">
                        {ETAPAS_ENTREGAVEL.map((st, idx) => {
                          const ativo = idx <= idxFase;
                          return (
                            <button
                              key={st}
                              onClick={() =>
                                setProjetos((prev) =>
                                  prev.map((proj) =>
                                    proj.id === p.id
                                      ? { ...proj, statusProjeto: st }
                                      : proj
                                  )
                                )
                              }
                              className="text-left space-y-1 cursor-pointer"
                            >
                              <div
                                className="h-1.5 rounded-full transition-all"
                                style={{
                                  background: ativo ? t.action : t.cardSubtle,
                                }}
                              />
                              <span
                                className="block text-[9px] truncate"
                                style={{
                                  color:
                                    idx === idxFase ? t.text : t.textSoft,
                                  fontWeight: idx === idxFase ? 700 : 400,
                                }}
                              >
                                {st}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Marcos / Componentes do Entregável */}
                    <div className="space-y-1.5">
                      <span
                        className="text-[11px] font-semibold block"
                        style={{ color: t.textSoft }}
                      >
                        Etapas do Entregável ({feitas}/{p.subtarefas.length}):
                      </span>
                      {p.subtarefas.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() =>
                            setProjetos((prev) =>
                              prev.map((proj) =>
                                proj.id === p.id
                                  ? {
                                      ...proj,
                                      subtarefas: proj.subtarefas.map((s) =>
                                        s.id === sub.id
                                          ? { ...s, feito: !s.feito }
                                          : s
                                      ),
                                    }
                                  : proj
                              )
                            )
                          }
                          className="w-full p-2 rounded-xl flex items-center justify-between gap-2 text-left text-xs cursor-pointer"
                          style={{ background: t.bg }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                              style={{
                                background: sub.feito
                                  ? t.primary
                                  : "transparent",
                                border: `1.5px solid ${
                                  sub.feito ? t.primary : t.textSoft
                                }`,
                              }}
                            >
                              {sub.feito && <Check size={10} color="#fff" />}
                            </span>
                            <span
                              className={`truncate ${
                                sub.feito ? "line-through" : ""
                              }`}
                              style={{
                                color: sub.feito ? t.textSoft : t.text,
                              }}
                            >
                              {sub.texto}
                            </span>
                          </div>
                          {sub.prazo && (
                            <span
                              className="text-[10px] font-mono-num shrink-0"
                              style={{ color: t.textSoft }}
                            >
                              {sub.prazo}
                            </span>
                          )}
                        </button>
                      ))}

                      {/* Input rápido para novo marco de entregável */}
                      <div className="flex gap-1.5 pt-1">
                        <input
                          value={novoSubEntregavel[p.id] || ""}
                          onChange={(e) =>
                            setNovoSubEntregavel((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          placeholder="+ Nova etapa deste entregável..."
                          className="flex-1 px-2.5 py-1.5 rounded-xl text-xs outline-none border"
                          style={{
                            background: t.bg,
                            color: t.text,
                            borderColor: t.border,
                          }}
                        />
                        <button
                          onClick={() => {
                            const txt = (novoSubEntregavel[p.id] || "").trim();
                            if (!txt) return;
                            setProjetos((prev) =>
                              prev.map((proj) =>
                                proj.id === p.id
                                  ? {
                                      ...proj,
                                      subtarefas: [
                                        ...proj.subtarefas,
                                        {
                                          id: Date.now(),
                                          texto: txt,
                                          feito: false,
                                        },
                                      ],
                                    }
                                  : proj
                              )
                            );
                            setNovoSubEntregavel((prev) => ({
                              ...prev,
                              [p.id]: "",
                            }));
                          }}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white cursor-pointer"
                          style={{ background: t.action }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between pt-2 border-t"
                    style={{ borderColor: t.border }}
                  >
                    <button
                      onClick={() => openCard({ tipo: "projeto", id: p.id })}
                      className="text-xs font-semibold cursor-pointer"
                      style={{ color: t.textSoft }}
                    >
                      Abrir Ficha →
                    </button>
                    <button
                      onClick={() => enviarProjetoParaPrioridades(p)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      style={{ background: t.cardSubtle, color: t.action }}
                    >
                      <Star size={12} /> Puxar p/ P1 Hoje
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SEÇÃO 2: GRADUAÇÃO UERJ (FALTAS 25%, PROVAS, TRABALHOS E LEITURAS) */}
      {(seg === "visao_unificada" || seg === "uerj") && (
        <section className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GraduationCap size={17} style={{ color: t.primary }} />
              <div>
                <h3 className="text-sm font-bold" style={{ color: t.text }}>
                  Graduação UERJ · Disciplinas, Faltas (Limite 25%) & Avaliações
                </h3>
                <p className="text-xs" style={{ color: t.textSoft }}>
                  Cálculo automático de média necessária (meta 7,0) e controle de frequência
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMostrarNovaDisciplina((v) => !v)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border cursor-pointer"
                style={{
                  background: t.card,
                  color: t.text,
                  borderColor: t.border,
                }}
              >
                <Plus size={13} /> + Matéria Manual
              </button>
              {abrirCalibracao && (
                <button
                  onClick={abrirCalibracao}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
                  style={{ background: t.primary }}
                >
                  Upar / Montar Grade c/ Lala
                </button>
              )}
            </div>
          </div>

          {mostrarNovaDisciplina && (
            <div
              className="p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-4 gap-2"
              style={{ background: t.card, borderColor: t.border }}
            >
              <input
                value={novaDiscNome}
                onChange={(e) => setNovaDiscNome(e.target.value)}
                placeholder="Nome da Disciplina..."
                className="p-2.5 rounded-xl text-xs border outline-none"
                style={{
                  background: t.bg,
                  color: t.text,
                  borderColor: t.border,
                }}
              />
              <input
                value={novaDiscHorario}
                onChange={(e) => setNovaDiscHorario(e.target.value)}
                placeholder="Ex: SEG/QUA · 07:30 · Sala 302"
                className="p-2.5 rounded-xl text-xs border outline-none"
                style={{
                  background: t.bg,
                  color: t.text,
                  borderColor: t.border,
                }}
              />
              <input
                value={novaDiscProf}
                onChange={(e) => setNovaDiscProf(e.target.value)}
                placeholder="Professor(a)..."
                className="p-2.5 rounded-xl text-xs border outline-none"
                style={{
                  background: t.bg,
                  color: t.text,
                  borderColor: t.border,
                }}
              />
              <button
                onClick={() => {
                  if (!novaDiscNome.trim()) return;
                  setDisciplinas((prev) => [
                    ...prev,
                    {
                      id: Date.now(),
                      nome: novaDiscNome.trim(),
                      professor: novaDiscProf.trim() || "Docente UERJ",
                      horarioSala: novaDiscHorario.trim() || "SEG/QUA · 07:30",
                      prazo: "Semestre Atual",
                      status: "em dia",
                      aulasTotaisSemestre: 60,
                      faltasAtuais: 0,
                      faltasMax: 15,
                      presencas: 0,
                      mediaAprovacao: 7.0,
                      avaliacoes: [
                        {
                          id: Date.now() + 1,
                          tipo: "P1",
                          data: "A definir",
                          peso: 1,
                          notaObtida: null,
                        },
                        {
                          id: Date.now() + 2,
                          tipo: "P2",
                          data: "A definir",
                          peso: 1,
                          notaObtida: null,
                        },
                      ],
                      leiturasSemana: [],
                      linksUteis: [],
                      anotacoes: "",
                    },
                  ]);
                  setNovaDiscNome("");
                  setNovaDiscProf("");
                  setMostrarNovaDisciplina(false);
                }}
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-white cursor-pointer"
                style={{ background: t.action }}
              >
                Salvar Disciplina
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {disciplinas.map((d) => {
              const sit = calcularSituacaoNotaDisciplina(d);
              const corFaltas =
                sit.riscoFaltas === "critico"
                  ? t.danger
                  : sit.riscoFaltas === "atencao"
                  ? t.alert
                  : t.primary;

              return (
                <div
                  key={d.id}
                  className="rounded-3xl p-5 border flex flex-col justify-between space-y-3.5"
                  style={{ background: t.card, borderColor: t.border }}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() =>
                          openCard({ tipo: "disciplina", id: d.id })
                        }
                        className="text-left flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: corFaltas }}
                          />
                          <span
                            className="text-[10px] font-semibold uppercase truncate"
                            style={{ color: t.textSoft }}
                          >
                            {d.horarioSala}
                          </span>
                        </div>
                        <h4
                          className="text-sm font-bold mt-0.5"
                          style={{ color: t.text }}
                        >
                          {d.nome}
                        </h4>
                      </button>
                      <button
                        onClick={() =>
                          openCard({ tipo: "disciplina", id: d.id })
                        }
                        className="px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                        style={{ background: t.cardSubtle, color: t.text }}
                      >
                        Ficha <ChevronRight size={12} />
                      </button>
                    </div>

                    {/* Controle de Faltas 25% */}
                    <div
                      className="p-3 rounded-2xl space-y-2"
                      style={{ background: t.bg }}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className="font-medium"
                          style={{ color: t.textSoft }}
                        >
                          Faltas (Máx {d.faltasMax})
                        </span>
                        <span
                          className="font-mono-num font-bold"
                          style={{ color: corFaltas }}
                        >
                          {d.faltasAtuais}/{d.faltasMax} ({sit.pctFaltasLimite}%)
                        </span>
                      </div>
                      <div
                        className="w-full h-2 rounded-full overflow-hidden"
                        style={{ background: t.cardSubtle }}
                      >
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, sit.pctFaltasLimite)}%`,
                            background: corFaltas,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1 gap-2">
                        <span
                          className="text-[11px] font-medium leading-tight"
                          style={{ color: t.finance }}
                        >
                          {sit.mensagem}
                        </span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() =>
                              setDisciplinas((prev) =>
                                prev.map((item) =>
                                  item.id === d.id
                                    ? { ...item, presencas: item.presencas + 1 }
                                    : item
                                )
                              )
                            }
                            className="px-2 py-1 rounded-lg text-[10px] font-mono-num font-semibold text-white cursor-pointer"
                            style={{ background: t.primary }}
                          >
                            +Fui ({d.presencas})
                          </button>
                          <button
                            onClick={() =>
                              setDisciplinas((prev) =>
                                prev.map((item) =>
                                  item.id === d.id
                                    ? {
                                        ...item,
                                        faltasAtuais: Math.min(
                                          item.faltasMax,
                                          item.faltasAtuais + 1
                                        ),
                                      }
                                    : item
                                )
                              )
                            }
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold text-white cursor-pointer"
                            style={{ background: t.action }}
                          >
                            +Falta
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Leituras da Disciplina */}
                    <div className="space-y-1.5">
                      {d.leiturasSemana.map((lt) => (
                        <button
                          key={lt.id}
                          onClick={() =>
                            setDisciplinas((prev) =>
                              prev.map((item) =>
                                item.id === d.id
                                  ? {
                                      ...item,
                                      leiturasSemana: item.leiturasSemana.map(
                                        (l) =>
                                          l.id === lt.id
                                            ? { ...l, lido: !l.lido }
                                            : l
                                      ),
                                    }
                                  : item
                              )
                            )
                          }
                          className="w-full flex items-center justify-between p-2 rounded-xl text-left text-xs cursor-pointer"
                          style={{ background: t.bg }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <BookOpen size={12} style={{ color: t.primary }} />
                            <span
                              className={`truncate ${
                                lt.lido ? "line-through" : ""
                              }`}
                              style={{ color: lt.lido ? t.textSoft : t.text }}
                            >
                              {lt.titulo}
                            </span>
                          </div>
                          <span
                            className="text-[10px] font-mono-num shrink-0 ml-2"
                            style={{ color: t.textSoft }}
                          >
                            {lt.paginas}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {d.linksUteis.map((lk) => (
                      <a
                        key={lk.id}
                        href={lk.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1"
                        style={{ background: t.cardSubtle, color: t.finance }}
                      >
                        <ExternalLink size={11} /> {lk.rotulo}
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Linha do Tempo Consolidada de Provas e Entregas UERJ */}
          <div
            className="rounded-3xl p-5 border space-y-3"
            style={{ background: t.card, borderColor: t.border }}
          >
            <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textSoft }}>
              Cronograma de Avaliações & Entregáveis Acadêmicos (UERJ)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {todasAvaliacoesTimeline.map((av) => (
                <button
                  key={`${av.disciplinaId}-${av.id}`}
                  onClick={() =>
                    openCard({ tipo: "disciplina", id: av.disciplinaId })
                  }
                  className="p-3 rounded-2xl border flex items-center justify-between text-left cursor-pointer"
                  style={{ background: t.bg, borderColor: t.border }}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-xs font-bold truncate"
                      style={{ color: t.text }}
                    >
                      {av.tipo}
                    </p>
                    <p
                      className="text-[11px] font-mono-num truncate"
                      style={{ color: t.textSoft }}
                    >
                      {av.disciplinaNome} · {av.data} (Peso {av.peso})
                    </p>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-lg text-xs font-mono-num font-bold shrink-0 ml-2"
                    style={{
                      background:
                        av.notaObtida !== null && av.notaObtida !== undefined
                          ? t.primary
                          : t.cardSubtle,
                      color:
                        av.notaObtida !== null && av.notaObtida !== undefined
                          ? "#fff"
                          : t.textSoft,
                    }}
                  >
                    {av.notaObtida !== null && av.notaObtida !== undefined
                      ? `Nota ${av.notaObtida}`
                      : "Aberto"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SEÇÃO 3: PIPELINE DE ARTIGOS CIENTÍFICOS & LEITURAS */}
      {(seg === "visao_unificada" || seg === "artigos_leitura") && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Artigos Científicos (7 cols) */}
          <div className="xl:col-span-7 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold" style={{ color: t.text }}>
                Pipeline de Artigos & Fichamentos (Heptabase)
              </h3>
              <button
                onClick={() => setMostrarNovoArtigo((v) => !v)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                style={{ background: t.cardSubtle, color: t.action }}
              >
                <Plus size={13} /> Novo Artigo
              </button>
            </div>

            {mostrarNovoArtigo && (
              <div
                className="p-4 rounded-3xl border space-y-2.5"
                style={{ background: t.card, borderColor: t.border }}
              >
                <p className="text-xs font-bold" style={{ color: t.text }}>
                  Adicionar Artigo ao Pipeline Heptabase
                </p>
                <input
                  value={novoArtigoTitulo}
                  onChange={(e) => setNovoArtigoTitulo(e.target.value)}
                  placeholder="Título do artigo ou revisão..."
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none border"
                  style={{
                    background: t.bg,
                    color: t.text,
                    borderColor: t.border,
                  }}
                />
                <div className="flex gap-2">
                  <input
                    value={novoArtigoPeriodico}
                    onChange={(e) => setNovoArtigoPeriodico(e.target.value)}
                    placeholder="Periódico / Congresso alvo..."
                    className="flex-1 px-3 py-2 rounded-xl text-xs outline-none border"
                    style={{
                      background: t.bg,
                      color: t.text,
                      borderColor: t.border,
                    }}
                  />
                  <button
                    onClick={criarNovoArtigo}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                    style={{ background: t.action }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )}

            {artigos.map((art) => {
              const idxAtual = FASES_ARTIGO.indexOf(art.fase);
              return (
                <section
                  key={art.id}
                  className="rounded-3xl p-5 border space-y-3.5"
                  style={{ background: t.card, borderColor: t.border }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color: t.primary }}
                      >
                        {art.periódicoAlvo}
                      </span>
                      <h4
                        className="text-sm font-bold mt-0.5"
                        style={{ color: t.text }}
                      >
                        {art.nome}
                      </h4>
                      <p className="text-xs mt-0.5" style={{ color: t.textSoft }}>
                        {art.subtitulo}
                      </p>
                    </div>
                    <button
                      onClick={() => openCard({ tipo: "artigo", id: art.id })}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                      style={{ background: t.action, color: "#fff" }}
                    >
                      Abrir Fichas
                    </button>
                  </div>

                  {/* Status de Leitura no Segundo Cérebro (Para Ler / Lendo / Concluído) */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl border" style={{ background: t.bg, borderColor: t.border }}>
                    <span className="text-[11px] font-semibold" style={{ color: t.textSoft }}>
                      Status de Leitura:
                    </span>
                    <div className="flex items-center gap-1">
                      {(["Para Ler", "Lendo", "Concluído"] as const).map((stOp) => {
                        const statusAtual =
                          art.statusLeitura ||
                          (art.fase === "Triagem"
                            ? "Para Ler"
                            : art.fase === "Submissão"
                            ? "Concluído"
                            : "Lendo");
                        const ativo = statusAtual === stOp;
                        const corSt =
                          stOp === "Concluído"
                            ? t.primary
                            : stOp === "Lendo"
                            ? t.action
                            : t.finance;
                        return (
                          <button
                            key={stOp}
                            onClick={() =>
                              setArtigos((prev) =>
                                prev.map((a) =>
                                  a.id === art.id ? { ...a, statusLeitura: stOp } : a
                                )
                              )
                            }
                            className="px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
                            style={{
                              background: ativo ? corSt : t.cardSubtle,
                              color: ativo ? "#fff" : t.textSoft,
                            }}
                          >
                            {stOp}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Régua de 5 fases */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-semibold">
                      <span style={{ color: t.textSoft }}>Estágio atual:</span>
                      <span style={{ color: t.action }}>{art.fase}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {FASES_ARTIGO.map((f, i) => {
                        const ativa = i <= idxAtual;
                        return (
                          <button
                            key={f}
                            onClick={() =>
                              setArtigos((prev) =>
                                prev.map((a) =>
                                  a.id === art.id ? { ...a, fase: f } : a
                                )
                              )
                            }
                            className="space-y-1 text-left cursor-pointer"
                          >
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                background: ativa ? t.action : t.cardSubtle,
                              }}
                            />
                            <span
                              className="block text-[10px] truncate"
                              style={{
                                color: i === idxAtual ? t.text : t.textSoft,
                                fontWeight: i === idxAtual ? 700 : 400,
                              }}
                            >
                              {f.split("/")[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <p
                      className="text-xs font-semibold flex items-center gap-1"
                      style={{ color: t.textSoft }}
                    >
                      <Quote size={12} style={{ color: t.action }} /> Citações
                      Fichadas ({art.citacoes.length})
                    </p>
                    {art.citacoes.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => openCard({ tipo: "artigo", id: art.id })}
                        className="p-3 rounded-2xl border cursor-pointer"
                        style={{ background: t.bg, borderColor: t.border }}
                      >
                        <div className="flex justify-between text-xs font-bold">
                          <span style={{ color: t.text }}>{c.autorAno}</span>
                          <span style={{ color: t.action }}>{c.tag}</span>
                        </div>
                        <p
                          className="text-xs italic mt-1 line-clamp-2"
                          style={{ color: t.textSoft }}
                        >
                          "{c.trecho}"
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Leituras & Livros (5 cols) */}
          <div className="xl:col-span-5 space-y-3.5">
            <h3 className="text-sm font-bold" style={{ color: t.text }}>
              Leituras Ativas & Progresso de Páginas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3.5">
              {livros.map((lv) => {
                const pct = Math.round(
                  (lv.paginasLidas / lv.paginasTotal) * 100
                );
                return (
                  <button
                    key={lv.id}
                    onClick={() => openCard({ tipo: "leitura", id: lv.id })}
                    className="rounded-3xl p-5 border text-left space-y-2.5 cursor-pointer"
                    style={{ background: t.card, borderColor: t.border }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: t.primary }}
                      >
                        {lv.tipo} · {lv.autor}
                      </span>
                      <span
                        className="text-xs font-mono-num font-bold"
                        style={{ color: t.primary }}
                      >
                        {pct}%
                      </span>
                    </div>
                    <p className="text-sm font-bold" style={{ color: t.text }}>
                      {lv.titulo}
                    </p>
                    <div
                      className="w-full h-2 rounded-full overflow-hidden"
                      style={{ background: t.cardSubtle }}
                    >
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${pct}%`, background: t.primary }}
                      />
                    </div>
                    <p
                      className="text-xs font-mono-num"
                      style={{ color: t.textSoft }}
                    >
                      {lv.paginasLidas} de {lv.paginasTotal} páginas lidas · Toque para somar páginas
                    </p>
                  </button>
                );
              })}
            </div>

            <section
              className="rounded-3xl p-5 border flex items-center justify-between"
              style={{ background: t.card, borderColor: t.border }}
            >
              <div className="flex items-center gap-3">
                <Flame size={22} style={{ color: t.action }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: t.text }}>
                    Sequência de {streakLeitura} dias de leitura
                  </p>
                  <p className="text-xs" style={{ color: t.textSoft }}>
                    Hábito sincronizado com o Painel de Hoje
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. MÓDULO DEDICADO: SAÚDE & CORPO (TREINOS, DIETA, PRONTIDÃO & BEM-ESTAR PESSOAL)
// ============================================================================
interface SaudePetsScreenProps {
  t: ThemeTokens;
  fichasTreino: FichaTreino[];
  iniciarTreinoAoVivo: (ficha: FichaTreino) => void;
  refeicoes: ItemRefeicao[];
  setRefeicoes: React.Dispatch<React.SetStateAction<ItemRefeicao[]>>;
  ultimoSRPE: number;
  registrarSRPEHoje: (srpe: number) => void;
  volumeSemana: number[];
  streakTreino: number;
  checkin: CheckinProntidao;
  setCheckin: React.Dispatch<React.SetStateAction<CheckinProntidao>>;
  openCard: (payload: BottomSheetPayload) => void;
  abrirCalibracao?: () => void;
  gerarListaComprasDaDieta?: () => void;
}

export function SaudePetsScreen({
  t,
  fichasTreino,
  iniciarTreinoAoVivo,
  refeicoes,
  setRefeicoes,
  ultimoSRPE,
  registrarSRPEHoje,
  volumeSemana,
  streakTreino,
  checkin,
  setCheckin,
  openCard,
  abrirCalibracao,
  gerarListaComprasDaDieta,
}: SaudePetsScreenProps) {
  const [filtroModalidade, setFiltroModalidade] = useState<
    "Todas" | ModalidadeTreino
  >("Todas");

  // Mapa Articular Stitch (Cheerleading, Stunt & Ginástica)
  const [statusArticulacoes, setStatusArticulacoes] = useState<
    Record<string, "100% Novo" | "Leve Tensão" | "Mobilidade 5m">
  >({
    "Ombros (Stunt/Base)": "Leve Tensão",
    "Punhos (Handstand/Tumbling)": "100% Novo",
    "Lombar & Core": "100% Novo",
    "Tornozelos & Posteriores": "Mobilidade 5m",
  });

  // Suplementação Diária & Nova Refeição Rápida
  const [creatinaTomada, setCreatinaTomada] = useState<boolean>(true);
  const [eletrolitoTomado, setEletrolitoTomado] = useState<boolean>(false);
  const [novaRefNome, setNovaRefNome] = useState<string>("");
  const [novaRefProt, setNovaRefProt] = useState<string>("25");

  const ciclarArticulacao = (chave: string) => {
    const ordem: ("100% Novo" | "Leve Tensão" | "Mobilidade 5m")[] = [
      "100% Novo",
      "Leve Tensão",
      "Mobilidade 5m",
    ];
    setStatusArticulacoes((prev) => {
      const atual = prev[chave] || "100% Novo";
      const prox = ordem[(ordem.indexOf(atual) + 1) % ordem.length];
      return { ...prev, [chave]: prox };
    });
  };

  const fichasFiltradas =
    filtroModalidade === "Todas"
      ? fichasTreino
      : fichasTreino.filter((f) => f.modalidade === filtroModalidade);

  const totalProteinaDia = refeicoes
    .filter((r) => r.feito)
    .reduce((acc, r) => acc + r.proteinaG, 0);
  const totalKcalDia = refeicoes
    .filter((r) => r.feito)
    .reduce((acc, r) => acc + r.kcal, 0);

  const metaProteinaDia = 135;
  const metaKcalDia = 2150;
  const pctProt = Math.min(
    100,
    Math.round((totalProteinaDia / metaProteinaDia) * 100)
  );
  const pctKcal = Math.min(100, Math.round((totalKcalDia / metaKcalDia) * 100));

  const prontidaoInfo = calcularProntidaoDetalhada(
    checkin,
    volumeSemana,
    ultimoSRPE
  );

  return (
    <div className="space-y-5">
      {/* 1. PAINEL EM DESTAQUE: PRONTIDÃO PESSOAL & BEM-ESTAR (SONO, ENERGIA FÍSICA & FOCO MENTAL) */}
      <section
        className="rounded-3xl p-5 border space-y-4"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Activity size={18} style={{ color: t.primary }} />
            <div>
              <h3 className="text-sm sm:text-base font-bold" style={{ color: t.text }}>
                Prontidão Pessoal & Bem-Estar · Score {prontidaoInfo.scoreTotal}%
              </h3>
              <p className="text-xs" style={{ color: t.textSoft }}>
                {prontidaoInfo.statusTexto}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openCard({ tipo: "checkin_prontidao" })}
              className="text-xs font-bold px-3.5 py-2 rounded-xl text-white cursor-pointer"
              style={{ background: t.primary }}
            >
              Calibrar Check-in Completo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Sono & Recuperação */}
          <div
            className="p-4 rounded-2xl border flex flex-col justify-between space-y-3"
            style={{ background: t.bg, borderColor: t.border }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: t.text }}>
                <Moon size={14} style={{ color: t.primary }} /> Sono & Descanso
              </span>
              <span className="text-xs font-mono-num font-bold" style={{ color: t.primary }}>
                {checkin.horasSono}h ({checkin.qualidadeSono}/5)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {[6, 6.5, 7, 7.5, 8, 8.5].map((h) => (
                <button
                  key={h}
                  onClick={() =>
                    setCheckin((prev) => ({
                      ...prev,
                      horasSono: h,
                      realizadoHoje: true,
                    }))
                  }
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-mono-num font-semibold cursor-pointer"
                  style={{
                    background: checkin.horasSono === h ? t.primary : t.cardSubtle,
                    color: checkin.horasSono === h ? "#fff" : t.textSoft,
                  }}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          {/* Card 2: Energia Física */}
          <div
            className="p-4 rounded-2xl border flex flex-col justify-between space-y-3"
            style={{ background: t.bg, borderColor: t.border }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: t.text }}>
                <Flame size={14} style={{ color: t.action }} /> Energia Corporal
              </span>
              <span className="text-xs font-mono-num font-bold" style={{ color: t.action }}>
                Nível {checkin.energiaFisica}/5 ({prontidaoInfo.scoreCorpo} pts)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {([1, 2, 3, 4, 5] as const).map((nv) => (
                <button
                  key={nv}
                  onClick={() =>
                    setCheckin((prev) => ({
                      ...prev,
                      energiaFisica: nv,
                      realizadoHoje: true,
                    }))
                  }
                  className="flex-1 py-1.5 rounded-lg text-xs font-mono-num font-bold cursor-pointer"
                  style={{
                    background: checkin.energiaFisica === nv ? t.action : t.cardSubtle,
                    color: checkin.energiaFisica === nv ? "#fff" : t.textSoft,
                  }}
                >
                  {nv}
                </button>
              ))}
            </div>
          </div>

          {/* Card 3: Foco Mental */}
          <div
            className="p-4 rounded-2xl border flex flex-col justify-between space-y-3"
            style={{ background: t.bg, borderColor: t.border }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: t.text }}>
                <Brain size={14} style={{ color: t.finance }} /> Clareza & Bem-estar
              </span>
              <span className="text-xs font-mono-num font-bold" style={{ color: t.finance }}>
                Nível {checkin.focoMental}/5 ({prontidaoInfo.scoreMente} pts)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {([1, 2, 3, 4, 5] as const).map((nv) => (
                <button
                  key={nv}
                  onClick={() =>
                    setCheckin((prev) => ({
                      ...prev,
                      focoMental: nv,
                      realizadoHoje: true,
                    }))
                  }
                  className="flex-1 py-1.5 rounded-lg text-xs font-mono-num font-bold cursor-pointer"
                  style={{
                    background: checkin.focoMental === nv ? t.finance : t.cardSubtle,
                    color: checkin.focoMental === nv ? "#fff" : t.textSoft,
                  }}
                >
                  {nv}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* NOVO PAINEL STITCH: MAPA ARTICULAR & PREVENÇÃO DE LESÃO (CHEER & GINÁSTICA) */}
        <div
          className="pt-3 border-t space-y-2.5"
          style={{ borderColor: t.border }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold" style={{ color: t.text }}>
              Radar Articular & Mobilidade Preventiva (Toque para calibrar tensão)
            </span>
            <span className="text-[11px]" style={{ color: t.textSoft }}>
              Cheerleading · Tumbling · Força
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {Object.entries(statusArticulacoes).map(([artic, st]) => {
              const corSt =
                st === "100% Novo"
                  ? t.primary
                  : st === "Leve Tensão"
                  ? t.alert
                  : t.action;
              return (
                <button
                  key={artic}
                  onClick={() => ciclarArticulacao(artic)}
                  className="p-3 rounded-2xl border text-left transition-transform active:scale-95 cursor-pointer"
                  style={{ background: t.bg, borderColor: t.border }}
                >
                  <p className="text-xs font-bold truncate" style={{ color: t.text }}>
                    {artic}
                  </p>
                  <span
                    className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mt-1"
                    style={{ background: `${corSt}18`, color: corSt }}
                  >
                    {st}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. GRID RESPONSIVO: FICHAS DE TREINO AO VIVO (ESQUERDA) + DIETA & CARGA sRPE (DIREITA) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Coluna Esquerda (7 cols): Fichas de Treino Live */}
        <div className="xl:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold" style={{ color: t.text }}>
                Treino Live · Cheerleading, Ginástica & Musculação
              </h3>
              <p className="text-xs" style={{ color: t.textSoft }}>
                Abra o player ao vivo com cronômetro de descanso, séries e Hit Rate
              </p>
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {(
                ["Todas", "Cheerleading", "Ginástica", "Musculação"] as const
              ).map((mod) => (
                <button
                  key={mod}
                  onClick={() => setFiltroModalidade(mod)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors border cursor-pointer"
                  style={{
                    background: filtroModalidade === mod ? t.action : t.card,
                    color: filtroModalidade === mod ? "#fff" : t.textSoft,
                    borderColor:
                      filtroModalidade === mod ? t.action : t.border,
                  }}
                >
                  {mod}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3.5">
            {fichasFiltradas.map((ficha) => {
              const seriesTotais = ficha.exercicios.reduce(
                (acc, ex) => acc + ex.series.length,
                0
              );
              const seriesFeitas = ficha.exercicios.reduce(
                (acc, ex) => acc + ex.series.filter((s) => s.concluida).length,
                0
              );

              return (
                <section
                  key={ficha.id}
                  className="rounded-3xl p-5 border space-y-3.5"
                  style={{ background: t.card, borderColor: t.border }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: t.action }}
                      >
                        {ficha.modalidade} · Última sessão:{" "}
                        {ficha.ultimaRealizacao || "—"}
                      </span>
                      <h4
                        className="text-sm sm:text-base font-bold mt-0.5"
                        style={{ color: t.text }}
                      >
                        {ficha.nome}
                      </h4>
                      <p className="text-xs mt-0.5" style={{ color: t.textSoft }}>
                        {ficha.foco}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {ficha.exercicios.map((ex) => (
                      <div
                        key={ex.id}
                        className="p-2.5 rounded-xl flex items-center justify-between text-xs"
                        style={{ background: t.bg }}
                      >
                        <span
                          className="font-medium truncate"
                          style={{ color: t.text }}
                        >
                          {ex.nome}
                        </span>
                        <span
                          className="text-[11px] font-mono-num shrink-0 ml-2"
                          style={{ color: t.textSoft }}
                        >
                          {ex.series.length} séries ·{" "}
                          {ex.series[0]?.cargaOuDetalhe} (
                          {ex.series[0]?.repsOuTempo})
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span
                      className="text-xs font-mono-num"
                      style={{ color: t.textSoft }}
                    >
                      {seriesFeitas}/{seriesTotais} séries marcadas
                    </span>
                    <button
                      onClick={() => iniciarTreinoAoVivo(ficha)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
                      style={{ background: t.action }}
                    >
                      <Play size={13} fill="#fff" /> Iniciar Treino Live
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        {/* Coluna Direita (5 cols): Dieta do Dia + Carga Semanal sRPE */}
        <div className="xl:col-span-5 space-y-5">
          {/* Dieta do Dia */}
          <section
            className="rounded-3xl p-5 border space-y-3.5"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Utensils size={16} style={{ color: t.primary }} />
                <h3 className="text-sm font-bold" style={{ color: t.text }}>
                  Nutrição & Refeições do Dia
                </h3>
              </div>
              <span
                className="text-xs font-mono-num font-bold"
                style={{ color: t.primary }}
              >
                {totalProteinaDia}g Prot · {totalKcalDia} kcal
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {abrirCalibracao && (
                <button
                  onClick={abrirCalibracao}
                  className="py-2 px-3 rounded-xl text-[11px] font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{ background: t.action }}
                >
                  <Utensils size={12} /> Upar Dieta c/ Lala
                </button>
              )}
              {gerarListaComprasDaDieta && (
                <button
                  onClick={gerarListaComprasDaDieta}
                  className="py-2 px-3 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 border cursor-pointer"
                  style={{
                    background: t.bg,
                    color: t.primary,
                    borderColor: t.border,
                  }}
                >
                  <ShoppingBag size={12} /> Dieta → Lista de Compras
                </button>
              )}
            </div>

            {/* NOVAS BARRAS STITCH: META DE PROTEÍNA (135g), KCAL (2150) & SUPLEMENTAÇÃO */}
            <div
              className="p-3.5 rounded-2xl border space-y-2.5"
              style={{ background: t.bg, borderColor: t.border }}
            >
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono-num">
                  <span className="font-bold" style={{ color: t.text }}>
                    Meta Proteína Atleta
                  </span>
                  <span style={{ color: t.primary }}>
                    {totalProteinaDia}g / {metaProteinaDia}g ({pctProt}%)
                  </span>
                </div>
                <div
                  className="w-full h-1.5 rounded-full overflow-hidden"
                  style={{ background: t.cardSubtle }}
                >
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${pctProt}%`, background: t.primary }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono-num">
                  <span className="font-bold" style={{ color: t.text }}>
                    Energia Diária (Kcal)
                  </span>
                  <span style={{ color: t.action }}>
                    {totalKcalDia} / {metaKcalDia} kcal ({pctKcal}%)
                  </span>
                </div>
                <div
                  className="w-full h-1.5 rounded-full overflow-hidden"
                  style={{ background: t.cardSubtle }}
                >
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${pctKcal}%`, background: t.action }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setCreatinaTomada((v) => !v)}
                  className="py-1.5 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  style={{
                    background: creatinaTomada ? t.primary : t.cardSubtle,
                    color: creatinaTomada ? "#fff" : t.textSoft,
                  }}
                >
                  <Check size={11} /> Creatina 5g {creatinaTomada ? "✓" : ""}
                </button>
                <button
                  onClick={() => setEletrolitoTomado((v) => !v)}
                  className="py-1.5 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  style={{
                    background: eletrolitoTomado ? t.finance : t.cardSubtle,
                    color: eletrolitoTomado ? "#fff" : t.textSoft,
                  }}
                >
                  <Check size={11} /> Intra-Treino {eletrolitoTomado ? "✓" : ""}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {refeicoes.map((ref) => (
                <button
                  key={ref.id}
                  onClick={() =>
                    setRefeicoes((prev) =>
                      prev.map((r) =>
                        r.id === ref.id ? { ...r, feito: !r.feito } : r
                      )
                    )
                  }
                  className="w-full p-3 rounded-2xl border flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer"
                  style={{ background: t.bg, borderColor: t.border }}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: ref.feito ? t.primary : "transparent",
                        border: `2px solid ${
                          ref.feito ? t.primary : t.textSoft
                        }`,
                      }}
                    >
                      {ref.feito && <Check size={12} color="#fff" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[11px] font-mono-num font-bold"
                          style={{ color: t.action }}
                        >
                          {ref.horario}
                        </span>
                        <span
                          className={`text-xs font-bold truncate ${
                            ref.feito ? "line-through" : ""
                          }`}
                          style={{ color: ref.feito ? t.textSoft : t.text }}
                        >
                          {ref.nome}
                        </span>
                      </div>
                      <p
                        className="text-[11px] truncate"
                        style={{ color: t.textSoft }}
                      >
                        {ref.descricao}
                      </p>
                    </div>
                  </div>

                  {ref.proteinaG > 0 && (
                    <span
                      className="text-[11px] font-mono-num font-semibold shrink-0"
                      style={{ color: t.text }}
                    >
                      {ref.proteinaG}g P
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Adicionar lanche/refeição rápida */}
            <div className="flex gap-1.5 pt-1">
              <input
                value={novaRefNome}
                onChange={(e) => setNovaRefNome(e.target.value)}
                placeholder="+ Lanche / Shake extra..."
                className="flex-1 px-3 py-2 rounded-xl text-xs outline-none border"
                style={{
                  background: t.bg,
                  color: t.text,
                  borderColor: t.border,
                }}
              />
              <input
                type="number"
                value={novaRefProt}
                onChange={(e) => setNovaRefProt(e.target.value)}
                placeholder="g P"
                className="w-16 px-2 py-2 rounded-xl text-xs font-mono-num outline-none border text-center"
                style={{
                  background: t.bg,
                  color: t.text,
                  borderColor: t.border,
                }}
              />
              <button
                onClick={() => {
                  if (!novaRefNome.trim()) return;
                  const prot = Math.max(0, Number(novaRefProt) || 20);
                  setRefeicoes((prev) => [
                    ...prev,
                    {
                      id: Date.now(),
                      horario: "Extra",
                      nome: novaRefNome.trim(),
                      descricao: `Adicionado manualmente (${prot}g Proteína)`,
                      proteinaG: prot,
                      kcal: prot * 9,
                      feito: true,
                    },
                  ]);
                  setNovaRefNome("");
                }}
                className="px-3 rounded-xl text-xs font-bold text-white cursor-pointer"
                style={{ background: t.primary }}
              >
                <Plus size={14} />
              </button>
            </div>
          </section>

          {/* Carga Semanal sRPE */}
          <section
            className="rounded-3xl p-5 border space-y-3.5"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: t.text }}>
                Carga Interna (sRPE) · {streakTreino}d na sequência
              </h3>
              <span
                className="text-xs font-mono-num font-bold"
                style={{ color: t.action }}
              >
                Hoje: {ultimoSRPE}/10
              </span>
            </div>

            <div className="flex items-end gap-2 h-24 pt-2">
              {volumeSemana.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                >
                  <div
                    className="w-full rounded-t-lg transition-all"
                    style={{
                      height: `${Math.max(10, v * 10)}%`,
                      background: v >= 7 ? t.alert : t.primary,
                    }}
                  />
                  <span
                    className="text-[10px] font-mono-num"
                    style={{ color: t.textSoft }}
                  >
                    {"SEG TER QUA QUI SEX SAB DOM".split(" ")[i]}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-1 space-y-1">
              <div className="flex justify-between text-xs">
                <span style={{ color: t.textSoft }}>
                  Calibrar percepção de esforço (sRPE) de hoje:
                </span>
                <b className="font-mono-num">{ultimoSRPE}/10</b>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={ultimoSRPE}
                onChange={(e) => registrarSRPEHoje(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
