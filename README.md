# Nexus Dashboard

Model telemetry, routing and playground for a self-hosted AI gateway. Runs on a
**single CPU core** — every design decision below exists because of that.

> **Status:** early build. The model catalog, live provider list, model test
> runner and playground are working. Early-access model intelligence is the next
> milestone (see [Roadmap](#roadmap)).

---

## Why single-core matters

There is no GPU in this deployment. The backend is CPython, the catalog is
`shutil`-hot-served over a stdlib `BaseHTTPRequestHandler`, and the frontend is
a static Vite bundle. Nothing here needs a build farm to run.

That constraint is the reason for most of the architecture: no Redis, no
Postgres, no ORM, no component library, no state manager. Persistent state is
two JSON files (`model_health.json`, `hidden_store.json`) and `localStorage` for
per-browser view preferences.

It is also the reason this project is a good stress test. If it stays smooth
under this budget, it will stay smooth anywhere.

---

## Architecture

```
┌─ nexus-dashboard.service ──┐        ┌─ nexus-telemetry.service ─┐
│  Vite static bundle         │        │  server.py · stdlib HTTP   │
│  React 19 · react-router    │◄──────►│  Python 3.13 · no deps     │
│  :5173                      │  HTTP  │  :5174                     │
└─────────────────────────────┘        └──────────┬─────────────────┘
                                                   │
                                          ┌────────▼────────────────┐
                                          │  OmniRouter gateway     │
                                          │  OpenAI-compatible      │
                                          │  :20128                 │
                                          └─────────────────────────┘
```

The frontend never talks to the gateway directly. Every call is a telemetry
request, so telemetry stays the single source of truth for what is live.

### Backend endpoints

| Route | Purpose |
|---|---|
| `GET /api/stats` | token/cost rollup for the Cost view |
| `GET /api/health` | liveness probe |
| `GET /api/gateway-status` | gateway reachability |
| `GET /api/providers` | configured providers |
| `GET /api/all-providers` | full provider union |
| `GET /api/live-providers` | provider catalog as the gateway currently sees it |
| `GET /api/model/context?model=` | real context window from `models.dev` |
| `POST /api/model/test` | single-model text probe with latency + 12s deadline |
| `GET /api/visibility` | hidden-model state |
| `POST /api/visibility/reset` | clear hidden-model state |

Gateway credentials are read from the local environment at runtime. They are
never committed, logged, or returned by any endpoint.

---

## Features

**Model catalog** — per-provider live model lists, custom model injection, and
real context windows pulled from `models.dev` rather than assumed. A model that
does not support 200k will not be shown as 200k.

**Model test runner** — a `Test` button on every model card. Sends a minimal text
prompt, returns the response and latency, and reports `Time Out` at 12s instead
of hanging. `Test All` runs the list sequentially so it never floods a provider.

**Hide controls** — failed models can be auto-hidden, or hidden in bulk by
section or entirely. Hiding is a visibility flag, never a delete; model
definitions survive a hide and come back on reset.

**Playground** — Apple Cupertino frosted chat canvas for interactive testing,
with a 12s deadline and a latency badge per response.

**Design system** — hand-written Motion/Material tokens, spring easing
(`cubic-bezier(0.16, 1, 0.3, 1)`), and per-tab micro-animations. No UI library.

---

## Running it

```bash
# frontend build
npm install
npm run build          # → dist/
systemctl --user restart nexus-dashboard

# backend
systemctl --user restart nexus-telemetry
```

Dev mode: `npm run dev` on :5173 with the telemetry service running on :5174.

```bash
systemctl --user list-units | grep nexus
curl -s localhost:5174/api/health
```

---

## Roadmap

**Early-access model intelligence.** Surface which models just landed in early
access, where each one is available, how to claim it, and which providers serve
it cheapest. The point is not news — it is actionable model routing. The
cheapest viable provider is resolved automatically rather than hand-maintained.

Beyond that, the dashboard is intended to become self-improving: it observes
its own latency and failure data and adjusts routing from that. That work is
not yet public.

---

## Stack

React 19 · Vite 8 · Tailwind 4 · lucide-react · react-router 7
Python 3.13 stdlib only · Playwright for UI verification

## License

MIT