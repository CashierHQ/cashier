# Cashier

Cashier is a no-code transaction builder for non-technical users, such as marketers, solopreneurs, or consumers.

With Cashier, users can build and share payment, donation, tip, airdrop, swap, etc in minutes from their phone. Its quick, easy, and cheap. For custom needs, Cashier also supports flexible transaction flows and gating rules. Users can focus on their transaction needs rather than implementation.

URL: cashierapp.io
Video: Introducing Cashier!

# Introduction

On a user level, Cashier is about providing a no-code transaction builder for non-technical users. The aim is to build a vast library of transaction templates that users can pick from and use quickly and easily.

Technically, Cashier is all about flexibly configuring and executing different types of transactions. Cashier does this by orchestrating different types of transactions. Following is how it works:

-   Each transaction is defined by what type of transfers it makes (i.e. a tip link will transfer an asset from the transaction link to the user wallet). Such behaviors for each transaction / link type is pre-configured in link service.
-   The frontend collects user input on what type of assets the users want to use in the transactions.
-   The transaction manager generates blockchain level requests and executes the transactions. Link to wallet transactions are executed on the backend while wallet to link transactions are executed by triggering the connected wallet.

# Installation

## Prerequisites

## Install

# Usage

Using Cashier is easy. Start by going to cashierapp.io and log in with Internet Identity. We will support more login options going forward.

Create a transaction in 3 easy steps:

-   Choose transaction type.
-   select assets to use in the transaction.
-   Generate the transaction.

And share the link for others to use.

The link user can use the link in following steps:

-   tap on link to open the transaction page.
-   Pick a wallet to transact with.
-   Execute the transaction.

# Documentation

Please find more documentation of the project in the following links:

-   Cashier project overview
-   High level architecture overview
-   Link service
-   Tx manager
-   Link <> Intent mapping
-   Intent <> Tx mapping

# Testing

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

# License

This project is licensed under the GNU General Public License v3.0.  
See the [LICENSE] file for full details.

# Acknowledgements

-   Cashier has received help from the following projects.
-   Cashier is using NFID's Identity Kit.
-   Cashier benchmarked Kong Swap's transaction architecture.
-   Cashier benchmarked Oisy's token management architecture.

We extend big thanks to aforementioned teams.

# References

-   Internet Computer
-   ICRC-112: Batch Call Canister
-   NFID Identity Kit
-   ICRC ledger
