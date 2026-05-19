# Local Development Setup (Hybrid icp-cli + dfx)

## Overview

As of Phase 1 (2026-05-19), Cashier uses a **hybrid local setup**:
- **icp-cli** manages app canisters + auto-deployed NNS canisters (ICP ledger, ICP index, Internet Identity)
- **dfx** manages ledger canister fabrication (needs `--specified-id` which icp-cli 0.2.6 lacks)
- Both tools target same PocketIC backend at port 8000

## Architecture

### Networks

- **local** (icp-cli managed): PocketIC at `http://127.0.0.1:8000`, `nns: true` auto-deploys ICP ledger / ICP index / Internet Identity at canonical mainnet IDs
- **ic** (implicit mainnet): for dev/staging/production environments

### Configuration files

**`icp.yaml`** — icp-cli source of truth for 4 app canisters
```yaml
networks:
  - name: local
    mode: managed
    nns: true
    gateway:
      bind: 127.0.0.1
      port: 8000
    artificial-delay-ms: 0

environments:
  - name: local
    network: local
    canisters: [cashier_backend, token_storage, gate_service, cashier_frontend_new]
  - name: dev
    network: ic
    canisters: [cashier_backend, token_storage, cashier_frontend_new]
  - name: staging
    network: ic
    canisters: [cashier_frontend_new]
  - name: production
    network: ic
    canisters: [cashier_frontend_new]

canisters:
  - name: cashier_backend
    recipe:
      type: "@dfinity/prebuilt@v2.0.0"
      configuration:
        path: ./target/artifacts/cashier_backend.wasm.gz
  # ... token_storage, gate_service, cashier_frontend_new (@dfinity/asset-canister@v2.1.0)
```

Top-level schema: ONLY `canisters`, `environments`, `networks`. NO `version` or `project` fields. NO `-e` flag on `icp project show`.

**`dfx.json`** — hybrid (16 canisters)
- **12 ledger canisters** with `specified_id` (dfx-only local fabrication): ckbtc_ledger, ckbtc_minter, ckbtc_kyt, ckETH, ckUSDC, DOGE, ALICE, BOB, ckBTC_index, ckETH_index, ckUSDC_index, ICRC7NFT
- **4 app canisters** without `specified_id` (orbit-compat mirror for P5-deferred workflows; icp-cli is the actual deploy driver): cashier_backend, token_storage, gate_service, cashier_frontend_new
- **Networks**: `local` (PocketIC `http://127.0.0.1:8000`) + `dev`/`staging`/`production` mainnet stubs (`https://icp0.io`, kept for orbit deps)

**`.icp/data/mappings/<env>.ids.json`** — icp-cli mainnet canister registry
- `dev.ids.json`: 3 mainnet IDs (backend, frontend, token_storage)
- `staging.ids.json`: frontend staging ID
- `production.ids.json`: frontend production ID

**`canister_ids.json`** — retained at repo root. Used by orbit/dfx for `dfx canister id <name> --network <env>`. Same logical IDs as `.icp/data/mappings/`. Both files coexist.

## Local development workflow

### Prerequisites
```bash
pnpm install --frozen-lockfile
just build              # builds all backend canisters to ./target/artifacts/
```

### Inspect config (no replica needed)
```bash
icp project show                                     # dumps expanded icp.yaml
icp canister status cashier_backend -e dev --id-only # → edrez-4iaaa-aaaam-aekta-cai
icp canister status cashier_frontend_new -e production --id-only # → jg57n-...
dfx canister --network=dev id cashier_backend        # same ID via dfx (orbit path)
dfx canister --network=local id ckbtc_ledger         # → mxzaz-... (specified_id resolves without replica)
```

### Local deploy (P3 onward via `just icp_local_deploy`)
P3 introduces a single orchestration recipe. Until P3 merges, the legacy `just dfx_local_deploy` is intentionally broken (transition gap).

Once P3 lands:
```bash
just icp_local_deploy   # icp network start + dfx ledger fabrication + icp app deploys (single command)
just icp_local_info     # print canister URLs
just icp_local_stop     # tear down
```

## Mainnet deployment

- **icp-cli path** (deploy-canisters-dev.yml, P4): `just icp_deploy "$owner" "dev" ...`
- **Orbit path** (orbit-*-deploy.yml, P5-deferred): unchanged — uses `dfx canister create/id/update-settings --network <env>` + `dfx-orbit`

Both paths can write to the same mainnet canister principals. Coordinate to avoid stepping on each other.

## Removed (vs dfx-only era)

- `.env` file (was fully dfx-generated; sole consumer in `lib/generated/token_storage/index.js` replaced by `@icp-sdk/bindgen` Vite plugin in P2)
- `icp_ledger_canister`, `icp_index`, `internet_identity` from `dfx.json` (auto via `nns: true`)
- `src/cashier_frontend_new/dfx.json` (vestige referencing stale `cashier_frontend` name)
- `output_env_file: ".env"` field from `dfx.json`

## Roadmap

- **P2** — frontend bindgen (`@icp-sdk/bindgen` Vite plugin replaces `dfx generate`; move `$lib/generated/` → `$lib/bindings/`)
- **P3** — justfile recipes (`just/icp.just` orchestration; `just/dfx.just` retained as reference)
- **P4** — CI workflows + `setup-icp-cli` composite action
- **P5** — orbit workflows (deferred until `icp-orbit` upstream or fork)

---
**Updated:** 2026-05-19 | **Plan:** [plans/260519-1413-dfx-to-icp-cli-migration-v2/](../plans/260519-1413-dfx-to-icp-cli-migration-v2/) | **Phase:** 1 (Config Foundation) — done
