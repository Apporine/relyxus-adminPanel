# Apporine Control Plane — Implementation Plan

Authority: [Apporine Internal Admin Control Plane Specification v2.0](spec/Apporine_Internal_Admin_Control_Plane_Specification_v2.0_FINAL.docx) (12 Oct 2026). Section references below (§) point into that document. Where this plan and the specification disagree, the specification wins.

## 1. Current focus: design track

The first track delivers the **Admin Web** (§33) as a high-fidelity, fully navigable interface backed by typed fixture data. There is no Control API, database, auth provider or KMS yet. The goal is to lock the visual system, interaction contract and screen inventory (§6, §30–§32) before backend phases start, so backend work implements against agreed screens rather than inventing them.

Rules for the design track:

- Screens read data through `src/server/data/*` query functions that return domain types. Today they read fixtures; later they call the Control API. Components never import fixtures directly.
- Fixture data is plausible but fictional. No real customer names, contacts or identifiers.
- Governed actions (issue, revoke, approve…) open the real dialogs with reason capture and impact summary (§31) but end in a clearly labelled "not connected" outcome. Nothing pretends to sign or mutate.
- Every number on a dashboard has a named source query (§8.1, §30.1 acceptance), even if that query is a fixture function today.
- Exact button labels, dialog titles and empty-state copy come from §31.

## 2. Reference: Relyxus frontend

`relyxus-frontend.vercel.app` is the sibling customer product. Patterns adopted from it:

| Pattern    | Relyxus                                                   | Control plane decision                                                                          |
| ---------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Framework  | Next.js App Router, Turbopack                             | Same (Next.js 16, React 19, TypeScript strict)                                                  |
| Styling    | Tailwind v4, CSS-first `@theme` mapped to `--rx-*` tokens | Same mechanism, `--ap-*` tokens with the Apporine palette (§6)                                  |
| Primitives | Radix UI, lucide icons, zod                               | Same                                                                                            |
| Shell      | 56 px sticky top bar, collapsible sidebar, skip link      | 56 px top bar, 248 / 72 px sidebar (§6.2), skip link                                            |
| Layering   | z-index tokens (sticky, drawer, dialog, toast, palette)   | Same token set                                                                                  |
| Direction  | Logical properties (`start`/`end`)                        | Same, keeps RTL possible                                                                        |
| Theme      | Dark, neutral, monochrome action                          | **Different**: light Canvas, Ink navigation, Violet action, Cyan focus/healthy, Coral risk (§6) |

The control plane is a separate product with its own palette; it shares engineering patterns, not visual identity.

## 3. Architecture of the web app

```
apps/admin_web/
  src/app/                 Routes (App Router). One folder per module in §4.
  src/components/ui/       Design-system primitives (button, badge, card, table, dialog…)
  src/components/shell/    Global shell: sidebar, top bar, command palette, breadcrumbs
  src/components/charts/   Restrained SVG chart primitives (§6.2 chart rules)
  src/features/<module>/   Module-specific composites (customer header, license revision list…)
  src/domain/              Domain types, enums, state labels, pure helpers (unit tested)
  src/server/data/         Query functions — the only data entry point for pages
  src/server/fixtures/     Fictional fixture records
  src/lib/                 Cross-cutting utilities (cn, formatting, dates)
  tests/e2e/               Playwright browser + axe accessibility tests
```

The repository follows §41 so Python services (`services/control_api`, `services/license_issuer`, workers) and `infrastructure/opentofu` can be added beside the web app without restructuring.

## 4. Engineering workflow

- **Branching**: `main` is production, `develop` is integration. Every change lands through a `feat/*`, `fix/*`, `docs/*` or `chore/*` branch and a pull request into `develop`. Releases are PRs from `develop` into `main`.
- **Commits**: Conventional Commits, enforced by commitlint on `commit-msg`.
- **Pre-commit**: lint-staged runs ESLint (fix) and Prettier on staged files; `pre-push` runs lint, typecheck and unit tests.
- **Runtime**: Node 24 LTS, pinned in `.nvmrc` and `.npmrc` (`use-node-version`), so pnpm runs project scripts on the same Node locally and in CI.
- **CI** (every PR and push to `develop`/`main`): install → format check → lint → typecheck → unit tests with coverage → production build → Playwright E2E + axe accessibility → dependency audit → Semgrep SAST → Gitleaks secret scan.
- **CD**: on `develop` and `main`, build the production bundle once, attach build provenance and publish it as the release artifact. Containerization (OCI image, SBOM) and ECS Fargate deployment (§34–§35) come in a later release.

## 5. Feature breakdown

Each feature is one branch and one PR. Status: ✅ PR open or merged (number in brackets) · 🚧 in progress · ⏳ planned.

### Design track (frontend, fixture data)

| #   | Feature                                 | Scope                                                                                                                                                                                                                                                                         | Spec            |
| --- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| F0  | ✅ Plan and spec in repo (#1)           | This document, spec under `docs/spec`                                                                                                                                                                                                                                         | §42–43          |
| F1  | ✅ Foundation and quality pipeline (#2) | pnpm workspace, Next.js app, TS strict, ESLint, Prettier, Vitest, Playwright + axe, husky, lint-staged, commitlint, CI, CD bundle with provenance, PR template, Dependabot                                                                                                    | §35, §40        |
| F2  | ✅ Design system (#3)                   | Tokens (color, type, spacing, radius, layers, density), fonts, focus ring, primitives: Button, Badge/StatusBadge, Card, MetricCard, Table, Tabs, Dialog, Input/Select/Textarea, Tooltip, CopyableId, EmptyState, Skeleton, PageHeader. Living style guide at `/design-system` | §6, §32         |
| F3a | ✅ Domain model and data layer (#4)     | Domain types, status vocabulary, search grammar, fixtures, server-only data layer                                                                                                                                                                                             | §7.1, §36       |
| F3  | ✅ Global shell (#5)                    | Sidebar (13 modules, collapsible), top bar, environment badge, product switcher, breadcrumbs, pending approvals count, notifications, staff menu, command palette with search grammar (`customer:`, `license:`…), responsive collapse at 1024 px                              | §4, §7          |
| F4  | ✅ Portfolio command center (#6)        | Filter bar, 10 widgets, operational inbox, drill-through links, states (loading, partial, permission limited, stale)                                                                                                                                                          | §8, §30.1       |
| F5  | ⏳ Customers                            | Customer list (dense table, saved views, column density), Customer 360 with 13 tabs, right rail, unified timeline, contact detail                                                                                                                                             | §10, §12, §30.1 |
| F6  | ✅ Licensing (#9)                       | License list, license detail with immutable revision selector, Issue / Renew / Suspend / Revoke flows with reason, impact and typed confirmation, artifact verify                                                                                                             | §15, §31        |
| F7  | ⏳ Approvals                            | Queue (Mine, Team, High impact, Expiring, Decided, All), approval detail with structured diff, policy requirements, self-approval guard, My decisions                                                                                                                         | §21, §30.1      |
| F8  | ⏳ Deployments and releases             | Fleet list, deployment detail, release heatmap, upgrade readiness; release list/detail, compatibility matrix, customer impact preview                                                                                                                                         | §16, §17        |
| F9  | ⏳ Commercial and entitlements          | Contract list/detail, renewal radar, renewal workspace; entitlement definitions, customer entitlement detail, drift review                                                                                                                                                    | §13, §14, §19   |
| F10 | ⏳ Products                             | Product list/detail, entitlement catalog, product customers, release train                                                                                                                                                                                                    | §9              |
| F11 | ⏳ Success and support                  | Health overview and explainable score, success plan, QBR record, risk register; support overview, case references, escalation workspace, SLA report; onboarding board                                                                                                         | §11, §19, §20   |
| F12 | ⏳ Security                             | Staff access, role detail, access review, API clients, signing key metadata, break glass, security posture                                                                                                                                                                    | §5, §23         |
| F13 | ⏳ Audit                                | Audit log with synchronized analytics and detail drawer, audit analytics, export center                                                                                                                                                                                       | §24             |
| F14 | ⏳ Finance, analytics, data quality     | Commercial summary, cost to serve, margin estimate, cost attribution; report library/builder, saved views, scheduled reports; data quality center                                                                                                                             | §22, §26, §27   |
| F15 | ⏳ Settings and AI assistant shell      | Organization, identity, notifications, integrations, data policy, environments; read-only operator assistant panel                                                                                                                                                            | §28, §29        |

### Platform track (after design sign-off, per §42)

| Phase | Scope                                                                                                          |
| ----- | -------------------------------------------------------------------------------------------------------------- |
| 1     | Control API (FastAPI), PostgreSQL migrations, OIDC auth, staff RBAC with scopes, audit framework, environments |
| 2     | Products, customers, contacts, account teams, global search (PostgreSQL FTS), Customer 360 end to end          |
| 3     | Contracts, subscriptions, entitlements, renewal dates                                                          |
| 4     | License Issuer with KMS adapter, approvals, issue/renew/suspend/revoke, offline artifacts                      |
| 5     | Deployments, releases, compatibility, check-in metadata, drift engine                                          |
| 6     | Onboarding, health, support references, success plans, tasks, renewal workspace                                |
| 7     | Finance, cost attribution, analytics, reports, data quality                                                    |
| 8     | Security operations, access reviews, API clients, key rotation workflow, export center                         |
| 9     | Integrations, automation rules, notifications                                                                  |
| 10    | AI operator assistant, read only first                                                                         |
| 11    | Production AWS hardening (ECS Fargate, RDS Multi AZ), DR drills, pentest, performance                          |

Design-track pages switch from fixtures to the API phase by phase by replacing the bodies of `src/server/data/*` functions.

## 6. Design decisions

- **Palette** exactly as §6. Neutrals are derived from Ink and Canvas. Two derived text tones are added for accessibility: `violet-text` and `coral-text`, darker shades used only when Violet or Coral must appear as text on Canvas (raw Coral on Canvas is below 4.5:1).
- **Focus**: 2 px Accent Cyan outer ring with a 2 px Ink inner outline, so focus is visible on both Canvas and Ink surfaces (§32).
- **Status** always pairs text and icon with color (§6 accessibility rule). Health: Healthy (Cyan), Watch (neutral), At risk (Coral outline), Critical (Coral fill, Ink text).
- **Charts** are small SVG components: one Violet series, neutral comparisons, Cyan for selection, Coral only for risk. No more than five saturated colors per chart (§8.1).
- **Motion**: restrained and CSS only. Pages and card grids rise in with a short stagger, charts draw and grow from their baseline, dialogs and popovers pop from their trigger. Entrances fill backwards only so no transform lingers. `prefers-reduced-motion` removes durations, delays and loops.
- **Scrollbars** are hidden app-wide. Horizontal scrollers keep overflow discoverable with scroll-driven edge fades, and remain keyboard scrollable (focusable labelled regions).
- **Surfaces**: a faint Violet and Cyan aurora sits behind the top of the workspace and the Ink navigation; interactive cards lift on hover with a Violet to Cyan hairline. Decorative layers never carry meaning and stay behind content.
- **Production environment badge**: Ink surface, Coral indicator, explicit "PRODUCTION" text (§7).
- **Desktop first**: primary 1440 px, supported from 1024 px; below that the app is read-only emergency access (§32).

## 7. Open specification questions

Raised per §43 rather than invented:

1. The Licensing and Entitlement Architecture Specification v1.0 is referenced but not in the repository. License payload fields and state transitions in F6 follow §15 only until it is provided.
2. Health score weights (§19) are not specified. The design shows factor contributions with placeholder weights clearly labelled as illustrative.
3. Approval expiry durations and which actions require four-eyes by default (§21) are policy configuration; the UI shows them as policy-driven values.
4. Dark mode is not specified. The design track ships light Canvas with Ink navigation only.
5. Mobile is "emergency read access" (§32). The design track hides mutation actions below 768 px; confirm this is the intended behaviour.
