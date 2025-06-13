// Generated versioned enum for User

use crate::User;
use cashier_macros::storable;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedUser {
    V1(User),
}

impl VersionedUser {
    /// Migrate from existing User to VersionedUser
    pub fn migrate(user: User) -> Self {
        VersionedUser::V1(user)
    }
}
