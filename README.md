# Nexus Agent Telemetry & Model Engine

> **Status:** Active development.
> **What it is:** a self-hosted cockpit for live inference, multi-provider model
> catalogues, cost intelligence, and hardware health.

Nexus Dashboard polls every provider you have configured, merges the
catalogues into one cache, and renders it. Add a model anywhere upstream and it
appears within one sync cycle. Nothing is hand-listed.

---

## What it does

- **Live catalogue merge.** Polls the agent gateway, the agent config file, and
  an OpenAI-compatible proxy endpoint, then merges all three into one cache on
  a 30-second cycle.
- **Real vendor attribution.** A proxy endpoint fronts many vendors, so its
  model ids are regrouped by the true owner instead of being filed under the
  proxy.
- **Duplicate-free providers.** Provider ids are canonicalised before merging,
  so the same vendor spelled two ways (`free-ai` / `freeai`) collapses into one
  row.
- **Honest counts.** Reports provider-to-model rows *and* distinct model ids,
  so a total is never inflated by overlap.
- **Fail-soft.** A dead provider degrades to a warning; the last good cache
  keeps serving instead of rendering an empty page.
- **5-modality breakdown.** `LLM`, `Vision`, `Embedding`, `STT`, `TTS`.
- **Hide and restore.** Hide any model or provider non-destructively, per-model
  test runner with latency reporting, interactive playground, cost scanner,
  hardware overview.

---

## Tech stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide, React Router v7.
- **Backend:** Python 3 stdlib HTTP server (no framework).
- **Design:** Material Design 3 tokenised themes with palette switching.

---

## Getting started

### Prerequisites

- Node.js 20+
- Python 3.11+ with `PyYAML`

### Run it

```bash
git clone git@github.com:sarvesh173/nexus-dashboard.git
cd nexus-dashboard

npm install

# backend on :5174
python3 server.py

# frontend on :5173
npm run build && npm run preview
```

The frontend proxies `/api` to `127.0.0.1:5174`. Poll intervals are set to
match the backend's sync cadence so the two never disagree.

### Tests

```bash
python3 tests/test_dashboard_mounts.py    # real-browser mount check
python3 tests/test_nav_animations.py
python3 tests/test_overview_motion.py
python3 tests/test_server_nvidia.py
```

Run them by path, not via `python3 -m unittest tests.x`.

The mount check is not optional. A passing build does **not** mean a page
renders: one undefined identifier unmounts the whole React tree and ships a
black screen that no build step catches.

---

## Architecture

```
  agent gateway  ─┐
  agent config   ─┼─→  merge engine  ─→  cache  ─→  HTTP API  ─→  dashboard
  proxy endpoint ─┘     (dedup,              (30s)      (:5174)    (:5173)
                         vendor split)
```

The merge engine is **read-only** on all three sources. Write paths are a
separate concern and deliberately absent.

### Why the merge is not a simple union

A proxy endpoint in front of ten vendors reports ten vendors' models, and the
agent gateway usually reports many of the same ones. A naive union
double-counts. So:

1. Models are regrouped under the real provider prefix in their id.
2. Provider ids are canonicalised, then merged, with a `sources` list per row.
3. Both `models` (rows rendered) and `unique_models` (distinct ids) are
   reported. Quote the second when you state a total.

### API

| Method | Path | Returns |
|---|---|---|
| GET | `/api/synced-models` | merged catalogue plus sync metadata |
| GET | `/api/sync-status` | sync time, counts, per-source status |
| GET | `/api/sync-now` | forces a sync |
| GET | `/api/visibility` | hidden models and providers |
| POST | `/api/visibility` | hide a model or provider |
| POST | `/api/visibility/reset` | restore everything |
| GET | `/api/stats` | CPU, RAM, sessions, latency |
| GET | `/api/cost-overview` | token pricing rollup |
| GET | `/api/model/test` | per-model latency probe |

---

## Configuration

Everything personal comes from the environment. No path is hardcoded.

| Variable | Meaning | Default |
|---|---|---|
| `NEXUS_SYNC_INTERVAL` | seconds between syncs | `30` |
| `NEXUS_BACKEND_PORT` | backend listen port | `5174` |

Provider credentials live in the agent's own env file at mode `600`. This
project never stores a key.

---

## Roadmap

- [x] Zero-gap proportional card grid with live model stream.
- [x] Client-side modality derivation across every provider.
- [x] Per-model test runner with latency reporting.
- [x] Interactive playground.
- [x] Upstream catalogue fetch and custom model injection.
- [x] Live three-source merge with 30-second auto-refresh.
- [x] Non-destructive model and provider hiding.
- [ ] Real-time WebSocket sync for token streaming.
- [ ] Autonomous model health and failover metrics.
- [ ] Write path: switch the live model across CLI agents.

---

## Security

- Never commit `.env` or any key. Credentials are read from the agent's env
  file at mode `600`.
- Keep all catalogue sources read-only.
- Anything surfaced in the API is public by default. If it can leak a key, do
  not put it behind an endpoint.

---

*Engineered by [@sarvesh173](https://github.com/sarvesh173).*