import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const PORT = Number(process.env.PORT) || 3000;
const APP_BUILD_VERSION = "v14.2";
const DATA_DIR = path.join(process.cwd(), ".data");
const SNAPSHOT_FILE = path.join(DATA_DIR, "cloud_snapshot.json");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedServerSnapshot: any = null;

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
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
];

const TTS_MODELS = [
  "gemini-3.8-flash-lite-tts",
  "gemini-3.8-flash-tts",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extrairJsonSeguro(raw: string): any {
  const limpo = (raw || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(limpo);
  } catch {
    const ini = limpo.indexOf("{");
    const fim = limpo.lastIndexOf("}");
    if (ini >= 0 && fim > ini) {
      return JSON.parse(limpo.slice(ini, fim + 1));
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
      const incomingTime = Number(incoming.updatedAt) || Date.now();
      const existingTime = Number(existing?.updatedAt) || 0;
      const force = Boolean(req.query.force);

      if (force || !existing || incomingTime >= existingTime - 1000) {
        const toSave = {
          ...incoming,
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
              .slice(-10)
              .map(
                (h) =>
                  `[${h.dataHora || "Antes"}] Usuária: ${h.usuario}\nLala: ${h.lala}`
              )
              .join("\n---\n")
          : "Início da conversa.";

      const systemInstruction = `Você é a Lala, a governanta pessoal, parceira de decisões e assistente de vida inteligente do aplicativo "Casa da Lala".
Você conversa em formato de BATE-PAPO humano, acolhedor, perspicaz, proativo e altamente contextualizado.

Contexto completo e Memória Viva da usuária (inclui contas, cartões, rotina, histórico de ações, regrasAprendidasLala e itensMemoriaViva):
${JSON.stringify(contextoApp || {})}

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
   - Se ela enviar PRINT DE CONTA BANCÁRIA / SALDO / EXTRATO / CARTÃO ou pedir para atualizar o saldo ("atualize meu saldo", "meu saldo está X", "tenho X no banco Y", "criar conta"): leia atentamente todos os bancos e valores e gere IMEDIATAMENTE a ação "ATUALIZAR_CONTAS_FINANCAS" preenchendo "contasAjuste": [{ "nome": "Nome do Banco", "saldoAtual": 1234.56 }] e/ou "cartoesAjuste"!
   - Se ela pedir "atualize meu saldo" sem informar o valor exato ainda, gere mesmo assim a ação "ATUALIZAR_CONTAS_FINANCAS" com as contas atuais dela para que ela possa editar o valor direto no card ou responder no chat! O aplicativo atualizará o saldo se a conta já existir e CRIARÁ A CONTA AUTOMATICAMENTE caso ela ainda não exista!
4. CONFIRMAÇÃO E AUTOMAÇÃO PROGRESSIVA:
   - Se a usuária pedir para automatizar um tipo de ação (ex: "automatize atualizações de saldo", "pode fazer gastos direto"), preencha "automatizarTipos". Se pedir para voltar a confirmar, preencha "pedirConfirmacaoTipos".

Retorne SEMPRE um objeto JSON válido exatamente neste formato:
{
  "modoDetectado": "comando" | "devaneio" | "desabafo" | "orientacao" | "informacao",
  "transcricaoAudioUsuario": "string opcional se enviou áudio",
  "respostaLala": "Sua resposta natural, inteligente e contextualizada em pt-BR, detalhando exatamente os valores/bancos/dados que você identificou e preparou para ela",
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
      "titulo": "Título claro da ação (ex: Atualizar saldo Nubank para R$ 1.450,00)",
      "detalhe": "Explicação curta do impacto no app",
      "substituirExistentes": false,
      "texto": "string opcional (para CRIAR_TAREFA, REGISTRAR_GASTO, REGISTRAR_RECEITA)",
      "valor": 0,
      "categoriaGasto": "Mercado" | "Pets" | "Transporte" | "Estudos & UERJ" | "Lazer & Outros" | "Moradia & Fixos" | "Dívida",
      "srpe": 0,
      "contasAjuste": [{ "nome": "Nome do Banco/Conta", "saldoAtual": 1234.56 }],
      "cartoesAjuste": [{ "nome": "Nome do Cartão", "faturaAtual": 500.00, "limiteTotal": 3000.00, "vencimentoDia": 10 }],
      "compromissos": [{ "titulo": "Nome do evento", "hora": "14:00", "duracaoMin": 60, "diaMes": 30, "mes": 9, "ano": 2026, "local": "", "categoria": "pessoal", "sincronizarGoogle": true }],
      "refeicoes": [{ "horario": "08:00", "nome": "Café da Manhã", "descricao": "Itens", "proteinaG": 30, "kcal": 400 }],
      "itensCompras": [{ "nome": "Item", "categoria": "Despensa & Meal Prep", "quantidadeComprar": 1, "unidade": "un", "precoEstimado": 15.0 }],
      "disciplinas": [{ "nome": "Matéria", "professor": "Prof", "horarioSala": "Seg 08h-10h", "aulasTotaisSemestre": 30, "faltasMax": 7 }],
      "petsAjuste": [{ "nome": "Nina", "racao": "Royal Canin", "estoqueSaches": 12, "estoqueRacaoKg": 4, "proximaVet": "Em dia" }],
      "fichaTreino": { "nome": "Treino A", "foco": "Força", "exercicios": [{ "nome": "Agachamento", "series": 4, "reps": "10", "cargaKg": 40, "descansoSeg": 90 }] },
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

      for (const itemAnexo of listaAnexos) {
        if (itemAnexo?.base64 && itemAnexo.mimeType) {
          const cleanBase64 = itemAnexo.base64.includes(",")
            ? itemAnexo.base64.split(",")[1]
            : itemAnexo.base64;

          if (
            itemAnexo.mimeType.startsWith("image/") ||
            itemAnexo.mimeType.startsWith("audio/") ||
            itemAnexo.mimeType === "application/pdf"
          ) {
            parts.push({
              inlineData: {
                mimeType: itemAnexo.mimeType.split(";")[0],
                data: cleanBase64,
              },
            });
          }
        }
      }

      const temAudio = listaAnexos.some((a) => a.mimeType?.startsWith("audio/"));
      let promptFinal =
        mensagem ||
        (temAudio
          ? "Ouça com atenção esta mensagem de voz da usuária, transcreva o que ela disse em 'transcricaoAudioUsuario', responda em 'respostaLala' e gere todas as ações correspondentes."
          : "Analise detalhadamente a(s) imagem(ns) / arquivo(s) em anexo, extraia todos os valores, saldos, gastos, compromissos ou tarefas e gere as ações correspondentes para atualizar o aplicativo agora.");

      const anexosNaoAudio = listaAnexos.filter(
        (a) => !a.mimeType?.startsWith("audio/")
      );
      if (anexosNaoAudio.length > 0) {
        promptFinal += `\n\n[${anexosNaoAudio.length} arquivo(s)/imagem(ns) anexado(s): ${anexosNaoAudio
          .map((a) => `"${a.nome}" (${a.mimeType})`)
          .join(", ")}]`;
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
