# Cashier Test Scenarios Overview

This document provides a comprehensive overview of all test scenarios implemented in the Cashier blockchain transaction builder application, including detailed fee analysis and completion status.

## Test Environment Configuration

-   **Test Framework**: Jest with TypeS## Test Coverage Status

-   **Core Functionality**: ✅ **100%** (All 4 link types)
-   **Basic Scenarios**: ✅ **100%** (20/20 scenarios)
-   **Advanced Scenarios**: ❌ **0%** (0/6 scenarios)
-   **Error Handling**: ❌ **0%** (0/? scenarios)
-   **Performance/Concurrency**: ❌ **0%** (0/? scenarios)

**Overall Test Completeness**: 77% (Core functionality complete, advanced scenarios pending)

---

## Test Execution Status (Verified December 17, 2024)

All core test suites are **PASSING** ✅:

1. **Receive Payment Tests**: ✅ 5/5 tests passing
2. **Send Tip Tests**: ✅ 5/5 tests passing
3. **Send Airdrop Tests**: ✅ 5/5 tests passing
4. **Send Token Basket Tests**: ✅ 5/5 tests passing

**Total: 20/20 core scenarios passing**

### Key Fixes Applied:

-   ✅ Fixed `send_airdrop.spec.ts` balance calculation (added missing CREATE_LINK_FEE)
-   ✅ Enhanced `send_token_basket.spec.ts` with ICP balance verification
-   ✅ All fee calculations now correctly account for CREATE_LINK_FEE (80,000 e8s)
-   ✅ Treasury fee collection verified across all link types

### Next Development Priorities:

#### High Priority:

1. **Multi-User Airdrop Testing**: Implement concurrent claim scenarios
2. **Error Handling**: Add comprehensive failure case testing
3. **Link Cancellation/Withdrawal**: Creator fund recovery functionality

#### Medium Priority:

4. **Anonymous Claims**: Non-authenticated user claim flows
5. **Custom Fee Structures**: Non-ICP token fee handling
6. **State Machine Validation**: Complete link lifecycle testing

#### Low Priority:

7. **Performance Testing**: High-load scenarios
8. **Integration Testing**: Frontend-backend integration
9. **Security Testing**: Attack vector validation **Blockchain**: Internet Computer (IC)

-   **Token Standard**: ICRC-1/ICRC-2
-   **Initial Setup**: 100-1000 ICP per test user
-   **Ledger Fee**: 10,000 e8s (0.0001 ICP)
-   **Creation Fee**: 80,000 e8s (0.0008 ICP)

---

## 1. Receive Payment Links ✅

**File**: `receive_payment.spec.ts`  
**Status**: ✅ **COMPLETE**

### What's Being Tested:

-   Alice creates a payment request link (no upfront funding)
-   Bob makes payment to fulfill the request
-   Treasury fee collection
-   Balance verification for all parties

### Test Scenarios:

#### RP-001: Create Receive Payment Link ✅

-   **Actor**: Alice (creator)
-   **Action**: Creates payment request for 5 ICP
-   **Fee Structure**:
    -   Creation Fee: 80,000 e8s → Treasury
    -   Approve Fee: 10,000 e8s (ledger fee)
    -   Transfer Fee: 10,000 e8s (ledger fee)
    -   **Total Alice Cost**: 100,000 e8s (0.001 ICP)
-   **Link Vault**: Starts empty (0 ICP)
-   **Verification**: Link active, treasury balance increased

#### RP-002: Retrieve Initial State ✅

-   **Actor**: Bob (payer)
-   **Action**: Checks user state before payment
-   **Expected**: User state returns undefined

#### RP-003: Create Payment Action ✅

-   **Actor**: Bob (payer)
-   **Action**: Initiates payment action
-   **Verification**: Action created with proper metadata, user state transitions

#### RP-004: Process Payment ✅

-   **Actor**: Bob (payer)
-   **Action**: Executes 5 ICP payment
-   **Fee Structure**:
    -   Payment Amount: 5 ICP
    -   Transfer Fee: 10,000 e8s (ledger fee)
    -   **Total Bob Cost**: 500,010,000 e8s (5.0001 ICP)
-   **Link Vault**: Receives 5 ICP
-   **Verification**: Balances updated correctly

#### RP-005: Complete Payment Process ✅

-   **Actor**: Bob (payer)
-   **Action**: Finalizes payment state
-   **Expected**: User state becomes "completed_link"

---

## 2. Send Tip Links ✅

**File**: `send_tip.spec.ts`  
**Status**: ✅ **COMPLETE**

### What's Being Tested:

-   Alice pre-funds a tip link (single use)
-   Bob claims the entire tip
-   Automated canister-to-wallet transfer
-   Single-use validation

### Test Scenarios:

#### ST-001: Create Send Tip Link ✅

-   **Actor**: Alice (creator)
-   **Action**: Creates pre-funded tip for 10 ICP
-   **Fee Structure**:
    -   Tip Amount: 10 ICP + 10,000 e8s = 1,000,010,000 e8s
    -   Transfer Fee: 10,000 e8s (tip transfer)
    -   Creation Fee: 80,000 e8s → Treasury
    -   Approve Fee: 10,000 e8s (ledger fee)
    -   Transfer Fee: 10,000 e8s (fee transfer)
    -   **Total Alice Cost**: 1,000,130,000 e8s (10.0013 ICP)
-   **Link Vault**: Contains 1,000,010,000 e8s (10.0001 ICP)

#### ST-002: Retrieve Initial Claim State ✅

-   **Actor**: Bob (claimer)
-   **Action**: Checks user state before claiming
-   **Expected**: User state returns undefined

#### ST-003: Create Tip Claim Action ✅

-   **Actor**: Bob (claimer)
-   **Action**: Initiates claim action
-   **Verification**: Action created, automated transfer setup

#### ST-004: Process Tip Claim ✅

-   **Actor**: Bob (claimer)
-   **Action**: Claims 10 ICP tip (automated)
-   **Fee Structure**: No fees for Bob (canister pays)
-   **Bob Receives**: 10 ICP exactly
-   **Link Vault**: Emptied (0 ICP remaining)

#### ST-005: Complete Claim Process ✅

-   **Actor**: Bob (claimer)
-   **Action**: Finalizes claim state
-   **Expected**: User state becomes "completed_link"

---

## 3. Send Airdrop Links ✅

**File**: `send_airdrop.spec.ts`  
**Status**: ✅ **COMPLETE**

### What's Being Tested:

-   Alice creates multi-claim airdrop (5 uses)
-   Bob claims one portion of the airdrop
-   Multi-user distribution capability
-   Link usage counter management

### Test Scenarios:

#### SA-001: Create Send Airdrop Link ✅

-   **Actor**: Alice (creator)
-   **Action**: Creates airdrop for 10 ICP × 5 users
-   **Fee Structure**:
    -   Airdrop Amount: (10 ICP + 10,000 e8s) × 5 = 5,000,050,000 e8s
    -   Transfer Fee: 10,000 e8s (airdrop transfer)
    -   Creation Fee: 80,000 e8s → Treasury
    -   Approve Fee: 10,000 e8s (ledger fee)
    -   Transfer Fee: 10,000 e8s (fee transfer)
    -   **Total Alice Cost**: 5,000,160,000 e8s (50.0016 ICP)
-   **Link Vault**: Contains 5,000,050,000 e8s (50.0005 ICP)

#### SA-002: Retrieve Initial Airdrop State ✅

-   **Actor**: Bob (claimer)
-   **Action**: Checks user state before claiming
-   **Expected**: User state returns undefined

#### SA-003: Create Airdrop Claim Action ✅

-   **Actor**: Bob (claimer)
-   **Action**: Initiates claim for one airdrop portion
-   **Verification**: Intent metadata with memo, proper transaction setup

#### SA-004: Process Airdrop Claim ✅

-   **Actor**: Bob (claimer)
-   **Action**: Claims 10 ICP from airdrop
-   **Fee Structure**: No fees for Bob (canister pays)
-   **Bob Receives**: 10 ICP exactly
-   **Link Vault**: Reduced by 10.0001 ICP (4 claims remaining)
-   **Usage Counter**: Incremented to 1

#### SA-005: Complete Claim Process ✅

-   **Actor**: Bob (claimer)
-   **Action**: Finalizes claim state
-   **Expected**: User state becomes "completed_link"

---

## 4. Send Token Basket Links ✅

**File**: `send_token_basket.spec.ts`  
**Status**: ✅ **COMPLETE**

### What's Being Tested:

-   Alice creates multi-token basket (token1, token2, token3)
-   Bob claims entire basket in one transaction
-   Multi-token transfer coordination
-   Atomic all-or-nothing claiming

### Test Scenarios:

#### STB-001: Create Token Basket Link ✅

-   **Actor**: Alice (creator)
-   **Action**: Creates basket with 3 different tokens
-   **Fee Structure**:
    -   Token1: 10 ICP + 10,000 e8s = 1,000,010,000 e8s
    -   Token2: 20 ICP + 10,000 e8s = 2,000,010,000 e8s
    -   Token3: 30 ICP + 10,000 e8s = 3,000,010,000 e8s
    -   Transfer Fees: 10,000 e8s × 3 tokens = 30,000 e8s
    -   ICP Creation Fee: 80,000 e8s → Treasury
    -   ICP Approve Fee: 10,000 e8s (ledger fee)
    -   ICP Transfer Fee: 10,000 e8s (fee transfer)
    -   **Total Alice Cost**:
        -   Token1: 1,000,020,000 e8s (10.0002 ICP equivalent)
        -   Token2: 2,000,020,000 e8s (20.0002 ICP equivalent)
        -   Token3: 3,000,020,000 e8s (30.0002 ICP equivalent)
        -   ICP: 100,000 e8s (0.001 ICP)
-   **Link Vaults**: Each contains respective token amount + fees

#### STB-002: Retrieve Initial Basket State ✅

-   **Actor**: Bob (claimer)
-   **Action**: Checks user state before claiming
-   **Expected**: User state returns undefined

#### STB-003: Create Basket Claim Action ✅

-   **Actor**: Bob (claimer)
-   **Action**: Initiates claim for entire basket
-   **Verification**: 3 intents created (one per token), proper multi-transfer setup

#### STB-004: Process Basket Claim ✅

-   **Actor**: Bob (claimer)
-   **Action**: Claims all tokens atomically
-   **Fee Structure**: No fees for Bob (canister pays all)
-   **Bob Receives**:
    -   Token1: 10 ICP equivalent exactly
    -   Token2: 20 ICP equivalent exactly
    -   Token3: 30 ICP equivalent exactly
-   **Link Vaults**: All emptied (single-use basket)

#### STB-005: Complete Basket Claim Process ✅

-   **Actor**: Bob (claimer)
-   **Action**: Finalizes claim state
-   **Expected**: User state becomes "completed_link"

---

## Missing Test Scenarios

### Advanced Scenarios Not Yet Implemented:

#### Multi-User Airdrop Testing ❌

-   **Scenario**: Multiple users claiming from same airdrop
-   **Status**: ❌ **MISSING**
-   **Priority**: High
-   **Description**: Test concurrent claims, fair distribution, exhaustion handling

#### Anonymous User Claims ❌

-   **Scenario**: Users claiming without authentication
-   **Status**: ❌ **MISSING** (commented out in airdrop tests)
-   **Priority**: Medium
-   **Description**: Anonymous wallet integration for claims

#### Link Withdrawal/Cancellation ❌

-   **Scenario**: Creator withdraws remaining funds
-   **Status**: ❌ **MISSING**
-   **Priority**: Medium
-   **Description**: Creator reclaims unused funds from active links

#### Error Handling Tests ❌

-   **Scenario**: Insufficient funds, invalid claims, expired links
-   **Status**: ❌ **MISSING**
-   **Priority**: High
-   **Description**: Comprehensive error case coverage

#### Fee Edge Cases ❌

-   **Scenario**: Different token types with varying fees
-   **Status**: ❌ **MISSING**
-   **Priority**: Medium
-   **Description**: Non-ICP tokens, custom fee structures

#### Link State Transitions ❌

-   **Scenario**: Complete state machine testing
-   **Status**: ❌ **MISSING**
-   **Priority**: Medium
-   **Description**: All possible state changes and validations

---

## Fee Summary by Link Type

| Link Type           | Creator Upfront Cost          | Creator Ongoing Cost | User Cost            | Treasury Revenue |
| ------------------- | ----------------------------- | -------------------- | -------------------- | ---------------- |
| **Receive Payment** | 0.001 ICP (fees only)         | None                 | Payment + 0.0001 ICP | 0.0008 ICP       |
| **Send Tip**        | Tip + 0.0013 ICP              | None                 | None                 | 0.0008 ICP       |
| **Send Airdrop**    | (Amount × Uses) + 0.0016 ICP  | None                 | None                 | 0.0008 ICP       |
| **Token Basket**    | All tokens + fees + 0.001 ICP | None                 | None                 | 0.0008 ICP       |

---

## Test Coverage Status

-   **Core Functionality**: ✅ **100%** (All 4 link types)
-   **Basic Scenarios**: ✅ **100%** (20/20 scenarios)
-   **Advanced Scenarios**: ❌ **0%** (0/6 scenarios)
-   **Error Handling**: ❌ **0%** (0/? scenarios)
-   **Performance/Concurrency**: ❌ **0%** (0/? scenarios)

**Overall Test Completeness**: 77% (Core functionality complete, advanced scenarios pending)
