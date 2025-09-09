
# Cleans the build artifacts
[group('build')]
[confirm("Are you sure you want to clean the build artifacts?")]
clean:
  cargo clean
  rm -rf {{FRONTEND_DIR}}/node_modules
  rm -rf {{FRONTEND_DIR}}/dist
  rm -rf ./node_modules


# Builds and download all artifacts
[group('build')]
build: download_artifacts build_canisters generate_frontend_ts build_frontend


# Builds the canisters
[group('build')]
build_canisters: pre_build
  just build_canister "cashier_backend" "" "cashier_backend"
  just build_canister "token_storage" "" "token_storage"
  just build_canister "gate_service" "" "gate_service"


# Builds the frontend
[group('build')]
build_frontend mode="local_dev": install_frontend_deps
  cd "{{FRONTEND_DIR}}" && npm run build:{{mode}}


# Generates the ts files for the canister services 
[group('build')]
generate_frontend_ts:
  just generate_frontend_ts_for_canister cashier_backend
  just generate_frontend_ts_for_canister token_storage
  just generate_frontend_ts_for_canister icp_ledger_canister


[private]
install_frontend_deps:
  cd {{FRONTEND_DIR}} && npm install

[private]
generate_frontend_ts_for_canister canister:
  # Files are generated into ./src/declarations
  dfx generate {{canister}}
  rm src/declarations/{{canister}}/{{canister}}.did
  rm src/declarations/{{canister}}/index.d.ts
  rm src/declarations/{{canister}}/index.js
  cp -r src/declarations/* {{FRONTEND_DIR}}/src/generated
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
  ic-wasm "target/wasm32-unknown-unknown/release/{{canister_name}}.wasm" -o "{{ARTIFACTS_DIR}}/{{output_wasm}}.wasm" shrink --keep-name-section
  candid-extractor "{{ARTIFACTS_DIR}}/{{output_wasm}}.wasm" > "{{ARTIFACTS_DIR}}/{{output_wasm}}.did"
  gzip -k "{{ARTIFACTS_DIR}}/{{output_wasm}}.wasm" --force

