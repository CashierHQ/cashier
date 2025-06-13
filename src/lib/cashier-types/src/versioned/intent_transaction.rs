// Generated versioned enum for IntentTransaction

use crate::IntentTransaction;
use cashier_macros::storable;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedIntentTransaction {
    V1(IntentTransaction),
}

impl VersionedIntentTransaction {
    /// Migrate from existing IntentTransaction to VersionedIntentTransaction
    pub fn migrate(record: IntentTransaction) -> Self {
        VersionedIntentTransaction::V1(record)
    }
}
