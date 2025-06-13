// Generated versioned enum for Link

use crate::Link;
use cashier_macros::storable;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedLink {
    V1(Link),
}

impl VersionedLink {
    /// Migrate from existing Link to VersionedLink
    pub fn migrate(link: Link) -> Self {
        VersionedLink::V1(link)
    }
}
