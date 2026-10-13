# Apporine Control Plane

Internal admin control plane for Apporine customer operations: products, customers, contracts, entitlements, licenses, deployments, releases, approvals and audit across Relyxus and future Apporine products.

- Specification: [docs/spec](docs/spec)
- Implementation plan and feature breakdown: [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)

## Getting started

Requires pnpm 10. The project pins Node 24 LTS through `.npmrc`; pnpm downloads and uses it for every project script, whatever Node is installed globally.

```sh
pnpm install
pnpm dev            # http://localhost:3000
```

| Command                        | What it runs                                  |
| ------------------------------ | --------------------------------------------- |
| `pnpm lint`                    | ESLint, zero warnings allowed                 |
| `pnpm typecheck`               | Next route type generation and `tsc --noEmit` |
| `pnpm test`                    | Vitest unit and component tests               |
| `pnpm test:e2e`                | Playwright browser and axe accessibility      |
| `pnpm build`                   | Production build                              |
| `pnpm format` / `format:check` | Prettier                                      |

First E2E run: `pnpm --filter admin_web exec playwright install chromium`.

## Quality gates

- **pre-commit**: ESLint `--fix` and Prettier on staged files (lint-staged).
- **commit-msg**: Conventional Commits (commitlint).
- **pre-push**: lint, typecheck and unit tests.
- **CI** on every PR: format, lint, typecheck, unit tests with coverage thresholds, production build, E2E with axe, dependency audit, Semgrep SAST and Gitleaks secret scan.
- **CD** on `develop` and `main`: production bundle with build provenance, published as a workflow artifact.

## Branching

`main` is production, `develop` is integration. All work lands via a `feat/*`, `fix/*`, `docs/*` or `chore/*` branch and a pull request into `develop`. Releases are pull requests from `develop` into `main`.
