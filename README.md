# Nexus Dashboard

A control surface for a self-hosted AI gateway. It sits in front of whatever
models you have access to and tells you the truth about them — which ones are
actually live, which ones respond, what they cost, and which provider serves
each one cheapest.

Not a monitoring page. Not a model list. An instrument panel.

---

## What it does

**Catalog** — every provider the gateway can reach, with the models each one
currently serves. Live, not read from a config file. Rename a provider, add a
model by hand, or import a provider's published catalog.

**Test** — press `Test` on any model and see the actual response and how long it
took. A model that doesn't answer within 12 seconds says so instead of hanging.
`Test All` works through the list one at a time.

**Hide** — anything broken gets out of the way. Auto-hide on failure, or hide by
section. Hiding never deletes anything, so a bad afternoon doesn't cost you the
catalog.

**Playground** — a chat canvas for trying a model directly. Real response, real
latency, nothing mocked.

**Cost** — where the tokens went.

**Agents** — the CLI agents wired to the gateway, and what each one runs on.

---

## Interface

Material 3 surfaces over a dark, high-contrast palette. Spring physics on every
transition (`cubic-bezier(0.16, 1, 0.3, 1)`), tactile press feedback, and
per-tab motion — each navigation tab animates differently on hover rather than
sharing one generic effect.

No component library. Every surface is hand-built.

---

## Running it

```bash
npm install
npm run build
systemctl --user restart nexus-dashboard
systemctl --user restart nexus-telemetry
```

Frontend on `:5173`, backend on `:5174`.

```bash
systemctl --user list-units | grep nexus
curl -s localhost:5174/api/health
```

---

## Stack

React 19 · Vite 8 · Tailwind 4 · lucide-react · react-router 7
Python 3.13 standard library · Playwright for UI verification

## License

MIT