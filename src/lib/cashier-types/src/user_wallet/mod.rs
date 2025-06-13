use cashier_macros::storable;
use v1::UserWallet;
pub mod v1;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedUserWallet {
    V1(UserWallet),
}

impl VersionedUserWallet {
    /// Build a versioned user wallet from version number and data
    pub fn build(version: u32, record: UserWallet) -> Result<Self, String> {
        match version {
            1 => Ok(VersionedUserWallet::V1(record)),
            _ => Err(format!("Unsupported version: {}", version)),
        }
    }

    /// Get the version number of this versioned user wallet
    pub fn get_version(&self) -> u32 {
        match self {
            VersionedUserWallet::V1(_) => 1,
        }
    }

    /// Get the ID from the versioned user wallet
    pub fn get_id(&self) -> String {
        match self {
            VersionedUserWallet::V1(record) => record.user_id.clone(),
        }
    }

    /// Convert to the latest UserWallet format
    pub fn into_user_wallet(self) -> UserWallet {
        match self {
            VersionedUserWallet::V1(record) => record,
        }
    }

    /// Migrate from existing UserWallet to VersionedUserWallet (legacy support)
    pub fn migrate(record: UserWallet) -> Self {
        VersionedUserWallet::V1(record)
    }
}
