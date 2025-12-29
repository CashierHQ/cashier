# Integration Tests

Integration test suites for canisters.

## Build

- Build canisters

```bash
just build
```

## Execute integration tests

```bash
cargo nextest run -p integration_tests
```

## Execute benchmarks

- Benchmarks tests aim to determine the cycles consumption of canister actions, such as create-link, use-link, add-gate, etc

```bash
cargo nextest run -p integration_tests -- --ignored --nocapture
```

The cycles consumption is printed out in console.
