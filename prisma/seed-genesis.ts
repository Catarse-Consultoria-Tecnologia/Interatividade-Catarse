import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GAME_SLUG = "operacao-genesis";

interface OptionSeed {
  text: string;
  isCorrect?: boolean;
}

interface QuestionSeed {
  prompt: string;
  explanation: string;
  options: OptionSeed[];
}

interface StageSeed {
  key: string;
  title: string;
  narrative: string;
  scriptLabel?: string;
  script?: string;
  questions: QuestionSeed[];
}

// Conteúdo pedagógico da Operação Gênesis (Módulo 4 — Fundamentos de Dados e
// Bancos de Dados / SQL / Azure SQL Database), validado com o cliente.
// O portal entrega apenas a história e os scripts para o aluno copiar e rodar
// no VS Code (extensão "SQL Server (mssql)") contra o Azure SQL Database real
// da Catarse — o progresso é medido por acerto nas questões de cada etapa,
// não por auditoria do SQL de fato executado no Azure.
const STAGES: StageSeed[] = [
  {
    key: "fundacao-ddl",
    title: "Etapa 1 — Fundação (DDL)",
    narrative:
      "Você foi contratado(a) como Engenheiro(a) de Dados Júnior da Horizonte Crédito, fintech que migrou sua " +
      "base para o Azure SQL Database. A squad anterior criou as tabelas Garantia e ContratoParticipante no seu " +
      "schema (lab_alunoNN, dentro do banco real CATARSE_FINANCEIRO) — mas sem nenhuma restrição real — e saiu " +
      "da empresa no meio do trabalho. Você recebe o script incompleto abaixo e precisa decidir o que falta " +
      "antes de rodá-lo no seu schema.",
    scriptLabel: "Script entregue pela squad anterior (incompleto, de propósito)",
    script: `CREATE TABLE Garantia (
    id_garantia     INT,
    id_proposta     INT,
    tipo_garantia   VARCHAR(20),
    valor_avaliado  FLOAT,
    data_avaliacao  VARCHAR(10),
    status          VARCHAR(20)
);

CREATE TABLE ContratoParticipante (
    id_participante  INT,
    id_proposta      INT,
    id_cliente       INT,
    papel            VARCHAR(20)
);`,
    questions: [
      {
        prompt: "Qual a consequência prática de a tabela Garantia não ter nenhuma chave primária definida?",
        explanation:
          "Sem PRIMARY KEY (tipicamente INT IDENTITY), o banco não garante unicidade nem obrigatoriedade de id_garantia — " +
          "nada impede duas linhas idênticas ou um id ausente.",
        options: [
          { text: "O Azure SQL Database recusa automaticamente a criação da tabela." },
          { text: "Nada impede inserir duas linhas com o mesmo id_garantia, ou nenhum id.", isCorrect: true },
          { text: "A tabela funciona normalmente, mas fica mais lenta para qualquer consulta." },
          { text: "Os valores de id_garantia passam a ser gerados automaticamente em sequência." },
        ],
      },
      {
        prompt: "Qual a consequência de id_proposta, em Garantia, não ter uma FOREIGN KEY para Proposta?",
        explanation:
          "Sem FOREIGN KEY, o banco não valida que o id_proposta informado exista de fato em Proposta — " +
          "a garantia pode ficar \"órfã\", apontando para nada.",
        options: [
          { text: "Impede qualquer INSERT na tabela Garantia até a constraint ser criada." },
          { text: "Faz com que id_proposta aceite apenas valores nulos." },
          { text: "Permite inserir uma garantia apontando para uma proposta que não existe.", isCorrect: true },
          { text: "Obriga a tabela Proposta a ser criada antes da tabela Garantia." },
        ],
      },
      {
        prompt: "Por que usar FLOAT para valor_avaliado (um valor em reais) é uma escolha ruim?",
        explanation:
          "FLOAT é ponto flutuante binário: representa frações decimais de forma aproximada, o que pode gerar " +
          "erro de arredondamento em dinheiro. O tipo correto para valores monetários é DECIMAL (ou NUMERIC).",
        options: [
          { text: "FLOAT ocupa mais espaço em disco do que qualquer outro tipo numérico." },
          { text: "FLOAT não aceita valores com casas decimais." },
          {
            text: "FLOAT é ponto flutuante binário: pode gerar erro de arredondamento em dinheiro; o tipo correto é DECIMAL.",
            isCorrect: true,
          },
          { text: "FLOAT exige que a coluna também tenha uma FOREIGN KEY." },
        ],
      },
      {
        prompt:
          "Qual constraint impede que a mesma pessoa apareça duas vezes com o mesmo papel na mesma proposta, em ContratoParticipante?",
        explanation:
          "UNIQUE (id_proposta, id_cliente, papel) impede a duplicata exata — mesma proposta, mesmo cliente, mesmo papel " +
          "— sem impedir, por exemplo, vários AVALISTA diferentes na mesma proposta.",
        options: [
          { text: "PRIMARY KEY (id_participante)" },
          { text: "UNIQUE (id_proposta, id_cliente, papel)", isCorrect: true },
          { text: "CHECK (papel IN ('TITULAR','AVALISTA','COOBRIGADO'))" },
          { text: "FOREIGN KEY (id_cliente) REFERENCES Cliente(id_cliente)" },
        ],
      },
      {
        prompt: "Qual a diferença entre não ter DEFAULT e ter DEFAULT na coluna status de Garantia?",
        explanation:
          "Sem DEFAULT, um INSERT que não cita status falha se a coluna for NOT NULL. Com DEFAULT, a coluna recebe " +
          "o valor padrão automaticamente quando o INSERT não a informa.",
        options: [
          { text: "DEFAULT impede que o valor da coluna seja alterado depois do INSERT." },
          {
            text: "Sem DEFAULT, um INSERT que não cita status falha se a coluna for NOT NULL; com DEFAULT, a coluna recebe o valor padrão automaticamente.",
            isCorrect: true,
          },
          { text: "Sem DEFAULT, a coluna aceita qualquer texto; com DEFAULT, só aceita os valores da lista do CHECK." },
          { text: "DEFAULT só tem efeito se a coluna também for PRIMARY KEY." },
        ],
      },
    ],
  },
  {
    key: "carga-dml",
    title: "Etapa 2 — Carga (DML)",
    narrative:
      "Um analista rodou um lote de INSERTs sem supervisão contra o schema já corrigido na Etapa 1. Parte travou " +
      "na hora — erro visível, o que chamamos de Tipo A. Parte passou calada, com dado errado — silencioso, Tipo B, " +
      "e mais perigoso. Sua tarefa é classificar cada linha do lote abaixo (as propostas PRP-0001 a PRP-0004 e os " +
      "clientes de CPF 00000000001 / 00000000002 já existem no seu schema, de aulas anteriores).",
    scriptLabel: "Lote de INSERTs rodado pelo analista (para você classificar)",
    script: `-- L1
INSERT INTO ContratoParticipante (id_proposta, id_cliente, papel)
VALUES (
  (SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0001'),
  (SELECT id_cliente FROM Cliente WHERE cpf = '00000000001'),
  'TITULAR'
);

-- L2
INSERT INTO Garantia (id_proposta, tipo_garantia, valor_avaliado, data_avaliacao, status)
VALUES (999999, 'VEICULO', 45000.00, '2024-03-01', 'EM_ANALISE');

-- L3
INSERT INTO Garantia (id_proposta, tipo_garantia, valor_avaliado, data_avaliacao, status)
VALUES (
  (SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0002'),
  'IMOVEL', 320000.00, '2099-01-01', 'APROVADA'
);

-- L4
INSERT INTO Garantia (id_proposta, tipo_garantia, valor_avaliado, data_avaliacao, status)
VALUES (
  (SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0003'),
  'VEICULO', 0.01, '2024-02-15', 'APROVADA'
);

-- L5
INSERT INTO Garantia (id_proposta, tipo_garantia, valor_avaliado, data_avaliacao, status)
VALUES (
  (SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0004'),
  'IMOVEL', 280000.00, '2024-01-20', 'CANCELADA'
);

-- L6
INSERT INTO ContratoParticipante (id_proposta, id_cliente, papel)
VALUES (
  (SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0002'),
  888888, 'AVALISTA'
);

-- L7
INSERT INTO ContratoParticipante (id_proposta, id_cliente, papel)
VALUES (
  (SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0001'),
  (SELECT id_cliente FROM Cliente WHERE cpf = '00000000002'),
  'TITULAR'
);

-- L8
INSERT INTO ContratoParticipante (id_proposta, id_cliente, papel)
VALUES (
  (SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0001'),
  (SELECT id_cliente FROM Cliente WHERE cpf = '00000000001'),
  'TITULAR'
);`,
    questions: [
      {
        prompt: "Por que a linha L2 (id_proposta = 999999, que não existe) é um erro Tipo A?",
        explanation:
          "L2 viola a FOREIGN KEY para Proposta: o banco recusa a linha e o erro aparece na tela no mesmo instante " +
          "do comando — por isso é Tipo A, visível.",
        options: [
          { text: "Porque o valor da garantia está fora do intervalo esperado." },
          { text: "Porque o erro aparece na tela no momento do comando — o banco recusou a linha.", isCorrect: true },
          { text: "Porque a coluna tipo_garantia recebeu um valor fora da lista do CHECK." },
          { text: "Porque dois clientes diferentes tentaram ocupar o mesmo papel na proposta." },
        ],
      },
      {
        prompt: "O que a linha L3 (data_avaliacao = '2099-01-01') revela sobre os limites do CHECK?",
        explanation:
          "Nenhum CHECK cobre \"data futura\" — o banco só recusa o que alguém escreveu explicitamente numa " +
          "constraint. Uma regra de negócio não declarada simplesmente não existe para ele, e a linha entra calada.",
        options: [
          { text: "Que o Azure SQL Database bloqueia automaticamente qualquer data futura." },
          { text: "Que o tipo DATE não aceita datas depois do ano corrente." },
          {
            text: "O banco só recusa o que alguém escreveu explicitamente numa constraint; uma regra de negócio não declarada não existe para ele.",
            isCorrect: true,
          },
          { text: "Que a linha será revertida automaticamente na próxima manutenção do banco." },
        ],
      },
      {
        prompt:
          "Qual constraint impediria especificamente dois TITULAR na mesma proposta (L7), sem impedir vários AVALISTA?",
        explanation:
          "A UNIQUE da Etapa 1 só bloqueia a duplicata exata de (proposta, cliente, papel) — pessoas diferentes como " +
          "TITULAR da mesma proposta passam por ela. Faltaria um CHECK ou regra extra limitando a 1 TITULAR por proposta.",
        options: [
          { text: "A UNIQUE (id_proposta, id_cliente, papel) já criada na Etapa 1." },
          {
            text: "Um CHECK ou regra extra que limite a 1 o número de linhas com papel = TITULAR por proposta — nenhuma constraint atual cobre isso.",
            isCorrect: true,
          },
          { text: "Uma FOREIGN KEY adicional de id_cliente para Cliente." },
          { text: "Transformar id_participante em PRIMARY KEY IDENTITY." },
        ],
      },
      {
        prompt: "O que acontece no L8 (repete exatamente a linha do L1) e por quê?",
        explanation:
          "L8 é idêntica a L1 em (id_proposta, id_cliente, papel): o banco recusa por violar a UNIQUE criada na Etapa 1.",
        options: [
          {
            text: "O banco aceita: duas linhas idênticas são permitidas, já que não há PRIMARY KEY nas colunas de negócio.",
          },
          { text: "O banco recusa porque id_cliente não existe." },
          {
            text: "O banco recusa: viola a UNIQUE (id_proposta, id_cliente, papel) — mesma pessoa, mesmo papel, mesma proposta.",
            isCorrect: true,
          },
          { text: "O banco aceita, mas soma automaticamente o valor da garantia." },
        ],
      },
      {
        prompt: "Qual frase resume melhor a diferença entre Tipo A e Tipo B?",
        explanation:
          "Tipo A avisa na hora; Tipo B não deixa rastro — o dado errado entra e só é descoberto quando alguém " +
          "nota o efeito dele mais adiante. Por isso Tipo B é o mais perigoso dos dois.",
        options: [
          { text: "Tipo A é mais perigoso, porque impede a aplicação de continuar funcionando." },
          {
            text: "Tipo B é mais perigoso que Tipo A, porque não deixa rastro — o dado erra e ninguém é avisado até alguém notar o efeito.",
            isCorrect: true,
          },
          { text: "Tipo A e Tipo B têm o mesmo risco, pois ambos geram uma mensagem de erro." },
          { text: "Tipo B só ocorre em tabelas sem nenhuma constraint, e Tipo A só em tabelas com PRIMARY KEY." },
        ],
      },
    ],
  },
  {
    key: "consultas-dql",
    title: "Etapa 3 — Consultas (DQL)",
    narrative:
      "A diretoria da Horizonte Crédito quer o retrato da esteira: propostas com garantia, e quem participa de " +
      "cada uma. Depois vem um pedido-armadilha — cruzar dados com o schema de outro aluno. Essa consulta foi " +
      "desenhada para falhar; entender por que ela falha é o ponto da etapa.",
    scriptLabel: "Consultas para rodar no seu schema — e uma consulta-armadilha para prever antes de rodar",
    script: `-- Consulta 1: total de garantias por proposta
SELECT p.numero_proposta, SUM(g.valor_avaliado) AS total_garantias
FROM Garantia g
JOIN Proposta p ON p.id_proposta = g.id_proposta
GROUP BY p.numero_proposta, p.id_proposta;

-- Consulta 2: participantes de cada proposta
SELECT p.numero_proposta, c.nome, cp.papel
FROM ContratoParticipante cp
JOIN Proposta p ON p.id_proposta = cp.id_proposta
JOIN Cliente c ON c.id_cliente = cp.id_cliente
ORDER BY p.numero_proposta, cp.papel;

-- Consulta 3 — PREVEJA o resultado antes de rodar:
SELECT TOP (5) id_garantia, tipo_garantia, valor_avaliado
FROM lab_aluno99.Garantia;`,
    questions: [
      {
        prompt:
          "Qual o risco de agrupar o total de garantias só por tipo_garantia, sem incluir numero_proposta/id_proposta no GROUP BY?",
        explanation:
          "O GROUP BY precisa incluir todas as colunas que identificam a linha que você quer manter separada — " +
          "sem numero_proposta, os valores de propostas diferentes seriam somados juntos.",
        options: [
          { text: "A consulta não rodaria: SQL Server exige GROUP BY só por chave primária." },
          {
            text: "Os valores de propostas diferentes seriam somados juntos — o GROUP BY precisa incluir todas as colunas que identificam a linha que você quer manter separada.",
            isCorrect: true,
          },
          { text: "O resultado ficaria idêntico, só mudando a ordem das linhas." },
          { text: "A soma ficaria incorreta apenas se houvesse valores nulos em valor_avaliado." },
        ],
      },
      {
        prompt: "Por que a Consulta 2 parte de ContratoParticipante, e não de Proposta ou de Cliente?",
        explanation:
          "ContratoParticipante tem as duas chaves estrangeiras (para Proposta e para Cliente) — é a tabela de " +
          "ligação entre as duas, o ponto natural para começar o JOIN.",
        options: [
          { text: "Porque ContratoParticipante é a única tabela com PRIMARY KEY IDENTITY." },
          {
            text: "Porque ContratoParticipante tem as chaves estrangeiras para Proposta e Cliente — é a tabela de ligação entre as duas.",
            isCorrect: true,
          },
          { text: "Porque Proposta e Cliente não podem aparecer na cláusula FROM." },
          { text: "Porque ContratoParticipante tem menos linhas, o que torna a consulta mais rápida." },
        ],
      },
      {
        prompt: "Qual a causa mais precisa da falha ao tentar ler lab_aluno99.Garantia?",
        explanation:
          "Cada schema lab_alunoNN pertence só ao seu dono, com CONTROL individual. Seu login não tem nenhuma " +
          "permissão concedida sobre o schema de outro aluno — por isso o erro é de permissão, não de \"tabela não existe\".",
        options: [
          { text: "A tabela Garantia não existe no schema lab_aluno99." },
          { text: "O nome do schema está escrito com erro de sintaxe." },
          {
            text: "Seu login não tem nenhuma permissão concedida sobre o schema de outro aluno — cada lab_alunoNN pertence ao seu dono, com CONTROL individual.",
            isCorrect: true,
          },
          { text: "O Azure SQL Database limita o número de schemas que podem ser lidos por sessão." },
        ],
      },
      {
        prompt:
          "Um GRANT dado sobre o schema atendimento (schema oficial e compartilhado) muda o resultado dessa consulta a lab_aluno99.Garantia?",
        explanation:
          "Não — o GRANT foi concedido sobre um schema oficial e compartilhado. Isso não diz nada sobre o schema " +
          "pessoal de outro aluno, que é uma fronteira de permissão separada.",
        options: [
          { text: "Sim — qualquer GRANT no banco libera acesso de leitura a todos os schemas." },
          {
            text: "Não — o GRANT foi dado sobre um schema oficial e compartilhado. Não diz nada sobre o schema pessoal de outro aluno.",
            isCorrect: true,
          },
          { text: "Sim, mas só para tabelas cujo nome comece com a mesma letra." },
          { text: "Não é possível saber sem reiniciar a conexão com o Azure SQL Database." },
        ],
      },
      {
        prompt: "O que um schema representa, dentro desse modelo de permissões?",
        explanation:
          "Schema é uma fronteira de permissão: ter acesso a um schema não dá acesso automático a outro, mesmo " +
          "dentro do mesmo banco de dados.",
        options: [
          { text: "Schema é só um prefixo visual no nome da tabela, sem efeito em permissões." },
          { text: "Schema é uma cópia física separada do banco de dados." },
          {
            text: "Schema é uma fronteira de permissão: acesso a um não dá acesso automático a outro, mesmo no mesmo banco.",
            isCorrect: true,
          },
          { text: "Schema determina apenas em qual servidor a tabela fica armazenada." },
        ],
      },
    ],
  },
  {
    key: "arquitetura-entrevista",
    title: "Etapa 4 — Arquitetura & Entrevista",
    narrative:
      "Hora de fechar o relatório para a diretoria da Horizonte Crédito, amarrando tudo com o papel do banco " +
      "dentro do sistema — em formato de perguntas de entrevista. E um gancho explícito para a próxima aula: " +
      "modelagem que sobrevive ao tempo.",
    questions: [
      {
        prompt: "Qual o papel de um CHECK, dentro do sistema?",
        explanation:
          "Um CHECK garante, dentro do próprio banco, que um valor só entra se satisfizer uma condição — " +
          "independente de qual aplicação (ou analista) fez o INSERT.",
        options: [
          { text: "Impedir que qualquer usuário sem privilégio de administrador insira dados." },
          {
            text: "Garantir, dentro do próprio banco, que um valor só entra se satisfizer uma condição — independente de qual aplicação fez o INSERT.",
            isCorrect: true,
          },
          { text: "Acelerar consultas que filtram pela coluna com a constraint." },
          { text: "Gerar automaticamente um valor quando a coluna não é informada." },
        ],
      },
      {
        prompt: "Por que permissão concedida por schema é mais sustentável do que conceder por login direto em cada tabela?",
        explanation:
          "Conceder ou revogar no nível do schema aplica a regra a todas as tabelas dele de uma vez, em vez de " +
          "repetir a concessão tabela por tabela.",
        options: [
          { text: "Porque permissão por schema não pode ser revogada depois de concedida." },
          { text: "Porque cada schema só pode conter uma tabela." },
          {
            text: "Conceder/revogar no nível do schema aplica a regra a todas as tabelas de uma vez, em vez de repetir tabela por tabela.",
            isCorrect: true,
          },
          { text: "Porque permissão por tabela não existe no Azure SQL Database." },
        ],
      },
      {
        prompt: "Qual o trade-off entre um CHECK com lista fechada de valores e uma tabela de domínio?",
        explanation:
          "Uma tabela de domínio permite adicionar um novo valor sem alterar a estrutura da tabela principal; " +
          "um CHECK com lista fechada exige um ALTER TABLE a cada novo valor permitido.",
        options: [
          { text: "Uma tabela de domínio é sempre mais rápida de consultar do que um CHECK." },
          { text: "CHECK permite valores duplicados; tabela de domínio não." },
          {
            text: "Uma tabela de domínio permite adicionar um novo valor sem alterar a estrutura da tabela principal; CHECK exige ALTER TABLE a cada novo valor.",
            isCorrect: true,
          },
          { text: "Tabela de domínio elimina a necessidade de FOREIGN KEY." },
        ],
      },
      {
        prompt: "Qual destas é um erro Tipo B (silencioso), e não Tipo A?",
        explanation:
          "Um UPDATE que zera valor_pago numa coluna sem CHECK que impeça isso não gera erro nenhum — é silencioso, " +
          "Tipo B. As outras opções são recusas visíveis do banco (Tipo A).",
        options: [
          { text: "Um INSERT que tenta usar um id_proposta inexistente e é recusado pela FOREIGN KEY." },
          {
            text: "Um UPDATE que marca uma parcela como paga com valor_pago = 0, numa coluna sem CHECK que impeça isso.",
            isCorrect: true,
          },
          { text: "Um INSERT recusado por violar a UNIQUE (id_proposta, id_cliente, papel)." },
          { text: "Um CREATE TABLE que falha por erro de sintaxe no CHECK." },
        ],
      },
      {
        prompt: "Qual a pergunta mais importante antes de desenhar uma tabela — o gancho para a próxima aula?",
        explanation:
          "Boa modelagem pensa além do estado atual: o que essa tabela precisa continuar representando " +
          "corretamente quando o negócio mudar, não só hoje.",
        options: [
          { text: "Quantas colunas essa tabela vai ter no total?" },
          { text: "Qual nome de tabela vai ocupar menos espaço em disco?" },
          {
            text: "O que essa tabela precisa continuar representando corretamente quando o negócio mudar — não só hoje?",
            isCorrect: true,
          },
          { text: "Qual é o tipo de dado mais rápido para cada coluna?" },
        ],
      },
    ],
  },
];

async function main() {
  console.log(`Removendo dados antigos do jogo "${GAME_SLUG}" (se existirem)...`);
  await prisma.game.deleteMany({ where: { slug: GAME_SLUG } });

  console.log("Criando jogo Operação Gênesis...");
  const game = await prisma.game.create({
    data: {
      slug: GAME_SLUG,
      name: "Operação Gênesis",
      description:
        "Módulo 4 — Fundamentos de Dados e Bancos de Dados. Você assume, como Engenheiro(a) de Dados Júnior da " +
        "fintech Horizonte Crédito, um trabalho de modelagem deixado pela metade no Azure SQL Database real da " +
        "Catarse: DDL, DML, DQL e arquitetura de permissões, em 4 etapas.",
      version: "1.0",
      status: "PUBLISHED",
    },
  });

  for (const [stageIndex, stageSeed] of STAGES.entries()) {
    console.log(`Criando ${stageSeed.title}...`);
    const stage = await prisma.genesisStage.create({
      data: {
        gameId: game.id,
        key: stageSeed.key,
        order: stageIndex + 1,
        title: stageSeed.title,
        narrative: stageSeed.narrative,
        scriptLabel: stageSeed.scriptLabel,
        script: stageSeed.script,
      },
    });

    for (const [qIndex, questionSeed] of stageSeed.questions.entries()) {
      const question = await prisma.genesisQuestion.create({
        data: {
          stageId: stage.id,
          order: qIndex + 1,
          prompt: questionSeed.prompt,
          explanation: questionSeed.explanation,
        },
      });

      for (const [oIndex, optionSeed] of questionSeed.options.entries()) {
        await prisma.genesisOption.create({
          data: {
            questionId: question.id,
            order: oIndex + 1,
            text: optionSeed.text,
            isCorrect: optionSeed.isCorrect ?? false,
          },
        });
      }
    }
  }

  console.log("Operação Gênesis semeada com sucesso.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
