import { PrismaClient, CardType, EvidenceStrength } from "@prisma/client";

const prisma = new PrismaClient();

const GAME_SLUG = "operacao-sfn";

// Chaves de zona usadas em todo o seed — mantidas como constantes para evitar
// erros de digitação ao referenciar a zona correta em cada gabarito.
const ZONE = {
  NORMATIZA: "NORMATIZA",
  SUPERVISIONA: "SUPERVISIONA",
  OPERA: "OPERA",
  INVESTIGACAO: "EM_INVESTIGACAO",
} as const;

async function main() {
  console.log(`Removendo dados antigos do jogo "${GAME_SLUG}" (se existirem)...`);
  await prisma.game.deleteMany({ where: { slug: GAME_SLUG } });

  console.log("Criando jogo Operação SFN — Quem Faz o Quê?...");
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

  console.log("Criando zonas do tabuleiro...");
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

  console.log("Criando cartas, gabaritos e pistas...");

  type ClueSeed = { title: string; text: string };
  type CardSeed = {
    key: string;
    title: string;
    subtitle?: string;
    description: string;
    cardType: CardType;
    order: number;
    correctZone: string;
    score?: number;
    acceptsInsufficientAsCorrect?: boolean;
    answerTechnicalNote?: string;
    technicalNote?: string;
    clues: ClueSeed[];
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
    },
    // --- Tipos de instituição ---------------------------------------------
    {
      key: "BANCO",
      title: "Banco Comercial / Múltiplo",
      description: "Um dos nomes mais conhecidos do mercado financeiro.",
      cardType: CardType.INSTITUTION_TYPE,
      order: 7,
      correctZone: ZONE.OPERA,
      clues: [
        {
          title: "Nova evidência recebida",
          text:
            "Posso captar depósitos conforme autorização e conceder crédito dentro da minha carteira. " +
            "Quando sou 'múltiplo', reúno diferentes carteiras autorizadas em uma mesma instituição.",
        },
      ],
    },
    {
      key: "SCFI",
      title: "SCFI",
      subtitle: "Sociedade de Crédito, Financiamento e Investimento",
      description: "Conhecida no mercado popularmente como 'financeira'.",
      cardType: CardType.INSTITUTION_TYPE,
      order: 8,
      correctZone: ZONE.OPERA,
      clues: [
        {
          title: "Nova evidência recebida",
          text:
            "Tenho funding próprio e formas de captação permitidas. Sou forte em crédito ao consumidor " +
            "e financiamento de bens.",
        },
      ],
    },
    {
      key: "SCD",
      title: "SCD",
      subtitle: "Sociedade de Crédito Direto",
      description: "Uma das siglas mais citadas quando o assunto é fintech de crédito.",
      cardType: CardType.INSTITUTION_TYPE,
      order: 9,
      correctZone: ZONE.OPERA,
      clues: [
        {
          title: "Nova evidência recebida",
          text:
            "Concedo determinadas operações de crédito por plataforma eletrônica e possuo " +
            "enquadramento institucional próprio.",
        },
      ],
    },
    {
      key: "SEP",
      title: "SEP",
      subtitle: "Sociedade de Empréstimo entre Pessoas",
      description: "Outra sigla comum entre fintechs de crédito.",
      cardType: CardType.INSTITUTION_TYPE,
      order: 10,
      correctZone: ZONE.OPERA,
      clues: [
        {
          title: "Nova evidência recebida",
          text: "Aproximo credores e tomadores em operações de empréstimo entre pessoas.",
        },
      ],
    },
    {
      key: "IP",
      title: "Instituição de Pagamento",
      subtitle: "IP",
      description: "Onde vivem contas de pagamento, cartões pré-pagos e boa parte do Pix.",
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
            "conceder crédito livremente.",
        },
      ],
    },
    {
      key: "CORRETORA",
      title: "Corretora / Distribuidora",
      description: "Aparece quando o assunto é comprar ações, fundos ou outros investimentos.",
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
    },
    {
      key: "SEGURADORA",
      title: "Seguradora",
      description: "Aparece quando o assunto é apólice, sinistro e cobertura.",
      cardType: CardType.INSTITUTION_TYPE,
      order: 13,
      correctZone: ZONE.OPERA,
      clues: [
        {
          title: "Nova evidência recebida",
          text: "Assumo o risco segurado e respondo pela apólice emitida ao segurado.",
        },
      ],
    },
    // --- Conceitos especiais ---------------------------------------------
    {
      key: "FINTECH",
      title: "Fintech",
      description: "Onde pertence?",
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
            "Descrevo uma característica ou modelo de negócio baseado em tecnologia. Sozinha, minha " +
            "palavra não identifica CNPJ, autorização, atividade, contraparte ou supervisor.",
        },
      ],
    },
    {
      key: "MARCA",
      title: "Marca comercial",
      description: "É o nome que o cliente vê na tela do aplicativo.",
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
    },
    // --- Casos --------------------------------------------------------------
    {
      key: "AURORA",
      title: "AURORA",
      subtitle: "Conta · Pix · Crédito · Investimentos · Seguro",
      description: "Um único aplicativo, muitos serviços. Quantas entidades existem por trás dele?",
      cardType: CardType.CASE,
      order: 17,
      correctZone: ZONE.INVESTIGACAO,
      acceptsInsufficientAsCorrect: true,
      answerTechnicalNote:
        "Ainda não conseguimos identificar quem concede o crédito só com o nome da marca. " +
        "A investigação completa acontece no Dossiê #002 — Aurora.",
      clues: [
        {
          title: "Nova evidência recebida",
          text: "\"Aurora\" é apenas a marca apresentada ao cliente.",
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

  console.log("Criando mesa de evidências...");
  type EvidenceSeed = { key: string; title: string; description: string; strength: EvidenceStrength };
  const evidences: EvidenceSeed[] = [
    // Fortes — comprovam diretamente o elemento investigado.
    { key: "razao_social", title: "Razão social", description: "Identificação jurídica formal da instituição.", strength: EvidenceStrength.STRONG },
    { key: "cnpj", title: "CNPJ", description: "Número de identificação da pessoa jurídica responsável.", strength: EvidenceStrength.STRONG },
    { key: "contrato", title: "Contrato", description: "Documento que formaliza a relação entre cliente e instituição.", strength: EvidenceStrength.STRONG },
    { key: "cedula_credito", title: "Cédula de crédito", description: "Título que identifica a instituição credora da operação.", strength: EvidenceStrength.STRONG },
    { key: "apolice", title: "Apólice", description: "Documento que identifica a seguradora responsável pela cobertura.", strength: EvidenceStrength.STRONG },
    { key: "consulta_bcb", title: "Consulta oficial do BCB", description: "Consulta pública ao cadastro de instituições autorizadas pelo Banco Central.", strength: EvidenceStrength.STRONG },
    { key: "consulta_cvm", title: "Consulta da CVM", description: "Consulta pública ao cadastro de participantes do mercado de valores mobiliários.", strength: EvidenceStrength.STRONG },
    { key: "consulta_susep", title: "Consulta SUSEP", description: "Consulta pública ao cadastro de seguradoras e entidades supervisionadas pela SUSEP.", strength: EvidenceStrength.STRONG },
    { key: "consulta_previc", title: "Consulta PREVIC", description: "Consulta pública ao cadastro de entidades fechadas de previdência complementar.", strength: EvidenceStrength.STRONG },
    // Complementares — ajudam a construir a conclusão, mas não bastam sozinhas.
    { key: "cet", title: "CET", description: "Custo Efetivo Total de uma operação de crédito.", strength: EvidenceStrength.COMPLEMENTARY },
    { key: "termos_conta", title: "Termos da conta", description: "Condições gerais de uso da conta oferecida ao cliente.", strength: EvidenceStrength.COMPLEMENTARY },
    { key: "fatura", title: "Fatura", description: "Documento de cobrança periódica, por exemplo de cartão.", strength: EvidenceStrength.COMPLEMENTARY },
    { key: "regulamento", title: "Regulamento", description: "Conjunto de regras que rege um produto ou serviço.", strength: EvidenceStrength.COMPLEMENTARY },
    { key: "termo_adesao", title: "Termo de adesão", description: "Documento de aceite às condições de um produto de investimento.", strength: EvidenceStrength.COMPLEMENTARY },
    { key: "politica_privacidade", title: "Política de privacidade", description: "Documento que descreve o tratamento de dados pessoais.", strength: EvidenceStrength.COMPLEMENTARY },
    // Enganosas — não sustentam sozinhas uma conclusão institucional.
    { key: "logotipo", title: "Logotipo", description: "Identidade visual apresentada ao cliente.", strength: EvidenceStrength.DECOY },
    { key: "cor_app", title: "Cor do aplicativo", description: "Paleta visual usada na interface do aplicativo.", strength: EvidenceStrength.DECOY },
    { key: "nome_fantasia", title: "Nome fantasia", description: "Nome comercial usado para o público, distinto da razão social.", strength: EvidenceStrength.DECOY },
    { key: "publicidade", title: "Publicidade", description: "Peça de comunicação ou campanha de marketing.", strength: EvidenceStrength.DECOY },
    { key: "influenciador", title: "Influenciador", description: "Pessoa que divulga o produto nas redes sociais.", strength: EvidenceStrength.DECOY },
    { key: "descricao_loja", title: "Descrição na loja de aplicativos", description: "Texto descritivo do app na App Store ou Play Store.", strength: EvidenceStrength.DECOY },
  ];
  for (const e of evidences) {
    await prisma.evidence.create({ data: { gameId: game.id, ...e } });
  }
  const evidenceByKey = Object.fromEntries(
    (await prisma.evidence.findMany({ where: { gameId: game.id } })).map((ev) => [ev.key, ev]),
  );

  console.log("Criando cenário Dossiê #002 — Aurora...");
  const scenario = await prisma.scenario.create({
    data: {
      gameId: game.id,
      key: "dossie-aurora",
      title: "DOSSIÊ #002 — AURORA",
      description:
        "A diretoria da Aurora deseja oferecer em um único aplicativo: conta, Pix, cartão, crédito, " +
        "investimentos e seguro. Quantas entidades podem existir por trás dessa experiência?",
      order: 1,
      documents: {
        create: [
          {
            order: 1,
            key: "doc-a",
            title: "Documento A — Aurora Pagamentos S.A.",
            text: "Atua na estrutura da conta de pagamento.",
          },
          {
            order: 2,
            key: "doc-b",
            title: "Documento B — Aurora Crédito SCD S.A.",
            text: "O contrato de crédito identifica essa instituição como credora.",
          },
          {
            order: 3,
            key: "doc-c",
            title: "Documento C — Aurora Investimentos",
            text: "Serviço prestado por instituição específica relacionada ao mercado de investimentos.",
          },
          {
            order: 4,
            key: "doc-d",
            title: "Documento D — Seguro Protege S.A.",
            text: "Apólice identifica a seguradora responsável.",
          },
        ],
      },
      items: {
        create: [
          {
            order: 1,
            service: "Conta",
            expectedResponsavel: "Aurora Pagamentos S.A.",
            expectedTipo: "Instituição de Pagamento",
            expectedSupervisor: "Banco Central do Brasil (BCB)",
            expectedEvidenceKey: evidenceByKey["razao_social"]?.key,
            insufficientIsValid: false,
          },
          {
            order: 2,
            service: "Pix",
            expectedResponsavel:
              "Provavelmente Aurora Pagamentos S.A. (mesma conta), mas o dossiê não confirma isso.",
            expectedTipo: "Instituição de pagamento participante do arranjo Pix",
            expectedSupervisor: "Banco Central do Brasil (BCB)",
            expectedEvidenceKey: evidenceByKey["consulta_bcb"]?.key,
            insufficientIsValid: true,
          },
          {
            order: 3,
            service: "Cartão",
            expectedResponsavel:
              "Pode envolver mais de uma entidade: emissor, bandeira e processadora.",
            expectedTipo: "Emissor de cartão + arranjo de pagamento",
            expectedSupervisor: "Banco Central do Brasil (BCB), conforme a peça",
            expectedEvidenceKey: null,
            insufficientIsValid: true,
          },
          {
            order: 4,
            service: "Crédito",
            expectedResponsavel: "Aurora Crédito SCD S.A.",
            expectedTipo: "SCD (Sociedade de Crédito Direto)",
            expectedSupervisor: "Banco Central do Brasil (BCB)",
            expectedEvidenceKey: evidenceByKey["cedula_credito"]?.key,
            insufficientIsValid: false,
          },
          {
            order: 5,
            service: "Investimento",
            expectedResponsavel: "Aurora Investimentos",
            expectedTipo: "Corretora/Distribuidora de valores mobiliários",
            expectedSupervisor: "CVM",
            expectedEvidenceKey: evidenceByKey["termo_adesao"]?.key,
            insufficientIsValid: false,
          },
          {
            order: 6,
            service: "Seguro",
            expectedResponsavel: "Seguro Protege S.A.",
            expectedTipo: "Seguradora",
            expectedSupervisor: "SUSEP",
            expectedEvidenceKey: evidenceByKey["apolice"]?.key,
            insufficientIsValid: false,
          },
        ],
      },
    },
  });

  console.log("Criando distintivos...");
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

  console.log(`Concluído. Jogo "${game.name}" (${game.id}) pronto com:`);
  console.log(`  - ${zones.length} zonas`);
  console.log(`  - ${cards.length} cartas`);
  console.log(`  - ${evidences.length} evidências`);
  console.log(`  - 1 cenário (${scenario.title}) com 4 documentos e 6 linhas de matriz`);
  console.log(`  - ${badges.length} distintivos`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
