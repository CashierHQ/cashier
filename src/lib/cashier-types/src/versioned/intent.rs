// Generated versioned enum for Intent

use crate::Intent;
use cashier_macros::storable;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedIntent {
    V1(Intent),
}

impl VersionedIntent {
    /// Migrate from existing Intent to VersionedIntent
    pub fn migrate(intent: Intent) -> Self {
        VersionedIntent::V1(intent)
    }
}
