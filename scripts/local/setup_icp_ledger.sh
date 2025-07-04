

dfx identity use default
export DEFAULT_ACCOUNT_ID=$(dfx ledger account-id)


dfx identity use cashier-dev
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

echo "=== TRANSFER 10000 ICP TO DEFAULT ACCOUNT ==="

dfx canister call ryjl3-tyaaa-aaaaa-aaaba-cai icrc1_transfer "(record { 
    to =  record { 
        owner = principal \"4smbz-v7nlc-x47yh-pjad3-7m5wa-5kpto-wej5c-5t4i4-wq33k-opfbk-yae\";
        subaccount = null;
    };
    memo = null; 
    created_at_time=null;
    from_subaccount = null;
    amount = 10000_0000_0000;
    fee = null
})"  --network local

echo "=== END ==="
