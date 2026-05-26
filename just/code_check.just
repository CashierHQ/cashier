# Formats the code
[group('code_check')]
fmt args="":
  cargo fmt --all {{args}}


# Formats the code using the nightly version of rustfmt
[group('code_check')]
fmt_nightly:
  cargo +nightly fmt --all


# Runs clippy on the code
[group('code_check')]
clippy args="":
  cargo clippy --all-features --all-targets {{args}}


# Runs fmt and clippy on the code. It fails if any of the checks fail
[group('code_check')]
check_code:
    just fmt "--check"
    just clippy "-- -D warnings"


# Runs prettier, lint, and type checks on the frontend + shared TS packages
[group('code_check')]
frontend_check_code: install_frontend_deps
    pnpm --filter cashier_frontend_new lint
    # Copy .env.dev for svelte-check type generation, run check, cleanup
    cp {{FRONTEND_DIR_NEW}}/.env.dev {{FRONTEND_DIR_NEW}}/.env && pnpm --filter cashier_frontend_new check || (rm -f {{FRONTEND_DIR_NEW}}/.env && exit 1)
    rm -f {{FRONTEND_DIR_NEW}}/.env
    # Lint + format-check the shared TS package
    pnpm --filter @cashier/shared lint
    # Detect unused files / exports / deps across the whole workspace
    pnpm exec knip

# Runs lint and type checks on the wallet
[group('code_check')]
wallet_check_code: install_frontend_deps
    pnpm --filter wallet lint
    # Copy .env.dev for svelte-check type generation, run check, cleanup
    cp {{FRONTEND_DIR_WALLET}}/.env.dev {{FRONTEND_DIR_WALLET}}/.env && pnpm --filter wallet check || (rm -f {{FRONTEND_DIR_WALLET}}/.env && exit 1)
    rm -f {{FRONTEND_DIR_WALLET}}/.env
