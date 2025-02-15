#compress the backend wasm file
gzip -c target/wasm32-unknown-unknown/release/cashier_backend.wasm > artifacts/cashier_backend.wasm.gz

#download token canister wasm file
curl -o artifacts/token_canister.wasm.gz https://download.dfinity.systems/ic/d4c3bb26c207e020c49f3aafe11bd77e6a75e85d/canisters/ledger-canister.wasm.gz

#download token did file
curl -o artifacts/token.did https://raw.githubusercontent.com/dfinity/ic/d4c3bb26c207e020c49f3aafe11bd77e6a75e85d/rs/rosetta-api/icp_ledger/ledger.did
