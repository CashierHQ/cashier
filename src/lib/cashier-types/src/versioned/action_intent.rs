// Generated versioned enum for ActionIntent

use crate::ActionIntent;
use cashier_macros::storable;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedActionIntent {
    V1(ActionIntent),
}

impl VersionedActionIntent {
    /// Migrate from existing ActionIntent to VersionedActionIntent
    pub fn migrate(record: ActionIntent) -> Self {
        VersionedActionIntent::V1(record)
    }
}
