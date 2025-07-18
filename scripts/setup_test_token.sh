#!/usr/bin/env bash
# scripts/dev/deploy_ledger.sh – Deploy icrc1_ledger_canister and icrc1_index_canister

set -euo pipefail



# Need backend canister ID as minting_account owner
MINTER_BACKEND_CANISTER_ID=$(dfx canister id cashier_backend)
MINTER_BACKEND_SUBACCOUNT_ID="opt vec {0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 1}"

TOKEN_SYMBOL="RAFFLE"
TOKEN_NAME="INTERNAL RAFFLE TOKEN"
TRANSFER_FEE="0 : nat"
FEATURE_FLAGS="true"
NUM_OF_BLOCK_TO_ARCHIVE="1000 : nat64"
TRIGGER_THRESHOLD="500 : nat64"
ARCHIVE_CONTROLLER="$MINTER_BACKEND_CANISTER_ID"
CYCLE_FOR_ARCHIVE_CREATION="opt 1000000000000 : opt nat64" # 1T

echo "   • Deploying icrc1_ledger_canister…"
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

NEW_TRANSFER_FEE="opt 20000 : opt nat"

dfx deploy icrc1_ledger_canister \
  --argument "(variant {Upgrade =
    opt record {
        transfer_fee = $NEW_TRANSFER_FEE;
    }
  })" \
  --playground