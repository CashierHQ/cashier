# deploy all canister to the specified network
[group('deploy')]
deploy-all NETWORK:
  #!/usr/bin/env bash
  set -e
  export OWNER=$(dfx identity get-principal)
    
  # deploy the backend
  dfx deploy cashier_backend --network {{NETWORK}} --argument "(record {
      log_settings=opt record { enable_console=opt true; in_memory_records=opt 10000; log_filter=opt \"global,cashier=debug\"; };
      owner=principal \"${OWNER}\";
  })"

  dfx deploy token_storage --argument "(record {
      log_settings=opt record { enable_console=opt true; in_memory_records=opt 10000; log_filter=opt \"global,cashier=debug,token_storage=debug\"; };
      owner=principal \"${OWNER}\";
      tokens = null
  })" --network {{NETWORK}}

  # deploy the frontend
  dfx deploy cashier_frontend_new --network {{NETWORK}}
  dfx deploy cashier_frontend --network {{NETWORK}}


