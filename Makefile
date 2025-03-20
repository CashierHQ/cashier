# export WASM32_UNKNOWN_UNKNOWN_OPENSSL_DIR=/opt/homebrew/opt/openssl@1.1

build-backend:
	bash ./scripts/build_package.sh cashier_backend

build-token-storage:
	bash ./scripts/build_package.sh token_storage


setup-test:
	make build-backend
	bash scripts/setup_test.sh
	
test:
	make build-backend
	@npm run test

# have to run local-setup before running this, need create did file in .dfx
g: 
	@dfx generate cashier_backend
	@dfx generate token_storage
	@dfx generate icp_ledger_canister
	rm src/declarations/cashier_backend/cashier_backend.did
	rm src/declarations/token_storage/token_storage.did
	rm src/declarations/icp_ledger_canister/icp_ledger_canister.did

predeploy:
	make build-backend

build: 
	make build-backend

deploy:
	@bash scripts/deploy.sh

local-setup:
	@bash scripts/local/setup_icp_ledger.sh

local:
	make local-setup
	@bash scripts/deploy.sh --skip
	make g