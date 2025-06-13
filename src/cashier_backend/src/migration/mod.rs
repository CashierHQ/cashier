pub mod intent_v1_to_v2;
pub mod transaction_v1_to_v2;

use candid::CandidType;
pub use intent_v1_to_v2::*;
pub use transaction_v1_to_v2::*;

/// Migration result containing counts for both intents and transactions
#[derive(Debug, Clone, CandidType)]
pub struct MigrationResult {
    pub intents_migrated: u64,
    pub transactions_migrated: u64,
    pub intent_v1_total: u64,
    pub intent_v2_total: u64,
    pub transaction_v1_total: u64,
    pub transaction_v2_total: u64,
}

/// Runs both intent and transaction migrations and returns the results
pub fn migrate_all_v1_to_v2() -> MigrationResult {
    let intent_v1_total = get_intent_v1_total_records();
    let transaction_v1_total = get_transaction_v1_total_records();

    let intents_migrated = migrate_intents_v1_to_v2();
    let transactions_migrated = migrate_transactions_v1_to_v2();

    let intent_v2_total = get_intent_v2_total_records();
    let transaction_v2_total = get_transaction_v2_total_records();

    MigrationResult {
        intents_migrated,
        transactions_migrated,
        intent_v1_total,
        intent_v2_total,
        transaction_v1_total,
        transaction_v2_total,
    }
}
