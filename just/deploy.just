# deploy all canister to the specified network
deploy-all NETWORK:
  #!/usr/bin/env bash
  set -e
  export OWNER=$(dfx identity get-principal)
  just dfx_deploy_token_storage "${OWNER}" {{NETWORK}}
  dfx deploy cashier_backend --network {{NETWORK}} --argument "(record {
      log_settings=opt record { enable_console=opt true; in_memory_records=opt 10000; log_filter=opt \"global,cashier=debug\"; };
      owner=principal \"${OWNER}\";
  })"
  dfx deploy cashier_frontend_new --network {{NETWORK}}
  dfx deploy cashier_frontend --network {{NETWORK}}

# deploy the token_storage canister with predefined tokens
dfx_deploy_token_storage owner network:
  #!/usr/bin/env bash
  set -e

  dfx deploy token_storage --argument "(record {
      log_settings=opt record { enable_console=opt true; in_memory_records=opt 10000; log_filter=opt \"global,cashier=debug,token_storage=debug\"; };
      owner=principal \"{{owner}}\";
      tokens = null
  })" --network {{network}}



