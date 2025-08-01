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
  dfx deploy


# Prints dfx info of the local deployment
[group('dfx')]
dfx_local_info:
  #!/usr/bin/env bash
  set -e
  
  dfx_replica_port=$(dfx info replica-port)
  dfx_webserver_port=$(dfx info webserver-port)
  cashier_backend_id=$(dfx canister id cashier_backend)
  token_storage_id=$(dfx canister id token_storage_id)

  echo "replica-port: $dfx_replica_port"
  echo "webserver-port: $dfx_webserver_port"
  echo "cashier_backend id: $cashier_backend_id"
  echo "token_storage id: $token_storage_id"

  echo "replica-url: http://127.0.0.1:$dfx_replica_port"
  echo "cashier_backend url: http://$cashier_backend_id.raw.localhost:$dfx_webserver_port"
  echo "token_storage url: http://$token_storage_id.raw.localhost:$dfx_webserver_port"


[private]
dfx_prepare_env: 
  dfx identity new --storage-mode=plaintext --force cashier_dev_local
  dfx identity use cashier_dev_local


[private]
create_canisters network cycles:
  dfx canister --network={{network}} create --with-cycles={{cycles}} --all

