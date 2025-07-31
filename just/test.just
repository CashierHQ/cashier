
# Run unit tests
[group('test')]
test_unit test_name="":
  # Unit tests for all the packages
  cargo test {{test_name}} --lib --bins


# Run unit and integration tests
[group('test')]
test test_name="":
  cargo test {{test_name}}


# Run unit tests for the i686 target
[group('test')]
test_unit_i686 test_name="":
  cargo test {{test_name}} --lib --bins --target i686-unknown-linux-gnu

