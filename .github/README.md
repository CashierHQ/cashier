
# GitHub Actions Workflows

This folder contains GitHub Actions workflow definitions used for continuous integration and Orbit-based deployments.

## Overview

- CI workflows run automated checks, builds, and tests for changes on `main`, `dev`, and `staging` branches.
- Orbit workflows prepare and submit deployment requests (backend and frontend) based on branch-to-environment mapping.

## Workflows

- `build-test.yml` — Runs code style checks, Rust and frontend linters, builds canisters (Wasm target), and executes tests.

- `orbit-backend-deploy.yml` — Builds backend canisters, prepares canister arguments, and submits Orbit canister install/upgrade requests. It detects the target network from the branch (`main` → production, `staging` → staging, others → dev).

- `orbit-frontend-deploy.yml` — Builds frontend assets and submits Orbit asset upload / deployment requests for the selected network.

## Key Points

- Branch mapping: `main` → production, `staging` → staging, other branches → dev.
- Workflows use pinned tools and helper steps to install `dfx`, `ic-wasm`, and `candid-extractor` needed to prepare canister artifacts.
- Several workflows support `workflow_dispatch` so deployments can be triggered manually with options (e.g., `install`/`upgrade`/`reinstall`).

## How to run locally

Use `just` helpers from the repository root for local development and to mirror CI steps (see `just/dfx.just` and `just/build.just`). Example:

```bash
just check_code        # run format and lints
just dfx_local_deploy  # start local replica and deploy canisters
```

If you need to modify or extend workflows, edit files inside `.github/workflows/` and open a PR.
