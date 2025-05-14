#!/bin/bash

# filepath: /Users/longtran/Documents/code/cashier/cashier/scripts/setup_test.sh

# Create the artifacts directory if it doesn't exist
mkdir -p artifacts

echo "Compressing backend wasm file..."
# Compress the backend wasm file
gzip -c target/wasm32-unknown-unknown/release/cashier_backend.wasm > artifacts/cashier_backend.wasm.gz

# Download token canister wasm file if it doesn't exist
if [ ! -f "artifacts/token_canister.wasm.gz" ]; then
    echo "Downloading token_canister.wasm.gz..."
    curl -o artifacts/token_canister.wasm.gz https://download.dfinity.systems/ic/d4c3bb26c207e020c49f3aafe11bd77e6a75e85d/canisters/ledger-canister.wasm.gz
else
    echo "token_canister.wasm.gz already exists, skipping download."
fi

# Download token did file if it doesn't exist
if [ ! -f "artifacts/token.did" ]; then
    echo "Downloading token.did..."
    curl -o artifacts/token.did https://raw.githubusercontent.com/dfinity/ic/d4c3bb26c207e020c49f3aafe11bd77e6a75e85d/rs/rosetta-api/icp_ledger/ledger.did
else
    echo "token.did already exists, skipping download."
fi