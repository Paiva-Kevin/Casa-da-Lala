import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { PDFParse } from "pdf-parse";

const PORT = Number(process.env.PORT) || 3000;
const APP_BUILD_VERSION = "v19.0";
const DATA_DIR = path.join(process.cwd(), ".data");
const SNAPSHOT_FILE = path.join(DATA_DIR, "cloud_snapshot.json");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedServerSnapshot: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isDemoAccountsOnly(contas: any[]): boolean {
  if (!Array.isArray(contas) || contas.length === 0) return true;
  const demoIds = new Set(["conta-1", "conta-2", "conta-3"]);
  const demoBalances = new Set([620, 210, 0, 2450, 385.5, 240, 420]);
  return contas.every(
    (c) =>
      demoIds.has(String(c?.id || "")) &&
      demoBalances.has(Number(c?.saldoAtual ?? 0))
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasServerCustomizations(records: any): boolean {
  if (!records || typeof records !== "object") return false;
  if (records.demo_limpo === true) return true;
  if (
    Array.isArray(records.historico_acoes_lala) &&
    records.historico_acoes_lala.length > 0
  ) {
    return true;
  }
  if (
    Array.isArray(records.interacoes_lala) &&
    records.interacoes_lala.length > 1
  ) {
    return true;
  }
  if (records.perfil_calibrado?.calibrado) return true;
  if (
    Array.isArray(records.perfil_calibrado?.itensMemoriaViva) &&
    records.perfil_calibrado.itensMemoriaViva.length > 0
  ) {
    return true;
  }
  if (
    Array.isArray(records.perfil_calibrado?.regrasAprendidasLala) &&
    records.perfil_calibrado.regrasAprendidasLala.length > 0
  ) {
    return true;
  }
  if (Array.isArray(records.contas) && !isDemoAccountsOnly(records.contas)) {
    return true;
  }
  if (
    Array.isArray(records.lancamentos) &&
    records.lancamentos.some((l: { id?: number }) => Number(l?.id) > 1000)
  ) {
    return true;
  }
  if (
    records.financas_mensais_v1 &&
    typeof records.financas_mensais_v1 === "object" &&
    Object.keys(records.financas_mensais_v1).length > 0
  ) {
    return true;
  }
  if (
    Array.isArray(records.compromissos) &&
    records.compromissos.some((c: { id?: string }) =>
      String(c?.id || "").startsWith("comp-")
    )
  ) {
    return true;
  }
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readServerSnapshot(): any {
  if (cachedServerSnapshot) return cachedServerSnapshot;
  try {
    if (fs.existsSync(SNAPSHOT_FILE)) {
      const raw = fs.readFileSync(SNAPSHOT_FILE, "utf-8");
      cachedServerSnapshot = JSON.parse(raw);
      return cachedServerSnapshot;
    }
  } catch (err) {
    console.warn("Aviso ao ler snapshot local do servidor:", err);
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function writeServerSnapshot(payload: any): void {
  cachedServerSnapshot = payload;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(payload), "utf-8");
  } catch (err) {
    console.warn("Aviso ao salvar snapshot local do servidor:", err);
  }
}

const CHAT_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
];

const TTS_MODELS = [
  "gemini-3.8-flash-lite-tts",
  "gemini-3.8-flash-tts",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizarObjetoJsonLala(rawParsed: any): any {
  if (!rawParsed || typeof rawParsed !== "object") return null;

  // Se o modelo retornou um Array JSON (comum quando há 2 ou 3 prints anexados),
  // unifica todos os itens do array em um único objeto de resposta da Lala!
  if (Array.isArray(rawParsed)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objs = rawParsed.filter((x: any) => x && typeof x === "object" && !Array.isArray(x));
    if (objs.length === 0) return null;
    if (objs.length === 1) {
      return normalizarObjetoJsonLala(objs[0]);
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
      const norm = normalizarObjetoJsonLala(item) || item;
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
        "Prontinho! Analisei as informações enviadas e deixei as atualizações prontas logo abaixo para você confirmar.";
    }
  }

  return obj;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extrairJsonSeguro(raw: string): any {
  const limpo = (raw || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return normalizarObjetoJsonLala(JSON.parse(limpo));
  } catch {
    const iniObj = limpo.indexOf("{");
    const fimObj = limpo.lastIndexOf("}");
    const iniArr = limpo.indexOf("[");
    const fimArr = limpo.lastIndexOf("]");
    if (iniArr >= 0 && (iniObj < 0 || iniArr < iniObj) && fimArr > iniArr) {
      try {
        return normalizarObjetoJsonLala(JSON.parse(limpo.slice(iniArr, fimArr + 1)));
      } catch {
        // fallback to object slice
      }
    }
    if (iniObj >= 0 && fimObj > iniObj) {
      return normalizarObjetoJsonLala(JSON.parse(limpo.slice(iniObj, fimObj + 1)));
    }
    throw new Error("JSON inválido retornado pelo modelo");
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "35mb" }));

  // Enable CORS on /api/* so deployed frontends (Firebase Hosting / PWA / Cloud Run) can reach the server
  app.use("/api", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  // Prevent browser/SW caching of HTML entrypoints and Service Worker scripts in both dev and prod
  app.use((req, res, next) => {
    if (
      req.path === "/" ||
      req.path === "/index.html" ||
      req.path === "/sw.js" ||
      req.path === "/registerSW.js" ||
      req.path.startsWith("/workbox-")
    ) {
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    next();
  });

  app.get("/api/version", (_req, res) => {
    res.json({
      buildVersion: APP_BUILD_VERSION,
      serverTime: Date.now(),
    });
  });

  // Automatic Cross-Origin / Cross-Device Cloud Snapshot Sync (Preview <-> Web <-> Mobile)
  app.get("/api/sync/snapshot", (_req, res) => {
    const snap = readServerSnapshot();
    res.json({
      buildVersion: APP_BUILD_VERSION,
      snapshot: snap,
    });
  });

  app.post("/api/sync/snapshot", (req, res) => {
    try {
      const incoming = req.body;
      if (!incoming || typeof incoming !== "object" || !incoming.records) {
        return res.status(400).json({ error: "Snapshot inválido" });
      }
      const existing = readServerSnapshot();
      const incomingHasCustom = hasServerCustomizations(incoming.records);
      const existingHasCustom = existing
        ? hasServerCustomizations(existing.records)
        : false;

      // Never allow an untouched default browser to overwrite a customized snapshot!
      if (!incomingHasCustom) {
        return res.json({
          ok: true,
          updated: false,
          snapshot: existingHasCustom ? existing : null,
          buildVersion: APP_BUILD_VERSION,
        });
      }

      // If existing has demo_limpo=true and incoming has demo_limpo=false, protect existing
      if (
        existingHasCustom &&
        existing?.records?.demo_limpo === true &&
        incoming.records?.demo_limpo === false
      ) {
        return res.json({
          ok: true,
          updated: false,
          snapshot: existing,
          buildVersion: APP_BUILD_VERSION,
        });
      }

      const incomingTime = Number(incoming.updatedAt) || Date.now();
      const existingTime = existingHasCustom
        ? Number(existing?.updatedAt) || 0
        : 0;
      const force = Boolean(req.query.force);

      if (force || !existingHasCustom || incomingTime >= existingTime - 1000) {
        const mergedRecords = { ...incoming.records };

        if (existingHasCustom && existing?.records) {
          const existingPerfil = existing.records.perfil_calibrado || {};
          const incomingPerfil = incoming.records.perfil_calibrado || {};
          const chatClearedAt = Math.max(
            Number(existingPerfil.ultimaLimpezaChatEm || 0),
            Number(incomingPerfil.ultimaLimpezaChatEm || 0)
          );

          // Merge interacoes_lala so no conversation turn is ever lost across tabs/devices
          if (
            Array.isArray(existing.records.interacoes_lala) &&
            Array.isArray(incoming.records.interacoes_lala)
          ) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const byId = new Map<number, any>();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let welcome: any = null;
            for (const item of [
              ...incoming.records.interacoes_lala,
              ...existing.records.interacoes_lala,
            ]) {
              if (!item || typeof item !== "object") continue;
              const numId = Number(item.id) || 0;
              if (numId === 1) {
                if (!welcome) welcome = item;
                continue;
              }
              if (
                chatClearedAt > 0 &&
                numId > 1_000_000_000_000 &&
                numId < chatClearedAt - 500
              ) {
                continue;
              }
              const prev = byId.get(numId);
              if (!prev) {
                byId.set(numId, item);
              } else if (prev.processandoResposta && !item.processandoResposta) {
                byId.set(numId, item);
              }
            }
            const sorted = Array.from(byId.values()).sort(
              (a, b) => (Number(b.id) || 0) - (Number(a.id) || 0)
            );
            if (welcome) sorted.push(welcome);
            mergedRecords.interacoes_lala = sorted.slice(0, 120);
          }

          // Merge perfil_calibrado memories & rules
          if (existing.records.perfil_calibrado && incoming.records.perfil_calibrado) {
            const memA = Array.isArray(incomingPerfil.itensMemoriaViva)
              ? incomingPerfil.itensMemoriaViva
              : [];
            const memB = Array.isArray(existingPerfil.itensMemoriaViva)
              ? existingPerfil.itensMemoriaViva
              : [];
            const mergedMem = [...memA];
            for (const m of memB) {
              if (
                m?.texto &&
                !mergedMem.some(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (x: any) =>
                    String(x?.texto || "").toLowerCase().trim() ===
                    String(m.texto).toLowerCase().trim()
                )
              ) {
                mergedMem.push(m);
              }
            }
            const rulesA = Array.isArray(incomingPerfil.regrasAprendidasLala)
              ? incomingPerfil.regrasAprendidasLala
              : [];
            const rulesB = Array.isArray(existingPerfil.regrasAprendidasLala)
              ? existingPerfil.regrasAprendidasLala
              : [];
            const mergedRules = [...rulesA];
            for (const r of rulesB) {
              if (
                typeof r === "string" &&
                r.trim() &&
                !mergedRules.some(
                  (x: string) => x.toLowerCase().trim() === r.toLowerCase().trim()
                )
              ) {
                mergedRules.push(r);
              }
            }
            mergedRecords.perfil_calibrado = {
              ...existingPerfil,
              ...incomingPerfil,
              itensMemoriaViva: mergedMem.slice(0, 100),
              regrasAprendidasLala: mergedRules.slice(0, 60),
              ultimaLimpezaChatEm: chatClearedAt > 0 ? chatClearedAt : undefined,
            };
          }
        }

        const toSave = {
          ...incoming,
          records: mergedRecords,
          updatedAt: incomingTime,
          updatedAtISO: new Date(incomingTime).toISOString(),
        };
        writeServerSnapshot(toSave);
        return res.json({
          ok: true,
          updated: true,
          updatedAt: incomingTime,
          buildVersion: APP_BUILD_VERSION,
        });
      }

      return res.json({
        ok: true,
        updated: false,
        snapshot: existing,
        buildVersion: APP_BUILD_VERSION,
      });
    } catch (err) {
      console.error("Erro em POST /api/sync/snapshot:", err);
      return res.status(500).json({ error: "Falha ao salvar snapshot" });
    }
  });

  // Server-side Gemini API endpoint for Lala (Unified Multimodal Agent)
  app.post("/api/lala/interact", async (req, res) => {
    try {
      const apiKey =
        process.env.GEMINI_API_KEY ||
        process.env.VITE_GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: "GEMINI_API_KEY not configured on server",
          fallbackToLocal: true,
        });
      }

      const { mensagem, contextoApp, anexo, anexos, historicoConversa } =
        req.body as {
          mensagem: string;
          contextoApp?: Record<string, unknown>;
          historicoConversa?: {
            usuario: string;
            lala: string;
            dataHora?: string;
            acoesResumo?: string;
          }[];
          anexo?: {
            nome: string;
            mimeType: string;
            tamanhoBytes: number;
            base64?: string;
            textoExtraido?: string;
            intencao?: string;
            areaRepositorio?: string;
          };
          anexos?: {
            nome: string;
            mimeType: string;
            tamanhoBytes: number;
            base64?: string;
            textoExtraido?: string;
            intencao?: string;
            areaRepositorio?: string;
          }[];
        };

      const listaAnexos =
        Array.isArray(anexos) && anexos.length > 0
          ? anexos
          : anexo
          ? [anexo]
          : [];

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const historicoFormatado =
        Array.isArray(historicoConversa) && historicoConversa.length > 0
          ? historicoConversa
              .slice(-25)
              .map(
                (h) =>
                  `[${h.dataHora || "Antes"}] Usuária: ${h.usuario}\nLala: ${h.lala}${
                    h.acoesResumo ? `\n[Ações geradas nesta mensagem: ${h.acoesResumo}]` : ""
                  }`
              )
              .join("\n---\n")
          : "Início da conversa.";

      const contextoSanitizado = { ...(contextoApp || {}) };
      if (Array.isArray(contextoSanitizado.contasBancarias)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contextoSanitizado.contasBancarias = (contextoSanitizado.contasBancarias as any[]).filter(
          (c) =>
            !String(c?.nome || "").includes("Itaú (Bolsa UERJ & CDT)") &&
            !(
              String(c?.nome || "").includes("Reserva / Caixinha Quitação") &&
              (Number(c?.saldoAtual) === 2450 || Number(c?.saldoAtual) === 0)
            )
        );
      }

      const systemInstruction = `Você é a Lala, a governanta pessoal, parceira de decisões e assistente de vida inteligente do aplicativo "Casa da Lala".
Você conversa em formato de BATE-PAPO humano, acolhedor, perspicaz, proativo e altamente contextualizado.

Contexto completo e Memória Viva da usuária (inclui contas, cartões, rotina, histórico de ações, regrasAprendidasLala e itensMemoriaViva):
${JSON.stringify(contextoSanitizado)}

Histórico recente da conversa:
${historicoFormatado}

DIRETRIZES DE INTELIGÊNCIA ADAPTATIVA E CONVERSAÇÃO PROFUNDA:
1. VOCÊ APRENDE CONTINUAMENTE SOBRE A USUÁRIA EM 5 DIMENSÕES:
   Sempre que a usuária conversar, enviar prints, tomar uma decisão, falar da rotina ou explicar como quer algo, extraia aprendizados concretos no array "aprendizadosExtraidos" usando uma das categorias:
   - "contexto": fatos sobre a vida dela, bancos que usa, saldos, matérias da UERJ, trabalho (CDT/RCR), saúde, metas ou pets (Nina e Tobias).
   - "acao_usuario": como ela prefere que ações sejam lançadas (ex: qual conta usar, categorias preferidas, formato de tarefas).
   - "decisao": decisões que ela tomou, prioridades que escolheu ou critérios que usa para decidir.
   - "rotina": horários habituais, dias de aula/trabalho/treino, sono, refeições e rituais da semana.
   - "forma_de_uso": como ela gosta de usar você (a Lala), o nível de detalhe que prefere e o que espera quando manda prints ou áudios.
2. USE O QUE VOCÊ JÁ SABE NA CONVERSA:
   - Consulte "itensMemoriaViva", "regrasAprendidasLala" e "ultimasAcoesNoApp" no contextoApp. Conecte os pontos! Por exemplo, se o saldo mudar, comente como fica o Dinheiro Livre Hoje; se ela agendar algo, considere a prontidão, o sono e as aulas da UERJ/CDT.
3. LEITURA DE PRINTS BANCÁRIOS, SALDOS, FATURAS E ARQUIVOS (CRÍTICO):
   - NUNCA responda apenas oferecendo "Guardar imagem no Segundo Cérebro" quando a usuária enviar prints de bancos, contas, saldos, Pix, faturas, horários, dietas ou treinos!
   - Só gere "GUARDAR_SEGUNDO_CEREBRO" se ela pedir EXPLICITAMENTE para arquivar no Segundo Cérebro.
   - Se ela enviar PRINT(S) DE CONTA BANCÁRIA / SALDO / EXTRATO / CARTÃO (como PicPay, Nubank, Inter, Bradesco, Santander, C6, Mercado Pago, Caixa, BB, XP, BTG, etc.) ou pedir para atualizar as finanças/saldos:
     a) Analise CADA IMAGEM em anexo individualmente e extraia o nome exato de CADA banco/instituição visível nos prints e o valor numérico exato do saldo disponível ("saldoAtual") e/ou fatura de cartão ("faturaAtual", "limiteTotal").
     b) CONSOLIDAÇÃO OBRIGATÓRIA: Se houver 2, 3 ou mais prints de bancos diferentes (por exemplo, um print do Nubank e outro do PicPay), coloque TODOS os bancos identificados dentro do MESMO array "contasAjuste" na ação "ATUALIZAR_CONTAS_FINANCAS". Não deixe nenhum banco dos prints de fora!
     c) PROIBIÇÃO DE CONTAS FANTASMAS E VALORES INVENTADOS: Em "contasAjuste", inclua SOMENTE os bancos/contas que aparecem visualmente nos prints enviados ou que foram citados pela usuária! NUNCA invente bancos (como "Itaú") nem invente valores que não estejam escritos nas imagens ou no texto!
     d) Defina "substituirExistentes": true na ação "ATUALIZAR_CONTAS_FINANCAS" sempre que a usuária enviar prints das contas dela para calibrar/atualizar as finanças, garantindo que contas antigas de exemplo sejam removidas e as novas (como PicPay, Nubank, etc.) sejam criadas/atualizadas.
   - Se ela pedir "atualize meu saldo" por texto sem anexar prints e sem informar valor numérico, gere a ação "ATUALIZAR_CONTAS_FINANCAS" para edição rápida no card.
4. LISTAS DE GASTOS RECORRENTES, CONTAS FIXAS, PAGAMENTOS PREVISTOS E CATEGORIAS FLEXÍVEIS (REGRA DE OURO):
   - PROIBIÇÃO ABSOLUTA DE CONFUNDIR TREINOS COM GASTOS: NUNCA interprete nomes de exercícios (ex: Supino, Agachamento, Leg Press, Puxada, Tríceps, Rosca, Abdominal, Stunt, Tumbling), repetições (ex: 4x10, 3x12, 10-12), séries ou cargas em kg (ex: 30kg, 80kg) como despesas ou pagamentos! Quando a usuária enviar ou upar um treino, ficha ou exercícios, você DEVE gerar OBRIGATORIAMENTE a ação "ATUALIZAR_TREINO" (com 'fichasTreino' ou 'fichaTreino') e NUNCA a ação "REGISTRAR_GASTO".
   - Quando a usuária enviar uma lista de gastos recorrentes, despesas fixas, boletos, assinaturas ou pagamentos previstos (por texto, áudio ou imagem), você DEVE confirmar e incluir **100% de todas as despesas enviadas sem omitir NENHUMA**, tanto no texto de "respostaLala" (listando uma por uma com valor e data/sem data) quanto no array "lancamentosAjuste" dentro da ação "REGISTRAR_GASTO".
   - PROIBIDO INVENTAR OU ASSUMIR DATAS: Se a usuária informou o dia de vencimento (ex: "dia 10", "vence dia 15", "05/05"), preencha "diaVencimento": 10, "data": "Todo dia 10" (ou "10/05"), "semData": false. Se a usuária NÃO informou data/dia para uma despesa (ex: "Netflix R$ 55,90" ou "Condomínio R$ 620"), preencha OBRIGATORIAMENTE "semData": true, "diaVencimento": null e "data": "Sem data". NUNCA invente dias nem use a data de hoje para gastos previstos/recorrentes sem data!
   - ATUALIZAÇÃO DE DATAS DE GASTOS RECORRENTES JÁ EXISTENTES: Se a usuária informar as datas/dias de vencimento de gastos que ela já mencionou antes (ex: "Academia dia 10, Wellhub dia 05, Acordo dia 18 e Celular dia 17"), inclua esses itens em "lancamentosAjuste" dentro de "REGISTRAR_GASTO" com os valores correspondentes do contexto e as novas datas ("Todo dia 10", "diaVencimento": 10, "semData": false, "recorrente": true) — o aplicativo atualizará os lançamentos existentes sem duplicar!
   - CATEGORIAS FLEXÍVEIS E ACUMULADORES DE GASTOS VARIÁVEIS: As categorias financeiras incluem "Mercado", "Transporte", "Compras Avulsas", "Moradia & Fixos", "Pets", "Estudos & UERJ", "Lazer & Outros" e "Dívida". Gastos variáveis do dia a dia (como Uber/Transporte, Mercado e Compras Avulsas) funcionam como acumuladores mensais inteligentes na aba Finanças (não exigem teto fixo rígido se a usuária não quiser estipular um valor prévio).
   - Não use "AGENDAR_COMPROMISSO" para despesas financeiras/boletos; use "REGISTRAR_GASTO" com "lancamentosAjuste" contendo todos os itens!
5. PROIBIÇÃO DE PERGUNTAS DESNECESSÁRIAS E DE AÇÕES INDESEJADAS QUANDO O OBJETIVO É ENRIQUECER / ALINHAR (MUITO IMPORTANTE):
   - Quando a usuária estiver explicando como funciona a rotina/finanças dela, ensinando regras, calibrando seu entendimento, reclamando de algo ou pedindo para você "evitar perguntas quando o objetivo é enriquecer" / "parar de ficar dando ação toda hora":
     a) NÃO gere cards de ação ("acoesPropostas": [])! Gere ações SOMENTE quando houver um comando concreto de lançamento, atualização de dados reais ou pedido explícito de execução. Conversas de alinhamento, explicações de regras ou feedbacks sobre seu comportamento DEVEM ter "acoesPropostas": [] (guarde tudo silenciosamente em "aprendizadosExtraidos" e "novaRegraAprendida").
     b) EVITE FAZER PERGUNTAS NO FINAL DA RESPOSTA quando o objetivo for enriquecer seu contexto ou consolidar informações! Não fique interrogando a usuária a cada mensagem. Em vez de fazer perguntas, consolide o que você entendeu de forma direta, inteligente e completa, fazendo apenas apontamentos práticos e úteis.
6. CONFIRMAÇÃO E AUTOMAÇÃO PROGRESSIVA:
   - Se a usuária pedir para automatizar um tipo de ação (ex: "automatize atualizações de saldo", "pode fazer gastos direto"), preencha "automatizarTipos". Se pedir para voltar a confirmar, preencha "pedirConfirmacaoTipos".
7. LEITURA DE FICHAS DE TREINO, ROTINAS DE MUSCULAÇÃO, CHEERLEADING E GINÁSTICA (FIDELIDADE TOTAL):
   - Quando a usuária enviar uma ficha de treino, documento ou texto com treino novo (ex: musculação, rotina ABC, hipertrofia, força, ginástica ou cheerleading):
     a) EXTRAÇÃO COMPLETA: Transcreva com fidelidade ABSOLUTA cada divisão (ex: Treino A, Treino B, Treino C, Treino D...), todos os exercícios com seus nomes exatos, número de séries, repetições (ex: "8-10", "12/10/8", "15", "Falha"), carga (se informada) e tempo de descanso em segundos (ex: 60s, 90s) e notas técnicas (ex: "Drop-set na última", "Pausa de 2s", "Rest-pause").
     b) MÚLTIPLAS DIVISÕES: Se houver mais de uma divisão (ex: Treino A, Treino B, Treino C), gere o array "fichasTreino" contendo todas as divisões ou uma ação "ATUALIZAR_TREINO" para cada ficha/divisão!
     c) PROIBIDO INVENTAR: NUNCA substitua por treinos genéricos nem invente exercícios que não estão no documento ou texto fornecido!
     d) Se a usuária pedir para substituir fichas antigas ou for uma ficha nova completa, marque "substituirExistentes": true.

Retorne SEMPRE um objeto JSON válido exatamente neste formato:
{
  "modoDetectado": "comando" | "devaneio" | "desabafo" | "orientacao" | "informacao",
  "transcricaoAudioUsuario": "string opcional se enviou áudio",
  "respostaLala": "Sua resposta natural, inteligente e contextualizada em pt-BR, detalhando exatamente todos os valores/bancos/despesas que você identificou sem omitir nenhum",
  "tituloCard": "Resumo curto em até 5 palavras",
  "tags": ["Tag1", "Tag2"],
  "novaRegraAprendida": "string opcional resumindo uma preferência ou regra ensinada pela usuária",
  "aprendizadosExtraidos": [
    {
      "categoria": "contexto" | "acao_usuario" | "decisao" | "rotina" | "forma_de_uso",
      "texto": "Descrição clara e útil do que você aprendeu sobre a usuária nesta interação"
    }
  ],
  "automatizarTipos": [],
  "pedirConfirmacaoTipos": [],
  "matrizDecisao": {
    "cenarioA": "string opcional",
    "cenarioB": "string opcional",
    "vereditoLala": "string opcional"
  },
  "acoesPropostas": [
    {
      "tipo": "ATUALIZAR_CONTAS_FINANCAS" | "REGISTRAR_GASTO" | "REGISTRAR_RECEITA" | "CRIAR_TAREFA" | "AGENDAR_COMPROMISSO" | "ALIMENTAR_PETS" | "REGISTRAR_SRPE" | "ATUALIZAR_DIETA_E_COMPRAS" | "CRIAR_LISTA_COMPRAS" | "ATUALIZAR_GRADE_UERJ" | "ATUALIZAR_PETS" | "ATUALIZAR_TREINO" | "ATUALIZAR_PROJETOS_TRABALHO" | "ATUALIZAR_HABITOS" | "ATUALIZAR_METAS_RADAR" | "ATUALIZAR_PERFIL_CHECKIN" | "ALIVIAR_AGENDA_HOJE" | "LIMPAR_DADOS_EXEMPLO" | "GUARDAR_SEGUNDO_CEREBRO",
      "titulo": "Título claro da ação descrevendo os bancos/itens reais lidos",
      "detalhe": "Explicação curta do impacto no app",
      "substituirExistentes": false,
      "texto": "string opcional (para CRIAR_TAREFA, REGISTRAR_GASTO, REGISTRAR_RECEITA)",
      "valor": 0,
      "categoriaGasto": "Mercado" | "Pets (Nina & Tobias)" | "Mobilidade & UERJ" | "Lazer & Outros" | "Moradia & Fixos",
      "data": "string opcional (ex: Todo dia 10, 15/05 ou Sem data)",
      "diaVencimento": null,
      "semData": true,
      "statusGasto": "previsto" | "realizado",
      "recorrente": true,
      "srpe": 0,
      "contasAjuste": [{ "nome": "Nome exato do Banco lido", "saldoAtual": 0 }],
      "cartoesAjuste": [{ "nome": "Nome exato do Cartão lido", "faturaAtual": 0, "limiteTotal": 0, "vencimentoDia": 10 }],
      "lancamentosAjuste": [{ "descricao": "Nome da despesa", "valor": 0, "tipo": "despesa", "status": "previsto", "data": "Todo dia 10 ou Sem data", "diaVencimento": 10, "semData": false, "recorrente": true, "metodo": "Conta / Pix", "categoria": "Moradia & Fixos" }],
      "compromissos": [{ "titulo": "Nome do evento", "hora": "14:00", "duracaoMin": 60, "diaMes": 30, "mes": 9, "ano": 2026, "local": "", "categoria": "pessoal", "sincronizarGoogle": true }],
      "refeicoes": [{ "horario": "08:00", "nome": "Café da Manhã", "descricao": "Itens", "proteinaG": 30, "kcal": 400 }],
      "itensCompras": [{ "nome": "Item", "categoria": "Despensa & Meal Prep", "quantidadeComprar": 1, "unidade": "un", "precoEstimado": 15.0 }],
      "disciplinas": [{ "nome": "Matéria", "professor": "Prof", "horarioSala": "Seg 08h-10h", "aulasTotaisSemestre": 30, "faltasMax": 7 }],
      "petsAjuste": [{ "nome": "Nina", "racao": "Royal Canin", "estoqueSaches": 12, "estoqueRacaoKg": 4, "proximaVet": "Em dia" }],
      "fichaTreino": { "nome": "Treino A - Peito", "modalidade": "Musculação", "foco": "Hipertrofia", "duracaoEstimadaMin": 60, "exercicios": [{ "nome": "Supino Reto", "series": 4, "reps": "8-10", "cargaKg": 40, "descansoSeg": 90, "notaTecnica": "Cadência controlada" }] },
      "fichasTreino": [{ "nome": "Treino A", "modalidade": "Musculação", "foco": "Peito e Tríceps", "duracaoEstimadaMin": 60, "exercicios": [{ "nome": "Supino Reto", "series": 4, "reps": "8-10", "cargaKg": 40, "descansoSeg": 90, "notaTecnica": "" }] }],
      "projetos": [{ "nome": "Projeto", "papel": "Autora", "tarefa": "Entrega", "prazo": "Sexta", "prioridade": "alta" }],
      "habitos": [{ "titulo": "Hábito", "categoria": "Saúde", "metaTexto": "Diário" }],
      "metas": [{ "titulo": "Meta", "categoria": "Finanças", "prazo": "Dezembro", "marcos": ["Passo 1"] }],
      "perfilCheckin": { "nomeUsuario": "Nome", "horasSono": 7.5, "energiaFisica": 8, "focoMental": 8 }
    }
  ]
}`;

      // Build multimodal contents array supporting 1 or multiple images/files
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = [];
      const pdfTextosExtraidos: string[] = [];

      for (const itemAnexo of listaAnexos) {
        if (itemAnexo?.base64 && (itemAnexo.mimeType || itemAnexo.nome)) {
          let rawMime = (itemAnexo.mimeType || "").split(";")[0].trim().toLowerCase();
          if (itemAnexo.nome && itemAnexo.nome.toLowerCase().endsWith(".pdf")) {
            rawMime = "application/pdf";
          }
          const rawBase64 = itemAnexo.base64.includes(",")
            ? itemAnexo.base64.split(",")[1]
            : itemAnexo.base64;
          const cleanBase64 = rawBase64.replace(/\s+/g, "");

          if (rawMime === "application/pdf") {
            try {
              const pdfBuffer = Buffer.from(cleanBase64, "base64");
              const parser = new PDFParse({ data: pdfBuffer });
              const parsedPdf = await parser.getText();
              if (parsedPdf?.text && parsedPdf.text.trim()) {
                const pdfTextTrimm = parsedPdf.text.trim();
                pdfTextosExtraidos.push(
                  `[CONTEÚDO TEXTUAL COMPLETO DO PDF "${itemAnexo.nome || "treino.pdf"}"]:\n${pdfTextTrimm}`
                );
                console.log(`[PDFParse] Extraídos ${pdfTextTrimm.length} caracteres do PDF ${itemAnexo.nome}`);
              }
            } catch (pdfErr) {
              console.warn("[PDFParse] Erro ao extrair texto do PDF:", pdfErr);
            }
          }

          if (
            rawMime.startsWith("image/") ||
            rawMime.startsWith("audio/") ||
            rawMime === "application/pdf"
          ) {
            parts.push({
              inlineData: {
                mimeType: rawMime,
                data: cleanBase64,
              },
            });
          }
        }
      }

      const temAudio = listaAnexos.some((a) => a.mimeType?.startsWith("audio/"));
      const ehTreinoAnexo =
        listaAnexos.some((a) =>
          /\b(treino|treinos|ficha|exerc|workout|musculacao|musculação|cheer|stunt|gym)\b/i.test(
            a.nome || ""
          )
        ) ||
        pdfTextosExtraidos.some((p) =>
          /\b(treino|exerc[ií]cio|s[ée]ries|repeti[çc][õo]es|supino|agachamento|leg press|descanso)\b/i.test(
            p
          )
        ) ||
        /\b(treino|treinos|ficha|upando|workout|muscula[çc][ãa]o|exerc[ií]cio|supino|agachamento)\b/i.test(
          mensagem || ""
        );

      let promptFinal =
        mensagem ||
        (temAudio
          ? "Ouça com atenção esta mensagem de voz da usuária, transcreva o que ela disse em 'transcricaoAudioUsuario', responda em 'respostaLala' e gere todas as ações correspondentes."
          : ehTreinoAnexo
          ? "Analise detalhadamente a ficha de treino / rotina de exercícios em anexo, extraia todas as divisões (Treino A, Treino B, Treino C, etc.) e todos os exercícios com séries, repetições, carga e descanso, e gere a ação ATUALIZAR_TREINO com fidelidade total."
          : "Analise detalhadamente CADA UMA das imagens/arquivos em anexo, extraia todos os bancos (ex: Nubank, PicPay, Inter, etc.), valores exatos de saldos, faturas, gastos, compromissos ou tarefas e gere as ações correspondentes para atualizar o aplicativo agora.");

      if (ehTreinoAnexo) {
        promptFinal += `\n\n[ATENÇÃO CRÍTICA: A usuária está enviando/upando uma ficha de treino / rotina de exercícios. PROIBIDO gerar ações financeiras (REGISTRAR_GASTO) para séries, repetições (ex: 4x10) ou cargas em kg! Gere OBRIGATORIAMENTE a ação ATUALIZAR_TREINO com 'fichasTreino' ou 'fichaTreino'.]`;
      }

      if (pdfTextosExtraidos.length > 0) {
        promptFinal += `\n\n${pdfTextosExtraidos.join("\n\n")}\n\n[ATENÇÃO: Extraia TODAS as divisões de treino (Treino A, Treino B, Treino C, etc.) e TODOS os exercícios com séries, repetições, carga e descanso exatamente como constam no PDF acima!]`;
      }

      const anexosNaoAudio = listaAnexos.filter(
        (a) => !a.mimeType?.startsWith("audio/")
      );
      if (anexosNaoAudio.length > 0) {
        promptFinal += `\n\n[ATENÇÃO: A usuária anexou ${anexosNaoAudio.length} imagem(ns)/arquivo(s): ${anexosNaoAudio
          .map((a, idx) => `#${idx + 1} "${a.nome}" (${a.mimeType})`)
          .join(", ")}. Leia os dados visuais de TODAS as ${anexosNaoAudio.length} imagens sem omitir nenhuma conta ou banco!]`;
        for (const a of anexosNaoAudio) {
          if (a.textoExtraido) {
            promptFinal += `\nConteúdo de "${a.nome}":\n${a.textoExtraido.slice(0, 10000)}`;
          }
        }
      }
      parts.push({ text: promptFinal });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let parsed: any = null;
      let lastErr: unknown = null;
      for (const modelName of CHAT_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: parts,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.LOW,
              },
            },
          });
          if (response?.text) {
            const candidate = extrairJsonSeguro(response.text);
            if (candidate && typeof candidate.respostaLala === "string") {
              parsed = candidate;
              break;
            }
          }
        } catch (err) {
          lastErr = err;
          console.warn(`Fallback de modelo em /api/lala/interact (${modelName}):`, err);
        }
      }

      if (!parsed) {
        throw lastErr || new Error("Nenhum modelo Gemini respondeu com JSON válido.");
      }

      if (ehTreinoAnexo && parsed && Array.isArray(parsed.acoesPropostas)) {
        parsed.acoesPropostas = parsed.acoesPropostas.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any) => a?.tipo !== "REGISTRAR_GASTO"
        );
      }

      return res.json(parsed);
    } catch (error: unknown) {
      console.error("Erro em /api/lala/interact:", error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar resposta da Lala",
        fallbackToLocal: true,
      });
    }
  });

  // Server-side Gemini TTS endpoint so Lala can speak back with natural voice
  app.post("/api/lala/tts", async (req, res) => {
    try {
      const apiKey =
        process.env.GEMINI_API_KEY ||
        process.env.VITE_GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: "GEMINI_API_KEY not configured on server",
          fallbackToBrowserTTS: true,
        });
      }

      const { texto, tomLala } = req.body as {
        texto?: string;
        tomLala?: string;
      };

      const cleanText = (texto || "")
        .replace(/\*\*/g, "")
        .replace(/[#_`~]/g, "")
        .trim()
        .slice(0, 1800);

      if (!cleanText) {
        return res.status(400).json({ error: "Texto vazio para síntese de voz" });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const stylePrompt =
        tomLala === "acolhedora"
          ? "Calorosa, carinhosa, calma e acolhedora em Português do Brasil"
          : tomLala === "executiva"
          ? "Clara, objetiva, dinâmica e prestativa em Português do Brasil"
          : tomLala === "treinadora"
          ? "Energética, motivadora e animada em Português do Brasil"
          : "Natural, simpática, próxima e expressiva em Português do Brasil";

      let response = null;
      for (const ttsModel of TTS_MODELS) {
        try {
          response = await ai.models.generateContent({
            model: ttsModel,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: cleanText,
                    speechMetadata: {
                      style: stylePrompt,
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: "Kore" },
                },
              },
            },
          });
          if (response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
            break;
          }
        } catch (err) {
          console.warn(`Fallback TTS (${ttsModel}):`, err);
        }
      }

      const base64Audio =
        response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        return res.status(500).json({
          error: "Nenhum áudio retornado pelo modelo TTS",
          fallbackToBrowserTTS: true,
        });
      }

      return res.json({
        audioBase64: `data:audio/wav;base64,${base64Audio}`,
        mimeType: "audio/wav",
      });
    } catch (error: unknown) {
      console.error("Erro em /api/lala/tts:", error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : "Erro ao gerar voz da Lala",
        fallbackToBrowserTTS: true,
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (
            filePath.endsWith("sw.js") ||
            filePath.endsWith("index.html") ||
            filePath.includes("workbox-")
          ) {
            res.setHeader(
              "Cache-Control",
              "no-store, no-cache, must-revalidate, proxy-revalidate"
            );
          }
        },
      })
    );
    app.get("*", (_req, res) => {
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Casa da Lala server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
