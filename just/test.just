# Run all Rust and TypeScript tests for backend and frontend
[group('test')]
test_all: test test_frontend


# Run unit tests
[group('test')]
test_unit test_name="":
  # Unit tests for all the packages
  cargo nextest run {{test_name}} --lib --bins


# Run unit and integration tests
[group('test')]
test test_name="": download_artifacts build_canisters
  cargo nextest run {{test_name}}


# Run unit tests for the i686 target
[group('test')]
test_unit_i686 test_name="":
  cargo nextest run {{test_name}} --lib --bins --target i686-unknown-linux-gnu


# Run the frontend tests
[group('test')]
test_frontend: install_frontend_deps
  cd {{FRONTEND_DIR_NEW}} && npm run test


# Execute the coverage report for the tests using the llvm-cov tool. This takes a long time to run.
[group('test')]
test_coverage:
  # WARN: using tarpaulin for the coverage report is faster but not recommended because it is not reliable.
  # To output the coverage report in the lcov format replace `--html` with `--lcov --output-path ./target/lcov.file`.
  cargo llvm-cov --release --all-features --ignore-run-fail --workspace --html
  