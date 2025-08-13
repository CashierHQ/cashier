# Cashier

Cashier is a no-code transaction builder for non-technical users, such as marketers, solopreneurs, or consumers.

With Cashier, users can build and share payment, donation, tip, airdrop, swap, etc in minutes from their phone. It's quick, easy, and cheap. For custom needs, Cashier also supports flexible transaction flows and gating rules. Users can focus on their transaction needs rather than implementation.

**URL:** [cashierapp.io](https://cashierapp.io)

[![Video: Introducing Cashier](https://img.shields.io/badge/Watch_Demo-YouTube-red?style=for-the-badge&logo=youtube)](https://www.youtube.com/watch?v=H8Qetnjz1Zs)

## 🎯 Introduction

On a user level, Cashier is about providing a no-code transaction builder for non-technical users. The aim is to build a vast library of transaction templates that users can pick from and use quickly and easily.

Technically, Cashier is all about flexibly configuring and executing different types of transactions. Cashier does this by orchestrating different types of transactions. Following is how it works:

-   Each transaction is defined by what type of transfers it makes (i.e. a tip link will transfer an asset from the transaction link to the user wallet). Such behaviors for each transaction / link type is pre-configured in link service.
-   The frontend collects user input on what type of assets the users want to use in the transactions.
-   The transaction manager generates blockchain level requests and executes the transactions. Link to wallet transactions are executed on the backend while wallet to link transactions are executed by triggering the connected wallet.

![Cashier Architecture](docs/architecture.png)

## 🚀 Quick Start

### Prerequisites

-   [Rust](https://www.rust-lang.org/tools/install)
-   [DFX](https://internetcomputer.org/docs/building-apps/getting-started/install)
-   [NodeJS](https://nodejs.org/en)
-   [Just](https://just.systems/man/en/)
-   [ic-wasm](https://github.com/dfinity/ic-wasm)
-   [candid-extractor](https://github.com/dfinity/candid-extractor)

### Installation

**Frontend:**

```bash
# Install all dependencies
npm install
```

**Backend:**

```bash
just build
```

### Local running

```bash
# deploy backend
just dfx_local_deploy
# run frontend
npm start
# after login, airdrop token for testing
just dfx_local_airdrop <principal id>
```

## 📱 Usage

Using Cashier is easy. Start by going to [cashierapp.io](https://cashierapp.io) or localhost and log in with Internet Identity. We will support more login options going forward.

**Create a transaction in 3 easy steps:**

-   Choose transaction type
-   Select assets to use in the transaction
-   Generate the transaction

And share the link for others to use.

**The link user can use the link in following steps:**

-   Tap on link to open the transaction page
-   Pick a wallet to transact with
-   Execute the transaction

## 📚 Documentation

### Project Documentation

**Development & Deployment:**

-   **[🚀 Deployment Guide](docs/DEPLOYMENT.md)** - Complete CI/CD workflow, version management, and deployment strategies
-   [Backend README](src/cashier_backend/README.md) - Backend canister documentation
-   [Frontend README](src/cashier_frontend/README.md) - Frontend application documentation
-   [Local Tests](src/test/local-tests/README.md) - Local testing setup and re-entrancy protection tests

**Architecture & Design:**

-   [Cashier project overview](https://doc.clickup.com/9012452868/d/h/8cjy7g4-4292/9a3796b6e853ef0)
-   [High level architecture overview](https://doc.clickup.com/9012452868/d/h/8cjy7g4-5612/2e2ccfa01dd19ed)
-   [Link service](https://doc.clickup.com/9012452868/d/h/8cjy7g4-5632/4eeacf618d589c1)
-   [Tx manager](https://doc.clickup.com/9012452868/d/h/8cjy7g4-5552/d32e7c7bddd8747)
-   [Link <> Intent mapping](https://doc.clickup.com/9012452868/d/h/8cjy7g4-5572/2061969b0764510)
-   [Intent <> Tx mapping](https://doc.clickup.com/9012452868/d/h/8cjy7g4-5592/5bcdb847ae9a219)

# Testing

## Backend Unit Tests

For backend unit tests, go to `src/cashier_backend` and run:

```bash
just test
```

## Code coverage report

- Install `cargo-llvm-cov` package

```bash
$ cargo install cargo-llvm-cov
```

- Generate the code-coverage report

```bash
$ cargo llvm-cov
```

## Code Quality (Clippy)

The project uses Clippy for Rust code linting across all crates. Run Clippy checks with:

```bash
just check_code
```

# Roadmap

✅ Done

-   Link service foundation
-   Transaction manager foundation
-   Link and user state machines
-   Frontend link creation and user flow foundation
-   Wallet foundation
-   4 basic transaction use cases (tip, airdrop, token basket, payment)

To do
(not in any particular order and priority may change)

-   Additional transaction use cases (swap, donation, checkout, etc).
-   Alternative login (Google, passkey, etc).
-   Transaction speed optimization with ICRC-2.
-   NFT (EXT or ICRC7) support.
-   Gating mechanism foundation.
-   Gating use cases: password, X, Telegram, KYC, etc).
-   Wallet asset swaps.
-   ck tokens import export.
-   Additional chain support (BTC, ETH, SOL).
-   Backoffice (analytics, support solutions, etc).

## License

This project is licensed under the [MIT License](LICENSE).

License changed from **GNU GPL v3.0** to **MIT** on 2025-06-09, prior to public release. No external contributions existed under the previous license.

# Acknowledgements

Cashier has received help from the following projects.

-   Cashier is using NFID's Identity Kit.
-   Cashier benchmarked Kong Swap's transaction architecture.
-   Cashier benchmarked Oisy's token management architecture.

We extend big thanks to aforementioned teams.

# References

-   [Internet Computer](https://internetcomputer.org/)
-   [ICRC-112: Batch Call Canister](https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_112_batch_call_canister.md#partial-responses)
-   [NFID Identity Kit](https://identitykit.xyz/)
-   [ICRC ledger](https://github.com/dfinity/ic/tree/master/rs/rosetta-api/icrc1)
