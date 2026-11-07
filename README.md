<p align="center"><img src="logo.png" width="96" alt="kahuy" /></p>

# kahuy

A self-hosted dashboard for people who log their work tasks in **Notion** and have a **monthly hours
goal**. It reads your database (read-only) and shows your progress against 100% and 125% of the goal.

- **Today**: hours vs. the daily goal
- **Week** (Sun–Sat, any week): what's missing, hours/day needed, and your pace
- **Month**: done, forecast, pace, cumulative chart with goal lines, a calendar (workdays, vacation,
  holidays), hours by type/dev/requester, and the task list (development and testing), by month or week
- **Quarter**: the three months combined, any quarter of any year

Today, week, and month switch between **Delivered** (done tasks only) and **Forecast** (+ open tasks).
The UI is in Brazilian Portuguese.

Each person connects their own database and runs their own instance: locally, or for free on Cloudflare.

```
backend/    API: Hono + TypeScript, Clean Architecture  → Cloudflare Worker
frontend/   dashboard: React + Vite + Bootstrap         → Cloudflare Pages
docs/       spec and diagrams
deploy.sh   deploy script (API and front separately)
```

## Run locally

Requires Node.js 20.12+.

1. **Create a Notion integration** at <https://www.notion.so/profile/integrations>: internal, with
   **Read content** only. Copy the token, then add the integration to your database (••• → Connections).
   The database ID is the 32 characters before `?` in its URL.
2. **Install and configure:**

   ```bash
   git clone https://github.com/williamtrindade/kahuy.git && cd kahuy
   npm run setup                            # installs backend/ and frontend/
   cp backend/.env.example backend/.env     # fill in NOTION_TOKEN, NOTION_DATABASE_ID, KAHUY_PASSWORD
   openssl rand -base64 24                  # generates a password (min. 16 chars; quote it if it has #)
   ```

3. **Start:** `npm run dev`, then open <http://localhost:5173>. The API listens on `127.0.0.1:8787` only.

## Your configuration

Only two files are yours. Both are sensitive and both are git-ignored, so they never leave your machine
except as Cloudflare secrets.

| File | What it holds | Create it from |
|---|---|---|
| `backend/.env` | Notion token, database ID, password, and your preferences | `backend/.env.example` |
| `backend/holidays.local.json` | your vacation and personal days off | `backend/holidays.local.example.json` |

Everything else is the same for everyone and is versioned. National holidays (Brazil) live in
`backend/holidays.json`; add a new year with `npm --prefix backend run holidays -- 2028`.

Different column or status names in your database? Set `NOTION_FIELD_*`, `DONE_STATUSES`, and
`TEST_TYPES` in `.env`. Full reference: [variables](backend/README.md#variables),
[holidays](backend/README.md#holidays), [where each file lives](backend/README.md#where-things-live).

## How hours are counted

| | Rule |
|---|---|
| Done | Tasks whose status is in `DONE_STATUSES`, counted on the day of their **end date** |
| Open | Any other status; counted in the current period only (that's the forecast) |
| Workday | Mon–Fri, excluding national holidays and your days off |
| Goal | workdays × `HOURS_PER_DAY`; quarter = sum of its months; tiers from `GOAL_TIERS` (100, 125) |
| On track | done ≥ goal × (workdays already closed ÷ workdays in the period); today doesn't count yet |
| `[Name]` in a title | the **developer** in test tasks (`TEST_TYPES`), the **requester** in all others |

All rules are in the [spec](docs/superpowers/specs/2026-11-05-kahuy-design.md).

## Deploy to Cloudflare (free)

The API runs as the Worker `kahuy-api` (no public URL) and the front as the Pages project `kahuy`, in the
same account. Pages forwards `/api/*` to the Worker through a service binding, so everything is served
from one domain.

**Deploy the API first.** The Pages project binds to the Worker, and secrets can only be sent once the
Worker exists.

### With the script

```bash
./deploy.sh all       # first time: api → secrets → front
./deploy.sh api       # runs tests, then deploys the Worker
./deploy.sh secrets   # sends backend/.env + holidays.local.json as Worker secrets
./deploy.sh front     # builds and deploys Pages (creates the project the first time)
```

The script logs you in to Cloudflare when needed and stops on the first error. Your site is then at
`https://kahuy.pages.dev`.

### What to redeploy

| You changed | Run |
|---|---|
| API code (`backend/`) | `./deploy.sh api` |
| `.env` or your days off | `./deploy.sh secrets` (applies immediately, no redeploy) |
| Front code (`frontend/`) | `./deploy.sh front` |
| An API response shape (ViewModels) | `api`, then `front` right after |

If `.env` defines `HOLIDAYS`, it overrides `holidays.local.json`.

### Without the script

```bash
cd backend
npx wrangler login       # first time only
npm run deploy           # Worker
npm run cf:secrets       # secrets

cd ../frontend
npx wrangler pages project create kahuy --production-branch main   # first time only
npm run deploy           # Pages
```

### From the Cloudflare dashboard (deploys on every push)

Point both projects at this repository, each with its own folder. Create the Worker first.

| Field | Worker `kahuy-api` | Pages `kahuy` |
|---|---|---|
| Where | *Workers & Pages → Create → Workers → Import a repository* | *Workers & Pages → Create → Pages → Connect to Git* |
| Name | `kahuy-api` | `kahuy` |
| Branch | `main` | `main` |
| Root directory | `backend` | `frontend` |
| Framework preset | | *None* |
| Build command | | `npm run build` |
| Deploy command / output | `npx wrangler deploy` | `dist` |
| Variables | *Settings → Variables and Secrets*: everything in your `.env`, as **Secret** | `NODE_VERSION=22` |

The `API → kahuy-api` binding comes from `frontend/wrangler.toml` and the login rate limit from
`backend/wrangler.toml`; neither needs dashboard setup. Optional: put the domain behind Cloudflare Access
(Zero Trust → Access) and allow only your e-mail.

## Security

- The Notion token lives only in the backend; the integration is read-only.
- The password is required and compared in constant time. The session is an HMAC-signed
  `HttpOnly; Secure; SameSite=Strict` cookie valid for 30 days. Sessions are stateless, so logging out
  only clears the cookie; change `KAHUY_PASSWORD` to revoke every session.
- Login is limited to 5 attempts per minute per IP. The API and the front share the same strict CSP.

## Development

```bash
npm test             # backend tests (Vitest)
npm run typecheck    # backend + frontend
npm run build        # frontend
```

CI runs all three on every push and pull request. Architecture and conventions:
[`AGENTS.md`](AGENTS.md) and the [diagrams](docs/architecture/).

## License

MIT
