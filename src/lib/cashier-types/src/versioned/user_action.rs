// Generated versioned enum for UserAction

use crate::UserAction;
use cashier_macros::storable;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedUserAction {
    V1(UserAction),
}

impl VersionedUserAction {
    /// Migrate from existing UserAction to VersionedUserAction
    pub fn migrate(record: UserAction) -> Self {
        VersionedUserAction::V1(record)
    }
}
