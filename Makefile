# export WASM32_UNKNOWN_UNKNOWN_OPENSSL_DIR=/opt/homebrew/opt/openssl@1.1

build-wasm:
	@cargo build --release --target wasm32-unknown-unknown --package cashier_backend

build-did:
	@candid-extractor target/wasm32-unknown-unknown/release/cashier_backend.wasm > src/cashier_backend/cashier_backend.did

deploy:
	make build-wasm
	make build-did
	@dfx deploy cashier_backend 

test:
	@npx tsx src/example/index.ts

g: 
	@dfx generate cashier_backend