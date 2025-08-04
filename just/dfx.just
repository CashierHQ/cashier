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

  dfx deploy cashier_backend
  dfx deploy token_storage
  dfx deploy internet_identity
  # dfx deploy icrc1_ledger_canister

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


# Prints dfx info of the local deployment
[group('dfx')]
dfx_local_info:
  #!/usr/bin/env bash
  set -e
  
  dfx_webserver_port=$(dfx info webserver-port)
  cashier_backend_id=$(dfx canister id cashier_backend)
  token_storage_id=$(dfx canister id token_storage)
  internet_identity_id=$(dfx canister id internet_identity)

  echo "webserver-port: $dfx_webserver_port"
  echo "cashier_backend id: $cashier_backend_id"
  echo "token_storage id: $token_storage_id"
  echo "internet_identity id: $internet_identity_id"

  echo "cashier_backend url: http://$cashier_backend_id.raw.localhost:$dfx_webserver_port"
  echo "token_storage url: http://$token_storage_id.raw.localhost:$dfx_webserver_port"
  echo "internet_identity url: http://$internet_identity_id.raw.localhost:$dfx_webserver_port"


[private]
dfx_prepare_env: 
  dfx identity new --storage-mode=plaintext --force cashier_local_dev
  dfx identity use cashier_local_dev


[private]
create_canisters network cycles:
  dfx canister --network={{network}} create --with-cycles={{cycles}} --all

