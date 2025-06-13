// Generated versioned enum for Intent

use crate::Intent;
use cashier_macros::storable;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedIntent {
    V1(Intent),
}

impl VersionedIntent {
    /// Build a versioned intent from version number and data
    pub fn build(version: u32, intent: Intent) -> Result<Self, String> {
        match version {
            1 => Ok(VersionedIntent::V1(intent)),
            _ => Err(format!("Unsupported version: {}", version)),
        }
    }

    /// Get the version number of this versioned intent
    pub fn get_version(&self) -> u32 {
        match self {
            VersionedIntent::V1(_) => 1,
        }
    }

    /// Get the ID from the versioned intent
    pub fn get_id(&self) -> String {
        match self {
            VersionedIntent::V1(intent) => intent.id.clone(),
        }
    }

    /// Convert to the latest Intent format
    pub fn into_intent(self) -> Intent {
        match self {
            VersionedIntent::V1(intent) => intent,
        }
    }

    /// Migrate from existing Intent to VersionedIntent (legacy support)
    pub fn migrate(intent: Intent) -> Self {
        VersionedIntent::V1(intent)
    }
}
