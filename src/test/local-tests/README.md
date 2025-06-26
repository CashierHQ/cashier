# Local Tests - Re-entrancy Protection

This directory contains local integration tests that verify the re-entrancy protection mechanisms implemented in the Cashier Protocol backend. These tests ensure that concurrent calls to critical API endpoints are properly handled through request locking.

## Overview

The Cashier Protocol implements request locking to prevent race conditions and re-entrancy attacks on critical operations. These tests verify that the locking mechanisms work correctly by making concurrent calls to various endpoints and ensuring only one succeeds while others are properly rejected.

## Test Files

### `create_action.spec.ts`

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

### `process_action.spec.ts`

**Purpose**: Tests re-entrancy protection for multiple action-related endpoints

**What it tests**:

-   ✅ **process_action** - Tests basic action processing (single call)
-   ✅ **trigger_transaction** - Verifies concurrent trigger calls are properly locked
-   ✅ **update_action** - Verifies concurrent update calls are properly locked
-   🔄 **process_action** (concurrent) - _Not yet implemented_ - Will test concurrent process_action calls

**Test scenarios**:

#### Complete ICRC-112 Flow Test

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

## Request Locking Mechanism

The backend implements request locking using unique keys for different operations:

-   **create_action**: Lock key based on `link_id + caller_principal`
-   **process_action**: Lock key based on `caller + link_id + action_id`
-   **trigger_transaction**: Lock key based on `transaction_id + action_id + link_id`
-   **update_action**: Lock key based on `caller + link_id + action_id`

## Test Infrastructure

### Identity Management

-   Uses fixed Ed25519 seeds for reproducible testing
-   Each test file uses a different seed to avoid conflicts
-   Automatic ICP token airdrop for test funding

### Token Operations

-   `TokenUtilServiceFixture` provides ICRC1/ICRC2 operations
-   Supports transfers to link addresses (backend canister + link subaccount)
-   Supports approving backend canister as spender

### Error Handling

-   Tests gracefully handle network failures
-   Continues testing even if ICRC operations fail
-   Provides detailed error logging for debugging

## Setup

Start dfx local with delay 2000 ms - this is crucial for testing re-entrancy and running timeout should increase:

```bash
dfx start --clean --artificial-delay 2000
```

Deploy canisters:

```bash
bash src/test/scripts/setup.sh
```

## Running Tests

```bash
# Run all local tests
npm test src/test/local-tests

# Run specific test files
npm test src/test/local-tests/src/request_lock/create_action.spec.ts
npm test src/test/local-tests/src/request_lock/process_action.spec.ts
```

## Future Enhancements

### Planned Tests (🔄 Not yet implemented)

1. **Concurrent process_action calls**

    - Test multiple simultaneous calls to `process_action` for the same action
    - Verify only one processing succeeds

2. **Cross-endpoint locking**

    - Test interactions between different endpoints (e.g., process_action + update_action)
    - Verify proper lock coordination

3. **Timeout testing**

    - Test request lock timeout behavior
    - Verify locks are properly released after timeout

4. **Error recovery**
    - Test lock cleanup after failures
    - Verify system recovers from partial operations

## Security Considerations

These tests help ensure:

-   **No double-spending**: Prevents multiple actions from being processed simultaneously
-   **State consistency**: Ensures action states are updated atomically
-   **Resource protection**: Prevents concurrent access to shared resources
-   **DoS protection**: Rate limits concurrent operations per user/link

## Dependencies

-   Jest testing framework
-   @dfinity/agent for IC interactions
-   @dfinity/identity for key management
-   @dfinity/ledger-icrc for token operations
-   Local dfx replica for testing
