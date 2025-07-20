#!/usr/bin/env bash
# scripts/setup_test_token.sh – Deploy or upgrade icrc1_ledger_canister for testing

set -euo pipefail

# Function to display usage
usage() {
    echo "Usage: $0 [init|upgrade]"
    echo "  init    - Deploy the token canister with initial configuration"
    echo "  upgrade - Upgrade the existing token canister with new settings"
    exit 1
}

# Check if argument is provided
if [ $# -eq 0 ]; then
    echo "Error: No operation specified."
    usage
fi

OPERATION="$1"

# Validate operation
if [ "$OPERATION" != "init" ] && [ "$OPERATION" != "upgrade" ]; then
    echo "Error: Invalid operation '$OPERATION'."
    usage
fi

# Configuration variables
MINTER_BACKEND_CANISTER_ID=$(dfx canister id cashier_backend)
MINTER_BACKEND_SUBACCOUNT_ID="opt vec {0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 1}"

TOKEN_SYMBOL="USD!"
TOKEN_NAME="Test token"
TRANSFER_FEE="0 : nat"
FEATURE_FLAGS="true"
NUM_OF_BLOCK_TO_ARCHIVE="1000 : nat64"
TRIGGER_THRESHOLD="500 : nat64"
ARCHIVE_CONTROLLER="$MINTER_BACKEND_CANISTER_ID"
CYCLE_FOR_ARCHIVE_CREATION="opt 1000000000000 : opt nat64" # 1T

# Upgrade settings
NEW_TRANSFER_FEE="opt 30000 : opt nat"

# Deploy with initial configuration
deploy_init() {
    echo "   • Deploying icrc1_ledger_canister with initial configuration…"
    dfx deploy icrc1_ledger_canister \
      --argument "(variant {Init =
        record {
          token_symbol = \"$TOKEN_SYMBOL\";
          token_name = \"$TOKEN_NAME\";
          minting_account = record { owner = principal \"$MINTER_BACKEND_CANISTER_ID\"; subaccount = $MINTER_BACKEND_SUBACCOUNT_ID; };
          transfer_fee = $TRANSFER_FEE;
          metadata = vec {};
          feature_flags = opt record { icrc2 = $FEATURE_FLAGS };
          initial_balances = vec {};
          archive_options = record {
            num_blocks_to_archive = $NUM_OF_BLOCK_TO_ARCHIVE;
            trigger_threshold = $TRIGGER_THRESHOLD;
            controller_id = principal \"$ARCHIVE_CONTROLLER\";
            cycles_for_archive_creation = $CYCLE_FOR_ARCHIVE_CREATION;
          };
        }
      })" \
      --playground
    
    echo "   ✓ Initial deployment completed successfully!"
}

# Upgrade existing canister
deploy_upgrade() {
    echo "   • Upgrading icrc1_ledger_canister with new settings…"
    dfx deploy icrc1_ledger_canister \
      --argument "(variant {Upgrade =
        opt record {
            transfer_fee = $NEW_TRANSFER_FEE;
        }
      })" \
      --playground
    
    echo "   ✓ Upgrade completed successfully!"
    echo "   • Transfer fee updated to: $NEW_TRANSFER_FEE"
}

# Execute the requested operation
case "$OPERATION" in
    "init")
        deploy_init
        ;;
    "upgrade")
        deploy_upgrade
        ;;
esac

echo ""
echo "🎉 Token canister operation '$OPERATION' completed!"
echo "Backend canister ID: $MINTER_BACKEND_CANISTER_ID"