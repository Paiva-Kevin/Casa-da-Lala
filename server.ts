import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "15mb" }));

  // Server-side Gemini API endpoint for Lala (Unified Multimodal Agent)
  app.post("/api/lala/interact", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: "GEMINI_API_KEY not configured on server",
          fallbackToLocal: true,
        });
      }

      const { mensagem, contextoApp, anexo } = req.body as {
        mensagem: string;
        contextoApp?: Record<string, unknown>;
        anexo?: {
          nome: string;
          mimeType: string;
          tamanhoBytes: number;
          base64?: string;
          textoExtraido?: string;
          intencao?: string;
          areaRepositorio?: string;
        };
      };

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemInstruction = `Você é a Lala, a governanta pessoal de vida do aplicativo "Casa da Lala".
Você é uma única inteligência completa, proativa e fluida: ao mesmo tempo executiva (registra gastos, tarefas, alimentação dos gatos, dieta, lista de compras, grade da UERJ, saldos bancários e treinos), acolhedora nos desabafos, criativa nos devaneios e estratégica nas orientações de rotina.
A usuária também pode te enviar ARQUIVOS ou IMAGENS (fotos de cardápio/dieta, PDF/foto da grade de horários da UERJ, comprovantes, fichas de treino, listas de mercado ou documentos para guardar no Segundo Cérebro).

Contexto real da vida da usuária no app neste exato momento:
${JSON.stringify(contextoApp || {})}

Regras fundamentais:
1. Responda sempre em Português do Brasil (pt-BR), de forma natural, calorosa, inteligente e prática.
2. Classifique automaticamente em "modoDetectado": "comando" | "devaneio" | "desabafo" | "orientacao" | "informacao".
3. Se a usuária enviou um arquivo/imagem ou pediu ajuda com:
   - DIETA / CARDÁPIO / NUTRIÇÃO: Interprete as refeições e ingredientes e inclua uma ação "ATUALIZAR_DIETA_E_COMPRAS" preenchendo "refeicoes" (horário, nome, descrição detalhada, proteinaG, kcal) E "itensCompras" (todos os alimentos necessários para comprar no mercado com quantidadeComprar, unidade e precoEstimado em R$).
   - GRADE DA UERJ / DISCIPLINAS / HORÁRIOS DE AULA: Se ela subiu a grade ou pediu ajuda para montar/alterar a grade, inclua uma ação "ATUALIZAR_GRADE_UERJ" preenchendo "disciplinas" (nome, professor, horarioSala ex: "Seg/Qua 08h-10h · Sala 7012", aulasTotaisSemestre: 30, faltasMax: 7).
   - FICHA DE TREINO: Inclua "ATUALIZAR_TREINO" com "fichaTreino" (nome, foco, exercicios).
   - SALDO BANCÁRIO / CALIBRAÇÃO FINANCEIRA: Inclua "ATUALIZAR_CONTAS_FINANCAS" com "contasAjuste" (nome, saldoAtual).
   - LISTA DE COMPRAS AVULSA: Inclua "CRIAR_LISTA_COMPRAS" com "itensCompras".
   - GUARDAR ARQUIVO / IMAGEM / NOTA: Sempre que houver um anexo ou pedido de guardar, inclua também uma ação "GUARDAR_SEGUNDO_CEREBRO" (com areaNota: "UERJ" | "Artigos" | "CDT & RCR" | "Casa & Pets" | "Finanças" | "Pessoal") para salvar o arquivo no repositório.
4. Se ela estiver indecisa entre opções ou pedir conselho, preencha "matrizDecisao" com Cenário A, Cenário B e seu Veredito baseado na Prontidão Física e no Dinheiro Livre Hoje.`;

      // Build multimodal contents array
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = [];

      if (anexo?.base64 && anexo.mimeType) {
        const cleanBase64 = anexo.base64.includes(",")
          ? anexo.base64.split(",")[1]
          : anexo.base64;

        if (
          anexo.mimeType.startsWith("image/") ||
          anexo.mimeType === "application/pdf"
        ) {
          parts.push({
            inlineData: {
              mimeType: anexo.mimeType,
              data: cleanBase64,
            },
          });
        }
      }

      let promptFinal = mensagem || "Analise o arquivo em anexo e execute as ações necessárias.";
      if (anexo) {
        promptFinal += `\n\n[Arquivo anexado: "${anexo.nome}" (${anexo.mimeType}), intenção indicada: ${anexo.intencao || "auto"}]`;
        if (anexo.textoExtraido) {
          promptFinal += `\nConteúdo de texto extraído do arquivo:\n${anexo.textoExtraido.slice(0, 12000)}`;
        }
      }
      parts.push({ text: promptFinal });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: parts,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              modoDetectado: {
                type: Type.STRING,
                description:
                  "comando | devaneio | desabafo | orientacao | informacao",
              },
              respostaLala: {
                type: Type.STRING,
                description: "Resposta natural e completa da Lala em pt-BR.",
              },
              tituloCard: {
                type: Type.STRING,
                description: "Resumo curto em até 6 palavras.",
              },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              matrizDecisao: {
                type: Type.OBJECT,
                properties: {
                  cenarioA: { type: Type.STRING },
                  cenarioB: { type: Type.STRING },
                  vereditoLala: { type: Type.STRING },
                },
              },
              acoesPropostas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tipo: {
                      type: Type.STRING,
                      description:
                        "CRIAR_TAREFA | REGISTRAR_GASTO | ALIMENTAR_PETS | REGISTRAR_SRPE | GUARDAR_SEGUNDO_CEREBRO | ALIVIAR_AGENDA_HOJE | ATIVAR_MODO_SOS | ATUALIZAR_DIETA_E_COMPRAS | ATUALIZAR_GRADE_UERJ | ATUALIZAR_CONTAS_FINANCAS | ATUALIZAR_PETS | CRIAR_LISTA_COMPRAS | ATUALIZAR_TREINO",
                    },
                    titulo: { type: Type.STRING },
                    detalhe: { type: Type.STRING },
                    texto: { type: Type.STRING },
                    valor: { type: Type.NUMBER },
                    categoriaGasto: { type: Type.STRING },
                    srpe: { type: Type.NUMBER },
                    areaNota: { type: Type.STRING },
                    refeicoes: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          horario: { type: Type.STRING },
                          nome: { type: Type.STRING },
                          descricao: { type: Type.STRING },
                          proteinaG: { type: Type.NUMBER },
                          kcal: { type: Type.NUMBER },
                        },
                      },
                    },
                    itensCompras: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          nome: { type: Type.STRING },
                          categoria: { type: Type.STRING },
                          quantidadeComprar: { type: Type.NUMBER },
                          unidade: { type: Type.STRING },
                          precoEstimado: { type: Type.NUMBER },
                        },
                      },
                    },
                    disciplinas: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          nome: { type: Type.STRING },
                          professor: { type: Type.STRING },
                          horarioSala: { type: Type.STRING },
                          aulasTotaisSemestre: { type: Type.NUMBER },
                          faltasMax: { type: Type.NUMBER },
                        },
                      },
                    },
                    contasAjuste: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          nome: { type: Type.STRING },
                          saldoAtual: { type: Type.NUMBER },
                        },
                      },
                    },
                  },
                  required: ["tipo", "titulo", "detalhe"],
                },
              },
            },
            required: ["modoDetectado", "respostaLala", "tituloCard", "tags"],
          },
        },
      });

      const rawText = response.text || "{}";
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
