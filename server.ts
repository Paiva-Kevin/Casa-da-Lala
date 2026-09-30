import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const PORT = Number(process.env.PORT) || 3000;

const CHAT_MODELS = [
  "gemini-3.8-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest",
];

const TTS_MODELS = [
  "gemini-3.8-flash-lite-tts",
  "gemini-2.5-flash-preview-tts",
];

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "35mb" }));

  // Enable CORS on /api/* so deployed frontends (Firebase Hosting / PWA / Cloud Run) can reach the server
  app.use("/api", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
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

      const systemInstruction = `Você é a Lala, a governanta pessoal e assistente de vida do aplicativo "Casa da Lala".
Você conversa em formato de BATE-PAPO fluido, direto, caloroso e inteligente.

Contexto atual do aplicativo da usuária (inclui autonomiaLala, tiposAutomatizados e regrasAprendidasLala):
${JSON.stringify(contextoApp || {})}

Histórico recente da conversa:
${historicoFormatado}

MISSÃO PRINCIPAL:
1. Você administra, filtra e atualiza QUALQUER parte do aplicativo a partir do que a usuária escrever, falar por áudio ou enviar em 1 ou várias imagens/prints/arquivos!
2. REGRAS APRENDIDAS E CONFIRMAÇÃO PROGRESSIVA:
   - Respeite rigorosamente as "regrasAprendidasLala" e "instrucoesPersonalizadasLala" presentes no contextoApp (são correções e preferências que a usuária já te ensinou!).
   - Por padrão, a usuária prefere revisar e CONFIRMAR cada ação antes de alterar o app (exceto para tipos listados em "tiposAutomatizados" ou quando "autonomiaLala" === "auto"). Portanto, gere sempre as ações completas e detalhadas em "acoesPropostas" e avise na "respostaLala" que você preparou o card da ação logo abaixo para ela conferir, editar se quiser me ensinar algum ajuste, ou confirmar com 1 clique (ou diga que já aplicou caso aquele tipo já esteja automatizado).
   - Se a usuária der uma instrução de aprendizado (ex: "sempre que eu lançar mercado coloca na conta Itaú", "nunca agende nada antes das 9h", "quando for ração da Nina o valor é 45,90"), preencha "novaRegraAprendida" com essa regra clara para você memorizar para sempre!
   - Se a usuária pedir no chat para AUTOMATIZAR algum processo (ex: "pode fazer gastos automático agora", "não precisa mais pedir confirmação para tarefas", "automatiza tudo de pets"), inclua os tipos correspondentes em "automatizarTipos". Se ela pedir para voltar a pedir confirmação, inclua em "pedirConfirmacaoTipos".
3. NUNCA responda apenas oferecendo "Guardar imagem no Segundo Cérebro" quando a usuária enviar prints de contas bancárias, faturas, comprovantes, horários, dietas, treinos ou listas!
   - Só gere a ação "GUARDAR_SEGUNDO_CEREBRO" se a usuária pedir EXPLICITAMENTE para guardar/arquivar o documento no Segundo Cérebro.
   - Se a usuária enviar PRINTS DE CONTA BANCÁRIA, SALDO, EXTRATO, PIX OU CARTÃO DE CRÉDITO (ou der comandos sobre a conta dela): leia todos os números e nomes dos bancos/cartões nas imagens e gere IMEDIATAMENTE as ações "ATUALIZAR_CONTAS_FINANCAS" (com contasAjuste e/ou cartoesAjuste), "REGISTRAR_GASTO" e/ou "REGISTRAR_RECEITA"! Se ela estiver mostrando os saldos atuais das contas dela, defina "substituirExistentes": true em ATUALIZAR_CONTAS_FINANCAS caso ela peça para deixar apenas as contas dela.
   - Se a usuária enviar PRINTS DE HORÁRIOS, AGENDA, CALENDÁRIO OU AULAS: extraia os eventos/disciplinas e gere "AGENDAR_COMPROMISSO" e/ou "ATUALIZAR_GRADE_UERJ".
   - Se enviar PRINTS/ARQUIVOS DE DIETA, CARDÁPIO OU MERCADO: extraia as refeições e ingredientes e gere "ATUALIZAR_DIETA_E_COMPRAS" ou "CRIAR_LISTA_COMPRAS".
   - Se enviar PRINTS/ARQUIVOS DE TAREFAS, PROJETOS OU TREINO: gere "CRIAR_TAREFA", "ATUALIZAR_PROJETOS_TRABALHO" ou "ATUALIZAR_TREINO".
4. Na sua "respostaLala", confirme claramente em tom de conversa o que você leu nos prints/mensagens e quais valores/itens você preparou ou atualizou no app!

Retorne SEMPRE um objeto JSON válido exatamente neste formato:
{
  "modoDetectado": "comando" | "devaneio" | "desabafo" | "orientacao" | "informacao",
  "transcricaoAudioUsuario": "string opcional se enviou áudio",
  "respostaLala": "Sua resposta natural de bate-papo em pt-BR detalhando o que você preparou/atualizou",
  "tituloCard": "Resumo curto em até 5 palavras",
  "tags": ["Tag1", "Tag2"],
  "novaRegraAprendida": "string opcional quando a usuária ensinar um padrão ou preferência para as próximas vezes",
  "automatizarTipos": ["REGISTRAR_GASTO"],
  "pedirConfirmacaoTipos": [],
  "matrizDecisao": {
    "cenarioA": "string opcional",
    "cenarioB": "string opcional",
    "vereditoLala": "string opcional"
  },
  "acoesPropostas": [
    {
      "tipo": "ATUALIZAR_CONTAS_FINANCAS" | "REGISTRAR_GASTO" | "REGISTRAR_RECEITA" | "CRIAR_TAREFA" | "AGENDAR_COMPROMISSO" | "ALIMENTAR_PETS" | "REGISTRAR_SRPE" | "ATUALIZAR_DIETA_E_COMPRAS" | "CRIAR_LISTA_COMPRAS" | "ATUALIZAR_GRADE_UERJ" | "ATUALIZAR_PETS" | "ATUALIZAR_TREINO" | "ATUALIZAR_PROJETOS_TRABALHO" | "ATUALIZAR_HABITOS" | "ATUALIZAR_METAS_RADAR" | "ATUALIZAR_PERFIL_CHECKIN" | "ALIVIAR_AGENDA_HOJE" | "LIMPAR_DADOS_EXEMPLO" | "GUARDAR_SEGUNDO_CEREBRO",
      "titulo": "Título claro da ação executada (ex: Atualizar saldo Nubank para R$ 1.450,00)",
      "detalhe": "Explicação curta",
      "substituirExistentes": false,
      "texto": "string opcional (para CRIAR_TAREFA, REGISTRAR_GASTO, REGISTRAR_RECEITA)",
      "valor": 0,
      "categoriaGasto": "Mercado" | "Pets" | "Transporte & UERJ" | "Saúde & Corpo" | "Lazer & Outros" | "Fixos & Reserva",
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

      let response = null;
      let lastErr: unknown = null;
      for (const modelName of CHAT_MODELS) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: parts,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
            },
          });
          if (response?.text) break;
        } catch (err) {
          lastErr = err;
          console.warn(`Fallback de modelo em /api/lala/interact (${modelName}):`, err);
        }
      }

      if (!response) {
        throw lastErr || new Error("Nenhum modelo Gemini respondeu.");
      }

      const rawText = (response.text || "{}")
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const parsed = JSON.parse(rawText);
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
        watch: null,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Casa da Lala server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
