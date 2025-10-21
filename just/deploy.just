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
      tokens = opt vec {
        record {
          details = variant { IC = record {
              ledger_id = principal \"ryjl3-tyaaa-aaaaa-aaaba-cai\";
              index_id = opt principal \"qhbym-qaaaa-aaaaa-aaafq-cai\";
              fee = 10000 : nat;
            }
          };
          symbol = \"ICP\";
          name = \"Internet Computer\";
          decimals = 8;
          enabled_by_default = true;
        };
        record {
          details = variant { IC = record {
              ledger_id = principal \"mxzaz-hqaaa-aaaar-qaada-cai\";
              index_id = opt principal \"n5wcd-faaaa-aaaar-qaaea-cai\";
              fee = 10 : nat;
            }
          };
          symbol = \"ckBTC\";
          name = \"Chain Key Bitcoin\";
          decimals = 8;
          enabled_by_default = true;
        };
        record {
          details = variant { IC = record {
              ledger_id = principal \"ss2fx-dyaaa-aaaar-qacoq-cai\";
              index_id = opt principal \"s3zol-vqaaa-aaaar-qacpa-cai\";
              fee = 2_000_000_000_000 : nat;
            }
          };
          symbol = \"ckETH\";
          name = \"Chain Key Ethereum\";
          decimals = 18;
          enabled_by_default = true;
        };
        record {
          details = variant { IC = record {
              ledger_id = principal \"xevnm-gaaaa-aaaar-qafnq-cai\";
              index_id = opt principal \"xrs4b-hiaaa-aaaar-qafoa-cai\";
              fee = 10_000 : nat;
            }
          };
          symbol = \"ckUSDC\";
          name = \"Chain Key USD Coin\";
          decimals = 8;
          enabled_by_default = true;
        };
      };
  })" --network {{network}}



