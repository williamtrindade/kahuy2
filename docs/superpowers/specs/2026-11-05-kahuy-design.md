# Kahuy — Design (v1)

> Dashboard open source que lê as tasks de uma base do Notion e mostra o progresso
> em relação à meta de horas do mês e do trimestre, com previsão.

Data: 2026-11-05 · Autor: William Trindade

---

## 1. Objetivo e contexto

**Problema.** As tasks do trabalho são registradas numa base do Notion, cada uma com
as horas recebidas (campo numérico, horas cheias). Existe uma meta mensal de horas
(dias úteis × 8h) e uma meta trimestral (soma dos 3 meses). Hoje não há uma forma
rápida de saber "quanto já fiz, quanto vou fazer e quanto falta".

**Sucesso na v1.** Abrir o dashboard e, em segundos, saber:
- horas concluídas no mês × meta;
- previsão (concluídas + abertas) × meta;
- quantas horas por dia útil restante são necessárias para bater a meta;
- quantas horas fiz hoje e quanto falta para 100% e 125% da meta do dia;
- o mesmo consolidado para o trimestre.

**Público.** Uso pessoal do autor; projeto open source para que outros devs
conectem a própria base do Notion e hospedem localmente ou no Cloudflare,
atualizando via `git pull`. Possível ferramenta interna no futuro.

**Restrições.**
- Sem VPS. Destino principal: Cloudflare Workers (free tier). Desenvolvimento local
  com Node comum, sem wrangler.
- Somente leitura no Notion.
- Nada pessoal versionado (token, senha, IDs, dias úteis).

---

## 2. Regras de negócio

| Regra | Definição |
|---|---|
| Horas da task | Valor do campo mapeado como "horas" (padrão `Horas`). Vazio = 0h. Negativo é inválido (`DomainError` na Entity `Task`): a task fica fora da conta e é listada em `invalidTasks`, sem derrubar o dashboard. |
| Task concluída | Status ∈ `DONE_STATUSES` (padrão `Concluido`). |
| Mês de uma task concluída | Mês da **data final** do campo de data (padrão `Data`). Se a data não tiver fim, usa a data de início. Sem data nenhuma → ignorada no realizado e listada como "sem data". |
| Task aberta | Qualquer status fora de `DONE_STATUSES`. |
| Mês de uma task aberta | Sempre o **mês corrente** (entra na previsão do mês atual; ao virar o mês, passa para o próximo). |
| Meta do mês | `diasÚteis(mês) × HOURS_PER_DAY` (padrão 8). |
| Dias úteis do mês | Seg–sex fora dos feriados (nacionais + `HOLIDAYS`). `WORKING_DAYS` do mês, se existir, tem prioridade na contagem. Sem `WORKING_DAYS`, é `estimated: true` quando o ano do mês não tem nenhum feriado cadastrado (ex.: `holidays.json` ainda sem o ano). |
| Meta do trimestre | Soma das metas dos 3 meses (Q1 = jan–mar, Q2 = abr–jun, Q3 = jul–set, Q4 = out–dez). |
| Realizado | Σ horas das tasks concluídas no período. |
| Previsão | Realizado + Σ horas das tasks abertas — **apenas** quando o período contém o mês corrente. Para períodos passados, previsão = realizado. |
| Dias úteis restantes | Dias úteis de hoje (inclusive) até o fim do mês, limitado ao total do mês. |
| Hoje | Σ horas das tasks concluídas cuja data final (no `TIMEZONE`) é hoje. Só no mês corrente. |
| Cenários (hoje, semana, mês, trimestre) | **Entregue** = só concluídas; **Previsto** = concluídas + abertas (as abertas contam no período corrente: hoje, semana e mês). A API devolve os dois (`delivered`/`forecast`); o front alterna por card (botão, escolha lembrada no navegador). Fora do mês corrente, previsto = entregue. |
| Meta do dia | `HOURS_PER_DAY` em dia útil (seg–sex); 0 no fim de semana (`isWorkingDay: false`). |
| Dia útil | Seg–sex que não é feriado nacional (`holidays.json`, no build) nem folga pessoal (`HOLIDAYS`). Regra única em `WorkCalendarRepositoryInterface.isWorkday`; `dayOff(date)` diz se a folga é `holiday` (nacional) ou `vacation` (pessoal, que vence na data repetida); `WorkMonth.workdays` guarda as datas úteis do mês. |
| Semana | Domingo a sábado (Entity `Week`), qualquer semana (`GET /api/progress/weekly?week=AAAA-MM-DD`, padrão: corrente). Abertas só na semana corrente. Semana passada: esperado = meta, restam 0 dias; futura: esperado 0. Realizado = concluídas com data final na semana. Meta = dias úteis da semana × `HOURS_PER_DAY` (40h sem feriado). Esperado = dias úteis encerrados antes de hoje × `HOURS_PER_DAY`. |
| Faixas de meta | `GOAL_TIERS` (padrão `100,125`) valem para dia, mês e trimestre: horas da faixa = meta × faixa / 100 (dia 8h/10h; mês de 19 dias 152h/190h). |
| Esperado até agora (mês) | `meta da faixa × (seg–sex do mês anteriores a hoje / seg–sex do mês)`. Mês passado = meta inteira; mês futuro = 0. Hoje não entra (tem card próprio). |
| No ritmo | `realizado ≥ esperado até agora` da faixa; diferença = `realizado − esperado`. |
| Esperado até agora (trimestre) | Soma do esperado de cada mês do trimestre. |
| Ritmo necessário | `max(0, meta − realizado) / diasÚteisRestantes` (0 se não restam dias). |
| Linhas ideais (gráfico) | Uma por faixa de `GOAL_TIERS` (100% = meta, 125% = supermeta). Para cada dia do mês: `meta da faixa × (dias úteis até o dia / dias úteis do mês)`. |
| Nome entre colchetes | Texto do último `[...]` no título. Em tasks de teste (`TEST_TYPES`, padrão `TESTE`) é o **dev** que fez o que foi testado → "Horas de teste por dev"; nas demais é o **solicitante** → "Horas por solicitante". Cada card some se vazio. |
| Faixas por cenário | Semana e mês: no ritmo/atrás, faltam (≥ 0) e ritmo necessário = faltam ÷ dias úteis restantes (hoje incluso). Dia: atingida e faltam (0 em dia não útil). |
| Mês: ritmo e projeção | Ritmo = entregue no mês antes de hoje ÷ dias úteis do mês já encerrados; projeção = entregue antes de hoje + ritmo × dias úteis restantes (mínimo = entregue). `null` se nenhum dia útil encerrou (mês futuro ou 1º dia útil). Mês passado: média do mês inteiro e projeção = realizado. |
| Fuso horário | Limites de dia/mês calculados no fuso `TIMEZONE` (padrão `America/Sao_Paulo`); o Notion devolve UTC. Datas só com dia (`2026-11-01`, sem hora) são tratadas como esse dia local. |
| Tipos de campo | Horas: `number` ou fórmula numérica. Status: `select` ou `status`. Data: `date`. Título: `title`. Tipo diferente → 502 citando o campo e o tipo. |

---

## 3. Arquitetura

Segue a Arquitetura Limpa de Robert C. Martin (*Arquitetura Limpa*, 2019) com a
organização e nomenclatura de Trindade & Freitas, *"Implementando Arquitetura Limpa
em uma API REST Laravel baseada em MVC"* (Revista ComInG, 2026,
doi:10.5902/2448190495410), adaptadas para TypeScript.

**Regra da Dependência:** `FrameworksAndDrivers → InterfaceAdapters → UseCases → Entities`.
Nada em `Entities` ou `UseCases` importa Hono, Notion, Node ou Cloudflare.

**Diagrama:** [`docs/architecture/architecture.svg`](../../architecture/architecture.svg)
(editável em [`architecture.excalidraw`](../../architecture/architecture.excalidraw)). Ambos são
gerados por `python3 docs/architecture/generate.py`. **Toda mudança no back deve conferir o
diagrama e regenerá-lo se camadas, componentes, nomes ou dependências mudarem.**

### 3.1 Repositório (monorepo)

```
kahuy/
├── backend/             API (Clean Architecture) → Worker kahuy-api · .env(.example), holidays*.json,
│                        wrangler.toml, scripts/ (holidays, env-to-json)
├── frontend/            React (detalhe de entrega) → Pages kahuy · functions/api/[[path]].ts, wrangler.toml
├── docs/                spec, plano, diagramas
├── .github/workflows/   CI: backend (test + typecheck) e frontend (typecheck + build)
└── package.json         atalhos para os dois projetos
```

Cada projeto tem o próprio `package.json`. O front importa **só tipos** do backend
(`frontend/src/api/types.ts` reexporta os ViewModels), então um contrato quebrado falha no
typecheck do front. O `_headers` do Pages é gerado no build (`vite.config.ts`) a partir de
`backend/src/FrameworksAndDrivers/Http/securityHeaders.ts`: a CSP tem uma fonte só.
Infra completa em `docs/architecture/infra.svg`.

### 3.2 `backend/src`

```
Entities/
  Task.ts                     id, title, hours, status, type, startDate, endDate, url
                              isDone(doneStatuses), completionMonth(), requester()
  WorkMonth.ts                YearMonth + workingDays + hoursPerDay → goal(); estimated
  Quarter.ts                  ano + n (1–4) → months(); goal = Σ WorkMonth.goal()
  YearMonth.ts                value object "2026-11": parse, next, days, weekdays (fuso via time.ts)
  DomainError.ts              violação de regra das Entities (→ HTTP 422)

UseCases/
  Contracts/
    TaskRepositoryInterface.ts           findAll(): Promise<Task[]>
    WorkCalendarRepositoryInterface.ts   workMonth(YearMonth): WorkMonth
    ClockInterface.ts                    now(): Date
  ProgressSettings.ts             doneStatuses, timeZone, goalTiers
  Shared/taskAggregations.ts      agregações comuns + GoalTier (faixas 100%/125%)
  GetMonthlyProgress/
    GetMonthlyProgressInteractor.ts
    Boundaries/
      GetMonthlyProgressInputBoundary.ts   execute(request, presenter): Promise<void>
      GetMonthlyProgressOutputBoundary.ts  present(response): void
    DTOs/
      GetMonthlyProgressRequestModel.ts    { month: string }
      GetMonthlyProgressResponseModel.ts   (ver §4)
  GetWeeklyProgress/
    (mesma forma: Interactor, Boundaries/, DTOs/)   RequestModel { week?: AAAA-MM-DD }
  GetQuarterlyProgress/
    (mesma forma: Interactor, Boundaries/, DTOs/)
  Exceptions/
    BusinessRuleException.ts
    ResourceNotFoundException.ts

InterfaceAdapters/
  Http/Controllers/
    Progress/GetMonthlyProgressController.ts     Single Action
    Progress/GetQuarterlyProgressController.ts   Single Action
  Presenters/Api/
    GetMonthlyProgressApiPresenter.ts            present() guarda ViewModel; getViewModel()
    GetQuarterlyProgressApiPresenter.ts
  Repositories/
    NotionTypes.ts                tipos de página + interface NotionDatabaseClient (implementada em FD)
    NotionTaskRepository.ts       implementa TaskRepositoryInterface (paginação, só leitura)
    NotionTaskMapper.ts           página Notion → Task, usando o mapeamento de campos;
                                  aceita propriedade de status do tipo `select` ou `status`
    EnvWorkCalendarRepository.ts  implementa WorkCalendarRepositoryInterface a partir da config
  ViewModels/
    GoalTierViewModel.ts, round.ts
    MonthlyProgressViewModel.ts   números arredondados, percentuais, labels prontos
    QuarterlyProgressViewModel.ts

FrameworksAndDrivers/
  Config/loadConfig.ts            env (process.env ou env do Worker) → Config validada
  Notion/NotionHttpClient.ts      fetch na API REST oficial (versão fixada no header)
  Http/HonoApp.ts                 rotas, middleware de sessão, app.onError (exceções → HTTP)
  Security/
    PasswordAuth.ts               login/logout, comparação em tempo constante
    HmacSessionCookie.ts          cookie assinado (Web Crypto HMAC-SHA256)
    MemoryRateLimiter.ts          Node: 5/min por chave (mesma regra do binding)
    clientKey.ts                  Node: IP da conexão; X-Forwarded-For só com TRUST_PROXY
    CloudflareRateLimiter.ts      binding de Rate Limiting do Workers
  Clock/SystemClock.ts
  Providers/CleanArchServiceProvider.ts   composição manual: liga interfaces → implementações
  Entrypoints/
    node.ts                       @hono/node-server + backend/.env + holidays.local.json; só API (127.0.0.1)
    worker.ts                     export default { fetch } (só /api/*, via Pages)
```

**Simplificações deliberadas (em relação a uma aplicação "completa" do livro):**
- Autenticação é mecanismo de entrega, não regra de negócio → middleware em
  `FrameworksAndDrivers`, sem Caso de Uso próprio.
- Estatísticas de apoio (por tipo/solicitante) fazem parte do ResponseModel do mês,
  não são Casos de Uso separados.
- Sem container de DI: `CleanArchServiceProvider` é uma função que instancia e conecta.
- Sem cache e sem banco: cada request consulta o Notion.

### 3.3 Fluxo de um request

`GET /api/progress/monthly?month=2026-11`

1. `HonoApp` valida a sessão e chama `GetMonthlyProgressController`.
2. Controller monta `GetMonthlyProgressRequestModel` e cria `GetMonthlyProgressApiPresenter`.
3. Controller chama `inputBoundary.execute(requestModel, presenter)`.
4. `GetMonthlyProgressInteractor` obtém `Task[]` via `TaskRepositoryInterface`
   e `WorkMonth` via `WorkCalendarRepositoryInterface`; aplica as regras das Entities.
5. Interactor cria `GetMonthlyProgressResponseModel` e chama `presenter.present(response)`
   (via `OutputBoundary`).
6. Controller retorna `presenter.getViewModel()` como JSON.

Exceções de domínio sobem até `app.onError`: `DomainError` e `BusinessRuleException` → 422,
`ResourceNotFoundException` → 404, erro do Notion → 502 com mensagem genérica,
demais → 500. Controllers não têm `try/catch`.

---

## 4. API HTTP

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/health` | não | `{ ok: true }` |
| POST | `/api/login` | não | `{ password }` → define cookie de sessão; 401 se errada; 429 se rate limit |
| POST | `/api/logout` | sim | limpa cookie |
| GET | `/api/progress/monthly?month=YYYY-MM` | sim | padrão: mês corrente |
| GET | `/api/progress/weekly?week=YYYY-MM-DD` | sim | semana (dom–sáb) que contém a data; padrão: semana corrente |
| GET | `/api/progress/quarterly?quarter=YYYY-Qn` | sim | padrão: trimestre corrente |

**ResponseModel mensal (campos):** `month`, `isCurrent`, `period` (`past`/`current`/`future`), `goalHours`, `goalEstimated`,
`workingDays`, `doneHours`, `openHours`, `forecastHours`, `remainingHours`
(meta − realizado, mín. 0), `remainingWorkingDays`, `requiredPacePerDay`,
`dailyCumulative[] { date, doneHours, idealHours }`, `openTasks[] { title, status,
hours, url }`, `doneTaskCount`, `averageHoursPerTask`, `hoursByType[] { type, hours }`,
`hoursByDeveloper[] { developer, hours }`, `hoursByRequester[] { requester, hours }`, `undatedTasks[] { title, url }`,
`week` (`null` fora do mês corrente) `{ start, end, goalHours, doneHours, openHours, forecastHours, remainingWorkdays, pacePerWorkday, projectedHours, delivered{hours,tiers[]}, forecast{hours,tiers[]}, days[] }` (tiers com `remainingHours`, `requiredPerDay`),
`today` (`null` fora do mês corrente) `{ date, isWorkingDay, doneHours, goalHours,
tiers[] { percent, hours, reached } }`,
`tiers[] { percent, goalHours, expectedHours, reached, onTrack, deltaHours }`.

**ResponseModel trimestral:** `quarter`, `goalHours`, `doneHours`, `forecastHours`,
`remainingHours`, `tiers[]` (mesma forma do mensal), `months[] { month, goalHours, doneHours, forecastHours, goalEstimated }`.

O ViewModel arredonda horas a 1 casa e acrescenta percentuais (`donePercent`,
`forecastPercent`).

---

## 5. Configuração (variáveis de ambiente)

`backend/.env` no Node; `npm run cf:secrets` (wrangler secret bulk) no Cloudflare. `backend/.env.example`
versionado; `.env` e `.dev.vars` no `.gitignore`.

| Variável | Obrigatória | Padrão | Uso |
|---|---|---|---|
| `NOTION_TOKEN` | sim (secret) | — | token da integração interna (somente leitura) |
| `NOTION_DATABASE_ID` | sim | — | base de tasks |
| `KAHUY_PASSWORD` | sim (secret) | — | senha do dashboard, mín. 16 caracteres |
| `NOTION_FIELD_TITLE` | não | `Task` | |
| `NOTION_FIELD_HOURS` | não | `Horas` | |
| `NOTION_FIELD_STATUS` | não | `Status` | |
| `NOTION_FIELD_DATE` | não | `Data` | |
| `NOTION_FIELD_TYPE` | não | `Tipo` | opcional; se ausente na base, a seção some |
| `DONE_STATUSES` | não | `Concluido` | lista separada por vírgula |
| `HOURS_PER_DAY` | não | `8` | |
| `GOAL_TIERS` | não | `100,125` | faixas da meta do dia, em % |
| `WORKING_DAYS` | não | `{}` | JSON, ex. `{"2026-11":19,"2026-12":20}` |
| `HOLIDAYS` | não | — | só férias/folgas pessoais: `{"AAAA-MM-DD":"nome"}`, `["AAAA-MM-DD"]` ou lista separada por vírgula. Somadas aos nacionais de `holidays.json` (versionado, importado no build como `NATIONAL_HOLIDAYS`, vale no Node e no Worker); o pessoal vence em data repetida. No Node, se ausente, vem de `holidays.local.json` (fora do git); `npm run cf:secrets` o envia ao Worker; `npm run holidays -- AAAA` baixa os nacionais (BrasilAPI) |
| `TIMEZONE` | não | `America/Sao_Paulo` | |
| `TEST_TYPES` | não | `TESTE` | tipos de task de teste (nelas o `[nome]` é o dev) |
| `TRUST_PROXY` | não | `false` | Node atrás de proxy reverso próprio: rate limit por `X-Forwarded-For` |
| `ALLOWED_ORIGIN` | não | — | só se o front for hospedado em outro domínio |

`loadConfig` valida tudo na inicialização e falha com mensagem clara (ex.: senha
curta, JSON inválido em `WORKING_DAYS`, campo mapeado que não existe na base é
detectado na primeira consulta → 502 com o nome do campo).

---

## 6. Segurança

- **Token do Notion** só existe no backend; nunca é enviado ao front.
- **Integração do Notion** criada com permissão apenas de leitura e compartilhada
  somente com a base de tasks (README explica).
- **Senha obrigatória** (`KAHUY_PASSWORD` ≥ 16 caracteres); API não sobe sem ela.
  README sugere `openssl rand -base64 24`.
- **Sessão:** `POST /api/login` → cookie `kahuy_session` assinado com HMAC-SHA256
  (chave derivada de `KAHUY_PASSWORD`), `HttpOnly; Secure; SameSite=Strict; Path=/`,
  expira em 30 dias. Trocar a senha invalida todas as sessões.
- Comparação da senha em tempo constante.
- **Rate limit do login:** 5 tentativas/minuto (memória no Node, chave única pois só escuta em
  127.0.0.1 e headers de proxy são forjáveis; binding de Rate Limiting no Workers, por
  `cf-connecting-ip`).
- **Headers no front em produção:** `dist/_headers`, gerado no build do front com a CSP da API, aplica
  CSP/nosniff/Referrer-Policy no Cloudflare Pages (que não passa pelo Hono).
- Node escuta apenas em `127.0.0.1`.
- Respostas com `Content-Security-Policy` restritiva, `X-Content-Type-Options`,
  `Referrer-Policy`.
- Cloudflare Access documentado como camada extra opcional.

---

## 7. Frontend (`frontend/`)

React + Vite + TypeScript + Bootstrap. Pelo livro, a web é um detalhe de entrega; para evitar
o "excesso de engenharia" apontado no artigo em escopos pequenos, o front é
organizado por feature, sem replicar as camadas:

```
frontend/src/
  api/types.ts             reexporta os ViewModels do backend (só tipos)
  api/client.ts            fetch tipado para /api/* (credentials: same-origin; 401 → login)
  features/auth/LoginPage.tsx
  features/monthly/MonthlyPage.tsx  + componentes da tela
  features/quarterly/QuarterlyPage.tsx
  components/              GoalCard, ProgressBar, PeriodPicker, …
  App.tsx                  roteamento simples (login / mês / trimestre)
```

**Tela do mês** (padrão: mês corrente)
- Hoje, Semana e Mês têm o botão **Entregue / Previsto**; o mês só mostra o botão no mês corrente
- Card "Hoje" (só no mês corrente): horas / 8h, barra com marcas em 100% (8h) e 125% (10h),
  quanto falta para a próxima faixa; feriado ou fim de semana sem meta
- Card "Semana" (dados próprios via `/weekly`): as semanas do mês (`weeks`, dom–sáb completas) ficam à
  vista para escolher, com ● na atual; abre na semana corrente (mês corrente) ou na última/primeira semana
  do mês navegado. Ao trocar, o card mostra o loading até chegarem os dados. Horas / meta, status por faixa
  (corrente: ritmo, faltam, h/dia; passada: batida/faltaram; futura: meta e h/dia)
- Card "Mês": horas / meta, %, barra com 100%/125%; por faixa: "no ritmo (+3h) · faltam 133h ·
  8,3h/dia nos próximos 16 dias úteis" (mês passado: batida/faltaram). Ao lado, painel **Seu pace** em destaque:
  média por dia útil × meta diária, h/dia para cada faixa e projeção de fechamento do mês em horas e em %
  da meta (`projectedPercent`)
- Gráfico acumulado: horas concluídas × linhas ideais da meta (100%) e da supermeta (125%)
- Ao lado do gráfico, **Calendário** do mês (`calendar`): dia útil em verde, férias/folga em azul,
  feriado em vermelho, fim de semana apagado; dias úteis futuros mais claros, hoje com contorno; ao passar
  o mouse, a data, o nome da folga e as horas do dia; legenda com a contagem de cada tipo
- No final, **Tasks do mês** em duas listas: **Desenvolvimento** e **Testes** (`kind`: tipo em `TEST_TYPES` = teste,
  demais = desenvolvimento), com filtro único **Todas / Em aberto / Concluídas** (lembrado no navegador).
  Abertas (só no mês corrente) primeiro, depois as concluídas no mês, da mais recente; cada lista mostra
  quantidade e total de horas do filtro; link para o Notion
- Período das tasks: **Mês | Semana** (lembrado). Em Semana, botões com as semanas do mês (domingo a
  sábado, no trecho dentro do mês: `weeks[].inMonthStart/inMonthEnd`) e as horas concluídas de cada uma; abre na semana atual (●)
  ou, em mês passado, na última com tasks. Cada task traz a sua semana (`week`); abertas ficam na semana atual
- Apoio: horas por tipo, de teste por dev e por solicitante; nº de tasks concluídas e média h/task (no card do mês)
- Aviso quando a meta é estimada (ano sem feriados cadastrados), há tasks sem data ou tasks inválidas

**Tela do trimestre**
- Card "Trimestre" com **Entregue / Previsto** (`delivered`/`forecast`), igual ao mês: horas / meta, %, barra
  com 100%/125% e, por faixa, ritmo, faltam e h/dia nos dias úteis restantes do trimestre. O botão só
  aparece no trimestre corrente (nos outros não há tasks em aberto, então previsto = entregue)
- Barras por mês: meta × entregue ou previsto (segue o botão). No trimestre corrente, linha tracejada no mês
  atual com o **esperado até hoje** (100%, `months[].expectedHours`: meta × dias úteis encerrados ÷ dias
  úteis do mês) e legenda com o valor

**Navegação:** mês por botões: ano em ‹ 2026 › (só troca os meses mostrados, sem buscar) e os 12 meses
à vista, com ● no mês atual; clicar num mês busca os dados. Enquanto carrega, os outros meses ficam
desabilitados; uma busca em andamento é cancelada se o período mudar
(AbortController), então nunca há respostas velhas nem requisições acumuladas. Trimestre: o mesmo seletor,
com ‹ ano › e 1º–4º tri (● no atual). Componente único `YearPicker`. Logout.

**Loading:** cada card que depende da API mostra o próprio estado de carregamento (conteúdo atenuado e
bloqueado, spinner no centro do card). Primeira carga: os cards já aparecem no lugar, cada um com o seu
spinner. Troca de mês/trimestre: todos os cards da página; troca de semana: só o card Semana (os botões
de semana seguem ativos).

**Visual:** Bootstrap 5 via Sass (variáveis customizadas, sem `react-bootstrap`), minimalista:
preto `#1b1b1b` (barra lateral, textos fortes), verde `#1fa64a` (primária, progresso, linha
"realizado"), branco/cinza claro `#f7f7f7` (fundo, cards brancos com borda sutil), cinza médio
para linha ideal e textos secundários, vermelho só para alerta. Fonte Inter. Barra lateral
preta com logo e itens com ícones do Font Awesome (Mês, Trimestre, Recolher, Sair); pode ser recolhida
só para os ícones (lembrado no navegador); no celular vira barra no topo com menu hambúrguer. Login: tela branca
centralizada, logo, campo de senha, botão verde. Sem modo escuro na v1.

Gráficos com Recharts nas cores da paleta. Sem gerenciador de estado global.

---

## 8. Execução e deploy

- `npm run setup`: instala `backend/` e `frontend/`.
- `npm run dev`: backend em Node (`tsx watch`, 127.0.0.1:8787, só API) e Vite (:5173, proxy de
  `/api`). Local agnóstico: sem wrangler. Front buildado: `npm run build && npm --prefix frontend run preview` (:4173).
- Deploy: dois projetos Cloudflare na mesma conta — Worker `kahuy-api` (`backend/`, sem URL pública,
  `workers_dev = false`) e depois Pages `kahuy` (`frontend/`, build + `wrangler pages deploy`); `npm run deploy`
  na raiz faz os dois. A Pages Function `functions/api/[[path]].ts` repassa `/api/*` ao Worker por
  service binding: mesmo domínio para o navegador (cookie `SameSite=Strict`, sem CORS) e
  `cf-connecting-ip` preservado.
- Rate limit de login: 5/min por IP nos dois ambientes (memória + IP da conexão no Node, com
  `TRUST_PROXY` opcional; binding `LOGIN_LIMITER` + `cf-connecting-ip` no Worker).
- CI em push/PR: testes + typecheck do backend; typecheck + build do front.
- Atualizar: `git pull && npm run setup && npm run deploy`.

---

## 9. Testes

Vitest em `backend/`.
- **Entities:** regras de Task (concluída, mês de conclusão, solicitante), WorkMonth
  (meta, estimada), Quarter (meses, meta), YearMonth (fuso).
- **Interactors:** com implementações em memória dos Contracts e `ClockInterface`
  fixo — realizado, previsão (mês corrente × passado), ritmo, linha ideal,
  agregações, tasks sem data.
- **NotionTaskMapper:** fixtures JSON de páginas reais (status `select` e `status`,
  horas vazias, data sem fim).
- **Presenters/ViewModels:** arredondamento e percentuais.
- **HonoApp:** login (ok, senha errada, rate limit), rota protegida sem cookie → 401.

Front: sem testes automatizados na v1 (só renderiza o ViewModel).

---

## 10. Fora do escopo da v1

Editar tasks no Notion; feriados automáticos; múltiplos usuários na mesma instância;
cache/banco; notificações; OAuth do Notion; outras fontes além do Notion.
