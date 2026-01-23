


# Cleans the build artifacts
[group('build')]
[confirm("Are you sure you want to clean the build artifacts?")]
clean:
  cargo clean
  rm -rf {{FRONTEND_DIR_NEW}}/node_modules
  rm -rf {{FRONTEND_DIR_NEW}}/build
  rm -rf ./node_modules


# Builds and download all artifacts
[group('build')]
build mode="local_dev": download_artifacts build_canisters generate_frontend_ts 
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
  cd "{{FRONTEND_DIR_NEW}}" && npm run build:{{mode}}

# Generates the ts files for the canister services 
[group('build')]
generate_frontend_ts:
  just generate_frontend_ts_for_canister cashier_backend
  just generate_frontend_ts_for_canister token_storage
  just generate_frontend_ts_for_canister icp_ledger_canister


[private]
install_frontend_deps:
  cd "{{FRONTEND_DIR_NEW}}" && npm install

[private]
generate_frontend_ts_for_canister canister:
  # Files are generated into ./src/declarations
  dfx generate {{canister}}
  rm src/declarations/{{canister}}/{{canister}}.did
  rm src/declarations/{{canister}}/index.d.ts
  rm src/declarations/{{canister}}/index.js
  cp -r src/declarations/* {{FRONTEND_DIR_NEW}}/src/lib/generated
  rm -rf src/declarations


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

