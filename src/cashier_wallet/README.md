# Cashier Wallet (SvelteKit app)

The hosted wallet application that backs [`@cashier-wallet/wallet-sdk`](../cashier-wallet-sdk/README.md). It runs as a SvelteKit app on `http://localhost:5177` and handles everything that must stay inside the wallet origin: Internet Identity login, ICRC-1 ledger calls, message signing, and the consent UI shown in the wallet popup.

DApps never talk to this app directly — they instantiate the SDK, which mounts this app inside a hidden iframe and opens it as a popup for login and consent. See the [SDK README](../cashier-wallet-sdk/README.md) for the full protocol, message shapes, and security properties.

---

## Prerequisites

- Node.js 20+
- pnpm 9 — pinned to `pnpm@9.15.4` via [`packageManager`](../../package.json) at the repo root. The easiest way to match it is `corepack enable`, which picks up the pinned version automatically.

You do **not** need a local `dfx` replica to run the wallet. Internet Identity authentication uses mainnet at `https://id.ai`, and ICRC-1 ledger calls hit `https://icp-api.io` via `@dfinity/agent`.

---

## Install

Run `pnpm install` **at the repo root** (not in this directory) — the workspace is defined in [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml), so installing from the root wires up this app together with the SDK and the other workspace packages.

```bash
# from /…/cashier (repo root)
pnpm install
```

---

## Run locally


### Dev server

```bash
cd src/cashier_wallet
npm run dev
```

Starts Vite on `http://localhost:5177`. The port is fixed with `strictPort: true` in [`vite.config.ts`](vite.config.ts) — this is the origin the SDK expects by default, so do not change it unless you also pass a matching `walletOrigin` to every `WalletSDK` instance.

