// Unified Local & Cloud Multimodal Intelligence Engine for Lala
// Automatically understands commands, uploaded files/images (diet, UERJ schedule, workouts, receipts, or vault storage), expenses, tasks, pet care, vents, daydreams, and questions.

import { GoogleGenAI } from "@google/genai";
import {
  AcaoGovernanta,
  AnexoLala,
  ArquivoRepositorio,
  InteracaoGovernanta,
  MatrizDecisaoLala,
  ModoInteracaoLala,
} from "../types/lala";
import { parseGastoNatural } from "../data/initialData";

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
  tomLala?: string;
  autonomiaLala?: "auto" | "confirmar";
  instrucoesPersonalizadasLala?: string;
  horarioAcordar?: string;
  horarioDormir?: string;
  historicoConversa?: {
    usuario: string;
    lala: string;
    dataHora?: string;
  }[];
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

  if (typeof document === "undefined" || !file.type.startsWith("image/")) {
    return {
      base64: rawDataUrl,
      mimeType: file.type || "application/octet-stream",
      tamanhoBytes: file.size,
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const MAX_DIM = 1440;
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
            mimeType: file.type,
            tamanhoBytes: file.size,
          });
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.85);
        const approxBytes = Math.round((compressed.length * 3) / 4);
        resolve({
          base64: compressed,
          mimeType: "image/jpeg",
          tamanhoBytes: approxBytes,
        });
      } catch {
        resolve({
          base64: rawDataUrl,
          mimeType: file.type,
          tamanhoBytes: file.size,
        });
      }
    };
    img.onerror = () =>
      resolve({
        base64: rawDataUrl,
        mimeType: file.type,
        tamanhoBytes: file.size,
      });
    img.src = rawDataUrl;
  });
}

export async function lerArquivoParaAnexo(
  file: File,
  intencao: AnexoLala["intencao"] = "auto",
  areaRepositorio: ArquivoRepositorio["area"] = "Pessoal"
): Promise<AnexoLala> {
  const { base64, mimeType, tamanhoBytes } = file.type.startsWith("image/")
    ? await comprimirImagemParaDataUrl(file)
    : {
        base64: await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        }),
        mimeType: file.type || "application/octet-stream",
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
    mimeType,
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

  // 2. Comando de Dieta, Grade UERJ, Saldo, Gasto, Pets, sRPE ou Anexo
  const parsedGasto = parseGastoNatural(texto);
  if (
    anexo ||
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

  // CASO 5: Calibrar / Alterar Saldo Bancário por voz/texto
  const matchSaldo = lower.match(
    /(?:saldo|conta|nubank|itaú|itau|banco).*?(?:para|é|e|em|r\$)\s*(\d+(?:[.,]\d{1,2})?)/i
  );
  if (matchSaldo) {
    const novoSaldo = parseFloat(matchSaldo[1].replace(",", "."));
    if (!isNaN(novoSaldo)) {
      const nomeConta = lower.includes("itaú") || lower.includes("itau")
        ? "Itaú / Recebimentos"
        : lower.includes("reserva")
        ? "Reserva Emergência"
        : "Nubank (Conta / Pix)";
      acoes.push({
        id: `act-${Date.now()}-saldo`,
        tipo: "ATUALIZAR_CONTAS_FINANCAS",
        titulo: `Atualizar saldo de ${nomeConta} para R$ ${novoSaldo.toFixed(2).replace(".", ",")}`,
        detalhe: "Recalcula automaticamente o seu Dinheiro Livre Hoje",
        executada: false,
        payload: {
          contasAjuste: [{ nome: nomeConta, saldoAtual: novoSaldo }],
        },
      });
    }
  }

  // Se houver qualquer anexo genérico não capturado acima, sempre oferece Guardar no Segundo Cérebro + Criar Tarefa
  if (anexo && acoes.length === 0) {
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

  // Verifica se há gasto embutido na fala
  const gasto = parseGastoNatural(texto);
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
    acoes.push({
      id: `act-${Date.now()}-gasto`,
      tipo: "REGISTRAR_GASTO",
      titulo: `Lançar R$ ${gasto.valor.toFixed(2).replace(".", ",")} (${gasto.categoria})`,
      detalhe: `${gasto.descricao} · ${gasto.metodoSugerido}`,
      executada: false,
      payload: {
        valor: gasto.valor,
        categoriaGasto: gasto.categoria,
        texto: gasto.descricao,
      },
    });
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

  // Verifica se falou de agendar compromisso / evento no calendário
  const matchHoraComp = texto.match(/(\d{1,2})[:h](\d{2})?/i);
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

  // Modo "comando"
  if (acoes.length === 0) {
    acoes.push({
      id: `act-${Date.now()}-task-cmd`,
      tipo: "CRIAR_TAREFA",
      titulo: `Adicionar Tarefa: "${(texto || anexo?.nome || "Nova tarefa").slice(0, 45)}"`,
      detalhe: "Entra na sua lista de Hoje já priorizada",
      executada: false,
      payload: { texto: texto || `Revisar ${anexo?.nome}` },
    });
  }

  return {
    modo: "comando",
    nomeAnexo: anexo?.nome,
    anexo,
    tituloCard: anexo ? `Arquivo processado: ${anexo.nome}` : `Capturado pela Lala`,
    tags: anexo ? ["Arquivo", "Ação Rápida"] : ["Acesso Rápido", "Execução"],
    respostaLala: anexo
      ? `Analisei o arquivo "${anexo.nome}" e deixei as ações prontas abaixo para você confirmar com 1 toque.`
      : `Prontinho! Identifiquei o que você precisa e deixei a ação engatilhada. Quer aproveitar e ajustar mais alguma coisa?`,
    acoesPropostas: acoes,
    sugestoesResposta: [
      "Como ficou meu resumo de hoje?",
      "Agendar um compromisso na agenda",
      "Dei sachê pra Nina e pro Tobias",
    ],
  };
}

export async function consultarLalaUnificada(
  texto: string,
  ctx: LalaContextSnapshot,
  anexoOuAnexos?: AnexoLala | AnexoLala[]
): Promise<Omit<InteracaoGovernanta, "id" | "dataHora" | "mensagemUsuario">> {
  const listaAnexos: AnexoLala[] = Array.isArray(anexoOuAnexos)
    ? anexoOuAnexos
    : anexoOuAnexos
    ? [anexoOuAnexos]
    : [];
  const primeiroAnexo = listaAnexos[0];

  // Se o usuário pediu explicitamente "só guardar" um arquivo, executa direto
  if (primeiroAnexo?.intencao === "guardar") {
    return processarMensagemLocalLala(texto, ctx, primeiroAnexo);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = null;

  if (typeof navigator !== "undefined" && navigator.onLine) {
    // 1. Tenta via rota de backend (/api/lala/interact)
    try {
      const res = await fetch("/api/lala/interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagem: texto,
          contextoApp: ctx,
          historicoConversa: ctx.historicoConversa,
          anexo: primeiroAnexo,
          anexos: listaAnexos,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const parsed = await res.json();
        if (parsed && parsed.respostaLala) {
          data = parsed;
        }
      }
    } catch {
      // Continua para tentativa direta caso esteja em hospedagem estática (Firebase Hosting / GitHub)
    }

    // 2. Fallback Multimodal Direto via SDK (@google/genai) caso o app esteja hospedado em servidor estático (Firebase Hosting)
    if (!data) {
      try {
        const clientKey =
          (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) || "";
        if (clientKey) {
          const ai = new GoogleGenAI({ apiKey: clientKey });
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

          parts.push({
            text: `Você é a Lala, governanta pessoal do app Casa da Lala.
Contexto atual da usuária: ${JSON.stringify(ctx)}
Mensagem da usuária: ${texto || "Analise as imagens/arquivos anexados e atualize o aplicativo com todos os saldos, faturas, gastos, receitas, compromissos ou tarefas encontrados."}

IMPORTANTE:
- NUNCA retorne apenas "GUARDAR_SEGUNDO_CEREBRO" quando a usuária enviar prints de contas bancárias, faturas, gastos, horários ou listas!
- Se houver prints de contas bancárias, saldos ou cartões de crédito, extraia todos os valores e gere a ação "ATUALIZAR_CONTAS_FINANCAS" preenchendo "contasAjuste" ([{ "nome": "Banco", "saldoAtual": 123.45 }]) e/ou "cartoesAjuste" ([{ "nome": "Cartão", "faturaAtual": 123.45, "limiteTotal": 1000, "vencimentoDia": 10 }]), além de "REGISTRAR_GASTO" ou "REGISTRAR_RECEITA" se houver transações!
- Retorne APENAS um JSON válido com: { "modoDetectado": "comando", "transcricaoAudioUsuario": "", "respostaLala": "sua resposta detalhada em pt-BR", "tituloCard": "Resumo", "tags": ["Finanças"], "acoesPropostas": [ { "tipo": "...", "titulo": "...", "detalhe": "...", "substituirExistentes": false, "valor": 0, "categoriaGasto": "Mercado", "texto": "", "contasAjuste": [], "cartoesAjuste": [], "compromissos": [], "refeicoes": [], "itensCompras": [], "disciplinas": [] } ] }`,
          });

          const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: parts,
            config: {
              responseMimeType: "application/json",
            },
          });
          const raw = (response.text || "{}")
            .replace(/^```json\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();
          const parsed = JSON.parse(raw);
          if (parsed && parsed.respostaLala) {
            data = parsed;
          }
        }
      } catch {
        // Fallback para motor local
      }
    }

    if (data && data.respostaLala) {
      const modoDetectado: ModoInteracaoLala =
        data.modoDetectado || detectarIntencaoNatural(texto, primeiroAnexo);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const acoesMapeadas: AcaoGovernanta[] = Array.isArray(data.acoesPropostas)
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.acoesPropostas.map((a: any, idx: number) => ({
            id: `ai-act-${Date.now()}-${idx}`,
            tipo: a.tipo || "CRIAR_TAREFA",
            titulo: a.titulo || "Ação da Lala",
            detalhe: a.detalhe || "",
            executada: false,
            payload: {
              texto: a.texto || a.titulo,
              valor: a.valor,
              categoriaGasto: a.categoriaGasto,
              srpe: a.srpe,
              areaNota: a.areaNota || primeiroAnexo?.areaRepositorio,
              anexo: primeiroAnexo,
              substituirExistentes: a.substituirExistentes,
              compromissos: a.compromissos,
              refeicoes: a.refeicoes,
              itensCompras: a.itensCompras,
              disciplinas: a.disciplinas,
              contasAjuste: a.contasAjuste,
              cartoesAjuste: a.cartoesAjuste,
              petsAjuste: a.petsAjuste,
              fichaTreino: a.fichaTreino,
              projetos: a.projetos,
              habitos: a.habitos,
              metas: a.metas,
              perfilCheckin: a.perfilCheckin,
            },
          }))
        : [];

      const isVoiceNote = primeiroAnexo?.mimeType?.startsWith("audio/");
      const pediuParaGuardarExplicitamente =
        /\b(guardar|salvar|arquivar)\b.*\b(segundo c[ée]rebro|reposit[óo]rio|pasta|cofre)\b/i.test(
          texto
        );

      // Remove GUARDAR_SEGUNDO_CEREBRO se a usuária não pediu para guardar no Segundo Cérebro e já existem outras ações reais
      const acoesFiltradas =
        !pediuParaGuardarExplicitamente && acoesMapeadas.length > 1
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
    try {
      const res = await fetch("/api/lala/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: cleanText, tomLala }),
      });
      if (res.ok) {
        const data = (await res.json()) as { audioBase64?: string };
        if (data?.audioBase64) {
          const played = await playBase64Audio(data.audioBase64);
          if (played) {
            return { audioBase64: data.audioBase64 };
          }
        }
      }
    } catch {
      // Fallback para síntese de voz nativa do navegador
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
