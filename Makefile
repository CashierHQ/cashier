# export WASM32_UNKNOWN_UNKNOWN_OPENSSL_DIR=/opt/homebrew/opt/openssl@1.1

build-backend:
	bash ./scripts/build_package.sh cashier_backend

build-token-storage:
	bash ./scripts/build_package.sh token_storage

# staging
build-icp-ledger:
	dfx start --background
	dfx canister create icp_ledger_canister
	dfx build icp_ledger_canister
	dfx stop


setup-test:
	make build-backend
	bash scripts/setup_test.sh
	
test:
	@npm run test:integration-backend

# have to run local-setup before running this, need create did file in .dfx
g: 
	@dfx generate cashier_backend
	rm src/declarations/cashier_backend/cashier_backend.did
	@dfx generate token_storage
	rm src/declarations/token_storage/token_storage.did
	@dfx generate icp_ledger_canister
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
	@bash scripts/local/setup_icp_ledger.sh
	@bash scripts/deploy.sh --skip
	make g

frontend-setup:
	cp .env.example .env.local
	dfx start --background --clean
	@bash scripts/deploy.sh --skip
	@bash scripts/local/setup_icp_ledger.sh
	make g
	dfx stop
