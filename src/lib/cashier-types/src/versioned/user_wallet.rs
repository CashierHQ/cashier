// Generated versioned enum for UserWallet

use crate::UserWallet;
use cashier_macros::storable;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedUserWallet {
    V1(UserWallet),
}

impl VersionedUserWallet {
    /// Migrate from existing UserWallet to VersionedUserWallet
    pub fn migrate(record: UserWallet) -> Self {
        VersionedUserWallet::V1(record)
    }
}
