// Generated versioned enum for LinkAction

use crate::LinkAction;
use cashier_macros::storable;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedLinkAction {
    V1(LinkAction),
}

impl VersionedLinkAction {
    /// Migrate from existing LinkAction to VersionedLinkAction
    pub fn migrate(record: LinkAction) -> Self {
        VersionedLinkAction::V1(record)
    }
}
