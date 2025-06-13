// Generated versioned enum for UserLink

use crate::UserLink;
use cashier_macros::storable;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedUserLink {
    V1(UserLink),
}

impl VersionedUserLink {
    /// Migrate from existing UserLink to VersionedUserLink
    pub fn migrate(record: UserLink) -> Self {
        VersionedUserLink::V1(record)
    }
}
