build-backend:
	cargo build --release --target wasm32-unknown-unknown --package cashier_backend --locked

build-token-storage:
	cargo build --release --target wasm32-unknown-unknown --package token_storage --locked

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
	make setup-test
	@npm run test:integration-backend

# Interactive test command that asks for test file and runs it
run-test:
	make build-backend && make setup-test
	@bash scripts/test/run_test_and_dump_logs.sh

# Run a specific test file if provided, otherwise ask for the file path
test-file:
	@if [ -z "$(MAKECMDGOALS)" ] || [ "$(MAKECMDGOALS)" = "test-file" ]; then \
		bash scripts/test/run_test_and_dump_logs.sh; \
	else \
		bash scripts/test/run_test_and_dump_logs.sh "$(word 2,$(MAKECMDGOALS))"; \
	fi

request-lock-test:
	dfx start --clean --background
	bash src/test/scripts/setup.sh
	npm test src/test/local-tests
	dfx stop


# Catch-all target to handle additional arguments
%:
	@:

# have to run local-setup before running this, need create did file in .dfx
g: 
	@dfx generate cashier_backend
	rm src/declarations/cashier_backend/cashier_backend.did
	rm src/declarations/cashier_backend/index.d.ts
	rm src/declarations/cashier_backend/index.js
	@dfx generate token_storage
	rm src/declarations/token_storage/token_storage.did
	rm src/declarations/token_storage/index.d.ts
	rm src/declarations/token_storage/index.js
	@dfx generate icp_ledger_canister
	rm src/declarations/icp_ledger_canister/icp_ledger_canister.did
	rm src/declarations/icp_ledger_canister/index.d.ts
	rm src/declarations/icp_ledger_canister/index.js

generate-ci:
	@dfx generate cashier_backend
	rm src/declarations/cashier_backend/cashier_backend.did
	rm src/declarations/cashier_backend/index.d.ts
	rm src/declarations/cashier_backend/index.js
	@dfx generate token_storage
	rm src/declarations/token_storage/token_storage.did
	rm src/declarations/token_storage/index.d.ts
	rm src/declarations/token_storage/index.js


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
	cp .env.example .env
	cp .env.example .env.local
	# dfx start --background --clean
	# @bash scripts/deploy.sh --skip
	# @bash scripts/local/setup_icp_ledger.sh
	make generate-ci
	# dfx stop

extract-candid:
	candid-extractor "target/wasm32-unknown-unknown/release/cashier_backend.wasm" > "src/cashier_backend/cashier_backend.did"
	candid-extractor "target/wasm32-unknown-unknown/release/token_storage.wasm" > "src/token_storage/token_storage.did"

