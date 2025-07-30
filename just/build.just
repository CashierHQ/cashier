
# Cleans the build artifacts
[group('build')]
[confirm("Are you sure you want to clean the build artifacts?")]
clean:
  rm -rf {{ARTIFACT_DIR}}
  cargo clean


# Builds the test canister
[group('build')]
build_canisters: pre_build
  just build_canister "cashier_backend" "" "cashier_backend"
  just build_canister "token_storage" "" "token_storage"


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

