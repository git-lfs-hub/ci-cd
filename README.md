# Git LFS Hub — ci-cd

[![CI][ci-badge]][gh-wf-href]
[![Coverage][coverage-badge]][coverage-href]
[![CodeQL][codeql-badge]][codeql-href]
[![Socket][socket-badge]][socket-href]
[![License][license-badge]][license-href]

Reusable GitHub Actions workflows and composite actions for [Git LFS Hub](https://github.com/git-lfs-hub) deploy pipelines — Bun setup, config render, `turbo` test/build/deploy, staging deploy + e2e, and Turbo run summaries.

For the bigger picture (what the stack does, the deploy flow, the other repos) see the [org overview](https://github.com/git-lfs-hub).

Consumed by [git-lfs-hub/deploy](https://github.com/git-lfs-hub/deploy):

- as **reusable workflows** at `git-lfs-hub/ci-cd/.github/workflows/*.yml@<ref>` — invoked from `deploy/.github/workflows/pr.yml` and `main.yml`
- as **composite actions** at `git-lfs-hub/ci-cd/actions/*@<ref>` — fetched directly by GitHub Actions (no submodule required in caller)

## Setup and Deployment

To wire CI/CD into a deploy checkout, call the reusable workflows from thin caller workflows under `.github/workflows/`. Reusable workflow jobs check out the caller repo with `submodules: recursive` so `config/`, `server/`, `docs/`, and `e2e/` are present on the runner. Composite actions are fetched directly by GitHub Actions from `git-lfs-hub/ci-cd/actions/*@<ref>` — no `ci-cd` submodule needed in the caller.

Pin workflow refs to `@main` (floating), a tag, or a commit SHA. Full secrets and staging setup for [git-lfs-hub/deploy](https://github.com/git-lfs-hub/deploy) are documented in [deploy/README.md — GitHub Actions](https://github.com/git-lfs-hub/deploy#github-actions).

## Reusable workflows

| Workflow | Purpose |
|:---------|:--------|
| `.github/workflows/ci.yml` | Checkout, init, test, build + Turbo summary |
| `.github/workflows/cd.yml` | Checkout, init, deploy prod + Turbo summary |
| `.github/workflows/staging.yml` | Staging vars render + deploy `-staging` + e2e |

All three are `workflow_call` entry points. They read `GLH_VARS_JSON` from caller `vars`/`secrets` (or committed `vars[.input].json`).

### `ci.yml` / `cd.yml`

| Secret / variable | Description |
|:------------------|:------------|
| `GLH_VARS_JSON` | Contents of `vars[.input].json` when not committed |
| `TURBO_TEAM`, `TURBO_TEAMID`, `TURBO_TOKEN` | Optional Turbo remote cache |
| `CLOUDFLARE_API_TOKEN` | Worker deploy (`cd.yml` only) |

#### Caller example

```yaml
ci:
  uses: git-lfs-hub/ci-cd/.github/workflows/ci.yml@main
  secrets: inherit
```

Production smoke after deploy uses composite actions directly in the caller workflow (see `deploy/.github/workflows/main.yml` — `e2e` job with `./ci-cd/actions/init-deploy` and `./ci-cd/actions/e2e-test`).

### What reusable workflows assume about the caller repo

- **Turbo monorepo** at the checkout root: `vars.input.json` (or `GLH_VARS_JSON`), `server/`, `config/`, `docs/`, `e2e/` submodules
- **`e2e/` workspace** registered in root `package.json` so `bun install --frozen-lockfile` installs vitest into `e2e/node_modules`

### `staging.yml`

`workflow_call` with no inputs. Reads `GLH_VARS_JSON` from caller `vars`/`secrets` and derives staging values internally by appending `-staging` to `cloudflare.workerName` and `s3.bucket`. **No separate `GLH_STAGING_VARS_JSON` needed.**

Concurrency group `lfs-server-staging-e2e` (queue depth 1) because deploy and e2e share one staging Worker.

#### Caller-side requirements

| Input / secret | Used by | Description |
|:---------------|:--------|:------------|
| `vars`/`secrets.GLH_VARS_JSON` | `init-staging` | Prod `vars.input.json` contents |
| `secrets.CLOUDFLARE_API_TOKEN` | `deploy` | Wrangler deploy auth |
| `secrets.GLH_STAGING_GITHUB_PAT` | `e2e-test` | Write on `git-lfs-hub/test`; org-mode requires `read:org` |
| `secrets.GLH_STAGING_LOGIN_SECRET` | `e2e-test` | Must match `LOGIN_SECRET` on `lfs-server-staging` |
| `secrets.TURBO_TOKEN` | env (optional) | Turbo remote cache |

#### Caller example (`deploy/.github/workflows/pr.yml`)

```yaml
staging:
  needs: ci
  if: github.event.pull_request.head.repo.full_name == github.repository
  uses: git-lfs-hub/ci-cd/.github/workflows/staging.yml@main
  secrets: inherit
```

## Composite actions

| Action | Description |
|:-------|:------------|
| `actions/init-bun` | Set up Bun, cache dependencies, `bun install --frozen-lockfile` |
| `actions/init-vars` | Write `vars-json` input to a file (default `vars.json`); fails if input is empty |
| `actions/init-deploy` | Node setup, `init-bun`, conditional `init-vars` → `vars.input.json`, then `turbo '//#config'` |
| `actions/init-staging` | Build staging `vars.input.json` (`-staging` suffix), then `init-deploy` + Worker name sanity check |
| `actions/deploy` | `turbo run deploy` (requires `cloudflare-api-token` input) |
| `actions/e2e-test` | Run vitest suite from `e2e/` (`gh-pat`, `login-secret`, `pr-number` inputs) |
| `actions/turbo-summary` | Post Turbo run summary via `charpeni/turborepo-summary-action` |

When neither `vars.json` nor `vars.input.json` exists, `init-deploy` calls `init-vars` to write `vars.input.json` from `GLH_VARS_JSON` or fails with a pointer to `bun run config`.

## Cross-repo layout

Reusable workflows reference composite actions via repo refs (`git-lfs-hub/ci-cd/actions/*@<ref>`) so they are fetched directly from GitHub Actions. The caller does not need a `ci-cd` submodule, but `actions/checkout` still needs `submodules: recursive` for `config/`, `server/`, `docs/`, and `e2e/`.

E2e tests live in [git-lfs-hub/e2e](https://github.com/git-lfs-hub/e2e) (`deploy/e2e/`). See [e2e/README.md](https://github.com/git-lfs-hub/e2e) for test behavior, env vars, and the `encryptCode` import from `server/`.

[ci-badge]: https://badgen.net/github/checks/git-lfs-hub/ci-cd/main?icon=vitest&label=CI
[gh-wf-href]: https://github.com/git-lfs-hub/ci-cd/actions/workflows/main.yml?query=branch%3Amain

[coverage-badge]: https://badgen.net/https/git-lfs-hub.github.io/ci-cd/coverage-badge.json?icon=vitest
[coverage-href]: https://git-lfs-hub.github.io/ci-cd/lcov-report/

[codeql-badge]: https://github.com/git-lfs-hub/ci-cd/actions/workflows/github-code-scanning/codeql/badge.svg
[codeql-href]: https://github.com/git-lfs-hub/ci-cd/actions/workflows/github-code-scanning/codeql?query=branch%3Amain

[socket-badge]: https://badgen.net/static/Socket/report/blue?icon=socket
[socket-href]: https://socket.dev/dashboard/org/git-lfs-hub/repo/@git-lfs-hub/ci-cd

[license-badge]: https://badgen.net/github/license/git-lfs-hub/ci-cd
[license-href]: LICENSE.md
