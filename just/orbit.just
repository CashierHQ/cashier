[group('orbit')]
upload_asset canister_id:
    just check_permission {{canister_id}}
    dfx-orbit request asset upload {{canister_id}} --files {{FRONTEND_DIR_NEW}}/build

[group('orbit')]
request_upgrade canister_name:
    dfx-orbit request canister install --mode reinstall "qfn7t-6aaaa-aaaab-aceyq-cai" --wasm {{ARTIFACTS_DIR}}/{{canister_name}}.wasm.gz

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