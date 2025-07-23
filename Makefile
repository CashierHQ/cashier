build-backend:
	cargo build --release --target wasm32-unknown-unknown --package cashier_backend --locked

build-token-storage:
	cargo build --release --target wasm32-unknown-unknown --package token_storage --locked

# Build ICP ledger canister
build-icp-ledger:
	dfx start --background
	dfx canister create icp_ledger_canister
	dfx build icp_ledger_canister
	dfx stop

# Build all components needed for testing
build-test-deps: build-backend build-token-storage build-icp-ledger
	@echo "All test dependencies built successfully"

# Setup test environment (run after build-test-deps)
setup-test-env:
	bash scripts/setup_test.sh

# Test targets
test-integration: build-test-deps setup-test-env
	@echo "Running integration tests..."
	npx jest -- src/test/picjs-tests

test-request-lock: 
	@echo "Running request lock tests..."
	dfx start --clean --background
	bash src/test/scripts/setup.sh
	npx jest src/test/local-tests
	dfx stop

# Run all tests
test: test-integration test-request-lock
	@echo "All tests completed"

# Interactive test runner
run-test: build-test-deps setup-test-env
	@bash scripts/test/run_test_and_dump_logs.sh

# Run specific test file
test-file: build-test-deps setup-test-env
	@if [ -z "$(MAKECMDGOALS)" ] || [ "$(MAKECMDGOALS)" = "test-file" ]; then \
		bash scripts/test/run_test_and_dump_logs.sh; \
	else \
		bash scripts/test/run_test_and_dump_logs.sh "$(word 2,$(MAKECMDGOALS))"; \
	fi

# have to run local-setup before running this, need create did file in .dfx
generate: 
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
	make generate

frontend-setup:
	cp .env.example .env
	cp .env.example .env.local
	make generate-ci

extract-candid:
	candid-extractor "target/wasm32-unknown-unknown/release/cashier_backend.wasm" > "src/cashier_backend/cashier_backend.did"
	candid-extractor "target/wasm32-unknown-unknown/release/token_storage.wasm" > "src/token_storage/token_storage.did"

