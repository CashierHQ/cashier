
# Cleans the build artifacts
[group('build')]
[confirm("Are you sure you want to clean the build artifacts?")]
clean:
  cargo clean


# Builds and download all artifacts
[group('build')]
build: download_artifacts build_canisters


# Builds the test canister
[group('build')]
build_canisters: pre_build
  just build_canister "cashier_backend" "" "cashier_backend"
  just build_canister "token_storage" "" "token_storage"


# Download third party artifacts
[group('build')]
download_artifacts:
  curl -o {{ARTIFACT_DIR}}/ledger-suite-icp.did https://github.com/dfinity/ic/releases/download/ledger-suite-icp-2025-07-04/ledger.did
  curl -o {{ARTIFACT_DIR}}/ledger-suite-icp.wasm.gz https://github.com/dfinity/ic/releases/download/ledger-suite-icp-2025-07-04/ledger-canister_notify-method.wasm.gz
  curl -o {{ARTIFACT_DIR}}/ledger-suite-icrc.did https://github.com/dfinity/ic/releases/download/ledger-suite-icrc-2025-06-19/ledger.did
  curl -o {{ARTIFACT_DIR}}/ledger-suite-icrc.wasm.gz https://github.com/dfinity/ic/releases/download/ledger-suite-icrc-2025-06-19/ic-icrc1-ledger.wasm.gz


[private]
pre_build: 
  mkdir -p "{{ARTIFACT_DIR}}"


# Builds a canister with the given name and features, generates did file then shrinks and gzips the wasm file.
# The output wasm file is saved in the ARTIFACT_DIR directory.
[private]
build_canister canister_name features output_wasm:
  echo "Building {{canister_name}} Canister with features: {{features}}"
  cargo build --target wasm32-unknown-unknown --release --package "{{canister_name}}" --features "{{features}}"
  ic-wasm "target/wasm32-unknown-unknown/release/{{canister_name}}.wasm" -o "{{ARTIFACT_DIR}}/{{output_wasm}}.wasm" shrink --keep-name-section
  candid-extractor "{{ARTIFACT_DIR}}/{{output_wasm}}.wasm" > "{{ARTIFACT_DIR}}/{{output_wasm}}.did"
  gzip -k "{{ARTIFACT_DIR}}/{{output_wasm}}.wasm" --force

