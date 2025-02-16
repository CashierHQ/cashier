#!/bin/bash

# filepath: /Users/longtran/Documents/code/cashier/cashier/scripts/setup_test.sh

# Create the artifacts directory if it doesn't exist
mkdir -p artifacts

# Compress the backend wasm file
rustup target add wasm32-unknown-unknown
make build-wasm
gzip -c target/wasm32-unknown-unknown/release/cashier_backend.wasm > artifacts/cashier_backend.wasm.gz

# Download token canister wasm file
curl -o artifacts/token_canister.wasm.gz https://download.dfinity.systems/ic/d4c3bb26c207e020c49f3aafe11bd77e6a75e85d/canisters/ledger-canister.wasm.gz

# Download token did file
curl -o artifacts/token.did https://raw.githubusercontent.com/dfinity/ic/d4c3bb26c207e020c49f3aafe11bd77e6a75e85d/rs/rosetta-api/icp_ledger/ledger.did

# Delete did file avoid eslint error
rm -f src/declarations/cashier_backend/cashier_backend.did
rm -f src/declarations/icp_ledger_canister/icp_ledger_canister.did
