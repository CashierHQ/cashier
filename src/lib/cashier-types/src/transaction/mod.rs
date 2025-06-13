// Generated versioned enum for Transaction

use cashier_macros::storable;
use v1::Transaction;

pub mod v1;

// Re-export the current version types for convenience
pub use v1::*;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedTransaction {
    V1(Transaction),
}

impl VersionedTransaction {
    /// Build a versioned transaction from version number and data
    pub fn build(version: u32, tx: Transaction) -> Result<Self, String> {
        match version {
            1 => Ok(VersionedTransaction::V1(tx)),
            _ => Err(format!("Unsupported version: {}", version)),
        }
    }

    /// Get the version number of this versioned transaction
    pub fn get_version(&self) -> u32 {
        match self {
            VersionedTransaction::V1(_) => 1,
        }
    }

    /// Get the ID from the versioned transaction
    pub fn get_id(&self) -> String {
        match self {
            VersionedTransaction::V1(tx) => tx.id.clone(),
        }
    }

    /// Convert to the latest Transaction format
    pub fn into_transaction(self) -> Transaction {
        match self {
            VersionedTransaction::V1(tx) => tx,
        }
    }

    /// Migrate from existing Transaction to VersionedTransaction (legacy support)
    pub fn migrate(tx: Transaction) -> Self {
        VersionedTransaction::V1(tx)
    }
}
