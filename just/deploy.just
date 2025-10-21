# Deploy canister backend to specified network in canister_ids.json
deploy-backend NETWORK:
  #!/usr/bin/env bash
  dfx deploy cashier_backend --argument "(record {
      log_settings=opt record { enable_console=opt true; in_memory_records=opt 10000; log_filter=opt \"global,cashier=debug\"; };
      owner=principal \"${OWNER}\";
  })" --network {{NETWORK}}

# Deploy old frontend to specified network in canister_ids.json
deploy-cashier-frontend NETWORK:
  #!/usr/bin/env bash
  dfx deploy cashier_frontend --network {{NETWORK}}

# Deploy new frontend to specified network in canister_ids.json
deploy-cashier-frontend-new NETWORK:
  #!/usr/bin/env bash
  dfx deploy cashier_frontend_new --network {{NETWORK}}

deploy-all NETWORK:
  #!/usr/bin/env bash
  set -e
  export OWNER=$(dfx identity get-principal)
  just deploy-backend {{NETWORK}}
  just deploy-cashier-frontend-new {{NETWORK}}
  just deploy-cashier-frontend {{NETWORK}}
