# Nexus Dashboard

One screen for every model you can reach, and what it costs to run.

You have the same vendor configured in three places: your agent gateway, a CLI
agent's config file, and an OpenAI-compatible proxy that fronts a dozen other
vendors. Nexus reads all three, works out who actually serves what, merges them
into one catalogue, and refreshes it every 30 seconds. Add a model anywhere
upstream and it appears on its own. Nothing is hand-listed.

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  agent       │   │  CLI agent   │   │  LLM proxy   │
│  gateway     │   │  config      │   │  (12 vendors)│
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          ▼
              ┌───────────────────────┐
              │  merge + canonicalise │
              │  vendor attribution   │
              └───────────┬───────────┘
                          ▼  every 30s, atomic write
              ┌───────────────────────┐
              │  cache  →  HTTP API   │
              └───────────┬───────────┘
                          ▼
                  React dashboard
```

## Why a proxy makes counting hard

A proxy in front of twelve vendors returns twelve vendors' models under one
endpoint name. Counting rows gives you a number that looks authoritative and is
wrong. Nexus reports both, and you quote the second:

```
providers       76      distinct vendors
rows          1161      what the UI renders
unique models  925      what actually exists
duplicates     236      rows naming the same model twice
```

Rows are routes. A model reachable directly *and* through the proxy really is
two routes, so it stays visible as two rows. It is counted once.

Every row also keeps a `sources` list, so you can see whether a vendor came
from the gateway, the config, the proxy, or more than one.

## The three sources

| Source | What it contributes |
|---|---|
| Agent gateway | The models the gateway is serving right now |
| CLI agent config | Providers on disk, including ones the gateway does not list |
| OpenAI-compatible proxy | Everything the proxy fronts, regrouped by real vendor |

All three are **read-only**. Nexus never writes to a provider config or to the
proxy. Writes go to its own cache and its own visibility store, nothing else.

The proxy's model ids are regrouped using the vendor prefix in the id, so
`qwen/...` files under Qwen rather than under the proxy. Router namespaces and
routing modifiers such as `auto/`, `fast:` and `reliable/` are recognised and
skipped, so they never invent a vendor that does not exist.

Provider ids are canonicalised before merging, alias first and punctuation
second, so the same vendor written two ways (`free-ai/freeai`, `zhipu/zai`)
collapses into one row.

## Running it

Requires Node.js 20+ and Python 3.11+ with PyYAML.

```bash
git clone git@github.com:sarvesh173/nexus-dashboard.git
cd nexus-dashboard

npm install

python3 server.py                  # backend on :5174
npm run build && npm run preview   # frontend on :5173
```

Both run. The frontend proxies `/api` to `127.0.0.1:5174` and polls it.

No key is needed to start. Nexus reads whichever credentials already exist
where your agent keeps them, and never stores one.

### Configuration

Every input location resolves from the environment, so no path is hardcoded and
a checkout carries no username.

| Variable | Purpose | Default |
|---|---|---|
| `HERMES_HOME` | Agent config and credentials | `~/.hermes` |
| `HERMES_CONFIG` | The agent config to read | `$HERMES_HOME/config.yaml` |
| `OMNIROUTE_HOME` | Proxy credentials | `~/.omniroute` |
| `OMNIROUTE_BASE_URL` | Proxy endpoint | `http://127.0.0.1:20128/v1` |
| `NEXUS_DIR` | This project's own directory | the checkout |
| `HERMES_GATEWAY_URL` | Gateway endpoint | the proxy value above |

The refresh cadence and the listen port are module constants, not environment
variables: `SYNC_INTERVAL = 30` in `live_sync.py`, port `5174` in `server.py`.

`HERMES_CONFIG` and `NEXUS_DIR` are read at import time. `HERMES_HOME` and
`OMNIROUTE_HOME` are read per call, so exporting them after startup works.

See `examples/env.example`, `examples/linking.json.example` and
`examples/nexus-telemetry.service` for a runnable service unit. The agent-facing
contract is in `SKILL.md`.

## API

Each verb below was verified by calling it against a running backend.

| Method | Path | Returns |
|---|---|---|
| GET | `/api/synced-models` | merged catalogue plus sync metadata |
| GET | `/api/sync-status` | counts, last sync, per-source health |
| GET | `/api/sync-now` | forces a sync, returns the new status |
| GET | `/api/visibility` | hidden models and providers |
| POST | `/api/visibility` | hide one entry |
| POST | `/api/visibility/reset` | restore everything |
| GET | `/api/stats` | CPU, RAM, sessions, latency |
| GET | `/api/cost-overview` | token pricing rollup |
| POST | `/api/model/test` | latency probe, body `model_id` |
| GET | `/api/providers` | provider cards with model counts |
| GET | `/api/all-providers` | every provider, including hidden |
| GET | `/api/live-providers` | the gateway catalogue, unmerged |
| GET | `/api/gateway-status` | reachability, and whether data is stale |
| GET | `/api/health` | liveness |

```bash
curl -s localhost:5174/api/sync-status | jq
```

```json
{
  "providers": 76,
  "models": 1161,
  "unique_models": 925,
  "duplicate_rows": 236,
  "status": {
    "ok": true,
    "sources": { "gateway": 81, "hermes": 23, "omniroute": 41 }
  }
}
```

Those are a live snapshot, not constants. Re-read them.

Three refresh rates run on purpose: the catalogue every 30s, CPU and RAM every
2s, the model-health registry every 15 minutes.

## What it does

- **5-modality breakdown.** `LLM`, `Vision`, `Embedding`, `STT`, `TTS`.
- **Hide and restore.** Any model or provider, non-destructive, and restorable.
- **Per-model test runner** with latency reporting.
- **Interactive playground.**
- **Cost scanner** across every provider.
- **Hardware overview** for the machine running it.
- **Model icons.** 82 model and 107 provider marks, resolved from the model
  family in its id. Official and open-source sources only, no invented marks.

## Layout

```
server.py          HTTP API, provider merge, icon assignment
live_sync.py       the three-source sync engine and its cache
hermes_gateway.py  gateway client, with stale detection
model_health.py    model registry and health classification
visibility.py      hide and restore store
assign_icons.py    model family to icon resolver
paths.py           every filesystem path, from the environment
src/               React frontend
tests/             six suites, all offline
```

## Tests

```bash
npm test                                 # the three backend suites
python3 tests/test_dashboard_mounts.py   # real-browser mount check
```

Run them by path rather than via `python3 -m unittest tests.x`.

| Suite | Covers |
|---|---|
| `test_audit_fixes.py` | cache-write race, malformed proxy payload, path resolution |
| `test_live_sync.py` | canonical provider ids, alias ordering, merge precedence |
| `test_server_nvidia.py` | provider enumeration and per-modality dedup |
| `test_nav_animations.py` | navigation transitions in Chromium |
| `test_overview_motion.py` | overview timing and indicator states |
| `test_dashboard_mounts.py` | the app mounts with zero console errors |

The mount check is not optional. A passing build does **not** mean a page
renders: one undefined identifier unmounts the whole React tree and ships a
black screen that no build step catches. That has happened here once.

CI runs all six, and first proves `no-undef` is actually live by injecting a
canary. A linter that cannot load its own config is indistinguishable from a
clean codebase, and this repo shipped exactly that bug once.

## Roadmap

- [x] Zero-gap proportional card grid with live model stream.
- [x] Client-side modality derivation across every provider.
- [x] Per-model test runner with latency reporting.
- [x] Interactive playground.
- [x] Upstream catalogue fetch and custom model injection.
- [x] Live three-source merge with 30-second auto-refresh.
- [x] Non-destructive model and provider hiding.
- [ ] WebSocket sync for token streaming.
- [ ] Autonomous model health and failover metrics.
- [ ] Write path: switch the live model across CLI agents.

## Security

- Never commit `.env` or any key. Credentials are read from the agent's env
  file at mode `600`, and this project never writes or stores one.
- Keep all catalogue sources read-only.
- Anything surfaced in the API is public by default. If it can leak a key, do
  not put it behind an endpoint.
- `paths.py` is the only module allowed to know a filesystem location.

## Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide, React Router v7.
- **Backend:** Python 3 standard library only, no framework.
- **Design:** Material Design 3 tokenised themes with palette switching.

MIT licensed. See `LICENSE`.

---

Engineered by [@sarvesh173](https://github.com/sarvesh173).