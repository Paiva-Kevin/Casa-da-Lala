import React, { useState } from "react";
import {
  Wallet,
  Calendar,
  CheckSquare,
  PawPrint,
  GraduationCap,
  Utensils,
  ShoppingBag,
  Dumbbell,
  Briefcase,
  FolderOpen,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
  Trash2,
  Activity,
  Target,
  UserCheck,
  Pencil,
  RotateCcw,
  Check,
  X,
  Clock,
  Zap,
  Plus,
} from "lucide-react";
import {
  AcaoGovernanta,
  OrcamentoCategoria,
  TabId,
  ThemeTokens,
} from "../types/lala";
import { getIdentidadeBanco } from "../utils/bankIdentities";

export interface ModuloMeta {
  abaDestino: TabId;
  nomeModulo: string;
  subtituloModulo: string;
  corDestaque: string;
  Icone: React.ElementType;
}

export function obterMetaModuloAcao(
  tipo: AcaoGovernanta["tipo"],
  t: ThemeTokens
): ModuloMeta {
  switch (tipo) {
    case "ATUALIZAR_CONTAS_FINANCAS":
      return {
        abaDestino: "financas",
        nomeModulo: "Finanças · Contas & Cartões",
        subtituloModulo: "Saldos bancários e faturas sincronizados",
        corDestaque: "#0284C7",
        Icone: Wallet,
      };
    case "REGISTRAR_GASTO":
    case "REGISTRAR_RECEITA":
      return {
        abaDestino: "financas",
        nomeModulo: "Finanças · Fluxo de Caixa",
        subtituloModulo:
          tipo === "REGISTRAR_RECEITA"
            ? "Entrada registrada no extrato"
            : "Saída registrada no extrato",
        corDestaque: tipo === "REGISTRAR_RECEITA" ? t.primary : t.action,
        Icone: Wallet,
      };
    case "AGENDAR_COMPROMISSO":
    case "ALIVIAR_AGENDA_HOJE":
      return {
        abaDestino: "calendario",
        nomeModulo: "Agenda & Calendário",
        subtituloModulo: "Blocos de horário e compromissos",
        corDestaque: t.action,
        Icone: Calendar,
      };
    case "CRIAR_TAREFA":
    case "ATUALIZAR_HABITOS":
      return {
        abaDestino: "inicio",
        nomeModulo: "Início · Tarefas & Hábitos",
        subtituloModulo: "Planejador diário e prioridades",
        corDestaque: t.primary,
        Icone: CheckSquare,
      };
    case "ATUALIZAR_METAS_RADAR":
      return {
        abaDestino: "inicio",
        nomeModulo: "Início · Metas & Radar",
        subtituloModulo: "Objetivos e radar de preparação",
        corDestaque: "#7C3AED",
        Icone: Target,
      };
    case "ALIMENTAR_PETS":
    case "ATUALIZAR_PETS":
      return {
        abaDestino: "casa_rotinas",
        nomeModulo: "Casa & Pets · Nina & Tobias",
        subtituloModulo: "Estoque Urinary, refeições e saúde felina",
        corDestaque: "#4F46E5",
        Icone: PawPrint,
      };
    case "CRIAR_LISTA_COMPRAS":
      return {
        abaDestino: "casa_rotinas",
        nomeModulo: "Casa & Compras · Mercado",
        subtituloModulo: "Lista de compras e reposição da casa",
        corDestaque: t.primary,
        Icone: ShoppingBag,
      };
    case "ATUALIZAR_DIETA_E_COMPRAS":
      return {
        abaDestino: "saude_pets",
        nomeModulo: "Saúde & Nutrição · Cardápio",
        subtituloModulo: "Refeições do dia, metas de proteína e mercado",
        corDestaque: "#059669",
        Icone: Utensils,
      };
    case "ATUALIZAR_TREINO":
    case "REGISTRAR_SRPE":
      return {
        abaDestino: "saude_pets",
        nomeModulo: "Saúde & Corpo · Treino Live",
        subtituloModulo: "Fichas de treino, séries e carga sRPE",
        corDestaque: t.action,
        Icone: Dumbbell,
      };
    case "ATUALIZAR_CHECKIN_SAUDE":
      return {
        abaDestino: "saude_pets",
        nomeModulo: "Saúde & Corpo · Prontidão",
        subtituloModulo: "Sono, energia física e foco mental",
        corDestaque: t.primary,
        Icone: Activity,
      };
    case "ATUALIZAR_GRADE_UERJ":
      return {
        abaDestino: "estudos_trabalho",
        nomeModulo: "Estudos · Graduação UERJ",
        subtituloModulo: "Disciplinas, horários, faltas e provas",
        corDestaque: "#2E6F5E",
        Icone: GraduationCap,
      };
    case "ATUALIZAR_PROJETOS_TRABALHO":
      return {
        abaDestino: "estudos_trabalho",
        nomeModulo: "Trabalho · Projetos & Entregáveis",
        subtituloModulo: "Frentes de trabalho e etapas de entrega",
        corDestaque: "#D97706",
        Icone: Briefcase,
      };
    case "GUARDAR_SEGUNDO_CEREBRO":
      return {
        abaDestino: "estudos_trabalho",
        nomeModulo: "Segundo Cérebro · Cofre",
        subtituloModulo: "Arquivo ou nota guardada na memória",
        corDestaque: "#7C3AED",
        Icone: FolderOpen,
      };
    case "ATUALIZAR_PERFIL":
    case "ATUALIZAR_PERFIL_CHECKIN":
      return {
        abaDestino: "inicio",
        nomeModulo: "Perfil & Preferências",
        subtituloModulo: "Dados pessoais e metas atualizados",
        corDestaque: t.primary,
        Icone: UserCheck,
      };
    case "LIMPAR_DADOS_EXEMPLO":
      return {
        abaDestino: "inicio",
        nomeModulo: "Sistema · Base de Dados",
        subtituloModulo: "Exemplos removidos do aplicativo",
        corDestaque: t.danger,
        Icone: Trash2,
      };
    default:
      return {
        abaDestino: "inicio",
        nomeModulo: "Ação no Aplicativo",
        subtituloModulo: "Proposta da Lala",
        corDestaque: t.primary,
        Icone: Sparkles,
      };
  }
}

export function getNomeAmigavelTipoAcao(tipo: AcaoGovernanta["tipo"]): string {
  switch (tipo) {
    case "ATUALIZAR_CONTAS_FINANCAS":
      return "Saldos Bancários & Cartões";
    case "REGISTRAR_GASTO":
      return "Lançamento de Gasto";
    case "REGISTRAR_RECEITA":
      return "Lançamento de Receita";
    case "AGENDAR_COMPROMISSO":
      return "Compromisso na Agenda";
    case "ALIVIAR_AGENDA_HOJE":
      return "Alívio de Agenda Hoje";
    case "CRIAR_TAREFA":
      return "Criação de Tarefa";
    case "ATUALIZAR_HABITOS":
      return "Hábitos Diários";
    case "ATUALIZAR_METAS_RADAR":
      return "Metas & Radar";
    case "ALIMENTAR_PETS":
      return "Alimentação dos Pets";
    case "ATUALIZAR_PETS":
      return "Estoque & Saúde dos Pets";
    case "CRIAR_LISTA_COMPRAS":
      return "Lista de Compras";
    case "ATUALIZAR_DIETA_E_COMPRAS":
      return "Cardápio da Dieta & Compras";
    case "ATUALIZAR_TREINO":
      return "Ficha de Treino";
    case "REGISTRAR_SRPE":
      return "Carga de Treino (sRPE)";
    case "ATUALIZAR_GRADE_UERJ":
      return "Grade UERJ";
    case "ATUALIZAR_PROJETOS_TRABALHO":
      return "Projetos de Trabalho";
    case "ATUALIZAR_PERFIL_CHECKIN":
    case "ATUALIZAR_CHECKIN_SAUDE":
    case "ATUALIZAR_PERFIL":
      return "Perfil & Check-in";
    case "GUARDAR_SEGUNDO_CEREBRO":
      return "Segundo Cérebro";
    case "LIMPAR_DADOS_EXEMPLO":
      return "Limpeza de Dados";
    default:
      return "Ação da Lala";
  }
}

const CATEGORIAS_GASTO: OrcamentoCategoria["categoria"][] = [
  "Mercado",
  "Pets",
  "Transporte",
  "Estudos & UERJ",
  "Lazer & Outros",
  "Moradia & Fixos",
  "Dívida",
];

interface LalaAppActionCardProps {
  t: ThemeTokens;
  acao: AcaoGovernanta;
  dataHora?: string;
  notaAprendizado?: string;
  onExecutar?: (acaoAtualizada?: AcaoGovernanta, notaAprendizado?: string) => void;
  onEditarAcao?: (acaoAtualizada: AcaoGovernanta, notaAprendizado?: string) => void;
  onEditarEExecutar?: (
    acaoAtualizada: AcaoGovernanta,
    notaAprendizado?: string
  ) => void;
  onDesfazer?: () => void;
  onRecusar?: () => void;
  onIrParaModulo?: (aba: TabId) => void;
  confirmacoesDoTipo?: number;
  confirmacoesDesteTipo?: number;
  tipoAutomatizado?: boolean;
  onAlternarAutomacaoTipo?: (
    tipo: AcaoGovernanta["tipo"],
    automatizar: boolean
  ) => void;
  onToggleAutomacaoTipo?: (
    tipo: AcaoGovernanta["tipo"],
    automatizar: boolean
  ) => void;
  compact?: boolean;
}

export function LalaAppActionCard({
  t,
  acao,
  dataHora,
  notaAprendizado,
  onExecutar,
  onEditarAcao,
  onEditarEExecutar,
  onDesfazer,
  onRecusar,
  onIrParaModulo,
  confirmacoesDoTipo,
  confirmacoesDesteTipo,
  tipoAutomatizado = false,
  onAlternarAutomacaoTipo,
  onToggleAutomacaoTipo,
  compact = false,
}: LalaAppActionCardProps) {
  const meta = obterMetaModuloAcao(acao.tipo, t);
  const IconeModulo = meta.Icone;
  const callbackEditar = onEditarEExecutar || onEditarAcao;
  const callbackAutomacao = onToggleAutomacaoTipo || onAlternarAutomacaoTipo;
  const totalConfirmacoes =
    confirmacoesDesteTipo ?? confirmacoesDoTipo ?? 0;

  const [editando, setEditando] = useState(false);
  const [draftAcao, setDraftAcao] = useState<AcaoGovernanta>(() =>
    JSON.parse(JSON.stringify(acao))
  );
  const [regraAprendizadoInput, setRegraAprendizadoInput] = useState("");

  const abrirEdicao = () => {
    const copia: AcaoGovernanta = JSON.parse(JSON.stringify(acao));
    if (
      copia.tipo === "ATUALIZAR_CONTAS_FINANCAS" &&
      (!copia.payload?.contasAjuste || copia.payload.contasAjuste.length === 0) &&
      (!copia.payload?.cartoesAjuste || copia.payload.cartoesAjuste.length === 0)
    ) {
      copia.payload = {
        ...copia.payload,
        contasAjuste: [
          {
            nome: "Nubank (Conta / Pix)",
            saldoAtual: Number(copia.payload?.valor ?? 0),
          },
        ],
      };
    }
    setDraftAcao(copia);
    setRegraAprendizadoInput("");
    setEditando(true);
  };

  const salvarEdicao = () => {
    const resumoContas =
      draftAcao.tipo === "ATUALIZAR_CONTAS_FINANCAS" &&
      draftAcao.payload?.contasAjuste &&
      draftAcao.payload.contasAjuste.length > 0
        ? draftAcao.payload.contasAjuste
            .map(
              (c) =>
                `${c.nome}: R$ ${Number(c.saldoAtual || 0)
                  .toFixed(2)
                  .replace(".", ",")}`
            )
            .join(" · ")
        : "";

    const tituloAtualizado =
      resumoContas && draftAcao.titulo === acao.titulo
        ? `Atualizar saldo: ${resumoContas}`
        : draftAcao.titulo;

    const acaoFinal: AcaoGovernanta = {
      ...draftAcao,
      titulo: tituloAtualizado,
      editadaPeloUsuario: true,
      desfeita: false,
      recusada: false,
    };

    const notaGerada =
      regraAprendizadoInput.trim() ||
      `Usuária ajustou "${acao.titulo}" para "${acaoFinal.titulo}"${
        resumoContas ? ` (${resumoContas})` : ""
      }${
        acaoFinal.payload?.categoriaGasto
          ? ` (Categoria: ${acaoFinal.payload.categoriaGasto})`
          : ""
      }${
        typeof acaoFinal.payload?.valor === "number"
          ? ` (Valor: R$ ${acaoFinal.payload.valor.toFixed(2)})`
          : ""
      }`;

    setEditando(false);
    if (callbackEditar) {
      callbackEditar(acaoFinal, notaGerada);
    } else if (onExecutar) {
      onExecutar(acaoFinal, notaGerada);
    }
  };

  const p = editando ? draftAcao.payload : acao.payload;
  const aguardandoConfirmacao =
    !acao.executada && !acao.desfeita && !acao.recusada;

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all shadow-xs"
      style={{
        backgroundColor: t.bg,
        borderColor: acao.desfeita
          ? `${t.danger}55`
          : acao.executada
          ? `${meta.corDestaque}55`
          : `${t.finance}65`,
        borderLeftWidth: "4px",
        borderLeftColor: acao.desfeita
          ? t.danger
          : acao.executada
          ? meta.corDestaque
          : t.finance,
        opacity: acao.recusada ? 0.6 : 1,
      }}
    >
      {/* CABEÇALHO DO COMPONENTE DO APP */}
      <div
        className="px-3.5 py-2 border-b flex items-center justify-between gap-2 flex-wrap"
        style={{
          backgroundColor: acao.desfeita
            ? `${t.danger}10`
            : acao.executada
            ? `${meta.corDestaque}10`
            : `${t.finance}14`,
          borderColor: `${meta.corDestaque}22`,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-white shadow-2xs"
            style={{
              backgroundColor: acao.desfeita
                ? t.danger
                : acao.executada
                ? meta.corDestaque
                : t.finance,
            }}
          >
            <IconeModulo size={13} />
          </div>
          <div className="min-w-0">
            <span
              className="text-[10px] font-extrabold uppercase tracking-wider block leading-none"
              style={{
                color: acao.desfeita
                  ? t.danger
                  : acao.executada
                  ? meta.corDestaque
                  : t.finance,
              }}
            >
              {meta.nomeModulo}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {acao.desfeita ? (
            <span
              className="text-[10px] font-bold flex items-center gap-1"
              style={{ color: t.danger }}
            >
              <RotateCcw size={11} />
              Desfeita
            </span>
          ) : acao.recusada ? (
            <span
              className="text-[10px] font-bold flex items-center gap-1"
              style={{ color: t.textSoft }}
            >
              <X size={11} />
              Ignorada
            </span>
          ) : acao.executada ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold"
              style={{ color: t.primary }}
            >
              <CheckCircle2 size={11} />
              {acao.editadaPeloUsuario
                ? "Editada & Aplicada"
                : "Confirmada no App"}
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold"
              style={{ color: t.finance }}
            >
              <Clock size={11} />
              Aguardando Confirmação
            </span>
          )}

          {onIrParaModulo && (
            <button
              type="button"
              onClick={() => onIrParaModulo(meta.abaDestino)}
              className="px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: t.card,
                color: t.text,
                borderColor: t.border,
              }}
              title={`Abrir ${meta.nomeModulo}`}
            >
              <span>Ver no App</span>
              <ArrowUpRight size={11} style={{ color: meta.corDestaque }} />
            </button>
          )}
        </div>
      </div>

      {/* CORPO VISUAL DA ALTERAÇÃO NO APP */}
      <div className={compact ? "p-3 space-y-2.5" : "p-3.5 space-y-3"}>
        {!editando ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p
                  className={`text-xs font-bold leading-snug ${
                    acao.desfeita ? "line-through opacity-75" : ""
                  }`}
                  style={{ color: t.text }}
                >
                  {acao.titulo}
                </p>
                {acao.detalhe && (
                  <p
                    className="text-[11px] mt-0.5 leading-relaxed"
                    style={{ color: t.textSoft }}
                  >
                    {acao.detalhe}
                  </p>
                )}
              </div>

              {(acao.tipo === "REGISTRAR_GASTO" ||
                acao.tipo === "REGISTRAR_RECEITA") &&
                typeof p?.valor === "number" && (
                  <div
                    className="px-2.5 py-1 rounded-xl font-mono-num text-xs font-extrabold shrink-0"
                    style={{
                      backgroundColor:
                        acao.tipo === "REGISTRAR_RECEITA"
                          ? `${t.primary}18`
                          : `${t.action}18`,
                      color:
                        acao.tipo === "REGISTRAR_RECEITA"
                          ? t.primary
                          : t.action,
                    }}
                  >
                    {acao.tipo === "REGISTRAR_RECEITA" ? "+" : "−"}R${" "}
                    {p.valor.toFixed(2).replace(".", ",")}
                  </div>
                )}
            </div>

            {/* PREVIEW VISUAL DE CONTAS BANCÁRIAS E CARTÕES ALTERADOS */}
            {((p?.contasAjuste && p.contasAjuste.length > 0) ||
              (p?.cartoesAjuste && p.cartoesAjuste.length > 0)) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                {p?.contasAjuste?.map((c, idx) => {
                  const ident = getIdentidadeBanco(c.nome);
                  return (
                    <div
                      key={`c-${idx}`}
                      onClick={() =>
                        onIrParaModulo && onIrParaModulo("financas")
                      }
                      className="p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer hover:opacity-95 transition-all"
                      style={{
                        backgroundColor: t.card,
                        borderColor: `${ident.corPrimaria}45`,
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs"
                          style={{ background: ident.gradiente }}
                        >
                          {ident.renderIcone(14)}
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-[11px] font-bold truncate"
                            style={{ color: t.text }}
                          >
                            {c.nome}
                          </p>
                          <p
                            className="text-[9px]"
                            style={{ color: t.textSoft }}
                          >
                            {ident.nomeBanco} · Saldo
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-xs font-mono-num font-extrabold shrink-0"
                        style={{ color: ident.corPrimaria }}
                      >
                        R${" "}
                        {Number(c.saldoAtual || 0)
                          .toFixed(2)
                          .replace(".", ",")}
                      </span>
                    </div>
                  );
                })}

                {p?.cartoesAjuste?.map((cc, idx) => {
                  const ident = getIdentidadeBanco(cc.nome);
                  return (
                    <div
                      key={`cc-${idx}`}
                      onClick={() =>
                        onIrParaModulo && onIrParaModulo("financas")
                      }
                      className="p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer hover:opacity-95 transition-all"
                      style={{
                        backgroundColor: t.card,
                        borderColor: `${ident.corPrimaria}45`,
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs"
                          style={{ background: ident.gradiente }}
                        >
                          {ident.renderIcone(14)}
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-[11px] font-bold truncate"
                            style={{ color: t.text }}
                          >
                            {cc.nome}
                          </p>
                          <p
                            className="text-[9px]"
                            style={{ color: t.textSoft }}
                          >
                            Fatura do cartão
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-xs font-mono-num font-extrabold shrink-0"
                        style={{ color: t.action }}
                      >
                        R${" "}
                        {Number(cc.faturaAtual || 0)
                          .toFixed(2)
                          .replace(".", ",")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PREVIEW COMPLETO DE LISTA DE GASTOS RECORRENTES / PAGAMENTOS PREVISTOS (SEM CORTAR NENHUM ITEM) */}
            {p?.lancamentosAjuste && p.lancamentosAjuste.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between px-1">
                  <span
                    className="text-[10px] font-extrabold uppercase tracking-wider"
                    style={{ color: t.textSoft }}
                  >
                    Todos os {p.lancamentosAjuste.length} lançamentos incluídos:
                  </span>
                  <span
                    className="text-[11px] font-mono-num font-extrabold"
                    style={{ color: t.action }}
                  >
                    Total: R${" "}
                    {p.lancamentosAjuste
                      .reduce((s, i) => s + (Number(i.valor) || 0), 0)
                      .toFixed(2)
                      .replace(".", ",")}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-80 overflow-y-auto pr-0.5">
                  {p.lancamentosAjuste.map((lanc, idx) => {
                    const ehSemData =
                      lanc.semData === true ||
                      !lanc.data ||
                      /^(sem\s*data|n[ãa]o\s*informad)/i.test(String(lanc.data));
                    return (
                      <div
                        key={`lanc-${idx}`}
                        className="p-2.5 rounded-xl border flex items-center justify-between gap-2"
                        style={{
                          backgroundColor: t.card,
                          borderColor: t.border,
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="text-[10px] font-mono-num font-bold opacity-60"
                              style={{ color: t.textSoft }}
                            >
                              {idx + 1}.
                            </span>
                            <p
                              className="text-[11px] font-bold truncate"
                              style={{ color: t.text }}
                            >
                              {lanc.descricao}
                            </p>
                            {lanc.recorrente && (
                              <span
                                className="px-1.5 py-0.2 rounded-md text-[9px] font-bold"
                                style={{
                                  backgroundColor: `${t.primary}18`,
                                  color: t.primary,
                                }}
                              >
                                Recorrente
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                              style={{
                                backgroundColor: ehSemData
                                  ? t.cardSubtle
                                  : `${t.finance}18`,
                                color: ehSemData ? t.textSoft : t.finance,
                              }}
                            >
                              {ehSemData ? "Sem data definida" : lanc.data}
                            </span>
                            <span
                              className="text-[9px] truncate"
                              style={{ color: t.textSoft }}
                            >
                              {lanc.categoria || "Moradia & Fixos"} ·{" "}
                              {lanc.status === "previsto" ? "Previsto" : "Realizado"}
                            </span>
                          </div>
                        </div>
                        <span
                          className="text-xs font-mono-num font-extrabold shrink-0"
                          style={{
                            color:
                              lanc.tipo === "receita" ? t.primary : t.action,
                          }}
                        >
                          {lanc.tipo === "receita" ? "+" : "−"}R${" "}
                          {Number(lanc.valor || 0)
                            .toFixed(2)
                            .replace(".", ",")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PREVIEW VISUAL DE COMPROMISSOS AGENDADOS */}
            {p?.compromissos && p.compromissos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {p.compromissos.map((comp, idx) => (
                  <div
                    key={idx}
                    className="px-2.5 py-1 rounded-xl border text-[11px] flex items-center gap-1.5"
                    style={{ backgroundColor: t.card, borderColor: t.border }}
                  >
                    <span
                      className="font-mono-num font-bold"
                      style={{ color: meta.corDestaque }}
                    >
                      {comp.diaMes
                        ? `Dia ${String(comp.diaMes).padStart(2, "0")} · `
                        : ""}
                      {comp.hora}
                    </span>
                    <span
                      className="font-semibold truncate max-w-[200px]"
                      style={{ color: t.text }}
                    >
                      {comp.titulo}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* PREVIEW VISUAL DE DISCIPLINAS UERJ */}
            {p?.disciplinas && p.disciplinas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {p.disciplinas.map((d, idx) => (
                  <div
                    key={idx}
                    className="px-2.5 py-1 rounded-xl border text-[11px] flex items-center gap-1.5"
                    style={{ backgroundColor: t.card, borderColor: t.border }}
                  >
                    <GraduationCap
                      size={12}
                      style={{ color: meta.corDestaque }}
                    />
                    <span className="font-semibold" style={{ color: t.text }}>
                      {d.nome}
                    </span>
                    <span className="text-[10px]" style={{ color: t.textSoft }}>
                      ({d.horarioSala})
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* PREVIEW VISUAL DE REFEIÇÕES / COMPRAS */}
            {p?.refeicoes && p.refeicoes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {p.refeicoes.map((r, idx) => (
                  <div
                    key={idx}
                    className="px-2.5 py-1 rounded-xl border text-[11px] flex items-center gap-1.5"
                    style={{ backgroundColor: t.card, borderColor: t.border }}
                  >
                    <span
                      className="font-mono-num font-bold"
                      style={{ color: meta.corDestaque }}
                    >
                      {r.horario}
                    </span>
                    <span className="font-semibold" style={{ color: t.text }}>
                      {r.nome}
                    </span>
                    <span
                      className="text-[10px] font-mono-num"
                      style={{ color: t.textSoft }}
                    >
                      {r.proteinaG}g P
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* EDITOR INLINE DA AÇÃO (PARA CORRIGIR E ENSINAR A LALA) */
          <div
            className="p-3 rounded-xl border space-y-2.5"
            style={{ backgroundColor: t.card, borderColor: t.primary }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-bold"
                style={{ color: t.primary }}
              >
                Editar Ação & Ensinar o Jeito que Você Prefere
              </span>
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="p-1 rounded-lg cursor-pointer"
                style={{ color: t.textSoft }}
              >
                <X size={13} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label
                  className="text-[10px] font-bold block mb-0.5"
                  style={{ color: t.textSoft }}
                >
                  Título da Ação
                </label>
                <input
                  value={draftAcao.titulo}
                  onChange={(e) =>
                    setDraftAcao((prev) => ({
                      ...prev,
                      titulo: e.target.value,
                    }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none"
                  style={{
                    backgroundColor: t.bg,
                    color: t.text,
                    borderColor: t.border,
                  }}
                />
              </div>
              <div>
                <label
                  className="text-[10px] font-bold block mb-0.5"
                  style={{ color: t.textSoft }}
                >
                  Detalhe / Descrição
                </label>
                <input
                  value={draftAcao.detalhe}
                  onChange={(e) =>
                    setDraftAcao((prev) => ({
                      ...prev,
                      detalhe: e.target.value,
                    }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none"
                  style={{
                    backgroundColor: t.bg,
                    color: t.text,
                    borderColor: t.border,
                  }}
                />
              </div>
            </div>

            {/* Edição de Lista de Gastos Recorrentes / Lançamentos */}
            {draftAcao.payload?.lancamentosAjuste &&
              draftAcao.payload.lancamentosAjuste.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: t.textSoft }}
                    >
                      Despesas / Pagamentos ({draftAcao.payload.lancamentosAjuste.length} itens — deixe data vazia p/ Sem data)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraftAcao((prev) => ({
                          ...prev,
                          payload: {
                            ...prev.payload,
                            lancamentosAjuste: [
                              ...(prev.payload?.lancamentosAjuste || []),
                              {
                                descricao: "Nova despesa",
                                valor: 0,
                                tipo: "despesa",
                                status: "previsto",
                                data: "Sem data",
                                diaVencimento: null,
                                semData: true,
                                recorrente: true,
                                metodo: "Conta / Pix",
                                categoria: "Moradia & Fixos",
                              },
                            ],
                          },
                        }))
                      }
                      className="text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                      style={{ color: t.primary }}
                    >
                      <Plus size={11} /> Despesa
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {(draftAcao.payload.lancamentosAjuste || []).map(
                      (lanc, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-12 gap-1.5 items-center"
                        >
                          <input
                            value={lanc.descricao}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftAcao((prev) => {
                                const list = [
                                  ...(prev.payload?.lancamentosAjuste || []),
                                ];
                                list[idx] = { ...list[idx], descricao: val };
                                return {
                                  ...prev,
                                  payload: {
                                    ...prev.payload,
                                    lancamentosAjuste: list,
                                  },
                                };
                              });
                            }}
                            placeholder="Descrição"
                            className="col-span-5 px-2 py-1 rounded-lg border text-xs outline-none"
                            style={{
                              backgroundColor: t.bg,
                              color: t.text,
                              borderColor: t.border,
                            }}
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={lanc.valor}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setDraftAcao((prev) => {
                                const list = [
                                  ...(prev.payload?.lancamentosAjuste || []),
                                ];
                                list[idx] = { ...list[idx], valor: val };
                                return {
                                  ...prev,
                                  payload: {
                                    ...prev.payload,
                                    lancamentosAjuste: list,
                                  },
                                };
                              });
                            }}
                            placeholder="R$"
                            className="col-span-3 px-2 py-1 rounded-lg border text-xs font-mono-num outline-none"
                            style={{
                              backgroundColor: t.bg,
                              color: t.text,
                              borderColor: t.border,
                            }}
                          />
                          <input
                            value={
                              lanc.semData || lanc.data === "Sem data"
                                ? ""
                                : lanc.data || ""
                            }
                            onChange={(e) => {
                              const rawD = e.target.value;
                              const ehSem =
                                !rawD.trim() ||
                                /^(sem\s*data|n[ãa]o\s*informad)/i.test(
                                  rawD.trim()
                                );
                              const mDia =
                                rawD.match(/\b(\d{1,2})\/\d{1,2}\b/) ||
                                rawD.match(/\bdia\s+(\d{1,2})\b/i) ||
                                rawD.match(/^(\d{1,2})$/);
                              const dNum = mDia ? parseInt(mDia[1], 10) : null;
                              setDraftAcao((prev) => {
                                const list = [
                                  ...(prev.payload?.lancamentosAjuste || []),
                                ];
                                list[idx] = {
                                  ...list[idx],
                                  data: ehSem ? "Sem data" : rawD,
                                  diaVencimento:
                                    !ehSem && dNum && dNum >= 1 && dNum <= 31
                                      ? dNum
                                      : null,
                                  semData: ehSem,
                                };
                                return {
                                  ...prev,
                                  payload: {
                                    ...prev.payload,
                                    lancamentosAjuste: list,
                                  },
                                };
                              });
                            }}
                            placeholder="Sem data (ou Dia 10)"
                            className="col-span-3 px-2 py-1 rounded-lg border text-xs font-mono-num outline-none"
                            style={{
                              backgroundColor: t.bg,
                              color: t.text,
                              borderColor: t.border,
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setDraftAcao((prev) => ({
                                ...prev,
                                payload: {
                                  ...prev.payload,
                                  lancamentosAjuste: (
                                    prev.payload?.lancamentosAjuste || []
                                  ).filter((_, i) => i !== idx),
                                },
                              }))
                            }
                            className="col-span-1 p-1 text-red-500 flex justify-center cursor-pointer"
                            title="Remover item"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Campos específicos de Gasto / Receita / Tarefa */}
            {(!draftAcao.payload?.lancamentosAjuste ||
              draftAcao.payload.lancamentosAjuste.length <= 1) &&
              (draftAcao.tipo === "REGISTRAR_GASTO" ||
                draftAcao.tipo === "REGISTRAR_RECEITA" ||
                draftAcao.tipo === "CRIAR_TAREFA") && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-1">
                  <label
                    className="text-[10px] font-bold block mb-0.5"
                    style={{ color: t.textSoft }}
                  >
                    Texto / Nome do Item
                  </label>
                  <input
                    value={draftAcao.payload?.texto || draftAcao.titulo}
                    onChange={(e) =>
                      setDraftAcao((prev) => ({
                        ...prev,
                        payload: { ...prev.payload, texto: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none"
                    style={{
                      backgroundColor: t.bg,
                      color: t.text,
                      borderColor: t.border,
                    }}
                  />
                </div>

                {(draftAcao.tipo === "REGISTRAR_GASTO" ||
                  draftAcao.tipo === "REGISTRAR_RECEITA") && (
                  <>
                    <div>
                      <label
                        className="text-[10px] font-bold block mb-0.5"
                        style={{ color: t.textSoft }}
                      >
                        Valor (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={draftAcao.payload?.valor ?? 0}
                        onChange={(e) =>
                          setDraftAcao((prev) => ({
                            ...prev,
                            payload: {
                              ...prev.payload,
                              valor: Number(e.target.value) || 0,
                            },
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono-num outline-none"
                        style={{
                          backgroundColor: t.bg,
                          color: t.text,
                          borderColor: t.border,
                        }}
                      />
                    </div>
                    <div>
                      <label
                        className="text-[10px] font-bold block mb-0.5"
                        style={{ color: t.textSoft }}
                      >
                        Categoria
                      </label>
                      <select
                        value={draftAcao.payload?.categoriaGasto || "Mercado"}
                        onChange={(e) =>
                          setDraftAcao((prev) => ({
                            ...prev,
                            payload: {
                              ...prev.payload,
                              categoriaGasto: e.target
                                .value as OrcamentoCategoria["categoria"],
                            },
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none"
                        style={{
                          backgroundColor: t.bg,
                          color: t.text,
                          borderColor: t.border,
                        }}
                      >
                        {CATEGORIAS_GASTO.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Edição de Contas Bancárias */}
            {(draftAcao.tipo === "ATUALIZAR_CONTAS_FINANCAS" ||
              (draftAcao.payload?.contasAjuste &&
                draftAcao.payload.contasAjuste.length > 0)) && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: t.textSoft }}
                    >
                      Contas Bancárias na Ação
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraftAcao((prev) => ({
                          ...prev,
                          payload: {
                            ...prev.payload,
                            contasAjuste: [
                              ...(prev.payload?.contasAjuste || []),
                              { nome: "Nova Conta", saldoAtual: 0 },
                            ],
                          },
                        }))
                      }
                      className="text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                      style={{ color: t.primary }}
                    >
                      <Plus size={11} /> Conta
                    </button>
                  </div>
                  {(draftAcao.payload?.contasAjuste || []).map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        value={c.nome}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftAcao((prev) => {
                            const list = [
                              ...(prev.payload?.contasAjuste || []),
                            ];
                            list[idx] = { ...list[idx], nome: val };
                            return {
                              ...prev,
                              payload: { ...prev.payload, contasAjuste: list },
                            };
                          });
                        }}
                        placeholder="Nome do Banco"
                        className="flex-1 px-2.5 py-1 rounded-lg border text-xs outline-none"
                        style={{
                          backgroundColor: t.bg,
                          color: t.text,
                          borderColor: t.border,
                        }}
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={c.saldoAtual}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setDraftAcao((prev) => {
                            const list = [
                              ...(prev.payload?.contasAjuste || []),
                            ];
                            list[idx] = { ...list[idx], saldoAtual: val };
                            return {
                              ...prev,
                              payload: { ...prev.payload, contasAjuste: list },
                            };
                          });
                        }}
                        placeholder="Saldo R$"
                        className="w-28 px-2.5 py-1 rounded-lg border text-xs font-mono-num outline-none"
                        style={{
                          backgroundColor: t.bg,
                          color: t.text,
                          borderColor: t.border,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraftAcao((prev) => ({
                            ...prev,
                            payload: {
                              ...prev.payload,
                              contasAjuste: (
                                prev.payload?.contasAjuste || []
                              ).filter((_, i) => i !== idx),
                            },
                          }))
                        }
                        className="p-1 text-red-500 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

            {/* Edição de Cartões de Crédito */}
            {draftAcao.payload?.cartoesAjuste &&
              draftAcao.payload.cartoesAjuste.length > 0 && (
                <div className="space-y-1.5">
                  <span
                    className="text-[10px] font-bold block"
                    style={{ color: t.textSoft }}
                  >
                    Cartões de Crédito na Ação (Nome / Fatura R$ / Limite R$)
                  </span>
                  {draftAcao.payload.cartoesAjuste.map((cc, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        value={cc.nome}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftAcao((prev) => {
                            const list = [
                              ...(prev.payload?.cartoesAjuste || []),
                            ];
                            list[idx] = { ...list[idx], nome: val };
                            return {
                              ...prev,
                              payload: { ...prev.payload, cartoesAjuste: list },
                            };
                          });
                        }}
                        className="flex-1 px-2 py-1 rounded-lg border text-xs outline-none"
                        style={{
                          backgroundColor: t.bg,
                          color: t.text,
                          borderColor: t.border,
                        }}
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={cc.faturaAtual}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setDraftAcao((prev) => {
                            const list = [
                              ...(prev.payload?.cartoesAjuste || []),
                            ];
                            list[idx] = { ...list[idx], faturaAtual: val };
                            return {
                              ...prev,
                              payload: { ...prev.payload, cartoesAjuste: list },
                            };
                          });
                        }}
                        className="w-24 px-2 py-1 rounded-lg border text-xs font-mono-num outline-none"
                        style={{
                          backgroundColor: t.bg,
                          color: t.text,
                          borderColor: t.border,
                        }}
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={cc.limiteTotal ?? 3000}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setDraftAcao((prev) => {
                            const list = [
                              ...(prev.payload?.cartoesAjuste || []),
                            ];
                            list[idx] = { ...list[idx], limiteTotal: val };
                            return {
                              ...prev,
                              payload: { ...prev.payload, cartoesAjuste: list },
                            };
                          });
                        }}
                        className="w-24 px-2 py-1 rounded-lg border text-xs font-mono-num outline-none"
                        style={{
                          backgroundColor: t.bg,
                          color: t.text,
                          borderColor: t.border,
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

            {/* Edição de Compromissos */}
            {draftAcao.payload?.compromissos &&
              draftAcao.payload.compromissos.length > 0 && (
                <div className="space-y-1.5">
                  <span
                    className="text-[10px] font-bold block"
                    style={{ color: t.textSoft }}
                  >
                    Compromissos (Hora / Título / Duração min)
                  </span>
                  {draftAcao.payload.compromissos.map((comp, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        value={comp.hora}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftAcao((prev) => {
                            const list = [
                              ...(prev.payload?.compromissos || []),
                            ];
                            list[idx] = { ...list[idx], hora: val };
                            return {
                              ...prev,
                              payload: { ...prev.payload, compromissos: list },
                            };
                          });
                        }}
                        className="w-16 px-2 py-1 rounded-lg border text-xs font-mono-num outline-none"
                        style={{
                          backgroundColor: t.bg,
                          color: t.text,
                          borderColor: t.border,
                        }}
                      />
                      <input
                        value={comp.titulo}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftAcao((prev) => {
                            const list = [
                              ...(prev.payload?.compromissos || []),
                            ];
                            list[idx] = { ...list[idx], titulo: val };
                            return {
                              ...prev,
                              payload: { ...prev.payload, compromissos: list },
                            };
                          });
                        }}
                        className="flex-1 px-2 py-1 rounded-lg border text-xs outline-none"
                        style={{
                          backgroundColor: t.bg,
                          color: t.text,
                          borderColor: t.border,
                        }}
                      />
                      <input
                        type="number"
                        value={comp.duracaoMin ?? 60}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 60;
                          setDraftAcao((prev) => {
                            const list = [
                              ...(prev.payload?.compromissos || []),
                            ];
                            list[idx] = { ...list[idx], duracaoMin: val };
                            return {
                              ...prev,
                              payload: { ...prev.payload, compromissos: list },
                            };
                          });
                        }}
                        className="w-16 px-2 py-1 rounded-lg border text-xs font-mono-num outline-none"
                        style={{
                          backgroundColor: t.bg,
                          color: t.text,
                          borderColor: t.border,
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

            <div>
              <label
                className="text-[10px] font-bold block mb-0.5"
                style={{ color: t.textSoft }}
              >
                Ensinar regra para a Lala lembrar nas próximas vezes (opcional)
              </label>
              <input
                value={regraAprendizadoInput}
                onChange={(e) => setRegraAprendizadoInput(e.target.value)}
                placeholder="Ex: Sempre classificar Uber em Transporte & UERJ / Usar conta Nubank..."
                className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none"
                style={{
                  backgroundColor: t.bg,
                  color: t.text,
                  borderColor: t.border,
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer"
                style={{
                  backgroundColor: t.bg,
                  color: t.textSoft,
                  borderColor: t.border,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarEdicao}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: t.primary }}
              >
                <Check size={13} />
                <span>
                  {acao.executada
                    ? "Salvar Edição e Atualizar App"
                    : "Confirmar com Minha Edição"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* BARRA DE AÇÕES: CONFIRMAR / EDITAR / DESFAZER */}
        {!editando && (
          <div
            className="pt-2 border-t flex items-center justify-between gap-2 flex-wrap"
            style={{ borderColor: `${t.border}90` }}
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              {aguardandoConfirmacao && onExecutar && (
                <button
                  type="button"
                  onClick={() => onExecutar(acao)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer hover:opacity-95 transition-opacity shadow-2xs"
                  style={{ backgroundColor: t.primary }}
                >
                  <Check size={13} />
                  <span>Confirmar e Aplicar</span>
                </button>
              )}

              {acao.desfeita && onExecutar && (
                <button
                  type="button"
                  onClick={() => onExecutar({ ...acao, desfeita: false })}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer"
                  style={{ backgroundColor: t.primary }}
                >
                  <Check size={12} />
                  <span>Aplicar Novamente</span>
                </button>
              )}

              <button
                type="button"
                onClick={abrirEdicao}
                className="px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:opacity-85 transition-opacity"
                style={{
                  backgroundColor: t.card,
                  color: t.text,
                  borderColor: t.border,
                }}
                title="Editar os dados desta ação e ensinar a Lala"
              >
                <Pencil size={12} style={{ color: t.action }} />
                <span>Editar Ação</span>
              </button>

              {acao.executada && !acao.desfeita && onDesfazer && (
                <button
                  type="button"
                  onClick={onDesfazer}
                  className="px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:opacity-85 transition-opacity"
                  style={{
                    backgroundColor: `${t.danger}12`,
                    color: t.danger,
                    borderColor: `${t.danger}35`,
                  }}
                  title="Desfazer esta alteração e restaurar o estado anterior"
                >
                  <RotateCcw size={12} />
                  <span>Desfazer Ação</span>
                </button>
              )}

              {aguardandoConfirmacao && onRecusar && (
                <button
                  type="button"
                  onClick={onRecusar}
                  className="px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: t.card,
                    color: t.textSoft,
                    borderColor: t.border,
                  }}
                >
                  <X size={12} />
                  <span>Ignorar</span>
                </button>
              )}
            </div>

            {/* Sugestão de Automação Progressiva após confirmações repetidas */}
            <div className="flex items-center gap-2 flex-wrap">
              {(dataHora || acao.executadaEm) && (
                <span
                  className="text-[10px] font-mono-num"
                  style={{ color: t.textSoft }}
                >
                  {acao.executadaEm || dataHora}
                </span>
              )}
              {callbackAutomacao && (
                <button
                  type="button"
                  onClick={() =>
                    callbackAutomacao(acao.tipo, !tipoAutomatizado)
                  }
                  className="text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded-lg border cursor-pointer transition-all"
                  style={{
                    backgroundColor: tipoAutomatizado
                      ? `${t.primary}15`
                      : totalConfirmacoes >= 2
                      ? `${t.action}15`
                      : t.card,
                    color: tipoAutomatizado
                      ? t.primary
                      : totalConfirmacoes >= 2
                      ? t.action
                      : t.textSoft,
                    borderColor: tipoAutomatizado
                      ? `${t.primary}40`
                      : totalConfirmacoes >= 2
                      ? `${t.action}40`
                      : t.border,
                  }}
                  title="Definir se a Lala deve pedir confirmação ou automatizar este tipo de processo"
                >
                  <Zap size={11} />
                  <span>
                    {tipoAutomatizado
                      ? "Automatizado (Clique p/ pedir confirmação)"
                      : totalConfirmacoes >= 2
                      ? `Já confirmado ${totalConfirmacoes}x · Automatizar?`
                      : "Sempre pedir confirmação"}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {notaAprendizado && !editando && (
          <div
            className="mt-1 px-2.5 py-1.5 rounded-xl border text-[11px] flex items-center gap-1.5"
            style={{
              backgroundColor: `${t.primary}10`,
              borderColor: `${t.primary}30`,
              color: t.text,
            }}
          >
            <Sparkles size={11} style={{ color: t.primary }} />
            <span>
              <strong>Aprendizado registrado:</strong> {notaAprendizado}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
