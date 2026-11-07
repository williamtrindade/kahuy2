# AGENTS.md

Guia para agentes de IA (e humanos) que trabalham neste repositório.

**Kahuy** é um dashboard que lê as tasks de uma base do Notion e mostra o progresso em relação à meta
de horas (dia, semana, mês, trimestre). Cada pessoa hospeda a própria instância (Node local ou Cloudflare).

- Spec (fonte da verdade, regras de negócio no §2): [`docs/superpowers/specs/2026-11-05-kahuy-design.md`](docs/superpowers/specs/2026-11-05-kahuy-design.md)
- Diagramas: [`architecture.svg`](docs/architecture/architecture.svg) (back) e [`infra.svg`](docs/architecture/infra.svg)

```
backend/    API · Hono + TypeScript, Clean Architecture → Worker kahuy-api
frontend/   React + Vite + Bootstrap → Pages kahuy
docs/       spec, plano, diagramas
package.json  atalhos: setup, dev, start, test, typecheck, build, deploy
```

## Backend (`backend/src`): arquitetura obrigatória

O backend segue a Arquitetura Limpa (Robert C. Martin) com a organização e os nomes de Trindade & Freitas, *"Implementando
Arquitetura Limpa em uma API REST Laravel baseada em MVC"* (ComInG, 2026, doi:10.5902/2448190495410).

```
Entities/                        regras corporativas + DomainError (→ 422)
UseCases/
  Contracts/                     …RepositoryInterface, ClockInterface
  <Nome>/<Nome>Interactor.ts · Boundaries/<Nome>{Input,Output}Boundary.ts · DTOs/<Nome>{Request,Response}Model.ts
  Shared/ · Exceptions/          BusinessRuleException, ResourceNotFoundException
InterfaceAdapters/
  Http/Controllers/<Grupo>/<Nome>Controller.ts   (Single Action)
  Presenters/Api/ · ViewModels/ · Repositories/  (implementações + Mappers; NotionTypes)
FrameworksAndDrivers/            Hono, Notion HTTP, Security, Config, Clock,
                                 Providers/CleanArchServiceProvider, Entrypoints/{node,worker}.ts
```

1. **Regra da Dependência:** os imports só apontam para dentro. `Entities/` e `UseCases/` nunca importam
   Hono, Notion, Node, Cloudflare nem `process.env`.
2. **Fluxo:** o Controller cria o RequestModel e o Presenter e chama `inputBoundary.execute(request, presenter)`.
   O Interactor chama `presenter.present(response)` e o Controller devolve `presenter.getViewModel()`.
3. **Controllers não têm `try/catch`.** Os erros viram HTTP no `app.onError`.
4. **Sem container de DI.** As ligações ficam só em `CleanArchServiceProvider.ts`.
5. **Só APIs presentes no Node e no Workers** (`fetch`, Web Crypto). O que for específico de runtime fica em `Entrypoints/`.
6. **Caso de uso novo** é uma pasta nova em `UseCases/`, com a mesma forma.
7. **Autenticação** é middleware, não caso de uso.

## Frontend (`frontend/`)

- Organizado por feature (`features/`, `components/`, `api/`); não replica as camadas do back.
- **Nenhuma regra de meta no front.** Faltou um dado? Ele entra no ViewModel da API.
- `src/api/types.ts` só reexporta tipos de `backend/src/InterfaceAdapters/ViewModels/`. O front nunca
  importa código de runtime do backend; a exceção é a CSP (`securityHeaders.ts`, sem imports), usada pelo `vite.config.ts`.
- Bootstrap 5 via Sass, sem `react-bootstrap`. Ícones: Font Awesome via `@fortawesome/react-fontawesome`
  (SVG no bundle; nada de CDN, que exigiria mudar a CSP). Paleta: preto `#1b1b1b`, verde `#1fa64a`, fundo `#f7f7f7`;
  vermelho só para alerta.
- Chamadas sempre relativas a `/api/*`: em dev o Vite faz proxy; em produção, a Pages Function repassa ao Worker.

## Diagramas: manter sincronizados

| Diagrama | Script | Conferir quando mudar… |
|---|---|---|
| `architecture.svg` | `generate.py` | camadas, componentes, nomes ou dependências do back |
| `infra.svg` | `generate_infra.py` | portas, scripts, deploy, Cloudflare, CI, arquivos de config |

Edite o modelo no script, rode `python3 docs/architecture/generate*.py` e confira a renderização
(`google-chrome --headless=new --screenshot=/tmp/x.png --window-size=1500,1300 docs/architecture/infra.svg`).
Não edite `.svg`/`.excalidraw` à mão. No resumo da mudança, diga se o diagrama mudou ou foi conferido.

## Segurança: nunca violar

- **Nunca** versionar `backend/.env`, `.dev.vars`, `holidays.local.json`, tokens, senhas, IDs de base ou folgas pessoais.
  Só `backend/.env` e `backend/holidays.local.json` são da pessoa; modelos fictícios em `*.example*`.
  Mapa completo: [`backend/README.md#where-things-live`](backend/README.md#where-things-live).
- O token do Notion só existe no back: nunca vai ao front nem aos logs. A integração é **somente leitura**.
- `KAHUY_PASSWORD` é obrigatória (≥ 16 caracteres) e comparada em tempo constante. A sessão é um cookie
  `HttpOnly; Secure; SameSite=Strict` assinado com HMAC.
- O Node escuta só em `127.0.0.1`.
- O login aceita 5 tentativas por minuto por IP: `MemoryRateLimiter` + IP da conexão no Node (`X-Forwarded-For`
  só com `TRUST_PROXY=true`), binding `LOGIN_LIMITER` + `cf-connecting-ip` no Worker. Não confiar em headers forjáveis.

## Testes e CI

- Vitest em `backend/`. Entities e Interactors usam fakes em memória e `ClockInterface` fixo, sem rede nem Hono;
  o `NotionTaskMapper` usa fixtures JSON. Toda regra de negócio nova vem com teste.
- CI (push na `main` e PR): backend `test` + `typecheck`; frontend `build` (typecheck incluso).
  Não fazer merge com CI vermelho.

## Convenções

- TypeScript estrito. Código em inglês, com os sufixos do livro/artigo (`Interactor`, `InputBoundary`,
  `RequestModel`, `ApiPresenter`, `ViewModel`, `RepositoryInterface`). UI, spec e conversa em português; os
  READMEs (raiz, `backend/`, `frontend/`) em inglês.
- Commits pequenos; não commitar sem pedido do mantenedor.
- Mudou regra ou arquitetura? Atualize spec e diagrama no mesmo commit. Mudou rota, variável, comando
  ou tela? Atualize o README correspondente (raiz, `backend/` ou `frontend/`).
