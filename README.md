# Apporine Control Plane

Internal admin control plane for Apporine customer operations: products, customers, contracts, entitlements, licenses, deployments, releases, approvals and audit across Relyxus and future Apporine products.

- Specification: [docs/spec](docs/spec) (v2.0, 12 October 2026)
- Implementation plan, feature list and status: [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)

## Status

The project is in the **design track**: the Admin Web is built screen by screen against typed fixture data, before the Control API exists. Nothing is persisted. Actions that would change data open their real dialogs and end with "Not connected to the Control API. Nothing was saved."

| Feature                         | Screens                                                                                                           | State   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------- |
| Foundation and quality pipeline | —                                                                                                                 | Done    |
| Design system                   | `/design-system`                                                                                                  | Done    |
| Domain model and data layer     | —                                                                                                                 | Done    |
| Global shell                    | Sidebar, top bar, command palette (Ctrl/⌘ K)                                                                      | Done    |
| Portfolio command center        | `/`                                                                                                               | Done    |
| Customers                       | `/customers` list, `/customers/[id]` Customer 360, contact detail                                                 | Done    |
| Licensing                       | `/licensing` list, `/licensing/[id]` detail, issue/renew/replace/rebind/suspend/revoke flows, `/licensing/verify` | Done    |
| All other modules               | Routed placeholders that list each module's planned screens                                                       | Planned |

## Getting started

Requires pnpm 10. The project pins Node 24 LTS through `.npmrc`; pnpm downloads it and uses it for every project script, whatever Node is installed globally.

```sh
pnpm install
pnpm dev            # http://localhost:3000
```

Pages worth opening:

- `/` — portfolio command center. Try the filters, and Ctrl+K searches such as `customer:halden` or `deployment:prod`.
- `/customers` — customer list with saved views, filter rail, column manager and bulk selection.
- `/customers/cus_halden` — Customer 360 with explainable health, timeline and 13 sections.
- `/licensing/LIC_00409` — license in grace; try Renew license, or `/licensing/LIC_00388/revoke` for the four-eyes revoke flow.
- `/licensing/verify` — artifact integrity check with intact and tampered examples.
- `/design-system` — tokens and components.

| Command                                 | What it runs                                   |
| --------------------------------------- | ---------------------------------------------- |
| `pnpm dev`                              | Development server on port 3000                |
| `pnpm build`                            | Production build                               |
| `pnpm --filter admin_web start`         | Production server                              |
| `pnpm lint`                             | ESLint, zero warnings allowed                  |
| `pnpm typecheck`                        | Next route type generation and `tsc --noEmit`  |
| `pnpm test`                             | Vitest unit and component tests                |
| `pnpm --filter admin_web test:coverage` | Unit tests with coverage gates                 |
| `pnpm test:e2e`                         | Playwright browser and axe accessibility tests |
| `pnpm format` / `format:check`          | Prettier                                       |

First E2E run: `pnpm --filter admin_web exec playwright install chromium`. Locally, E2E reuses a server already running on port 3100 or starts the dev server there.

## Project structure

```
apps/admin_web/
  src/app/(console)/     Routes inside the global shell, one folder per module
  src/components/ui/     Design-system primitives
  src/components/shell/  Sidebar, top bar, command palette, preview dialogs
  src/components/charts/ Chart primitives (validated palette, keyboard tooltips, table views)
  src/features/<module>/ Module screens and composites
  src/domain/            Types, status vocabulary and pure business rules (unit tested)
  src/server/data/       The only data entry point for pages (server-only)
  src/server/fixtures/   Fictional, deterministic design-track data
  tests/e2e/             Playwright and axe tests
docs/                    Specification, implementation plan, ADRs
```

Conventions:

- Pages read data only through `src/server/data`; ESLint blocks importing fixtures anywhere else.
- Business rules live in `src/domain` as pure functions with unit tests.
- Status always shows text or an icon alongside color. Button labels and dialog copy follow spec §31.
- Money stays per currency; values are never converted without an approved FX source.
- Motion is CSS only: pages and card grids rise in (`stagger`), charts draw and grow, overlays pop. Everything collapses under `prefers-reduced-motion`, which the E2E suite runs with so axe never measures text mid-fade.
- Scrollbars are hidden. Horizontal scrollers (tables, tab rows) use `scroll-fade-x`, a scroll-driven edge fade that appears only while there is more to scroll.

## Quality gates

- **pre-commit**: ESLint `--fix` and Prettier on staged files (lint-staged).
- **commit-msg**: Conventional Commits (commitlint).
- **pre-push**: lint, typecheck and unit tests.
- **CI** on every pull request: format, lint, typecheck, unit tests with coverage gates (80% on domain, lib and server; 70% on UI primitives), production build, Playwright E2E with axe WCAG 2.2 AA at 1440 and 1024 px, dependency audit, Semgrep SAST and Gitleaks secret scan.
- **CD** on `develop` and `main`: production bundle with build provenance, published as a workflow artifact. Containerization and AWS deployment come in a later release.

## Branching

`main` is production, `develop` is integration. All work lands via a `feat/*`, `fix/*`, `docs/*` or `chore/*` branch and a pull request into `develop`. Each pull request merges into `develop` with a merge commit once CI passes. Releases are pull requests from `develop` into `main`.
