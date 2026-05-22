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
