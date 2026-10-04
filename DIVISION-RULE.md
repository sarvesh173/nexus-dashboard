# Division Rule

## The rule

**One feature, one file. Never open the whole codebase to change one thing.**

If you need to read more than three files to make a change, the change is in
the wrong file. Stop and split instead of reading more.

This exists so a cheap model can safely work on this repository. The whole
point fails if fixing an animation requires reading 7,000 lines.

## Before you touch anything

Answer these three questions first:

1. **Which file owns this?** If you cannot name it in one sentence, you have not
   decided what you are changing yet.
2. **What is the smallest blast radius?** One feature, one file, one commit.
3. **Can I verify it?** Every change has a check that fails when the change is
   wrong. If there is none, write the check first.

## Where things live

```
src/features/<name>/     one directory per feature: models, player, cost,
                          settings, overview, agents
src/features/index.js     the single barrel. Import from here, never deep paths
src/components/           stateless presentational pieces and animation logic
src/components/index.js   barrel for the above
src/api/                  one thin module per backend endpoint
src/hooks/                stateful wrappers: polling, load state, visibility
registry/*.json           one file per source. Adding an agent is a new file
docs/SOURCE-SPEC.md       how a source registry file is written
```

## The three sizes

**A file a cheap model can own: under 400 lines.** Anything larger must be split
before it is modified. This is not a style preference. `RouteNotFound` once
spanned 3,891 lines and was in practice the entire application, which made the
whole app unmodifiable by anything that could not afford to read all of it.

**A component a cheap model can retune: self-contained.** Open one file, see
every keyframe, timing and colour. Do not make a model hunt for an animation
across files.

**A change a cheap model can review: one feature.** If a diff touches models,
cost and settings, it is three changes. Make three commits.

## Adding a source or an agent

One JSON file in the registry. No Python edit. No JSX edit. No redeploy of core
code. See `docs/SOURCE-SPEC.md`.

The only case that touches Python is a genuinely new wire protocol, and even
then it is one function in `adapters.py`. `sync_once`, the HTTP routes and the
frontend never change.

## Non-negotiables

These are not preferences. Breaking any one of them has already caused a real
outage in this repository's history.

- **No behaviour change disguised as a refactor.** A move is a move. If a diff
  renames, retunes or "improves" something while extracting it, that is two
  changes and the first one was not verified.
- **`no-undef` is enforced.** oxlint runs with `--deny no-undef`. A component
  that references an identifier which is not imported does not throw at build
  time, it throws at mount time, and the user sees a blank screen. This has
  happened. Verify zero `no-undef` errors.
- **A passing build does not mean the page renders.** `npm run build` succeeded
  while the app was a black screen. `python3 tests/test_dashboard_mounts.py`
  drives a real browser and is the only check that catches this. It is not
  optional.
- **No credentials, ever.** Only the *name* of an environment variable.
- **No absolute personal paths.** `~` or `paths.py`.
- **Sources are read-only.** Nexus never writes to a provider config or an
  upstream API. Only its own cache and its own stores.
- **No fabricated `ok: true`.** A degraded source must say it is degraded. A
  missing backend endpoint surfaces as an error with its status, never as an
  empty object that looks healthy.

## Verify before you claim

Run it and paste the real output. If it fails, leave it failing and say so.

```bash
npm run build
npm run lint
python3 tests/test_audit_fixes.py
python3 tests/test_live_sync.py
python3 tests/test_server_nvidia.py
python3 tests/test_nav_animations.py
python3 tests/test_overview_motion.py
python3 tests/test_dashboard_mounts.py   # real browser, catches blank screens
```

A test suite that only passes where the developer's own credentials happen to
exist is not testing anything. Suites must be offline and credential-free.

## Cost

Read the file you need. Not the codebase. If the file you need does not exist,
create it properly rather than adding to the one that already exists.