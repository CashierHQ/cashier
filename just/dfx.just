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


# Deploys the canisters to the specified network - eg: just dfx_deploy --network=dev
# params owner: principal id of the owner, for canister initialization
# network: dfx network flag, e.g. --network=dev
# backend_log_filter: log filter string for the backend canister
# token_storage_log_filter: log filter string for the token_storage canister
[group('dfx')]
dfx_deploy owner network="" backend_log_filter="" token_storage_log_filter="": 
  #!/usr/bin/env bash
  just dfx_deploy_token_storage {{owner}} {{network}} {{token_storage_log_filter}}

  just dfx_deploy_backend {{owner}} {{network}} {{backend_log_filter}}

  dfx deploy cashier_frontend_new {{network}}

# Starts the local dfx server and deploys the canisters
[group('dfx')]
dfx_local_deploy: dfx_local_start && dfx_local_info
  #!/usr/bin/env bash
  set -e

  export OWNER=$(dfx identity get-principal)

  just dfx_deploy "${OWNER}"

  cashier_backend_id=$(dfx canister id cashier_backend)
  dfx deploy gate_service --argument "(record {
      log_settings=opt record { enable_console=opt true; in_memory_records=opt 10000; log_filter=opt \"global,cashier=debug\"; };
      owner=principal \"${OWNER}\";
      permissions=opt (vec { record { principal \"${cashier_backend_id}\"; vec { variant { GateCreate } } } });
  })"

  dfx deploy internet_identity

  # Deploy ledgers first
  just dfx_local_deploy_icp_ledger
  just dfx_local_deploy_icrc1_ledger "${OWNER}" "ckBTC" "Chain Key Bitcoin" "ckBTC" "mxzaz-hqaaa-aaaar-qaada-cai" 8 10
  just dfx_local_deploy_icrc1_ledger "${OWNER}" "ckETH" "Chain Key Ethereum" "ckETH" "ss2fx-dyaaa-aaaar-qacoq-cai" 18 2000000000000
  just dfx_local_deploy_icrc1_ledger "${OWNER}" "ckUSDC" "Chain Key USD Coin" "ckUSDC" "xevnm-gaaaa-aaaar-qafnq-cai" 8 10000
  just dfx_local_deploy_icrc1_ledger "${OWNER}" "DOGE" "Test Token" "DOGE" "x5qut-viaaa-aaaar-qajda-cai" 8 10000

  # Deploy index canisters AFTER ledgers
  just dfx_local_deploy_icp_index
  just dfx_local_deploy_icrc_index "ckBTC_index" "mxzaz-hqaaa-aaaar-qaada-cai" "n5wcd-faaaa-aaaar-qaaea-cai"
  just dfx_local_deploy_icrc_index "ckETH_index" "ss2fx-dyaaa-aaaar-qacoq-cai" "s3zol-vqaaa-aaaar-qacpa-cai"
  just dfx_local_deploy_icrc_index "ckUSDC_index" "xevnm-gaaaa-aaaar-qafnq-cai" "xrs4b-hiaaa-aaaar-qafoa-cai"

  # Deploy ICRC7 NFT ledger
  just dfx_local_deploy_icrc7_ledger "${OWNER}" "ICRC7NFT" "CashierDev collection" "CashierDev" "This collection is for development purpose"

[group('dfx')]
dfx_local_deploy_token canister_name name symbol canister_id decimals fee:
  #!/usr/bin/env bash
  set -e

  export OWNER=$(dfx identity get-principal)

  echo "owner: $OWNER"
  just dfx_local_deploy_icrc1_ledger "${OWNER}" {{canister_name}} {{name}} {{symbol}} {{canister_id}}  {{decimals}} {{fee}}

# Prints dfx info of the local deployment
[group('dfx')]
dfx_local_info:
  #!/usr/bin/env bash
  set -e

  dfx_webserver_port=$(dfx info webserver-port)
  cashier_backend_id=$(dfx canister id cashier_backend)
  token_storage_id=$(dfx canister id token_storage)
  internet_identity_id=$(dfx canister id internet_identity)
  gate_service_id=$(dfx canister id gate_service)

  # Index canister IDs (may not be deployed yet)
  icp_index_id=$(dfx canister id icp_index 2>/dev/null || echo "not deployed")
  ckbtc_index_id=$(dfx canister id ckBTC_index 2>/dev/null || echo "not deployed")
  cketh_index_id=$(dfx canister id ckETH_index 2>/dev/null || echo "not deployed")
  ckusdc_index_id=$(dfx canister id ckUSDC_index 2>/dev/null || echo "not deployed")

  # ICRC7 NFT ledger
  icrc7_nft_id=$(dfx canister id ICRC7NFT 2>/dev/null || echo "not deployed")

  echo "webserver-port: $dfx_webserver_port"
  echo "cashier_backend id: $cashier_backend_id"
  echo "token_storage id: $token_storage_id"
  echo "internet_identity id: $internet_identity_id"
  echo "gate_service_id: $gate_service_id"

  echo "icp_index id: $icp_index_id"
  echo "ckBTC_index id: $ckbtc_index_id"
  echo "ckETH_index id: $cketh_index_id"
  echo "ckUSDC_index id: $ckusdc_index_id"
  echo "icrc7_nft_id: $icrc7_nft_id"

  echo "cashier_backend url: http://$cashier_backend_id.raw.localhost:$dfx_webserver_port"
  echo "token_storage url: http://$token_storage_id.raw.localhost:$dfx_webserver_port"
  echo "internet_identity url: http://$internet_identity_id.raw.localhost:$dfx_webserver_port"
  echo "gate_service url: http://$gate_service_id.raw.localhost:$dfx_webserver_port"

# Airdrop tokens to the target principal
[group('dfx')]
dfx_local_airdrop target_principal:
  #!/usr/bin/env bash
  set -e

  echo "Airdrop ICP"
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

  echo "Airdrop ICRC tokens"
  just dfx_local_airdrop_token {{target_principal}} mxzaz-hqaaa-aaaar-qaada-cai 1000000
  just dfx_local_airdrop_token {{target_principal}} ss2fx-dyaaa-aaaar-qacoq-cai 100000000000000000
  just dfx_local_airdrop_token {{target_principal}} xevnm-gaaaa-aaaar-qafnq-cai 10000000000
  just dfx_local_airdrop_token {{target_principal}} x5qut-viaaa-aaaar-qajda-cai 10000000000

  # mint ICRC7 NFT
  echo "Airdrop NFT"
  just dfx_local_mint_nft {{target_principal}} cvvmr-dyaaa-aaaai-q32oq-cai "NFT1" "First nft for testing"
  just dfx_local_mint_nft {{target_principal}} cvvmr-dyaaa-aaaai-q32oq-cai "NFT2" "Second nft for testing"
  just dfx_local_mint_nft {{target_principal}} cvvmr-dyaaa-aaaai-q32oq-cai "NFT3" "Third nft for testing"


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


# Deploys the backend canister
# params owner: principal id of the owner
# network: dfx network flag, e.g. --network=dev
# log_filter: log filter string (default for local and dev)
[private]
dfx_deploy_backend owner network="" log_filter="global,cashier=debug":
  #!/usr/bin/env bash
  dfx deploy cashier_backend --argument "(record {
      log_settings=opt record { enable_console=opt true; in_memory_records=opt 10000; log_filter=opt \"{{log_filter}}\"; };
      owner=principal \"{{owner}}\";
  })" {{network}}

# Deploys the token_storage canister
# params owner: principal id of the owner
# network: dfx network flag, e.g. --network=dev
# log_filter: log filter string (default for local and dev)
[private]
dfx_deploy_token_storage owner network="" log_filter="global,cashier=debug,token_storage=debug":
  #!/usr/bin/env bash
  set -e

  dfx deploy token_storage --argument "(record {
      log_settings=opt record { enable_console=opt true; in_memory_records=opt 10000; log_filter=opt \"{{log_filter}}\"; };
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
  })" {{network}}


[private]
dfx_local_deploy_icrc1_ledger minter canister_name name symbol canister_id decimals transfer_fee:
  #!/usr/bin/env bash
  set -e

  dfx deploy {{canister_name}} --argument "
  (variant { 
    Init = record { 
      token_symbol = \"{{symbol}}\";
      token_name = \"{{name}}\";
      decimals = opt {{decimals}} : opt nat8;
      transfer_fee = {{transfer_fee}} : nat;
      minting_account = record { owner = principal \"{{minter}}\"; }; 
      metadata = vec {};
      feature_flags = opt record { icrc2 = true };
      initial_balances = vec {};
      archive_options = record { 
        num_blocks_to_archive = 1000 : nat64;
        trigger_threshold = 500 : nat64;
        controller_id = principal \"{{minter}}\"; 
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
dfx_local_deploy_icp_index:
  #!/usr/bin/env bash
  set -e

  dfx deploy icp_index --argument "(record {
    ledger_id = principal \"ryjl3-tyaaa-aaaaa-aaaba-cai\";
  })" --specified-id qhbym-qaaaa-aaaaa-aaafq-cai


[private]
dfx_local_deploy_icrc_index canister_name ledger_id index_id:
  #!/usr/bin/env bash
  set -e

  dfx deploy {{canister_name}} --argument "(opt variant { Init = record {
    ledger_id = principal \"{{ledger_id}}\";
    retrieve_blocks_from_ledger_interval_seconds = opt 10;
  } })" --specified-id {{index_id}}

[private]
dfx_local_deploy_icrc7_ledger minter_id canister_name collection_name collection_symbol collection_description:
  #!/usr/bin/env bash
  set -e

  dfx deploy {{canister_name}} --argument "(
        variant {
            Init = record {
                permissions = record {
                    user_permissions = vec {
                        record {
                            principal \"{{minter_id}}\";
                            vec {
                                variant { UpdateMetadata };
                                variant { Minting };
                                variant { UpdateCollectionMetadata };
                                variant { UpdateUploads };
                                variant { ManageAuthorities };
                                variant { ReadUploads };
                            };
                        };
                    };
                };
                supply_cap = null;
                tx_window = null;
                test_mode = false;
                default_take_value = null;
                max_canister_storage_threshold = null;
                logo = null;
                permitted_drift = null;
                name = \"{{collection_name}}\";
                description = opt \"{{collection_description}}\";
                version = record {
                    major = 1 : nat32;
                    minor = 1 : nat32;
                    patch = 1 : nat32;
                };
                max_take_value = null;
                max_update_batch_size = null;
                max_query_batch_size = null;
                commit_hash = \"$(git rev-parse HEAD 2>/dev/null || echo 'aaa')\";
                max_memo_size = null;
                atomic_batch_transfers = null;
                collection_metadata = vec {};
                symbol = \"{{collection_symbol}}\";
                approval_init = record {
                    max_approvals_per_token_or_collection = null;
                    max_revoke_approvals = null;
                };
            }
        }
    )"


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

[private]
dfx_local_mint_nft target_principal canister_id nft_name nft_description:
  #!/usr/bin/env bash
  set -e

  dfx canister call {{canister_id}} mint "(record {
        mint_requests = vec {
          record {
            token_owner = record {
              owner = principal \"{{target_principal}}\";
              subaccount = null;
            };
            metadata = vec {
              record { \"name\"; variant { Text = \"{{nft_name}}\" } };
              record { \"description\"; variant { Text = \"{{nft_description}}\" } };
            };
            memo = null;
          }
        }
  })"