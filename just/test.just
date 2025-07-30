
# Run all unit and integration tests
[group('test')]
test_all: test integration_test


# Run all unit tests
[group('test')]
test test_name="":
  # Unit tests for all the packages
  cargo test {{test_name}} --workspace --exclude integration-tests


# Run all integration tests
[group('test')]
integration_test test_name="":
  cargo test {{test_name}}


# Run all unit tests for the i686 target
[group('test')]
test_i686 test_name="":
  cargo test {{test_name}} --target i686-unknown-linux-gnu

