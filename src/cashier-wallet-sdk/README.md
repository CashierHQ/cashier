# @cashier-wallet/wallet-sdk

Framework-agnostic TypeScript SDK for integrating Internet Computer wallets into any DApp. Handles Internet Identity authentication, ICRC-1 token operations, and user consent — all without exposing private keys to the DApp.

---

## Installation

### Inside this monorepo (current usage)

The SDK lives in the pnpm workspace defined by [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) at the repo root. To consume it from another app in the monorepo, depend on it with the `workspace:*` protocol:

```json
{
  "dependencies": {
    "@cashier-wallet/wallet-sdk": "workspace:*"
  }
}
```

Then run `pnpm install` once at the repo root and `pnpm --filter @cashier-wallet/wallet-sdk build` to produce `dist/` (see [Local development](#local-development) below) — consumers resolve `@cashier-wallet/wallet-sdk` to that built output via the `main` / `module` / `types` fields in [`package.json`](package.json).

### Standalone (after publishing to npm)

```bash
npm install @cashier-wallet/wallet-sdk
# or
pnpm add @cashier-wallet/wallet-sdk
```

