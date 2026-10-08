# AGENTS.md — CLI Agent Registry & Operator Guide

Machine: Celeron PC, Debian 13, user `kira`. Global npm root: `/home/kira/.local/lib/node_modules`.

This file is the single source of truth for every coding-agent CLI on this box:
what is installed, how it was installed, how to repair it, and how to customise
it. Everything below was auto-discovered on 2026-10-08 — nothing here is assumed.

---

## 1. Discovered inventory (17 agent CLIs)

Run this to re-discover after any install or removal:

```bash
npm ls -g --depth=0
ls -1 ~/.local/bin
for b in claude opencode omnirush hermes cline cloudcli freebuff opencli \
         xibecode zcode-cli atomic-agent agent-reach llmwiki; do
  printf '%-14s %s\n' "$b" "$(command -v "$b" || echo MISSING)"
done
```

### Tier 1 — primary agents (drive real repo work)

| Agent | Version | Install path | Auth | Notes |
|---|---|---|---|---|
| `claude` | 2.1.252 | `~/.local/share/claude/versions/2.1.252` | `~/.claude`, `~/.claude.json` | Has `claude doctor`. Anthropic's Claude Code. |
| `opencode` | 1.18.34 | `~/.local/lib/node_modules/opencode-ai/bin/opencode.exe` | none at default path | Pooled providers; also `~/.config/opencode-fallback`. |
| `omnirush` | 2.2.1 | `~/.local/lib/node_modules/omnirush/src/bin.js` | `~/.omnirush/auth.json` | User's preferred dispatcher. |
| `hermes` | v0.21.5 | `~/.hermes/hermes-agent/venv/bin/hermes` | `~/.hermes/config.yaml` | This assistant. Has upstream + local git revs. |

### Tier 2 — secondary agents

| Agent | Version | Install path | Notes |
|---|---|---|---|
| `xibecode` | 1.17.24 | `~/.local/lib/node_modules/xibecode/dist/index.js` | Has native `update` subcommand. Auth dir `~/.xibecode`. |
| `cline` | 3.0.65 | `~/.local/lib/node_modules/cline/bin/cline` | **BROKEN — see §4.** Auth `~/.cline`. |
| `cloudcli` | 1.37.2 | `~/.local/lib/node_modules/@cloudcli-ai/cloudcli/dist-server/` | Claude Code UI + browser-use-mcp server. Default port 3001. |
| `opencli` | 1.8.7 | `~/.local/lib/node_modules/@jackwener/opencli/dist/src/main.js` | Config `~/.opencli`. |
| `freebuff` | 0.0.167 | `~/.local/lib/node_modules/freebuff/index.js` | Reports 0.0.167 pkg / 0.1.7 binary. Has telegram bridge state. |
| `zcode-cli` | 0.0.1 | `~/.local/lib/node_modules/zcode-cli/cli.js` | Minimal. |
| `llmwiki` | 1.1.0 | `~/.local/lib/node_modules/llm-wiki-compiler/dist/cli.js` | Knowledge compiler. |
| `atomic-agent` | local | `~/.local/bin/atomic-agent` | Hand-rolled local operator agent. No `--version`. |
| `agent-reach` | 1.5.0 | `~/.local/share/uv/tools/agent-reach/bin/agent-reach` | uv-installed. |
| `tiny-agents` | local | `~/.hermes/hermes-agent/venv/bin/tiny-agents` | Python, stdlib CLI framework. |
| `mcporter` | 0.13.13 | npm global | MCP tool bridge. |
| `antigravity-claude-proxy` | 2.8.5 | npm global | Claude proxy shim. |

### Present but not agents
`@openadapter/koda@0.14.2`, `n8n@2.32.7`, `undici@8.10.2`, plus build-only
`tailwindcss`, `postcss`, `autoprefixer`. `supercode-cli@0.1.90` is installed in
npm but **its binary is missing from PATH** — see §4.

---

## 2. Installation commands (exact, re-runnable)

npm global root is `~/.local/lib/node_modules` — every `npm i -g` below targets it.

```bash
# Tier 1
npm i -g opencode-ai@1.18.34                # opencode
npm i -g omnirush@2.2.1                     # omnirush (dispatcher)
# claude is NOT npm — versioned binary install:
curl -fsSL https://claude.ai/install.sh | bash   # → ~/.local/share/claude/versions/
# hermes is a uv/venv install, not npm:
uv tool install hermes-agent                  # → ~/.hermes/hermes-agent/venv/

# Tier 2
npm i -g xibecode@1.17.24
npm i -g cline@3.0.65
npm i -g @cloudcli-ai/cloudcli@1.37.2
npm i -g @jackwener/opencli@1.8.7
npm i -g freebuff@0.0.167
npm i -g zcode-cli@0.0.1
npm i -g llm-wiki-compiler@1.1.0
npm i -g mcporter@0.13.13
npm i -g antigravity-claude-proxy@2.8.5
uv tool install agent-reach                  # uv, not npm
```

---

## 3. Repair procedures

Rule: **native updater first, npm second, manual extraction last.** Never hand-edit
inside `node_modules` — reinstall overwrites it anyway.

### 3a. Native updaters
```bash
claude doctor                # health check; also reports broken installs
claude update                # self-update to latest
xibecode update              # check/apply CLI update from npm
cloudcli update              # update to latest version
opencode update              # supported
omnirush update              # supported
```

### 3b. npm-managed agents (all of Tier 2)
```bash
npm ls -g --depth=0          # confirm current version first
npm i -g <pkg>@<version>     # reinstall exact pinned version
npm uninstall -g <pkg>       # clean removal if abandoning
npm cache verify             # if installs silently no-op
```

**Known npm failure mode on this box:** `npm install` can exit `0` while
installing nothing, or remove thousands of unrelated packages from `node_modules`
(observed: `removed 2553 packages`). Symptom is a missing binary or a build that
suddenly cannot resolve `@tailwindcss/vite`.

Repair path:
```bash
npm i -g <pkg> --legacy-peer-deps --no-audit --no-fund
# if that no-ops, bypass dependency resolution entirely:
mkdir -p /tmp/pkgfix && cd /tmp/pkgfix
npm pack <pkg>@<version> --silent        # downloads tarball, no tree resolution
mkdir -p ~/.local/lib/node_modules/<pkg>
tar xzf <pkg>-<version>.tgz -C ~/.local/lib/node_modules/<pkg> --strip-components=1
```
`npm pack` + `tar` is the reliable escape hatch here; it has no dependency tree
to resolve. Verify with `node -e "require.resolve('<pkg>')"`.

### 3c. Broken installs

**`cline` — `Illegal instruction (core dumped)`**
The prebuilt binary is compiled against CPU instructions this Celeron host does
not have (likely AVX/AVX2). Reinstalling the same version will not help.
```bash
cline --version          # reproduce: crashes immediately
# try an older build that predates the AVX requirement:
npm i -g cline@3.0.60 --force
# if every build crashes, the agent is unusable on this CPU — leave it uninstalled:
npm uninstall -g cline
```

**`supercode-cli` — installed in npm, no binary in PATH**
```bash
npm i -g supercode-cli@0.1.90 --force
command -v supercode-cli   # if still empty, package ships no bin entry
```

**`gemini` — no binary and no auth file**
Not installed. If wanted: `npm i -g @google/gemini-cli`, then `gemini` for OAuth.

**`opencode` — no auth at the default path**
Providers are configured elsewhere (`~/.config/opencode`, `opencode-fallback`).
Do not assume missing auth is a broken install.

### 3d. Hermes (this assistant)
```bash
hermes --version           # shows upstream + local rev
cd ~/.hermes/hermes-agent && git status    # local edits show here
cd ~/.hermes/hermes-agent && git log --oneline -5
```
The gateway daemon does **not** hot-reload Python edits — restart after changing
`.py` files.

---

## 4. Customisation

### Per-agent config files
```bash
~/.claude/ ~/.claude.json          # claude
~/.omnirush/auth.json              # omnirush credentials
~/.config/opencode/                # opencode providers
~/.hermes/config.yaml              # hermes
~/.xibecode/  ~/.cline/  ~/.opencli/  ~/.freebuff-*
```

### Custom instructions / system prompts
Agent CLIs read repo-local instruction files automatically. Drop a file in the
repo root and the agent picks it up on its next run:

| File | Read by |
|---|---|
| `AGENTS.md` | most modern agents (codex, opencode, others) |
| `CLAUDE.md` | claude |
| `.cursorrules` | cursor-style tools |

**When a repo already has `AGENTS.md` or `CLAUDE.md`, that file is authoritative —
do not overwrite it.** Put extra instructions in a separate file and reference
it, or append to the existing one deliberately.

The user's own prompt library lives at `~/Pictures/system_prompts/agent/` (9
prompts). Read from there when composing a dispatch prompt.

### Theming / UI
Agents with a TUI generally read `NO_COLOR`, and most respect a config key for
theme. There is no cross-agent standard — check each one's own help.

---

## 5. Dispatch pattern

The user drives autonomous coding through the OmniRush CLI, not through agent
subagents:

```bash
omnirush --help
```

Defaults used: model `gpt-6-sol` / `gpt-6-astra`, reasoning 5-high, full folder
access scoped to a single repo. During a run the user wants status-only
reporting.

---

## 6. Connectivity check

The Atomberg fan needs a preflight before it will accept IR commands: it listens
on UDP `192.31.220:5600` and confirms over BLE. If a fan command fails, check the
preflight before suspecting the IR code.

---

## Maintenance rule

Re-run §1 discovery after any install, removal, or version bump and update the
tables above. This file is only useful if it matches reality.
