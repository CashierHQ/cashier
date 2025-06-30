# Test folder

This folder includes two types of tests:

-   **PicJS tests**: For testing normal application flow and business logic
-   **Local tests**: For testing re-entrancy protection and request locking mechanisms

## Overview

The Cashier Protocol test suite ensures both functional correctness and security through comprehensive testing strategies:

### PicJS Tests

Standard integration tests that verify the normal operation flow of the Cashier Protocol, including user interactions, transaction processing, and state management.

### Local Tests - Re-entrancy Protection

Specialized integration tests that verify the re-entrancy protection mechanisms implemented in the backend. These tests ensure that concurrent calls to critical API endpoints are properly handled through request locking, preventing race conditions and re-entrancy attacks.

## Setup and Run

### PicJS Tests

Install dependencies in root:

```bash
# install jest and other package
npm i

# build backend wasm
make setup-test
```

Then run:

```bash
npx jest -- src/test/picjs-tests
```

### Local Tests

#### Prerequisites

Start dfx local with delay 2000ms - this is crucial for testing re-entrancy and running timeout should increase:

```bash
dfx start --clean --artificial-delay 2000
```

Deploy canisters:

```bash
bash src/test/scripts/setup.sh
```

#### Running Local Tests

```bash
# Run all local tests
npm test src/test/local-tests

# Run specific test files
npm test src/test/local-tests/src/request_lock/create_action.spec.ts
npm test src/test/local-tests/src/request_lock/process_action.spec.ts
```

## Local Tests - Detailed Documentation

### Test Files

#### `create_action.spec.ts`

**Purpose**: Tests re-entrancy protection for the `create_action` endpoint

**What it tests**:

-   ✅ **create_action** - Verifies that multiple concurrent calls to create an action for the same link are properly locked
-   Only one action creation succeeds, others fail with "Request lock already exists" error
-   Prevents duplicate actions from being created simultaneously

**Test scenario**:

1. Creates a link for testing
2. Makes 4 concurrent calls to `create_action` for the same link
3. Expects exactly 1 success and 3 failures due to request locking
4. Validates error messages contain request lock information

#### `process_action.spec.ts`

**Purpose**: Tests re-entrancy protection for multiple action-related endpoints

**What it tests**:

-   ✅ **process_action** - Tests basic action processing (single call)
-   ✅ **process_action** (concurrent) - Tests concurrent process_action calls with request locking
-   ✅ **trigger_transaction** - Verifies concurrent trigger calls are properly locked
-   ✅ **update_action** - Verifies concurrent update calls are properly locked

**Test scenarios**:

##### Complete ICRC-112 Flow Test

1. **Action Processing**: Calls `process_action` to get ICRC-112 requests
2. **ICRC Operations**: Executes parallel ICRC1 transfer and ICRC2 approve operations
3. **Trigger Transaction**:
    - Extracts transaction ID from ICRC-112 requests (nonce field of trigger_transaction method)
    - Makes 3 concurrent calls to `trigger_transaction`
    - Expects 1 success, 2 failures due to request locking
4. **Update Action**:
    - Makes 3 concurrent calls to `update_action`
    - Expects 1 success, 2 failures due to request locking
    - Validates final action state is "Action_state_success"
5. **Link Activation**: Calls `update_link` with "Continue" action to activate the link

##### Concurrent Process Action Test (Claim Actions)

1. **Setup**: Creates a second identity (claimer) with separate actor and user account
2. **Link Activation**: Ensures the test link is in "Active" state for claim eligibility
3. **Claim Action Creation**: Claimer creates a "Use" action on the activated link
4. **Concurrent Processing**:
    - Makes 3 concurrent calls to `process_action` for the same claim action
    - Expects exactly 1 success and 2 failures due to request locking
    - Validates successful action reaches "Action_state_success" state
5. **Error Validation**: Verifies failed calls contain request lock error information

### Request Locking Mechanism

The backend implements request locking using unique keys for different operations:

-   **create_action**: Lock key based on `link_id + caller_principal`
-   **process_action**: Lock key based on `caller + link_id + action_id`
-   **trigger_transaction**: Lock key based on `transaction_id + action_id + link_id`
-   **update_action**: Lock key based on `caller + link_id + action_id`

### Test Infrastructure

#### Identity Management

-   Uses fixed Ed25519 seeds for reproducible testing
-   Each test file uses a different seed to avoid conflicts
-   Multiple identities per test file (e.g., creator + claimer identities)
-   Automatic ICP token airdrop for test funding (5000 ICP per identity)

#### Token Operations

-   `TokenUtilServiceFixture` provides ICRC1/ICRC2 operations
-   Supports transfers to link addresses (backend canister + link subaccount)
-   Supports approving backend canister as spender

#### Error Handling

-   Tests gracefully handle network failures
-   Continues testing even if ICRC operations fail
-   Provides detailed error logging for debugging

### Security Considerations

These tests help ensure:

-   **No double-spending**: Prevents multiple actions from being processed simultaneously
-   **State consistency**: Ensures action states are updated atomically
-   **Resource protection**: Prevents concurrent access to shared resources
-   **DoS protection**: Rate limits concurrent operations per user/link

### Future Enhancements

#### Planned Tests (🔄 Not yet implemented)

1. **Cross-endpoint locking**

    - Test interactions between different endpoints (e.g., process_action + update_action)
    - Verify proper lock coordination

2. **Timeout testing**

    - Test request lock timeout behavior
    - Verify locks are properly released after timeout

3. **Error recovery**
    - Test lock cleanup after failures
    - Verify system recovers from partial operations

## Dependencies

-   Jest testing framework
-   @dfinity/agent for IC interactions
-   @dfinity/identity for key management
-   @dfinity/ledger-icrc for token operations
-   Local dfx replica for testing
