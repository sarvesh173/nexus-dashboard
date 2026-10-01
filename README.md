# Nexus

An operations console for a self-hosted model gateway.

One screen tells you which providers are reachable, which models answer, what
they cost, and which agent is doing what. Everything here is measured against
the gateway itself — not read from a config file.

---

## What it does

**Browse** — the live catalog, grouped by provider, filterable by modality.
What the gateway can actually reach right now.

**Probe** — press `Test` on any model and get a real reply with real latency.
Twelve-second cutoff, so a dead endpoint reports itself instead of hanging the
page. `Test All` walks the list sequentially.

**Prune** — dead models get flagged and hidden in bulk. Hiding is reversible;
nothing is ever deleted.

**Talk** — a chat canvas for hands-on work with any model in the catalog.
Live latency readout, no mocked data.

**Price** — input and output token rates across providers, side by side.

**Watch** — CPU, memory, disk, and active agent sessions on the overview.

**Route** — registered CLI agents, each pinned to a specific gateway endpoint,
all tracked from one place.

---

## Built with

React 19 · Tailwind 4 · Vite · React Router 7 · lucide-react

Python 3 standard library for the telemetry service — async, no dependencies.

The interface follows Material Design 3, with theme persistence and spring-eased
motion across every surface.

---

## Run it

```bash
git clone git@github.com:sarvesh173/nexus-dashboard.git
cd nexus-dashboard
npm install

npm run dev      # development
npm run build    # production bundle
```

Needs Node 20+ and Python 3.10+.

---

## In progress

- [x] Fluid proportional grid with zero-gap cards
- [x] Full-bleed canvas with live column balancing
- [x] Modality detection across every connected provider
- [x] Per-model probe with latency, and auto-hide on failure
- [x] Live chat playground
- [x] Upstream catalog sync and manual model entry
- [ ] Streaming inference over a persistent socket
- [ ] Health scoring and automatic failover

---

Built by [@sarvesh173](https://github.com/sarvesh173).