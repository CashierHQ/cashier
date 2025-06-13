use cashier_macros::storable;
use v1::UserLink;

pub mod v1;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedUserLink {
    V1(UserLink),
}

impl VersionedUserLink {
    /// Build a versioned user link from version number and data
    pub fn build(version: u32, record: UserLink) -> Result<Self, String> {
        match version {
            1 => Ok(VersionedUserLink::V1(record)),
            _ => Err(format!("Unsupported version: {}", version)),
        }
    }

    /// Get the version number of this versioned user link
    pub fn get_version(&self) -> u32 {
        match self {
            VersionedUserLink::V1(_) => 1,
        }
    }

    /// Get the ID from the versioned user link
    pub fn get_id(&self) -> String {
        match self {
            VersionedUserLink::V1(record) => format!("{}#{}", record.user_id, record.link_id),
        }
    }

    /// Convert to the latest UserLink format
    pub fn into_user_link(self) -> UserLink {
        match self {
            VersionedUserLink::V1(record) => record,
        }
    }

    /// Migrate from existing UserLink to VersionedUserLink (legacy support)
    pub fn migrate(record: UserLink) -> Self {
        VersionedUserLink::V1(record)
    }
}
