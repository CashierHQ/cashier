// Generated versioned enum for Action

use crate::Action;
use cashier_macros::storable;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedAction {
    V1(Action),
}

impl VersionedAction {
    /// Migrate from existing Action to VersionedAction
    pub fn migrate(action: Action) -> Self {
        VersionedAction::V1(action)
    }
}
