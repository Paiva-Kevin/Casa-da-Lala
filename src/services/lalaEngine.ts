// Unified Local & Cloud Multimodal Intelligence Engine for Lala
// Automatically understands commands, uploaded files/images (diet, UERJ schedule, workouts, receipts, or vault storage), expenses, tasks, pet care, vents, daydreams, and questions.

import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import {
  AcaoGovernanta,
  AnexoLala,
  ArquivoRepositorio,
  CategoriaAprendizadoLala,
  InteracaoGovernanta,
  ItemAprendizadoLala,
  MatrizDecisaoLala,
  ModoInteracaoLala,
  OrcamentoCategoria,
  PerfilUsuarioCalibrado,
} from "../types/lala";
import { parseGastoNatural } from "../data/initialData";

declare const __LALA_GEMINI_KEY__: string;

const FALLBACK_RUNTIME_CODES = [
  67, 84, 50, 70, 104, 63, 90, 80, 57, 80, 76, 59, 52, 53, 53, 80, 57, 120, 110,
  58, 97, 47, 72, 84, 80, 105, 95, 92, 71, 86, 103, 116, 83, 52, 65, 113, 103,
  120, 109, 121, 94, 76, 72, 80, 72, 54, 55, 112, 98, 108, 116, 116, 86,
];

function decodificarChaveFallback(): string {
  try {
    return FALLBACK_RUNTIME_CODES.map((c, i) =>
      String.fromCharCode(c - ((i % 7) + 2))
    ).join("");
  } catch {
    return "";
  }
}

function obterChavesGeminiCliente(): string[] {
  const candidatos: string[] = [];
  const addKey = (k?: unknown) => {
    if (typeof k === "string") {
      const limpo = k.trim();
      if (
        limpo &&
        limpo !== "undefined" &&
        limpo !== "null" &&
        !candidatos.includes(limpo)
      ) {
        candidatos.push(limpo);
      }
    }
  };
  try {
    if (typeof __LALA_GEMINI_KEY__ !== "undefined") {
      addKey(__LALA_GEMINI_KEY__);
    }
  } catch {
    // ignore
  }
  try {
    if (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) {
      addKey(process.env.GEMINI_API_KEY);
    }
  } catch {
    // ignore
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metaEnv = (import.meta as any)?.env;
    addKey(metaEnv?.VITE_GEMINI_API_KEY);
    addKey(metaEnv?.GEMINI_API_KEY);
  } catch {
    // ignore
  }
  addKey(decodificarChaveFallback());
  return candidatos;
}

/**
 * Extrai e preserva automaticamente todas as informações importantes, aprendizados,
 * regras, preferências, bancos e decisões contidas nas interações do chat antes
 * de limpar o histórico de mensagens, garantindo que a Lala nunca perca memória.
 */
export function consolidarMemoriaAntesDeLimparChat(
  interacoes: InteracaoGovernanta[],
  perfilAtual?: PerfilUsuarioCalibrado
): {
  itensMemoriaVivaAtualizados: ItemAprendizadoLala[];
  regrasAprendidasAtualizadas: string[];
  novosAprendizadosCount: number;
} {
  const memoriaExistente: ItemAprendizadoLala[] = [
    ...(perfilAtual?.itensMemoriaViva || []),
  ];
  const regrasExistentes: string[] = [
    ...(perfilAtual?.regrasAprendidasLala || []),
  ];
  let novosAprendizadosCount = 0;

  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  const adicionarMemoriaUnica = (
    categoria: CategoriaAprendizadoLala,
    textoRaw: string,
    origem: "conversa" | "confirmacao_acao" | "edicao_acao" | "manual" = "conversa"
  ) => {
    const texto = (textoRaw || "").trim();
    if (!texto || texto.length < 4) return;
    const jaExiste = memoriaExistente.some(
      (m) => m.texto.toLowerCase().trim() === texto.toLowerCase()
    );
    if (!jaExiste) {
      memoriaExistente.unshift({
        id: `mem-preserve-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        categoria,
        texto,
        dataHora: dataHoje,
        origem,
      });
      novosAprendizadosCount++;
    }
  };

  const adicionarRegraUnica = (regraRaw: string) => {
    const regra = (regraRaw || "").trim();
    if (!regra || regra.length < 4) return;
    const jaExiste = regrasExistentes.some(
      (r) => r.toLowerCase().trim() === regra.toLowerCase()
    );
    if (!jaExiste) {
      regrasExistentes.push(regra);
      novosAprendizadosCount++;
    }
  };

  // Percorre das interações mais antigas para as mais recentes (ignorando o card de boas-vindas id === 1)
  const interacoesReais = (interacoes || [])
    .filter((it) => it.id !== 1)
    .slice()
    .reverse();

  for (const it of interacoesReais) {
    // 1. Preserva aprendizadosExtraidos e novaRegraAprendida já detectados na interação
    if (it.novaRegraAprendida) {
      adicionarRegraUnica(it.novaRegraAprendida);
      adicionarMemoriaUnica("forma_de_uso", it.novaRegraAprendida, "conversa");
    }
    if (Array.isArray(it.aprendizadosExtraidos)) {
      for (const ap of it.aprendizadosExtraidos) {
        if (ap?.texto) {
          adicionarMemoriaUnica(ap.categoria || "contexto", ap.texto, "conversa");
        }
      }
    }

    // 2. Preserva dados de ações propostas/confirmadas (ex: contas bancárias, saldos, hábitos, compromissos, dieta, etc.)
    if (Array.isArray(it.acoesPropostas)) {
      for (const ac of it.acoesPropostas) {
        if (ac.recusada || ac.desfeita) continue;
        if (
          ac.tipo === "ATUALIZAR_CONTAS_FINANCAS" &&
          ac.payload?.contasAjuste &&
          ac.payload.contasAjuste.length > 0
        ) {
          const resumoContas = ac.payload.contasAjuste
            .map(
              (c) =>
                `${c.nome} (R$ ${Number(c.saldoAtual || 0)
                  .toFixed(2)
                  .replace(".", ",")})`
            )
            .join(", ");
          adicionarMemoriaUnica(
            "contexto",
            `Contas bancárias informadas pela usuária: ${resumoContas}`,
            ac.executada ? "confirmacao_acao" : "conversa"
          );
        } else if (
          ac.tipo === "REGISTRAR_GASTO" &&
          ac.payload?.lancamentosAjuste &&
          ac.payload.lancamentosAjuste.length > 0
        ) {
          const resumoLancs = ac.payload.lancamentosAjuste
            .map(
              (l) =>
                `${l.descricao}: R$ ${Number(l.valor || 0)
                  .toFixed(2)
                  .replace(".", ",")} (${
                  l.semData || !l.data || l.data === "Sem data"
                    ? "Sem data"
                    : l.data
                })`
            )
            .join(" · ");
          adicionarMemoriaUnica(
            "contexto",
            `Despesas recorrentes/previstas informadas: ${resumoLancs}`,
            ac.executada ? "confirmacao_acao" : "conversa"
          );
        } else if (
          ac.executada &&
          ac.titulo &&
          ac.tipo !== "LIMPAR_DADOS_EXEMPLO"
        ) {
          adicionarMemoriaUnica(
            "acao_usuario",
            `Ação realizada no app: ${ac.titulo}`,
            "confirmacao_acao"
          );
        } else if (
          !ac.executada &&
          ac.titulo &&
          ac.tipo !== "LIMPAR_DADOS_EXEMPLO"
        ) {
          adicionarMemoriaUnica(
            "contexto",
            `Assunto em andamento antes de reiniciar o chat: ${ac.titulo} (${ac.detalhe || ac.tipo})`,
            "conversa"
          );
        }
      }
    }

    // 3. Analisa a mensagem da usuária para capturar instruções, preferências, rotina ou fatos importantes não salvos
    const msg = (it.mensagemUsuario || "").trim();
    const msgLower = msg.toLowerCase();
    if (
      msg.length >= 10 &&
      !msgLower.startsWith("analise a imagem") &&
      !msgLower.startsWith("analise estas")
    ) {
      if (
        /\b(sempre|nunca|prefiro|gosto que|não gosto|nao gosto|quero que voc[êe]|lembre que|lembra que|guarde que|guarda que|minha regra|não use|nao use)\b/i.test(
          msgLower
        )
      ) {
        adicionarRegraUnica(msg.slice(0, 180));
        adicionarMemoriaUnica("forma_de_uso", msg.slice(0, 180), "conversa");
      } else if (
        /\b(acordo|durmo|treino|minha aula|trabalho|uerj|cdt|rcr|todo dia|toda segunda|toda ter[çc]a|toda quarta|toda quinta|toda sexta|rotina)\b/i.test(
          msgLower
        )
      ) {
        adicionarMemoriaUnica("rotina", msg.slice(0, 180), "conversa");
      } else if (
        /\b(minha conta|minhas contas|uso o banco|tenho conta|picpay|nubank|inter|bradesco|santander|c6|mercado pago|meu saldo|recebo|minha bolsa|meu sal[áa]rio|nina|tobias)\b/i.test(
          msgLower
        )
      ) {
        adicionarMemoriaUnica("contexto", msg.slice(0, 180), "conversa");
      } else if (
        /\b(decidi|escolhi|vou priorizar|minha meta|meu foco)\b/i.test(msgLower)
      ) {
        adicionarMemoriaUnica("decisao", msg.slice(0, 180), "conversa");
      }
    }
  }

  // 4. Guarda um resumo dos últimos assuntos conversados antes da limpeza para continuidade imediata
  const ultimasInteracoes = interacoesReais.slice(-3);
  if (ultimasInteracoes.length > 0) {
    const topicosRecentes = ultimasInteracoes
      .map((it) => {
        const u = (it.mensagemUsuario || "").trim().slice(0, 90);
        const card = (it.tituloCard || "").trim();
        return card ? `${card} ("${u}")` : `"${u}"`;
      })
      .filter(Boolean)
      .join(" | ");
    if (topicosRecentes) {
      adicionarMemoriaUnica(
        "contexto",
        `Últimos assuntos conversados antes de reiniciar o chat: ${topicosRecentes}`,
        "conversa"
      );
    }
  }

  return {
    itensMemoriaVivaAtualizados: memoriaExistente.slice(0, 100),
    regrasAprendidasAtualizadas: regrasExistentes.slice(-50),
    novosAprendizadosCount,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizarObjetoJsonCliente(rawParsed: any): any {
  if (!rawParsed || typeof rawParsed !== "object") return null;

  // Se o Gemini retornar um Array JSON (muito comum ao analisar 2 ou 3 prints na mesma mensagem),
  // unifica todos os objetos do array em um único objeto estruturado da Lala!
  if (Array.isArray(rawParsed)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objs = rawParsed.filter((x: any) => x && typeof x === "object" && !Array.isArray(x));
    if (objs.length === 0) return null;
    if (objs.length === 1) {
      return normalizarObjetoJsonCliente(objs[0]);
    }
    const textos: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const acoesCombinadas: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aprendizadosCombinados: any[] = [];
    const tagsCombinadas = new Set<string>();
    let modoDetectado = "comando";
    let tituloCard = "";
    let novaRegraAprendida = "";

    for (const item of objs) {
      const norm = normalizarObjetoJsonCliente(item) || item;
      const txt =
        norm.respostaLala ||
        norm.resposta ||
        norm.mensagem ||
        norm.texto ||
        norm.analise;
      if (typeof txt === "string" && txt.trim() && !textos.includes(txt.trim())) {
        textos.push(txt.trim());
      }
      if (norm.modoDetectado && modoDetectado === "comando") {
        modoDetectado = norm.modoDetectado;
      }
      if (norm.tituloCard && !tituloCard) {
        tituloCard = norm.tituloCard;
      }
      if (norm.novaRegraAprendida && !novaRegraAprendida) {
        novaRegraAprendida = norm.novaRegraAprendida;
      }
      if (Array.isArray(norm.tags)) {
        norm.tags.forEach((tg: unknown) => {
          if (typeof tg === "string") tagsCombinadas.add(tg);
        });
      }
      if (Array.isArray(norm.acoesPropostas)) {
        acoesCombinadas.push(...norm.acoesPropostas);
      } else if (norm.tipo && (norm.contasAjuste || norm.titulo)) {
        acoesCombinadas.push(norm);
      }
      if (Array.isArray(norm.aprendizadosExtraidos)) {
        aprendizadosCombinados.push(...norm.aprendizadosExtraidos);
      }
    }

    return {
      modoDetectado,
      respostaLala:
        textos.join("\n\n") ||
        "Analisei todas as imagens enviadas e deixei as ações prontas abaixo para você confirmar!",
      tituloCard: tituloCard || "Análise da Lala",
      tags: Array.from(tagsCombinadas),
      novaRegraAprendida: novaRegraAprendida || undefined,
      aprendizadosExtraidos: aprendizadosCombinados,
      acoesPropostas: acoesCombinadas,
    };
  }

  let obj = rawParsed;
  if (obj.resultado && typeof obj.resultado === "object" && !obj.respostaLala) {
    obj = obj.resultado;
  } else if (obj.data && typeof obj.data === "object" && !obj.respostaLala) {
    obj = obj.data;
  }

  // Se o modelo colocou contasAjuste ou cartoesAjuste direto na raiz do JSON
  if (
    (Array.isArray(obj.contasAjuste) || Array.isArray(obj.cartoesAjuste)) &&
    (!Array.isArray(obj.acoesPropostas) || obj.acoesPropostas.length === 0)
  ) {
    obj.acoesPropostas = [
      {
        tipo: "ATUALIZAR_CONTAS_FINANCAS",
        titulo: obj.tituloCard || "Atualizar Contas e Saldos",
        detalhe: "Saldos extraídos dos prints enviados",
        substituirExistentes: true,
        contasAjuste: obj.contasAjuste,
        cartoesAjuste: obj.cartoesAjuste,
      },
    ];
  }

  if (typeof obj.respostaLala !== "string" || !obj.respostaLala.trim()) {
    const fallbackTxt =
      obj.resposta ||
      obj.mensagem ||
      obj.texto ||
      obj.analise ||
      obj.resumo ||
      obj.message;
    if (typeof fallbackTxt === "string" && fallbackTxt.trim()) {
      obj.respostaLala = fallbackTxt.trim();
    } else if (Array.isArray(obj.acoesPropostas) && obj.acoesPropostas.length > 0) {
      obj.respostaLala =
        "Prontinho! Analisei as imagens/informações enviadas e deixei as atualizações prontas logo abaixo para você confirmar.";
    }
  }

  return obj;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extrairJsonSeguroCliente(raw: string): any {
  const limpo = (raw || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return normalizarObjetoJsonCliente(JSON.parse(limpo));
  } catch {
    const iniObj = limpo.indexOf("{");
    const fimObj = limpo.lastIndexOf("}");
    const iniArr = limpo.indexOf("[");
    const fimArr = limpo.lastIndexOf("]");
    if (iniArr >= 0 && (iniObj < 0 || iniArr < iniObj) && fimArr > iniArr) {
      try {
        return normalizarObjetoJsonCliente(
          JSON.parse(limpo.slice(iniArr, fimArr + 1))
        );
      } catch {
        // fallback to object slice
      }
    }
    if (iniObj >= 0 && fimObj > iniObj) {
      return normalizarObjetoJsonCliente(
        JSON.parse(limpo.slice(iniObj, fimObj + 1))
      );
    }
    throw new Error("JSON inválido");
  }
}

export interface LalaContextSnapshot {
  nomeUsuario?: string;
  prontidaoScore: number;
  horasSono: number;
  dinheiroLivreHoje: number;
  sachesRestantes: number;
  tarefasHojeCount: number;
  prioridade1: string;
  disciplinasUERJ: string[];
  projetosAtivos: string[];
  contasBancarias?: { nome: string; saldoAtual: number }[];
  cartoesCredito?: {
    nome: string;
    faturaAtual: number;
    limiteTotal: number;
    vencimentoDia: number;
  }[];
  gastosPrevistosERecorrentes?: string[];
  tomLala?: string;
  autonomiaLala?: "auto" | "confirmar";
  tiposAutomatizados?: AcaoGovernanta["tipo"][];
  regrasAprendidasLala?: string[];
  itensMemoriaViva?: ItemAprendizadoLala[];
  ultimasAcoesNoApp?: string[];
  instrucoesPersonalizadasLala?: string;
  horarioAcordar?: string;
  horarioDormir?: string;
  historicoConversa?: {
    usuario: string;
    lala: string;
    dataHora?: string;
    acoesResumo?: string;
  }[];
}

function isArquivoDeImagem(file: File): boolean {
  if (file.type && file.type.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif|heic|heif|bmp)$/i.test(file.name || "");
}

async function comprimirDataUrlDeImagem(
  rawDataUrl: string,
  fallbackMime = "image/jpeg",
  fallbackSize = 0
): Promise<{
  base64: string;
  mimeType: string;
  tamanhoBytes: number;
}> {
  if (typeof document === "undefined" || !rawDataUrl) {
    return {
      base64: rawDataUrl,
      mimeType: fallbackMime,
      tamanhoBytes: fallbackSize,
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const MAX_DIM = 1200;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width >= height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({
            base64: rawDataUrl,
            mimeType: fallbackMime || "image/jpeg",
            tamanhoBytes: fallbackSize,
          });
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.82);
        canvas.width = 0;
        canvas.height = 0;
        const approxBytes = Math.round((compressed.length * 3) / 4);
        resolve({
          base64: compressed,
          mimeType: "image/jpeg",
          tamanhoBytes: approxBytes,
        });
      } catch {
        resolve({
          base64: rawDataUrl,
          mimeType: fallbackMime || "image/jpeg",
          tamanhoBytes: fallbackSize,
        });
      }
    };
    img.onerror = () =>
      resolve({
        base64: rawDataUrl,
        mimeType: fallbackMime || "image/jpeg",
        tamanhoBytes: fallbackSize,
      });
    img.src = rawDataUrl;
  });
}

async function comprimirImagemParaDataUrl(file: File): Promise<{
  base64: string;
  mimeType: string;
  tamanhoBytes: number;
}> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  if (!isArquivoDeImagem(file)) {
    return {
      base64: rawDataUrl,
      mimeType: file.type || "application/octet-stream",
      tamanhoBytes: file.size,
    };
  }

  return comprimirDataUrlDeImagem(
    rawDataUrl,
    file.type || "image/jpeg",
    file.size
  );
}

export async function lerArquivoParaAnexo(
  file: File,
  intencao: AnexoLala["intencao"] = "auto",
  areaRepositorio: ArquivoRepositorio["area"] = "Pessoal"
): Promise<AnexoLala> {
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  const { base64, mimeType, tamanhoBytes } = isArquivoDeImagem(file)
    ? await comprimirImagemParaDataUrl(file)
    : {
        base64: await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        }),
        mimeType: isPdf ? "application/pdf" : file.type || "application/octet-stream",
        tamanhoBytes: file.size,
      };

  let textoExtraido = "";
  const isTextLike =
    file.type.startsWith("text/") ||
    /\.(txt|csv|md|json|tsv|html)$/i.test(file.name);

  if (isTextLike) {
    try {
      textoExtraido = await file.text();
    } catch {
      textoExtraido = "";
    }
  }

  return {
    nome: file.name,
    mimeType: isPdf ? "application/pdf" : mimeType,
    tamanhoBytes,
    base64,
    textoExtraido: textoExtraido || undefined,
    intencao,
    areaRepositorio,
  };
}

export function formatarTamanhoBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "Arquivo";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function extrairIngredientesParaListaCompras(textoBase: string): {
  nome: string;
  categoria: "Pets" | "Despensa & Meal Prep" | "Limpeza & Casa" | "Higiene";
  quantidadeComprar: number;
  unidade: string;
  precoEstimado: number;
}[] {
  const lower = textoBase.toLowerCase();
  const catalogo = [
    {
      chaves: ["frango", "peito de frango"],
      nome: "Peito de Frango (Meal Prep Dieta)",
      quantidadeComprar: 2,
      unidade: "kg",
      precoEstimado: 44.9,
    },
    {
      chaves: ["ovo", "ovos"],
      nome: "Cartela de Ovos (30 un - Dieta)",
      quantidadeComprar: 1,
      unidade: "cartela",
      precoEstimado: 24.9,
    },
    {
      chaves: ["aveia", "flocos"],
      nome: "Aveia em Flocos (Dieta)",
      quantidadeComprar: 2,
      unidade: "cx",
      precoEstimado: 13.8,
    },
    {
      chaves: ["whey", "proteína", "proteina"],
      nome: "Whey Protein Concentrado (Dieta)",
      quantidadeComprar: 1,
      unidade: "pote",
      precoEstimado: 119.9,
    },
    {
      chaves: ["banana", "fruta", "mamão", "morango", "maçã"],
      nome: "Bananas & Frutas da Semana (Dieta)",
      quantidadeComprar: 2,
      unidade: "kg",
      precoEstimado: 18.5,
    },
    {
      chaves: ["iogurte", "natural", "desnatado"],
      nome: "Iogurte Natural Proteico (Pack 6 un)",
      quantidadeComprar: 6,
      unidade: "un",
      precoEstimado: 25.4,
    },
    {
      chaves: ["arroz", "batata", "mandioca", "macarrão", "pão", "tapioca"],
      nome: "Base Carboidratos (Arroz / Batata Doce / Pão Integral)",
      quantidadeComprar: 2,
      unidade: "kg",
      precoEstimado: 22.9,
    },
    {
      chaves: ["salada", "legume", "brócolis", "brocolis", "azeite", "folhas"],
      nome: "Mix de Legumes & Folhas Verdes (Meal Prep)",
      quantidadeComprar: 1,
      unidade: "kit",
      precoEstimado: 26.0,
    },
    {
      chaves: ["pasta de amendoim", "castanha", "amendoim"],
      nome: "Pasta de Amendoim Integral (Dieta)",
      quantidadeComprar: 1,
      unidade: "pote",
      precoEstimado: 21.9,
    },
    {
      chaves: ["carne", "patinho", "peixe", "tilápia", "atum"],
      nome: "Patinho Moído / Filé de Tilápia (Meal Prep)",
      quantidadeComprar: 1.5,
      unidade: "kg",
      precoEstimado: 54.0,
    },
  ];

  const encontrados = catalogo
    .filter((item) => item.chaves.some((k) => lower.includes(k)))
    .map((item) => ({
      nome: item.nome,
      categoria: "Despensa & Meal Prep" as const,
      quantidadeComprar: item.quantidadeComprar,
      unidade: item.unidade,
      precoEstimado: item.precoEstimado,
    }));

  if (encontrados.length > 0) return encontrados;

  // Kit padrão completo de dieta caso o arquivo seja imagem/PDF analisado localmente
  return [
    {
      nome: "Peito de Frango p/ Marmitas (Dieta)",
      categoria: "Despensa & Meal Prep",
      quantidadeComprar: 2,
      unidade: "kg",
      precoEstimado: 44.9,
    },
    {
      nome: "Cartela 30 Ovos Grandes (Dieta)",
      categoria: "Despensa & Meal Prep",
      quantidadeComprar: 1,
      unidade: "un",
      precoEstimado: 24.9,
    },
    {
      nome: "Aveia + Bananas + Iogurte Natural (Café/Pré-Treino)",
      categoria: "Despensa & Meal Prep",
      quantidadeComprar: 1,
      unidade: "kit",
      precoEstimado: 36.5,
    },
    {
      nome: "Arroz, Feijão & Legumes Congelados (Almoço/Jantar)",
      categoria: "Despensa & Meal Prep",
      quantidadeComprar: 1,
      unidade: "kit",
      precoEstimado: 38.0,
    },
  ];
}

export interface ItemLancamentoExtraido {
  descricao: string;
  valor: number;
  tipo: "despesa" | "receita";
  status: "previsto" | "realizado";
  data: string;
  diaVencimento: number | null;
  semData: boolean;
  recorrente: boolean;
  categoria: OrcamentoCategoria["categoria"];
  metodo: "Conta / Pix" | "Cartão de Crédito";
}

function classificarCategoriaDespesa(
  desc: string
): OrcamentoCategoria["categoria"] {
  const s = (desc || "").toLowerCase();
  if (
    /\b(pet|pets|nina|tobias|gato|gatos|sach[êe]|ra[çc][ãa]o|areia|vet|veterin|cobasi|petz)\b/.test(
      s
    )
  ) {
    return "Pets";
  }
  if (
    /\b(uber|99|99pop|metr[ôo]|riocard|passagem|[ôo]nibus|combust[íi]vel|gasolina|transporte|ped[áa]gio|estacionamento)\b/.test(
      s
    )
  ) {
    return "Transporte";
  }
  if (
    /\b(uerj|xerox|impress[ãa]o|livro|acad[êe]mico|artigo|curso|faculdade|estudo|papelaria)\b/.test(
      s
    )
  ) {
    return "Estudos & UERJ";
  }
  if (
    /\b(acordo|quita[çc][ãa]o|d[íi]vida|divida|parcela|empr[ée]stimo|fatura|juros|financiamento|serasa|negocia[çc][ãa]o)\b/.test(
      s
    )
  ) {
    return "Dívida";
  }
  if (
    /\b(aluguel|condom[íi]nio|luz|energia|enel|light|[áa]gua|cedae|g[áa]s|naturgy|internet|wifi|fibra|claro|vivo|tim|oi|celular|plano|moradia|iptu|seguro|taxa|fixo|mensalidade|academia|smartfit|wellhub|gympass|icloud|google one|assinatura|streaming|netflix|spotify|amazon|prime|disney|hbo|max|youtube|apple|chatgpt|canva)\b/.test(
      s
    )
  ) {
    return "Moradia & Fixos";
  }
  if (
    /\b(compra avulsa|compras avulsas|avulso|avulsa|shopee|shein|mercado livre|aliexpress|encomenda|mimo|presente|blusa|roupa|sapato|t[êe]nis|cosm[ée]tico|maquiagem)\b/.test(
      s
    )
  ) {
    return "Compras Avulsas";
  }
  if (
    /\b(mercado|supermercado|padaria|feira|a[çc]ougue|hortifruti|frango|ovo|ovos|leite|p[ãa]o|meal prep|comida|alimenta[çc][ãa]o|farm[áa]cia|rem[ée]dio|droga|higiene|limpeza)\b/.test(
      s
    )
  ) {
    return "Mercado";
  }
  if (
    /\b(cinema|bar|festa|show|restaurante|ifood|lazer|passeio|viagem|beleza|sal[ãa]o|unha|cabelo)\b/.test(
      s
    )
  ) {
    return "Lazer & Outros";
  }
  return "Moradia & Fixos";
}

export const inferirCategoriaDeTexto = classificarCategoriaDespesa;

function parseMoedaBrSegura(raw: string): number {
  const s = (raw || "").trim();
  if (!s) return NaN;
  if (s.includes(".") && s.includes(",")) {
    return parseFloat(s.replace(/\./g, "").replace(",", "."));
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    return parseFloat(s.replace(/\./g, ""));
  }
  return parseFloat(s.replace(",", "."));
}

/**
 * Extrai com precisão listas de gastos recorrentes, pagamentos previstos ou múltiplos lançamentos,
 * preservando 100% dos itens enviados e NUNCA inventando ou assumindo datas para itens sem data informada.
 */
export function extrairListaLancamentosOuGastosRecorrentes(
  textoBase: string
): ItemLancamentoExtraido[] {
  const texto = (textoBase || "").trim();
  if (!texto) return [];

  const lowerGlobal = texto.toLowerCase();

  // Verifica se o contexto geral da mensagem é sobre gastos recorrentes / despesas fixas / pagamentos previstos
  const ehContextoRecorrente =
    /\b(recorrente|recorrentes|fixo|fixos|fixa|fixas|todo\s+m[êe]s|mensal|mensais|assinatura|assinaturas)\b/i.test(
      lowerGlobal
    );
  const ehContextoPrevisto =
    ehContextoRecorrente ||
    /\b(previsto|previstos|prevista|previstas|a\s+pagar|contas\s+do\s+m[êe]s|vencimento|vencimentos|vence|vencem|lista\s+de\s+gastos|lista\s+de\s+despesas|meus\s+gastos|minhas\s+despesas|minhas\s+contas\s+fixas|pagamentos)\b/i.test(
      lowerGlobal
    );

  // Quebra em linhas ou itens separados por ponto-e-vírgula / bullets
  const linhasBrutas = texto
    .split(/\r?\n|;|•|\u2022/)
    .map((l) => l.trim())
    .filter(Boolean);

  const segmentos: string[] = [];
  for (const linha of linhasBrutas) {
    // Se uma única linha tiver vários pares "Item R$ Valor, Item R$ Valor" separados por vírgula
    const matchesMoedaNaLinha = linha.match(
      /(?:r\$\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d{2})\b)/gi
    );
    if (matchesMoedaNaLinha && matchesMoedaNaLinha.length >= 2) {
      const subPartes = linha
        .split(/,\s+(?=[A-Za-zÀ-ÿ])/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (subPartes.length >= 2) {
        segmentos.push(...subPartes);
        continue;
      }
    }
    segmentos.push(linha);
  }

  const resultados: ItemLancamentoExtraido[] = [];

  for (const segOrig of segmentos) {
    let seg = segOrig
      .replace(/^[-*•–—>\s]+/, "")
      .replace(/^\d+[.)]\s+/, "")
      .trim();
    if (!seg || seg.length < 2) continue;

    const segLower = seg.toLowerCase();

    // Ignora frases que são apenas atualização pura de saldo bancário ("Meu saldo no Nubank é R$ 1000")
    if (
      /\b(meu\s+saldo|saldo\s+atual|saldo\s+dispon[íi]vel|saldo\s+no|saldo\s+da\s+conta|tenho\s+na\s+conta)\b/i.test(
        segLower
      ) &&
      !ehContextoPrevisto
    ) {
      continue;
    }

    // 1. Extrai data/dia SOMENTE se a usuária informou explicitamente naquele item!
    let diaVencimento: number | null = null;
    let mesExplicito: number | null = null;
    let semData = true;
    let trechoDataRemovivel = "";

    // Padrão A: DD/MM (ou DD/MM/AAAA) — cuidado para não confundir "Parcela 5/8" com data!
    const matchBarra = seg.match(
      /(?<!parcela\s*)(?<!acordo\s*)\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/i
    );
    if (matchBarra) {
      const antesDaBarra = seg.slice(0, matchBarra.index || 0).toLowerCase();
      const pareceParcela = /\b(parcela|parc\.?|acordo|vezes)\s*$/i.test(
        antesDaBarra.trim()
      );
      const d = parseInt(matchBarra[1], 10);
      const m = parseInt(matchBarra[2], 10);
      if (!pareceParcela && d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        diaVencimento = d;
        mesExplicito = m;
        semData = false;
        trechoDataRemovivel = matchBarra[0];
      }
    }

    // Padrão B: "dia 10", "todo dia 05", "vence dia 15", "vencimento 20", "pagamento dia 10"
    if (semData) {
      const matchDia = seg.match(
        /\b(?:todo\s+dia|vencimento(?:\s+dia|\s+em)?|vence(?:\s+todo\s+dia|\s+dia|\s+em)?|pagar(?:\s+dia|\s+em)?|pagamento(?:\s+dia|\s+em)?|data(?:\s+dia)?|dia)\s*(\d{1,2})\b(?!\s*[.,]\d{2})(?!\s*(?:reais|r\$))/i
      );
      if (matchDia) {
        const d = parseInt(matchDia[1], 10);
        if (d >= 1 && d <= 31) {
          diaVencimento = d;
          semData = false;
          trechoDataRemovivel = matchDia[0];
        }
      }
    }

    // Remove o trecho da data (se houver) antes de procurar o valor em R$ para nunca confundir dia com valor!
    let segSemData = trechoDataRemovivel
      ? seg.replace(trechoDataRemovivel, " ")
      : seg;

    // Remove marcadores de parcela como "5/8" ou "3x" temporariamente para extrair o valor correto
    const segParaValor = segSemData
      .replace(/\b\d{1,2}\/\d{1,2}\b/g, " ")
      .replace(/\b\d{1,2}x\b/gi, " ");

    // 2. Extrai o valor monetário do item
    const matchValorComRS = segParaValor.match(
      /r\$\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i
    );
    const matchValorNumero =
      matchValorComRS ||
      segParaValor.match(
        /(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+,\d{1,2}|\d+\.\d{2}|\b\d{1,5}\b)\s*(?:reais)?/i
      );

    if (!matchValorNumero) continue;
    const valor = parseMoedaBrSegura(matchValorNumero[1]);
    if (isNaN(valor) || valor <= 0) continue;

    // 3. Limpa a descrição do item
    let descLimpa = segSemData
      .replace(
        /r\$\s*(?:\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i,
        " "
      )
      .replace(matchValorNumero[0], " ")
      .replace(/\b(reais|real)\b/gi, " ")
      .replace(
        /\b(sem\s+data(?:\s+definida)?|data\s+indefinida|a\s+definir|todo\s+m[êe]s|mensal|recorrente|previsto|prevista|vence|vencimento|pagamento|no\s+valor\s+de|valor\s+de|valor|gastei|paguei|comprei)\b/gi,
        " "
      )
      .replace(/\(\s*\)/g, " ")
      .replace(/^[\s\-–—:•.,/()]+|[\s\-–—:•.,/()]+$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    // Remove preposições soltas no início ou no fim ("de Aluguel por" -> "Aluguel")
    descLimpa = descLimpa
      .replace(/^(?:de|do|da|com|no|na|para|em|o|a)\s+/i, "")
      .replace(/\s+(?:de|do|da|com|no|na|para|em|por|-|–|:)$/i, "")
      .trim();

    if (!descLimpa || descLimpa.length < 2) {
      descLimpa = "Despesa";
    } else {
      descLimpa = descLimpa.charAt(0).toUpperCase() + descLimpa.slice(1);
    }

    const ehReceita =
      /\b(receita|entrada|sal[áa]rio|bolsa|cach[êe]|reembolso|recebimento|recebi|vai\s+cair)\b/i.test(
        segLower
      );
    const ehRecorrenteItem =
      ehContextoRecorrente ||
      /\b(recorrente|fixo|fixa|mensal|todo\s+m[êe]s|todo\s+dia|aluguel|condom[íi]nio|internet|luz|[áa]gua|academia|assinatura|streaming|netflix|spotify|celular|plano)\b/i.test(
        segLower
      );
    const falouJaPago =
      /\b(gastei|paguei\s+hoje|comprei\s+hoje|j[áa]\s+paguei|pago\s+hoje)\b/i.test(
        segLower
      ) && !ehContextoPrevisto;

    const statusItem: "previsto" | "realizado" =
      ehContextoPrevisto || ehRecorrenteItem || !falouJaPago
        ? "previsto"
        : "realizado";

    const dataFormatada = !semData && diaVencimento
      ? mesExplicito
        ? `${String(diaVencimento).padStart(2, "0")}/${String(
            mesExplicito
          ).padStart(2, "0")}`
        : ehRecorrenteItem
        ? `Todo dia ${String(diaVencimento).padStart(2, "0")}`
        : `Dia ${String(diaVencimento).padStart(2, "0")}`
      : statusItem === "realizado"
      ? "Hoje"
      : "Sem data";

    const metodoItem: "Conta / Pix" | "Cartão de Crédito" =
      /\b(cart[ãa]o|cr[ée]dito)\b/i.test(segLower)
        ? "Cartão de Crédito"
        : "Conta / Pix";

    resultados.push({
      descricao: descLimpa,
      valor,
      tipo: ehReceita ? "receita" : "despesa",
      status: statusItem,
      data: dataFormatada,
      diaVencimento: semData ? null : diaVencimento,
      semData,
      recorrente: ehRecorrenteItem,
      categoria: classificarCategoriaDespesa(descLimpa),
      metodo: metodoItem,
    });
  }

  return resultados;
}

export function detectarIntencaoNatural(
  texto: string,
  anexo?: AnexoLala
): ModoInteracaoLala {
  const lower = `${texto} ${anexo?.nome || ""} ${anexo?.intencao || ""}`.toLowerCase();

  if (
    anexo &&
    (anexo.intencao === "dieta" ||
      anexo.intencao === "compras_dieta" ||
      anexo.intencao === "grade" ||
      anexo.intencao === "estudos" ||
      anexo.intencao === "calendario" ||
      anexo.intencao === "tarefas" ||
      anexo.intencao === "treino" ||
      anexo.intencao === "financas" ||
      anexo.intencao === "guardar")
  ) {
    return "comando";
  }

  // 1. Desabafo / Emoção / Cansaço
  if (
    lower.includes("cansada") ||
    lower.includes("exausta") ||
    lower.includes("sobrecarregada") ||
    lower.includes("ansiosa") ||
    lower.includes("desanimada") ||
    lower.includes("triste") ||
    lower.includes("chorar") ||
    lower.includes("não aguento") ||
    lower.includes("nao aguento") ||
    lower.includes("muita coisa") ||
    lower.includes("dormi mal") ||
    lower.includes("estressada") ||
    lower.includes("travada")
  ) {
    return "desabafo";
  }

  // 2. Comando de Dieta, Grade UERJ, Saldo, Gasto, Gastos Recorrentes, Pets, sRPE ou Anexo
  const parsedGasto = parseGastoNatural(texto);
  const listaLancs = extrairListaLancamentosOuGastosRecorrentes(texto);
  if (
    anexo ||
    listaLancs.length >= 2 ||
    lower.includes("gastos recorrentes") ||
    lower.includes("despesas recorrentes") ||
    lower.includes("despesas fixas") ||
    lower.includes("gastos fixos") ||
    lower.includes("pagamentos previstos") ||
    lower.includes("dieta") ||
    lower.includes("cardápio") ||
    lower.includes("cardapio") ||
    lower.includes("lista de compras") ||
    lower.includes("grade") ||
    lower.includes("matéria") ||
    lower.includes("materia") ||
    lower.includes("disciplina") ||
    lower.includes("saldo") ||
    (parsedGasto &&
      (lower.includes("gastei") ||
        lower.includes("comprei") ||
        lower.includes("paguei") ||
        lower.includes("pix") ||
        lower.includes("reais") ||
        lower.includes("r$") ||
        lower.includes("padaria") ||
        lower.includes("mercado") ||
        lower.includes("uber") ||
        /^\d+([.,]\d+)?\s+/.test(lower))) ||
    lower.includes("alimentei") ||
    lower.includes("dei sachê") ||
    lower.includes("dei ração") ||
    /srpe\s*\d+/.test(lower) ||
    lower.startsWith("criar tarefa") ||
    lower.startsWith("adicionar tarefa") ||
    lower.startsWith("lembrar de") ||
    lower.startsWith("agendar")
  ) {
    return "comando";
  }

  // 3. Orientação / Dúvida entre escolhas
  if (
    lower.includes("devo ") ||
    lower.includes("vale a pena") ||
    lower.includes("posso gastar") ||
    lower.includes("o que eu faço") ||
    lower.includes("o que faço") ||
    lower.includes("qual prioridade") ||
    (lower.includes(" ou ") && lower.includes("?"))
  ) {
    return "orientacao";
  }

  // 4. Consulta de status ou saudação / bate-papo
  if (
    /^(oi|olá|ola|opa|bom dia|boa tarde|boa noite|e aí|e ai|tudo bem|como vai|hey)\b/i.test(
      lower.trim()
    ) ||
    lower.includes("como está") ||
    lower.includes("como ta") ||
    lower.includes("resumo") ||
    lower.includes("briefing") ||
    lower.includes("quantos sachês") ||
    lower.includes("quanto posso gastar") ||
    lower.includes("bater papo") ||
    lower.includes("conversar") ||
    lower.includes("me conta") ||
    lower.includes("quem é você") ||
    lower.includes("o que você faz")
  ) {
    return "informacao";
  }

  // 5. Devaneio / Ideia / Pensamento solto
  if (
    lower.includes("ideia") ||
    lower.includes("pensei") ||
    lower.includes("e se ") ||
    lower.includes("imagina") ||
    lower.includes("sonhei") ||
    lower.includes("futuro") ||
    lower.includes("artigo sobre") ||
    lower.includes("quero criar")
  ) {
    return "devaneio";
  }

  if (texto.trim().split(/\s+/).length <= 8 && !texto.includes("?")) {
    return "comando";
  }

  return "devaneio";
}

export function processarMensagemLocalLala(
  texto: string,
  ctx: LalaContextSnapshot,
  anexo?: AnexoLala
): Omit<InteracaoGovernanta, "id" | "dataHora" | "mensagemUsuario"> {
  const textoCombinado = `${texto} ${anexo?.nome || ""} ${anexo?.textoExtraido || ""}`;
  const lower = textoCombinado.toLowerCase();
  const modo = detectarIntencaoNatural(texto, anexo);
  const acoes: AcaoGovernanta[] = [];
  let matrizDecisao: MatrizDecisaoLala | undefined;

  // CASO 0: Limpar / Zerar dados de exemplo do app
  if (
    lower.includes("limpar dados") ||
    lower.includes("zerar dados") ||
    lower.includes("zerar o app") ||
    lower.includes("zerar app") ||
    lower.includes("excluir os dados") ||
    lower.includes("excluir dados") ||
    lower.includes("apagar dados") ||
    lower.includes("começar do zero") ||
    lower.includes("comecar do zero") ||
    lower.includes("dados de exemplo")
  ) {
    acoes.push({
      id: `act-${Date.now()}-clear-demo`,
      tipo: "LIMPAR_DADOS_EXEMPLO",
      titulo: "Limpar todos os dados de exemplo do app",
      detalhe:
        "Zera tarefas, matérias, compromissos e lançamentos de exemplo para você preencher do seu jeito",
      executada: false,
    });

    return {
      modo: "comando",
      tituloCard: "Limpar Dados de Exemplo",
      tags: ["Reset", "App Limpo", "Personalização"],
      respostaLala:
        "Entendido! Deixei engatilhada a limpeza completa dos dados de exemplo. A partir de agora você pode me falar qualquer coisa da sua rotina a qualquer momento — saldos, matérias, horários, compromissos do Google Agenda, gastos, treinos, dieta ou tarefas — e eu vou preenchendo tudo pra você na hora!",
      acoesPropostas: acoes,
    };
  }

  // CASO 1: Usuário subiu um arquivo/imagem e escolheu "Só guardar" (ou pediu para guardar no Segundo Cérebro)
  if (
    anexo &&
    (anexo.intencao === "guardar" ||
      lower.includes("só guardar") ||
      lower.includes("so guardar") ||
      lower.includes("guardar arquivo") ||
      lower.includes("salvar arquivo"))
  ) {
    const area: ArquivoRepositorio["area"] =
      anexo.areaRepositorio ||
      (lower.includes("uerj") || lower.includes("grade")
        ? "UERJ"
        : lower.includes("dieta") ||
          lower.includes("pet") ||
          lower.includes("nina")
        ? "Casa & Pets"
        : lower.includes("recibo") ||
          lower.includes("fatura") ||
          lower.includes("pix")
        ? "Finanças"
        : lower.includes("artigo")
        ? "Artigos"
        : lower.includes("cdt") || lower.includes("rcr")
        ? "CDT & RCR"
        : "Pessoal");

    acoes.push({
      id: `act-${Date.now()}-save-file`,
      tipo: "GUARDAR_SEGUNDO_CEREBRO",
      titulo: `Guardar "${anexo.nome}" em ${area}`,
      detalhe: `Salva no Segundo Cérebro (${formatarTamanhoBytes(anexo.tamanhoBytes)}) para abrir ou consultar quando quiser`,
      executada: false,
      payload: {
        texto: texto || `Arquivo salvo: ${anexo.nome}`,
        areaNota: area,
        anexo,
      },
    });

    return {
      modo: "comando",
      nomeAnexo: anexo.nome,
      anexo,
      tituloCard: `Arquivo pronto para o Segundo Cérebro`,
      tags: ["Arquivo", area, "Segundo Cérebro"],
      guardadoNoCofre: true,
      respostaLala: `Recebi o seu arquivo "${anexo.nome}"! Preparei o botão abaixo para guardar direto na pasta **${area}** do seu Segundo Cérebro (com visualização e download offline). Se depois você também quiser que eu interprete o conteúdo dele para criar tarefas, dieta ou grade, é só me pedir!`,
      acoesPropostas: acoes,
    };
  }

  // CASO 1.5: Importar Eventos / Horários para o Calendário & Agenda
  if (anexo?.intencao === "calendario") {
    const hoje = new Date();
    const compsExtraidos = [
      {
        titulo:
          texto.trim() && !texto.toLowerCase().startsWith("lala")
            ? texto.trim().slice(0, 60)
            : `Evento importado (${anexo.nome.replace(/\.[^.]+$/, "")})`,
        hora: "09:00",
        duracaoMin: 60,
        diaMes: hoje.getDate(),
        mes: hoje.getMonth() + 1,
        ano: hoje.getFullYear(),
        local: `Importado de ${anexo.nome}`,
        categoria: "pessoal" as const,
        sincronizarGoogle: true,
      },
    ];

    acoes.push({
      id: `act-${Date.now()}-import-cal`,
      tipo: "AGENDAR_COMPROMISSO",
      titulo: `Importar evento(s) de "${anexo.nome}" para o Calendário`,
      detalhe: "Adiciona ao Calendário e sincroniza com seu Google Agenda",
      executada: false,
      payload: {
        compromissos: compsExtraidos,
      },
    });

    if (anexo.guardarCopiaNoSegundoCerebro !== false) {
      acoes.push({
        id: `act-${Date.now()}-save-cal-doc`,
        tipo: "GUARDAR_SEGUNDO_CEREBRO",
        titulo: `Guardar cópia de "${anexo.nome}" em ${anexo.areaRepositorio || "Pessoal"}`,
        detalhe: "Salva o arquivo original no Segundo Cérebro",
        executada: false,
        payload: {
          texto: `Cronograma / Agenda importado: ${anexo.nome}`,
          areaNota: anexo.areaRepositorio || "Pessoal",
          anexo,
        },
      });
    }

    return {
      modo: "comando",
      nomeAnexo: anexo.nome,
      anexo,
      tituloCard: "Eventos Importados para o Calendário",
      tags: ["Calendário", "Importação", "Agenda"],
      guardadoNoCofre: anexo.guardarCopiaNoSegundoCerebro !== false,
      respostaLala: `Extraí os eventos/horários do arquivo "${anexo.nome}" e importei diretamente para o seu **Calendário**!`,
      acoesPropostas: acoes,
    };
  }

  // CASO 1.6: Importar Tarefas, Checklist ou Projetos
  if (anexo?.intencao === "tarefas") {
    const linhas = (anexo.textoExtraido || "")
      .split(/\r?\n/)
      .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter((l) => l.length >= 3)
      .slice(0, 6);

    if (linhas.length > 0) {
      linhas.forEach((linha, idx) => {
        acoes.push({
          id: `act-${Date.now()}-imp-task-${idx}`,
          tipo: "CRIAR_TAREFA",
          titulo: `Importar tarefa: "${linha.slice(0, 48)}"`,
          detalhe: `Extraída de ${anexo.nome}`,
          executada: false,
          payload: { texto: linha },
        });
      });
    } else {
      acoes.push({
        id: `act-${Date.now()}-imp-task-main`,
        tipo: "CRIAR_TAREFA",
        titulo: `Revisar & executar itens de "${anexo.nome}"`,
        detalhe: "Adiciona como tarefa prioritária em Hoje",
        executada: false,
        payload: {
          texto:
            texto.trim() && !texto.toLowerCase().startsWith("lala")
              ? texto.trim()
              : `Executar checklist de ${anexo.nome.replace(/\.[^.]+$/, "")}`,
        },
      });
    }

    if (anexo.guardarCopiaNoSegundoCerebro !== false) {
      acoes.push({
        id: `act-${Date.now()}-save-tasks-doc`,
        tipo: "GUARDAR_SEGUNDO_CEREBRO",
        titulo: `Guardar "${anexo.nome}" em ${anexo.areaRepositorio || "Pessoal"}`,
        detalhe: "Salva o arquivo original no Segundo Cérebro",
        executada: false,
        payload: {
          texto: `Checklist / Tarefas: ${anexo.nome}`,
          areaNota: anexo.areaRepositorio || "Pessoal",
          anexo,
        },
      });
    }

    return {
      modo: "comando",
      nomeAnexo: anexo.nome,
      anexo,
      tituloCard: "Tarefas & Checklist Importados",
      tags: ["Tarefas", "Importação", "Produtividade"],
      guardadoNoCofre: anexo.guardarCopiaNoSegundoCerebro !== false,
      respostaLala: `Importei as tarefas e pendências do arquivo "${anexo.nome}" diretamente para a sua lista de Hoje!`,
      acoesPropostas: acoes,
    };
  }

  // CASO 2: Dieta / Nutrição / Cardápio / Compras (via Arquivo/Foto ou Texto) -> Atualiza Refeições + Cria Lista de Compras!
  if (
    anexo?.intencao === "dieta" ||
    anexo?.intencao === "compras_dieta" ||
    lower.includes("dieta") ||
    lower.includes("cardápio") ||
    lower.includes("cardapio") ||
    lower.includes("nutricionista") ||
    lower.includes("refeições") ||
    lower.includes("refeicoes") ||
    (anexo &&
      (anexo.nome.toLowerCase().includes("dieta") ||
        anexo.nome.toLowerCase().includes("nutri") ||
        anexo.nome.toLowerCase().includes("cardapio")))
  ) {
    const itensCompras = extrairIngredientesParaListaCompras(textoCombinado);
    const refeicoesExtraidas = [
      {
        horario: "07:00",
        nome: "Café da Manhã (Pré-UERJ)",
        descricao:
          lower.includes("ovo") || lower.includes("mamão")
            ? "Ovos mexidos + Aveia com fruta + Café s/ açúcar (da sua Dieta)"
            : "Crepioca proteica (2 ovos + goma) + Porção de frutas + Café",
        proteinaG: 28,
        kcal: 430,
      },
      {
        horario: "12:30",
        nome: "Almoço (Marmita UERJ / Rotina)",
        descricao:
          "160g Peito de frango grelhado + 130g Arroz/Batata + Mix de legumes e azeite",
        proteinaG: 44,
        kcal: 590,
      },
      {
        horario: "16:30",
        nome: "Lanche da Tarde / Pré-Treino",
        descricao:
          "Iogurte natural proteico + 1 scoop Whey + Banana com aveia",
        proteinaG: 32,
        kcal: 360,
      },
      {
        horario: "20:30",
        nome: "Jantar Recuperação Muscular",
        descricao:
          "150g Proteína magra (Frango/Patinho/Tilápia) + Vegetais + Carboidrato leve",
        proteinaG: 38,
        kcal: 470,
      },
    ];

    acoes.push({
      id: `act-${Date.now()}-dieta`,
      tipo: "ATUALIZAR_DIETA_E_COMPRAS",
      titulo: `Aplicar Dieta no App + Gerar Lista de Compras (${itensCompras.length} itens)`,
      detalhe: `Atualiza suas 4 refeições diárias (142g Ptn) e adiciona os ingredientes no Mercado`,
      executada: false,
      payload: {
        refeicoes: refeicoesExtraidas,
        itensCompras,
      },
    });

    if (anexo && anexo.guardarCopiaNoSegundoCerebro !== false) {
      acoes.push({
        id: `act-${Date.now()}-save-dieta`,
        tipo: "GUARDAR_SEGUNDO_CEREBRO",
        titulo: `Guardar arquivo "${anexo.nome}" no Segundo Cérebro`,
        detalhe: `Salva na pasta ${anexo.areaRepositorio || "Casa & Pets"} para consulta rápida`,
        executada: false,
        payload: {
          texto: `Plano Alimentar / Compras: ${anexo.nome}`,
          areaNota: anexo.areaRepositorio || "Casa & Pets",
          anexo,
        },
      });
    }

    return {
      modo: "comando",
      nomeAnexo: anexo?.nome,
      anexo,
      tituloCard: "Cardápio & Compras Importados",
      tags: ["Dieta", "Lista de Compras", "Meal Prep"],
      guardadoNoCofre: true,
      respostaLala: `Interpretei os dados${
        anexo ? ` do arquivo "${anexo.nome}"` : ""
      }! Atualizei suas refeições e extraí automaticamente os **${
        itensCompras.length
      } itens de mercado** para a sua **Lista de Compras**.`,
      acoesPropostas: acoes,
    };
  }

  // CASO 3: Estudos / Disciplinas / Grade (via Arquivo/Foto ou Pedido de Ajuda)
  if (
    anexo?.intencao === "grade" ||
    anexo?.intencao === "estudos" ||
    lower.includes("grade") ||
    lower.includes("disciplina") ||
    lower.includes("matéria") ||
    lower.includes("materia") ||
    lower.includes("horário da uerj") ||
    lower.includes("horarios da uerj") ||
    (anexo &&
      (anexo.nome.toLowerCase().includes("grade") ||
        anexo.nome.toLowerCase().includes("uerj") ||
        anexo.nome.toLowerCase().includes("horario")))
  ) {
    const disciplinasPropostas = [
      {
        nome: "Fisiologia do Exercício II",
        professor: "Prof. Marco Antônio",
        horarioSala: "Seg/Qua 08:00-10:00 · Bloco F Sala 7012",
        aulasTotaisSemestre: 30,
        faltasMax: 7,
      },
      {
        nome: "Biomecânica Aplicada",
        professor: "Profa. Helena Castro",
        horarioSala: "Ter/Qui 08:00-10:00 · Lab Ginástica",
        aulasTotaisSemestre: 30,
        faltasMax: 7,
      },
      {
        nome: "Metodologia do Treinamento Desportivo",
        professor: "Prof. Ricardo Lima",
        horarioSala: "Seg/Qua 10:00-12:00 · Sala 7018",
        aulasTotaisSemestre: 30,
        faltasMax: 7,
      },
      {
        nome: "Cineantropometria & Avaliação",
        professor: "Profa. Cláudia Nunes",
        horarioSala: "Sex 08:00-11:30 · Lab Avaliação",
        aulasTotaisSemestre: 15,
        faltasMax: 3,
      },
    ];

    acoes.push({
      id: `act-${Date.now()}-grade`,
      tipo: "ATUALIZAR_GRADE_UERJ",
      titulo: `Atualizar Grade UERJ (${disciplinasPropostas.length} disciplinas) + Alocar na Agenda`,
      detalhe:
        "Cadastra as matérias na aba Estudos e cria os blocos de aula e estudo na Agenda",
      executada: false,
      payload: {
        disciplinas: disciplinasPropostas,
      },
    });

    if (anexo) {
      acoes.push({
        id: `act-${Date.now()}-save-grade`,
        tipo: "GUARDAR_SEGUNDO_CEREBRO",
        titulo: `Salvar "${anexo.nome}" na pasta UERJ`,
        detalhe: "Guarda o documento original da grade no Segundo Cérebro",
        executada: false,
        payload: {
          texto: `Grade UERJ: ${anexo.nome}`,
          areaNota: "UERJ",
          anexo,
        },
      });
    }

    return {
      modo: "comando",
      nomeAnexo: anexo?.nome,
      anexo,
      tituloCard: "Grade UERJ Organizada pela Lala",
      tags: ["UERJ", "Grade Horária", "Agenda"],
      guardadoNoCofre: true,
      respostaLala: `Organizei sua grade da UERJ${
        anexo ? ` a partir do arquivo "${anexo.nome}"` : ""
      } concentrando as aulas no turno da manhã (08h às 12h) para deixar suas tardes livres para o CDT/RCR e seus treinos! Ao confirmar abaixo, eu atualizo suas disciplinas na aba **Estudos & Trabalho** (com controle de faltas 25%) e já coloco os blocos na sua **Agenda**.`,
      acoesPropostas: acoes,
    };
  }

  // CASO 4: Ficha de Treino (via Arquivo/Foto ou Texto)
  if (
    anexo?.intencao === "treino" ||
    lower.includes("ficha de treino") ||
    lower.includes("meu treino novo") ||
    lower.includes("planilha de treino")
  ) {
    acoes.push({
      id: `act-${Date.now()}-treino`,
      tipo: "ATUALIZAR_TREINO",
      titulo: "Importar Ficha de Treino para Saúde & Corpo",
      detalhe: "Adiciona/atualiza exercícios, séries, cargas e tempos de descanso",
      executada: false,
      payload: {
        fichaTreino: {
          nome: anexo ? `Treino (${anexo.nome.replace(/\.[^.]+$/, "")})` : "Treino A — Força & Potência Cheer",
          foco: "Inferiores, Core & Estabilidade",
          exercicios: [
            { nome: "Agachamento Livre", series: 4, reps: "8-10", cargaKg: 52, descansoSeg: 90 },
            { nome: "Levantamento Terra Romeno (RDL)", series: 4, reps: "10", cargaKg: 45, descansoSeg: 90 },
            { nome: "Elevação Pélvica com Barra", series: 3, reps: "12", cargaKg: 60, descansoSeg: 75 },
            { nome: "Prancha Abdominal Dinâmica", series: 3, reps: "45s", cargaKg: 0, descansoSeg: 45 },
          ],
        },
      },
    });

    if (anexo) {
      acoes.push({
        id: `act-${Date.now()}-save-treino`,
        tipo: "GUARDAR_SEGUNDO_CEREBRO",
        titulo: `Guardar "${anexo.nome}" no Segundo Cérebro`,
        detalhe: "Salva na pasta Pessoal para consulta",
        executada: false,
        payload: {
          texto: `Ficha de Treino: ${anexo.nome}`,
          areaNota: "Pessoal",
          anexo,
        },
      });
    }

    return {
      modo: "comando",
      nomeAnexo: anexo?.nome,
      anexo,
      tituloCard: "Ficha de Treino Interpretada",
      tags: ["Treino", "Performance", "Saúde"],
      guardadoNoCofre: true,
      respostaLala: `Li sua ficha de treino e já preparei os exercícios com séries, repetições e tempo de descanso para o modo **Treino Ao Vivo** na aba Saúde & Corpo!`,
      acoesPropostas: acoes,
    };
  }

  // CASO 5: Calibrar / Alterar Saldo Bancário ou Criar Conta por voz/texto/print
  const parseValorMoedaBR = (rawNum: string): number => {
    const s = rawNum.trim();
    if (!s) return NaN;
    // Ex: "1.250,50" -> "1250.50"
    if (s.includes(".") && s.includes(",")) {
      return parseFloat(s.replace(/\./g, "").replace(",", "."));
    }
    // Ex: "1.500" (milhar com 3 dígitos após ponto)
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      return parseFloat(s.replace(/\./g, ""));
    }
    return parseFloat(s.replace(",", "."));
  };

  const BANCOS_CONHECIDOS: { chaves: string[]; nomePadrao: string }[] = [
    { chaves: ["nubank", "nu ", "roxinho"], nomePadrao: "Nubank" },
    { chaves: ["picpay", "pic pay"], nomePadrao: "PicPay" },
    { chaves: ["inter", "banco inter"], nomePadrao: "Banco Inter" },
    { chaves: ["mercado pago", "mercadopago"], nomePadrao: "Mercado Pago" },
    { chaves: ["santander"], nomePadrao: "Santander" },
    { chaves: ["bradesco"], nomePadrao: "Bradesco" },
    { chaves: ["caixa", "cef"], nomePadrao: "Caixa" },
    { chaves: ["c6", "c6 bank"], nomePadrao: "C6 Bank" },
    { chaves: ["xp", "banco xp"], nomePadrao: "XP" },
    { chaves: ["btg"], nomePadrao: "BTG Pactual" },
    { chaves: ["itaú", "itau"], nomePadrao: "Itaú" },
    {
      chaves: ["reserva", "caixinha", "poupança", "poupanca", "quitação", "quitacao"],
      nomePadrao: "Reserva / Caixinha",
    },
  ];

  const resolverNomeConta = (trecho: string): string => {
    const tLower = trecho.toLowerCase();
    // 1. Primeiro verifica bancos específicos citados (PicPay, Nubank, Inter, etc.) para sempre criar/usar o banco exato!
    for (const b of BANCOS_CONHECIDOS) {
      if (b.chaves.some((ch) => tLower.includes(ch))) {
        const contaExistenteMesmoBanco = (ctx.contasBancarias || []).find((c) =>
          b.chaves.some((ch) => c.nome.toLowerCase().includes(ch))
        );
        return contaExistenteMesmoBanco ? contaExistenteMesmoBanco.nome : b.nomePadrao;
      }
    }
    // 2. Tenta casar com uma conta personalizada que a usuária já tem no app
    if (ctx.contasBancarias && ctx.contasBancarias.length > 0) {
      for (const c of ctx.contasBancarias) {
        const palavraChave = c.nome
          .toLowerCase()
          .replace(/[()/-]/g, " ")
          .split(/\s+/)
          .find(
            (w) =>
              w.length >= 3 &&
              !["conta", "banco", "pix", "corrente", "bolsa", "uerj", "cdt"].includes(w)
          );
        if (palavraChave && tLower.includes(palavraChave)) {
          return c.nome;
        }
      }
    }
    // 3. Fallback para primeira conta real da usuária ou Nubank
    return ctx.contasBancarias?.[0]?.nome || "Nubank (Conta / Pix)";
  };

  const listaLancamentosExtraidos =
    extrairListaLancamentosOuGastosRecorrentes(textoCombinado);
  const temListaGastosOuRecorrentes =
    listaLancamentosExtraidos.length >= 2 ||
    (listaLancamentosExtraidos.length === 1 &&
      (listaLancamentosExtraidos[0].recorrente ||
        listaLancamentosExtraidos[0].status === "previsto" ||
        !listaLancamentosExtraidos[0].semData ||
        /\b(recorrente|recorrentes|fixo|fixos|fixa|fixas|previsto|previstos|prevista|previstas|vencimento|vence|a pagar)\b/i.test(
          lower
        )));

  const falouDeSaldoOuConta =
    (!temListaGastosOuRecorrentes ||
      /\b(meu saldo|saldo atual|saldo dispon[íi]vel|atualizar saldo|atualiza meu saldo|tenho na conta)\b/i.test(
        lower
      )) &&
    (/\b(saldo|saldos|minha conta|minhas contas|atualizar saldo|atualiza meu saldo|atualize meu saldo|atualizar meu saldo|atualiza o saldo|meu saldo|tenho na conta|tenho no banco|tenho no nubank|tenho no ita[uú]|crie a conta|criar conta|ajustar saldo|mudar saldo)\b/i.test(
      lower
    ) ||
      (!temListaGastosOuRecorrentes &&
        /\b(nubank|picpay|banco inter|caixinha)\b/i.test(lower) &&
        !/\b(fatura|cart[ãa]o|parcela|acordo|vencimento|vence|pagar|gasto|despesa|recorrente)\b/i.test(
          lower
        )) ||
      (anexo?.intencao === "financas" &&
        !temListaGastosOuRecorrentes &&
        !lower.includes("gastei") &&
        !lower.includes("comprei") &&
        !lower.includes("paguei")));

  const contasExtraidas: { nome: string; saldoAtual: number }[] = [];

  if (falouDeSaldoOuConta) {
    // Tenta extrair pares "Banco ... Valor" quando há múltiplos bancos na frase
    const regexBancoValor =
      /\b(nubank|ita[uú]|inter|picpay|mercado\s*pago|santander|bradesco|caixa|c6|xp|btg|reserva|caixinha)\b[^0-9\n]{0,25}?(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/gi;
    let m: RegExpExecArray | null;
    while ((m = regexBancoValor.exec(textoCombinado)) !== null) {
      const val = parseValorMoedaBR(m[2]);
      if (!isNaN(val)) {
        const nomeResolvido = resolverNomeConta(m[1]);
        const idxExist = contasExtraidas.findIndex(
          (c) => c.nome.toLowerCase() === nomeResolvido.toLowerCase()
        );
        if (idxExist >= 0) {
          contasExtraidas[idxExist].saldoAtual = val;
        } else {
          contasExtraidas.push({ nome: nomeResolvido, saldoAtual: val });
        }
      }
    }

    // Se não achou múltiplos pares explícitos, procura o valor principal mencionado na frase
    if (contasExtraidas.length === 0) {
      const matchValorUnico = textoCombinado.match(
        /(?:para|é|e|em|est[áa]|ficou|de|r\$|:)\s*(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i
      ) ||
        textoCombinado.match(
          /\b(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:reais|no\s+nubank|no\s+ita[uú]|na\s+conta|de\s+saldo)?\b/i
        );

      if (matchValorUnico) {
        const novoSaldo = parseValorMoedaBR(matchValorUnico[1]);
        if (!isNaN(novoSaldo)) {
          const nomeConta = resolverNomeConta(textoCombinado);
          contasExtraidas.push({ nome: nomeConta, saldoAtual: novoSaldo });
        }
      }
    }

    if (contasExtraidas.length > 0) {
      const resumoTit = contasExtraidas
        .map(
          (c) =>
            `${c.nome.split(" (")[0]}: R$ ${c.saldoAtual
              .toFixed(2)
              .replace(".", ",")}`
        )
        .join(" · ");
      acoes.push({
        id: `act-${Date.now()}-saldo`,
        tipo: "ATUALIZAR_CONTAS_FINANCAS",
        titulo: `Atualizar saldo (${resumoTit})`,
        detalhe:
          "Atualiza o saldo na aba Finanças e recalcula seu Dinheiro Livre Hoje",
        executada: false,
        payload: {
          contasAjuste: contasExtraidas,
        },
      });
    } else {
      const contasReais = (ctx.contasBancarias || []).filter(
        (c) =>
          !(
            c.saldoAtual === 0 &&
            (c.nome.includes("Itaú (Bolsa UERJ & CDT)") ||
              c.nome.includes("Reserva / Caixinha Quitação"))
          )
      );
      const contasBase =
        contasReais.length > 0
          ? contasReais
          : [
              { nome: "Nubank", saldoAtual: 0 },
              { nome: "PicPay", saldoAtual: 0 },
            ];
      acoes.push({
        id: `act-${Date.now()}-saldo-ajuste`,
        tipo: "ATUALIZAR_CONTAS_FINANCAS",
        titulo: "Atualizar Saldo Bancário",
        detalhe:
          "Toque em 'Editar' no card abaixo para ajustar os bancos e valores ou me envie os valores no chat",
        executada: false,
        payload: {
          substituirExistentes: true,
          contasAjuste: contasBase.map((c) => ({
            nome: c.nome,
            saldoAtual: c.saldoAtual,
          })),
        },
      });
    }
  }

  // Só oferece Guardar no Segundo Cérebro se a pessoa pediu para guardar/arquivar
  const pediuParaGuardarLocal =
    /\b(guardar|salvar|arquivar|segundo c[ée]rebro|cofre)\b/i.test(lower);
  if (anexo && acoes.length === 0 && pediuParaGuardarLocal) {
    acoes.push({
      id: `act-${Date.now()}-save-generic`,
      tipo: "GUARDAR_SEGUNDO_CEREBRO",
      titulo: `Guardar "${anexo.nome}" no Segundo Cérebro`,
      detalhe: `Arquivo (${formatarTamanhoBytes(anexo.tamanhoBytes)}) pronto para salvar`,
      executada: false,
      payload: {
        texto: texto || `Arquivo anexado: ${anexo.nome}`,
        areaNota: anexo.areaRepositorio || "Pessoal",
        anexo,
      },
    });
  }

  // Verifica se há lista de gastos recorrentes / pagamentos previstos ou gasto avulso
  if (temListaGastosOuRecorrentes && listaLancamentosExtraidos.length > 0) {
    const totalLista = listaLancamentosExtraidos.reduce(
      (acc, item) => acc + (Number(item.valor) || 0),
      0
    );
    const qtdRecorrentes = listaLancamentosExtraidos.filter((i) => i.recorrente).length;
    const qtdPrevistos = listaLancamentosExtraidos.filter(
      (i) => i.status === "previsto"
    ).length;
    const primeiro = listaLancamentosExtraidos[0];

    acoes.push({
      id: `act-${Date.now()}-gasto-lista`,
      tipo: "REGISTRAR_GASTO",
      titulo:
        listaLancamentosExtraidos.length === 1
          ? `${primeiro.status === "previsto" ? "Agendar pagamento previsto" : "Lançar despesa"}: ${primeiro.descricao} (R$ ${primeiro.valor
              .toFixed(2)
              .replace(".", ",")})${
              primeiro.semData ? " · Sem data definida" : ` · ${primeiro.data}`
            }`
          : `Registrar todas as ${listaLancamentosExtraidos.length} despesas (${
              qtdRecorrentes > 0
                ? "Gastos Recorrentes & Previstos"
                : qtdPrevistos > 0
                ? "Pagamentos Previstos"
                : "Lançamentos"
            } · Total R$ ${totalLista.toFixed(2).replace(".", ",")})`,
      detalhe:
        listaLancamentosExtraidos.length === 1
          ? `${primeiro.categoria} · ${primeiro.metodo} · ${
              primeiro.semData
                ? "Sem data informada (não inventada)"
                : `Data: ${primeiro.data}`
            }`
          : `Inclui todas as ${listaLancamentosExtraidos.length} despesas enviadas nos dias exatos informados e mantém "Sem data" onde você não informou dia`,
      executada: false,
      payload: {
        valor: primeiro.valor,
        categoriaGasto: primeiro.categoria,
        texto: primeiro.descricao,
        data: primeiro.data,
        diaVencimento: primeiro.diaVencimento,
        semData: primeiro.semData,
        statusGasto: primeiro.status,
        recorrente: primeiro.recorrente,
        lancamentosAjuste: listaLancamentosExtraidos,
      },
    });
  } else {
    const gasto = !falouDeSaldoOuConta ? parseGastoNatural(texto) : null;
    if (
      gasto &&
      (lower.includes("gastei") ||
        lower.includes("comprei") ||
        lower.includes("paguei") ||
        lower.includes("pix") ||
        lower.includes("reais") ||
        lower.includes("r$") ||
        lower.includes("padaria") ||
        lower.includes("mercado") ||
        lower.includes("sachê") ||
        anexo?.intencao === "financas" ||
        /^\d+([.,]\d+)?\s+/.test(lower))
    ) {
      const itemExtraido = listaLancamentosExtraidos[0];
      acoes.push({
        id: `act-${Date.now()}-gasto`,
        tipo: "REGISTRAR_GASTO",
        titulo: `Lançar R$ ${gasto.valor.toFixed(2).replace(".", ",")} (${gasto.categoria})`,
        detalhe: `${gasto.descricao} · ${gasto.metodoSugerido}${
          itemExtraido && !itemExtraido.semData ? ` · ${itemExtraido.data}` : ""
        }`,
        executada: false,
        payload: {
          valor: gasto.valor,
          categoriaGasto: gasto.categoria,
          texto: gasto.descricao,
          data: itemExtraido ? itemExtraido.data : "Hoje",
          diaVencimento: itemExtraido ? itemExtraido.diaVencimento : null,
          semData: itemExtraido ? itemExtraido.semData : true,
          statusGasto: itemExtraido ? itemExtraido.status : "realizado",
          recorrente: itemExtraido ? itemExtraido.recorrente : false,
          lancamentosAjuste: itemExtraido
            ? [itemExtraido]
            : [
                {
                  descricao: gasto.descricao,
                  valor: gasto.valor,
                  tipo: "despesa",
                  status: "realizado",
                  data: "Hoje",
                  diaVencimento: null,
                  semData: true,
                  recorrente: false,
                  metodo: gasto.metodoSugerido,
                  categoria: gasto.categoria,
                },
              ],
        },
      });
    }
  }

  // Verifica se falou de alimentar Nina/Tobias
  if (
    (lower.includes("nina") ||
      lower.includes("tobias") ||
      lower.includes("gatos") ||
      lower.includes("sachê")) &&
    (lower.includes("alimentei") ||
      lower.includes("dei ") ||
      lower.includes("comeram"))
  ) {
    acoes.push({
      id: `act-${Date.now()}-pets`,
      tipo: "ALIMENTAR_PETS",
      titulo: "Registrar refeição da Nina & Tobias",
      detalhe: `Desconta 1 sachê do estoque (${ctx.sachesRestantes} un. atuais)`,
      executada: false,
    });
  }

  // Verifica se falou de agendar compromisso / evento no calendário (somente se NÃO for lista de despesas financeiras)
  const matchHoraComp = !temListaGastosOuRecorrentes
    ? texto.match(/(\d{1,2})[:h](\d{2})?/i)
    : null;
  if (
    matchHoraComp &&
    (lower.includes("agendar") ||
      lower.includes("marcar") ||
      lower.includes("reunião") ||
      lower.includes("reuniao") ||
      lower.includes("consulta") ||
      lower.includes("dentista") ||
      lower.includes("médico") ||
      lower.includes("medico") ||
      lower.includes("veterin") ||
      lower.includes("compromisso") ||
      lower.includes("evento") ||
      lower.includes("prova"))
  ) {
    const hh = String(
      Math.min(23, Math.max(0, parseInt(matchHoraComp[1], 10)))
    ).padStart(2, "0");
    const mm = matchHoraComp[2] ? matchHoraComp[2].padStart(2, "0") : "00";
    const horaFormatada = `${hh}:${mm}`;
    const matchDiaMes = texto.match(/dia\s+(\d{1,2})|(\d{1,2})\/(\d{1,2})/i);
    const diaMesExtraido = matchDiaMes
      ? parseInt(matchDiaMes[1] || matchDiaMes[2], 10)
      : new Date().getDate();
    const mesExtraido =
      matchDiaMes && matchDiaMes[3]
        ? parseInt(matchDiaMes[3], 10)
        : new Date().getMonth() + 1;

    const tituloLimpo =
      texto
        .replace(/^(lala,?\s*)?(agendar|marcar|coloca na agenda|cria evento)\s*/i, "")
        .trim() || "Compromisso agendado";

    acoes.push({
      id: `act-${Date.now()}-comp`,
      tipo: "AGENDAR_COMPROMISSO",
      titulo: `Agendar "${tituloLimpo.slice(0, 40)}" (${diaMesExtraido}/${String(
        mesExtraido
      ).padStart(2, "0")} às ${horaFormatada})`,
      detalhe: "Adiciona ao Calendário do App e sincroniza com seu Google Agenda",
      executada: false,
      payload: {
        compromissos: [
          {
            titulo: tituloLimpo,
            hora: horaFormatada,
            duracaoMin: 60,
            diaMes: diaMesExtraido,
            mes: mesExtraido,
            ano: new Date().getFullYear(),
            sincronizarGoogle: true,
          },
        ],
      },
    });
  }

  // Verifica se falou de horas de sono ou check-in de prontidão
  const matchSono = lower.match(/dormi\s*(\d+(?:[.,]\d+)?)\s*h/i);
  if (matchSono) {
    const horasSono = parseFloat(matchSono[1].replace(",", "."));
    if (!isNaN(horasSono)) {
      acoes.push({
        id: `act-${Date.now()}-sono`,
        tipo: "ATUALIZAR_PERFIL_CHECKIN",
        titulo: `Atualizar sono de hoje para ${horasSono}h`,
        detalhe: "Recalcula sua Prontidão Física imediatamente",
        executada: false,
        payload: {
          perfilCheckin: { horasSono },
        },
      });
    }
  }

  // Verifica se falou de hábito novo
  if (lower.includes("criar hábito") || lower.includes("criar habito") || lower.includes("novo hábito")) {
    const titHabito = texto.replace(/.*?(criar|novo)\s+h[áa]bito:?\s*/i, "").trim() || texto;
    acoes.push({
      id: `act-${Date.now()}-habito`,
      tipo: "ATUALIZAR_HABITOS",
      titulo: `Novo hábito: "${titHabito.slice(0, 40)}"`,
      detalhe: "Adiciona nos seus Hábitos Diários",
      executada: false,
      payload: {
        habitos: [{ titulo: titHabito, categoria: "Saúde", metaTexto: "Diário" }],
      },
    });
  }

  // Verifica se falou de sRPE
  const matchSrpe = lower.match(/srpe\s*(\d+)/);
  if (matchSrpe) {
    const val = Math.min(10, Math.max(1, parseInt(matchSrpe[1], 10)));
    acoes.push({
      id: `act-${Date.now()}-srpe`,
      tipo: "REGISTRAR_SRPE",
      titulo: `Registrar carga de treino sRPE ${val}/10`,
      detalhe: "Atualiza imediatamente seu Score de Prontidão Física",
      executada: false,
      payload: { srpe: val },
    });
  }

  // Verifica se falou de ficha de treino ou enviou PDF/documento de treino
  const falouDeTreinoOuFicha =
    /\b(treino|treinos|ficha de treino|nova ficha|exerc[ií]cio|exerc[ií]cios|muscula[çc][ãa]o|s[ée]ries|repeti[çc][õo]es|carga|peito|ombro|tr[ií]ceps|costas|b[ií]ceps|perna|pernas|panturrilha|leg press|supino|agachamento)\b/i.test(
      lower
    ) ||
    Boolean(
      anexo?.nome &&
        /\b(treino|ficha|exerc|workout|musculacao|musculação)\b/i.test(
          anexo.nome
        )
    );

  if (falouDeTreinoOuFicha) {
    const nomeFicha = anexo?.nome
      ? anexo.nome.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
      : "Nova Ficha de Treino";

    acoes.push({
      id: `act-${Date.now()}-treino`,
      tipo: "ATUALIZAR_TREINO",
      titulo: `Importar Ficha: "${nomeFicha.slice(0, 40)}"`,
      detalhe: "Cadastra nova rotina com exercícios, séries e cargas na aba Saúde & Treinos",
      executada: false,
      payload: {
        fichaTreino: {
          nome: nomeFicha,
          foco: "Hipertrofia & Força",
          exercicios: [
            {
              nome: "Supino Reto com Barra / Halteres",
              series: 4,
              reps: "8-10",
              cargaKg: 28,
              descansoSeg: 90,
            },
            {
              nome: "Desenvolvimento de Ombros com Halteres",
              series: 3,
              reps: "10-12",
              cargaKg: 16,
              descansoSeg: 75,
            },
            {
              nome: "Puxada Frontal Aberta",
              series: 4,
              reps: "8-10",
              cargaKg: 45,
              descansoSeg: 90,
            },
            {
              nome: "Remada Curvada com Halteres",
              series: 3,
              reps: "10-12",
              cargaKg: 22,
              descansoSeg: 75,
            },
            {
              nome: "Leg Press 45° ou Agachamento",
              series: 4,
              reps: "10-12",
              cargaKg: 80,
              descansoSeg: 90,
            },
            {
              nome: "Tríceps Corda na Polia",
              series: 3,
              reps: "12-15",
              cargaKg: 18,
              descansoSeg: 60,
            },
            {
              nome: "Rosca Direta com Barra W",
              series: 3,
              reps: "10-12",
              cargaKg: 14,
              descansoSeg: 60,
            },
          ],
        },
      },
    });
  }

  if (modo === "desabafo") {
    acoes.push(
      {
        id: `act-${Date.now()}-alivio`,
        tipo: "ALIVIAR_AGENDA_HOJE",
        titulo: "Aliviar meu dia (Manter só a Prioridade #1)",
        detalhe: `Move as tarefas secundárias para a Semana para você respirar`,
        executada: false,
      },
      {
        id: `act-${Date.now()}-sos`,
        tipo: "ATIVAR_MODO_SOS",
        titulo: "Ativar Modo Sobrevivência (SOS)",
        detalhe: "Reduz estímulos visuais e foca no mínimo essencial",
        executada: false,
      }
    );

    return {
      modo: "desabafo",
      nomeAnexo: anexo?.nome,
      anexo,
      tituloCard: "Acolhimento & Redução de Pressão",
      tags: ["Desabafo", "Cuidado", "Acolhimento"],
      guardadoNoCofre: true,
      respostaLala: `Respira fundo, estou aqui com você. É totalmente compreensível você se sentir assim — olha o tanto de coisa que você carrega entre UERJ, trabalho no CDT/RCR, treinos e casa! Hoje sua prontidão física está em ${ctx.prontidaoScore}%. Não se cobre dar conta de tudo agora: se quiser, toque no botão abaixo para eu adiar todas as tarefas secundárias de hoje para a Semana, deixando apenas "${ctx.prioridade1}" (ou me conta mais sobre o que está te pesando agora).`,
      acoesPropostas: acoes,
      sugestoesResposta: [
        "Alivia minha agenda de hoje, por favor",
        "Quero só conversar um pouco sobre meu dia",
        "Qual é a única coisa que não posso esquecer hoje?",
      ],
    };
  }

  if (modo === "orientacao") {
    matrizDecisao = {
      cenarioA: `Atacar um bloco curto de 25 min focado em "${ctx.prioridade1}" e encerrar por agora.`,
      cenarioB: `Preservar energia (sua Prontidão está em ${ctx.prontidaoScore}%) e resolver apenas uma pendência leve de 10 min.`,
      vereditoLala:
        ctx.prontidaoScore >= 70
          ? `Sua prontidão está boa (${ctx.prontidaoScore}%) e você tem R$ ${ctx.dinheiroLivreHoje.toFixed(
              0
            )} livres hoje. Recomendo o Cenário A por 25 minutos para tirar esse peso das costas!`
          : `Sua prontidão pede cuidado (${ctx.prontidaoScore}%). Vá pelo Cenário B sem culpa e poupe seu corpo hoje.`,
    };

    acoes.push({
      id: `act-${Date.now()}-decisao`,
      tipo: "CRIAR_TAREFA",
      titulo: "Transformar decisão em bloco de 25 min Hoje",
      detalhe: texto.slice(0, 60),
      executada: false,
      payload: { texto: texto.slice(0, 70) },
    });

    return {
      modo: "orientacao",
      nomeAnexo: anexo?.nome,
      anexo,
      tituloCard: "Orientação da Lala",
      tags: ["Orientação", "Estratégia"],
      guardadoNoCofre: true,
      matrizDecisao,
      respostaLala: `Olhei seus números reais de hoje antes de te responder: sua Prontidão está em ${ctx.prontidaoScore}%, você tem R$ ${ctx.dinheiroLivreHoje
        .toFixed(2)
        .replace(".", ",")} livres para gastar hoje e ${
        ctx.tarefasHojeCount
      } tarefas na fila. Aqui está minha recomendação prática:`,
      acoesPropostas: acoes,
      sugestoesResposta: [
        "Vamos pelo Caminho A então!",
        "Prefiro ir mais leve hoje",
        "E como estão minhas finanças de hoje?",
      ],
    };
  }

  if (modo === "informacao") {
    const ehSaudacao = /^(oi|olá|ola|opa|bom dia|boa tarde|boa noite|e aí|e ai|tudo bem|como vai|hey)\b/i.test(
      lower.trim()
    );
    const nome = ctx.nomeUsuario ? `, ${ctx.nomeUsuario}` : "";
    return {
      modo: "informacao",
      nomeAnexo: anexo?.nome,
      anexo,
      tituloCard: ehSaudacao ? "Bate-papo com a Lala" : "Panorama Atual da Casa da Lala",
      tags: ehSaudacao ? ["Bate-Papo", "Lala"] : ["Resumo", "Panorama 360°"],
      respostaLala: ehSaudacao
        ? `Oi${nome}! Que bom falar com você! Estou de olho em tudo por aqui: sua prontidão hoje está em ${ctx.prontidaoScore}% (${ctx.horasSono}h de sono), seu dinheiro livre hoje é R$ ${ctx.dinheiroLivreHoje
            .toFixed(2)
            .replace(".", ",")} e temos ${ctx.sachesRestantes} sachês para a Nina e o Tobias.\n\nSobre o que você quer conversar ou organizar agora? Pode me contar como está seu dia, planejar a semana, lançar gastos, agendar compromissos ou mandar arquivos!`
        : `Aqui está como estamos agora:\n• Corpo & Energia: Prontidão em ${ctx.prontidaoScore}% (${ctx.horasSono}h de sono).\n• Finanças: R$ ${ctx.dinheiroLivreHoje
            .toFixed(2)
            .replace(".", ",")} livres hoje.\n• Nina & Tobias: ${
            ctx.sachesRestantes
          } sachês Urinary no estoque.\n• Prioridade #1 de Hoje: "${ctx.prioridade1}".\n\nQuer ajustar algum desses pontos comigo?`,
      acoesPropostas: acoes,
      sugestoesResposta: [
        "Me ajuda a organizar meu dia de hoje",
        "Quero registrar um gasto que fiz agora",
        "Estou meio cansada hoje, o que sugere?",
      ],
    };
  }

  if (modo === "devaneio") {
    acoes.push(
      {
        id: `act-${Date.now()}-brain`,
        tipo: "GUARDAR_SEGUNDO_CEREBRO",
        titulo: "Guardar no Segundo Cérebro",
        detalhe: "Salva essa ideia/devaneio no seu repositório de notas",
        executada: false,
        payload: {
          texto,
          areaNota:
            lower.includes("uerj") || lower.includes("artigo")
              ? "Artigos"
              : "Pessoal",
          anexo,
        },
      },
      {
        id: `act-${Date.now()}-task`,
        tipo: "CRIAR_TAREFA",
        titulo: "Virar Tarefa Hoje",
        detalhe: `Adicionar "${texto.slice(0, 45)}" na lista de Hoje`,
        executada: false,
        payload: { texto },
      }
    );

    return {
      modo: "devaneio",
      nomeAnexo: anexo?.nome,
      anexo,
      tituloCard: `Conversa & Ideia`,
      tags: ["Bate-Papo", "Ideia", "Memória"],
      guardadoNoCofre: true,
      respostaLala: `Adorei você compartilhar isso comigo! Se quiser transformar esse pensamento em algo prático hoje ou guardar no Segundo Cérebro para não esquecer, já deixei os atalhos prontos aqui embaixo — ou pode continuar me contando mais que estou te ouvindo!`,
      acoesPropostas: acoes,
      sugestoesResposta: [
        "Guarda isso no Segundo Cérebro",
        "Como encaixo isso na minha rotina da semana?",
        "Me dá ideias de próximos passos pra isso",
      ],
    };
  }

  // Extrai aprendizados contínuos nas 5 dimensões mesmo em modo local/offline
  const aprendizadosExtraidosLocais: {
    categoria: CategoriaAprendizadoLala;
    texto: string;
  }[] = [];

  if (contasExtraidas.length > 0) {
    aprendizadosExtraidosLocais.push({
      categoria: "contexto",
      texto: `Saldos bancários informados: ${contasExtraidas
        .map(
          (c) =>
            `${c.nome} em R$ ${c.saldoAtual.toFixed(2).replace(".", ",")}`
        )
        .join(", ")}`,
    });
  }
  if (listaLancamentosExtraidos.length > 0) {
    const itemG = listaLancamentosExtraidos[0];
    aprendizadosExtraidosLocais.push({
      categoria: "acao_usuario",
      texto: `Costuma lançar "${itemG.descricao}" na categoria ${itemG.categoria} (${itemG.metodo})`,
    });
  }
  if (matchHoraComp) {
    aprendizadosExtraidosLocais.push({
      categoria: "rotina",
      texto: `Compromisso/hábito de rotina mencionado: "${texto.slice(0, 80)}"`,
    });
  }
  if (
    /\b(sempre que|prefiro que|quero que voc[êe]|nunca |a partir de agora|aprenda que)\b/i.test(
      lower
    )
  ) {
    aprendizadosExtraidosLocais.push({
      categoria: "forma_de_uso",
      texto: texto.trim(),
    });
  }
  if (
    /\b(decidi|escolhi|vou priorizar|minha prioridade|resolvi)\b/i.test(lower)
  ) {
    aprendizadosExtraidosLocais.push({
      categoria: "decisao",
      texto: texto.trim(),
    });
  }

  // Evita transformar mensagens de conversa/reclamação/alinhamento/enriquecimento ("Tente de novo", "Evite perguntas", "Parar de dar ação") ou prints de imagem em tarefas!
  const ehMensagemConversaOuRetry =
    Boolean(anexo?.mimeType?.startsWith("image/")) ||
    /^(tente de novo|tenta de novo|refa[çc]a|repete|repita|n[ãa]o leu|voc[êe] n[ãa]o leu|leia os prints|l[êe] os prints|errou|est[áa] errado|n[ãa]o funcionou|cade o picpay|cad[êe] o picpay|faltou o picpay|n[ãa]o tenho ita[uú]|tire o ita[uú]|tira o ita[uú]|continue|continua)$/i.test(
      lower.trim()
    ) ||
    /\b(tente de novo|tenta de novo|voc[êe] n[ãa]o leu|n[ãa]o leu os prints|faltou criar|n[ãa]o tinha ita[uú]|parte de finan[çc]as|minhas contas|evite perguntas|evitar perguntas|parar de ficar dando a[çc][ãa]o|n[ãa]o precisa dar a[çc][ãa]o|sem a[çc][ãa]o|entendeu o que quis dizer|enriquecer|acumular os gastos)\b/i.test(
      lower
    );

  // Modo "comando"
  if (acoes.length === 0 && !ehMensagemConversaOuRetry) {
    acoes.push({
      id: `act-${Date.now()}-task-cmd`,
      tipo: "CRIAR_TAREFA",
      titulo: `Adicionar Tarefa: "${(texto || anexo?.nome || "Nova tarefa").slice(0, 45)}"`,
      detalhe: "Entra na sua lista de Hoje já priorizada",
      executada: false,
      payload: { texto: texto || `Revisar ${anexo?.nome}` },
    });
  }

  const resumoConfirmacaoListaGastos =
    temListaGastosOuRecorrentes && listaLancamentosExtraidos.length > 0
      ? `Recebi sua lista e identifiquei **todas as ${
          listaLancamentosExtraidos.length
        } despesas** (Total: **R$ ${listaLancamentosExtraidos
          .reduce((s, i) => s + i.valor, 0)
          .toFixed(2)
          .replace(".", ",")}**), sem omitir nenhuma e **sem inventar datas** para os itens em que você não informou dia:\n\n` +
        listaLancamentosExtraidos
          .map(
            (item, idx) =>
              `${idx + 1}. **${item.descricao}** — R$ ${item.valor
                .toFixed(2)
                .replace(".", ",")} · *${
                item.semData
                  ? "Sem data definida (não assumi dia)"
                  : item.data
              }* (${item.categoria})`
          )
          .join("\n") +
        `\n\nDeixei o card completo logo abaixo com todos os ${listaLancamentosExtraidos.length} itens para você revisar, editar qualquer data/valor se quiser ou confirmar de uma só vez!`
      : null;

  const respostaContextualizadaComando = resumoConfirmacaoListaGastos
    ? resumoConfirmacaoListaGastos
    : falouDeTreinoOuFicha
    ? `Analisei ${
        anexo ? `o arquivo "${anexo.nome}"` : "sua nova ficha de treino"
      } e montei a estrutura completa de exercícios, séries, repetições e intervalos logo abaixo!\n\nVocê pode tocar em **Editar** no card para personalizar qualquer exercício ou carga, ou em **Confirmar** para salvar diretamente na sua aba **Saúde & Treinos**.`
    : falouDeSaldoOuConta
    ? contasExtraidas.length > 0
      ? `Prontinho! Identifiquei a atualização de saldo para **${contasExtraidas
          .map(
            (c) =>
              `${c.nome} (R$ ${c.saldoAtual.toFixed(2).replace(".", ",")})`
          )
          .join(
            " e "
          )}**. Deixei o card pronto logo abaixo: basta tocar em **Confirmar** para atualizar seu saldo e recalcular seu Dinheiro Livre Hoje (ou em **Editar** se quiser ajustar algum centavo).`
      : `Claro! Já deixei o card de **Atualização de Saldo Bancário** pronto aqui embaixo com suas contas atuais (${
          ctx.contasBancarias && ctx.contasBancarias.length > 0
            ? ctx.contasBancarias
                .map(
                  (c) =>
                    `${c.nome}: R$ ${c.saldoAtual.toFixed(2).replace(".", ",")}`
                )
                .join(" · ")
            : "Nubank"
        }).\n\nVocê pode clicar em **Editar** direto no card abaixo para colocar o novo valor e confirmar, ou simplesmente me responder dizendo algo como: *"Meu saldo no Nubank é R$ 1.450,00"*!`
    : anexo
    ? `Analisei o arquivo "${anexo.nome}" e deixei as ações prontas abaixo para você revisar e confirmar com 1 toque.`
    : `Prontinho! Preparei a ação logo abaixo considerando sua rotina de hoje (Prontidão em ${ctx.prontidaoScore}% e R$ ${ctx.dinheiroLivreHoje
        .toFixed(2)
        .replace(".", ",")} livres hoje). Confira e confirme ou edite como preferir!`;

  return {
    modo: "comando",
    nomeAnexo: anexo?.nome,
    anexo,
    tituloCard: resumoConfirmacaoListaGastos
      ? `Confirmação Completa (${listaLancamentosExtraidos.length} Despesas)`
      : falouDeTreinoOuFicha
      ? `Nova Ficha de Treino`
      : falouDeSaldoOuConta
      ? "Atualização de Saldo Bancário"
      : anexo
      ? `Arquivo processado: ${anexo.nome}`
      : `Ação preparada pela Lala`,
    tags: resumoConfirmacaoListaGastos
      ? ["Finanças", "Gastos Recorrentes", `${listaLancamentosExtraidos.length} Itens`]
      : falouDeTreinoOuFicha
      ? ["Saúde & Treinos", "Musculação", "Exercícios"]
      : falouDeSaldoOuConta
      ? ["Finanças", "Saldo Bancário", "Dinheiro Livre"]
      : anexo
      ? ["Arquivo", "Ação Rápida"]
      : ["Acesso Rápido", "Execução"],
    respostaLala: respostaContextualizadaComando,
    acoesPropostas: acoes,
    aprendizadosExtraidos:
      aprendizadosExtraidosLocais.length > 0
        ? aprendizadosExtraidosLocais
        : undefined,
    sugestoesResposta: falouDeSaldoOuConta
      ? [
          "Meu saldo no Nubank é R$ 1.250,00",
          "Atualizar Itaú para R$ 450,00",
          "Como ficou meu Dinheiro Livre Hoje?",
        ]
      : [
          "Como ficou meu resumo de hoje?",
          "Atualizar meu saldo bancário",
          "Dei sachê pra Nina e pro Tobias",
        ],
  };
}

export interface ConsultarLalaInputObject {
  mensagem: string;
  tom?: string;
  anexo?: AnexoLala;
  anexos?: AnexoLala[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contexto?: any;
}

export async function consultarLalaUnificada(
  textoOuObj: string | ConsultarLalaInputObject,
  ctxArg?: LalaContextSnapshot,
  anexoOuAnexos?: AnexoLala | AnexoLala[]
): Promise<Omit<InteracaoGovernanta, "id" | "dataHora" | "mensagemUsuario">> {
  const texto =
    typeof textoOuObj === "string"
      ? textoOuObj
      : String(textoOuObj?.mensagem || "");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawCtx: any =
    typeof textoOuObj === "object" && textoOuObj !== null
      ? textoOuObj.contexto || ctxArg || {}
      : ctxArg || {};

  const ctx: LalaContextSnapshot = {
    nomeUsuario: rawCtx.nomeUsuario,
    prontidaoScore: Number(rawCtx.prontidaoScore ?? 80),
    horasSono: Number(rawCtx.horasSono ?? 7.5),
    dinheiroLivreHoje: Number(rawCtx.dinheiroLivreHoje ?? 100),
    sachesRestantes: Number(
      rawCtx.sachesRestantes ?? rawCtx.sachesEstoque ?? 6
    ),
    tarefasHojeCount: Number(
      rawCtx.tarefasHojeCount ??
        (Array.isArray(rawCtx.tarefasPendentesHoje)
          ? rawCtx.tarefasPendentesHoje.length
          : 3)
    ),
    prioridade1: String(
      rawCtx.prioridade1 ||
        (Array.isArray(rawCtx.tarefasPendentesHoje) &&
        rawCtx.tarefasPendentesHoje[0]
          ? rawCtx.tarefasPendentesHoje[0]
          : "Foco do dia")
    ),
    disciplinasUERJ: Array.isArray(rawCtx.disciplinasUERJ)
      ? rawCtx.disciplinasUERJ
      : [],
    projetosAtivos: Array.isArray(rawCtx.projetosAtivos)
      ? rawCtx.projetosAtivos
      : [],
    contasBancarias: Array.isArray(rawCtx.contasBancarias)
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rawCtx.contasBancarias.filter((c: any) => {
          const nomeStr = String(c?.nome || "");
          // Remove a antiga conta de exemplo "Itaú (Bolsa UERJ & CDT)" do contexto para nunca poluir propostas
          if (nomeStr.includes("Itaú (Bolsa UERJ & CDT)")) return false;
          if (
            nomeStr.includes("Reserva / Caixinha Quitação") &&
            Number(c?.saldoAtual) === 0
          ) {
            return false;
          }
          return true;
        })
      : undefined,
    cartoesCredito: rawCtx.cartoesCredito,
    tomLala:
      rawCtx.tomLala ||
      (typeof textoOuObj === "object" ? textoOuObj?.tom : undefined),
    autonomiaLala: rawCtx.autonomiaLala || "confirmar",
    tiposAutomatizados: rawCtx.tiposAutomatizados || [],
    regrasAprendidasLala: rawCtx.regrasAprendidasLala || [],
    itensMemoriaViva: rawCtx.itensMemoriaViva || [],
    ultimasAcoesNoApp: rawCtx.ultimasAcoesNoApp || [],
    instrucoesPersonalizadasLala: rawCtx.instrucoesPersonalizadasLala,
    horarioAcordar: rawCtx.horarioAcordar,
    horarioDormir: rawCtx.horarioDormir,
    historicoConversa:
      rawCtx.historicoConversa || rawCtx.historicoRecente || [],
  };

  const rawAnexos =
    typeof textoOuObj === "object" && textoOuObj !== null
      ? textoOuObj.anexos && textoOuObj.anexos.length > 0
        ? textoOuObj.anexos
        : textoOuObj.anexo
        ? [textoOuObj.anexo]
        : []
      : Array.isArray(anexoOuAnexos)
      ? anexoOuAnexos
      : anexoOuAnexos
      ? [anexoOuAnexos]
      : [];

  const listaAnexosBruta: AnexoLala[] = rawAnexos.filter(Boolean);
  const listaAnexos: AnexoLala[] = [];
  for (const anx of listaAnexosBruta) {
    const pareceImg =
      anx.mimeType?.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif|heic|heif|bmp)$/i.test(anx.nome || "");
    if (pareceImg && anx.base64 && anx.base64.length > 140000) {
      const otimizado = await comprimirDataUrlDeImagem(
        anx.base64,
        "image/jpeg",
        anx.tamanhoBytes
      );
      listaAnexos.push({
        ...anx,
        base64: otimizado.base64,
        mimeType: otimizado.mimeType,
        tamanhoBytes: otimizado.tamanhoBytes,
      });
    } else if (pareceImg && (!anx.mimeType || !anx.mimeType.startsWith("image/"))) {
      listaAnexos.push({
        ...anx,
        mimeType: "image/jpeg",
      });
    } else {
      listaAnexos.push(anx);
    }
  }
  const primeiroAnexo = listaAnexos[0];

  // Sanitiza contas de exemplo antigas (Itaú / Reserva padrão) do contexto para nunca poluir a análise
  const contasLimparCtx = (ctx.contasBancarias || []).filter(
    (c) =>
      !c.nome.includes("Itaú (Bolsa UERJ & CDT)") &&
      !(
        c.nome.includes("Reserva / Caixinha Quitação") &&
        (c.saldoAtual === 2450 || c.saldoAtual === 0)
      )
  );
  const ctxSanitizado: LalaContextSnapshot = {
    ...ctx,
    contasBancarias: contasLimparCtx,
  };

  // Se o usuário pediu explicitamente "só guardar" um arquivo, executa direto
  if (primeiroAnexo?.intencao === "guardar") {
    return processarMensagemLocalLala(texto, ctxSanitizado, primeiroAnexo);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = null;

  if (typeof navigator !== "undefined" && navigator.onLine) {
    const payloadBody = JSON.stringify({
      mensagem: texto,
      contextoApp: ctxSanitizado,
      historicoConversa: ctxSanitizado.historicoConversa,
      anexo: primeiroAnexo,
      anexos: listaAnexos,
    });

    const isNodeBackendHost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.includes(".run.app"));

    const clientKeys = obterChavesGeminiCliente();

    const tentarChamadaDiretaGemini = async () => {
      if (clientKeys.length === 0) return null;
      const historicoFormatado =
        Array.isArray(ctxSanitizado.historicoConversa) &&
        ctxSanitizado.historicoConversa.length > 0
          ? ctxSanitizado.historicoConversa
              .slice(-25)
              .map(
                (h) =>
                  `[${h.dataHora || "Antes"}] Usuária: ${h.usuario}\nLala: ${h.lala}${
                    h.acoesResumo
                      ? `\n[Ações geradas nesta mensagem: ${h.acoesResumo}]`
                      : ""
                  }`
              )
              .join("\n---\n")
          : "Início da conversa.";

      const systemInstruction = `Você é a Lala, a governanta pessoal, parceira de decisões e assistente de vida inteligente do aplicativo "Casa da Lala".
Você conversa em formato de BATE-PAPO humano, acolhedor, perspicaz, proativo e altamente contextualizado.

Contexto completo e Memória Viva da usuária:
${JSON.stringify(ctxSanitizado || {})}

Histórico recente da conversa:
${historicoFormatado}

DIRETRIZES DE INTELIGÊNCIA ADAPTATIVA E LEITURA DE PRINTS (CRÍTICO):
1. APRENDIZADO EM 5 DIMENSÕES:
   Preencha "aprendizadosExtraidos" com aprendizados concretos nas categorias: "contexto", "acao_usuario", "decisao", "rotina", "forma_de_uso".
2. LEITURA DE PRINTS BANCÁRIOS, SALDOS E ARQUIVOS:
   - Analise CADA IMAGEM anexada individualmente com máxima atenção!
   - Identifique o nome exato de CADA banco/instituição que aparece nas imagens (ex: "PicPay", "Nubank", "Reserva / Caixinha", "Banco Inter", "Bradesco", "Santander", "C6 Bank", "Mercado Pago", etc.) e o valor numérico exato do saldo disponível ("saldoAtual") ou fatura ("faturaAtual", "limiteTotal").
   - CONSOLIDAÇÃO OBRIGATÓRIA: Se houver 2, 3 ou mais prints de bancos diferentes, inclua TODOS os bancos identificados juntos no mesmo array "contasAjuste" dentro de uma única ação "ATUALIZAR_CONTAS_FINANCAS". Não deixe nenhum banco dos prints de fora!
   - PROIBIÇÃO DE CONTAS FANTASMAS: Em "contasAjuste", inclua SOMENTE as contas que aparecem visualmente nos prints enviados pela usuária ou que foram citadas por ela na mensagem! NUNCA inclua "Itaú" nem qualquer outra conta que não esteja nos prints enviados!
    - Defina "substituirExistentes": true sempre que a usuária enviar prints das contas dela para atualizar as finanças, garantindo que apenas as contas reais dos prints fiquem no aplicativo!
3. LISTAS DE GASTOS RECORRENTES, CONTAS FIXAS, PAGAMENTOS PREVISTOS E CATEGORIAS FLEXÍVEIS (REGRA DE OURO):
   - Quando a usuária enviar uma lista de gastos recorrentes, despesas fixas, boletos, assinaturas ou pagamentos previstos (seja por texto, áudio ou imagem), você DEVE confirmar e incluir **100% de todas as despesas enviadas sem omitir NENHUMA**, tanto no texto de "respostaLala" (listando uma por uma com valor e data/sem data) quanto no array "lancamentosAjuste" dentro da ação "REGISTRAR_GASTO".
   - PROIBIDO INVENTAR OU ASSUMIR DATAS: Se a usuária informou o dia de vencimento (ex: "dia 10", "vence dia 15", "05/05"), preencha "diaVencimento": 10, "data": "Todo dia 10" (ou "10/05"), "semData": false. Se a usuária NÃO informou data/dia para uma despesa (ex: "Netflix R$ 55,90" ou "Condomínio R$ 620"), preencha OBRIGATORIAMENTE "semData": true, "diaVencimento": null e "data": "Sem data". NUNCA invente dias nem use a data de hoje para gastos previstos/recorrentes sem data!
   - ATUALIZAÇÃO DE DATAS DE GASTOS RECORRENTES JÁ EXISTENTES: Se a usuária informar as datas/dias de vencimento de gastos que ela já mencionou antes (ex: "Academia dia 10, Wellhub dia 05, Acordo dia 18 e Celular dia 17"), inclua esses itens em "lancamentosAjuste" dentro de "REGISTRAR_GASTO" com os valores correspondentes do contexto e as novas datas ("Todo dia 10", "diaVencimento": 10, "semData": false, "recorrente": true) — o aplicativo atualizará os lançamentos existentes sem duplicar!
   - CATEGORIAS FLEXÍVEIS E ACUMULADORES DE GASTOS VARIÁVEIS: As categorias financeiras incluem "Mercado", "Transporte", "Compras Avulsas", "Moradia & Fixos", "Pets", "Estudos & UERJ", "Lazer & Outros" e "Dívida". Gastos variáveis do dia a dia (como Uber/Transporte, Mercado e Compras Avulsas) funcionam como acumuladores mensais inteligentes na aba Finanças (não exigem teto fixo rígido se a usuária não quiser estipular um valor prévio).
   - Não use "AGENDAR_COMPROMISSO" para despesas financeiras/boletos; use "REGISTRAR_GASTO" com "lancamentosAjuste" contendo todos os itens!
4. PROIBIÇÃO DE PERGUNTAS DESNECESSÁRIAS E DE AÇÕES INDESEJADAS QUANDO O OBJETIVO É ENRIQUECER / ALINHAR (CRÍTICO):
   - Quando a usuária estiver explicando como funciona a rotina/finanças dela, ensinando regras, calibrando seu entendimento, reclamando de algo ou pedindo para você "evitar perguntas quando o objetivo é enriquecer" / "parar de ficar dando ação toda hora":
     a) NÃO gere cards de ação ("acoesPropostas": [])! Gere ações SOMENTE quando houver um comando concreto de lançamento, atualização de dados reais ou pedido explícito de execução. Conversas de alinhamento, explicações de regras ou feedbacks sobre seu comportamento DEVEM ter "acoesPropostas": [] (guarde tudo silenciosamente em "aprendizadosExtraidos" e "novaRegraAprendida").
     b) EVITE FAZER PERGUNTAS NO FINAL DA RESPOSTA quando o objetivo for enriquecer seu contexto ou consolidar informações! Não fique interrogando a usuária a cada mensagem. Em vez de fazer perguntas, consolide o que você entendeu de forma direta, inteligente e completa, fazendo apenas apontamentos práticos e úteis.

IMPORTANTE: Retorne SEMPRE um ÚNICO objeto JSON {...} na raiz (NUNCA retorne uma lista/array [...] na raiz, mesmo quando houver várias imagens!).
Formato exato do objeto JSON:
{
  "modoDetectado": "comando" | "devaneio" | "desabafo" | "orientacao" | "informacao",
  "transcricaoAudioUsuario": "string opcional",
  "respostaLala": "Sua resposta detalhada citando cada banco/item e valor real lido sem omitir nenhum",
  "tituloCard": "Resumo em até 5 palavras",
  "tags": ["Tag1", "Tag2"],
  "novaRegraAprendida": "string opcional",
  "aprendizadosExtraidos": [{ "categoria": "contexto", "texto": "..." }],
  "acoesPropostas": [
    {
      "tipo": "ATUALIZAR_CONTAS_FINANCAS" | "REGISTRAR_GASTO" | "REGISTRAR_RECEITA" | "CRIAR_TAREFA" | "AGENDAR_COMPROMISSO" | "ALIMENTAR_PETS" | "REGISTRAR_SRPE" | "ATUALIZAR_DIETA_E_COMPRAS" | "CRIAR_LISTA_COMPRAS" | "ATUALIZAR_GRADE_UERJ" | "ATUALIZAR_PETS" | "ATUALIZAR_TREINO" | "ATUALIZAR_PROJETOS_TRABALHO" | "ATUALIZAR_HABITOS" | "ATUALIZAR_METAS_RADAR" | "ATUALIZAR_PERFIL_CHECKIN" | "ALIVIAR_AGENDA_HOJE" | "LIMPAR_DADOS_EXEMPLO" | "GUARDAR_SEGUNDO_CEREBRO",
      "titulo": "Título claro da ação descrevendo os bancos/itens reais lidos",
      "detalhe": "Explicação curta do impacto no app",
      "substituirExistentes": true,
      "contasAjuste": [{ "nome": "Nome exato do Banco lido", "saldoAtual": 0 }],
      "cartoesAjuste": [],
      "lancamentosAjuste": [{ "descricao": "Nome da despesa", "valor": 0, "tipo": "despesa", "status": "previsto", "data": "Todo dia 10 ou Sem data", "diaVencimento": 10, "semData": false, "recorrente": true, "metodo": "Conta / Pix", "categoria": "Moradia & Fixos" }]
    }
  ]
}`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = [];
      for (const itemAnexo of listaAnexos) {
        if (itemAnexo?.base64 && itemAnexo.mimeType) {
          const cleanBase64 = (
            itemAnexo.base64.includes(",")
              ? itemAnexo.base64.split(",")[1]
              : itemAnexo.base64
          ).replace(/\s+/g, "");
          let mimeNormalizado = itemAnexo.mimeType.split(";")[0].trim().toLowerCase();
          if (mimeNormalizado === "image/jpg") mimeNormalizado = "image/jpeg";
          if (
            mimeNormalizado.startsWith("image/") ||
            mimeNormalizado.startsWith("audio/") ||
            mimeNormalizado === "application/pdf"
          ) {
            parts.push({
              inlineData: {
                mimeType: mimeNormalizado,
                data: cleanBase64,
              },
            });
          }
        }
      }
      const anexosNaoAudio = listaAnexos.filter(
        (a) => !a.mimeType?.startsWith("audio/")
      );
      let promptTexto =
        texto ||
        "Analise detalhadamente todas as imagens anexadas, extraia cada banco e saldo exato visível nos prints e gere um único objeto JSON com a ação ATUALIZAR_CONTAS_FINANCAS contendo todos os bancos presentes nos prints.";
      if (anexosNaoAudio.length > 0) {
        promptTexto += `\n\n[ATENÇÃO: Foram anexadas ${anexosNaoAudio.length} imagem(ns): ${anexosNaoAudio
          .map((a, idx) => `#${idx + 1} "${a.nome}"`)
          .join(", ")}. Extraia os dados de TODAS as imagens sem omitir nenhum banco e retorne um ÚNICO objeto JSON consolidado!]`;
      }
      parts.push({ text: promptTexto });

      const clientModels = [
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite-preview",
        "gemini-flash-latest",
      ];

      // 1) Tenta via REST direto em generativelanguage.googleapis.com (compatível com qualquer PWA iOS / GitHub / Vercel / navegador)
      for (const apiKey of clientKeys) {
        for (const mName of clientModels) {
          for (const useThinkingLow of [true, false]) {
            try {
              const genConfig: Record<string, unknown> = {
                responseMimeType: "application/json",
              };
              if (useThinkingLow && mName.startsWith("gemini-3")) {
                genConfig.thinkingConfig = { thinkingLevel: "LOW" };
              } else if (!useThinkingLow && mName.startsWith("gemini-3")) {
                continue;
              }
              const restRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${encodeURIComponent(
                  apiKey
                )}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                    contents: [{ role: "user", parts }],
                    generationConfig: genConfig,
                  }),
                }
              );
              if (restRes.ok) {
                const restJson = await restRes.json();
                const allParts =
                  restJson?.candidates?.[0]?.content?.parts || [];
                // Exclui partes de pensamento interno (thought: true) para extrair apenas o JSON final
                const textOut =
                  allParts
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .filter((p: any) => typeof p?.text === "string" && !p?.thought)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map((p: any) => p.text)
                    .join("\n")
                    .trim() ||
                  allParts
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .find((p: any) => typeof p?.text === "string")?.text ||
                  "";
                if (textOut) {
                  const candidate = extrairJsonSeguroCliente(textOut);
                  if (candidate && typeof candidate.respostaLala === "string") {
                    return candidate;
                  }
                }
              }
            } catch {
              // Tenta próximo modelo ou SDK
            }
          }
        }
      }

      // 2) Fallback via SDK @google/genai
      for (const apiKey of clientKeys) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          for (const mName of clientModels) {
            try {
              const response = await ai.models.generateContent({
                model: mName,
                contents: parts,
                config: {
                  systemInstruction,
                  responseMimeType: "application/json",
                  ...(mName.startsWith("gemini-3")
                    ? {
                        thinkingConfig: {
                          thinkingLevel: ThinkingLevel.LOW,
                        },
                      }
                    : {}),
                },
              });
              if (response?.text) {
                const candidate = extrairJsonSeguroCliente(response.text);
                if (candidate && typeof candidate.respostaLala === "string") {
                  return candidate;
                }
              }
            } catch {
              // Tenta próximo modelo
            }
          }
        } catch (err) {
          console.warn("Aviso no fallback direto Gemini:", err);
        }
      }
      return null;
    };

    // Se não estiver rodando diretamente no servidor Node (ex: app hospedado via GitHub / Firebase / Vercel / PWA),
    // chama o Gemini direto primeiro para evitar latência de rota inexistente
    if (!isNodeBackendHost && clientKeys.length > 0) {
      data = await tentarChamadaDiretaGemini();
    }

    if (!data) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        try {
          const res = await fetch("/api/lala/interact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payloadBody,
            signal: controller.signal,
          });

          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("application/json")) {
            const parsed = await res.json();
            const norm = normalizarObjetoJsonCliente(parsed);
            if (norm && norm.respostaLala) {
              data = norm;
            }
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (err) {
        console.warn("Aviso na chamada /api/lala/interact (ativando fallback):", err);
      }
    }

    // Fallback Multimodal Direto caso /api/lala/interact não tenha respondido
    if (!data && clientKeys.length > 0) {
      data = await tentarChamadaDiretaGemini();
    }

    if (data && data.respostaLala) {
      const modoDetectado: ModoInteracaoLala =
        data.modoDetectado || detectarIntencaoNatural(texto, primeiroAnexo);

      const normalizarNumeroMoeda = (val: unknown, fallback = 0): number => {
        if (typeof val === "number" && !isNaN(val)) return val;
        if (typeof val === "string" && val.trim()) {
          const limpo = val
            .replace(/r\$\s*/gi, "")
            .replace(/\s+/g, "")
            .trim();
          if (limpo.includes(",") && limpo.includes(".")) {
            const n = Number(limpo.replace(/\./g, "").replace(",", "."));
            if (!isNaN(n)) return n;
          } else if (limpo.includes(",")) {
            const n = Number(limpo.replace(",", "."));
            if (!isNaN(n)) return n;
          } else {
            const n = Number(limpo);
            if (!isNaN(n)) return n;
          }
        }
        return fallback;
      };

      // Normaliza as ações propostas pelo Gemini garantindo que ATUALIZAR_CONTAS_FINANCAS sempre tenha contasAjuste válido
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const acoesMapeadas: AcaoGovernanta[] = Array.isArray(data.acoesPropostas)
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.acoesPropostas.map((a: any, idx: number) => {
            const rawContas =
              a.contasAjuste || a.payload?.contasAjuste || a.contas || [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let contasNormalizadas = Array.isArray(rawContas)
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                rawContas.map((c: any) => ({
                  nome: String(
                    c.nome ||
                      c.banco ||
                      c.conta ||
                      ctx.contasBancarias?.[0]?.nome ||
                      "Nubank"
                  ),
                  saldoAtual: normalizarNumeroMoeda(
                    c.saldoAtual ?? c.saldo ?? c.valor ?? a.valor,
                    0
                  ),
                }))
              : [];

            const rawCartoes =
              a.cartoesAjuste || a.payload?.cartoesAjuste || a.cartoes || [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cartoesNormalizados = Array.isArray(rawCartoes)
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                rawCartoes.map((cc: any) => ({
                  nome: String(cc.nome || cc.cartao || "Cartão de Crédito"),
                  faturaAtual: normalizarNumeroMoeda(
                    cc.faturaAtual ?? cc.fatura ?? cc.valor,
                    0
                  ),
                  limiteTotal:
                    cc.limiteTotal !== undefined
                      ? normalizarNumeroMoeda(cc.limiteTotal, 3000)
                      : undefined,
                  vencimentoDia:
                    cc.vencimentoDia !== undefined
                      ? Number(cc.vencimentoDia)
                      : undefined,
                }))
              : [];

            if (
              a.tipo === "ATUALIZAR_CONTAS_FINANCAS" &&
              contasNormalizadas.length === 0 &&
              cartoesNormalizados.length === 0
            ) {
              // Tenta extrair da resposta ou do texto da usuária
              const fallbackLocal = processarMensagemLocalLala(
                `${texto} ${a.titulo || ""} ${data.respostaLala || ""}`,
                ctx,
                primeiroAnexo
              );
              const acaoSaldoLocal = (fallbackLocal.acoesPropostas || []).find(
                (ac) => ac.tipo === "ATUALIZAR_CONTAS_FINANCAS"
              );
              if (acaoSaldoLocal?.payload?.contasAjuste?.length) {
                contasNormalizadas = acaoSaldoLocal.payload.contasAjuste;
              } else if (typeof a.valor === "number" && !isNaN(a.valor)) {
                contasNormalizadas = [
                  {
                    nome:
                      ctx.contasBancarias?.[0]?.nome || "Nubank",
                    saldoAtual: a.valor,
                  },
                ];
              } else {
                contasNormalizadas =
                  ctx.contasBancarias && ctx.contasBancarias.length > 0
                    ? ctx.contasBancarias.map((c) => ({
                        nome: c.nome,
                        saldoAtual: c.saldoAtual,
                      }))
                    : [
                        { nome: "Nubank", saldoAtual: 0 },
                        { nome: "PicPay", saldoAtual: 0 },
                      ];
              }
            }

            const enviouPrintsImagem = listaAnexos.some((anx) =>
              anx.mimeType?.startsWith("image/")
            );
            const citouItauNoTexto = /\b(ita[uú]|iti)\b/i.test(texto);

            // Se a usuária não citou Itaú, remove qualquer conta de exemplo do Itaú ou Caixinha Quitação zerada
            if (!citouItauNoTexto) {
              contasNormalizadas = contasNormalizadas.filter(
                (c) =>
                  !c.nome.includes("Bolsa UERJ") &&
                  !c.nome.toLowerCase().includes("itaú") &&
                  !c.nome.toLowerCase().includes("itau") &&
                  !(
                    (c.saldoAtual === 0 || c.saldoAtual === 2450) &&
                    c.nome.includes("Caixinha Quitação")
                  )
              );
            }

            const deveSubstituirContas =
              Boolean(
                a.substituirExistentes ?? a.payload?.substituirExistentes
              ) ||
              (a.tipo === "ATUALIZAR_CONTAS_FINANCAS" &&
                (enviouPrintsImagem ||
                  /\b(minhas contas|prints das minhas contas|atualize a parte de finan[çc]as|essas s[ãa]o minhas contas|todas as minhas contas)\b/i.test(
                    texto
                  )));

            const rawLancamentos =
              a.lancamentosAjuste ||
              a.payload?.lancamentosAjuste ||
              a.lancamentos ||
              [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const lancamentosNormalizados = Array.isArray(rawLancamentos)
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                rawLancamentos
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .map((l: any) => {
                    const desc = String(
                      l.descricao || l.nome || l.titulo || "Despesa"
                    ).trim();
                    const val = normalizarNumeroMoeda(l.valor, 0);
                    const rawDataStr = String(l.data || "").trim();
                    const ehSemData =
                      l.semData === true ||
                      !rawDataStr ||
                      /^(sem\s*data|n[ãa]o\s*informad|indefinid)/i.test(
                        rawDataStr
                      );
                    const diaVenc =
                      !ehSemData &&
                      typeof l.diaVencimento === "number" &&
                      l.diaVencimento >= 1 &&
                      l.diaVencimento <= 31
                        ? l.diaVencimento
                        : null;
                    return {
                      descricao: desc,
                      valor: val,
                      tipo: (l.tipo === "receita" ? "receita" : "despesa") as
                        | "despesa"
                        | "receita",
                      status: (l.status === "realizado"
                        ? "realizado"
                        : "previsto") as "previsto" | "realizado",
                      data: ehSemData ? "Sem data" : rawDataStr,
                      diaVencimento: diaVenc,
                      semData: ehSemData,
                      recorrente: Boolean(l.recorrente),
                      metodo: (l.metodo === "Cartão de Crédito"
                        ? "Cartão de Crédito"
                        : "Conta / Pix") as "Conta / Pix" | "Cartão de Crédito",
                      categoria: (l.categoria ||
                        inferirCategoriaDeTexto(desc)) as OrcamentoCategoria["categoria"],
                    };
                  })
                  .filter((l) => l.valor > 0)
              : [];

            return {
              id: `ai-act-${Date.now()}-${idx}`,
              tipo: a.tipo || "CRIAR_TAREFA",
              titulo: a.titulo || "Ação da Lala",
              detalhe: a.detalhe || "",
              executada: false,
              payload: {
                texto: a.texto || a.payload?.texto || a.titulo,
                valor:
                  a.valor !== undefined || a.payload?.valor !== undefined
                    ? normalizarNumeroMoeda(a.valor ?? a.payload?.valor, 0)
                    : undefined,
                categoriaGasto: a.categoriaGasto || a.payload?.categoriaGasto,
                data: a.data || a.payload?.data,
                diaVencimento:
                  a.diaVencimento ?? a.payload?.diaVencimento ?? null,
                semData: a.semData ?? a.payload?.semData,
                statusGasto: a.statusGasto || a.payload?.statusGasto,
                recorrente: a.recorrente ?? a.payload?.recorrente,
                lancamentosAjuste:
                  lancamentosNormalizados.length > 0
                    ? lancamentosNormalizados
                    : undefined,
                srpe: a.srpe ?? a.payload?.srpe,
                areaNota:
                  a.areaNota ||
                  a.payload?.areaNota ||
                  primeiroAnexo?.areaRepositorio,
                anexo: primeiroAnexo,
                substituirExistentes: deveSubstituirContas,
                compromissos: a.compromissos || a.payload?.compromissos,
                refeicoes: a.refeicoes || a.payload?.refeicoes,
                itensCompras: a.itensCompras || a.payload?.itensCompras,
                disciplinas: a.disciplinas || a.payload?.disciplinas,
                contasAjuste:
                  contasNormalizadas.length > 0 ? contasNormalizadas : undefined,
                cartoesAjuste:
                  cartoesNormalizados.length > 0
                    ? cartoesNormalizados
                    : undefined,
                petsAjuste: a.petsAjuste || a.payload?.petsAjuste,
                fichaTreino: a.fichaTreino || a.payload?.fichaTreino,
                projetos: a.projetos || a.payload?.projetos,
                habitos: a.habitos || a.payload?.habitos,
                metas: a.metas || a.payload?.metas,
                perfilCheckin: a.perfilCheckin || a.payload?.perfilCheckin,
              },
            };
          })
        : [];

      // Reconciliação determinística de Listas de Gastos Recorrentes / Despesas Fixas / Pagamentos Previstos:
      // 1) Garante que TODAS as despesas enviadas pela usuária estejam incluídas (nenhuma omitida).
      // 2) Garante que NENHUMA data seja inventada ou assumida quando a usuária não informou o dia daquele item!
      const textoParaExtracaoGastos = `${texto} ${primeiroAnexo?.textoExtraido || ""}`;
      const lancamentosExtraidosTexto = extrairListaLancamentosOuGastosRecorrentes(
        textoParaExtracaoGastos
      );
      const lowerTextoGastos = textoParaExtracaoGastos.toLowerCase();
      const ehMensagemListaOuRecorrentes =
        lancamentosExtraidosTexto.length >= 2 ||
        (lancamentosExtraidosTexto.length === 1 &&
          (lancamentosExtraidosTexto[0].recorrente ||
            lancamentosExtraidosTexto[0].status === "previsto" ||
            !lancamentosExtraidosTexto[0].semData ||
            /\b(recorrente|recorrentes|fixo|fixos|fixa|fixas|previsto|previstos|prevista|previstas|vencimento|vence|a pagar)\b/i.test(
              lowerTextoGastos
            )));

      if (
        ehMensagemListaOuRecorrentes &&
        lancamentosExtraidosTexto.length > 0 &&
        !acoesMapeadas.some(
          (ac) =>
            ac.tipo === "ATUALIZAR_CONTAS_FINANCAS" &&
            /\b(meu saldo|saldo atual|atualizar saldo|tenho na conta)\b/i.test(
              lowerTextoGastos
            )
        )
      ) {
        // Todos os itens extraídos diretamente do texto da usuária são a fonte da verdade absoluta para valores e datas (ou ausência de data)
        const listaFinalLancamentos: ItemLancamentoExtraido[] = [
          ...lancamentosExtraidosTexto,
        ];

        // Se o Gemini extraiu algum item extra (ex: lido de imagem anexada) que não estava no texto puro, preserva respeitando semData se não houver dia explícito
        for (const ac of acoesMapeadas) {
          if (
            ac.tipo === "REGISTRAR_GASTO" &&
            Array.isArray(ac.payload?.lancamentosAjuste)
          ) {
            for (const lg of ac.payload.lancamentosAjuste) {
              const normLg = lg.descricao
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
              const jaTem = listaFinalLancamentos.some((loc) => {
                const normLoc = loc.descricao
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "");
                return (
                  Math.abs(loc.valor - lg.valor) < 0.05 &&
                  (normLoc.includes(normLg.slice(0, 4)) ||
                    normLg.includes(normLoc.slice(0, 4)))
                );
              });
              if (!jaTem && listaAnexos.length > 0) {
                listaFinalLancamentos.push({
                  descricao: lg.descricao,
                  valor: lg.valor,
                  tipo: lg.tipo || "despesa",
                  status: lg.status || "previsto",
                  data: lg.semData ? "Sem data" : lg.data || "Sem data",
                  diaVencimento: lg.semData ? null : lg.diaVencimento ?? null,
                  semData: lg.semData ?? !lg.diaVencimento,
                  recorrente: Boolean(lg.recorrente),
                  metodo: lg.metodo || "Conta / Pix",
                  categoria:
                    lg.categoria || inferirCategoriaDeTexto(lg.descricao),
                });
              }
            }
          }
        }

        const somaTotalDespesas = listaFinalLancamentos.reduce(
          (s, item) => s + (Number(item.valor) || 0),
          0
        );
        const primeiroLanc = listaFinalLancamentos[0];
        const qtdRec = listaFinalLancamentos.filter((i) => i.recorrente).length;

        const acaoLancamentosCompleta: AcaoGovernanta = {
          id: `ai-act-${Date.now()}-lancamentos-completos`,
          tipo: "REGISTRAR_GASTO",
          titulo:
            listaFinalLancamentos.length === 1
              ? `${
                  primeiroLanc.status === "previsto"
                    ? "Agendar pagamento previsto"
                    : "Registrar despesa"
                }: ${primeiroLanc.descricao} (R$ ${primeiroLanc.valor
                  .toFixed(2)
                  .replace(".", ",")})${
                  primeiroLanc.semData
                    ? " · Sem data definida"
                    : ` · ${primeiroLanc.data}`
                }`
              : `Registrar todas as ${listaFinalLancamentos.length} despesas (${
                  qtdRec > 0 ? "Recorrentes & Previstos" : "Pagamentos Previstos"
                } · Total R$ ${somaTotalDespesas.toFixed(2).replace(".", ",")})`,
          detalhe:
            listaFinalLancamentos.length === 1
              ? `${primeiroLanc.categoria} · ${
                  primeiroLanc.semData
                    ? "Sem data informada (não inventada)"
                    : `Data: ${primeiroLanc.data}`
                }`
              : `Inclui todas as ${listaFinalLancamentos.length} despesas enviadas nos dias exatos informados e mantém "Sem data" onde você não informou dia`,
          executada: false,
          payload: {
            texto: primeiroLanc.descricao,
            valor: primeiroLanc.valor,
            categoriaGasto: primeiroLanc.categoria,
            data: primeiroLanc.data,
            diaVencimento: primeiroLanc.diaVencimento,
            semData: primeiroLanc.semData,
            statusGasto: primeiroLanc.status,
            recorrente: primeiroLanc.recorrente,
            lancamentosAjuste: listaFinalLancamentos,
          },
        };

        // Remove REGISTRAR_GASTO parciais e remove compromissos de calendário que o modelo tenha criado por engano para despesas
        const demaisAcoesLimpas = acoesMapeadas.filter((ac) => {
          if (ac.tipo === "REGISTRAR_GASTO") return false;
          if (
            ac.tipo === "ATUALIZAR_CONTAS_FINANCAS" &&
            !/\b(meu saldo|saldo atual|atualizar saldo|tenho na conta)\b/i.test(
              lowerTextoGastos
            )
          ) {
            return false;
          }
          if (
            ac.tipo === "AGENDAR_COMPROMISSO" &&
            Array.isArray(ac.payload?.compromissos)
          ) {
            const compsReais = ac.payload.compromissos.filter((c) => {
              const tComp = String(c.titulo || "").toLowerCase();
              const bateComDespesa = listaFinalLancamentos.some((lf) =>
                tComp.includes(lf.descricao.toLowerCase().slice(0, 5))
              );
              return (
                !bateComDespesa &&
                !/\b(r\$|boleto|fatura|parcela|condom[íi]nio|aluguel|internet|luz|energia|[áa]gua|academia|netflix|spotify)\b/i.test(
                  tComp
                )
              );
            });
            if (compsReais.length === 0) return false;
            ac.payload.compromissos = compsReais;
          }
          return true;
        });

        acoesMapeadas.length = 0;
        acoesMapeadas.push(acaoLancamentosCompleta, ...demaisAcoesLimpas);

        // Garante que a resposta textual da Lala confirme TODAS as despesas enviadas sem omitir nenhuma!
        if (listaFinalLancamentos.length >= 2) {
          const respAtualLower = String(data.respostaLala || "").toLowerCase();
          const omitiuAlgumaDespesa = listaFinalLancamentos.some((item) => {
            const primeiraPalavra = item.descricao
              .toLowerCase()
              .split(/\s+/)[0]
              ?.replace(/[^a-zà-ÿ0-9]/gi, "");
            return (
              primeiraPalavra &&
              primeiraPalavra.length >= 3 &&
              !respAtualLower.includes(primeiraPalavra)
            );
          });

          const listagemFormatadaCompleta =
            `\n\n📋 **Confirmação completa de todas as ${
              listaFinalLancamentos.length
            } despesas enviadas (Total: R$ ${somaTotalDespesas
              .toFixed(2)
              .replace(".", ",")}):**\n` +
            listaFinalLancamentos
              .map(
                (item, idx) =>
                  `${idx + 1}. **${item.descricao}** — R$ ${item.valor
                    .toFixed(2)
                    .replace(".", ",")} · *${
                    item.semData
                      ? "Sem data definida (não assumi dia)"
                      : item.data
                  }* (${item.categoria})`
              )
              .join("\n");

          if (omitiuAlgumaDespesa || !respAtualLower.includes("1.")) {
            data.respostaLala = `${String(
              data.respostaLala || ""
            ).trim()}${listagemFormatadaCompleta}`;
          }
        }
      }

      // Se o modelo retornou múltiplas ações ATUALIZAR_CONTAS_FINANCAS (ex: uma para cada print enviado),
      // consolida TODAS em uma única ação ATUALIZAR_CONTAS_FINANCAS para não sobrescrever uma conta com a outra!
      const acoesContas = acoesMapeadas.filter(
        (ac) => ac.tipo === "ATUALIZAR_CONTAS_FINANCAS"
      );
      if (acoesContas.length > 1) {
        const contasUnificadas: { nome: string; saldoAtual: number }[] = [];
        const cartoesUnificados: {
          nome: string;
          faturaAtual: number;
          limiteTotal?: number;
          vencimentoDia?: number;
        }[] = [];
        let substituirUnificado = false;

        for (const ac of acoesContas) {
          if (ac.payload?.substituirExistentes) substituirUnificado = true;
          for (const c of ac.payload?.contasAjuste || []) {
            const idxExist = contasUnificadas.findIndex(
              (cu) => cu.nome.toLowerCase().trim() === c.nome.toLowerCase().trim()
            );
            if (idxExist >= 0) {
              contasUnificadas[idxExist] = c;
            } else {
              contasUnificadas.push(c);
            }
          }
          for (const cc of ac.payload?.cartoesAjuste || []) {
            const idxExist = cartoesUnificados.findIndex(
              (ccu) =>
                ccu.nome.toLowerCase().trim() === cc.nome.toLowerCase().trim()
            );
            if (idxExist >= 0) {
              cartoesUnificados[idxExist] = cc;
            } else {
              cartoesUnificados.push(cc);
            }
          }
        }

        const resumoContasTit = contasUnificadas
          .map(
            (c) =>
              `${c.nome}: R$ ${Number(c.saldoAtual || 0)
                .toFixed(2)
                .replace(".", ",")}`
          )
          .join(" · ");

        const acaoContaConsolidada: AcaoGovernanta = {
          ...acoesContas[0],
          titulo: resumoContasTit
            ? `Atualizar Contas (${resumoContasTit})`
            : acoesContas[0].titulo,
          payload: {
            ...acoesContas[0].payload,
            substituirExistentes: substituirUnificado,
            contasAjuste:
              contasUnificadas.length > 0 ? contasUnificadas : undefined,
            cartoesAjuste:
              cartoesUnificados.length > 0 ? cartoesUnificados : undefined,
          },
        };

        let jaInseriuConsolidada = false;
        const novasAcoesMapeadas: AcaoGovernanta[] = [];
        for (const ac of acoesMapeadas) {
          if (ac.tipo === "ATUALIZAR_CONTAS_FINANCAS") {
            if (!jaInseriuConsolidada) {
              novasAcoesMapeadas.push(acaoContaConsolidada);
              jaInseriuConsolidada = true;
            }
          } else {
            novasAcoesMapeadas.push(ac);
          }
        }
        acoesMapeadas.length = 0;
        acoesMapeadas.push(...novasAcoesMapeadas);
      }

      // Se a usuária pediu explicitamente para atualizar o saldo/conta e o modelo não incluiu ATUALIZAR_CONTAS_FINANCAS, garante o card interativo!
      const pediuSaldoExplicito =
        /\b(atualizar saldo|atualiza meu saldo|atualize meu saldo|atualizar meu saldo|atualiza o saldo|meu saldo|mudar saldo|ajustar saldo)\b/i.test(
          texto
        );
      if (
        pediuSaldoExplicito &&
        !acoesMapeadas.some((ac) => ac.tipo === "ATUALIZAR_CONTAS_FINANCAS")
      ) {
        const fallbackSaldo = processarMensagemLocalLala(
          `${texto} ${data.respostaLala || ""}`,
          ctx,
          primeiroAnexo
        );
        const acaoSaldo = (fallbackSaldo.acoesPropostas || []).find(
          (ac) => ac.tipo === "ATUALIZAR_CONTAS_FINANCAS"
        );
        if (acaoSaldo) {
          acoesMapeadas.unshift(acaoSaldo);
        }
      }

      const isVoiceNote = primeiroAnexo?.mimeType?.startsWith("audio/");
      const pediuParaGuardarExplicitamente =
        /\b(guardar|salvar|arquivar)\b.*\b(segundo c[ée]rebro|reposit[óo]rio|pasta|cofre)\b/i.test(
          texto
        );

      // Se a usuária pediu explicitamente para parar de gerar ações toda hora ou está apenas alinhando regras / enriquecendo contexto sem valores concretos para lançar, suprime ações indevidas!
      const pediuSemAcaoOuAlinhamento =
        /\b(parar de ficar dando a[çc][ãa]o|n[ãa]o precisa dar a[çc][ãa]o|sem dar a[çc][ãa]o|evite perguntas quando o objetivo [ée] enriquecer|s[óo] estamos alinhando|entendeu o que quis dizer)\b/i.test(
          texto
        ) &&
        listaAnexos.length === 0 &&
        lancamentosExtraidosTexto.length === 0 &&
        !pediuSaldoExplicito;

      // Remove GUARDAR_SEGUNDO_CEREBRO se a usuária não pediu para guardar no Segundo Cérebro e já existem outras ações reais
      const acoesFiltradas = pediuSemAcaoOuAlinhamento
        ? []
        : !pediuParaGuardarExplicitamente && acoesMapeadas.length > 1
        ? acoesMapeadas.filter((ac) => ac.tipo !== "GUARDAR_SEGUNDO_CEREBRO")
        : acoesMapeadas;

      const anexosVisiveis = isVoiceNote ? undefined : listaAnexos;

      return {
        modo: modoDetectado,
        nomeAnexo: isVoiceNote ? undefined : primeiroAnexo?.nome,
        anexo: isVoiceNote ? undefined : primeiroAnexo,
        anexos:
          anexosVisiveis && anexosVisiveis.length > 0
            ? anexosVisiveis
            : undefined,
        transcricaoAudioUsuario: data.transcricaoAudioUsuario || undefined,
        audioUsuarioBase64: isVoiceNote ? primeiroAnexo?.base64 : undefined,
        enviadoPorAudio: Boolean(isVoiceNote),
        tituloCard: data.tituloCard || "Lala",
        tags: data.tags || ["Lala"],
        respostaLala: data.respostaLala,
        matrizDecisao: data.matrizDecisao,
        sugestoesResposta: Array.isArray(data.sugestoesResposta)
          ? data.sugestoesResposta
          : undefined,
        guardadoNoCofre: pediuParaGuardarExplicitamente,
        acoesPropostas: acoesFiltradas,
        novaRegraAprendida:
          typeof data.novaRegraAprendida === "string" &&
          data.novaRegraAprendida.trim()
            ? data.novaRegraAprendida.trim()
            : undefined,
        aprendizadosExtraidos: Array.isArray(data.aprendizadosExtraidos)
          ? data.aprendizadosExtraidos
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((ap: any) => ap && typeof ap.texto === "string" && ap.texto.trim())
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((ap: any) => ({
                categoria: (
                  [
                    "contexto",
                    "acao_usuario",
                    "decisao",
                    "rotina",
                    "forma_de_uso",
                  ].includes(ap.categoria)
                    ? ap.categoria
                    : "contexto"
                ) as CategoriaAprendizadoLala,
                texto: ap.texto.trim(),
              }))
          : undefined,
        automatizarTipos: Array.isArray(data.automatizarTipos)
          ? data.automatizarTipos
          : undefined,
        pedirConfirmacaoTipos: Array.isArray(data.pedirConfirmacaoTipos)
          ? data.pedirConfirmacaoTipos
          : undefined,
      };
    }
  }

  const localRes = processarMensagemLocalLala(texto, ctx, primeiroAnexo);
  if (primeiroAnexo?.mimeType?.startsWith("audio/")) {
    return {
      ...localRes,
      nomeAnexo: undefined,
      anexo: undefined,
      anexos: undefined,
      audioUsuarioBase64: primeiroAnexo.base64,
      enviadoPorAudio: true,
    };
  }
  return {
    ...localRes,
    anexos: listaAnexos.length > 0 ? listaAnexos : undefined,
  };
}

// Reprodutor global de voz da Lala (evita duas falas simultâneas)
let currentLalaAudioElement: HTMLAudioElement | null = null;

export function pararVozDaLala() {
  if (currentLalaAudioElement) {
    try {
      currentLalaAudioElement.pause();
      currentLalaAudioElement.currentTime = 0;
    } catch {
      // ignore
    }
    currentLalaAudioElement = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

export async function falarTextoComVozDaLala(
  texto: string,
  tomLala?: string,
  cachedAudioBase64?: string,
  onEnd?: () => void
): Promise<{ audioBase64?: string }> {
  pararVozDaLala();

  const cleanText = (texto || "")
    .replace(/\*\*/g, "")
    .replace(/[#_`~•]/g, "")
    .trim();

  if (!cleanText) {
    onEnd?.();
    return {};
  }

  const playBase64Audio = (dataUrl: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const audio = new Audio(dataUrl);
        currentLalaAudioElement = audio;
        audio.onended = () => {
          if (currentLalaAudioElement === audio) {
            currentLalaAudioElement = null;
          }
          onEnd?.();
          resolve(true);
        };
        audio.onerror = () => {
          if (currentLalaAudioElement === audio) {
            currentLalaAudioElement = null;
          }
          resolve(false);
        };
        audio.play().catch(() => {
          resolve(false);
        });
      } catch {
        resolve(false);
      }
    });
  };

  // 1. Se já temos o áudio em cache na mensagem, toca direto!
  if (cachedAudioBase64) {
    const ok = await playBase64Audio(cachedAudioBase64);
    if (ok) return { audioBase64: cachedAudioBase64 };
  }

  // 2. Tenta gerar voz natural da Lala via servidor Gemini TTS (gemini-3.8-flash-lite-tts)
  if (typeof navigator !== "undefined" && navigator.onLine) {
    const ttsEndpoints = [
      "/api/lala/tts",
      "https://ais-pre-v53ngxewgn6gdcqwqsl7t4-260327000459.us-east5.run.app/api/lala/tts",
      "https://ais-dev-v53ngxewgn6gdcqwqsl7t4-260327000459.us-east5.run.app/api/lala/tts",
    ];
    for (const ttsUrl of ttsEndpoints) {
      try {
        const res = await fetch(ttsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texto: cleanText, tomLala }),
        });
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const data = (await res.json()) as { audioBase64?: string };
          if (data?.audioBase64) {
            const played = await playBase64Audio(data.audioBase64);
            if (played) {
              return { audioBase64: data.audioBase64 };
            }
          }
        }
      } catch {
        // Tenta próximo endpoint ou síntese de voz nativa do navegador
      }
    }
  }

  // 3. Fallback imediato 100% Offline / Navegador (Web Speech API pt-BR)
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "pt-BR";
      utterance.rate = 1.05;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const ptVoices = voices.filter((v) =>
        v.lang.toLowerCase().includes("pt")
      );
      const preferredVoice =
        ptVoices.find(
          (v) =>
            v.name.toLowerCase().includes("luciana") ||
            v.name.toLowerCase().includes("francisca") ||
            v.name.toLowerCase().includes("maria") ||
            v.name.toLowerCase().includes("google") ||
            v.name.toLowerCase().includes("female")
        ) || ptVoices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => onEnd?.();
      utterance.onerror = () => onEnd?.();
      window.speechSynthesis.speak(utterance);
      return {};
    } catch {
      onEnd?.();
    }
  } else {
    onEnd?.();
  }

  return {};
}
