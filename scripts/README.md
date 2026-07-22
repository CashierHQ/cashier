# Scripts

## Sync Omnity Rune Tokens

Use `sync_omnity_runes_to_token_storage.mjs` to fetch Rune token metadata from Omnity ICP and upsert the corresponding token records into `scripts/args/token_storage_args.template`.

The script:

- calls Omnity ICP `get_token_list` on canister `7ywcn-nyaaa-aaaar-qaeza-cai`
- keeps tokens with `rune_id`, ledger `principal`, and `token_id` prefixed by `Bitcoin-runes-`
- queries each Rune ledger for fee, name, symbol, and supported ICRC standards
- replaces existing token records by `ledger_id`
- appends missing Rune records
- leaves non-matching existing token records untouched

Prerequisites:

- run from the repository root
- frontend dependencies installed under `src/cashier_frontend_new`
- network access to IC mainnet

Dry run first:

```bash
node scripts/sync_omnity_runes_to_token_storage.mjs --dry-run
```

Apply changes:

```bash
node scripts/sync_omnity_runes_to_token_storage.mjs
```

Optional flags:

```bash
node scripts/sync_omnity_runes_to_token_storage.mjs \
  --canister-id 7ywcn-nyaaa-aaaar-qaeza-cai \
  --template scripts/args/token_storage_args.template \
  --host https://icp-api.io
```

Validate the generated token storage args:

```bash
just build_token_storage_args <owner> <log_filter> <ckbtc_minter_id> <omnity_bitcoin_id> /tmp/token_storage_args.txt
didc encode -d ./target/artifacts/token_storage.did -t "(TokenStorageInitData)" < /tmp/token_storage_args.txt > /tmp/token_storage_args.hex
```

Or build the encoded hex directly:

```bash
just build_token_storage_args_hex <owner> <log_filter> <ckbtc_minter_id> <omnity_bitcoin_id> /tmp/token_storage_args
```

After running the sync, inspect:

```bash
git diff scripts/args/token_storage_args.template
```

## Sync NFT Collections

Use `sync_nft_collections_to_token_storage.mjs` to fetch NFT collection metadata from nftGeek and Toniq (Entrepot), merge it, and push it into the `token_storage` canister's collection registry.

The script:

- fetches the canonical collection list (canister id, name, standard) from nftGeek's `/api/1/collections`
- enriches each collection with description/image/royalty from Toniq's `/api/collections`, matched by canister id
- ignores Toniq's own `standard` field (inconsistent values like `"legacy1.5"`) — nftGeek's `interface` is always used instead
- batches the merged records and calls `collection_manager_upsert_collections` on `token_storage` via `dfx canister call`, upserting (replacing, not duplicating) by `collection_id`

DGDG (`https://dgdg.app/nfts/collections`) is **not** used as a source — it's a client-rendered page, not a JSON API (fetching it returns HTML), so `total_items`/`floor_price` currently have no data source and default to `0`/`null`. Revisit if DGDG exposes a real JSON endpoint later.

Unlike `sync_omnity_runes_to_token_storage.mjs`, this makes a **live authenticated update call**, not a template-file patch — it uses your ambient `dfx identity`, which must hold `Permission::Admin` or `Permission::CollectionManager` on the target canister.

Prerequisites:

- run from the repository root
- network access to nftGeek/Toniq and to the target IC network
- `dfx identity` set to a principal holding `Permission::Admin` or `Permission::CollectionManager` on `token_storage`

Dry run first (fetches and merges, prints a summary + sample, does not call the canister):

```bash
node scripts/sync_nft_collections_to_token_storage.mjs --dry-run
```

Apply changes:

```bash
node scripts/sync_nft_collections_to_token_storage.mjs --network local
node scripts/sync_nft_collections_to_token_storage.mjs --network ic
```

Optional flags:

```bash
node scripts/sync_nft_collections_to_token_storage.mjs \
  --canister-id token_storage \
  --limit 50 \
  --batch-size 100
```

## Set the Gate canister secrets

- Populate the secrets in the `.env` file

- Set plaintext mode (default)

```bash
node scripts/set-gate-secrets.mjs --network <network-name>
```

- Set vetKeys mode

```bash
node scripts/set-gate-secrets.mjs --mode vetkd --network <network-name>
```

### Set the Gate canister secrets via CI (dev)

`.github/workflows/gate-secrets-dev.yml` runs this same script against the `dev` network from a `workflow_dispatch` trigger, so secrets can be (re)applied without anyone running it from a local `.env` file. It authenticates with the `dev` Environment's `DEPLOYER` identity (the same one used to deploy `gate_service` on dev, which is why it already holds `Permission::Admin` there), then writes `scripts/.env` on the runner from the `dev` Environment secrets below before invoking the script, and deletes the file afterwards:

- `GATE_TWITTER_API_KEY`
- `GATE_X_OAUTH_BASIC_AUTH`
- `GATE_X_REDIRECT_URI`
- `GATE_X_BEARER_TOKEN`
- `GATE_BREVO_API_KEY`
- `GATE_BREVO_EMAIL_SENDER`

Set these once under repo Settings → Environments → `dev` → Secrets (values match the local `scripts/.env` keys, just prefixed with `GATE_`).

This workflow only exists for `dev` — on staging/production, `gate_service` is owned by the Orbit station (see `orbit-gate-deploy.yml`), not the `DEPLOYER` identity, so this direct-call approach doesn't apply there.

To run it:

```bash
gh workflow run gate-secrets-dev.yml --repo CashierHQ/cashier --ref <branch> -f mode=plaintext
```

or from the GitHub UI: Actions tab → "Set Gate Secrets (dev)" → Run workflow (choose `mode` and branch).

Note: GitHub only resolves a workflow by filename (both via the UI and the API/`gh` CLI) once that file exists on the repository's default branch — it must be merged there first before it can be dispatched at all, even against a different `--ref`.

## Set the Gate canister hashing mode

- Get the current mode

```bash
node scripts/get-gate-secret-hashing-mode.mjs --network <network-name>
```

- Set SHA256 mode (default)

```bash
node scripts/set-password-hashing-mode.mjs --network <network-name>
```

- Set Argon2 mode

```bash
node scripts/set-password-hashing-mode.mjs --mode argon2id --network <network-name>
```
