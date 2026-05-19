


# Cleans the build artifacts
[group('build')]
[confirm("Are you sure you want to clean the build artifacts?")]
clean:
  cargo clean
  rm -rf {{FRONTEND_DIR_NEW}}/node_modules
  rm -rf {{FRONTEND_DIR_NEW}}/build
  rm -rf ./node_modules


# Builds and download all artifacts.
# Note: TS bindings for the frontend are generated automatically by the
# @icp-sdk/bindgen Vite plugin during `build_frontend` (see src/cashier_frontend_new/vite.config.ts).
# Pre-build refreshes the .did source files under src/cashier_frontend_new/src/lib/generated/.did/.
[group('build')]
build mode="local_dev": download_artifacts build_canisters sync_frontend_did_files
  just build_frontend {{mode}}


# Builds the canisters
[group('build')]
build_canisters: pre_build
  just build_canister "cashier_backend" "" "cashier_backend"
  just build_canister "token_storage" "" "token_storage"
  just build_canister "gate_service" "" "gate_service"


# Builds the frontend
[group('build')]
build_frontend mode="local_dev": install_frontend_deps
  pnpm --filter cashier_frontend_new build:{{mode}}

# Sync .did files used as bindgen plugin input.
# Source of truth: target/artifacts/ (refreshed by build_canisters + download_artifacts).
[private]
sync_frontend_did_files:
  #!/usr/bin/env bash
  set -e
  DID_DIR="{{FRONTEND_DIR_NEW}}/src/lib/generated/.did"
  mkdir -p "$DID_DIR"
  cp {{ARTIFACTS_DIR}}/cashier_backend.did "$DID_DIR/cashier_backend.did"
  cp {{ARTIFACTS_DIR}}/token_storage.did "$DID_DIR/token_storage.did"
  cp {{ARTIFACTS_DIR}}/ledger-suite-icp.did "$DID_DIR/icp_ledger_canister.did"

# Install workspace deps with frozen lockfile (CI-safe default).
# Fails fast if pnpm-lock.yaml is out of sync with package.json.
# When intentionally bumping deps locally, run `pnpm install` directly instead.
[private]
install_frontend_deps:
  pnpm install --frozen-lockfile


# Download third party artifacts
[group('build')]
download_artifacts: pre_build
  just download_if_not_exists {{ARTIFACTS_DIR}}/ledger-suite-icp.did "https://github.com/dfinity/ic/releases/download/ledger-suite-icp-2025-07-04/ledger.did"
  just download_if_not_exists {{ARTIFACTS_DIR}}/ledger-suite-icp.wasm.gz "https://github.com/dfinity/ic/releases/download/ledger-suite-icp-2025-07-04/ledger-canister_notify-method.wasm.gz"
  just download_if_not_exists {{ARTIFACTS_DIR}}/ledger-suite-icrc.did "https://github.com/dfinity/ic/releases/download/ledger-suite-icrc-2025-06-19/ledger.did"
  just download_if_not_exists {{ARTIFACTS_DIR}}/ledger-suite-icrc.wasm.gz "https://github.com/dfinity/ic/releases/download/ledger-suite-icrc-2025-06-19/ic-icrc1-ledger.wasm.gz"
  just download_if_not_exists {{ARTIFACTS_DIR}}/internet_identity.did "https://github.com/dfinity/internet-identity/releases/latest/download/internet_identity.did"
  just download_if_not_exists {{ARTIFACTS_DIR}}/internet_identity.wasm.gz "https://github.com/dfinity/internet-identity/releases/latest/download/internet_identity_dev.wasm.gz"
  # Index canisters
  just download_if_not_exists {{ARTIFACTS_DIR}}/icp_index.did "https://github.com/dfinity/ic/releases/download/ledger-suite-icp-2025-08-29/index.did"
  just download_if_not_exists {{ARTIFACTS_DIR}}/icp_index.wasm.gz "https://github.com/dfinity/ic/releases/download/ledger-suite-icp-2025-08-29/ic-icp-index-canister.wasm.gz"
  just download_if_not_exists {{ARTIFACTS_DIR}}/icrc_index_ng.did "https://github.com/dfinity/ic/releases/download/ledger-suite-icrc-2025-10-27/index-ng.did"
  just download_if_not_exists {{ARTIFACTS_DIR}}/icrc_index_ng.wasm.gz "https://github.com/dfinity/ic/releases/download/ledger-suite-icrc-2025-10-27/ic-icrc1-index-ng.wasm.gz"
  
  # ICRC7 NFT ledger
  just copy_local_source {{LIB_DIR}}/icrc7/icrc7_nft_canister.did {{ARTIFACTS_DIR}}/icrc7_nft_canister.did
  just copy_local_source {{LIB_DIR}}/icrc7/icrc7_nft_canister.wasm.gz {{ARTIFACTS_DIR}}/icrc7_nft_canister.wasm.gz

  # ckBTC canisters
  just copy_local_source {{LIB_DIR}}/ckbtc/ckbtc_ledger/ckbtc_ledger.did {{ARTIFACTS_DIR}}/ckbtc_ledger.did
  just copy_local_source {{LIB_DIR}}/ckbtc/ckbtc_ledger/ckbtc_ledger.wasm.gz {{ARTIFACTS_DIR}}/ckbtc_ledger.wasm.gz

  just copy_local_source {{LIB_DIR}}/ckbtc/ckbtc_minter/ckbtc_minter.did {{ARTIFACTS_DIR}}/ckbtc_minter.did
  just copy_local_source {{LIB_DIR}}/ckbtc/ckbtc_minter/ckbtc_minter.wasm.gz {{ARTIFACTS_DIR}}/ckbtc_minter.wasm.gz

  just copy_local_source {{LIB_DIR}}/ckbtc/ckbtc_kyt/ckbtc_kyt.did {{ARTIFACTS_DIR}}/ckbtc_kyt.did
  just copy_local_source {{LIB_DIR}}/ckbtc/ckbtc_kyt/ckbtc_kyt.wasm.gz {{ARTIFACTS_DIR}}/ckbtc_kyt.wasm.gz

  just copy_local_source {{LIB_DIR}}/ckbtc/ckbtc_index/ckbtc_index.did {{ARTIFACTS_DIR}}/ckbtc_index.did
  just copy_local_source {{LIB_DIR}}/ckbtc/ckbtc_index/ckbtc_index.wasm.gz {{ARTIFACTS_DIR}}/ckbtc_index.wasm.gz

# Copy wasm bytecode and candid interface of canister
# params:
# source_path: filepath of source file
# dest_path: filepath of destination file
[private]
copy_local_source source_path dest_path:
  #!/usr/bin/env bash
  set -e

  if ! [ -f {{dest_path}} ]; then
    cp {{source_path}} {{dest_path}}
  fi

[private]
download_if_not_exists file url:
  #!/usr/bin/env bash
  set -e
  if ! [ -f {{file}} ]; then
    curl -L -o {{file}} {{url}}
  fi

[private]
pre_build: 
  mkdir -p "{{ARTIFACTS_DIR}}"


# Builds a canister with the given name and features, generates did file then shrinks and gzips the wasm file.
# The output wasm file is saved in the ARTIFACTS_DIR directory.
[private]
build_canister canister_name features output_wasm:
  echo "Building {{canister_name}} Canister with features: {{features}}"
  cargo build --target wasm32-unknown-unknown --release --package "{{canister_name}}" --features "{{features}}"
  # Generate the candid file
  candid-extractor "target/wasm32-unknown-unknown/release/{{canister_name}}.wasm" > "{{ARTIFACTS_DIR}}/{{output_wasm}}.did"
  # Shrink the wasm file
  ic-wasm "target/wasm32-unknown-unknown/release/{{canister_name}}.wasm" -o "{{ARTIFACTS_DIR}}/{{output_wasm}}.wasm" shrink --keep-name-section
  # Add the candid metadata
  ic-wasm "{{ARTIFACTS_DIR}}/{{output_wasm}}.wasm" -o "{{ARTIFACTS_DIR}}/{{output_wasm}}.wasm" metadata candid:service -f "{{ARTIFACTS_DIR}}/{{output_wasm}}.did" -v public
  # gzip the wasm file
  gzip -k "{{ARTIFACTS_DIR}}/{{output_wasm}}.wasm" --force

