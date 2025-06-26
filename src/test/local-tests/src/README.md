# Setup

start dfx local with delay 2000 ms, this is crucial for testing reentrancy and running timout should increase

```bash
dfx start --clean --artificial-delay 2000
```

deploy canisters

```bash
bash src/test/scripts/setup.sh
```
