DFX_LOGFILE:="./target/dfx_tests.log"

# Start the local dfx server
[group('dfx')]
dfx_local_start: dfx_prepare_env dfx_local_stop
  # Start the local dfx server
  dfx start --background --clean --host 127.0.0.1:8000 --artificial-delay 0 2> "{{DFX_LOGFILE}}"

  # Add cycles to the wallet
  wallet_principal=$(dfx identity get-wallet) && dfx ledger fabricate-cycles --t 10000000 --canister $wallet_principal

  sleep 2


# Stop the local dfx server
[group('dfx')]
dfx_local_stop:
  dfx stop
  

# Starts the local dfx server and deploys the canisters
[group('dfx')]
dfx_local_deploy: dfx_local_start && dfx_local_info
  #!/usr/bin/env bash
  set -e

  export OWNER=$(dfx identity get-principal)

  dfx deploy token_storage --argument "(record {
      log_settings=opt record { enable_console=opt true; in_memory_records=opt 10000; log_filter=opt \"global,cashier=debug,token_storage=debug\"; };
      owner=principal \"${OWNER}\";
  })"

  dfx deploy cashier_backend --argument "(record {
      log_settings=opt record { enable_console=opt true; in_memory_records=opt 10000; log_filter=opt \"global,cashier=debug\"; };
      owner=principal \"${OWNER}\";
  })"

  dfx deploy gate_service_backend --argument "(record {
      log_settings=opt record { enable_console=opt true; in_memory_records=opt 10000; log_filter=opt \"global,cashier=debug\"; };
  })"

  dfx deploy internet_identity

  just dfx_local_deploy_icp_ledger
  just dfx_local_deploy_icrc1_ledger "ckBTC" "Chain Key Bitcoin" "ckBTC" "mxzaz-hqaaa-aaaar-qaada-cai" 8 10
  just dfx_local_deploy_icrc1_ledger "ckETH" "Chain Key Ethereum" "ckETH" "ss2fx-dyaaa-aaaar-qacoq-cai" 18 2000000000000000000
  just dfx_local_deploy_icrc1_ledger "ckUSDC" "Chain Key USD Coin" "ckUSDC" "xevnm-gaaaa-aaaar-qafnq-cai" 8 10000
  just dfx_local_deploy_icrc1_ledger "DOGE" "Test Token" "DOGE" "x5qut-viaaa-aaaar-qajda-cai" 8 10000


# Prints dfx info of the local deployment
[group('dfx')]
dfx_local_info:
  #!/usr/bin/env bash
  set -e
  
  dfx_webserver_port=$(dfx info webserver-port)
  cashier_backend_id=$(dfx canister id cashier_backend)
  token_storage_id=$(dfx canister id token_storage)
  internet_identity_id=$(dfx canister id internet_identity)
  gate_service_backend_id=$(dfx canister id gate_service_backend)

  echo "webserver-port: $dfx_webserver_port"
  echo "cashier_backend id: $cashier_backend_id"
  echo "token_storage id: $token_storage_id"
  echo "internet_identity id: $internet_identity_id"
  echo "gate_service_backend_id: $gate_service_backend_id"

  echo "cashier_backend url: http://$cashier_backend_id.raw.localhost:$dfx_webserver_port"
  echo "token_storage url: http://$token_storage_id.raw.localhost:$dfx_webserver_port"
  echo "internet_identity url: http://$internet_identity_id.raw.localhost:$dfx_webserver_port"
  echo "gate_service_backend url: http://$gate_service_backend_id.raw.localhost:$dfx_webserver_port"

# Airdrop tokens to the target principal
[group('dfx')]
dfx_local_airdrop target_principal:
  #!/usr/bin/env bash
  set -e
  dfx canister call icp_ledger_canister icrc1_transfer "(record { 
        to = record { 
            owner = principal \"{{target_principal}}\";
            subaccount = null;
        };
        memo = null; 
        created_at_time = null;
        from_subaccount = null;
        amount = 10000000000;
        fee = null
  })" 
  just dfx_local_airdrop_token {{target_principal}} mxzaz-hqaaa-aaaar-qaada-cai 1000000
  just dfx_local_airdrop_token {{target_principal}} ss2fx-dyaaa-aaaar-qacoq-cai 1000000000000000
  just dfx_local_airdrop_token {{target_principal}} xevnm-gaaaa-aaaar-qafnq-cai 10000000000
  just dfx_local_airdrop_token {{target_principal}} x5qut-viaaa-aaaar-qajda-cai 10000000000


# Tails the local dfx logs
[group('dfx')]
dfx_local_logs_tail args="":
  tail -f "{{DFX_LOGFILE}}" {{args}}


[private]
dfx_prepare_env: 
  dfx identity new --storage-mode=plaintext --force cashier_local_dev
  dfx identity use cashier_local_dev


[private]
create_canisters network cycles:
  dfx canister --network={{network}} create --with-cycles={{cycles}} --all


[private]
dfx_local_deploy_icrc1_ledger canister_name name symbol canister_id decimals transfer_fee:
  #!/usr/bin/env bash
  set -e

  export MINTER=$(dfx identity get-principal)

  dfx deploy {{canister_name}} --argument "
  (variant { 
    Init = record { 
      token_symbol = \"{{symbol}}\";
      token_name = \"{{name}}\";
      decimals = opt {{decimals}} : opt nat8;
      transfer_fee = {{transfer_fee}} : nat;
      minting_account = record { owner = principal \"$MINTER\"; }; 
      metadata = vec {};
      feature_flags = opt record { icrc2 = true };
      initial_balances = vec {};
      archive_options = record { 
        num_blocks_to_archive = 1000 : nat64;
        trigger_threshold = 500 : nat64;
        controller_id = principal \"$MINTER\"; 
        cycles_for_archive_creation = opt 10000000000000 : opt nat64; 
      } 
    }
  })" --specified-id {{canister_id}}


[private]
dfx_local_deploy_icp_ledger:
  #!/usr/bin/env bash
  set -e

  # dfx identity use default
  export DEFAULT_ACCOUNT_ID=$(dfx ledger account-id)
  # dfx identity use cashier-dev
  export MINTER_ACCOUNT_ID=$(dfx ledger account-id)

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
  "


[private]
dfx_local_airdrop_token target_principal canister_id amount:
  #!/usr/bin/env bash
  set -e
  
  dfx canister call {{canister_id}} icrc1_transfer "(record { 
        to = record { 
            owner = principal \"{{target_principal}}\";
            subaccount = null;
        };
        memo = null; 
        created_at_time = null;
        from_subaccount = null;
        amount = {{amount}};
        fee = null
  })" 
