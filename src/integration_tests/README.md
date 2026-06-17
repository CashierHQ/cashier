# Integration Tests

Integration test suites for canisters.

## Build

- Build canisters

```bash
just build
```

## Execute integration tests

```bash
just test_integration
```

## Execute benchmarks

- Benchmarks tests aim to determine the cycles consumption of canister actions, such as create-link, use-link, add-gate, etc

```bash
cargo test -p integration_tests benchmark -- --ignored --nocapture
```

The cycles consumption is printed out in console.
