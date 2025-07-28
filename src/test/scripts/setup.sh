#!/usr/bin/env bash
# This script sets up the local environment for testing the cashier backend and ICP ledger canister.
export TX_TIMEOUT=20
dfx identity use default

dfx deploy cashier_backend --network local
export DEFAULT_ACCOUNT_ID=$(dfx ledger account-id)
export MINTER_ACCOUNT_ID=$(dfx ledger account-id)


echo "=== SETUP ICP LEDGER LOCAL ==="
dfx deploy icp_ledger_canister --argument "
  (variant {
    Init = record {
      minting_account = \"$MINTER_ACCOUNT_ID\";
      initial_values = vec {
        record {
          \"$DEFAULT_ACCOUNT_ID\";
          record {
            e8s = 10_000_000_000 : nat64;
          };
        };
      };
      send_whitelist = vec {};
      transfer_fee = opt record {
        e8s = 10_000 : nat64;
      };
      token_symbol = opt \"LICP\";
      token_name = opt \"Local ICP\";
    }
  })
" --network local
echo "=== END ==="
