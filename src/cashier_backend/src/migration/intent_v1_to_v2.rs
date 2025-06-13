use crate::repositories::{VERSIONED_INTENT_STORE, VERSIONED_INTENT_V2_STORE};
use cashier_types::intent::VersionedIntent;

/// Migrates all intents from VERSIONED_INTENT_STORE to VERSIONED_INTENT_MEMORY_ID_V2_STORE
/// Returns the total number of records migrated
pub fn migrate_intents_v1_to_v2() -> u64 {
    let mut total_migrated = 0u64;

    VERSIONED_INTENT_STORE.with_borrow(|old_store| {
        VERSIONED_INTENT_V2_STORE.with_borrow_mut(|new_store| {
            // Iterate through all entries in the old store
            for (key, old_versioned_intent) in old_store.iter() {
                // Convert the old versioned intent to v2 format
                let new_versioned_intent = old_versioned_intent.to_v2();

                // Insert into the new store
                new_store.insert(key.clone(), VersionedIntent::V2(new_versioned_intent));

                total_migrated += 1;
            }
        });
    });

    total_migrated
}

/// Gets the total number of records in VERSIONED_INTENT_STORE
pub fn get_intent_v1_total_records() -> u64 {
    VERSIONED_INTENT_STORE.with_borrow(|store| store.len())
}

/// Gets the total number of records in VERSIONED_INTENT_MEMORY_ID_V2_STORE
pub fn get_intent_v2_total_records() -> u64 {
    VERSIONED_INTENT_V2_STORE.with_borrow(|store| store.len())
}
