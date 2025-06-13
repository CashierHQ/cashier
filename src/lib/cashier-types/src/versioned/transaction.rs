// Generated versioned enum for Transaction

use crate::Transaction;
use cashier_macros::storable;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedTransaction {
    V1(Transaction),
}

impl VersionedTransaction {
    /// Migrate from existing Transaction to VersionedTransaction
    pub fn migrate(tx: Transaction) -> Self {
        VersionedTransaction::V1(tx)
    }
}
