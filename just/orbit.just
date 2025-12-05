#Deploy cashier canisters via dfx-orbit
[group('orbit')]
orbit_upgrade_canisters mode network:
  #!/usr/bin/env bash

  if [ "{{network}}" = "production" ]; then
    log_filter="global,cashier=info,token_storage=info"
  else
    log_filter="global,cashier=debug,token_storage=debug"
  fi
  
  backend_args_file="backend_args.txt"
  token_storage_args_file="token_storage_args.txt"
  
  just build_backend_args $(dfx identity get-principal) "$log_filter" "$backend_args_file"
  just build_token_storage_args $(dfx identity get-principal) "$log_filter" "$token_storage_args_file"

  echo "=== Upgrading token_storage canister ==="
  echo "args file used for token_storage:"
  cat "$token_storage_args_file"
  just orbit_upgrade token_storage {{mode}} {{network}} "$token_storage_args_file"  2>&1 | grep -A7 "Upgrading canister"
  echo "=== Token_storage canister upgrade completed ==="
  echo ""
  echo ""
  echo ""

  echo "=== Upgrading backend canister ==="
  echo "args file used for backend:" 
  cat "$backend_args_file"
  just orbit_upgrade cashier_backend {{mode}} {{network}} "$backend_args_file"   2>&1 | grep -A7 "Upgrading canister"
  echo "=== Backend canister upgrade completed ==="

  rm -f "$backend_args_file" "$token_storage_args_file"

# Prepare frontend statis assets and submit commit request to orbit
[group('orbit')]
upload_asset canister_id:
    just check_permission {{canister_id}}
    dfx-orbit request asset upload {{canister_id}} --files {{FRONTEND_DIR_NEW}}/build || true

# General canister upgrade request to orbit
[group('orbit')]
orbit_upgrade canister_name mode network arg_file:
  #!/usr/bin/env bash
  set -euo pipefail
  canister_id=$(just get_canister_id {{canister_name}} {{network}})
  if [ -z "$canister_id" ]; then
    echo "Error: canister_id is empty for {{canister_name}} on {{network}}" >&2
    exit 1
  fi
  wasm_path="{{ARTIFACTS_DIR}}/{{canister_name}}.wasm.gz"
  wasm_checksum=$(shasum -a 256 "$wasm_path" | awk '{print $1}')
  arg=$(cat {{arg_file}})
  arg_checksum=$(just encode_and_checksum {{arg_file}} {{ARTIFACTS_DIR}}/{{canister_name}}.did)

  printf "Upgrading canister {{canister_name}} with \n id: %s \n network: {{network}} \n mode: {{mode}} \n wasm: %s \n wasm_checksum: %s \n arg_file: %s \n arg_checksum: %s \n" "$canister_id" "$wasm_path" "$wasm_checksum" {{arg_file}} "$arg_checksum"
  if [ -n "$arg" ]; then
    # the true at the end is to ignore error for now https://github.com/dfinity/orbit/issues/608
    dfx-orbit request canister install --mode {{mode}} "$canister_id" --wasm "$wasm_path" --argument "$arg" || true
  else
    # the true at the end is to ignore error for now https://github.com/dfinity/orbit/issues/608
    dfx-orbit request canister install --mode {{mode}} "$canister_id" --wasm "$wasm_path" || true
  fi

# Build the backend canister args and save to file
[private]
build_backend_args owner log_filter file_name:
  #!/usr/bin/env bash
  sed -e 's/__OWNER__/{{owner}}/g' -e 's/__LOG_FILTER__/{{log_filter}}/g' \
    scripts/args/backend_args.template | tr -d '\n' | tr -s ' ' > {{file_name}}

# Build token_storage canister args and save to file
[private]
build_token_storage_args owner log_filter file_name:
  #!/usr/bin/env bash
  sed -e 's/__OWNER__/{{owner}}/g' -e 's/__LOG_FILTER__/{{log_filter}}/g' \
    scripts/args/token_storage_args.template | tr -d '\n' | tr -s ' ' > {{file_name}}

# Encode candid args and compute SHA-256 checksum of the raw bytes
# Returns: hex checksum string
[private]
encode_and_checksum arg_file did_file:
  #!/usr/bin/env bash
  set -euo pipefail
  # Read content from file
  arg=$(cat {{arg_file}})
  # Encode to candid hex string
  encoded_hex=$(didc encode "$arg" --defs {{did_file}})
  # Convert hex string to bytes and compute SHA-256 checksum
  checksum=$(echo -n "$encoded_hex" | xxd -r -p | shasum -a 256 | awk '{print $1}')
  echo "$checksum"

# Get canister id for a given canister name and network
[private]
get_canister_id canister_name network:
  #!/usr/bin/env bash
  set -euo pipefail
  canister_id=$(dfx canister id {{canister_name}} --network {{network}})
  if [ -z "$canister_id" ]; then
    echo "Error: Failed to get canister id for {{canister_name}} on network {{network}}" >&2
    exit 1
  fi
  echo "$canister_id"

# Check if the current principal has Prepare permission on the canister
[private]
check_permission canister_id:
  #!/usr/bin/env bash
  set -e
  PRINCIPAL=$(dfx identity get-principal)
  LIST=$(dfx canister call {{canister_id}} list_permitted '(record { permission = variant { Prepare } })' --network ic --output json)

  # Check if the principal exists in the list
  if echo "$LIST" | grep -q "$PRINCIPAL"; then
    echo "✓ Principal $PRINCIPAL has Prepare permission"
  else
    echo "✗ Principal $PRINCIPAL does NOT have Prepare permission"
    echo "Permitted principals:"
    echo "$LIST" | jq -r '.' 2>/dev/null || echo "$LIST"
    exit 1
  fi