# Prepare frontend statis assets and submit commit request to orbit
# Returns JSON with: batch_id, evidence, request_url
[group('orbit')]
upload_asset canister_id:
  #!/usr/bin/env bash
  set -euo pipefail
  set -x
  just check_permission {{canister_id}}
  output=$(dfx-orbit request asset upload {{canister_id}} --files {{FRONTEND_DIR_NEW}}/build 2>&1)
  
  # Parse batch_id, evidence, and request_url from output
  batch_id=$(echo "$output" | grep -oE 'Batch id: [0-9]+' | sed 's/Batch id: //' || true)
  evidence=$(echo "$output" | grep -oE 'Evidence: [a-f0-9]+' | sed 's/Evidence: //' || true)
  request_url=$(echo "$output" | grep -oE 'Request URL: https://[^ ]+' | sed 's/Request URL: //' || true)
  
  # Output JSON result to stdout
  printf '{"batch_id":"%s","evidence":"%s","request_url":"%s"}\n' \
    "$batch_id" \
    "$evidence" \
    "$request_url"
# General canister upgrade request to orbit
# Returns JSON with: wasm_checksum, arg, arg_checksum, request_url
[group('orbit')]
orbit_upgrade canister_name mode network arg_file commit="" review_run_url="":
  #!/usr/bin/env bash
  set -euo pipefail
  set -x
  canister_id=$(just get_canister_id {{canister_name}} {{network}})
  if [ -z "$canister_id" ]; then
    echo "Error: canister_id is empty for {{canister_name}} on {{network}}" >&2
    exit 1
  fi
  wasm_path="{{ARTIFACTS_DIR}}/{{canister_name}}.wasm.gz"
  wasm_checksum=$(just sha256_file "$wasm_path")
  arg=$(cat {{arg_file}})
  arg_checksum=$(just sha256_encoded_candid {{arg_file}} {{ARTIFACTS_DIR}}/{{canister_name}}.did)

  if [ -n "$arg" ]; then
    output=$(dfx-orbit request \
      --title "Install $canister_name canister: $canister_id" \
      --summary "Commit $commit. Review run: $review_run_url" \
      canister install \
      --mode {{mode}} \
      "$canister_id" \
      --wasm "$wasm_path" \
      --raw-arg "$arg" \
      2>&1)
  else
    output=$(dfx-orbit request \
      --title "Install $canister_name canister: $canister_id" \
      --summary "Commit $commit. Review run: $review_run_url" \
      canister install \
      --mode {{mode}} \
      "$canister_id" \
      --wasm "$wasm_path" \
      2>&1)
  fi
  # Use || true to prevent grep from failing if no match (grep returns exit code 1 on no match)
  request_url=$(echo "$output" | grep -oE 'Request URL: https://[^ ]+' | sed 's/Request URL: //' || true)
  
  # Output JSON result to stdout
  printf '{"wasm_checksum":"%s","arg":"%s","arg_checksum":"%s","request_url":"%s"}\n' \
    "$wasm_checksum" \
    "$(echo "$arg" | sed 's/"/\\"/g' | tr -d '\n')" \
    "$arg_checksum" \
    "$request_url"

# Build init and upgrade hex argument for backend canister
[group('orbit')]
build_backend_args_hex owner token_storage_canister_id log_filter output_file:
  #!/usr/bin/env bash
  set -e

  # step 1: build argument text by injecting fields values
  just build_backend_args "{{owner}}" "{{token_storage_canister_id}}" "{{log_filter}}" "{{output_file}}.txt"

  # step 2: encode argument text to hex format using didc and candid types
  didc encode -d ./target/artifacts/cashier_backend.did -t "(CashierBackendInitData)" "$(cat {{output_file}}.txt)" > {{output_file}}.hex

# Build the backend canister args and save to file
[group('orbit')]
build_backend_args owner token_storage_canister_id log_filter file_name:
  #!/usr/bin/env bash
  sed \
    -e 's/__OWNER__/{{owner}}/g' \
    -e 's/__TOKEN_STORAGE_CANISTER_ID__/{{token_storage_canister_id}}/g' \
    -e 's/__LOG_FILTER__/{{log_filter}}/g' \
    scripts/args/backend_args.template \
    | tr -d '\n' | tr -s ' ' > {{file_name}}

# Build init and upgrade hex argument for token storage canister
[group('orbit')]
build_token_storage_args_hex owner log_filter ckbtc_minter_id omnity_bitcoin_id output_file:
  #!/usr/bin/env bash
  set -e

  # step 1: build argument text by injecting fields values
  just build_token_storage_args "{{owner}}" "{{log_filter}}" "{{ckbtc_minter_id}}" "{{omnity_bitcoin_id}}" "{{output_file}}.txt"

  # step 2: encode argument text to hex format using didc and candid types
  didc encode -d ./target/artifacts/token_storage.did -t "(TokenStorageInitData)" < {{output_file}}.txt > {{output_file}}.hex

# Build token_storage canister args and save to file
[group('orbit')]
build_token_storage_args owner log_filter ckbtc_minter_id omnity_bitcoin_id file_name:
  #!/usr/bin/env bash
  sed \
    -e 's/__OWNER__/{{owner}}/g' \
    -e 's/__LOG_FILTER__/{{log_filter}}/g' \
    -e 's/__CKBTC_MINTER_ID__/{{ckbtc_minter_id}}/g' \
    -e 's/__OMNITY_BITCOIN_ID__/{{omnity_bitcoin_id}}/g' \
    scripts/args/token_storage_args.template \
    | tr -d '\n' | tr -s ' ' > {{file_name}}

# Encode candid args and compute SHA-256 checksum of the raw bytes
# If arg_file ends in .hex, it is already encoded — skip didc encode step
# Returns: hex checksum string
[group('orbit')]
sha256_encoded_candid arg_file did_file:
  #!/usr/bin/env bash
  set -euo pipefail
  if [[ "{{arg_file}}" == *.hex ]]; then
    # Already hex-encoded: hex → bytes → sha256
    encoded_hex=$(cat {{arg_file}})
  else
    # Candid text: encode to hex first
    encoded_hex=$(didc encode --defs {{did_file}} < {{arg_file}})
  fi
  # Convert hex string to bytes and compute SHA-256 checksum
  checksum=$(echo -n "$encoded_hex" | xxd -r -p | just sha256_stdin)
  echo "$checksum"

# Compute SHA-256 checksum of a file (cross-platform)
# Returns: hex checksum string
[group('orbit')]
sha256_file file_path:
  #!/usr/bin/env bash
  set -euo pipefail
  if [ "{{OS}}" = "macos" ]; then
    shasum -a 256 "{{file_path}}" | awk '{print $1}'
  else
    sha256sum "{{file_path}}" | awk '{print $1}'
  fi

# Compute SHA-256 checksum from stdin (cross-platform)
# Returns: hex checksum string
[private]
sha256_stdin:
  #!/usr/bin/env bash
  set -euo pipefail
  if [ "{{OS}}" = "macos" ]; then
    shasum -a 256 | awk '{print $1}'
  else
    sha256sum | awk '{print $1}'
  fi

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
