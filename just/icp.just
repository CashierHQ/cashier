# icp.just — personal/experimental icp-cli local network recipes.
# Standalone: run with `just -f just/icp.just <recipe>`, or `import "./just/icp.just"` from the justfile.

# Start local network (PocketIC via icp-cli, port 8000, background).
[group('icp')]
icp_local_start: icp_local_stop
  #!/usr/bin/env bash
  set -e
  icp network start -d
  sleep 2

# Stop local network. Ignore the "not running" error + backtrace (harmless when already stopped).
[group('icp')]
icp_local_stop:
  icp network stop 2>/dev/null || true

# Full LOCAL deploy: start network → ledgers + indexes + ckBTC (dfx) → app canisters (icp-cli).
# ICP ledger + index are auto-provided by nns:true (icp.yaml); the other tokens need dfx because
# icp-cli 0.2.6 has no --specified-id. dfx runs as a client against the icp-cli network.
# The `&& (icp_deploy)` runs the app-canister deploy AFTER all ledgers are up.
[group('icp')]
icp_local_deploy: icp_local_start && (icp_deploy)
  #!/usr/bin/env bash
  set -e
  cd "$(git rev-parse --show-toplevel)"

  # Clear dfx's stale local canister-id cache so it doesn't shadow the fresh PocketIC.
  rm -rf .dfx/local

  owner=$(dfx identity get-principal)

  # ICRC1 token ledgers via dfx --specified-id (PocketIC's nns subnets accept mainnet IDs).
  # dfx_local_deploy_icrc1_ledger args: minter canister_name "name" symbol canister_id decimals fee
  just dfx_local_deploy_icrc1_ledger "${owner}" ckETH  "Chain Key Ethereum" ckETH  ss2fx-dyaaa-aaaar-qacoq-cai 18 2000000000000
  just dfx_local_deploy_icrc1_ledger "${owner}" ckUSDC "Chain Key USD Coin" ckUSDC xevnm-gaaaa-aaaar-qafnq-cai 6  10000
  just dfx_local_deploy_icrc1_ledger "${owner}" DOGE   "Test Token"         DOGE   x5qut-viaaa-aaaar-qajda-cai 8  10000

  # ICRC index canisters — arg is the ledger to index; each index's own ID comes from
  # its dfx.json `specified_id`. Safe to deploy before the ledger exists (just stores the principal).
  just dfx_local_deploy_icrc_index ckBTC_index  mxzaz-hqaaa-aaaar-qaada-cai
  just dfx_local_deploy_icrc_index ckETH_index  ss2fx-dyaaa-aaaar-qacoq-cai
  just dfx_local_deploy_icrc_index ckUSDC_index xevnm-gaaaa-aaaar-qafnq-cai

  # ckBTC stack — dfx_local_deploy_ckbtc_canisters args: owner ledger_id minter_id kyt_id
  just dfx_local_deploy_ckbtc_canisters "${owner}" mxzaz-hqaaa-aaaar-qaada-cai ml52i-qqaaa-aaaar-qaaba-cai o6ude-eyaaa-aaaar-qal6a-cai

# Deploy all app canisters: token_storage → backend → frontend
#   env: target environment (local | dev | staging | production)
[group('icp')]
icp_deploy env="local": (icp_deploy_token_storage env) (icp_deploy_backend env) (icp_deploy_frontend env)
  @echo "✓ Deployed token_storage + cashier_backend + cashier_frontend_new to '{{env}}'"

# Deploy token_storage with the token registry (ICP, ckBTC, ckETH, ckUSDC)
#   env:        target environment
#   log_filter: canister log filter
#   mode:       install mode (install | reinstall | upgrade); empty = auto
[group('icp')]
icp_deploy_token_storage env="local" log_filter="global,cashier=debug,token_storage=debug" mode="":
  #!/usr/bin/env bash
  set -e
  owner=$(icp identity principal)
  MODE_FLAG=""
  [ -n "{{mode}}" ] && MODE_FLAG="--mode {{mode}}"
  icp deploy token_storage -e {{env}} $MODE_FLAG --args "(record {
      log_settings=opt record { enable_console=opt true; in_memory_records=opt (10000 : nat64); log_filter=opt \"{{log_filter}}\"; };
      owner=principal \"${owner}\";
      tokens = opt vec {
        record {
          details = variant { IC = record {
              ledger_id = principal \"ryjl3-tyaaa-aaaaa-aaaba-cai\";
              index_id = opt principal \"qhbym-qaaaa-aaaaa-aaafq-cai\";
              fee = 10000 : nat;
              supported_standards = vec { variant { ICRC1 }; variant { ICRC2 } };
            }
          };
          symbol = \"ICP\";
          name = \"Internet Computer\";
          decimals = 8 : nat8;
          enabled_by_default = true;
        };
        record {
          details = variant { IC = record {
              ledger_id = principal \"mxzaz-hqaaa-aaaar-qaada-cai\";
              index_id = opt principal \"n5wcd-faaaa-aaaar-qaaea-cai\";
              fee = 10 : nat;
              supported_standards = vec { variant { ICRC1 }; variant { ICRC2 } };
            }
          };
          symbol = \"ckBTC\";
          name = \"Chain Key Bitcoin\";
          decimals = 8 : nat8;
          enabled_by_default = true;
        };
        record {
          details = variant { IC = record {
              ledger_id = principal \"ss2fx-dyaaa-aaaar-qacoq-cai\";
              index_id = opt principal \"s3zol-vqaaa-aaaar-qacpa-cai\";
              fee = 2_000_000_000_000 : nat;
              supported_standards = vec { variant { ICRC1 }; variant { ICRC2 } };
            }
          };
          symbol = \"ckETH\";
          name = \"Chain Key Ethereum\";
          decimals = 18 : nat8;
          enabled_by_default = true;
        };
        record {
          details = variant { IC = record {
              ledger_id = principal \"xevnm-gaaaa-aaaar-qafnq-cai\";
              index_id = opt principal \"xrs4b-hiaaa-aaaar-qafoa-cai\";
              fee = 10_000 : nat;
              supported_standards = vec { variant { ICRC1 }; variant { ICRC2 } };
            }
          };
          symbol = \"ckUSDC\";
          name = \"Chain Key USD Coin\";
          decimals = 6 : nat8;
          enabled_by_default = true;
        };
      };
      ckbtc_minter_id = principal \"ml52i-qqaaa-aaaar-qaaba-cai\";
  })"

# Deploy cashier_backend (looks up token_storage id from the running network)
#   env:        target environment
#   log_filter: canister log filter
[group('icp')]
icp_deploy_backend env="local" log_filter="global,cashier=debug":
  #!/usr/bin/env bash
  set -e
  owner=$(icp identity principal)
  token_storage_id=$(icp canister status token_storage -e {{env}} --id-only)
  icp deploy cashier_backend -e {{env}} --args "(record {
      log_settings=opt record { enable_console=opt true; in_memory_records=opt (10000 : nat64); log_filter=opt \"{{log_filter}}\"; };
      owner=principal \"${owner}\";
      token_storage_canister_id=principal \"${token_storage_id}\";
  })"

# Deploy cashier_frontend_new (uploads src/cashier_frontend_new/build)
#   env: target environment
[group('icp')]
icp_deploy_frontend env="local":
  icp deploy cashier_frontend_new -e {{env}}


# ── Airdrop (local testing) ─────────────────────────────────────────────────

# Airdrop ICP + ICRC1 tokens (ckETH, ckUSDC, DOGE) to a principal.
# ICP is sent from the icp identity (nns:true seeds it with ICP); the ICRC1 tokens are
# minted from the dfx identity (the ledger minter set by icp_local_deploy). Reuses dfx.just.
# Note: ckBTC is skipped — its minting account is the ckBTC minter canister, not airdroppable
# via a plain transfer.
#   target_principal: recipient principal
[group('icp')]
icp_local_airdrop target_principal:
  #!/usr/bin/env bash
  set -e
  cd "$(git rev-parse --show-toplevel)"

  echo "Airdrop ICP"
  icp canister call ryjl3-tyaaa-aaaaa-aaaba-cai icrc1_transfer "(record {
      to = record { owner = principal \"{{target_principal}}\"; subaccount = null };
      amount = 10_000_000_000 : nat;
      fee = null; memo = null; created_at_time = null; from_subaccount = null;
  })" -e local

  echo "Airdrop ckETH / ckUSDC / DOGE"
  just dfx_local_airdrop_token {{target_principal}} ss2fx-dyaaa-aaaar-qacoq-cai 100000000000000000
  just dfx_local_airdrop_token {{target_principal}} xevnm-gaaaa-aaaar-qafnq-cai 100000000
  just dfx_local_airdrop_token {{target_principal}} x5qut-viaaa-aaaar-qajda-cai 10000000000