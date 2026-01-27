# Run all Rust and TypeScript tests for backend and frontend
[group('test')]
test_all: test test_frontend


# Run unit tests
[group('test')]
test_unit test_name="":
  # Unit tests for all the packages
  cargo test {{test_name}} --lib --bins


# Run unit and integration tests
[group('test')]
test test_name="": download_artifacts build_canisters
  cargo test {{test_name}}


# Run integration tests only (supports nextest sharding)
[group('test')]
test_integration partition="" total="":
  #!/usr/bin/env bash
  set -e
  # Clean stale lock/ready files to ensure fresh template deployment
  rm -f ./target/pocket-ic-test-state/template.lock
  rm -f ./target/pocket-ic-test-state/template.ready
  rm -f ./target/pocket-ic-test-state/principals.json
  rm -rf ./target/pocket-ic-test-state/template
  if [ -n "{{partition}}" ] && [ -n "{{total}}" ]; then
    cargo nextest run -p integration_tests --partition count:{{partition}}/{{total}}
  else
    cargo nextest run -p integration_tests
  fi

# Build nextest archive for integration tests (used by CI)
[group('test')]
test_integration_archive:
  cargo nextest archive -p integration_tests --archive-file target/nextest-archive.tar.zst


# Run unit tests for the i686 target
[group('test')]
test_unit_i686 test_name="":
  cargo test {{test_name}} --lib --bins --target i686-unknown-linux-gnu


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
  