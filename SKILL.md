---
name: nexus-control-plane
description: Use when you want a self-hosted dashboard that auto-discovers every live model, links one cloud OpenAI-compatible endpoint across CLI agents, and reports real token usage.
---

# Nexus Control Plane

A local control plane with two parts:

1. **Backend** - a polling engine that reads every configured provider, merges
   the catalogues, caches them, and exposes them over HTTP. A model added
   anywhere upstream shows up within one sync cycle, with no manual list edits.
2. **Frontend** - a dashboard that renders that cached catalogue.

## Why this exists

Pointing several CLI agents at one endpoint and switching models between them
is normally a manual, per-agent chore: every tool has its own config file, its
own idea of a provider id, and its own key. This collapses that into one
catalogue with one switch.

## Prerequisites

- Python 3.11+ with `PyYAML`
- Node 18+ and npm
- At least one CLI agent: Hermes, Claude Code, or OpenCode
- One OpenAI-compatible endpoint (any cloud LLM proxy will do)

## Step 1 - Link one cloud endpoint

Create `~/.nexus/linking.json`, mode `600`:

```json
{
  "endpoint": {
    "name": "cloud",
    "base_url": "https://YOUR-ENDPOINT/v1",
    "api_key": "YOUR-KEY",
    "api_mode": "openai"
  },
  "agents": {}
}
```

**Verify before wiring anything:**

```bash
curl -H "Authorization: Bearer $KEY" "$BASE/models"
```

It must return `{"data":[{"id":"..."}]}`. Never write an unverified endpoint
into an agent config - a wrong `base_url` silently routes every request wrong.

## Step 2 - Register the endpoint with each agent

Each agent gets the endpoint; none gets its own copy of the key.

- **Hermes** - `hermes config set providers.cloud.base_url "$BASE"` and
  `hermes config set providers.cloud.api_mode openai`
- **OpenCode** - add a provider entry with `"npm": "@ai-sdk/openai-compatible"`
  and an `options.baseURL`
- **Claude Code** - pass `--model <id>` per invocation

Put the key in **one** environment variable (`NEXUS_CLOUD_API_KEY`) that all
three read. Referencing is safe; copying is how keys leak into git history.

## Step 3 - Understand the catalogue

The engine merges three sources. This matters because they overlap:

| Source | What it is |
|---|---|
| gateway | Whatever the agent's gateway is serving right now |
| config | Providers marked enabled in the agent's config file |
| your endpoint | Models on the cloud endpoint you linked |

A proxy endpoint fronts many real vendors, so its model ids are regrouped by
the **real provider prefix** rather than filed under the proxy. Otherwise every
model appears twice - once from the gateway, once from the proxy.

Counts to expect and trust:
- `providers` - how many provider rows exist
- `models` - provider→model rows, i.e. what the UI renders
- `unique_models` - genuinely distinct model ids
- `duplicate_rows` - `models - unique_models`; expected to be non-zero

Reporting only the row count overstates the catalogue. Surface `unique_models`
whenever you state a total.

## Step 4 - Run the backend

```bash
python3 server.py            # listens on 127.0.0.1:5174
systemctl --user restart <your-unit>
```

The engine primes its cache at startup, then refreshes on an interval
(30s by default).

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/synced-models` | merged catalogue (list shape) |
| GET | `/api/sync-status` | last sync time + counts |
| GET | `/api/sync-now` | force a sync immediately |
| GET | `/api/visibility` | hidden models/providers |
| POST | `/api/visibility` | hide something |

## Step 5 - Run the dashboard

```bash
npm install
npm run build
npm run preview -- --host 0.0.0.0 --port 5173
```

Proxy `/api` to `127.0.0.1:5174` in your vite config, and poll on a cadence
that matches the backend's sync interval so the two never disagree.

## Rules

- **Never** commit `.env`, `linking.json`, or any key.
- Personal paths must come from env vars, never string literals.
- Cache-first: API reads never hit the network.
- Fail-soft: a dead provider or a down agent is a warning, never a crash.
- Read-only on sources until you deliberately add a write path.
- A bare `except Exception` around a provider build hides a NameError as an
  "Unavailable" provider. Test the dedup loops directly instead of trusting a
  green endpoint; a swallowed NameError looks exactly like an upstream outage.
- Verify a rendered page in a real browser before calling a UI change done.
  A single undefined identifier unmounts the whole React tree and ships a
  black screen that every "the build passed" check misses.

## Troubleshooting

**Black screen after a UI change** - a runtime error, not a build error. Open
the browser console. Add a headless mount check that asserts the root element
actually has children; that turns this class of bug into a test failure.

**A provider reports Unavailable when upstream is fine** - a NameError inside
the build is being swallowed by a broad except. Find the undefined name in the
build path rather than blaming the network.

**Counts look inflated** - you are counting rows instead of unique models, or a
proxy endpoint is being counted as a provider. Check `duplicate_rows`.

**Everything disappeared** - all sources failed. The engine serves the last
good cache rather than rendering an empty page; check `/api/sync-status`.
