"""Gera docs/architecture/architecture.excalidraw e architecture.svg a partir de um único modelo.

Uso: python3 docs/architecture/generate.py

Sempre que a arquitetura do back mudar, edite MODEL abaixo e rode de novo —
assim o .excalidraw e o .svg nunca divergem entre si nem do código.
"""

import json
import random
from html import escape
from pathlib import Path

OUT = Path(__file__).resolve().parent

# Paleta do projeto
BLACK = "#1b1b1b"
GREEN = "#1fa64a"
GREY = "#6b6b6b"
WHITE = "#ffffff"

W = 1500
MARGIN_L = 170
MARGIN_R = 20
BAND_PAD = 18
BOX_GAP = 16
TITLE_FS = 15
LINE_FS = 13
LINE_H = 19

EXTERNALS = [
    # (id, título, linhas, coluna-alvo na banda FrameworksAndDrivers)
    ("ext_runtime", "Runtime", ["Node.js (dev / local)", "Cloudflare Workers (prod)"], 0),
    ("ext_browser", "Navegador", ["React + Bootstrap (frontend/)"], 1),
    ("ext_notion", "Notion API", ["REST oficial · somente leitura"], 3),
]

MODEL = [
    {
        "id": "fd",
        "name": "FrameworksAndDrivers",
        "desc": "detalhes: framework web, Notion, runtime, segurança",
        "fill": "#ececec",
        "boxes": [
            ("fd_entry", "Entrypoints/", ["node.ts", "worker.ts"]),
            ("fd_http", "Http/ · Config/ · Clock/", ["HonoApp (rotas, sessão, onError)", "securityHeaders (CSP) · loadConfig", "holidays (build) · SystemClock"]),
            ("fd_sec", "Security/", ["PasswordAuth · HmacSessionCookie", "Memory/CloudflareRateLimiter", "clientKey (IP real)"]),
            ("fd_notion", "Notion/", ["NotionHttpClient", "NotionApiError"]),
            ("fd_prov", "Providers/", ["CleanArchServiceProvider", "(liga interfaces → impl.)"]),
        ],
    },
    {
        "id": "ia",
        "name": "InterfaceAdapters",
        "desc": "convertem dados entre o formato da web/Notion e o dos casos de uso",
        "fill": "#f4f4f4",
        "boxes": [
            ("ia_ctrl", "Http/Controllers/", ["GetMonthlyProgressController", "GetWeeklyProgressController", "GetQuarterlyProgressController"]),
            ("ia_pres", "Presenters/Api/", ["GetMonthlyProgressApiPresenter", "GetWeeklyProgressApiPresenter", "GetQuarterlyProgressApiPresenter"]),
            ("ia_vm", "ViewModels/", ["Monthly · Weekly · Quarterly", "  ProgressViewModel", "Scenario · GoalTier ViewModel · round"]),
            ("ia_repo", "Repositories/", ["NotionTaskRepository · Mapper", "NotionTypes (NotionDatabaseClient)", "EnvWorkCalendarRepository (HOLIDAYS)"]),
        ],
    },
    {
        "id": "uc",
        "name": "UseCases",
        "desc": "regras de negócio da aplicação",
        "fill": "#e6f4ea",
        "boxes": [
            ("uc_month", "GetMonthlyProgress/", [
                "GetMonthlyProgressInteractor",
                "Boundaries/ Input · OutputBoundary",
                "DTOs/ Request · ResponseModel",
            ]),
            ("uc_quarter", "GetWeekly/QuarterlyProgress/", [
                "GetWeeklyProgressInteractor",
                "GetQuarterlyProgressInteractor",
                "Boundaries/ · DTOs/ (mesma forma)",
            ]),
            ("uc_contracts", "Contracts/", [
                "TaskRepositoryInterface",
                "WorkCalendarRepositoryInterface",
                "  (isWorkday · dayOff: feriado/férias)",
                "ClockInterface",
            ]),
            ("uc_exc", "Shared/ · Exceptions/", ["taskAggregations (Scenario, TierOutlook)", "ProgressSettings", "BusinessRule · ResourceNotFound"]),
        ],
    },
    {
        "id": "en",
        "name": "Entities",
        "desc": "regras de negócio corporativas — não dependem de nada",
        "fill": "#c9ebd3",
        "boxes": [
            ("en_task", "Task", ["isDone · completionMonth", "bracketName → developer (teste)", "  ou requester (demais)"]),
            ("en_wm", "WorkMonth", ["diasÚteis × horasPorDia → goal", "workdays (sem feriados)"]),
            ("en_ym", "YearMonth · Week · Quarter", ["value objects de período (Week: dom–sáb)", "time: localDate · isIsoDate (fuso)"]),
            ("en_err", "DomainError", ["violação de regra", "→ HTTP 422"]),
        ],
    },
]

# (de, para, rótulo, tracejado?, fração x na origem, fração x no destino)
ARROWS = [
    ("ext_browser", "fd_http", "HTTPS /api/*", False, 0.5, 0.5),
    ("fd_notion", "ext_notion", "fetch", False, 0.5, 0.5),
    ("fd_http", "ia_ctrl", "chama", False, 0.5, 0.5),
    ("ia_ctrl", "uc_month", "InputBoundary.execute()", False, 0.3, 0.25),
    ("ia_pres", "uc_month", "implementa OutputBoundary", True, 0.4, 0.75),
    ("ia_repo", "uc_contracts", "implementa", True, 0.3, 0.6),
    ("fd_notion", "ia_repo", "implementa NotionDatabaseClient", True, 0.5, 0.6),
    ("uc_month", "en_task", "usa", False, 0.5, 0.5),
    ("uc_quarter", "en_ym", "usa", False, 0.5, 0.4),
]

FLOW = [
    "Fluxo de GET /api/progress/monthly",
    "1  HonoApp valida a sessão e chama o Controller",
    "2  Controller cria o RequestModel e o ApiPresenter",
    "3  Controller → InputBoundary.execute(requestModel, presenter)",
    "4  Interactor lê as tasks (TaskRepositoryInterface) e o calendário (WorkCalendarRepositoryInterface),",
    "   calcula mês e hoje (Entregue/Previsto) com as Entities; a semana tem rota própria (/weekly)",
    "5  Interactor → presenter.present(responseModel) via OutputBoundary",
    "6  Controller devolve presenter.getViewModel() como JSON",
]


# ---------------------------------------------------------------- layout

def layout():
    boxes = {}  # id -> dict(x, y, w, h, title, lines, fill)
    bands = []
    y = 70

    band_x = MARGIN_L
    band_w = W - MARGIN_L - MARGIN_R
    fd_n = len(MODEL[0]["boxes"])
    fd_bw = (band_w - 2 * BAND_PAD - BOX_GAP * (fd_n - 1)) / fd_n

    ext_h = 28 + LINE_H * 2 + 10
    for eid, title, lines, col in EXTERNALS:
        x = band_x + BAND_PAD + col * (fd_bw + BOX_GAP)
        boxes[eid] = dict(x=x, y=y, w=fd_bw, h=ext_h, title=title, lines=lines,
                          fill=WHITE, stroke=BLACK, dashed=True)
    y += ext_h + 50

    for band in MODEL:
        n = len(band["boxes"])
        bw = (band_w - 2 * BAND_PAD - BOX_GAP * (n - 1)) / n
        max_lines = max(len(b[2]) for b in band["boxes"])
        bh = 30 + LINE_H * max_lines + 12
        band_h = 44 + bh + BAND_PAD
        bands.append(dict(id=band["id"], x=band_x, y=y, w=band_w, h=band_h,
                          name=band["name"], desc=band["desc"], fill=band["fill"]))
        for i, (bid, title, lines) in enumerate(band["boxes"]):
            boxes[bid] = dict(x=band_x + BAND_PAD + i * (bw + BOX_GAP), y=y + 44, w=bw, h=bh,
                              title=title, lines=lines, fill=WHITE, stroke=BLACK, dashed=False)
        y += band_h + 34

    flow_y = y + 6
    height = flow_y + LINE_H * len(FLOW) + 70
    return bands, boxes, flow_y, height


def anchor(a, b, fa=0.5, fb=0.5):
    """Ponto de saída de a e de chegada em b (borda superior/inferior, na fração x dada)."""
    ax, ay = a["x"] + a["w"] * fa, a["y"] + a["h"] / 2
    bx, by = b["x"] + b["w"] * fb, b["y"] + b["h"] / 2
    if abs(ay - by) < 1:  # mesma linha → bordas laterais
        if ax < bx:
            return (a["x"] + a["w"], ay), (b["x"], by)
        return (a["x"], ay), (b["x"] + b["w"], by)
    if ay < by:
        return (ax, a["y"] + a["h"]), (bx, b["y"])
    return (ax, a["y"]), (bx, b["y"] + b["h"])


def header_width(b):
    return len(b["name"]) * 17 * 0.62 + 12 + len(b["desc"]) * 13 * 0.55


# ---------------------------------------------------------------- SVG

def svg(bands, boxes, flow_y, height):
    out = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{height}" '
        f'viewBox="0 0 {W} {height}" font-family="Inter, Helvetica, Arial, sans-serif">',
        "<defs>",
        f'<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" '
        f'orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{BLACK}"/></marker>',
        f'<marker id="arrowG" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" '
        f'orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{GREEN}"/></marker>',
        "</defs>",
        f'<rect width="{W}" height="{height}" fill="{WHITE}"/>',
        f'<text x="{MARGIN_L}" y="40" font-size="24" font-weight="700" fill="{BLACK}">'
        f'kahuy · arquitetura do back (backend/src)</text>',
    ]

    for b in bands:
        out.append(f'<rect x="{b["x"]}" y="{b["y"]}" width="{b["w"]}" height="{b["h"]}" rx="10" '
                   f'fill="{b["fill"]}" stroke="{BLACK}" stroke-width="1.5"/>')

    for bid, bx in boxes.items():
        dash = ' stroke-dasharray="6 4"' if bx["dashed"] else ""
        out.append(f'<rect x="{bx["x"]:.1f}" y="{bx["y"]}" width="{bx["w"]:.1f}" height="{bx["h"]}" rx="6" '
                   f'fill="{bx["fill"]}" stroke="{bx["stroke"]}" stroke-width="1.2"{dash}/>')
        cx = bx["x"] + 12
        out.append(f'<text x="{cx:.1f}" y="{bx["y"] + 22}" font-size="{TITLE_FS}" font-weight="700" '
                   f'fill="{GREEN if not bx["dashed"] else BLACK}">{escape(bx["title"])}</text>')
        for i, line in enumerate(bx["lines"]):
            out.append(f'<text x="{cx:.1f}" y="{bx["y"] + 22 + LINE_H * (i + 1)}" font-size="{LINE_FS}" '
                       f'fill="{BLACK}">{escape(line)}</text>')

    for src, dst, label, dashed, fa, fb in ARROWS:
        (x1, y1), (x2, y2) = anchor(boxes[src], boxes[dst], fa, fb)
        color, marker = (GREY, "arrow") if dashed else (GREEN, "arrowG")
        dash = ' stroke-dasharray="6 4"' if dashed else ""
        out.append(f'<line x1="{x1:.1f}" y1="{y1}" x2="{x2:.1f}" y2="{y2}" stroke="{color}" '
                   f'stroke-width="1.8"{dash} marker-end="url(#{marker})"/>')
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        tw = len(label) * 6.6 + 10
        out.append(f'<rect x="{mx - tw / 2:.1f}" y="{my - 10:.1f}" width="{tw:.1f}" height="18" rx="4" '
                   f'fill="{WHITE}" opacity="0.92"/>')
        out.append(f'<text x="{mx:.1f}" y="{my + 4:.1f}" font-size="12" text-anchor="middle" '
                   f'fill="{BLACK}">{escape(label)}</text>')

    for b in bands:
        hw = header_width(b)
        out.append(f'<rect x="{b["x"] + BAND_PAD - 6}" y="{b["y"] + 10}" width="{hw + 12:.1f}" height="26" '
                   f'rx="4" fill="{b["fill"]}"/>')
        out.append(f'<text x="{b["x"] + BAND_PAD}" y="{b["y"] + 28}" font-size="17" font-weight="700" '
                   f'fill="{BLACK}">{escape(b["name"])}<tspan font-size="13" font-weight="400" fill="{GREY}" '
                   f'dx="12">{escape(b["desc"])}</tspan></text>')

    # Regra da Dependência
    top = bands[0]["y"] + 10
    bottom = bands[-1]["y"] + bands[-1]["h"] - 10
    out.append(f'<line x1="70" y1="{top}" x2="70" y2="{bottom}" stroke="{BLACK}" stroke-width="3" '
               f'marker-end="url(#arrow)"/>')
    out.append(f'<text x="70" y="{(top + bottom) / 2}" font-size="14" font-weight="700" fill="{BLACK}" '
               f'text-anchor="middle" transform="rotate(-90 70 {(top + bottom) / 2}) translate(0 -14)">'
               f'Regra da Dependência: sempre para dentro</text>')

    # Legenda + fluxo
    lx = MARGIN_L
    out.append(f'<text x="{lx}" y="{flow_y + 14}" font-size="14" font-weight="700" fill="{BLACK}">'
               f'{escape(FLOW[0])}</text>')
    for i, line in enumerate(FLOW[1:]):
        out.append(f'<text x="{lx}" y="{flow_y + 14 + LINE_H * (i + 1)}" font-size="13" fill="{BLACK}">'
                   f'{escape(line)}</text>')
    gx = W - MARGIN_R - 330
    out.append(f'<line x1="{gx}" y1="{flow_y + 10}" x2="{gx + 50}" y2="{flow_y + 10}" stroke="{GREEN}" '
               f'stroke-width="1.8" marker-end="url(#arrowG)"/>')
    out.append(f'<text x="{gx + 62}" y="{flow_y + 14}" font-size="13" fill="{BLACK}">usa / chama</text>')
    out.append(f'<line x1="{gx}" y1="{flow_y + 34}" x2="{gx + 50}" y2="{flow_y + 34}" stroke="{GREY}" '
               f'stroke-width="1.8" stroke-dasharray="6 4" marker-end="url(#arrow)"/>')
    out.append(f'<text x="{gx + 62}" y="{flow_y + 38}" font-size="13" fill="{BLACK}">implementa interface</text>')
    out.append(f'<rect x="{gx}" y="{flow_y + 50}" width="50" height="18" rx="4" fill="{WHITE}" '
               f'stroke="{BLACK}" stroke-dasharray="6 4"/>')
    out.append(f'<text x="{gx + 62}" y="{flow_y + 63}" font-size="13" fill="{BLACK}">sistema externo</text>')

    out.append("</svg>")
    return "\n".join(out) + "\n"


# ---------------------------------------------------------------- Excalidraw

_rng = random.Random(42)


def _base(kind, eid, x, y, w, h, **kw):
    el = {
        "id": eid, "type": kind, "x": x, "y": y, "width": w, "height": h, "angle": 0,
        "strokeColor": kw.pop("stroke", BLACK), "backgroundColor": kw.pop("fill", "transparent"),
        "fillStyle": "solid", "strokeWidth": kw.pop("strokeWidth", 1),
        "strokeStyle": kw.pop("strokeStyle", "solid"), "roughness": 0, "opacity": 100,
        "groupIds": kw.pop("groupIds", []), "frameId": None,
        "roundness": kw.pop("roundness", {"type": 3}),
        "seed": _rng.randint(1, 2**31), "version": 1, "versionNonce": _rng.randint(1, 2**31),
        "isDeleted": False, "boundElements": None, "updated": 1, "link": None, "locked": False,
    }
    el.update(kw)
    return el


def _text(eid, x, y, text, size, color=BLACK, align="left", groupIds=None):
    lines = text.split("\n")
    w = max(len(l) for l in lines) * size * 0.58
    h = len(lines) * size * 1.25
    if align == "center":
        x -= w / 2
    return _base("text", eid, x, y, w, h, stroke=color, roundness=None, groupIds=groupIds or [],
                 text=text, originalText=text, fontSize=size, fontFamily=2, textAlign=align,
                 verticalAlign="top", containerId=None, lineHeight=1.25, autoResize=True)


def excalidraw(bands, boxes, flow_y, height):
    els = [_text("title", MARGIN_L, 18, "kahuy · arquitetura do back (backend/src)", 24)]

    for b in bands:
        els.append(_base("rectangle", f"band_{b['id']}", b["x"], b["y"], b["w"], b["h"],
                         fill=b["fill"], strokeWidth=2))

    for bid, bx in boxes.items():
        g = [f"g_{bid}"]
        els.append(_base("rectangle", bid, bx["x"], bx["y"], bx["w"], bx["h"], fill=bx["fill"],
                         strokeStyle="dashed" if bx["dashed"] else "solid", groupIds=g))
        els.append(_text(f"{bid}_t", bx["x"] + 12, bx["y"] + 8, bx["title"], TITLE_FS,
                         BLACK if bx["dashed"] else GREEN, groupIds=g))
        els.append(_text(f"{bid}_l", bx["x"] + 12, bx["y"] + 30, "\n".join(bx["lines"]), LINE_FS, groupIds=g))

    for i, (src, dst, label, dashed, fa, fb) in enumerate(ARROWS):
        (x1, y1), (x2, y2) = anchor(boxes[src], boxes[dst], fa, fb)
        aid = f"arrow_{i}"
        els.append(_base("arrow", aid, x1, y1, x2 - x1, y2 - y1,
                         stroke=GREY if dashed else GREEN, strokeWidth=2,
                         strokeStyle="dashed" if dashed else "solid", roundness={"type": 2},
                         points=[[0, 0], [x2 - x1, y2 - y1]], lastCommittedPoint=None,
                         startBinding={"elementId": src, "focus": 0, "gap": 2},
                         endBinding={"elementId": dst, "focus": 0, "gap": 2},
                         startArrowhead=None, endArrowhead="arrow"))
        els.append(_text(f"{aid}_l", (x1 + x2) / 2, (y1 + y2) / 2 - 8, label, 12, align="center"))

    # bindings de volta nos retângulos
    by_id = {e["id"]: e for e in els}
    for e in els:
        if e["type"] == "arrow":
            for side in ("startBinding", "endBinding"):
                tgt = by_id[e[side]["elementId"]]
                tgt["boundElements"] = (tgt["boundElements"] or []) + [{"id": e["id"], "type": "arrow"}]

    for b in bands:
        g = [f"g_band_{b['id']}_h"]
        els.append(_base("rectangle", f"band_{b['id']}_bg", b["x"] + BAND_PAD - 6, b["y"] + 10,
                         header_width(b) + 12, 26, fill=b["fill"], stroke=b["fill"], groupIds=g))
        els.append(_text(f"band_{b['id']}_t", b["x"] + BAND_PAD, b["y"] + 12, b["name"], 17, groupIds=g))
        els.append(_text(f"band_{b['id']}_d", b["x"] + BAND_PAD + len(b["name"]) * 17 * 0.62 + 12,
                         b["y"] + 15, b["desc"], 13, GREY, groupIds=g))

    top = bands[0]["y"] + 10
    bottom = bands[-1]["y"] + bands[-1]["h"] - 10
    els.append(_base("arrow", "dep_rule", 70, top, 0, bottom - top, strokeWidth=4, roundness=None,
                     points=[[0, 0], [0, bottom - top]], lastCommittedPoint=None, startBinding=None,
                     endBinding=None, startArrowhead=None, endArrowhead="arrow"))
    els.append(_text("dep_rule_t", 14, top - 40, "Regra da Dependência:\nsempre para dentro ↓", 13))

    els.append(_text("flow", MARGIN_L, flow_y, "\n".join(FLOW), 13))
    gx = W - MARGIN_R - 330
    els.append(_text("legend", gx, flow_y,
                     "→ verde: usa / chama\n⇢ cinza tracejado: implementa interface\n▭ tracejado: sistema externo", 13))

    doc = {"type": "excalidraw", "version": 2, "source": "kahuy/docs/architecture/generate.py",
           "elements": els, "appState": {"viewBackgroundColor": WHITE, "gridSize": None}, "files": {}}
    return json.dumps(doc, indent=2, ensure_ascii=False) + "\n"


if __name__ == "__main__":
    bands, boxes, flow_y, height = layout()
    (OUT / "architecture.svg").write_text(svg(bands, boxes, flow_y, height), encoding="utf-8")
    (OUT / "architecture.excalidraw").write_text(excalidraw(bands, boxes, flow_y, height), encoding="utf-8")
    print("ok:", OUT / "architecture.svg", OUT / "architecture.excalidraw")
