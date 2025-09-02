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


# Runs prettier and lint checks on the frontend code
[group('code_check')]
frontend_check_code: install_frontend_deps
    cd {{FRONTEND_DIR}} && npm run format:ci
    cd {{FRONTEND_DIR}} && npm run lint
    cd {{FRONTEND_DIR}} && npm run knip
