# Local Development

How to build, deploy, and run the full Cashier stack on a local replica.

## Architecture — hybrid icp-cli + dfx

Local dev uses **two CLIs**:

| Tool | Role |
|------|------|
| `icp` (icp-cli) | Runs the local network (PocketIC); deploys the app canisters |
| `dfx` | Deploys token ledgers/indexes that need fixed canister IDs (`--specified-id`) |

Why both: `icp-cli` has no `--specified-id`, so the ck-token ledgers (which must keep their
mainnet IDs) are deployed by `dfx` running as a client against the icp-cli network. The ICP
ledger and Internet Identity come for free from the network's `nns: true` / `ii: true` config
in [icp.yaml](../icp.yaml).

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) — then `rustup target add wasm32-unknown-unknown`
- [icp-cli](https://cli.internetcomputer.org) (`icp`, 0.2.6+)
- [dfx](https://internetcomputer.org/docs/building-apps/getting-started/install)
- [Just](https://just.systems/man/en/)
- [Node.js](https://nodejs.org) + [pnpm](https://pnpm.io)
- [ic-wasm](https://github.com/dfinity/ic-wasm) + [candid-extractor](https://github.com/dfinity/candid-extractor) — must be on `PATH`

## Quick start

```bash
# 1. Build canisters + frontend (required before deploy)
just build

# 2. Start the local network and deploy the whole stack
just icp_local_deploy

# 3. Run the frontend dev server (Vite, hot reload)
just start_frontend

# 4. After logging in, airdrop test tokens to your principal
just icp_local_airdrop <your-principal>

# Stop the network when done
just icp_local_stop
```

`just build` must run **before** deploy — `icp deploy` installs prebuilt wasm from
`target/artifacts/`, and the frontend canister serves `src/cashier_frontend_new/build`.

## What gets deployed

`just icp_local_deploy` stops any running network, starts a fresh one, then deploys:

| Source | Canisters |
|--------|-----------|
| Network (`nns: true`) | NNS incl. **ICP ledger** (`ryjl3-…`) + ICP index |
| Network (`ii: true`) | **Internet Identity** |
| `dfx` (`--specified-id`) | ckETH / ckUSDC / DOGE ledgers · ckBTC + ckETH + ckUSDC indexes · ckBTC ledger / minter / kyt |
| `icp-cli` | `token_storage` · `cashier_backend` · `gate_service` · `cashier_frontend_new` |

Network gateway: `http://localhost:8000`. Any canister is reachable at
`http://<canister-id>.localhost:8000`.

## Frontend

Two ways to view the frontend:

- **`just start_frontend`** — Vite dev server with hot reload. Use this for active development.
- **Deployed canister** — `cashier_frontend_new` serves the built `build/` output at its
  canister URL. Use this for a production-like check.

Both talk to the local replica on `:8000`. If the frontend can't reach the backend, confirm
`just icp_local_deploy` completed.

## Command reference

| Command | Description |
|---------|-------------|
| `just build` | Build canisters + frontend; download third-party artifacts |
| `just icp_local_start` | Start the local network (PocketIC + NNS + II) |
| `just icp_local_stop` | Stop the local network |
| `just icp_local_deploy` | Full local deploy — fresh network + ledgers + app canisters |
| `just icp_deploy [env]` | Deploy app canisters only (`token_storage`, `cashier_backend`, frontend) |
| `just icp_deploy_token_storage [env]` | Deploy `token_storage` |
| `just icp_deploy_backend [env]` | Deploy `cashier_backend` |
| `just icp_deploy_gate [env]` | Deploy `gate_service` |
| `just icp_deploy_frontend [env]` | Deploy `cashier_frontend_new` |
| `just icp_local_airdrop <principal>` | Airdrop ICP + ckETH / ckUSDC / DOGE to a principal |
| `just start_frontend` | Run the frontend Vite dev server |

`env` defaults to `local`. Other values (`dev` / `staging` / `production`) target mainnet —
see [icp.yaml](../icp.yaml). `icp_local_airdrop` does **not** airdrop ckBTC (its minting
account is the ckBTC minter canister, not transferable via a plain `icrc1_transfer`).

## Identities

Two default identities are used:

- **icp-cli default identity** (`icp identity principal`) → owner of the app canisters
- **dfx default identity** (`dfx identity get-principal`) → minter of the token ledgers

`just icp_local_airdrop` mints each token from the correct identity. Ensure both `icp` and
`dfx` have a usable default identity before deploying.

## Canister logs

```bash
icp canister logs cashier_backend -e local
```

Console logging is enabled by default in local deploys.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `the local network ... is not running` | `just icp_local_start` |
| Deploy fails — missing wasm / artifacts | run `just build` first |
| Port 8000 already in use | `just icp_local_stop`, then `dfx stop` |
| Stale canister IDs after a restart | `icp_local_deploy` clears `.dfx/local`; remove it manually if issues persist |
| II login fails / certificate errors | clear browser cache + cookies for `localhost`, then retry |

## Legacy: full-dfx flow

Before the icp-cli migration the stack ran entirely on dfx. That path still exists
(`just dfx_local_deploy`, `just dfx_local_airdrop`) but is superseded by the `icp_*`
recipes above.
