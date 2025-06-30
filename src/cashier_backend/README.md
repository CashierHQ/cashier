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
