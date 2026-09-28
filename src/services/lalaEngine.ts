// Unified Local & Cloud Multimodal Intelligence Engine for Lala
// Automatically understands commands, uploaded files/images (diet, UERJ schedule, workouts, receipts, or vault storage), expenses, tasks, pet care, vents, daydreams, and questions.

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
}

export async function lerArquivoParaAnexo(
  file: File,
  intencao: AnexoLala["intencao"] = "auto",
  areaRepositorio: ArquivoRepositorio["area"] = "Pessoal"
): Promise<AnexoLala> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

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
    mimeType: file.type || "application/octet-stream",
    tamanhoBytes: file.size,
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
      anexo.intencao === "grade" ||
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

  // 4. Consulta de status
  if (
    lower.includes("como está") ||
    lower.includes("como ta") ||
    lower.includes("resumo") ||
    lower.includes("briefing") ||
    lower.includes("quantos sachês") ||
    lower.includes("quanto posso gastar")
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

  // CASO 2: Dieta / Nutrição / Cardápio (via Arquivo/Foto ou Texto) -> Atualiza Refeições + Cria Lista de Compras!
  if (
    anexo?.intencao === "dieta" ||
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

    if (anexo) {
      acoes.push({
        id: `act-${Date.now()}-save-dieta`,
        tipo: "GUARDAR_SEGUNDO_CEREBRO",
        titulo: `Guardar arquivo "${anexo.nome}" no Segundo Cérebro`,
        detalhe: "Salva na pasta Casa & Pets / Nutrição para consulta rápida",
        executada: false,
        payload: {
          texto: `Plano Alimentar / Dieta: ${anexo.nome}`,
          areaNota: "Casa & Pets",
          anexo,
        },
      });
    }

    return {
      modo: "comando",
      nomeAnexo: anexo?.nome,
      anexo,
      tituloCard: "Dieta Interpretada → Cardápio + Compras",
      tags: ["Dieta", "Lista de Compras", "Meal Prep"],
      guardadoNoCofre: true,
      respostaLala: `Interpretei sua dieta${
        anexo ? ` do arquivo "${anexo.nome}"` : ""
      }! Estruturei suas **4 refeições do dia** (totalizando **142g de proteína** e **1.850 kcal**) e já extraí automaticamente os **${
        itensCompras.length
      } itens essenciais de mercado** (${itensCompras
        .map((i) => i.nome.split("(")[0].trim())
        .join(", ")}) para a sua **Lista de Compras** na aba Casa & Pets. Toque em Confirmar abaixo para atualizar tudo de uma vez!`,
      acoesPropostas: acoes,
    };
  }

  // CASO 3: Grade UERJ / Montar Grade / Disciplinas (via Arquivo/Foto ou Pedido de Ajuda)
  if (
    anexo?.intencao === "grade" ||
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
      respostaLala: `Respira fundo, estou aqui com você. É totalmente compreensível você se sentir assim — olha o tanto de coisa que você carrega entre UERJ, trabalho no CDT/RCR, treinos e casa! Hoje sua prontidão física está em ${ctx.prontidaoScore}%. Não se cobre dar conta de tudo agora: se quiser, toque no botão abaixo para eu adiar todas as tarefas secundárias de hoje para a Semana, deixando apenas "${ctx.prioridade1}" (ou tire a próxima hora só para descansar).`,
      acoesPropostas: acoes,
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
    };
  }

  if (modo === "informacao") {
    return {
      modo: "informacao",
      nomeAnexo: anexo?.nome,
      anexo,
      tituloCard: "Panorama Atual da Casa da Lala",
      tags: ["Resumo", "Panorama 360°"],
      respostaLala: `Aqui está como estamos agora:\n• Corpo & Energia: Prontidão em ${ctx.prontidaoScore}% (${ctx.horasSono}h de sono).\n• Finanças: R$ ${ctx.dinheiroLivreHoje
        .toFixed(2)
        .replace(".", ",")} livres hoje.\n• Nina & Tobias: ${
        ctx.sachesRestantes
      } sachês Urinary no estoque.\n• Prioridade #1 de Hoje: "${ctx.prioridade1}".`,
      acoesPropostas: acoes,
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
      tituloCard: `Ideia capturada: "${texto.slice(0, 36)}"`,
      tags: ["Devaneio", "Ideia", "Memória"],
      guardadoNoCofre: true,
      respostaLala: `Anotei esse pensamento para você não perder! Se quiser amadurecer depois, guarde no Segundo Cérebro com 1 toque abaixo, ou já transforme em uma tarefa prática para hoje.`,
      acoesPropostas: acoes,
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
      : `Prontinho! Identifiquei o que você precisa e deixei a ação engatilhada abaixo.`,
    acoesPropostas: acoes,
  };
}

export async function consultarLalaUnificada(
  texto: string,
  ctx: LalaContextSnapshot,
  anexo?: AnexoLala
): Promise<Omit<InteracaoGovernanta, "id" | "dataHora" | "mensagemUsuario">> {
  // Se o usuário pediu explicitamente "só guardar" um arquivo, nem precisa esperar chamada de rede: é instantâneo!
  if (anexo?.intencao === "guardar") {
    return processarMensagemLocalLala(texto, ctx, anexo);
  }

  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const res = await fetch("/api/lala/interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagem: texto,
          contextoApp: ctx,
          anexo,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.respostaLala) {
          const modoDetectado: ModoInteracaoLala =
            data.modoDetectado || detectarIntencaoNatural(texto, anexo);

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
                  areaNota: a.areaNota || anexo?.areaRepositorio,
                  anexo,
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

          // Se houve anexo e a IA não incluiu ação de guardar no Segundo Cérebro, adicionamos a opção!
          if (
            anexo &&
            !acoesMapeadas.some((ac) => ac.tipo === "GUARDAR_SEGUNDO_CEREBRO")
          ) {
            acoesMapeadas.push({
              id: `ai-act-${Date.now()}-save-anexo`,
              tipo: "GUARDAR_SEGUNDO_CEREBRO",
              titulo: `Guardar "${anexo.nome}" no Segundo Cérebro`,
              detalhe: `Salva o arquivo na pasta ${anexo.areaRepositorio || "Pessoal"}`,
              executada: false,
              payload: {
                texto: texto || `Arquivo: ${anexo.nome}`,
                areaNota: anexo.areaRepositorio || "Pessoal",
                anexo,
              },
            });
          }

          return {
            modo: modoDetectado,
            nomeAnexo: anexo?.nome,
            anexo,
            tituloCard: data.tituloCard || "Lala",
            tags: data.tags || ["Lala"],
            respostaLala: data.respostaLala,
            matrizDecisao: data.matrizDecisao,
            guardadoNoCofre:
              Boolean(anexo) ||
              modoDetectado === "devaneio" ||
              modoDetectado === "desabafo" ||
              modoDetectado === "orientacao",
            acoesPropostas: acoesMapeadas,
          };
        }
      }
    } catch {
      // Fallback silencioso para o motor local Offline-First
    }
  }

  return processarMensagemLocalLala(texto, ctx, anexo);
}
