use crate::repositories::{VERSIONED_TRANSACTION_STORE, VERSIONED_TRANSACTION_V2_STORE};
use cashier_types::transaction::VersionedTransaction;

/// Migrates all transactions from VERSIONED_TRANSACTION_STORE to VERSIONED_TRANSACTION_MEMORY_ID_V2_STORE
/// Returns the total number of records migrated
pub fn migrate_transactions_v1_to_v2() -> u64 {
    let mut total_migrated = 0u64;

    VERSIONED_TRANSACTION_STORE.with_borrow(|old_store| {
        VERSIONED_TRANSACTION_V2_STORE.with_borrow_mut(|new_store| {
            // Iterate through all entries in the old store
            for (key, old_versioned_transaction) in old_store.iter() {
                // Convert the old versioned transaction to v2 format
                let new_versioned_transaction = old_versioned_transaction.to_v2();

                // Insert into the new store
                new_store.insert(
                    key.clone(),
                    VersionedTransaction::V2(new_versioned_transaction),
                );

                total_migrated += 1;
            }
        });
    });

    total_migrated
}

/// Gets the total number of records in VERSIONED_TRANSACTION_STORE
pub fn get_transaction_v1_total_records() -> u64 {
    VERSIONED_TRANSACTION_STORE.with_borrow(|store| store.len())
}

/// Gets the total number of records in VERSIONED_TRANSACTION_MEMORY_ID_V2_STORE
pub fn get_transaction_v2_total_records() -> u64 {
    VERSIONED_TRANSACTION_V2_STORE.with_borrow(|store| store.len())
}
