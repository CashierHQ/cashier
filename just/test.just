# Run all Rust and TypeScript unit and integration tests
[group('test')]
test_all test_name="": test test_ts_integration


# Run unit tests
[group('test')]
test_unit test_name="":
  # Unit tests for all the packages
  cargo test {{test_name}} --lib --bins


# Run unit and integration tests
[group('test')]
test test_name="": download_artifacts build_canisters
  cargo test {{test_name}}


# Run unit tests for the i686 target
[group('test')]
test_unit_i686 test_name="":
  cargo test {{test_name}} --lib --bins --target i686-unknown-linux-gnu


# Run TypeScript based integration tests
[group('test')]
test_ts_integration: download_artifacts build_canisters
  npm install
  npm run test:integration-backend