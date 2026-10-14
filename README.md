# Apporine Control Plane

Internal admin control plane for Apporine customer operations: products, customers, contracts, entitlements, licenses, deployments, releases, approvals and audit across Relyxus and future Apporine products.

- Specification: [docs/spec](docs/spec) (v2.0, 12 October 2026)
- Implementation plan, feature list and status: [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)

## Status

The project is in the **design track**: the Admin Web is built screen by screen against typed fixture data, before the Control API exists. Nothing is persisted. Actions that would change data open their real dialogs and end with "Not connected to the Control API. Nothing was saved."

| Feature                         | Screens                                                                                                                                                                                                            | State   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| Foundation and quality pipeline | —                                                                                                                                                                                                                  | Done    |
| Design system                   | `/design-system`                                                                                                                                                                                                   | Done    |
| Domain model and data layer     | —                                                                                                                                                                                                                  | Done    |
| Global shell                    | Sidebar, top bar, command palette (Ctrl/⌘ K)                                                                                                                                                                       | Done    |
| Portfolio command center        | `/`                                                                                                                                                                                                                | Done    |
| Customers                       | `/customers` list, `/customers/[id]` Customer 360, contact detail                                                                                                                                                  | Done    |
| Licensing                       | `/licensing` list, `/licensing/[id]` detail, issue/renew/replace/rebind/suspend/revoke flows, `/licensing/verify`                                                                                                  | Done    |
| Approvals                       | `/approvals` queue (Mine, Team, High impact, Expiring, Decided, All), `/approvals/[id]` detail, `/approvals/decisions`                                                                                             | Done    |
| Deployments and releases        | `/deployments` fleet, heatmap, upgrade readiness, `/deployments/[id]`; `/releases` list, compatibility matrix, `/releases/[id]` with customer impact                                                               | Done    |
| Commercial and entitlements     | `/commercial` contracts, `/commercial/contracts/[id]`, renewal radar and workspace, entitlement definitions, customer entitlements, drift review                                                                   | Done    |
| Products                        | `/products` portfolio, `/products/[id]` overview, entitlement catalog, customers and release train                                                                                                                 | Done    |
| Success and support             | `/success` health overview, customer health detail, success plans, QBRs, risk register, onboarding board; `/success/support` cases, escalation workspace, SLA report                                               | Done    |
| Security                        | `/security` posture, staff access, roles and role detail, access reviews, API clients, signing keys, break glass, sensitive data access                                                                            | Done    |
| Audit                           | `/audit` log with synchronized analytics, filters and event drawer; `/audit/analytics`; `/audit/exports` export center with hash chain verification                                                                | Done    |
| Finance                         | `/analytics/finance` commercial summary, cost to serve with allocation views, margin estimate ranges, cost attribution                                                                                             | Done    |
| Reports and data quality        | `/analytics` report library and `/analytics/reports/[id]`, report builder, saved views, scheduled reports; `/analytics/data-quality` checks, completeness, duplicates, source ownership, classification, retention | Done    |
| All other modules               | Routed placeholders that list each module's planned screens                                                                                                                                                        | Planned |

## Getting started

Requires pnpm 10 (it switches itself to the version in `packageManager`). Node 24 LTS is pinned through `useNodeVersion` in `pnpm-workspace.yaml`: pnpm downloads it and runs every project script on it, whatever Node is installed globally. `engines.node` (`24.x`) tells hosting platforms such as Vercel which Node to use.

Deploying on Vercel: no dashboard setup is needed. The root `vercel.json` sets the Next.js preset, builds `admin_web` and points the output at `apps/admin_web/.next`. `next` is also a root devDependency because Vercel looks for it in the root `package.json`. Keep the project Root Directory as the repository root.

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
- `/deployments/readiness` — every deployment against the newest release, with the reason it is blocked or needs review. `/releases/rel_2_5_0` is a built but unsupported release with failing gates.
- `/commercial/renewals` — renewal radar by 30/60/90/120 day window; open `/commercial/renewals/ctr_halden` for the workspace. `/commercial/drift` compares contract, entitlement, signed license and deployment check ins.
- `/success/onboarding` — onboarding board with checklists; `/success/support/cases/sc_06` is a level 3 escalation workspace.
- `/approvals` — requests waiting for you. `/approvals/apr_1039` can be decided; `/approvals/apr_1042` is your own request, so the self-approval guard blocks it.
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
