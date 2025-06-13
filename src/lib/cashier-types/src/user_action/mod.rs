use cashier_macros::storable;

use v1::UserAction;

pub mod v1;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedUserAction {
    V1(UserAction),
}

impl VersionedUserAction {
    /// Build a versioned user action from version number and data
    pub fn build(version: u32, record: UserAction) -> Result<Self, String> {
        match version {
            1 => Ok(VersionedUserAction::V1(record)),
            _ => Err(format!("Unsupported version: {}", version)),
        }
    }

    /// Get the version number of this versioned user action
    pub fn get_version(&self) -> u32 {
        match self {
            VersionedUserAction::V1(_) => 1,
        }
    }

    /// Get the ID from the versioned user action
    pub fn get_id(&self) -> String {
        match self {
            VersionedUserAction::V1(record) => format!("{}#{}", record.user_id, record.action_id),
        }
    }

    /// Convert to the latest UserAction format
    pub fn into_user_action(self) -> UserAction {
        match self {
            VersionedUserAction::V1(record) => record,
        }
    }

    /// Migrate from existing UserAction to VersionedUserAction (legacy support)
    pub fn migrate(record: UserAction) -> Self {
        VersionedUserAction::V1(record)
    }
}
