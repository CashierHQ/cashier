# deploy all canister to the specified network
deploy-all NETWORK:
  #!/usr/bin/env bash
  set -e

  dfx deploy cashier_backend --network {{NETWORK}}
  dfx deploy token_storage --network {{NETWORK}}
  dfx deploy cashier_frontend_new --network {{NETWORK}}
  dfx deploy cashier_frontend --network {{NETWORK}}



