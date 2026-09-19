# Catarse Interatividade

Plataforma de interatividade da Catarse: um motor genérico para jogos e dinâmicas
investigativas multiplayer de pré/pós-aula, com **Operação SFN — Quem Faz o Quê?** como
primeiro jogo publicado (ver `EF-01`).

## Stack

- **Front-end/back-end**: Next.js 14 (App Router) + TypeScript, 100% serverless — sem
  servidor customizado, pronto para rodar na Vercel.
- **Tempo real**: Supabase Realtime (Broadcast). O servidor publica atualizações de
  estado em canais nomeados por código de sala/token; o navegador assina esses canais.
  Sem Supabase configurado, a aplicação cai automaticamente para *polling* (a cada 4s)
  em vez de tempo real — continua funcionando, só perde a atualização instantânea.
- **Banco de dados**: PostgreSQL (hospedado no Supabase) + Prisma ORM.
- **UI**: Tailwind CSS + Framer Motion. Direção de arte "sala de investigação": moldura em
  azul-marinho, cartas em tom de dossiê/papel, carimbos dourados/turquesa, tipografia
  Fraunces (display) + Inter (corpo) + IBM Plex Mono (códigos/carimbos).

## Rodando localmente

Pré-requisitos: Node.js ≥ 18.18, PostgreSQL rodando localmente (ou uma `DATABASE_URL`
apontando para um Postgres acessível — pode ser o Postgres do seu projeto Supabase).

```bash
npm install
cp .env.example .env        # ajuste DATABASE_URL/DIRECT_URL se necessário
npm run prisma:migrate      # cria as tabelas
npm run prisma:seed         # popula o jogo "Operação SFN — Quem Faz o Quê?"
npm run dev                 # sobe o Next.js em http://localhost:3000
```

As variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são opcionais em desenvolvimento — sem elas
o app funciona em modo "sem tempo real" (polling). Para testar a sincronização ao vivo de
verdade, preencha-as com os dados do seu projeto Supabase (Project Settings → API).

Fluxo de uso:

1. Professor acessa `/professor/novo`, escolhe o jogo e clica em "Criar sala" — a chave
   de controle da sala (`hostToken`) fica salva só no `localStorage` daquele navegador,
   sem login.
2. Alunos acessam `/` (ou escaneiam o QR Code mostrado ao professor), informam o código
   da sala e um nome — sem cadastro, sem e-mail, sem senha (EF-01 §9).
3. Tela coletiva/projetor: `/sala/{codigo}/telao` — somente leitura, sem controles
   administrativos.

## Publicando (Vercel + Supabase)

1. **Supabase**: crie um projeto em supabase.com/dashboard. Em Project Settings → API,
   pegue `Project URL`, a chave `anon public` e a chave `service_role`. Em Project
   Settings → Database → Connection string, pegue a string do **Transaction pooler**
   (para `DATABASE_URL`) e a de **Direct connection** (para `DIRECT_URL`).
2. Rode as migrations contra o banco do Supabase: `DATABASE_URL=... DIRECT_URL=...
   npx prisma migrate deploy && npx prisma db seed`.
3. **Vercel**: importe o repositório em vercel.com/new. Configure as variáveis de
   ambiente do passo 1 (`DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, e
   `NEXT_PUBLIC_APP_URL` apontando para o domínio final). Build command e output ficam
   nos padrões do Next.js — nada de servidor customizado para configurar.

## Estrutura do projeto

```
prisma/schema.prisma          Modelo de dados do motor genérico + estado de sessão
prisma/seed.ts                 Conteúdo de "Operação SFN — Quem Faz o Quê?"
src/lib/game-engine/           Regras de negócio: sessão, máquina de estados, pontuação,
                                distintivos, relatórios — sem nada de UI nem de transporte
src/lib/realtime/              Canais/broadcast do Supabase Realtime (servidor) e cliente
                                do navegador; tudo com fallback de polling
src/app/api/rooms/[code]/      Rotas HTTP que o front chama: join, state, actions
src/types/realtime.ts          Contrato de DTOs compartilhado front/back
src/components/game/           Peças de UI do jogo (carta, tabuleiro, mesa de evidências,
                                dossiê do cenário, relatórios)
src/components/professor/      Painel do professor (controles, participantes, linha do tempo)
src/app/                       Rotas (landing, /professor/*, /sala/*)
scripts/                       Testes de ponta a ponta com Playwright (ver abaixo)
```

## Motor genérico (EF-01 §44)

O modelo de dados não assume nada específico de SFN: `Game → Zone/Card/Clue/Evidence/
Scenario` são todos cadastráveis. Para publicar um novo jogo ("Operação API", "Operação
Crédito" etc.), basta escrever um novo script de seed seguindo o padrão de
`prisma/seed.ts` — nenhuma mudança de schema, motor de sessão, pontuação ou UI é
necessária. A landing e `/professor/novo` já listam qualquer `Game` com
`status: PUBLISHED`.

## Testes de ponta a ponta

Com o servidor de dev rodando em outro terminal (`npm run dev`) e o banco semeado:

```bash
npm run test:e2e             # professor + 2 participantes jogam as 4 rodadas até o final
npm run test:e2e:reconnect   # confirma que dar refresh na página não apaga progresso
```

Os scripts usam o pacote `playwright` (dependência de desenvolvimento). Se os browsers do
Playwright ainda não estiverem instalados na máquina, rode `npx playwright install
chromium` antes, ou aponte `PLAYWRIGHT_CHROMIUM_PATH` para um Chromium já instalado.
Rodando sem `NEXT_PUBLIC_SUPABASE_*` configuradas, os testes exercitam o caminho de
polling — o que já cobre toda a lógica de jogo/pontuação; a sincronização instantânea via
Supabase Realtime só é validada de fato contra um projeto Supabase real.

## Decisões e simplificações conscientes do MVP

- **Tempo real via HTTP + Broadcast, não WebSocket próprio**: a Vercel não sustenta
  conexões persistentes em funções serverless, então trocamos o Socket.IO (usado numa
  primeira versão local) por rotas HTTP comuns (`/api/rooms/[code]/actions` etc.) que
  gravam no Postgres e depois publicam a atualização via Supabase Realtime. Sem Supabase
  configurado, cada tela cai para polling a cada 4s — degrada, não quebra.
- **Pontuação da matriz do caso Aurora** (`responsável`/`tipo`): comparação por
  palavras-chave tolerante (`src/lib/game-engine/text-match.ts`), não exige digitação
  idêntica ao gabarito — o professor sempre vê o texto bruto de cada participante no
  painel para julgar qualitativamente também.
- **Cronômetro**: sincronizado via um `roundTimerEndsAt` gravado no servidor (visível
  para todos), mas é só informativo — quem controla a progressão de fato é sempre o
  professor (RN-002), nunca o relógio.
- **"Pausar rodada" vs. "Congelar respostas"**: unificados em uma única ação
  (`FREEZE`/`RESUME`), já que no fluxo real da sala de aula as duas cumprem o mesmo papel
  de interromper a rodada.
- **Carga de 50 participantes simultâneos** (RNF-001): a arquitetura (funções serverless
  sem estado, Postgres + Supabase Realtime como únicas fontes de coordenação) foi
  desenhada para suportar esse volume, mas não foi submetida a um teste de carga real.
- `npm audit` acusa CVEs conhecidos da linha Next.js 14.2.x (Server Actions, Image
  Optimizer, middleware i18n) — nenhum desses recursos é usado aqui, mas vale um upgrade
  planejado para Next 15/16 antes de ir a produção.

## Rastreabilidade com a EF-01

- **RF-001 a RF-030**: sala/lobby (`/professor/novo`, `/sala/{codigo}`), tabuleiro e
  cartas embaralhadas (`Board`), pistas progressivas (`RELEASE_CLUE`), histórico
  (`Placement`/`SessionEvent`), mesa de evidências (`EvidenceBoard`), painel do professor
  (`ControlBar`, `ParticipantsList`, `Timeline`), reconexão (`useParticipantSession`),
  relatórios (`IndividualReport`, `ClassReport`).
- **RN-001 a RN-010**: aplicadas na máquina de estados (`state-machine.ts`) e no serviço
  de sessão (`session-service.ts`) — nenhuma resposta é revelada com a rodada aberta,
  progressão só pelo professor, histórico nunca é sobrescrito, "em investigação" é uma
  resposta correta quando cadastrada assim no gabarito.
- **RNF-001 a RNF-011**: validação de entrada com `zod`, tokens de sessão e de
  participante gerados com `nanoid` (não previsíveis) e usados como nome de canal do
  Realtime (controle de acesso por segredo, não por senha), layout mobile-first,
  navegação por teclado nativa dos elementos usados (`button`, `input`, `select`).
