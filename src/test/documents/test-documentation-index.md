# Test Case Documentation Index

This document serves as the main index for all test case documentation in the Cashier blockchain transaction builder application.

## Overview

The Cashier application supports four main link types, each with distinct functionality and test coverage. Each link type has its own dedicated test documentation file with comprehensive scenario coverage.

## Link Types and Documentation

### 1. Receive Payment Links

**File**: [receive-payment-tests.md](./receive-payment-tests.md)  
**Description**: Links that request payment from users  
**Key Features**:

-   Creator requests specific payment amount
-   User transfers tokens to fulfill payment
-   Link vault starts empty, receives payment
-   Single or multiple payment support

**Test Scenarios**: 5 core scenarios + error cases  
**Focus Areas**: Payment processing, fee handling, treasury management

---

### 2. Send Tip Links

**File**: [send-tip-tests.md](./send-tip-tests.md)  
**Description**: Pre-funded links for single-use token tips  
**Key Features**:

-   Creator pre-funds link with tip amount
-   Single user can claim the entire tip
-   Automated canister-to-wallet transfer
-   No fees for claimer

**Test Scenarios**: 5 core scenarios + advanced cases  
**Focus Areas**: Pre-funding, claim processing, single-use validation

---

### 3. Send Airdrop Links

**File**: [send-airdrop-tests.md](./send-airdrop-tests.md)  
**Description**: Multi-claim links for token distribution  
**Key Features**:

-   Creator funds for multiple claims
-   Multiple users can claim from same link
-   Fair distribution (first-come, first-served)
-   Scalable for community distributions

**Test Scenarios**: 5 core scenarios + multi-user scenarios  
**Focus Areas**: Multi-user claims, concurrency, exhaustion handling

---

### 4. Send Token Basket Links

**File**: [send-token-basket-tests.md](./send-token-basket-tests.md)  
**Description**: Multi-token bundles in single claimable package  
**Key Features**:

-   Multiple different tokens in one basket
-   Complex multi-token transfers
-   Atomic all-or-nothing claims
-   Suitable for reward packages

**Test Scenarios**: 5 core scenarios + multi-token complexity  
**Focus Areas**: Multi-token handling, atomic operations, complex state management

---

## Common Test Patterns

All test files follow consistent patterns and include:

### Standard Scenario Structure

-   **Scenario ID**: Unique identifier (e.g., RP-001, ST-001)
-   **Name**: Descriptive scenario title
-   **Description**: Brief explanation of test purpose
-   **Given/When/Then**: BDD-style test specification

### Test Categories

-   **Core Scenarios**: Basic functionality (5 scenarios per link type)
-   **Error Scenarios**: Failure cases and edge conditions
-   **Advanced Scenarios**: Complex use cases and future features
-   **Performance Scenarios**: Load and scalability testing

### Coverage Areas

-   **Link Creation**: Setup and configuration
-   **User Interaction**: Actions and state management
-   **Transaction Processing**: Blockchain operations
-   **Error Handling**: Failure modes and recovery
-   **Security**: Authorization and protection mechanisms

---

## Test Environment

### Standard Setup

-   **Framework**: Jest with TypeScript
-   **Users**: Alice (creator), Bob (user/claimer), additional users for multi-user tests
-   **Initial State**: 100 ICP airdropped to each test user (1000 ICP for basket tests)
-   **Blockchain**: Internet Computer (IC)
-   **Standards**: ICRC-1/ICRC-2 token standards

### Configuration

```typescript
// Common test configuration
const testConfig: LinkConfig = {
    title: string,
    description: string,
    template: "Central",
    link_image_url: "https://www.google.com",
    link_type: "ReceivePayment" | "SendTip" | "SendAirdrop" | "SendTokenBasket",
    link_use_action_max_count: BigInt,
};

// Asset configuration
const assetInfo: AssetInfo = {
    chain: "IC",
    address: string, // Canister ID
    label: string,
    amount_per_link_use: BigInt,
};
```

---

## Key Testing Concepts

### State Management

-   **Link States**: active, exhausted, inactive
-   **Action States**: created, processing, success, failed
-   **User States**: choose_wallet, processing, completed_link

### Transaction Flow

1. **Setup**: User authentication and balance verification
2. **Action Creation**: Intent and transaction generation
3. **Processing**: Blockchain transaction execution
4. **Completion**: State updates and user notification

### Fee Structure

-   **CREATE_LINK_FEE**: Standard fee for link creation
-   **Ledger Fees**: ICRC-1 transfer fees (10,000 units)
-   **Approval Fees**: ICRC-2 approve operation fees

---

## Integration Testing

### External Dependencies

-   **ICRC-1 Ledgers**: Token transfer operations
-   **ICRC-2 Approve**: Fee approval mechanisms
-   **Treasury System**: Fee collection and management
-   **User Authentication**: Identity and authorization
-   **Link Vault System**: Secure token storage

### Cross-Link Testing

-   **Concurrent Operations**: Multiple link types operating simultaneously
-   **Resource Sharing**: Treasury and vault system usage
-   **User Journey**: Users interacting with multiple link types
-   **System Limits**: Performance under combined load

---

## Quality Assurance

### Test Coverage Goals

-   **Functional Coverage**: All core features and user flows
-   **Error Coverage**: Comprehensive failure scenario testing
-   **Security Coverage**: Authorization and protection validation
-   **Performance Coverage**: Load and scalability verification

### Continuous Testing

-   **Unit Tests**: Individual component validation
-   **Integration Tests**: End-to-end flow verification
-   **Performance Tests**: Load and stress testing
-   **Security Tests**: Vulnerability and penetration testing

---

## Future Enhancements

### Planned Test Expansions

-   **Cross-Chain Testing**: Multi-blockchain link operations
-   **Advanced Conditions**: Time locks, eligibility requirements
-   **Batch Operations**: Bulk link creation and management
-   **Analytics Testing**: Reporting and metrics validation

### Test Infrastructure Improvements

-   **Parallel Execution**: Faster test suite execution
-   **Real-Time Monitoring**: Live test environment monitoring
-   **Automated Regression**: Continuous integration testing
-   **Performance Benchmarking**: Automated performance validation

---

This documentation provides comprehensive test coverage for the Cashier application's core functionality, ensuring reliable and secure blockchain transaction processing across all link types.
