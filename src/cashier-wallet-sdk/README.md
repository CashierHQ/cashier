# @cashier-wallet/wallet-sdk

Framework-agnostic TypeScript SDK for integrating Internet Computer wallets into any DApp. Handles Internet Identity authentication, ICRC-1 token operations, and user consent — all without exposing private keys to the DApp.

---

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Flows](#flows)
  - [1. Initialization](#1-initialization)
  - [2. Login with Internet Identity](#2-login-with-internet-identity)
  - [3. Logout](#3-logout)
  - [4. Check Authentication Status](#4-check-authentication-status)
  - [5. Get Principal](#5-get-principal)
  - [6. Sign a Message](#6-sign-a-message)
  - [7. Query ICRC-1 Token Balance](#7-query-icrc-1-token-balance)
  - [8. ICRC-1 Token Transfer](#8-icrc-1-token-transfer)
- [Events](#events)
- [API Reference](#api-reference)
- [Error Reference](#error-reference)
- [Internal Architecture](#internal-architecture)

---

## Overview

The SDK acts as a secure bridge between a DApp and a hosted wallet application. The wallet runs in a **hidden iframe** (for fast non-interactive operations) and in **popup windows** (for login and consent). The DApp never touches private keys — all signing, identity management, and ledger calls happen inside the wallet origin.

```
DApp  ──postMessage──▶  Wallet iframe (rpc-handler)
                              │
                        BroadcastChannel
                              │
                        Wallet popup (/consent)
                              │
                       User sees and approves
```

**Key properties:**

- Zero framework dependencies — works with React, Vue, Svelte, plain HTML
- Private keys never leave the wallet origin
- Consent for sensitive operations is shown inside the wallet's own popup (cannot be spoofed by the DApp)
- Implements [ICRC-29](https://github.com/dfinity/ICRC/tree/main/ICRCs/ICRC-29) window post-message transport

---

## Installation

The SDK is currently used as a pnpm workspace dependency. To reference it from another app in the monorepo:

```json
{
  "dependencies": {
    "@cashier-wallet/wallet-sdk": "workspace:*"
  }
}
```

When published to npm, install it with:

```bash
npm install @cashier-wallet/wallet-sdk
# or
pnpm add @cashier-wallet/wallet-sdk
```

---

## Quick Start

```typescript
import { WalletSDK } from "@cashier-wallet/wallet-sdk";

// 1. Create the SDK instance — no config needed for the default wallet
const sdk = new WalletSDK();

// 2. Listen for auth changes (fires on login, logout, and initial session restore)
sdk.on("authChange", ({ authenticated, principal }) => {
  if (authenticated) {
    console.log("Logged in as", principal);
  }
});

// 3. Mount — creates the hidden iframe and performs the ICRC-29 handshake
await sdk.mount(document.body);

// 4. Log in via Internet Identity
await sdk.login();

// 5. Transfer tokens — opens a wallet consent popup before executing
const { blockIndex } = await sdk.icrc1Transfer({
  canisterId: "ryjl3-tyaaa-aaaaa-aaaba-cai",
  to: "aaaaa-aa",
  amount: BigInt(10_000), // in smallest unit (e8s for ICP)
});

console.log("Transfer complete, block index:", blockIndex);

// 6. Clean up when the page unmounts
sdk.unmount();
```

### Local development

The default wallet origin is `http://localhost:5177`. When developing locally against a different port or a staging environment, pass `walletOrigin` explicitly:

```typescript
const sdk = new WalletSDK({ walletOrigin: "http://localhost:5177" });
```

---

## Flows

### 1. Initialization

#### User perspective

The user sees nothing at this stage. The SDK silently sets up a connection to the wallet in the background. If a previous Internet Identity session exists in the wallet, the `authChange` event fires automatically and the DApp can show the user as already logged in.

#### Technical steps

1. **`new WalletSDK({ walletOrigin })`** — stores configuration. No side-effects yet.

2. **`sdk.mount(container)`** — performs the following:

   a. Creates an `RpcClient` targeting the wallet origin.

   b. Creates a zero-size, invisible `<iframe>` pointing at `walletOrigin` and appends it to `container`:

   ```
   position:absolute; width:0; height:0; border:0; visibility:hidden;
   ```

   c. Once the iframe fires its `load` event, sends a JSON-RPC `connect` request with a 1-second timeout. Retries up to **5 times** to handle the race condition where the iframe's `load` event fires before the SvelteKit app inside it has hydrated.

   d. On a successful handshake response the SDK:
   - Sets `connected = true`
   - Emits `'connected'`
   - Calls `_refreshAuth()` which queries `is_authenticated` and, if a session exists, also queries `get_principal`, then emits `'authChange'`

   e. `mount()` resolves once the handshake succeeds. It rejects if all 5 retries fail.

```
sdk.mount(el)
  │
  ├─▶ create hidden <iframe src=walletOrigin>
  │
  ├─▶ iframe loads → send RPC "connect" (retry ×5, 1s timeout each)
  │       │
  │       ▼ wallet responds { status: "connected", version: "0.1.0" }
  │
  ├─▶ emit "connected"
  │
  └─▶ _refreshAuth() → RPC "is_authenticated"
          │ authenticated=true
          └─▶ RPC "get_principal" → emit "authChange" { authenticated, principal }
```

---

### 2. Login with Internet Identity

#### User perspective

The user clicks a "Login" button in the DApp. A single browser popup opens and immediately launches Internet Identity — no intermediate wallet page interaction is required. The user completes authentication (passkey, WebAuthn, or seed phrase) inside the II window. Once authenticated, the II popup closes, the wallet popup notifies the DApp and closes itself. The DApp now shows the user as authenticated.

#### Technical steps

1. **`sdk.login()`** calls `window.open(walletOrigin, '_blank')` — opens the wallet page in a new popup.

2. The SDK sets up a `message` event listener on the current window, waiting for `{ type: 'wallet_auth_complete' }` from `walletOrigin`.

3. The wallet popup mounts and detects `window.opener && !authenticated`. It **automatically calls `AuthClient.login({ identityProvider: 'https://id.ai' })`** without waiting for any button click. This opens the Internet Identity service. The wallet popup shows a "Opening Internet Identity…" loading state.

4. The user authenticates with Internet Identity. II creates a delegated identity scoped to the wallet origin and stores it in the wallet's IndexedDB.

5. The wallet popup receives the `onSuccess` callback. It sends:

   ```javascript
   window.opener.postMessage(
     { type: "wallet_auth_complete", principal },
     dappOrigin,
   );
   ```

   Then calls `window.close()`.

6. Back in the SDK, the `message` listener fires. The SDK calls `_refreshAuth()`:
   - Sends RPC `is_authenticated` to the hidden iframe
   - The iframe calls `refreshAuthClient()` — re-reads IndexedDB so it picks up the session written by the popup (they share the same origin's storage)
   - Responds `{ authenticated: true }`
   - SDK then sends RPC `get_principal`
   - Emits `'authChange'` with `{ authenticated: true, principal }`

7. `sdk.login()` resolves with `{ principal }`.

```
sdk.login()
  │
  ├─▶ window.open(walletOrigin)    [wallet popup]
  │       │
  │       ├─▶ onMount: window.opener && !authenticated → auto-calls AuthClient.login()
  │       │       │
  │       │       └─▶ II popup opens (user authenticates — one interaction window)
  │       │               │ user authenticates
  │       │               └─▶ identity stored in IndexedDB (wallet origin)
  │       │
  │       └─▶ postMessage({ type: 'wallet_auth_complete' }) → window.close()
  │
  ├─▶ SDK receives 'wallet_auth_complete'
  │
  └─▶ _refreshAuth()
          │
          ├─▶ RPC "is_authenticated" → iframe refreshes IndexedDB → { authenticated: true }
          └─▶ RPC "get_principal"    → emit "authChange" { authenticated: true, principal }
```

---

### 3. Logout

#### User perspective

The user clicks a "Logout" button. The session is cleared. The DApp updates to show the logged-out state.

#### Technical steps

1. **`sdk.logout()`** sends RPC `logout` to the hidden iframe via `RpcClient`.

2. The wallet's `rpc-handler` calls `AuthClient.logout()`, which clears the IndexedDB session for the wallet origin.

3. The wallet responds `{ status: 'logged_out' }`.

4. The SDK emits `'authChange'` with `{ authenticated: false, principal: '' }`.

5. `sdk.logout()` resolves.

```
sdk.logout()
  │
  ├─▶ RPC "logout" → wallet calls AuthClient.logout() → clears IndexedDB
  │
  └─▶ emit "authChange" { authenticated: false, principal: '' }
```

---

### 4. Check Authentication Status

#### User perspective

Invisible to the user — used by the DApp on page load to determine whether to show a "Login" button or the user's principal. The `authChange` event from `mount()` covers most cases; `isAuthenticated()` is for manual re-checks.

#### Technical steps

1. **`sdk.isAuthenticated()`** sends RPC `is_authenticated` to the hidden iframe.

2. The wallet's `rpc-handler` calls `refreshAuthClient()` (re-reads IndexedDB) then `authClient.isAuthenticated()`.

3. Returns `{ authenticated: boolean }`.

4. `sdk.isAuthenticated()` resolves with the boolean value.

No consent popup is shown — this method is in the bypass list.

---

### 5. Get Principal

#### User perspective

A consent popup opens showing "Method: get_principal". The user approves. The DApp receives the principal string.

#### Technical steps

`sdk.getPrincipal()` is consent-gated and goes through `_requestWithConsent('get_principal')`:

1. **Phase 1 — Register consent**: SDK generates a `consentId = crypto.randomUUID()`. Sends RPC `consent_prepare` with `{ method: 'get_principal', params: undefined, consentId }` to the hidden iframe. The wallet stores this in `pendingConsents` Map with an `approvalPromise` (a Promise whose resolve/reject callbacks are held internally). Responds `{ ok: true }`.

2. **Phase 2 — Consent popup**: SDK calls `_openConsentPopup(consentId)`:
   - Opens `walletOrigin/consent?id=consentId` as a popup (480×640)
   - Sets up a `message` listener on the DApp window for `consent_approved` / `consent_rejected` from `walletOrigin`
   - Sets up a 500ms interval to detect if the popup is closed without a decision

3. **Inside the consent popup** (`/consent?id=...`):
   - Reads `consentId` from URL params
   - Opens its own `BroadcastChannel('wallet-consent')`
   - Sends `{ type: 'consent_get', consentId }` over the channel
   - The hidden iframe's `consentChannel` listener receives this and replies `{ type: 'consent_data', consentId, method, params }`
   - The consent page renders the method name and parameters
   - User clicks **Approve**

4. **On approval**:
   - Popup sends `{ type: 'consent_approved', consentId }` over `BroadcastChannel` → the hidden iframe's listener calls `consent._approve()`, resolving `approvalPromise`
   - Popup sends `window.opener.postMessage({ type: 'consent_approved', consentId }, dappOrigin)` → SDK's `message` listener resolves `_openConsentPopup`
   - Popup calls `window.close()`

5. **Phase 3 — Execute**: SDK sends the actual RPC `get_principal` with `{ consentId }` in params to the hidden iframe. The wallet finds the consent entry, awaits `approvalPromise` (already resolved), deletes the entry, and executes `identity.getPrincipal().toText()`. Responds `{ principal: '...' }`.

6. `sdk.getPrincipal()` resolves with the principal string.

```
sdk.getPrincipal()
  │
  ├─▶ Phase 1: RPC "consent_prepare" { method, consentId }
  │       └─▶ wallet stores pendingConsents[consentId] → { ok: true }
  │
  ├─▶ Phase 2: window.open(walletOrigin/consent?id=consentId)
  │       │
  │       │   [consent popup]
  │       ├─▶ BroadcastChannel "consent_get"   → iframe replies "consent_data"
  │       ├─▶ popup renders method + params
  │       ├─▶ user clicks Approve
  │       ├─▶ BroadcastChannel "consent_approved" → iframe resolves approvalPromise
  │       └─▶ postMessage "consent_approved"  → SDK popup listener resolves
  │
  └─▶ Phase 3: RPC "get_principal" { consentId }
          └─▶ wallet awaits approvalPromise (resolved) → executes → { principal }
```

---

### 6. Sign a Message

#### User perspective

A consent popup opens showing "Method: sign_message" and the message text in the Parameters section. The user reviews and approves. The DApp receives a hex-encoded signature and the signer's principal.

#### Technical steps

Identical consent flow to [Get Principal](#5-get-principal) with `method = 'sign_message'` and `params = { message }`.

On execution (Phase 3):

- The wallet calls `identity.sign(TextEncoder.encode(message))`
- The delegated identity (from Internet Identity) signs using the user's key material
- Returns `{ signature: hexString, principal: textPrincipal }`

`sdk.signMessage(message)` resolves with `{ signature: string, principal: string }`.

---

### 7. Query ICRC-1 Token Balance

#### User perspective

A consent popup opens showing "Method: icrc1_balance_of" and the canister ID. The user approves. The DApp receives a bigint balance in the token's smallest unit.

#### Technical steps

Identical consent flow with `method = 'icrc1_balance_of'` and `params = { canisterId, owner? }`.

On execution:

- The wallet builds an `HttpAgent` authenticated with the delegated identity, targeting `https://icp-api.io`
- Calls `icrc1_balance_of({ owner: Principal.fromText(owner), subaccount: [] })` as a **query** call on the token's ledger canister
- Returns `{ balance: bigintAsString }`

`sdk.icrc1BalanceOf(canisterId, owner?)` resolves with a `bigint`. If `owner` is omitted, defaults to the authenticated principal.

---

### 8. ICRC-1 Token Transfer

#### User perspective

The user fills in a recipient principal, canister ID, and amount in the DApp. A consent popup opens clearly showing "Method: icrc1_transfer" and all the transfer details (canister, recipient, amount). The user reviews the details carefully and clicks Approve. The DApp shows the resulting block index confirming the on-chain transfer.

#### Technical steps

Identical three-phase consent flow with `method = 'icrc1_transfer'` and `params = { canisterId, to, amount }` (amount is serialised as a string since `bigint` cannot be transported over JSON).

On execution:

- The wallet builds an authenticated `HttpAgent`
- Calls `icrc1_transfer(...)` as an **update** call — this is an on-chain write and incurs a transaction fee
- On `Ok(blockIndex)` → responds `{ blockIndex: bigintAsString }`
- On `Err(variant)` → responds with a JSON-RPC error describing the `TransferError` variant (e.g. `InsufficientFunds`, `BadFee`)

`sdk.icrc1Transfer({ canisterId, to, amount })` resolves with `{ blockIndex: bigint }`.

```
sdk.icrc1Transfer({ canisterId, to, amount })
  │
  ├─▶ Phase 1: RPC "consent_prepare" { method: 'icrc1_transfer', params: { canisterId, to, amount }, consentId }
  │
  ├─▶ Phase 2: consent popup
  │       └─▶ user sees canisterId, recipient, amount — clicks Approve
  │
  └─▶ Phase 3: RPC "icrc1_transfer" { canisterId, to, amount, consentId }
          └─▶ wallet: HttpAgent.icrc1_transfer(...) → on-chain update call
                  └─▶ { blockIndex } or TransferError
```

---

## Events

Subscribe and unsubscribe with `sdk.on(event, handler)` and `sdk.off(event, handler)`. The SDK does not depend on any framework — handlers are called synchronously in registration order.

| Event          | Payload                                         | When it fires                                                                                         |
| -------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `connected`    | `undefined`                                     | ICRC-29 handshake with the wallet iframe succeeds (inside `mount()`)                                  |
| `disconnected` | `undefined`                                     | `sdk.unmount()` is called                                                                             |
| `authChange`   | `{ authenticated: boolean; principal: string }` | Session state changes: after `mount()` (if a prior session exists), after `login()`, after `logout()` |

**Example — Svelte reactive state without framework coupling:**

```typescript
let authenticated = false;
let principal = "";

sdk.on("authChange", ({ authenticated: a, principal: p }) => {
  authenticated = a;
  principal = p;
});
```

**Example — React:**

```typescript
useEffect(() => {
  const handler = ({ authenticated, principal }: AuthState) => {
    setAuthenticated(authenticated);
    setPrincipal(principal);
  };
  sdk.on("authChange", handler);
  return () => sdk.off("authChange", handler);
}, []);
```

---

## API Reference

### Constructor

```typescript
new WalletSDK(config?: WalletSDKConfig)
```

The entire config object is optional. Calling `new WalletSDK()` with no arguments uses the built-in default wallet origin.

| Parameter             | Type     | Default                 | Description                                                                    |
| --------------------- | -------- | ----------------------- | ------------------------------------------------------------------------------ |
| `config.walletOrigin` | `string` | `http://localhost:5177` | Full origin of the wallet app. Override for staging or production deployments. |

---

### Lifecycle

| Method    | Signature                       | Returns         | Consent | Description                                                                                                      |
| --------- | ------------------------------- | --------------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| `mount`   | `mount(container: HTMLElement)` | `Promise<void>` | No      | Creates the hidden iframe, runs the ICRC-29 handshake, restores session. Must be called before any other method. |
| `unmount` | `unmount()`                     | `void`          | No      | Removes the iframe and tears down all listeners. Call when the component/page unmounts.                          |

---

### Authentication

| Method            | Signature           | Returns                          | Consent | Description                                                                                                                                |
| ----------------- | ------------------- | -------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `login`           | `login()`           | `Promise<{ principal: string }>` | No      | Opens a wallet popup that immediately auto-triggers Internet Identity. Resolves with the principal once the user completes authentication. |
| `logout`          | `logout()`          | `Promise<void>`                  | No      | Clears the wallet session. Emits `authChange`.                                                                                             |
| `isAuthenticated` | `isAuthenticated()` | `Promise<boolean>`               | No      | Queries the wallet for the current session status.                                                                                         |

---

### Wallet Operations

All methods below require `mount()` to have completed and the user to be authenticated. They open a consent popup before executing.

| Method           | Signature                                            | Returns                   | Description                                                                                            |
| ---------------- | ---------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `getPrincipal`   | `getPrincipal()`                                     | `Promise<string>`         | Returns the authenticated principal as a text string.                                                  |
| `signMessage`    | `signMessage(message: string)`                       | `Promise<SignResult>`     | Signs a UTF-8 message with the delegated identity. Returns `{ signature: string, principal: string }`. |
| `icrc1BalanceOf` | `icrc1BalanceOf(canisterId: string, owner?: string)` | `Promise<bigint>`         | Queries the ICRC-1 token balance. `owner` defaults to the authenticated principal.                     |
| `icrc1Transfer`  | `icrc1Transfer(params: TransferParams)`              | `Promise<TransferResult>` | Executes an on-chain ICRC-1 transfer. Returns `{ blockIndex: bigint }`.                                |

**`TransferParams`:**

```typescript
interface TransferParams {
  canisterId: string; // ICRC-1 token ledger canister ID
  to: string; // recipient principal as text
  amount: bigint; // amount in smallest token unit (e.g. 10_000 e8s = 0.0001 ICP)
}
```

---

### Utility

| Method | Signature | Returns           | Consent | Description                                                                          |
| ------ | --------- | ----------------- | ------- | ------------------------------------------------------------------------------------ |
| `ping` | `ping()`  | `Promise<string>` | No      | Health check. Returns `"pong"` from the wallet. Useful to verify the bridge is live. |

---

### Events

```typescript
sdk.on(event: keyof WalletSDKEvents, listener: Function): this
sdk.off(event: keyof WalletSDKEvents, listener: Function): this
```

Returns `this` for chaining.

---

## Error Reference

All errors extend `WalletError` which extends `Error`. They carry a numeric `code` property for programmatic handling.

| Class                   | Code     | When thrown                                             |
| ----------------------- | -------- | ------------------------------------------------------- |
| `WalletError`           | varies   | Base class — any wallet-level error                     |
| `UserRejectedError`     | `4001`   | User clicked Reject in the consent popup                |
| `NotAuthenticatedError` | `4100`   | Wallet refuses the request because no session exists    |
| `MethodNotFoundError`   | `-32601` | The wallet does not recognise the method                |
| `NotConnectedError`     | `-1`     | A wallet method was called before `mount()` completed   |
| `ConsentTimeoutError`   | `4002`   | User closed the consent popup without making a decision |

**Handling errors:**

```typescript
import {
  UserRejectedError,
  ConsentTimeoutError,
} from "@cashier-wallet/wallet-sdk";

try {
  await sdk.icrc1Transfer({ canisterId, to, amount });
} catch (err) {
  if (err instanceof UserRejectedError) {
    // user said no — show a dismissible notice, do not retry automatically
  } else if (err instanceof ConsentTimeoutError) {
    // popup was closed — ask the user to try again
  } else {
    // unexpected error — log and surface to user
    console.error(err);
  }
}
```

---

## Internal Architecture

### Component map

```
packages/wallet-sdk/          — the npm package
  src/
    WalletSDK.ts              — public API class
    RpcClient.ts              — JSON-RPC 2.0 transport over postMessage
    types.ts                  — wire types, config, event map
    errors.ts                 — typed error classes

apps/wallet/                  — the hosted wallet application
  src/
    lib/
      rpc-handler.ts          — postMessage listener, method dispatcher
      consent-store.ts        — pendingConsents Map + BroadcastChannel('wallet-consent')
      identity-manager.ts     — AuthClient singleton, Internet Identity login
      signer.ts               — sign arbitrary messages with delegated identity
      ledger.ts               — ICRC-1 transfer and balance via @dfinity/agent
    routes/
      +page.svelte            — hidden iframe page (runs rpc-handler on mount)
      consent/
        +page.svelte          — consent popup UI
```

### Dual-channel design

```
DApp window
│
│  postMessage (JSON-RPC 2.0)        origin-validated both ways
│
▼
Wallet iframe (walletOrigin / same tab)
│   — handles fast, non-interactive RPCs
│   — manages pendingConsents Map
│   — runs BroadcastChannel('wallet-consent') listener
│
│  BroadcastChannel('wallet-consent')    same-origin only, DApp cannot access
│
▼
Wallet consent popup (walletOrigin/consent?id=xxx)
│   — shows method name and parameters to the user
│   — approve/reject buttons
│   — sends BroadcastChannel message to iframe on decision
│   — sends postMessage to opener (DApp window) on decision
│   — window.close()
```

### Consent protocol in detail

The three-phase protocol ensures the wallet executes a sensitive operation **only after the user has explicitly approved it inside the wallet origin**:

**Phase 1 — Registration (`consent_prepare`)**

- SDK generates `consentId = crypto.randomUUID()`
- Sends RPC `consent_prepare` to the wallet iframe with `{ method, params, consentId }`
- Wallet creates a `PendingConsent` entry: stores method and params, creates a `Promise` whose resolve/reject callbacks are held in the `pendingConsents` Map
- Responds `{ ok: true }`

**Phase 2 — User decision (consent popup)**

- SDK opens `walletOrigin/consent?id=consentId` as a small popup
- Popup (wallet origin) opens its own `BroadcastChannel('wallet-consent')`
- Popup sends `consent_get` → iframe replies `consent_data` with method and params
- Popup renders the consent UI; user clicks Approve or Reject
- On Approve:
  - `BroadcastChannel` → `consent_approved` → iframe calls `consent._approve()` → `approvalPromise` resolves
  - `window.opener.postMessage({ type: 'consent_approved', consentId }, dappOrigin)` → SDK resolves `_openConsentPopup`
- On Reject: same but with `consent_rejected` / `reject()`
- Popup calls `window.close()`

**Phase 3 — Execution**

- SDK sends the actual RPC (e.g. `icrc1_transfer`) with `consentId` included in params
- Wallet looks up the `PendingConsent`, awaits `approvalPromise`
- Because Phase 2 already resolved it (or will imminently via BroadcastChannel), execution proceeds immediately — the `await` handles any residual race condition between the two message paths
- After execution the entry is deleted (one-time use)

### Why BroadcastChannel and not just postMessage?

The wallet iframe and the consent popup are **two separate window contexts on the same origin**. `postMessage` requires a direct window reference. `BroadcastChannel` is a same-origin pub-sub channel that neither the DApp nor any other origin can read or write to. This means:

- The DApp cannot fake a `consent_approved` signal — it has no access to the channel
- The consent decision travels through the wallet's own controlled channel before reaching the wallet's own RPC handler
- The iframe does not need a reference to the popup window, and the popup does not need a reference to the iframe

### Why `refreshAuthClient()` is needed

The Internet Identity session (delegation) is written to **IndexedDB** by the wallet login popup. The hidden iframe is a separate window context. Even though both are on the same origin and share the same IndexedDB storage, each has its own in-memory `AuthClient` instance. The `refreshAuthClient()` call discards the old in-memory instance and creates a fresh one, which re-reads the session from IndexedDB. Without this, the iframe would always report "not authenticated" even after the user logged in via the popup.

### Security properties

| Property                                   | Mechanism                                                                                                            |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Private keys never leave wallet origin     | All signing and ledger calls run inside the wallet iframe/popup; DApp receives only results                          |
| Consent cannot be faked by a DApp          | Consent UI runs at the wallet origin (visible in browser URL bar); approval travels via same-origin BroadcastChannel |
| Responses only accepted from wallet origin | `RpcClient` validates `event.origin === walletOrigin` on every incoming message                                      |
| Requests only accepted from DApp origin    | `rpc-handler` validates `event.origin` against `ALLOWED_ORIGINS` on every incoming message                           |
| One-time consent tokens                    | Each `consentId` is a UUID consumed once; replaying it after execution returns an error                              |
| Login popup cannot be clickjacked          | `window.open()` creates a top-level browsing context; attackers cannot overlay it with a fake UI                     |
