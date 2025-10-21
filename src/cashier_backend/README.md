# Repository Layer

The repository layer provides a data access abstraction for the Cashier backend, implementing the Repository pattern to manage persistent storage using Internet Computer's stable structures. This layer ensures data persistence across canister upgrades and provides a clean interface for data operations.

## Architecture Overview

The repository layer is built on top of IC's `StableBTreeMap` structures stored in stable memory, ensuring data survives canister upgrades. Each repository manages a specific domain entity and provides CRUD operations with batch processing capabilities.

## Core Components

### Memory Management

The system uses a centralized memory manager that allocates virtual memory segments for different data stores:

-   **Memory IDs**: Each entity type has a dedicated memory ID (1-25)
-   **Stable Storage**: Uses `StableBTreeMap` for persistent, ordered storage
-   **Thread-local Storage**: All stores are wrapped in `RefCell` for interior mutability

### Base Repository Trait

The `Store<K, V>` trait defines common operations for all repositories:

```rust
pub trait Store<K, V> {
    fn batch_get(&self, keys: Vec<K>) -> Vec<V>;
    fn batch_create(&mut self, values: Vec<(K, V)>);
    fn is_exist(&self, key: &K) -> bool;
}
```

This trait is automatically implemented for all `StableBTreeMap` instances, providing consistent batch operations across all repositories.

## Repository Implementations

### Core Entity Repositories

1. **UserRepository** - Manages user accounts and profiles
2. **TransactionRepository** - Handles transaction records (v2)
3. **IntentRepository** - Manages user intents and requests (v2)
4. **ActionRepository** - Stores action definitions and configurations

### Relationship Repositories

1. **UserWalletRepository** - Links users to their wallet addresses
2. **UserLinkRepository** - Associates users with shareable links
3. **UserActionRepository** - Tracks user-specific action history
4. **LinkRepository** - Manages shareable payment links
5. **LinkActionRepository** - Associates actions with specific links
6. **ActionIntentRepository** - Links actions to user intents
7. **IntentTransactionRepository** - Connects intents to their transactions

### Utility Repositories

1. **RequestLockRepository** - Manages distributed locks for request processing

## Common Repository Patterns

### Standard Operations

All repositories implement these core operations:

-   `create()` - Insert new entities
-   `get()` - Retrieve by primary key
-   `update()` - Modify existing entities
-   `delete()` - Remove entities (where applicable)
-   `batch_get()` - Retrieve multiple entities
-   `batch_create()` - Insert multiple entities
-   `batch_update()` - Update multiple entities

## Data Store Configuration

### Memory Allocation

```rust
const USER_MEMORY_ID: MemoryId = MemoryId::new(1);
const TRANSACTION_MEMORY_ID: MemoryId = MemoryId::new(11);
const INTENT_MEMORY_ID: MemoryId = MemoryId::new(9);
// ... other allocations
```

### Unused Memory Handling

```rust
const _UNUSED_MEMORY_ID_12: MemoryId = MemoryId::new(12);
// ... other unused IDs (12-24)
```

## Usage Examples

### Basic Entity Operations

```rust
// Create a new user
let user_repo = UserRepository::new();
user_repo.create(user);

// Retrieve user
let user = user_repo.get(&user_id);

// Batch operations
let transactions = transaction_repo.batch_get(transaction_ids);
transaction_repo.batch_create(new_transactions);
```

### Cross-Repository Relationships

```rust
// Link user to wallet
let user_wallet = UserWallet { user_id, wallet_address };
user_wallet_repo.create(user_wallet);

// Associate intent with transaction
let intent_tx = IntentTransaction { intent_id, transaction_id };
intent_transaction_repo.create(intent_tx);
```

# Service Layer

The service layer implements the business logic and orchestrates operations across the Cashier backend. It follows the Domain-Driven Design (DDD) pattern, separating concerns into distinct services that handle specific business domains while coordinating complex workflows.

## Architecture Overview

The service layer sits between the API endpoints and the repository layer, providing:

-   **Business Logic Implementation** - Core application rules and workflows
-   **Transaction Orchestration** - Complex multi-step operations with proper error handling
-   **Cross-Domain Coordination** - Services that work together to achieve business goals
-   **External Integration** - Adapters for blockchain and external service interactions

## Core Services

### User Service

Manages user lifecycle, authentication, and wallet associations.

**Key Operations:**

-   `create_new()` - Creates new users with wallet linking
-   `get()` - Retrieves user profile with wallet information
-   `is_existed()` - Checks user existence by wallet address

**Features:**

-   Automatic wallet-to-user mapping using IC caller principal
-   UUID-based user identification
-   Email integration support

### Transaction Service

Handles transaction lifecycle, state management, and blockchain interactions.

**Key Operations:**

-   `update_tx_state()` - Manages transaction state transitions
-   `get_tx_by_id()` / `batch_get()` - Transaction retrieval
-   `convert_tx_to_icrc_112_request()` - Blockchain transaction formatting

**Features:**

-   State machine implementation for transaction lifecycle
-   Timeout tracking with automatic state updates
-   ICRC-1/ICRC-2 transaction support
-   Batch processing capabilities

### Action Service

Orchestrates complex actions that span multiple intents and transactions.

**Key Operations:**

-   `get_action_data()` - Retrieves complete action with related data
-   Action-Intent-Transaction relationship management
-   Cross-entity data aggregation

**Features:**

-   Domain logic integration via `ActionDomainLogic`
-   Hierarchical data retrieval (Actions → Intents → Transactions)
-   Repository coordination across multiple entities

### Transaction Manager Service

The central orchestrator for complex multi-chain, multi-step operations.

**Key Operations:**

-   `create_action()` - Assembles complete actions from temporary definitions
-   `assemble_txs()` - Converts intents to blockchain transactions
-   Dependency management between related transactions

**Features:**

-   Intent-to-transaction adaptation via chain-specific adapters
-   Dependency resolution and ordering
-   Cross-chain transaction coordination
-   Error handling and rollback capabilities

### Link Service

Manages shareable payment links and their associated actions.

**Features:**

-   Link creation and management
-   Action-link associations
-   Access control and sharing mechanisms

## Adapter Pattern Implementation

### Intent Adapters

Transform high-level intents into blockchain-specific transactions.

**Chain-Specific Adapters:**

-   `IcIntentAdapter` - Internet Computer specific transaction generation
-   Extensible design for additional blockchain support

**Key Features:**

-   Chain abstraction for multi-blockchain support
-   Intent-to-transaction conversion
-   Protocol-specific transaction formatting

### Action Adapters

Convert user actions into executable intents.

**Features:**

-   Action-to-intent transformation
-   Link type and action type coordination
-   Business rule application during conversion

## External Service Integration

### ICRC Services

Handles interaction with ICRC token standards on the Internet Computer.

**Components:**

-   `icrc_token.rs` - Token metadata and operations
-   `icrc_batch.rs` - Batch transaction processing

**Features:**

-   ICRC-1 transfer operations
-   ICRC-2 approve/transfer-from patterns
-   Batch transaction optimization

### Request Lock Service

Implements distributed locking for concurrent request handling.

**Features:**

-   Prevents double-spending and race conditions
-   Request deduplication
-   Timeout-based lock cleanup

## Service Composition Patterns

### Dependency Injection

Services use constructor injection for dependencies:

```rust
impl TransactionManagerService<E> {
    pub fn new(
        transaction_service: TransactionService<E>,
        action_service: ActionService,
        // ... other dependencies
    ) -> Self
}
```

### Factory Pattern

Services provide `get_instance()` methods for default configurations:

```rust
pub fn get_instance() -> Self {
    Self::new(
        TransactionService::get_instance(),
        ActionService::get_instance(),
        // ... default implementations
    )
}
```

### Environment Abstraction

Generic over environment types for testing and runtime flexibility:

```rust
pub struct TransactionService<E: IcEnvironment + Clone> {
    ic_env: E,
    // ... other fields
}
```

## Error Handling Strategy

The service layer implements comprehensive error handling:

-   **Domain-Specific Errors** - Business logic violations
-   **Not Found Errors** - Missing entity handling
-   **Validation Errors** - Input validation failures
-   **External Service Errors** - Blockchain interaction failures

