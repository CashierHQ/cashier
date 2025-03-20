# export WASM32_UNKNOWN_UNKNOWN_OPENSSL_DIR=/opt/homebrew/opt/openssl@1.1

build-wasm:
	@cargo build --release --target wasm32-unknown-unknown --package cashier_backend

build-did:
	@candid-extractor target/wasm32-unknown-unknown/release/cashier_backend.wasm > src/cashier_backend/cashier_backend.did

setup-test:
	make build-wasm
	bash scripts/setup_test.sh
	
test:
	make build-wasm
	@npm run test

# have to run local-setup before running this, need create did file in .dfx
g: 
	@dfx generate cashier_backend
	@dfx generate icp_ledger_canister
	rm src/declarations/cashier_backend/cashier_backend.did
	rm src/declarations/icp_ledger_canister/icp_ledger_canister.did

predeploy:
	make build-wasm
	make build-did

build: 
	make build-wasm
	make build-did

deploy:
	@bash scripts/deploy.sh

local-setup:
	@bash scripts/local/setup_icp_ledger.sh

local:
	make local-setup
	@bash scripts/deploy.sh --skip
	make g