import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GAME_SLUG = "operacao-genesis";

type QuestionKind = "MULTIPLE_CHOICE" | "OPEN_TEXT";

interface OptionSeed {
  text: string;
  isCorrect?: boolean;
}

interface QuestionSeed {
  type?: QuestionKind; // default MULTIPLE_CHOICE
  prompt: string;
  explanation?: string; // só usado em MULTIPLE_CHOICE
  options?: OptionSeed[]; // vazio/omitido em OPEN_TEXT
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
// Bancos de Dados / SQL / Azure SQL Database), versão final validada com o
// cliente — "Sistema Horizonte" (fintech Horizonte Crédito). O portal entrega
// apenas a história e os scripts para o aluno copiar e rodar no VS Code
// (extensão "SQL Server (mssql)") contra o Azure SQL Database real da
// Catarse — o progresso é medido por acerto nas questões de múltipla escolha
// de cada etapa (e, nas questões de texto livre "traduza o script", por
// leitura manual do professor), não por auditoria do SQL de fato executado
// no Azure. As consultas da Etapa 3 usam só o que a aula prática realmente
// ensinou: INNER/LEFT JOIN, GROUP BY+COUNT, CASE WHEN e subconsultas — sem
// CTE (WITH) e sem HAVING.
const STAGES: StageSeed[] = [
  {
    key: "fundacao-ddl",
    title: "Etapa 1 — Fundação (DDL)",
    narrative:
      "Há três semanas, a Horizonte Crédito recebeu uma notícia que mudou a prioridade de todo mundo: a fintech " +
      "está sendo auditada por um fundo que avalia um aporte de Série B. Os auditores querem ver a esteira de " +
      "crédito de ponta a ponta — da proposta até a garantia, passando por quem assinou o quê e por onde cada " +
      "proposta andou dentro da esteira. A squad de dados que cuidava disso pediu demissão em bloco duas semanas " +
      "atrás, no meio da migração para o Azure SQL Database. Você foi contratado(a) de emergência como " +
      "Engenheiro(a) de Dados Júnior, com uma reunião de corte em menos de 48 horas.\n\n" +
      "A squad anterior chegou a criar três tabelas no seu schema (lab_alunoNN, dentro do banco real " +
      "CATARSE_FINANCEIRO) — Garantia, ContratoParticipante e HistoricoEsteira — mas cada script saiu incompleto, " +
      "com um erro de sintaxe e sem nenhuma restrição real. Você recebe os três scripts abaixo e precisa decidir " +
      "o que falta em cada um antes de rodá-los no seu schema.",
    scriptLabel: "Scripts entregues pela squad anterior (incompletos, de propósito)",
    script: `-- Tabela 1: Garantia
CREATE TABLE Garantia (
    id_garantia     INT,
    id_proposta     INT,
    tipo_garantia   VARCHAR(20),
    valor_avaliado  FLOAT
    data_avaliacao  VARCHAR(10),
    status          VARCHAR(20)
);

-- Tabela 2: ContratoParticipante
CREATE TABLE ContratoParticipante (
    id_participante  INT,
    id_proposta      INT,
    id_cliente       INT,
    papel            VARCHAR(20)
;

-- Tabela 3: HistoricoEsteira (nova — registra a trilha de cada proposta na esteira)
CREATE TABLE HistoricoEsteira (
    id_historico      INT,
    id_proposta       INT,
    id_etapa_origem   INT,
    id_etapa_destino  INT,
    data_transicao,
    observacao        VARCHAR(200)
);`,
    questions: [
      {
        prompt: "O script de Garantia não rodou de primeira. Qual foi o problema?",
        explanation:
          "Entre \"valor_avaliado  FLOAT\" e a linha de data_avaliacao falta uma vírgula — sem ela, o parser lê as " +
          "duas linhas como uma única definição de coluna mal formada e recusa o CREATE TABLE inteiro.",
        options: [
          {
            text: "Faltou uma vírgula entre valor_avaliado FLOAT e a linha seguinte.",
            isCorrect: true,
          },
          { text: "O nome da tabela Garantia já estava em uso no schema." },
          { text: "A coluna status não pode ser VARCHAR em nenhuma tabela do Azure SQL Database." },
          { text: "Faltava um ponto e vírgula no final do CREATE TABLE." },
        ],
      },
      {
        prompt: "Garantia chegou sem chave primária. Consequência?",
        explanation:
          "Sem PRIMARY KEY (tipicamente BIGINT IDENTITY), o banco não garante unicidade nem obrigatoriedade de " +
          "id_garantia — nada impede duas linhas idênticas ou um id ausente.",
        options: [
          { text: "O Azure SQL Database recusa automaticamente a criação da tabela." },
          { text: "Nada impede inserir duas linhas com o mesmo id_garantia, ou nenhum id.", isCorrect: true },
          { text: "A tabela funciona normalmente, mas fica mais lenta para qualquer consulta." },
          { text: "Os valores de id_garantia passam a ser gerados automaticamente em sequência." },
        ],
      },
      {
        prompt: "Por que FLOAT é ruim para valor em reais?",
        explanation:
          "FLOAT é ponto flutuante binário: representa frações decimais de forma aproximada, o que pode gerar " +
          "erro de arredondamento em dinheiro. O tipo correto para valores monetários é DECIMAL(18,2).",
        options: [
          { text: "FLOAT ocupa mais espaço em disco do que qualquer outro tipo numérico." },
          {
            text: "FLOAT é ponto flutuante binário, pode gerar erro de arredondamento; o tipo correto é DECIMAL.",
            isCorrect: true,
          },
          { text: "FLOAT não aceita valores com casas decimais." },
          { text: "FLOAT exige que a coluna também tenha uma FOREIGN KEY." },
        ],
      },
      {
        prompt: "Por que id_etapa_origem precisa aceitar NULL, em HistoricoEsteira?",
        explanation:
          "A primeira entrada de uma proposta na esteira não vem de etapa nenhuma — ela só tem destino. Se " +
          "id_etapa_origem fosse NOT NULL, essa primeira linha nunca poderia ser inserida.",
        options: [
          { text: "Porque toda FOREIGN KEY no Azure SQL Database é opcional por padrão." },
          { text: "A primeira entrada de uma proposta na esteira não vem de etapa nenhuma.", isCorrect: true },
          { text: "Porque id_etapa_origem é o campo que recebe o valor DEFAULT da tabela." },
          { text: "Porque SMALLINT nunca pode ser NOT NULL em nenhuma coluna." },
        ],
      },
      {
        prompt:
          "Qual constraint impede que a mesma pessoa apareça duas vezes com o mesmo papel na mesma proposta, em ContratoParticipante?",
        explanation:
          "UNIQUE (id_proposta, id_cliente, papel) impede a duplicata exata — mesma proposta, mesmo cliente, mesmo " +
          "papel — sem impedir, por exemplo, vários AVALISTA diferentes na mesma proposta.",
        options: [
          { text: "PRIMARY KEY (id_participante)" },
          { text: "UNIQUE (id_proposta, id_cliente, papel)", isCorrect: true },
          { text: "CHECK (papel IN ('TITULAR','AVALISTA','FIADOR'))" },
          { text: "FOREIGN KEY (id_cliente) REFERENCES Cliente(id_cliente)" },
        ],
      },
      {
        type: "OPEN_TEXT",
        prompt:
          "Traduza o script da tabela Garantia: explique, em suas próprias palavras, o que estava errado nele " +
          "(incluindo o erro de sintaxe) e como você corrigiu cada problema, até chegar numa versão com chave " +
          "primária, tipos corretos e constraints.",
      },
      {
        type: "OPEN_TEXT",
        prompt:
          "Traduza o script da tabela ContratoParticipante: explique, em suas próprias palavras, o que estava " +
          "errado nele (incluindo o erro de sintaxe) e como você corrigiu cada problema, até chegar numa versão " +
          "com chave primária, tipos corretos e constraints.",
      },
      {
        type: "OPEN_TEXT",
        prompt:
          "Traduza o script da tabela HistoricoEsteira: explique, em suas próprias palavras, o que estava errado " +
          "nele (incluindo o erro de sintaxe) e como você corrigiu cada problema, até chegar numa versão com " +
          "chave primária, tipos corretos e constraints.",
      },
    ],
  },
  {
    key: "carga-dml",
    title: "Etapa 2 — Carga (DML)",
    narrative:
      "Com as três tabelas corrigidas e recriadas no seu schema, chegou a hora de carregar dados. Primeiro vem a " +
      "carga inicial — já reflete o estado real da esteira até agora, sem erro, é o seu ponto de partida. Em cima " +
      "dela, um analista rodou um lote de 12 INSERTs sem supervisão, direto no seu schema, correndo contra o " +
      "prazo da auditoria. Parte travou na hora — erro visível, o que chamamos de Tipo A. Parte passou calada, " +
      "com dado errado — silencioso, Tipo B, e mais perigoso, porque só aparece quando alguém nota o efeito dele " +
      "mais adiante. Sua tarefa: rodar a carga inicial e depois classificar cada linha do lote (as propostas " +
      "PRP-0001 a PRP-0008 e os clientes já existem no seu schema, de aulas anteriores).",
    scriptLabel: "Carga inicial + lote de INSERTs rodado pelo analista (para você classificar)",
    script: `-- =========================================================
-- CARGA INICIAL (correta, sem erro — estado real da esteira)
-- =========================================================

INSERT INTO Garantia (id_proposta, tipo_garantia, valor_avaliado, data_avaliacao, status) VALUES
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0001'), 'VEICULO', 32000.00, '2024-01-10', 'APROVADA'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0001'), 'VEICULO', 15000.00, '2024-01-10', 'APROVADA'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0002'), 'IMOVEL', 150000.00, '2024-01-15', 'APROVADA'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0004'), 'GARANTIA_PESSOAL', 8500.00, '2024-01-20', 'EM_ANALISE'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0006'), 'VEICULO', 20000.00, '2024-02-02', 'EM_ANALISE'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0008'), 'IMOVEL', 95000.00, '2024-02-05', 'APROVADA');

INSERT INTO ContratoParticipante (id_proposta, id_cliente, papel) VALUES
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0001'), (SELECT id_cliente FROM Cliente WHERE cpf = '00000000001'), 'TITULAR'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0001'), (SELECT id_cliente FROM Cliente WHERE cpf = '00000000002'), 'AVALISTA'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0002'), (SELECT id_cliente FROM Cliente WHERE cpf = '00000000001'), 'TITULAR'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0003'), (SELECT id_cliente FROM Cliente WHERE cpf = '00000000002'), 'TITULAR'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0004'), (SELECT id_cliente FROM Cliente WHERE cpf = '00000000003'), 'TITULAR'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0004'), (SELECT id_cliente FROM Cliente WHERE cpf = '00000000004'), 'FIADOR'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0006'), (SELECT id_cliente FROM Cliente WHERE cpf = '00000000005'), 'TITULAR'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0006'), (SELECT id_cliente FROM Cliente WHERE cpf = '00000000006'), 'AVALISTA'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0008'), (SELECT id_cliente FROM Cliente WHERE cpf = '00000000002'), 'TITULAR');

INSERT INTO HistoricoEsteira (id_proposta, id_etapa_origem, id_etapa_destino, observacao) VALUES
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0001'), NULL, (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'RECEBIDA'), 'Entrada na esteira'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0001'), (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'RECEBIDA'), (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'EM_ANALISE'), 'Encaminhada para análise'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0001'), (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'EM_ANALISE'), (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'APROVADA'), 'Aprovada pelo comitê'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0002'), NULL, (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'RECEBIDA'), 'Entrada na esteira'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0002'), (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'RECEBIDA'), (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'EM_ANALISE'), 'Encaminhada para análise'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0003'), NULL, (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'RECEBIDA'), 'Entrada na esteira'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0003'), (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'RECEBIDA'), (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'EM_ANALISE'), 'Encaminhada para análise'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0003'), (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'EM_ANALISE'), (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'RECUSADA'), 'Recusada por score de crédito'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0004'), NULL, (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'EM_ANALISE'), 'Entrada direta em análise'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0005'), NULL, (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'CANCELADA'), 'Cancelada pelo próprio cliente'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0006'), NULL, (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'EM_ANALISE'), 'Entrada direta em análise'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0007'), NULL, (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'RECEBIDA'), 'Entrada na esteira'),
  ((SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0008'), NULL, (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'APROVADA'), 'Entrada direta já aprovada (migração)');

-- =========================================================
-- LOTE DE 12 INSERTs RODADO PELO ANALISTA (classifique cada um)
-- =========================================================

-- L1
INSERT INTO Garantia (id_proposta tipo_garantia, valor_avaliado, data_avaliacao, status)
VALUES (
  (SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0007'),
  'VEICULO', 18000.00, '2024-05-02', 'EM_ANALISE'
);

-- L2
INSERT INTO Garantia (id_proposta, tipo_garantia, valor_avaliado, data_avaliacao, status)
VALUES (999999, 'VEICULO', 45000.00, '2024-03-01', 'EM_ANALISE');

-- L3
INSERT INTO Garantia (id_proposta, tipo_garantia, valor_avaliado, data_avaliacao, status)
VALUES (
  (SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0003'),
  'IMOVEL', 60000.00, '2099-01-01', 'APROVADA'
);

-- L4
INSERT INTO Garantia (id_proposta, tipo_garantia, valor_avaliado, data_avaliacao, status)
VALUES (
  (SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0007'),
  'VEICULO', 0.01, '2024-02-15', 'EM_ANALISE'
);

-- L5
INSERT INTO Garantia (id_proposta, tipo_garantia, valor_avaliado, data_avaliacao, status)
VALUES (
  (SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0005'),
  'VEICULO', 12000.00, '2024-04-10', 'CANCELADA'
);

-- L6
INSERT INTO ContratoParticipante (id_proposta, id_cliente, papel
VALUES (
  (SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0002'),
  (SELECT id_cliente FROM Cliente WHERE cpf = '00000000002'),
  'AVALISTA'
);

-- L7
INSERT INTO ContratoParticipante (id_proposta, id_cliente, papel)
VALUES (
  (SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0006'),
  888888, 'FIADOR'
);

-- L8
INSERT INTO ContratoParticipante (id_proposta, id_cliente, papel)
VALUES (
  (SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0001'),
  (SELECT id_cliente FROM Cliente WHERE cpf = '00000000003'),
  'TITULAR'
);

-- L9
INSERT INTO ContratoParticipante (id_proposta, id_cliente, papel)
VALUES (
  (SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0001'),
  (SELECT id_cliente FROM Cliente WHERE cpf = '00000000001'),
  'TITULAR'
);

-- L10
INSERT INTO HistoricoEsteira (id_proposta, id_etapa_origem, id_etapa_destino, observacao)
VALUES (
  (SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0005'),
  (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'CANCELADA'),
  (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'APROVADA'),
  'Ajuste manual de histórico'
);

-- L11
INSERT INTO HistoricoEsteira (id_proposta, id_etapa_origem, id_etapa_destino, observacao)
VALUES (
  (SELECT id_proposta FROM Proposta WHERE numero_proposta = 'PRP-0002'),
  (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'EM_ANALISE')
  (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'APROVADA'),
  'Avanço de etapa'
);

-- L12
INSERT INTO HistoricoEsteira (id_proposta, id_etapa_origem, id_etapa_destino, observacao)
VALUES (
  999999,
  (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'RECEBIDA'),
  (SELECT id_etapa FROM EsteiraEtapa WHERE nome_etapa = 'EM_ANALISE'),
  'Primeira triagem'
);`,
    questions: [
      {
        prompt: "Por que L1 nem chegou a ser avaliado?",
        explanation:
          "Faltou a vírgula entre id_proposta e tipo_garantia na lista de colunas — o parser recusa o comando " +
          "antes de o banco sequer considerar os valores.",
        options: [
          { text: "Faltou vírgula na lista de colunas.", isCorrect: true },
          { text: "O valor de valor_avaliado estava fora do intervalo do CHECK." },
          { text: "A proposta PRP-0007 não existe no schema." },
          { text: "A coluna status recebeu um valor repetido." },
        ],
      },
      {
        prompt: "O que L3 revela sobre os limites do CHECK?",
        explanation:
          "Nenhum CHECK em Garantia cobre \"data futura\" — o banco só recusa o que alguém escreveu explicitamente " +
          "numa constraint. Uma regra de negócio não declarada simplesmente não existe para ele, e a linha entra " +
          "calada.",
        options: [
          { text: "Que o Azure SQL Database bloqueia automaticamente qualquer data futura." },
          { text: "Que o tipo DATE não aceita datas depois do ano corrente." },
          {
            text: "O banco só recusa o que alguém escreveu explicitamente numa constraint.",
            isCorrect: true,
          },
          { text: "Que a linha será revertida automaticamente na próxima manutenção do banco." },
        ],
      },
      {
        prompt: "Por que nenhuma FK/CHECK impediu a contradição de L10?",
        explanation:
          "FK e CHECK verificam valores existirem e obedecerem regras isoladas — não verificam se duas tabelas " +
          "diferentes contam a mesma história. PRP-0005 está CANCELADA de verdade; nada compara esse status com o " +
          "que HistoricoEsteira registra.",
        options: [
          { text: "Porque a tabela HistoricoEsteira não tem nenhuma FOREIGN KEY." },
          {
            text: "FK e CHECK verificam valores existirem e obedecerem regras isoladas, não se duas tabelas contam a mesma história.",
            isCorrect: true,
          },
          { text: "Porque id_etapa_origem aceita NULL e por isso nenhuma regra se aplica à linha." },
          { text: "Porque o CHECK de Garantia também vale para HistoricoEsteira." },
        ],
      },
      {
        prompt: "Qual constraint impediria especificamente dois TITULAR (L8) sem impedir vários AVALISTA?",
        explanation:
          "A UNIQUE da Etapa 1 só bloqueia a duplicata exata de (proposta, cliente, papel) — pessoas diferentes " +
          "como TITULAR da mesma proposta passam por ela. Faltaria um CHECK ou regra extra limitando a 1 TITULAR " +
          "por proposta.",
        options: [
          { text: "A UNIQUE (id_proposta, id_cliente, papel) já criada na Etapa 1." },
          {
            text: "Nenhuma das atuais cobre isso — precisaria de CHECK/regra extra.",
            isCorrect: true,
          },
          { text: "Uma FOREIGN KEY adicional de id_cliente para Cliente." },
          { text: "Transformar id_participante em PRIMARY KEY IDENTITY." },
        ],
      },
      {
        prompt: "Qual frase resume melhor a relação entre os 3 tipos de problema (Sintaxe, Tipo A, Tipo B)?",
        explanation:
          "Sintaxe impede o banco de sequer avaliar o comando; Tipo A avalia e recusa na hora, com erro visível; " +
          "Tipo B avalia, aceita, e erra calado — o dado errado entra sem aviso.",
        options: [
          { text: "Os três tipos sempre geram a mesma mensagem de erro na tela." },
          {
            text: "Sintaxe trava antes de avaliar; Tipo A avalia e recusa; Tipo B avalia, aceita, e erra calado.",
            isCorrect: true,
          },
          { text: "Sintaxe e Tipo A só ocorrem em tabelas sem FOREIGN KEY." },
          { text: "Tipo B é apenas um nome alternativo para erro de sintaxe." },
        ],
      },
      {
        type: "OPEN_TEXT",
        prompt:
          "Escolha 3 itens do lote acima — pelo menos um de cada tipo (Sintaxe, Tipo A, Tipo B) — e, para cada " +
          "um, explique o que o analista tentava fazer, o que deu errado, e como você corrigiria.",
      },
    ],
  },
  {
    key: "consultas-dql",
    title: "Etapa 3 — Consultas (DQL)",
    narrative:
      "A reunião com os auditores está marcada. A diretoria da Horizonte Crédito quer três retratos da esteira: " +
      "quais propostas estão cobertas por garantia (e quais não estão), quem está envolvido em cada proposta, e " +
      "quantas vezes cada proposta mudou de etapa até agora. Depois vem um pedido-armadilha dos próprios " +
      "auditores — cruzar dados com o schema de outro aluno, para simular um acesso indevido. Essa consulta foi " +
      "desenhada para falhar; entender por que ela falha é o ponto da etapa.",
    scriptLabel: "Consultas para rodar no seu schema — e uma consulta-armadilha para prever antes de rodar",
    script: `-- Consulta A — "Garantia cobre a proposta sozinha?"
SELECT
    p.numero_proposta, c.nome AS cliente, e.nome_etapa, p.valor_solicitado,
    g.tipo_garantia, g.valor_avaliado,
    CASE
        WHEN g.valor_avaliado IS NULL               THEN 'SEM GARANTIA'
        WHEN g.valor_avaliado >= p.valor_solicitado THEN 'COBRE SOZINHA'
        ELSE 'NAO COBRE SOZINHA'
    END AS situacao
FROM Proposta p
JOIN Cliente c ON c.id_cliente = p.id_cliente
JOIN EsteiraEtapa e ON e.id_etapa = p.id_etapa
LEFT JOIN Garantia g ON g.id_proposta = p.id_proposta
ORDER BY p.numero_proposta, g.valor_avaliado DESC;

-- Consulta B — "Quem está envolvido em cada proposta"
SELECT
    p.numero_proposta, pr.nome_produto, e.nome_etapa, part.papel, cl.nome AS nome_participante
FROM Proposta p
JOIN Produto pr ON pr.id_produto = p.id_produto
JOIN EsteiraEtapa e ON e.id_etapa = p.id_etapa
LEFT JOIN ContratoParticipante part ON part.id_proposta = p.id_proposta
LEFT JOIN Cliente cl ON cl.id_cliente = part.id_cliente
ORDER BY p.numero_proposta, part.papel;

-- Consulta C — "Quantas vezes cada proposta mudou de etapa"
SELECT p.numero_proposta, c.nome AS cliente, COUNT(*) AS qtd_transicoes
FROM HistoricoEsteira h
JOIN Proposta p ON p.id_proposta = h.id_proposta
JOIN Cliente c ON c.id_cliente = p.id_cliente
GROUP BY p.numero_proposta, c.nome
ORDER BY qtd_transicoes DESC, p.numero_proposta;

-- Consulta D — PREVEJA o resultado antes de rodar:
SELECT TOP (5) id_garantia, tipo_garantia, valor_avaliado
FROM lab_aluno99.Garantia;`,
    questions: [
      {
        prompt: "Por que PRP-0001 aparece 2x na Consulta A?",
        explanation:
          "PRP-0001 tem 2 garantias (VEICULO de 32000 e 15000). O LEFT JOIN com Garantia multiplica a linha da " +
          "proposta por cada garantia associada a ela.",
        options: [
          { text: "Porque a cláusula ORDER BY duplica linhas quando há mais de um critério de ordenação." },
          { text: "Tem 2 garantias, LEFT JOIN multiplica linhas.", isCorrect: true },
          { text: "Porque o CASE WHEN gera uma linha extra para cada condição avaliada." },
          { text: "Porque PRP-0001 tem 2 clientes associados na tabela Cliente." },
        ],
      },
      {
        prompt: "Como a Consulta A mostra proposta sem garantia?",
        explanation:
          "LEFT JOIN preserva a linha da proposta mesmo quando não há garantia correspondente, preenchendo as " +
          "colunas de Garantia com NULL; o CASE WHEN g.valor_avaliado IS NULL detecta esse caso e rotula " +
          "'SEM GARANTIA'.",
        options: [
          { text: "A proposta simplesmente não aparece no resultado." },
          { text: "LEFT JOIN preserva a linha com NULL, CASE WHEN detecta.", isCorrect: true },
          { text: "O INNER JOIN substitui automaticamente o valor por zero." },
          { text: "A consulta lança um erro e precisa ser reescrita." },
        ],
      },
      {
        prompt: "Por que PRP-0005 aparece com papel/nome NULL na Consulta B?",
        explanation:
          "PRP-0005 ainda não tem nenhum participante em ContratoParticipante. Como part e cl entram por LEFT " +
          "JOIN, a proposta é preservada mesmo assim, com essas colunas em NULL.",
        options: [
          { text: "Porque PRP-0005 foi cancelada e é excluída de qualquer consulta." },
          { text: "Ainda não tem participante, LEFT JOIN preserva mesmo assim.", isCorrect: true },
          { text: "Porque o nome do cliente está em branco na tabela Cliente." },
          { text: "Porque a consulta usa INNER JOIN para a tabela Produto." },
        ],
      },
      {
        prompt: "Em caso de empate em qtd_transicoes (Consulta C), quem decide a ordem?",
        explanation:
          "ORDER BY qtd_transicoes DESC, p.numero_proposta: o segundo campo só entra em ação quando o primeiro " +
          "empata — é o caso de PRP-0001 e PRP-0003, ambas com 3 transições.",
        options: [
          { text: "A ordem fica indefinida, pode variar a cada execução." },
          { text: "O segundo campo do ORDER BY (numero_proposta).", isCorrect: true },
          { text: "O banco desempata automaticamente pela data da última transição." },
          { text: "O GROUP BY decide a ordem antes do ORDER BY ser aplicado." },
        ],
      },
      {
        prompt: "Causa da falha na Consulta D?",
        explanation:
          "Cada schema lab_alunoNN pertence só ao seu dono, com CONTROL individual. O login do aluno não tem " +
          "nenhuma permissão concedida sobre o schema de outro aluno — por isso o erro é de permissão, não de " +
          "\"tabela não existe\".",
        options: [
          { text: "A tabela Garantia não existe no schema lab_aluno99." },
          { text: "Sem permissão sobre o schema do colega, CONTROL é individual.", isCorrect: true },
          { text: "O nome do schema está escrito com erro de sintaxe." },
          { text: "O Azure SQL Database limita o número de schemas lidos por sessão." },
        ],
      },
      {
        type: "OPEN_TEXT",
        prompt:
          "Escolha 2 das 3 consultas (A, B ou C) e, para cada uma, explique o que ela entrega, qual exercício da " +
          "aula prática ela reaproveita, e um cenário de negócio em que a Horizonte Crédito usaria esse " +
          "resultado.",
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
        "Módulo 4 — Fundamentos de Dados e Bancos de Dados. Sistema Horizonte: a fintech Horizonte Crédito está " +
        "sob auditoria de um fundo de investimento, e você assume, como Engenheiro(a) de Dados Júnior, um " +
        "trabalho de modelagem deixado pela metade no Azure SQL Database real da Catarse: DDL, DML, DQL e " +
        "arquitetura de permissões, em 4 etapas.",
      version: "2.0",
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
          type: questionSeed.type ?? "MULTIPLE_CHOICE",
          prompt: questionSeed.prompt,
          explanation: questionSeed.explanation,
        },
      });

      for (const [oIndex, optionSeed] of (questionSeed.options ?? []).entries()) {
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
