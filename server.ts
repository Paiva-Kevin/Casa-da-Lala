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

      const { mensagem, contextoApp, anexo, historicoConversa } = req.body as {
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
      };

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
              .slice(-8)
              .map(
                (h) =>
                  `[${h.dataHora || "Antes"}] Usuária: ${h.usuario}\nLala: ${h.lala}`
              )
              .join("\n---\n")
          : "Início da conversa.";

      const systemInstruction = `Você é a Lala, a governanta pessoal de vida do aplicativo "Casa da Lala".
Você conversa em formato de BATE-PAPO fluido, próximo, inteligente e proativo (NUNCA engessada ou robótica): a usuária pode bater papo com você sobre o dia dela, tirar dúvidas, desabafar, planejar a rotina em vários turnos de conversa, ou pedir para preencher, cadastrar, alterar ou limpar qualquer informação do aplicativo falando naturalmente!
A usuária também pode te enviar QUALQUER ARQUIVO ou IMAGEM (PDFs, fotos, prints, planilhas, documentos, comprovantes, cronogramas, listas, etc.) e escolher o que fazer com ele (ex: importar eventos pro calendário, importar tarefas/projetos, importar gastos/extrato, importar lista de compras/cardápio, importar estudos/disciplinas, importar treinos ou apenas guardar no Segundo Cérebro).

Contexto real e Calibração da usuária neste exato momento:
${JSON.stringify(contextoApp || {})}

Histórico recente do bate-papo (mantenha a continuidade natural da conversa):
${historicoFormatado}

Regras fundamentais:
1. Responda sempre em Português do Brasil (pt-BR), como em um bate-papo real e caloroso, seguindo o tom calibrado pela usuária (ex: equilibrada, acolhedora, executiva ou treinadora) e respeitando rigorosamente as "instrucoesPersonalizadasLala", "horarioAcordar" e "horarioDormir" presentes no contextoApp.
2. Classifique automaticamente em "modoDetectado": "comando" | "devaneio" | "desabafo" | "orientacao" | "informacao".
3. Sempre gere de 2 a 3 "sugestoesResposta" curtas (frases em 1ª pessoa que a usuária pode clicar para continuar o bate-papo com você, ex: "E como fica minha agenda de amanhã?", "Adiciona isso nas tarefas de hoje", "Me ajuda a montar o cardápio").
4. Quando um arquivo for anexado, olhe para "anexo.intencao" ("auto" | "calendario" | "tarefas" | "financas" | "compras_dieta" | "estudos" | "treino" | "guardar") e para a instrução da usuária:
   - Se "calendario": extraia todos os eventos, horários, escalas, aulas ou compromissos do arquivo e gere "AGENDAR_COMPROMISSO".
   - Se "tarefas": extraia tarefas, checklists ou etapas de projetos do arquivo e gere "CRIAR_TAREFA" e/ou "ATUALIZAR_PROJETOS_TRABALHO".
   - Se "financas": extraia despesas, receitas, faturas ou saldos do arquivo e gere "REGISTRAR_GASTO", "REGISTRAR_RECEITA" e/ou "ATUALIZAR_CONTAS_FINANCAS".
   - Se "compras_dieta" ou "dieta": extraia itens de compra/mercado e/ou refeições e gere "CRIAR_LISTA_COMPRAS" ou "ATUALIZAR_DIETA_E_COMPRAS".
   - Se "estudos" ou "grade": extraia disciplinas, horários, leituras ou metas de estudo e gere "ATUALIZAR_GRADE_UERJ" e/ou "CRIAR_TAREFA".
   - Se "treino": extraia exercícios/séries ou hábitos e gere "ATUALIZAR_TREINO" e/ou "ATUALIZAR_HABITOS".
   - Se "auto": identifique livremente o que há no arquivo e gere as ações ideais para importar os dados para o app!
4. Sempre que a usuária mencionar dados da vida dela (mesmo em tom de conversa livre), extraia TODAS as ações correspondentes em "acoesPropostas" usando os dados EXATOS que ela falou (nunca invente matérias ou dados fixos se ela especificou os dela):
   - LIMPAR / ZERAR DADOS DE EXEMPLO: Se ela pedir para limpar o app, apagar dados de exemplo ou começar do zero, inclua "LIMPAR_DADOS_EXEMPLO".
   - COMPROMISSOS / AGENDA / GOOGLE AGENDA: Se ela mencionar qualquer evento, aula avulsa, consulta, reunião ou compromisso com dia/horário, inclua "AGENDAR_COMPROMISSO" preenchendo "compromissos" (titulo, hora no formato "HH:MM", duracaoMin, diaMes 1..31, mes 1..12, ano 2026, local, categoria: "uerj" | "trabalho" | "pets" | "financas" | "saude" | "pessoal", sincronizarGoogle: true).
   - TAREFAS / PENDÊNCIAS: Inclua "CRIAR_TAREFA" com "texto" para cada tarefa mencionada.
   - GASTOS OU RECEITAS: Para despesas use "REGISTRAR_GASTO" (valor, categoriaGasto, texto). Para ganhos/salário/bolsa/pix recebido use "REGISTRAR_RECEITA" (valor, texto).
   - SALDO BANCÁRIO E CARTÕES DE CRÉDITO: Se ela disser o saldo de alguma conta ou valor de fatura/limite de cartão, inclua "ATUALIZAR_CONTAS_FINANCAS" com "contasAjuste" (nome, saldoAtual) e/ou "cartoesAjuste" (nome, faturaAtual, limiteTotal, vencimentoDia).
   - GRADE DA UERJ / DISCIPLINAS: Se ela falar suas matérias, professores ou horários (ou subir arquivo da grade), inclua "ATUALIZAR_GRADE_UERJ" com "disciplinas" (nome, professor, horarioSala, aulasTotaisSemestre, faltasMax) e defina "substituirExistentes": true se for a grade toda ou false se estiver apenas adicionando uma matéria.
   - PROJETOS DE TRABALHO (CDT, RCR, IC, etc.): Se ela falar de projetos ou entregáveis do trabalho, inclua "ATUALIZAR_PROJETOS_TRABALHO" com "projetos" (nome, papel, tarefa, prazo, prioridade).
   - DIETA / CARDÁPIO / LISTA DE COMPRAS: Se ela falar o que come nas refeições ou subir dieta, inclua "ATUALIZAR_DIETA_E_COMPRAS" com "refeicoes" e "itensCompras". Se falar apenas itens para comprar no mercado/petshop, inclua "CRIAR_LISTA_COMPRAS" com "itensCompras".
   - PETS (NINA, TOBIAS OU OUTROS PETS): Se falar sobre estoque de sachês/ração, nomes dos pets, veterinário ou vacinas, inclua "ATUALIZAR_PETS" com "petsAjuste" (nome, racao, estoqueSaches, estoqueRacaoKg, proximaVet) e/ou "estoquePetsAjuste". Se disser que alimentou os pets agora, inclua "ALIMENTAR_PETS".
   - HÁBITOS DIÁRIOS: Se quiser criar ou acompanhar hábitos (ex: beber água, ler, creatina, alongar), inclua "ATUALIZAR_HABITOS" com "habitos" (titulo, categoria, metaTexto).
   - METAS: Se falar de objetivos ou metas do semestre/mês, inclua "ATUALIZAR_METAS_RADAR" com "metas" (titulo, categoria, prazo, marcos).
   - PERFIL, SONO & PRONTIDÃO: Se falar quantas horas dormiu, como está a energia/foco, seu nome, curso ou metas de proteína/kcal, inclua "ATUALIZAR_PERFIL_CHECKIN" com "perfilCheckin".
   - FICHA DE TREINO: Se falar seus exercícios/séries ou subir treino, inclua "ATUALIZAR_TREINO" com "fichaTreino".
   - GUARDAR ARQUIVO / NOTA: Sempre que houver anexo ou pedido de salvar nota/ideia, inclua "GUARDAR_SEGUNDO_CEREBRO".
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
        model: "gemini-3.8-flash",
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
              sugestoesResposta: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  "2 a 3 sugestões curtas de resposta rápida para a usuária continuar o bate-papo.",
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
                        "CRIAR_TAREFA | AGENDAR_COMPROMISSO | REGISTRAR_GASTO | REGISTRAR_RECEITA | ALIMENTAR_PETS | REGISTRAR_SRPE | GUARDAR_SEGUNDO_CEREBRO | ALIVIAR_AGENDA_HOJE | ATIVAR_MODO_SOS | ATUALIZAR_DIETA_E_COMPRAS | ATUALIZAR_GRADE_UERJ | ATUALIZAR_CONTAS_FINANCAS | ATUALIZAR_PETS | CRIAR_LISTA_COMPRAS | ATUALIZAR_TREINO | ATUALIZAR_PROJETOS_TRABALHO | ATUALIZAR_HABITOS | ATUALIZAR_METAS_RADAR | ATUALIZAR_PERFIL_CHECKIN | LIMPAR_DADOS_EXEMPLO",
                    },
                    titulo: { type: Type.STRING },
                    detalhe: { type: Type.STRING },
                    texto: { type: Type.STRING },
                    valor: { type: Type.NUMBER },
                    categoriaGasto: { type: Type.STRING },
                    srpe: { type: Type.NUMBER },
                    areaNota: { type: Type.STRING },
                    substituirExistentes: { type: Type.BOOLEAN },
                    compromissos: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          titulo: { type: Type.STRING },
                          hora: { type: Type.STRING },
                          duracaoMin: { type: Type.NUMBER },
                          diaMes: { type: Type.NUMBER },
                          mes: { type: Type.NUMBER },
                          ano: { type: Type.NUMBER },
                          local: { type: Type.STRING },
                          categoria: { type: Type.STRING },
                          sincronizarGoogle: { type: Type.BOOLEAN },
                        },
                      },
                    },
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
                    cartoesAjuste: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          nome: { type: Type.STRING },
                          faturaAtual: { type: Type.NUMBER },
                          limiteTotal: { type: Type.NUMBER },
                          vencimentoDia: { type: Type.NUMBER },
                        },
                      },
                    },
                    petsAjuste: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          nome: { type: Type.STRING },
                          racao: { type: Type.STRING },
                          estoqueSaches: { type: Type.NUMBER },
                          estoqueRacaoKg: { type: Type.NUMBER },
                          proximaVet: { type: Type.STRING },
                        },
                      },
                    },
                    fichaTreino: {
                      type: Type.OBJECT,
                      properties: {
                        nome: { type: Type.STRING },
                        foco: { type: Type.STRING },
                        exercicios: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              nome: { type: Type.STRING },
                              series: { type: Type.NUMBER },
                              reps: { type: Type.STRING },
                              cargaKg: { type: Type.NUMBER },
                              descansoSeg: { type: Type.NUMBER },
                            },
                          },
                        },
                      },
                    },
                    projetos: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          nome: { type: Type.STRING },
                          papel: { type: Type.STRING },
                          tarefa: { type: Type.STRING },
                          prazo: { type: Type.STRING },
                          prioridade: { type: Type.STRING },
                        },
                      },
                    },
                    habitos: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          titulo: { type: Type.STRING },
                          categoria: { type: Type.STRING },
                          metaTexto: { type: Type.STRING },
                        },
                      },
                    },
                    metas: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          titulo: { type: Type.STRING },
                          categoria: { type: Type.STRING },
                          prazo: { type: Type.STRING },
                          marcos: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                        },
                      },
                    },
                    perfilCheckin: {
                      type: Type.OBJECT,
                      properties: {
                        nomeUsuario: { type: Type.STRING },
                        cursoUERJ: { type: Type.STRING },
                        frentesTrabalho: { type: Type.STRING },
                        horasSono: { type: Type.NUMBER },
                        energiaFisica: { type: Type.NUMBER },
                        focoMental: { type: Type.NUMBER },
                        metaProteinaG: { type: Type.NUMBER },
                        metaKcal: { type: Type.NUMBER },
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
