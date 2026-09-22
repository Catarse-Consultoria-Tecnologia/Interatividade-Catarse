import type { PrismaClient, CardType as CardTypeT, EvidenceStrength as EvidenceStrengthT } from "@prisma/client";
import { CardType, EvidenceStrength } from "@prisma/client";

export const GAME_SLUG = "operacao-sfn";

// Chaves de zona usadas em todo o seed — mantidas como constantes para evitar
// erros de digitação ao referenciar a zona correta em cada gabarito.
const ZONE = {
  NORMATIZA: "NORMATIZA",
  SUPERVISIONA: "SUPERVISIONA",
  OPERA: "OPERA",
  INVESTIGACAO: "EM_INVESTIGACAO",
} as const;

export interface SeedResult {
  gameId: string;
  gameName: string;
  zones: number;
  cards: number;
  evidences: number;
  badges: number;
  scenarioTitle: string;
}

/**
 * Popula (ou repopula do zero) o conteúdo do jogo "Operação SFN — Quem Faz o Quê?".
 * Idempotente: remove o Game anterior (e tudo em cascata) antes de recriar, então pode
 * rodar em qualquer ambiente sem duplicar dados. Compartilhado entre `prisma db seed`
 * (local) e a rota administrativa `/api/admin/seed` (produção, onde este sandbox não
 * alcança o Postgres diretamente para rodar `prisma db seed` na mão).
 *
 * Sessions não têm cascade a partir de Game (de propósito, pra deletar um Game sozinho
 * nunca apagar salas por acidente) — então re-popular o conteúdo apaga também as salas
 * já criadas para este jogo (e tudo dentro delas: participantes, respostas, pontuação).
 * Aceitável aqui porque este endpoint é só pra atualizar conteúdo, não pra preservar
 * histórico de salas.
 */
export async function seedOperacaoSFN(prisma: PrismaClient): Promise<SeedResult> {
  const existing = await prisma.game.findUnique({ where: { slug: GAME_SLUG } });
  if (existing) {
    await prisma.session.deleteMany({ where: { gameId: existing.id } });
    // CardAnswer.zoneId não tem cascade a partir de Zone: se o Game for apagado direto,
    // o Postgres tenta apagar as Zones (cascade de Game) antes das CardAnswers terem sido
    // removidas (cascade de Game -> Card -> CardAnswer), e o FK barra a operação. Apagando
    // as Cards primeiro, suas CardAnswers já saem do caminho antes da Zone ser tocada.
    await prisma.card.deleteMany({ where: { gameId: existing.id } });
  }
  await prisma.game.deleteMany({ where: { slug: GAME_SLUG } });

  const game = await prisma.game.create({
    data: {
      slug: GAME_SLUG,
      name: "Operação SFN — Quem Faz o Quê?",
      description:
        "Dinâmica investigativa multiplayer em que a turma reconstrói o mapa de responsabilidades " +
        "do Sistema Financeiro Nacional: quem faz, quem autoriza, quem supervisiona e qual evidência comprova.",
      version: "1.0",
      status: "PUBLISHED",
    },
  });

  const zones = await Promise.all([
    prisma.zone.create({
      data: {
        gameId: game.id,
        key: ZONE.NORMATIZA,
        name: "Normatiza",
        subtitle: "Define as regras do jogo",
        description: "Estabelece diretrizes e normas gerais.",
        order: 1,
        color: "info",
      },
    }),
    prisma.zone.create({
      data: {
        gameId: game.id,
        key: ZONE.SUPERVISIONA,
        name: "Supervisiona",
        subtitle: "Verifica se o jogo está sendo jogado corretamente",
        description:
          "Autoriza, acompanha, fiscaliza e aplica medidas dentro das respectivas competências.",
        order: 2,
        color: "gold",
      },
    }),
    prisma.zone.create({
      data: {
        gameId: game.id,
        key: ZONE.OPERA,
        name: "Opera",
        subtitle: "Faz o jogo acontecer",
        description: "Executa atividades, oferece produtos, serviços ou infraestrutura ao mercado.",
        order: 3,
        color: "confirm",
      },
    }),
    prisma.zone.create({
      data: {
        gameId: game.id,
        key: ZONE.INVESTIGACAO,
        name: "Em investigação",
        subtitle: "Ainda não existem evidências suficientes",
        description:
          "Zona obrigatória: um profissional não deve ser forçado a concluir quando as evidências ainda são insuficientes.",
        order: 4,
        isFallback: true,
        color: "navy",
      },
    }),
  ]);
  const zoneByKey = Object.fromEntries(zones.map((z) => [z.key, z]));

  type ClueSeed = { title: string; text: string };
  type CardSeed = {
    key: string;
    title: string;
    subtitle?: string;
    description: string;
    cardType: CardTypeT;
    order: number;
    correctZone: string;
    score?: number;
    acceptsInsufficientAsCorrect?: boolean;
    answerTechnicalNote?: string;
    technicalNote?: string;
    clues: ClueSeed[];
    // Chaves de Evidence (ver `evidences` abaixo) que comprovam esta carta na Rodada 3.
    // Vazio de propósito nas cartas-conceito: nenhuma evidência do pool prova sozinha
    // uma conclusão ali — é exatamente a lição que essas cartas ensinam.
    evidenceKeys?: string[];
  };

  const cards: CardSeed[] = [
    // --- Órgãos e entidades ---------------------------------------------
    {
      key: "CMN",
      title: "CMN",
      subtitle: "Conselho Monetário Nacional",
      description: "Nome citado com frequência sempre que se fala em moeda, crédito e regras do sistema.",
      cardType: CardType.ENTITY,
      order: 1,
      correctZone: ZONE.NORMATIZA,
      clues: [
        {
          title: "Nova evidência recebida",
          text:
            "Não atendo clientes. Não processo Pix. Não aprovo propostas de crédito. " +
            "Estabeleço diretrizes gerais relacionadas à moeda e ao crédito.",
        },
      ],
      evidenceKeys: ["resolucao_cmn"],
    },
    {
      key: "BCB",
      title: "BCB",
      subtitle: "Banco Central do Brasil",
      description: "Nome que aparece em quase todo produto financeiro, de contas a Pix.",
      cardType: CardType.ENTITY,
      order: 2,
      correctZone: ZONE.SUPERVISIONA,
      clues: [
        {
          title: "Nova evidência recebida",
          text:
            "Autorizo e acompanho instituições dentro da minha competência. Fiscalizo regras. " +
            "Posso adotar medidas quando problemas relevantes são encontrados.",
        },
      ],
      evidenceKeys: ["consulta_bcb"],
    },
    {
      key: "CVM",
      title: "CVM",
      subtitle: "Comissão de Valores Mobiliários",
      description: "Aparece quando o assunto é investimento, oferta ou negociação de valores mobiliários.",
      cardType: CardType.ENTITY,
      order: 3,
      correctZone: ZONE.SUPERVISIONA,
      technicalNote: "Não confundir com o CADE: CADE é defesa da concorrência, não supervisor do SFN.",
      clues: [
        {
          title: "Nova evidência recebida",
          text:
            "Minha atuação está ligada ao mercado de valores mobiliários, ofertas, negociação e " +
            "participantes desse mercado.",
        },
      ],
      evidenceKeys: ["consulta_cvm"],
    },
    {
      key: "SUSEP",
      title: "SUSEP",
      subtitle: "Superintendência de Seguros Privados",
      description: "Aparece quando o assunto é seguro, previdência aberta, capitalização ou resseguro.",
      cardType: CardType.ENTITY,
      order: 4,
      correctZone: ZONE.SUPERVISIONA,
      clues: [
        {
          title: "Nova evidência recebida",
          text: "Superviso seguros, previdência complementar aberta, capitalização e resseguro.",
        },
      ],
      evidenceKeys: ["consulta_susep"],
    },
    {
      key: "PREVIC",
      title: "PREVIC",
      subtitle: "Superintendência Nacional de Previdência Complementar",
      description: "Aparece quando o assunto é previdência complementar fechada.",
      cardType: CardType.ENTITY,
      order: 5,
      correctZone: ZONE.SUPERVISIONA,
      clues: [
        {
          title: "Nova evidência recebida",
          text: "Superviso entidades fechadas de previdência complementar e seus planos.",
        },
      ],
      evidenceKeys: ["consulta_previc"],
    },
    {
      key: "FGC",
      title: "FGC",
      subtitle: "Fundo Garantidor de Créditos",
      description: "Aparece quando o assunto é proteção de depósitos e créditos elegíveis.",
      cardType: CardType.ENTITY,
      order: 6,
      correctZone: ZONE.OPERA,
      answerTechnicalNote:
        "Nuance importante (RN-005): o FGC não é um operador de mercado comum, nem normatiza, " +
        "nem supervisiona instituições. Ele administra e executa um mecanismo de proteção — por isso, " +
        "neste jogo, sua função de destaque é 'opera'.",
      clues: [
        {
          title: "Nova evidência recebida",
          text:
            "Sou uma entidade privada, sem fins lucrativos. Administro mecanismos de proteção para " +
            "determinados créditos e depósitos elegíveis em instituições associadas. Não crio regras " +
            "gerais do sistema nem fiscalizo instituições.",
        },
      ],
      evidenceKeys: ["regulamento"],
    },
    // --- Tipos de instituição (exemplos reais, para falar com propriedade) ------------
    {
      key: "BANCO",
      title: "Itaú Unibanco",
      subtitle: "Banco Múltiplo",
      description:
        "Um dos maiores bancos do país — conta, cartão, crédito e investimento, tudo na mesma instituição.",
      cardType: CardType.INSTITUTION_TYPE,
      order: 7,
      correctZone: ZONE.OPERA,
      clues: [
        {
          title: "Nova evidência recebida",
          text:
            "Posso captar depósitos conforme autorização e conceder crédito dentro da minha carteira. " +
            "Sou 'múltiplo' porque reúno diferentes carteiras autorizadas numa mesma instituição — " +
            "é assim que ofereço conta, cartão e crédito ao mesmo tempo.",
        },
      ],
      evidenceKeys: ["consulta_bcb", "razao_social"],
    },
    {
      key: "SCFI",
      title: "Crefisa",
      subtitle: "SCFI — Sociedade de Crédito, Financiamento e Investimento",
      description: "Financeira tradicional, conhecida por crédito consignado e financiamento ao consumidor.",
      cardType: CardType.INSTITUTION_TYPE,
      order: 8,
      correctZone: ZONE.OPERA,
      clues: [
        {
          title: "Nova evidência recebida",
          text:
            "Tenho funding próprio e formas de captação permitidas. Sou forte em crédito ao consumidor " +
            "e financiamento de bens — no mercado, esse tipo de instituição é popularmente chamado de " +
            "'financeira'.",
        },
      ],
      evidenceKeys: ["consulta_bcb", "contrato"],
    },
    {
      key: "SCD",
      title: "Creditas",
      subtitle: "SCD — Sociedade de Crédito Direto",
      description: "Fintech conhecida por empréstimo com garantia (imóvel, veículo), autorizada pelo BCB.",
      cardType: CardType.INSTITUTION_TYPE,
      order: 9,
      correctZone: ZONE.OPERA,
      clues: [
        {
          title: "Nova evidência recebida",
          text:
            "Concedo operações de crédito por plataforma eletrônica com enquadramento institucional " +
            "próprio — não dependo de um banco parceiro para originar o crédito.",
        },
      ],
      evidenceKeys: ["consulta_bcb", "cedula_credito"],
    },
    {
      key: "SEP",
      title: "Nexoos",
      subtitle: "SEP — Sociedade de Empréstimo entre Pessoas",
      description: "Plataforma de empréstimo peer-to-peer autorizada pelo BCB: conecta credor e tomador.",
      cardType: CardType.INSTITUTION_TYPE,
      order: 10,
      correctZone: ZONE.OPERA,
      clues: [
        {
          title: "Nova evidência recebida",
          text:
            "Aproximo credores e tomadores em operações de empréstimo entre pessoas — cada operação " +
            "tem um credor identificável, que não sou eu.",
        },
      ],
      evidenceKeys: ["consulta_bcb", "cet"],
    },
    {
      key: "IP",
      title: "PicPay",
      subtitle: "IP — Instituição de Pagamento",
      description: "App de pagamentos usado por milhões de brasileiros para Pix, cartão e carteira digital.",
      cardType: CardType.INSTITUTION_TYPE,
      order: 11,
      correctZone: ZONE.OPERA,
      technicalNote:
        "Instituição de pagamento não é automaticamente instituição financeira: a autorização para " +
        "serviços de pagamento não autoriza, por si só, empréstimos e financiamentos.",
      clues: [
        {
          title: "Nova evidência recebida",
          text:
            "Mantenho contas de pagamento e processo transações, mas não posso, só por isso, " +
            "conceder crédito livremente — pra isso, preciso de outro enquadramento.",
        },
      ],
      evidenceKeys: ["consulta_bcb", "termos_conta"],
    },
    {
      key: "CORRETORA",
      title: "XP Investimentos",
      subtitle: "Corretora / Distribuidora",
      description: "Uma das maiores corretoras do país — referência em ações, fundos e outros investimentos.",
      cardType: CardType.INSTITUTION_TYPE,
      order: 12,
      correctZone: ZONE.OPERA,
      clues: [
        {
          title: "Nova evidência recebida",
          text:
            "Atuo na intermediação e distribuição de valores mobiliários e produtos de investimento " +
            "para meus clientes.",
        },
      ],
      evidenceKeys: ["consulta_cvm", "termo_adesao"],
    },
    {
      key: "SEGURADORA",
      title: "Porto Seguro",
      subtitle: "Seguradora",
      description: "Uma das seguradoras mais conhecidas do país — apólices de auto, residência e outros ramos.",
      cardType: CardType.INSTITUTION_TYPE,
      order: 13,
      correctZone: ZONE.OPERA,
      clues: [
        {
          title: "Nova evidência recebida",
          text: "Assumo o risco segurado e respondo pela apólice emitida ao segurado.",
        },
      ],
      evidenceKeys: ["consulta_susep", "apolice"],
    },
    // --- Conceitos especiais ---------------------------------------------
    {
      key: "FINTECH",
      title: "Fintech",
      description: "Termo usado por várias empresas diferentes — Nubank, C6 Bank, PicPay... Onde pertence?",
      cardType: CardType.CONCEPT,
      order: 14,
      correctZone: ZONE.INVESTIGACAO,
      acceptsInsufficientAsCorrect: true,
      answerTechnicalNote:
        "'Fintech' descreve uma característica ou modelo de negócio. Sozinha, a palavra não identifica " +
        "CNPJ, autorização, atividade, contraparte ou supervisor. Para classificar corretamente, " +
        "investigue a entidade.",
      clues: [
        {
          title: "Nova evidência recebida",
          text:
            "Descrevo uma característica ou modelo de negócio baseado em tecnologia — pense em nomes " +
            "como Nubank ou C6 Bank. Sozinha, minha palavra não identifica CNPJ, autorização, " +
            "atividade, contraparte ou supervisor.",
        },
      ],
    },
    {
      key: "MARCA",
      title: "Marca comercial",
      description: "É o nome que o cliente vê na tela do app — como 'Nubank' ou 'PicPay'.",
      cardType: CardType.CONCEPT,
      order: 15,
      correctZone: ZONE.INVESTIGACAO,
      acceptsInsufficientAsCorrect: true,
      answerTechnicalNote: "Marca ≠ CNPJ ≠ contrato ≠ autorização.",
      clues: [
        {
          title: "Nova evidência recebida",
          text:
            "Sou apenas o nome apresentado ao cliente na tela. Por trás de mim pode haver uma ou " +
            "várias entidades diferentes.",
        },
      ],
    },
    {
      key: "PRESTADOR_TECH",
      title: "Prestador tecnológico",
      description: "Fica nos bastidores da experiência digital.",
      cardType: CardType.CONCEPT,
      order: 16,
      correctZone: ZONE.OPERA,
      technicalNote:
        "Forneço infraestrutura sob contrato, mas a responsabilidade regulatória do serviço financeiro " +
        "continua sendo da instituição contratante (terceirização não transfere responsabilidade).",
      clues: [
        {
          title: "Nova evidência recebida",
          text:
            "Forneço tecnologia ou infraestrutura sob contrato para uma instituição financeira, mas a " +
            "responsabilidade regulatória do serviço financeiro continua sendo da instituição contratante.",
        },
      ],
      evidenceKeys: ["contrato"],
    },
    // --- Casos --------------------------------------------------------------
    {
      key: "NUBANK",
      title: "Nubank",
      subtitle: "Conta · Pix · Crédito · Investimentos · Seguro",
      description: "Um único aplicativo, muitos serviços. Quantas entidades existem por trás dele?",
      cardType: CardType.CASE,
      order: 17,
      correctZone: ZONE.INVESTIGACAO,
      acceptsInsufficientAsCorrect: true,
      answerTechnicalNote:
        "Ainda não conseguimos identificar quem concede o crédito só com o nome da marca. " +
        "A investigação completa acontece no Dossiê #002 — Nubank.",
      clues: [
        {
          title: "Nova evidência recebida",
          text: "\"Nubank\" é apenas a marca apresentada ao cliente.",
        },
      ],
    },
  ];

  for (const c of cards) {
    const zone = zoneByKey[c.correctZone];
    if (!zone) throw new Error(`Zona não encontrada: ${c.correctZone}`);

    const card = await prisma.card.create({
      data: {
        gameId: game.id,
        key: c.key,
        title: c.title,
        subtitle: c.subtitle,
        description: c.description,
        cardType: c.cardType,
        technicalNote: c.technicalNote,
        order: c.order,
        answer: {
          create: {
            zoneId: zone.id,
            score: c.score ?? 100,
            acceptsInsufficientAsCorrect: c.acceptsInsufficientAsCorrect ?? false,
            technicalNote: c.answerTechnicalNote,
            correctEvidenceKeys: c.evidenceKeys ?? [],
          },
        },
      },
    });

    for (const [i, clue] of c.clues.entries()) {
      await prisma.clue.create({
        data: {
          cardId: card.id,
          order: i + 1,
          title: clue.title,
          text: clue.text,
        },
      });
    }
  }

  type EvidenceSeed = { key: string; title: string; description: string; strength: EvidenceStrengthT };
  const evidences: EvidenceSeed[] = [
    // Fortes — comprovam diretamente o elemento investigado. Descrições em primeira pessoa,
    // no mesmo tom das pistas: o documento "falando" sobre o que ele prova e não prova.
    { key: "razao_social", title: "Razão social", description: "Sou o nome jurídico oficial por trás da marca — o que está escrito no CNPJ, não na tela do app.", strength: EvidenceStrength.STRONG },
    { key: "resolucao_cmn", title: "Resolução do CMN", description: "Sou uma norma publicada pelo Conselho Monetário Nacional. Se você me encontrar assinando algo, é o CMN que está por trás.", strength: EvidenceStrength.STRONG },
    { key: "cnpj", title: "CNPJ", description: "Sou o número que identifica exatamente qual pessoa jurídica responde por essa operação — nenhuma outra.", strength: EvidenceStrength.STRONG },
    { key: "contrato", title: "Contrato", description: "Sou o documento que formaliza, com detalhes, a relação entre o cliente e a instituição responsável.", strength: EvidenceStrength.STRONG },
    { key: "cedula_credito", title: "Cédula de crédito", description: "Sou o título que nomeia, por escrito, quem é a credora desta operação de crédito.", strength: EvidenceStrength.STRONG },
    { key: "apolice", title: "Apólice", description: "Sou o documento que identifica, sem ambiguidade, qual seguradora responde pela cobertura contratada.", strength: EvidenceStrength.STRONG },
    { key: "consulta_bcb", title: "Consulta oficial do BCB", description: "Sou uma consulta pública: confirmo se uma instituição está mesmo autorizada a funcionar pelo Banco Central.", strength: EvidenceStrength.STRONG },
    { key: "consulta_cvm", title: "Consulta da CVM", description: "Sou uma consulta pública ao cadastro de quem pode operar no mercado de valores mobiliários, segundo a CVM.", strength: EvidenceStrength.STRONG },
    { key: "consulta_susep", title: "Consulta SUSEP", description: "Sou uma consulta pública: mostro se uma seguradora ou entidade está mesmo registrada na SUSEP.", strength: EvidenceStrength.STRONG },
    { key: "consulta_previc", title: "Consulta PREVIC", description: "Sou uma consulta pública ao cadastro de entidades fechadas de previdência complementar, segundo a PREVIC.", strength: EvidenceStrength.STRONG },
    // Complementares — ajudam a construir a conclusão, mas não bastam sozinhas.
    { key: "cet", title: "CET", description: "Mostro o Custo Efetivo Total de uma operação de crédito — ajudo a entender o custo, mas não digo sozinho quem é o credor.", strength: EvidenceStrength.COMPLEMENTARY },
    { key: "termos_conta", title: "Termos da conta", description: "Trago as condições gerais da conta oferecida ao cliente — útil, mas preciso de outro documento pra confirmar quem responde por ela.", strength: EvidenceStrength.COMPLEMENTARY },
    { key: "fatura", title: "Fatura", description: "Sou a cobrança periódica que chega pro cliente, por exemplo de um cartão — indico uso, não necessariamente quem concede o crédito.", strength: EvidenceStrength.COMPLEMENTARY },
    { key: "regulamento", title: "Regulamento", description: "Reúno as regras que regem um produto ou serviço — leia-me com atenção, tenho detalhes que a propaganda não conta.", strength: EvidenceStrength.COMPLEMENTARY },
    { key: "termo_adesao", title: "Termo de adesão", description: "Sou o documento de aceite às condições de um produto de investimento — confirmo adesão, mais do que responsabilidade final.", strength: EvidenceStrength.COMPLEMENTARY },
    { key: "politica_privacidade", title: "Política de privacidade", description: "Descrevo como os dados pessoais são tratados — informo bastante, mas não sobre quem responde financeiramente.", strength: EvidenceStrength.COMPLEMENTARY },
    // Enganosas — não sustentam sozinhas uma conclusão institucional.
    { key: "logotipo", title: "Logotipo", description: "Sou a identidade visual que o cliente vê primeiro — bonito, mas não provo absolutamente nada sozinho.", strength: EvidenceStrength.DECOY },
    { key: "cor_app", title: "Cor do aplicativo", description: "Sou só uma paleta de cores na tela do aplicativo. Reconhecível, sim. Prova jurídica, não.", strength: EvidenceStrength.DECOY },
    { key: "nome_fantasia", title: "Nome fantasia", description: "Sou o nome comercial que todo mundo usa no dia a dia — mas nunca me confunda com a razão social.", strength: EvidenceStrength.DECOY },
    { key: "publicidade", title: "Publicidade", description: "Sou uma peça de comunicação, feita pra convencer, não pra comprovar responsabilidade institucional.", strength: EvidenceStrength.DECOY },
    { key: "influenciador", title: "Influenciador", description: "Divulguei esse produto nas redes sociais. Isso me torna simpático — não me torna prova de nada.", strength: EvidenceStrength.DECOY },
    { key: "descricao_loja", title: "Descrição na loja de aplicativos", description: "Sou o texto que aparece na App Store ou Play Store. Escrito por quem quer vender, não por quem regula.", strength: EvidenceStrength.DECOY },
  ];
  for (const e of evidences) {
    await prisma.evidence.create({ data: { gameId: game.id, ...e } });
  }
  const evidenceByKey = Object.fromEntries(
    (await prisma.evidence.findMany({ where: { gameId: game.id } })).map((ev) => [ev.key, ev]),
  );

  const scenario = await prisma.scenario.create({
    data: {
      gameId: game.id,
      key: "dossie-nubank",
      title: "DOSSIÊ #002 — NUBANK",
      description:
        "O Nubank é um único aplicativo — conta, Pix, cartão, crédito, investimentos e seguro, tudo " +
        "numa tela só. Mas quantas empresas diferentes existem de fato por trás dessa experiência?",
      order: 1,
      documents: {
        create: [
          {
            order: 1,
            key: "doc-a",
            title: "Documento A — Nu Pagamentos S.A.",
            text:
              "Instituição de pagamento autorizada pelo Banco Central. Opera a conta digital, o cartão " +
              "pré-pago e as transferências via Pix.",
          },
          {
            order: 2,
            key: "doc-b",
            title: "Documento B — Nu Financeira S.A. CFI",
            text:
              "Sociedade de Crédito, Financiamento e Investimento autorizada pelo Banco Central. O " +
              "contrato de empréstimo identifica essa instituição como credora.",
          },
          {
            order: 3,
            key: "doc-c",
            title: "Documento C — Nu Invest Corretora de Valores S.A.",
            text: "Corretora de valores mobiliários regulada pela CVM. Distribui os produtos de investimento oferecidos dentro do app.",
          },
          {
            order: 4,
            key: "doc-d",
            title: "Documento D — Parceria de seguros",
            text:
              "O app oferece produtos de seguro, mas a documentação disponível não identifica com " +
              "clareza qual seguradora responde pela apólice.",
          },
        ],
      },
      items: {
        create: [
          {
            order: 1,
            service: "Conta",
            expectedResponsavel: "Nu Pagamentos S.A.",
            expectedTipo: "Instituição de Pagamento",
            expectedSupervisor: "Banco Central do Brasil (BCB)",
            expectedEvidenceKey: evidenceByKey["razao_social"]?.key,
            insufficientIsValid: false,
          },
          {
            order: 2,
            service: "Pix",
            expectedResponsavel: "Nu Pagamentos S.A.",
            expectedTipo: "Instituição de pagamento participante do arranjo Pix",
            expectedSupervisor: "Banco Central do Brasil (BCB)",
            expectedEvidenceKey: evidenceByKey["consulta_bcb"]?.key,
            // O dossiê não confirma 100% (mesma conta, mas sem documento explícito pro Pix) —
            // por isso "insuficiente" também é aceito como resposta correta pra esta linha.
            insufficientIsValid: true,
          },
          {
            order: 3,
            service: "Cartão",
            expectedResponsavel: "Mais de uma entidade (emissor, bandeira e processadora)",
            expectedTipo: "Emissor de cartão + arranjo de pagamento",
            expectedSupervisor: "Banco Central do Brasil (BCB)",
            expectedEvidenceKey: null,
            insufficientIsValid: true,
          },
          {
            order: 4,
            service: "Crédito",
            expectedResponsavel: "Nu Financeira S.A. CFI",
            expectedTipo: "SCFI (Sociedade de Crédito, Financiamento e Investimento)",
            expectedSupervisor: "Banco Central do Brasil (BCB)",
            expectedEvidenceKey: evidenceByKey["cedula_credito"]?.key,
            insufficientIsValid: false,
          },
          {
            order: 5,
            service: "Investimento",
            expectedResponsavel: "Nu Invest Corretora de Valores S.A.",
            expectedTipo: "Corretora/Distribuidora de valores mobiliários",
            expectedSupervisor: "CVM",
            expectedEvidenceKey: evidenceByKey["termo_adesao"]?.key,
            insufficientIsValid: false,
          },
          {
            order: 6,
            service: "Seguro",
            // Lacuna deliberada: o dossiê não traz uma seguradora identificável — é o gancho
            // pra fechar a atividade puxando o gancho pro conteúdo dos próximos slides.
            expectedResponsavel: "Não é possível determinar com os documentos disponíveis",
            expectedTipo: "Não é possível determinar com os documentos disponíveis",
            expectedSupervisor: "Não sei ainda",
            expectedEvidenceKey: null,
            insufficientIsValid: true,
          },
        ],
      },
    },
  });

  const badges = [
    { key: "investigador-evidencias", title: "Investigador orientado por evidências", description: "Fundamentou a maioria das conclusões em evidências fortes." },
    { key: "melhor-leitura", title: "Melhor leitura institucional", description: "Teve a maior taxa de classificações corretas da turma." },
    { key: "melhor-evidencias", title: "Melhor uso de evidências", description: "Associou as evidências mais adequadas às suas conclusões." },
    { key: "investigador-cauteloso", title: "Investigador cauteloso", description: "Reconheceu corretamente quando a informação ainda era insuficiente." },
    { key: "maior-evolucao", title: "Maior evolução durante a missão", description: "Mais reviu hipóteses de forma fundamentada após novas pistas." },
    { key: "mapa-completo", title: "Mapa mais completo", description: "Concluiu a investigação com o maior número de cartas classificadas." },
  ];
  for (const b of badges) {
    await prisma.badge.create({ data: { gameId: game.id, ...b } });
  }

  return {
    gameId: game.id,
    gameName: game.name,
    zones: zones.length,
    cards: cards.length,
    evidences: evidences.length,
    badges: badges.length,
    scenarioTitle: scenario.title,
  };
}
