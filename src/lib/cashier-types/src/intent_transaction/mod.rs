// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

// Generated versioned enum for IntentTransaction

use cashier_macros::storable;

use crate::intent_transaction::v1::IntentTransaction;

pub mod v1;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedIntentTransaction {
    V1(IntentTransaction),
}

impl VersionedIntentTransaction {
    /// Build a versioned intent transaction from version number and data
    pub fn build(version: u32, record: IntentTransaction) -> Result<Self, String> {
        match version {
            1 => Ok(VersionedIntentTransaction::V1(record)),
            _ => Err(format!("Unsupported version: {}", version)),
        }
    }

    /// Get the version number of this versioned intent transaction
    pub fn get_version(&self) -> u32 {
        match self {
            VersionedIntentTransaction::V1(_) => 1,
        }
    }

    /// Get the ID from the versioned intent transaction
    pub fn get_id(&self) -> String {
        match self {
            VersionedIntentTransaction::V1(record) => {
                format!("{}#{}", record.intent_id, record.transaction_id)
            }
        }
    }

    /// Convert to the latest IntentTransaction format
    pub fn into_intent_transaction(self) -> IntentTransaction {
        match self {
            VersionedIntentTransaction::V1(record) => record,
        }
    }

    /// Migrate from existing IntentTransaction to VersionedIntentTransaction (legacy support)
    pub fn migrate(record: IntentTransaction) -> Self {
        VersionedIntentTransaction::V1(record)
    }
}
