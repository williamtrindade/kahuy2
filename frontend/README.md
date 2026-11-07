# kahuy · frontend

The kahuy dashboard: React, Vite, Bootstrap (Sass), Recharts, and Font Awesome. It only displays the
ViewModels the API returns; no goal rules live here. The UI is in Brazilian Portuguese.

## Commands

```bash
npm run dev        # Vite on :5173, proxies /api → 127.0.0.1:8787 (other target: KAHUY_API=…)
npm run build      # typecheck + build into dist/ (writes dist/_headers with the API's CSP)
npm run preview    # serves dist/ on :4173 with the same proxy
npm run deploy     # build + wrangler pages deploy (the kahuy-api Worker must exist)
```

## Structure

```
src/api/types.ts          re-exports the backend ViewModels (types only): the contract is checked by tsc
src/api/client.ts         fetch for /api/* (same-origin, abortable)
src/features/             auth/ · monthly/ (Today, Week, Month, chart, calendar, tasks) · quarterly/
src/components/           cards, tier bars, ScenarioToggle, YearPicker (year + months/quarters)
functions/api/[[path]].ts Pages Function: forwards /api/* to the Worker (API service binding)
```

## Look and feel

Minimal: black sidebar (`#1b1b1b`), green (`#1fa64a`) for progress and goals met, `#f7f7f7`
background, red only for "behind". Font: Inter.

Icons come from Font Awesome (`@fortawesome/*`), rendered as inline SVG from the bundle: no CDN, no CSP
change. The sidebar can collapse to icons only (remembered in the browser); on mobile it becomes a top bar
with a hamburger menu.
