// Generated versioned enum for User

use crate::User;
use cashier_macros::storable;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedUser {
    V1(User),
}

impl VersionedUser {
    /// Build a versioned user from version number and data
    pub fn build(version: u32, user: User) -> Result<Self, String> {
        match version {
            1 => Ok(VersionedUser::V1(user)),
            _ => Err(format!("Unsupported version: {}", version)),
        }
    }

    /// Get the version number of this versioned user
    pub fn get_version(&self) -> u32 {
        match self {
            VersionedUser::V1(_) => 1,
        }
    }

    /// Get the ID from the versioned user
    pub fn get_id(&self) -> String {
        match self {
            VersionedUser::V1(user) => user.id.clone(),
        }
    }

    /// Convert to the latest User format
    pub fn into_user(self) -> User {
        match self {
            VersionedUser::V1(user) => user,
        }
    }

    /// Migrate from existing User to VersionedUser (legacy support)
    pub fn migrate(user: User) -> Self {
        VersionedUser::V1(user)
    }
}
