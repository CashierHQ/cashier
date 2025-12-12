
# Just Task Runner

This directory contains modular task recipes used by the project's `justfile` (imported from the project root). The `just` commands provide a concise, repeatable interface for building, testing, running, and deploying the Cashier stacks (backend canisters and frontend).

## Overview

- The root `justfile` imports these modules so you can run all common tasks from the repository root via `just <command>`.
- Tasks are grouped by purpose: build, code checks, dfx/local IC workflows, tests, run/dev, and Orbit deploy helpers.

## Files & Purpose

- `build.just` — Build canisters, generate frontend TS bindings from Candid, download third-party artifacts, and build frontend bundles.
- `code_check.just` — Formatting and linting helpers (`cargo fmt`, `clippy`, frontend linting).
- `dfx.just` — Local development and deployment helpers for the Internet Computer (`dfx start`, local deploys, airdrops, info/logs).
- `test.just` — Run unit/integration tests and frontend test suites; includes coverage entrypoints.
- `run.just` — Start local dev servers (frontend), helpers for quick iteration.
- `orbit.just` — Helpers to build canister args, compute checksums, and submit Orbit requests for canister and frontend deployments.

## Quick Usage

From the project root run:

```bash
just              # show available tasks
just build        # build canisters and frontend (high-level)
just check_code   # run rustfmt + clippy and frontend lint
just dfx_local_deploy  # start local dfx and deploy canisters locally
just test         # run tests (backend + frontend)
just start_frontend_new  # run new frontend dev server
```

Most high-level tasks chain the lower-level helpers (for example `build` will download required artifacts, compile canisters, and generate frontend bindings).

If you need to inspect a specific task, open the corresponding file in this directory (e.g., `just/dfx.just`).
