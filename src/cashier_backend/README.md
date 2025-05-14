[![Staging Deploy Frontend](https://github.com/CashierHQ/cashier/actions/workflows/staging-deploy-frontend.yml/badge.svg?branch=staging)](https://github.com/CashierHQ/cashier/actions/workflows/staging-deploy-frontend.yml)

# [Frontend document](./src/cashier_frontend/README.md)

# Integration test

All the test file store in `src/test`

Replicate real canister deployment, cannot make call from HttpAgent, cannot using ICRC-112

Testing purpose:

-   Testing canister async task like timeout tx
-   Testing data store

**Requirement**
In the `artifacts` folder need:

-   `cashier_backend.wasm.gz` file
-   `token_canister.wasm.gz` file

Setup

```bash
// download token_canister.wasm.gz
// build backend and compress to cashier_backend.wasm.gz
make setup-test
```

Run

```bash
make test
```

# Unit test

All the test file store in `__tests__` of Rust code module
Rust unit test solution, cannot using ic_cdk api directly.

Remember test and canister runtime is different

-   canister:

    -   build target `wasm32-unknown-unknown` but no any related to Browser, JS
    -   built in async for wasm provide by Dfinity
    -   run on blockchain

-   unit test
    -   build target `wasm32-unknown-unknown` in general
    -   using tokio::test for async
    -   using MockIcEnviroment for mocking ic_cdk api
    -   run on local

Testing purpose:

-   Test code flow

Run test

```bash
cargo test
```

# Deployment

## Local enviroment

-   Copy `.env.example` to `.env.local`

```bash
cp .env.example .env.local
```

-   Deploy local

```bash
make local
```

-   Run unit test

```bash
make test
```

## Staging enviroment

-   Copy `.env.example` to `.env.staging`

```bash
cp .env.example .env.staging
```

-   Deploy staging - only deployer can deploy

```bash
make deploy
```
