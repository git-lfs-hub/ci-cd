# git-lfs-hub/ci-cd

Reusable GitHub Actions workflows and composite actions for the [git-lfs-hub](https://github.com/git-lfs-hub) deploy pipeline.

## Reusable workflows

- `.github/workflows/ci.yml` — checkout + init + `turbo run test build`
- `.github/workflows/cd.yml` — checkout + init + deploy Worker
- `.github/workflows/staging.yml` — staging deploy + e2e test (called per-PR)

## Composite actions

- `actions/init` — bun setup, install deps, render vars.json + wrangler.jsonc
- `actions/init-staging` — variant that appends `-staging` suffix before rendering
- `actions/cd` — `turbo run deploy`
- `actions/e2e-test` — run e2e suite from `e2e/` workspace
- `actions/turbo-summary` — capture Turbo summary

## Usage

```yaml
jobs:
  ci:
    uses: git-lfs-hub/ci-cd/.github/workflows/ci.yml@main
    secrets: inherit
```

Pin to `@main` (floating), a tag, or a commit SHA. Callers must have the `git-lfs-hub` monorepo layout (turbo, `vars.input.json`, `server/`, `e2e/`).

The reusable workflows reference internal actions via local file paths (`./ci-cd/actions/*`). Callers must mount this repo as a submodule at `./ci-cd/` and use `submodules: recursive` on checkout.
