import React from "react";
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
} from "lucide-react";
import { AcaoGovernanta, TabId, ThemeTokens } from "../types/lala";
import { getIdentidadeBanco } from "../utils/bankIdentities";

interface ModuloMeta {
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
        subtituloModulo: "Atualização automática da Lala",
        corDestaque: t.primary,
        Icone: Sparkles,
      };
  }
}

interface LalaAppActionCardProps {
  t: ThemeTokens;
  acao: AcaoGovernanta;
  onExecutar?: () => void;
  onIrParaModulo?: (aba: TabId) => void;
  compact?: boolean;
}

export function LalaAppActionCard({
  t,
  acao,
  onExecutar,
  onIrParaModulo,
  compact = false,
}: LalaAppActionCardProps) {
  const meta = obterMetaModuloAcao(acao.tipo, t);
  const IconeModulo = meta.Icone;
  const p = acao.payload;

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all shadow-xs"
      style={{
        backgroundColor: t.bg,
        borderColor: acao.executada ? `${meta.corDestaque}55` : t.border,
        borderLeftWidth: "4px",
        borderLeftColor: meta.corDestaque,
      }}
    >
      {/* CABEÇALHO DO COMPONENTE DO APP */}
      <div
        className="px-3.5 py-2 border-b flex items-center justify-between gap-2"
        style={{
          backgroundColor: `${meta.corDestaque}10`,
          borderColor: `${meta.corDestaque}22`,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-white shadow-2xs"
            style={{ backgroundColor: meta.corDestaque }}
          >
            <IconeModulo size={13} />
          </div>
          <div className="min-w-0">
            <span
              className="text-[10px] font-extrabold uppercase tracking-wider block leading-none"
              style={{ color: meta.corDestaque }}
            >
              {meta.nomeModulo}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {acao.executada ? (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                backgroundColor: `${t.primary}18`,
                color: t.primary,
              }}
            >
              <CheckCircle2 size={11} />
              Salvo no App
            </span>
          ) : (
            onExecutar && (
              <button
                type="button"
                onClick={onExecutar}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white cursor-pointer hover:opacity-90 transition-opacity"
                style={{ backgroundColor: meta.corDestaque }}
              >
                Aplicar no App
              </button>
            )
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
      <div className={compact ? "p-3 space-y-2" : "p-3.5 space-y-2.5"}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold leading-snug" style={{ color: t.text }}>
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

          {/* Valor em destaque para Gasto ou Receita individual */}
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
                    acao.tipo === "REGISTRAR_RECEITA" ? t.primary : t.action,
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {p?.contasAjuste?.map((c, idx) => {
              const ident = getIdentidadeBanco(c.nome);
              return (
                <div
                  key={`c-${idx}`}
                  onClick={() => onIrParaModulo && onIrParaModulo("financas")}
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
                      <p className="text-[9px]" style={{ color: t.textSoft }}>
                        {ident.nomeBanco} · Saldo atualizado
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-xs font-mono-num font-extrabold shrink-0"
                    style={{ color: ident.corPrimaria }}
                  >
                    R$ {Number(c.saldoAtual || 0).toFixed(2).replace(".", ",")}
                  </span>
                </div>
              );
            })}

            {p?.cartoesAjuste?.map((cc, idx) => {
              const ident = getIdentidadeBanco(cc.nome);
              return (
                <div
                  key={`cc-${idx}`}
                  onClick={() => onIrParaModulo && onIrParaModulo("financas")}
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
                      <p className="text-[9px]" style={{ color: t.textSoft }}>
                        Fatura atualizada
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-xs font-mono-num font-extrabold shrink-0"
                    style={{ color: t.action }}
                  >
                    R$ {Number(cc.faturaAtual || 0).toFixed(2).replace(".", ",")}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* PREVIEW VISUAL DE COMPROMISSOS AGENDADOS */}
        {p?.compromissos && p.compromissos.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {p.compromissos.slice(0, 4).map((comp, idx) => (
              <div
                key={idx}
                className="px-2.5 py-1 rounded-xl border text-[11px] flex items-center gap-1.5"
                style={{ backgroundColor: t.card, borderColor: t.border }}
              >
                <span
                  className="font-mono-num font-bold"
                  style={{ color: meta.corDestaque }}
                >
                  {comp.hora}
                </span>
                <span className="font-semibold truncate max-w-[180px]" style={{ color: t.text }}>
                  {comp.titulo}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* PREVIEW VISUAL DE DISCIPLINAS UERJ */}
        {p?.disciplinas && p.disciplinas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {p.disciplinas.slice(0, 4).map((d, idx) => (
              <div
                key={idx}
                className="px-2.5 py-1 rounded-xl border text-[11px] flex items-center gap-1.5"
                style={{ backgroundColor: t.card, borderColor: t.border }}
              >
                <GraduationCap size={12} style={{ color: meta.corDestaque }} />
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
            {p.refeicoes.slice(0, 4).map((r, idx) => (
              <div
                key={idx}
                className="px-2.5 py-1 rounded-xl border text-[11px] flex items-center gap-1.5"
                style={{ backgroundColor: t.card, borderColor: t.border }}
              >
                <span className="font-mono-num font-bold" style={{ color: meta.corDestaque }}>
                  {r.horario}
                </span>
                <span className="font-semibold" style={{ color: t.text }}>
                  {r.nome}
                </span>
                <span className="text-[10px] font-mono-num" style={{ color: t.textSoft }}>
                  {r.proteinaG}g P
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
