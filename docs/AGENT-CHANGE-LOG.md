# Agent Change Log — Nexus Dashboard

**Purpose:** every agent-driven change to this repo is recorded here, so the next
agent (human or model) can see what was already changed, why, and what is still
open before touching anything. Append a new dated section per work session; do
not rewrite history.

**House rules for entries** (from `DIVISION-RULE.md` and the operator's standing
instructions):
- Always create a safety branch before editing; push every branch via SSH.
- Every change ships with a check that fails when the change is wrong.
- Record: files touched, the bug, the fix, verification output (real, pasted),
  and the GitHub issues addressed.
- No absolute personal paths, no credentials, no fabricated `ok: true`.

---

## 2026-10-15 — sentinel-issues-round-1 (branch `fix/sentinel-issues-round-1`)

**Agent:** OpenCode (Step) · **Base:** `main` @ `508932e` · **Remote:**
`git@github.com:sarvesh173/nexus-dashboard.git`

### GitHub issue actions this session

| Issue | Action |
|---|---|
| #5 (cpu telemetry) | **Fixed** by `82276f2`, closed with verification |
| #16, #21 (payload shapes) | **Fixed** by `82276f2` + `7f6db69`, closed |
| #18 (agent model precedence) | **Fixed** by `82276f2`, closed |
| #19 (OpenRouter top_provider null) | **Fixed** by `82276f2`, closed |
| #20, #22, #23 (offline test suite) | **Fixed** by `7f6db69`, closed |
| #6, #7, #8, #9, #10, #11, #12, #17 (optional deps) | Verified already fixed in `main` (guards + `TestServerOptionalImportsGuard`/`TestRunSyncFetchSpecsImports`), closed with evidence |
| #24 (probe URL doubled /v1, all models WRONG_EP) | Found + **fixed** by `b5640cf` this session, filed and closed |
| #25 (watchdog hardcoded paths) | **Fixed** by `b39cc30`, closed |
| #26 (watchdog restart loop) | **Fixed** by `b39cc30`, closed |
| #27 (Memory card `%`) | **Fixed** by `b39cc30`, closed |
| #28 (tts/stt probed routes that do not exist) | Found by research agent + **fixed** by `b39cc30`, filed and closed |
| #29 (catalog-absent models stuck as WRONG_EP) | Found + **fixed** by `eb61fcb`, filed and closed |

### Commit 1 — `7f6db69` — test suite offline-safe (issues #20, #21, #22, #23)

Problem: `python3 -m unittest discover -s tests` could not run. 
`tests/test_dashboard_mounts.py` executed a full Playwright browser session at
*import* time and then called `sys.exit()`, so module discovery died with
`SystemExit: 0`. `tests/test_model_connection.py` assumed a live backend on
`127.0.0.1:5174` and errored with `URLError` when it was offline.

Changes:
- `tests/test_dashboard_mounts.py` — whole browser check wrapped in `main()`
  behind `if __name__ == "__main__":`. Behaviour when run directly is unchanged.
- `tests/test_model_connection.py` — starts the real `server.TelemetryHandler`
  in-process on an ephemeral port in `setUpClass`/`tearDownClass`; no external
  server needed. The POST test snapshots and restores
  `active_model_store.json` (the endpoint writes it) so no residue is left.

Verification (real output):
- `python3 -m unittest discover -s tests -p 'test_*.py'` → `Ran 159 tests ... OK`
  (previously: ImportError/SystemExit during discovery).
- `python3 tests/test_dashboard_mounts.py` → `PAGE ERRORS: 0 / CONSOLE
  ERRORS: 0 / RESULT: MOUNTS OK`, exit 0.

### Commit 2 — `82276f2` — catalog parsing / context lookup / cpu / model precedence (issues #5, #16, #18, #19, #21)

Problem: four confirmed bugs, each verified against the code before fixing.

1. **`/models` payload shape (#16, #21).** `server.py` (NVIDIA catalog loop,
   inside `get_hermes_config_providers()`), `model_health.py`
   (`live_catalog()`, line ~63) and `run_sync.py` (catalog fallback) all called
   `payload.json().get('data', [])` directly. A top-level JSON array made
   `.get` raise `AttributeError` and blanked the whole catalog; non-dict rows /
   non-string ids crashed at `.lower()` / `.split('/')`.
   - New `models_payload.py` — shared `model_rows(payload)` guard: accepts
     `{"data": [...]}` or a top-level list, returns `[(id, row)]` with
     non-empty string ids, skips junk rows, never raises.
   - `server.py`, `model_health.py`, `run_sync.py` now route payloads through
     `model_rows()`.
   - `run_sync.py` — HTTP fallback extracted to `_live_specs(base, key)` (a
     testable seam). A non-200 now prints and returns `[]` instead of parsing
     the error body or publishing an empty-but-healthy catalog.
2. **OpenRouter `top_provider: null` (#19).** `server.py`
   `/api/model/context` did `item.get('top_provider', {}).get(...)`; OpenRouter
   returns `null` for many models, so the chained `.get` raised inside the
   route's broad `try` and silently killed the verified context lookup.
   - Extracted `_openrouter_lookup(model_id)` (module-level, unit-testable);
     guard is `(item.get('top_provider') or {})`. Catalog shape goes through
     `model_rows()` as well.
3. **CPU telemetry (#5).** `server.py get_telemetry()` called
   `psutil.cpu_percent(interval=None, percpu=True)` and then
   `psutil.cpu_percent(interval=None)` back-to-back; the second call sampled a
   ~0 ms window and read a constant `0.0%`. Now `cpu_pct` is the mean of the
   single per-core sample.
4. **Agent session model precedence (#18).** `agent_stream.py`
   `_read_sessions()` built `model_id` as
   `A or B if C else D`, which Python parses as `(A or B) if C else D`. When
   `session.model` was a JSON string (the normal SQLite case), the expression
   took the `else` branch and ignored the newest assistant message's
   `modelID`. Fallback is now parenthesised.

Tests added (all pass):
- `tests/test_audit_fixes.py` → `TestModelRowsNormalisation` (5),
  `TestLiveSpecsNon200IsLoud` (2), `TestOpenRouterTopProviderNull` (5),
  `TestTelemetryCpuSingleSample` (1).
- `tests/test_agent_stream.py` → `TestSessionModelPrecedence` (3).

Verification (real output):
- `python3 -m unittest discover -s tests -p 'test_*.py'` → `Ran 175 tests ... OK`
  (the `[sync] models endpoint returned HTTP 503` line is the new non-200 guard
  printing from its own regression test — expected).
- `npm run lint` → exit 0 (warnings only; all pre-existing).
- `npm run build` → `✓ built in 2.27s`.
- Standalone regression proof for #18: the old expression yields the stale
  session model (`'stale'`), the fixed one yields the message model
  (`'fresh'`) for a JSON-string session model.

### Commit 3 — `b5640cf` — probe URL joined once (the 91-model WRONG_EP root cause)

Problem: `_probe()` built `base.rstrip('/') + route`. `BASE` is
`https://integrate.api.nvidia.com/v1` (already ends in `/v1`) and every route
in `SPECIAL_ROUTES` starts with `/v1` → the probe hit
`https://integrate.api.nvidia.com/v1/v1/chat/completions`, a path that exists
on no host. nginx answered `404 page not found`; the 404 branch only maps a
retired-function body to RETIRED, so **all 91 registry entries** were recorded
`WRONG_EP`. Auto-hide fires only on RETIRED, so genuinely retired models stayed
visible and the whole registry looked mis-routed.

Fix: join once — when base ends in `/v1` and route starts with `/v1`, drop the
route prefix. `live_catalog`'s URL is regression-tested unchanged.
Tests: `+TestProbeUrlJoin` (4).

Live proof (real env key, single-/v1 URL):
- `meta/llama-3.1-8b-instruct` → `RETIRED` (410 Gone, EOL 2026-08-26)
- `nvidia/nv-embedqa-e5-v5` on `/v1/embeddings` → `RETIRED` (410 Gone)

Registry repair pass 1 (`run_sync.py`, 496 s, 89 models):
`{"RETIRED": 52, "WRONG_EP": 12, "SLOW": 8, "ALIVE": 19}` — 52 retired models
auto-hidden.

Documentation-level confirmation (NVIDIA docs + live probes by a research
agent): `POST /v1/chat/completions` on `integrate.api.nvidia.com` is the
documented endpoint (401/410/200 depending on key/EOL); `/v1/v1/...` returns
plain-text 404; no base-URL migration; EOL is `410 Gone` with the message in
`detail`, and it fires before auth.

### Commit 4 — `b39cc30` — watchdog paths + restart grace, memory unit, audio routes (#25, #26, #27, #28)

- `scripts/nexus_watchdog.py` — cache paths resolve through `paths.py`
  (`REPO_DIR`, honours `NEXUS_DIR`) instead of three literal `/home/kira/...`
  strings. Force-added: the `scripts/` gitignore entry predates this tracked
  file. Regression: `tests/test_watchdog_grace.py::TestWatchdogPaths`
  (no `/home/` in source, cwd-independent import).
- `scripts/nexus_watchdog.py` — startup grace after a restart. The 3 s pause
  plus the 5 s loop meant the next probes landed before vite preview bound
  :5173, re-crossing the 2-failure threshold mid-boot → **59 restarts** on
  2026-10-15. `RESTART_GRACE_SECONDS = 15`, `FAIL_THRESHOLD`/`PROBE_INTERVAL`
  named constants, grace logged. Regression: `TestWatchdogRestartGrace` runs
  the real `main()` under virtual time.
- `src/features/overview/index.jsx` — Memory card big number no longer renders
  the `%` unit span (the 2026-10-08 open loop). Core 1/Core 2 sub-boxes and
  the swap row keep their `%`. **The CPU big number currently does render `%`
  again** (re-added during a later overhaul) — flagged to the user, not
  changed, because the change-log entry names only the Memory card.
- `model_health.py` — `tts`/`stt` removed from `SPECIAL_ROUTES`:
  `/v1/audio/speech` and `/v1/audio/transcriptions` do not exist on this host
  (live-verified 404 for any model/key; NVIDIA ships speech as self-hosted NIM
  containers with Riva paths). `embedding` → `/v1/embeddings` kept (documented
  and live-verified). Regression: `TestSpecialRoutesExistOnHost`.

### Commit 5 — `eb61fcb` — catalog-absent 404 means RETIRED (#29)

NVIDIA answers an EOL model with a JSON `410`; a bare nginx `404` for a model
missing from `GET /v1/models` means the model is gone, not mis-routed. The
catalog rule now also covers a 404 on every route. Preserved: listed + 404
stays `WRONG_EP`, listed + timeout stays `SLOW`, empty/failed catalog fails
soft. Regression: `+TestCatalogAbsenceMeansRetired` (5 cases).

### Verified already-fixed in `main` (issues closed-worthy, NOT re-fixed)

Confirmed by reading current code + the existing regression suite
(`tests/test_audit_fixes.py`, 166 tests before this round):
- Optional-dependency guards (#6–#12): `psutil`/`requests`/`yaml` imports and
  every use site in `server.py`, `model_health.py`, `run_sync.py` are guarded.
- YAML None guards (#17): all four `yaml.safe_load` sites are behind
  `if yaml is not None`.
- `live_sync.py` array/alias/atomicity bugs from the 10-04 audits: fixed
  (delete-prune NOTE at `model_health.py:244`, `mkstemp` in `_save`,
  mtime-invalidated `_load`, `_write_locked` on visibility reset, guarded
  `/api/sync-now`, gateway 401 no longer reports `ok: true`).
- Frontend hardening: `readJsonStore` shape validation (null-crash fixed),
  `total_models` sum guarded (`Math.max(0, finiteNumber(...))`), `console.log`
  gated behind `devModeEnabled`.

### Still open (filed / to file as GitHub issues)

- `scripts/nexus_watchdog.py` hardcodes three absolute `/home/kira/...` paths
  (DIVISION-RULE violation; makes README's "no path is hardcoded" claim false).
- Overview Memory card big number still renders `%`
  (`src/features/overview/index.jsx:1260`) — the 2026-10-08 open loop.
- Watchdog restart loops: probe fails immediately after a service restart
  (vite preview needs ~5 s to bind :5173); no startup grace.
  Evidence: `cache/watchdog.log` restart loops 02:20 and 03:59 on 2026-10-15.
- `model_health.json` registry: all 91 models `WRONG_EP` ("404 page not found")
  although a live probe with the env-file key returns a proper API response
  (410 Gone for an EOL model) — root cause still under investigation
  (suspected nginx edge 404s from `integrate.api.nvidia.com` under load;
  `_probe` has no retry).

---

*Next session: append below this line. Record the branch, the commits, the
verification output, and the issues touched. Never delete an entry.*
