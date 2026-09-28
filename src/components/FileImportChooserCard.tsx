import React, { useState } from "react";
import {
  FileText,
  X,
  Calendar,
  CheckCircle2,
  Wallet,
  ShoppingCart,
  GraduationCap,
  Dumbbell,
  FolderOpen,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  AnexoLala,
  ArquivoRepositorio,
  IntencaoImportacaoArquivo,
  ThemeTokens,
} from "../types/lala";
import { formatarTamanhoBytes } from "../services/lalaEngine";

interface FileImportChooserCardProps {
  t: ThemeTokens;
  anexo: AnexoLala;
  onClear: () => void;
  onConfirmImport: (
    intencao: IntencaoImportacaoArquivo,
    instrucaoCustom: string,
    pastaDestino: ArquivoRepositorio["area"],
    guardarCopia: boolean
  ) => void;
  onSaveOnly: (
    pastaDestino: ArquivoRepositorio["area"],
    tituloCustom?: string
  ) => void;
  compact?: boolean;
}

const OPCOES_DESTINO: {
  id: IntencaoImportacaoArquivo;
  label: string;
  desc: string;
  icon: React.ElementType;
  promptPadrao: (nomeArq: string) => string;
}[] = [
  {
    id: "auto",
    label: "Importação Inteligente (Auto)",
    desc: "A Lala identifica o conteúdo do arquivo e importa para as abas certas",
    icon: Sparkles,
    promptPadrao: (n) =>
      `Lala, analise o arquivo "${n}", identifique as informações úteis e importe para as abas correspondentes do app!`,
  },
  {
    id: "calendario",
    label: "Importar Eventos / Horários no Calendário",
    desc: "Cronogramas, escalas, consultas, datas, reuniões ou grades de horário",
    icon: Calendar,
    promptPadrao: (n) =>
      `Lala, extraia os eventos, datas, aulas ou horários do arquivo "${n}" e agende no meu Calendário!`,
  },
  {
    id: "tarefas",
    label: "Importar Tarefas, Checklist ou Projetos",
    desc: "Listas de pendências, escopo de projetos, entregáveis ou etapas",
    icon: CheckCircle2,
    promptPadrao: (n) =>
      `Lala, extraia as tarefas, pendências ou etapas de projetos do arquivo "${n}" e cadastre na minha lista!`,
  },
  {
    id: "financas",
    label: "Importar Finanças (Recibo, Extrato ou Fatura)",
    desc: "Lançar gastos/receitas do comprovante ou atualizar saldos e cartões",
    icon: Wallet,
    promptPadrao: (n) =>
      `Lala, leia os valores, gastos, receitas ou saldos do arquivo "${n}" e importe na aba Finanças!`,
  },
  {
    id: "compras_dieta",
    label: "Importar Compras, Estoque ou Cardápio",
    desc: "Lista de mercado, ingredientes, plano alimentar ou itens da casa/pets",
    icon: ShoppingCart,
    promptPadrao: (n) =>
      `Lala, extraia os itens de compras, estoque ou refeições do arquivo "${n}" e atualize o app!`,
  },
  {
    id: "estudos",
    label: "Importar Estudos, Matérias ou Leituras",
    desc: "Disciplinas, ementas, datas de avaliação, artigos ou fichamentos",
    icon: GraduationCap,
    promptPadrao: (n) =>
      `Lala, extraia as matérias, prazos acadêmicos, leituras ou notas de estudo do arquivo "${n}" e importe em Estudos!`,
  },
  {
    id: "treino",
    label: "Importar Treino ou Rotina de Saúde",
    desc: "Planilha de exercícios, séries, hábitos diários ou metas de saúde",
    icon: Dumbbell,
    promptPadrao: (n) =>
      `Lala, extraia os exercícios, séries ou hábitos de saúde do arquivo "${n}" e importe na aba Saúde & Corpo!`,
  },
  {
    id: "guardar",
    label: "Apenas Guardar no Segundo Cérebro",
    desc: "Salva o arquivo original em uma pasta para consultar ou baixar depois",
    icon: FolderOpen,
    promptPadrao: (n) => `Guardar arquivo "${n}" no Segundo Cérebro`,
  },
];

export function FileImportChooserCard({
  t,
  anexo,
  onClear,
  onConfirmImport,
  onSaveOnly,
  compact = false,
}: FileImportChooserCardProps) {
  const [intencaoSelecionada, setIntencaoSelecionada] =
    useState<IntencaoImportacaoArquivo>(anexo.intencao || "auto");
  const [instrucaoCustom, setInstrucaoCustom] = useState<string>(
    anexo.instrucaoUsuario || ""
  );
  const [pastaDestino, setPastaDestino] = useState<ArquivoRepositorio["area"]>(
    anexo.areaRepositorio || "Pessoal"
  );
  const [guardarCopia, setGuardarCopia] = useState<boolean>(true);

  const opcaoAtiva =
    OPCOES_DESTINO.find((o) => o.id === intencaoSelecionada) ||
    OPCOES_DESTINO[0];

  const handleExecutar = () => {
    if (intencaoSelecionada === "guardar") {
      onSaveOnly(pastaDestino, instrucaoCustom.trim() || undefined);
      return;
    }
    const promptFinal =
      instrucaoCustom.trim() || opcaoAtiva.promptPadrao(anexo.nome);
    onConfirmImport(
      intencaoSelecionada,
      promptFinal,
      pastaDestino,
      guardarCopia
    );
  };

  return (
    <div
      style={{
        backgroundColor: `${t.primary}10`,
        borderColor: `${t.primary}45`,
      }}
      className="p-3.5 sm:p-4 rounded-2xl border space-y-3"
    >
      {/* Cabeçalho do Arquivo */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-3 min-w-0">
          {anexo.mimeType.startsWith("image/") && anexo.base64 ? (
            <img
              src={anexo.base64}
              alt={anexo.nome}
              className="w-12 h-12 rounded-xl object-cover border shrink-0"
              style={{ borderColor: t.border }}
            />
          ) : (
            <div
              style={{ backgroundColor: t.primary, color: "#fff" }}
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            >
              <FileText size={19} />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p
                className="text-xs sm:text-sm font-bold truncate"
                style={{ color: t.text }}
              >
                {anexo.nome}
              </p>
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded-md shrink-0"
                style={{ backgroundColor: t.card, color: t.textSoft }}
              >
                {formatarTamanhoBytes(anexo.tamanhoBytes)}
              </span>
            </div>
            <p style={{ color: t.textSoft }} className="text-[11px]">
              Escolha o que deseja fazer com este arquivo ou o que quer importar
              dele:
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="p-1.5 rounded-full cursor-pointer shrink-0"
          style={{ backgroundColor: t.card, color: t.textSoft }}
          title="Remover arquivo"
        >
          <X size={15} />
        </button>
      </div>

      {/* Grade de Destinos de Importação (100% flexível) */}
      <div
        className={`grid gap-1.5 ${
          compact
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        }`}
      >
        {OPCOES_DESTINO.map((op) => {
          const Icon = op.icon;
          const ativo = intencaoSelecionada === op.id;
          return (
            <button
              key={op.id}
              type="button"
              onClick={() => setIntencaoSelecionada(op.id)}
              style={{
                backgroundColor: ativo ? `${t.primary}20` : t.card,
                borderColor: ativo ? t.primary : t.border,
                color: t.text,
              }}
              className="p-2.5 rounded-xl border text-left flex items-start gap-2 transition-all cursor-pointer"
            >
              <div
                style={{
                  backgroundColor: ativo ? t.primary : t.cardSubtle,
                  color: ativo ? "#fff" : t.primary,
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              >
                <Icon size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold leading-tight truncate">
                  {op.label}
                </p>
                {!compact && (
                  <p
                    style={{ color: t.textSoft }}
                    className="text-[10px] leading-snug line-clamp-2 mt-0.5"
                  >
                    {op.desc}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Instrução personalizada + Pasta do Segundo Cérebro + Botão de Ação */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
        <input
          value={instrucaoCustom}
          onChange={(e) => setInstrucaoCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleExecutar();
            }
          }}
          placeholder={
            intencaoSelecionada === "guardar"
              ? "Título ou observação opcional para salvar com o arquivo..."
              : "Instrução opcional (ex: 'Importa só os eventos de sexta', 'Cadastra na conta Nubank', 'Cria tarefas p/ hoje')..."
          }
          style={{
            backgroundColor: t.card,
            color: t.text,
            borderColor: t.border,
          }}
          className="flex-1 px-3 py-2 rounded-xl border text-xs outline-none"
        />

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {intencaoSelecionada !== "guardar" && (
            <label
              className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer select-none px-2 py-1.5 rounded-xl border"
              style={{
                backgroundColor: t.card,
                borderColor: t.border,
                color: t.textSoft,
              }}
              title="Salvar também o arquivo original no Segundo Cérebro"
            >
              <input
                type="checkbox"
                checked={guardarCopia}
                onChange={(e) => setGuardarCopia(e.target.checked)}
                className="rounded"
              />
              <span>Guardar cópia em:</span>
            </label>
          )}

          {(intencaoSelecionada === "guardar" || guardarCopia) && (
            <select
              value={pastaDestino}
              onChange={(e) =>
                setPastaDestino(e.target.value as ArquivoRepositorio["area"])
              }
              style={{
                backgroundColor: t.card,
                color: t.text,
                borderColor: t.border,
              }}
              className="px-2.5 py-2 rounded-xl text-xs font-bold outline-none border"
              title="Pasta no Segundo Cérebro"
            >
              <option value="Pessoal">Pasta: Pessoal</option>
              <option value="UERJ">Pasta: Estudos / UERJ</option>
              <option value="CDT & RCR">Pasta: Trabalho / Projetos</option>
              <option value="Casa & Pets">Pasta: Casa, Dieta & Pets</option>
              <option value="Finanças">Pasta: Finanças & Recibos</option>
              <option value="Artigos">Pasta: Artigos & Leituras</option>
            </select>
          )}

          <button
            type="button"
            onClick={handleExecutar}
            style={{
              backgroundColor:
                intencaoSelecionada === "guardar" ? t.action : t.primary,
              color: "#fff",
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>
              {intencaoSelecionada === "guardar"
                ? "Guardar Arquivo"
                : `Importar: ${opcaoAtiva.label.split("(")[0].replace("Importar ", "").trim()}`}
            </span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
