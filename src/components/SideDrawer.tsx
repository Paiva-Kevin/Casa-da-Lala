import React, { useState } from "react";
import {
  X,
  Home,
  Calendar,
  PawPrint,
  GraduationCap,
  Wallet,
  FolderOpen,
  Sun,
  Moon,
  ShieldAlert,
  Plus,
  ExternalLink,
  FileText,
  Table2,
  Pin,
  Trash2,
  HeartPulse,
  BookOpen,
  Sparkles,
  SlidersHorizontal,
  Paperclip,
  Download,
} from "lucide-react";
import {
  ArquivoRepositorio,
  Compromisso,
  StatusLeitura,
  TabId,
  ThemeMode,
  ThemeTokens,
} from "../types/lala";
import { formatarTamanhoBytes, lerArquivoParaAnexo } from "../services/lalaEngine";

export interface SideDrawerProps {
  t: ThemeTokens;
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
  open: boolean;
  onClose: () => void;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  openPlanilha: () => void;
  repositorio: ArquivoRepositorio[];
  setRepositorio: React.Dispatch<React.SetStateAction<ArquivoRepositorio[]>>;
  compromissos: Compromisso[];
  setCompromissos: React.Dispatch<React.SetStateAction<Compromisso[]>>;
  abrirCalibracao?: () => void;
}

const STATUS_LEITURA_OPCOES: StatusLeitura[] = [
  "Para Ler",
  "Lendo",
  "Concluído",
];

export function SideDrawer({
  t,
  themeMode,
  setThemeMode,
  open,
  onClose,
  activeTab,
  setActiveTab,
  openPlanilha,
  repositorio,
  setRepositorio,
  abrirCalibracao,
}: SideDrawerProps) {
  const [secaoMenu, setSecaoMenu] = useState<"arquivos" | "nav">("arquivos");
  const [novoArquivoTitulo, setNovoArquivoTitulo] = useState("");
  const [novoArquivoConteudo, setNovoArquivoConteudo] = useState("");
  const [novoArquivoArea, setNovoArquivoArea] =
    useState<ArquivoRepositorio["area"]>("UERJ");
  const [novoArquivoStatus, setNovoArquivoStatus] =
    useState<StatusLeitura>("Para Ler");
  const fileRepoInputRef = React.useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const handleUploadDiretoRepositorio = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const lido = await lerArquivoParaAnexo(file, "guardar", novoArquivoArea);
      const isImg = lido.mimeType.startsWith("image/");
      const novo: ArquivoRepositorio = {
        id: Date.now(),
        titulo: novoArquivoTitulo.trim() || lido.nome,
        area: novoArquivoArea,
        tipo: isImg ? "Imagem / Foto" : "PDF / Doc",
        urlOuConteudo:
          novoArquivoConteudo.trim() ||
          lido.textoExtraido?.slice(0, 240) ||
          `Arquivo salvo (${formatarTamanhoBytes(lido.tamanhoBytes)})`,
        dataCriacao: "Hoje",
        fixado: true,
        statusLeitura: novoArquivoStatus,
        anexoBase64: lido.base64,
        mimeType: lido.mimeType,
        nomeArquivoOriginal: lido.nome,
        tamanhoBytes: lido.tamanhoBytes,
      };
      setRepositorio((prev) => [novo, ...prev]);
      setNovoArquivoTitulo("");
      setNovoArquivoConteudo("");
    } finally {
      e.target.value = "";
    }
  };

  const navItems: {
    id: TabId;
    label: string;
    sub: string;
    icon: React.ElementType;
  }[] = [
    {
      id: "inicio",
      label: "Início (Planeador, Foco, Timeline & Hábitos)",
      sub: "Planeador diário, foco imersivo, timeline proporcional e hábitos",
      icon: Home,
    },
    {
      id: "governanta_lala",
      label: "Lala",
      sub: "Fale por voz ou texto: comandos, gastos, devaneios, desabafos e dúvidas",
      icon: Sparkles,
    },
    {
      id: "calendario",
      label: "Calendário Mensal & Semanal",
      sub: "Visão consolidada: Aulas UERJ, Vacinas Pet, Vencimentos e Eventos",
      icon: Calendar,
    },
    {
      id: "estudos_trabalho",
      label: "Estudos & Trabalho",
      sub: "Graduação UERJ, artigos científicos, leituras e projetos CDT/RCR",
      icon: GraduationCap,
    },
    {
      id: "casa_rotinas",
      label: "Casa & Pets",
      sub: "Organização da casa, compras, ambientes e Nina/Tobias",
      icon: PawPrint,
    },
    {
      id: "saude_pets",
      label: "Saúde & Corpo",
      sub: "Treinos ao vivo, dieta, prontidão e bem-estar pessoal",
      icon: HeartPulse,
    },
    {
      id: "financas",
      label: "Finanças",
      sub: "Dinheiro livre hoje, orçamento mensal, contas e cartões",
      icon: Wallet,
    },
  ];

  const adicionarArquivo = () => {
    if (!novoArquivoTitulo.trim()) return;
    const novo: ArquivoRepositorio = {
      id: Date.now(),
      titulo: novoArquivoTitulo.trim(),
      area: novoArquivoArea,
      tipo: novoArquivoConteudo.startsWith("http")
        ? "Link Externo"
        : "Nota Rápida",
      urlOuConteudo:
        novoArquivoConteudo.trim() || "Nota registrada no Segundo Cérebro",
      dataCriacao: "Hoje",
      fixado: false,
      statusLeitura: novoArquivoStatus,
    };
    setRepositorio((prev) => [novo, ...prev]);
    setNovoArquivoTitulo("");
    setNovoArquivoConteudo("");
  };

  const ciclarStatusLeitura = (id: number) => {
    setRepositorio((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const atual = a.statusLeitura || "Para Ler";
        const proxIdx =
          (STATUS_LEITURA_OPCOES.indexOf(atual) + 1) %
          STATUS_LEITURA_OPCOES.length;
        return { ...a, statusLeitura: STATUS_LEITURA_OPCOES[proxIdx] };
      })
    );
  };

  const getCorStatusLeitura = (st?: StatusLeitura) => {
    if (st === "Concluído") return t.primary;
    if (st === "Lendo") return t.action;
    return t.finance;
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 backdrop-blur-xs"
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={onClose}
      />

      <aside
        className="relative w-[90%] max-w-[390px] h-full flex flex-col overflow-hidden shadow-2xl z-10"
        style={{ background: t.card, color: t.text }}
      >
        <div
          className="px-5 pt-5 pb-4 border-b flex items-center justify-between"
          style={{ borderColor: t.border }}
        >
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: t.action }}
            >
              Segundo Cérebro · Casa da Lala
            </p>
            <h2 className="text-base font-bold" style={{ color: t.text }}>
              Repositório, Calendário & Tema
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: t.cardSubtle }}
            aria-label="Fechar menu lateral"
          >
            <X size={18} style={{ color: t.textSoft }} />
          </button>
        </div>

        {/* Seletor de Tema (Claro, Escuro, Survival/SOS) */}
        <div className="px-4 pt-3 pb-2">
          <div
            className="grid grid-cols-3 gap-1 p-1 rounded-2xl"
            style={{ background: t.cardSubtle }}
          >
            <button
              onClick={() => setThemeMode("light")}
              className="py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
              style={{
                background: themeMode === "light" ? t.card : "transparent",
                color: themeMode === "light" ? t.text : t.textSoft,
              }}
            >
              <Sun size={13} /> Claro
            </button>
            <button
              onClick={() => setThemeMode("dark")}
              className="py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
              style={{
                background: themeMode === "dark" ? t.card : "transparent",
                color: themeMode === "dark" ? t.text : t.textSoft,
              }}
            >
              <Moon size={13} /> Escuro
            </button>
            <button
              onClick={() => setThemeMode("survival")}
              className="py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
              style={{
                background: themeMode === "survival" ? t.danger : "transparent",
                color: themeMode === "survival" ? "#fff" : t.textSoft,
              }}
            >
              <ShieldAlert size={13} /> SOS
            </button>
          </div>
        </div>

        {/* Abas Internas do SideDrawer */}
        <div
          className="px-4 py-2 flex gap-1.5 border-b"
          style={{ borderColor: t.border }}
        >
          {(
            [
              { id: "arquivos", label: "Segundo Cérebro", icon: FolderOpen },
              { id: "nav", label: "Navegação & Calendário", icon: Calendar },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => setSecaoMenu(s.id)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              style={{
                background: secaoMenu === s.id ? t.action : t.cardSubtle,
                color: secaoMenu === s.id ? "#fff" : t.textSoft,
              }}
            >
              <s.icon size={13} />
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {secaoMenu === "nav" && (
            <>
              <div className="space-y-2">
                {navItems.map((item) => {
                  const ativo = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        onClose();
                      }}
                      className="w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-colors cursor-pointer"
                      style={{
                        background: ativo ? t.cardSubtle : "transparent",
                        border: `1px solid ${ativo ? t.action : t.border}`,
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: ativo ? t.action : t.cardSubtle,
                          color: ativo ? "#fff" : t.text,
                        }}
                      >
                        <item.icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-xs font-bold"
                          style={{ color: t.text }}
                        >
                          {item.label}
                        </p>
                        <p
                          className="text-[11px] truncate"
                          style={{ color: t.textSoft }}
                        >
                          {item.sub}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  onClose();
                  openPlanilha();
                }}
                className="w-full p-3.5 rounded-2xl flex items-center justify-between border cursor-pointer"
                style={{ background: t.cardSubtle, borderColor: t.border }}
              >
                <div className="flex items-center gap-2.5">
                  <Table2 size={17} style={{ color: t.finance }} />
                  <div className="text-left">
                    <p
                      className="text-xs font-semibold"
                      style={{ color: t.text }}
                    >
                      Planilha Lala_Memoria_Base
                    </p>
                    <p className="text-[11px]" style={{ color: t.textSoft }}>
                      Inspecionar ou exportar CSV completo
                    </p>
                  </div>
                </div>
                <ExternalLink size={14} style={{ color: t.textSoft }} />
              </button>
            </>
          )}

          {secaoMenu === "arquivos" && (
            <div className="space-y-3">
              {/* Card Destacado da Governanta Lala no Menu Lateral */}
              <button
                onClick={() => {
                  setActiveTab("governanta_lala");
                  onClose();
                }}
                className="w-full p-3.5 rounded-2xl flex items-center justify-between border cursor-pointer shadow-xs"
                style={{
                  background: `linear-gradient(135deg, ${t.primary}20, ${t.action}18)`,
                  borderColor: t.primary,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    style={{ backgroundColor: t.primary, color: "#fff" }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  >
                    <Sparkles size={17} />
                  </div>
                  <div className="text-left">
                    <p
                      className="text-xs font-bold"
                      style={{ color: t.text }}
                    >
                      Lala
                    </p>
                    <p className="text-[11px]" style={{ color: t.textSoft }}>
                      Voz, comandos rápidos, devaneios, desabafo e orientação
                    </p>
                  </div>
                </div>
                <ExternalLink size={14} style={{ color: t.primary }} />
              </button>

              {/* Botão de Calibrar Informações & Upar Dieta/Grade */}
              {abrirCalibracao && (
                <button
                  onClick={() => {
                    onClose();
                    abrirCalibracao();
                  }}
                  className="w-full p-3.5 rounded-2xl flex items-center justify-between border cursor-pointer"
                  style={{
                    background: `${t.finance}15`,
                    borderColor: t.finance,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <SlidersHorizontal size={17} style={{ color: t.finance }} />
                    <div className="text-left">
                      <p
                        className="text-xs font-bold"
                        style={{ color: t.text }}
                      >
                        Calibrar Informações & Upar Arquivos
                      </p>
                      <p className="text-[11px]" style={{ color: t.textSoft }}>
                        Dieta → Lista de Compras, Grade UERJ, Contas e Pets
                      </p>
                    </div>
                  </div>
                  <ExternalLink size={14} style={{ color: t.finance }} />
                </button>
              )}

              {/* Atalho Rápido para Abrir o Calendário */}
              <button
                onClick={() => {
                  setActiveTab("calendario");
                  onClose();
                }}
                className="w-full p-3.5 rounded-2xl flex items-center justify-between border cursor-pointer"
                style={{ background: `${t.action}14`, borderColor: t.action }}
              >
                <div className="flex items-center gap-2.5">
                  <Calendar size={17} style={{ color: t.action }} />
                  <div className="text-left">
                    <p
                      className="text-xs font-bold"
                      style={{ color: t.text }}
                    >
                      Abrir Calendário Mensal & Semanal
                    </p>
                    <p className="text-[11px]" style={{ color: t.textSoft }}>
                      Aulas UERJ, Vacinas Pet, Vencimentos e Eventos
                    </p>
                  </div>
                </div>
                <ExternalLink size={14} style={{ color: t.action }} />
              </button>

              <button
                onClick={() => {
                  onClose();
                  openPlanilha();
                }}
                className="w-full p-3.5 rounded-2xl flex items-center justify-between border cursor-pointer"
                style={{ background: t.cardSubtle, borderColor: t.border }}
              >
                <div className="flex items-center gap-2.5">
                  <Table2 size={17} style={{ color: t.finance }} />
                  <div className="text-left">
                    <p
                      className="text-xs font-semibold"
                      style={{ color: t.text }}
                    >
                      Exportar Planilha Lala_Memoria_Base (CSV)
                    </p>
                    <p className="text-[11px]" style={{ color: t.textSoft }}>
                      Sincronizada em tempo real com todas as abas
                    </p>
                  </div>
                </div>
                <ExternalLink size={14} style={{ color: t.textSoft }} />
              </button>

              <div
                className="p-3.5 rounded-2xl space-y-2 border"
                style={{ background: t.cardSubtle, borderColor: t.border }}
              >
                <p className="text-xs font-semibold" style={{ color: t.text }}>
                  Guardar documento, artigo ou protocolo no Segundo Cérebro
                </p>
                <input
                  value={novoArquivoTitulo}
                  onChange={(e) => setNovoArquivoTitulo(e.target.value)}
                  placeholder="Título (ex: Slides Fisiologia P1, Protocolo Vet)..."
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                  style={{ background: t.card, color: t.text }}
                />
                <input
                  value={novoArquivoConteudo}
                  onChange={(e) => setNovoArquivoConteudo(e.target.value)}
                  placeholder="Link (https://...) ou resumo rápido..."
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                  style={{ background: t.card, color: t.text }}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={novoArquivoArea}
                    onChange={(e) =>
                      setNovoArquivoArea(
                        e.target.value as ArquivoRepositorio["area"]
                      )
                    }
                    className="px-2.5 py-1.5 rounded-xl text-xs outline-none"
                    style={{ background: t.card, color: t.text }}
                  >
                    <option value="UERJ">UERJ</option>
                    <option value="Artigos">Artigos</option>
                    <option value="CDT & RCR">CDT & RCR</option>
                    <option value="Casa & Pets">Casa & Pets</option>
                    <option value="Finanças">Finanças</option>
                    <option value="Pessoal">Pessoal</option>
                  </select>

                  <select
                    value={novoArquivoStatus}
                    onChange={(e) =>
                      setNovoArquivoStatus(e.target.value as StatusLeitura)
                    }
                    className="px-2.5 py-1.5 rounded-xl text-xs outline-none"
                    style={{ background: t.card, color: t.text }}
                  >
                    {STATUS_LEITURA_OPCOES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  ref={fileRepoInputRef}
                  type="file"
                  accept="image/*,.pdf,.txt,.csv,.md,.json,.doc,.docx"
                  onChange={handleUploadDiretoRepositorio}
                  className="hidden"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => fileRepoInputRef.current?.click()}
                    className="py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border cursor-pointer"
                    style={{
                      background: `${t.primary}15`,
                      color: t.primary,
                      borderColor: `${t.primary}40`,
                    }}
                  >
                    <Paperclip size={13} /> Subir Arquivo/Foto
                  </button>
                  <button
                    onClick={adicionarArquivo}
                    className="py-2 px-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1 cursor-pointer"
                    style={{ background: t.action }}
                  >
                    <Plus size={13} /> Guardar Nota/Link
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {repositorio.map((arq) => {
                  const stLeitura = arq.statusLeitura || "Para Ler";
                  const corSt = getCorStatusLeitura(stLeitura);
                  return (
                    <div
                      key={arq.id}
                      className="p-3 rounded-2xl border space-y-1.5"
                      style={{ background: t.bg, borderColor: t.border }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <FileText size={13} style={{ color: t.action }} />
                          <span
                            className="text-[10px] font-semibold"
                            style={{ color: t.textSoft }}
                          >
                            {arq.area} · {arq.dataCriacao}
                          </span>
                          <button
                            onClick={() => ciclarStatusLeitura(arq.id)}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            style={{
                              background: `${corSt}18`,
                              color: corSt,
                            }}
                            title="Toque para alternar status de leitura"
                          >
                            <BookOpen size={10} />
                            {stLeitura}
                          </button>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {arq.anexoBase64 && (
                            <a
                              href={arq.anexoBase64}
                              download={arq.nomeArquivoOriginal || arq.titulo}
                              className="p-1 cursor-pointer"
                              style={{ color: t.primary }}
                              title="Baixar arquivo"
                            >
                              <Download size={12} />
                            </a>
                          )}
                          <button
                            onClick={() =>
                              setRepositorio((prev) =>
                                prev.map((a) =>
                                  a.id === arq.id
                                    ? { ...a, fixado: !a.fixado }
                                    : a
                                )
                              )
                            }
                            className="p-1 cursor-pointer"
                            title="Fixar"
                          >
                            <Pin
                              size={12}
                              style={{
                                color: arq.fixado ? t.action : t.textSoft,
                              }}
                            />
                          </button>
                          <button
                            onClick={() =>
                              setRepositorio((prev) =>
                                prev.filter((a) => a.id !== arq.id)
                              )
                            }
                            className="p-1 cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 size={12} style={{ color: t.textSoft }} />
                          </button>
                        </div>
                      </div>
                      {arq.anexoBase64 && arq.mimeType?.startsWith("image/") && (
                        <img
                          src={arq.anexoBase64}
                          alt={arq.titulo}
                          className="w-full max-h-36 object-cover rounded-xl border my-1"
                          style={{ borderColor: t.border }}
                        />
                      )}
                      <p
                        className="text-xs font-semibold"
                        style={{ color: t.text }}
                      >
                        {arq.titulo}
                      </p>
                      <p
                        className="text-[11px] leading-relaxed"
                        style={{ color: t.textSoft }}
                      >
                        {arq.urlOuConteudo}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
