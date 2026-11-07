"""Gera docs/architecture/infra.excalidraw e infra.svg (mesmo padrão visual de generate.py).

Uso: python3 docs/architecture/generate_infra.py

Mostra a infraestrutura: desenvolvimento local (Node + Vite puros), produção no Cloudflare
(Pages + Worker) e o fluxo de entrega (scripts, deploy, CI). Edite ZONES/BOXES/ARROWS e rode de novo.
"""

import json
import sys
from html import escape
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate import BLACK, GREEN, GREY, WHITE, _base, _text  # noqa: E402

OUT = Path(__file__).resolve().parent
W, H = 1500, 1300
TITLE_FS, LINE_FS, LINE_H = 15, 13, 19

ZONES = [
    # id, nome, descrição, x, y, w, h, cor
    ("local", "Desenvolvimento local", "agnóstico: Node + Vite puros, sem wrangler · npm run dev na raiz sobe os dois",
     20, 70, 1170, 330, "#f4f4f4"),
    ("prod", "Produção · Cloudflare", "Pages (front) + Worker (API) separados · mesmo domínio via service binding (cookie Strict)",
     20, 440, 1170, 400, "#e6f4ea"),
    ("ship", "Entrega", "um repositório: backend/ (API) e frontend/ (dashboard) · deploy e CI",
     20, 880, 1460, 330, "#ececec"),
]

# id: (x, y, w, h, título, linhas, estilo)  estilo: box | ext (externo) | opt (opcional/planejado)
BOXES = {
    # --- local
    "l_browser": (40, 130, 220, 110, "Navegador", ["localhost:5173"], "ext"),
    "l_vite": (320, 130, 260, 110, "frontend/ · Vite dev", ["React + Bootstrap", ":5173 · proxy /api → :8787", "(destino: KAHUY_API)"], "box"),
    "l_back": (640, 120, 320, 130, "backend/ · Node (só API)", ["tsx watch · Hono (node.ts)", "127.0.0.1:8787 (só local)", "MemoryRateLimiter 5/min por IP", "IP da conexão (TRUST_PROXY opcional)"], "box"),
    "l_cmd": (320, 290, 260, 90, "npm run dev (raiz)", ["backend/: API · frontend/: Vite", "preview do front: :4173"], "box"),
    "l_cfg": (640, 290, 320, 90, "Config · backend/", [".env · holidays.json", "holidays.local.json (fora do git)"], "box"),
    # --- externos compartilhados
    "notion": (1230, 380, 240, 110, "Notion API", ["REST oficial", "somente leitura"], "ext"),
    # --- produção
    "p_browser": (40, 500, 220, 110, "Navegador", ["https://kahuy", ".pages.dev"], "ext"),
    "p_access": (40, 660, 220, 100, "Cloudflare Access", ["login por e-mail", "(opcional)"], "opt"),
    "p_edge": (320, 500, 260, 110, "Pages Function", ["functions/api/[[path]].ts", "/api/* → env.API.fetch()", "(service binding)"], "box"),
    "p_assets": (320, 660, 260, 150, "Pages · kahuy (estático)", ["frontend/dist/", "_headers gerado no build", "(CSP de securityHeaders.ts)", "SPA fallback"], "box"),
    "p_worker": (640, 490, 320, 140, "Worker kahuy-api · backend/", ["worker.ts → mesmo app Hono", "workers_dev = false (sem URL)", "sessão HMAC (cookie Strict)", "Clean Architecture"], "box"),
    "p_rl": (640, 670, 320, 140, "Rate Limiting binding", ["LOGIN_LIMITER (wrangler.toml)", "5 tentativas / 60 s", "chave: cf-connecting-ip", "contador do Cloudflare"], "box"),
    "p_secrets": (1000, 670, 170, 140, "Secrets", ["NOTION_TOKEN", "KAHUY_PASSWORD", "HOLIDAYS (folgas)", "…"], "box"),
    # --- entrega
    "s_git": (40, 960, 190, 100, "GitHub", ["kahuy", "backend/ + frontend/", "git push / PR"], "ext"),
    "s_ci": (310, 960, 250, 120, "GitHub Actions · CI", ["backend: test + typecheck", "frontend: typecheck + build", "(tipos = ViewModels do back)"], "box"),
    "s_deploy": (600, 960, 280, 120, "./deploy.sh api · front", ["api: testes + wrangler deploy", "front: build + wrangler", "pages deploy (cada um à parte)"], "box"),
    "s_secrets": (920, 960, 260, 120, "./deploy.sh secrets", ["backend/.env + holidays.local.json", "→ wrangler secret bulk"], "box"),
    "s_hol": (1220, 960, 240, 100, "backend/ · npm run holidays", ["-- AAAA: nacionais", "→ holidays.json (vai no build)"], "box"),
    "brasilapi": (1220, 1100, 240, 80, "BrasilAPI", ["feriados nacionais"], "ext"),
}

# (de, lado, fração, para, lado, fração, rótulo, tipo)  tipo: req (requisição) | cfg (config/deploy)
ARROWS = [
    ("l_browser", "r", 0.5, "l_vite", "l", 0.5, "HTTP", "req"),
    ("l_vite", "r", 0.5, "l_back", "l", 0.5, "/api/*", "req"),
    ("l_back", "r", 0.3, "notion", "t", 0.3, "fetch", "req"),
    ("l_cmd", "t", 0.5, "l_vite", "b", 0.5, "sobe", "cfg"),
    ("l_cmd", "r", 0.5, "l_cfg", "l", 0.5, "", "cfg"),
    ("l_cfg", "t", 0.5, "l_back", "b", 0.5, "lê", "cfg"),
    ("p_browser", "r", 0.5, "p_edge", "l", 0.5, "HTTPS", "req"),
    ("p_edge", "b", 0.5, "p_assets", "t", 0.5, "/*", "req"),
    ("p_edge", "r", 0.5, "p_worker", "l", 65 / 140, "/api/*", "req"),
    ("p_worker", "b", 0.5, "p_rl", "t", 0.5, "login: limit(ip)", "req"),
    ("p_worker", "r", 0.4, "notion", "l", 0.7, "fetch", "req"),
    ("p_secrets", "t", 0.5, "p_worker", "r", 0.85, "env", "cfg"),
    ("p_access", "t", 0.5, "p_browser", "b", 0.5, "protege", "cfg"),
    ("s_git", "r", 0.5, "s_ci", "l", 50 / 120, "push/PR", "cfg"),
    ("s_deploy", "t", 0.3, "p_assets", "b", 0.7, "Pages", "cfg"),
    ("s_deploy", "t", 0.75, "p_rl", "b", 0.4, "Worker + binding", "cfg"),
    ("s_secrets", "t", 0.4, "p_secrets", "b", 0.5, "secrets", "cfg"),
    ("s_hol", "b", 0.5, "brasilapi", "t", 0.5, "fetch", "cfg"),
]


def point(box, side, frac):
    x, y, w, h = box[:4]
    return {
        "l": (x, y + h * frac),
        "r": (x + w, y + h * frac),
        "t": (x + w * frac, y),
        "b": (x + w * frac, y + h),
    }[side]


def label_pos(x1, y1, x2, y2):
    """Horizontal: acima da seta. Vertical: à direita. Diagonal: no meio, com fundo."""
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    if abs(y1 - y2) < 1:
        return mx, my - 8, "middle", False
    if abs(x1 - x2) < 1:
        return mx + 8, my + 4, "start", False
    return mx, my + 4, "middle", True


def svg():
    o = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" '
        f'font-family="Inter, Helvetica, Arial, sans-serif">',
        "<defs>",
        f'<marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">'
        f'<path d="M0,0 L10,5 L0,10 z" fill="{GREY}"/></marker>',
        f'<marker id="g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">'
        f'<path d="M0,0 L10,5 L0,10 z" fill="{GREEN}"/></marker>',
        "</defs>",
        f'<rect width="{W}" height="{H}" fill="{WHITE}"/>',
        f'<text x="20" y="42" font-size="24" font-weight="700" fill="{BLACK}">kahuy · infraestrutura</text>',
    ]
    for _, name, desc, x, y, w, h, fill in ZONES:
        o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{fill}" stroke="{BLACK}" stroke-width="1.5"/>')
        o.append(f'<text x="{x + 18}" y="{y + 30}" font-size="17" font-weight="700" fill="{BLACK}">{escape(name)}'
                 f'<tspan font-size="13" font-weight="400" fill="{GREY}" dx="12">{escape(desc)}</tspan></text>')
    for x, y, w, h, title, lines, style in BOXES.values():
        dash = ' stroke-dasharray="6 4"' if style != "box" else ""
        o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{WHITE}" stroke="{BLACK}" stroke-width="1.2"{dash}/>')
        color = GREEN if style == "box" else BLACK
        o.append(f'<text x="{x + 12}" y="{y + 24}" font-size="{TITLE_FS}" font-weight="700" fill="{color}">{escape(title)}</text>')
        for i, line in enumerate(lines):
            o.append(f'<text x="{x + 12}" y="{y + 24 + LINE_H * (i + 1)}" font-size="{LINE_FS}" fill="{BLACK}">{escape(line)}</text>')
    for src, ss, sf, dst, ds, df, label, kind in ARROWS:
        x1, y1 = point(BOXES[src], ss, sf)
        x2, y2 = point(BOXES[dst], ds, df)
        req = kind == "req"
        dash = "" if req else ' stroke-dasharray="6 4"'
        o.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{GREEN if req else GREY}" '
                 f'stroke-width="1.8"{dash} marker-end="url(#{"g" if req else "a"})"/>')
        if label:
            lx, ly, anchor, bg = label_pos(x1, y1, x2, y2)
            if bg:
                tw = len(label) * 6.6 + 10
                o.append(f'<rect x="{lx - tw / 2:.1f}" y="{ly - 14:.1f}" width="{tw:.1f}" height="18" rx="4" fill="{WHITE}" opacity="0.92"/>')
            o.append(f'<text x="{lx:.1f}" y="{ly:.1f}" font-size="12" text-anchor="{anchor}" fill="{BLACK}">{escape(label)}</text>')
    # legenda
    lx, ly = 1230, 520
    o.append(f'<text x="{lx}" y="{ly}" font-size="14" font-weight="700" fill="{BLACK}">Legenda</text>')
    o.append(f'<line x1="{lx}" y1="{ly + 20}" x2="{lx + 50}" y2="{ly + 20}" stroke="{GREEN}" stroke-width="1.8" marker-end="url(#g)"/>')
    o.append(f'<text x="{lx + 62}" y="{ly + 24}" font-size="13" fill="{BLACK}">requisição</text>')
    o.append(f'<line x1="{lx}" y1="{ly + 44}" x2="{lx + 50}" y2="{ly + 44}" stroke="{GREY}" stroke-width="1.8" stroke-dasharray="6 4" marker-end="url(#a)"/>')
    o.append(f'<text x="{lx + 62}" y="{ly + 48}" font-size="13" fill="{BLACK}">config / deploy</text>')
    o.append(f'<rect x="{lx}" y="{ly + 60}" width="50" height="18" rx="4" fill="{WHITE}" stroke="{BLACK}" stroke-dasharray="6 4"/>')
    o.append(f'<text x="{lx + 62}" y="{ly + 73}" font-size="13" fill="{BLACK}">externo / opcional</text>')
    o.append(f'<text x="{lx}" y="{ly + 110}" font-size="12" fill="{GREY}">Mesmo app Hono nos dois ambientes:</text>')
    o.append(f'<text x="{lx}" y="{ly + 128}" font-size="12" fill="{GREY}">só muda a entrada (node.ts / worker.ts)</text>')
    o.append(f'<text x="{lx}" y="{ly + 146}" font-size="12" fill="{GREY}">e o RateLimiter (memória / binding).</text>')
    o.append("</svg>")
    return "\n".join(o) + "\n"


def excalidraw():
    els = [_text("title", 20, 18, "kahuy · infraestrutura", 24)]
    for zid, name, desc, x, y, w, h, fill in ZONES:
        els.append(_base("rectangle", f"zone_{zid}", x, y, w, h, fill=fill, strokeWidth=2))
        els.append(_text(f"zone_{zid}_t", x + 18, y + 12, name, 17))
        els.append(_text(f"zone_{zid}_d", x + 18 + len(name) * 17 * 0.62 + 12, y + 15, desc, 13, GREY))
    for bid, (x, y, w, h, title, lines, style) in BOXES.items():
        g = [f"g_{bid}"]
        els.append(_base("rectangle", bid, x, y, w, h, fill=WHITE,
                         strokeStyle="solid" if style == "box" else "dashed", groupIds=g))
        els.append(_text(f"{bid}_t", x + 12, y + 8, title, TITLE_FS, GREEN if style == "box" else BLACK, groupIds=g))
        els.append(_text(f"{bid}_l", x + 12, y + 30, "\n".join(lines), LINE_FS, groupIds=g))
    for i, (src, ss, sf, dst, ds, df, label, kind) in enumerate(ARROWS):
        x1, y1 = point(BOXES[src], ss, sf)
        x2, y2 = point(BOXES[dst], ds, df)
        req = kind == "req"
        els.append(_base("arrow", f"arrow_{i}", x1, y1, x2 - x1, y2 - y1, stroke=GREEN if req else GREY,
                         strokeWidth=2, strokeStyle="solid" if req else "dashed", roundness={"type": 2},
                         points=[[0, 0], [x2 - x1, y2 - y1]], lastCommittedPoint=None,
                         startBinding={"elementId": src, "focus": 0, "gap": 2},
                         endBinding={"elementId": dst, "focus": 0, "gap": 2},
                         startArrowhead=None, endArrowhead="arrow"))
        if label:
            lx, ly, anchor, _ = label_pos(x1, y1, x2, y2)
            els.append(_text(f"arrow_{i}_l", lx, ly - 12, label, 12, align="center" if anchor == "middle" else "left"))
    by_id = {e["id"]: e for e in els}
    for e in els:
        if e["type"] == "arrow":
            for side in ("startBinding", "endBinding"):
                tgt = by_id[e[side]["elementId"]]
                tgt["boundElements"] = (tgt["boundElements"] or []) + [{"id": e["id"], "type": "arrow"}]
    els.append(_text("legend", 1230, 510,
                     "Legenda\n→ verde: requisição\n⇢ cinza: config / deploy\n▭ tracejado: externo / opcional\n\n"
                     "Mesmo app Hono nos dois ambientes:\nsó muda a entrada (node.ts / worker.ts)\n"
                     "e o RateLimiter (memória / binding).", 13))
    doc = {"type": "excalidraw", "version": 2, "source": "kahuy/docs/architecture/generate_infra.py",
           "elements": els, "appState": {"viewBackgroundColor": WHITE, "gridSize": None}, "files": {}}
    return json.dumps(doc, indent=2, ensure_ascii=False) + "\n"


if __name__ == "__main__":
    (OUT / "infra.svg").write_text(svg(), encoding="utf-8")
    (OUT / "infra.excalidraw").write_text(excalidraw(), encoding="utf-8")
    print("ok:", OUT / "infra.svg", OUT / "infra.excalidraw")
