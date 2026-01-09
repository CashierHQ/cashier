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

## Local commands

- Before running any commands on local, please confirm that the current using identity is `cashier_local_dev`

```bash
dfx identity whoami
```

- Deploy all canister

```bash
just dfx_local_deploy
```

this command will deploy all BE canisters, alongside with ICP ledger, ICRC1 token ledgers, ICRC7 NFT ledger
to local network.

- Airdrop token and NFT

```bash
just dfx_local_airdrop <principal_id>
```

this command airdrop multiple ICRC token, alongside with NFT to target principal. The target principal can be retrieved from FE wallet.

## Mainnet commands

- Before running commands on mainnet, it is necessary to create an identity and topup sufficient cycles for deploying canister.

```bash
dfx identity new <identity_name>
```

- Deploy ICRC7 NFT ledger

```bash
just dfx_mainnet_deploy_icrc7_ledger <Collection_name> <Collection_symbol> <Collection_description>
```

- Mint NFT to target principal

```bash
just dfx_mainnet_mint_nft <target_principal> <icrc7_ledger_canister_id> <nft_name> <nft_description> <nft_image_url>
```
