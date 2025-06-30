# Test folder

This folder included two kind of test

-   Picjs tests: for testing normal flow

-   Local tests: for testing request lock

## Setup and run

### PicJS

Install dependencies in root

```bash
# install jest and other package
npm i

# build backend wasm
make setup-test

```

then run

```bash
npx jest -- src/test/picjs-tests
```
