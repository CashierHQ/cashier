// Generated versioned enum for ActionIntent

use cashier_macros::storable;

use crate::action_intent::v1::ActionIntent;

pub mod v1;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedActionIntent {
    V1(ActionIntent),
}

impl VersionedActionIntent {
    /// Build a versioned action intent from version number and data
    pub fn build(version: u32, record: ActionIntent) -> Result<Self, String> {
        match version {
            1 => Ok(VersionedActionIntent::V1(record)),
            _ => Err(format!("Unsupported version: {}", version)),
        }
    }

    /// Get the version number of this versioned action intent
    pub fn get_version(&self) -> u32 {
        match self {
            VersionedActionIntent::V1(_) => 1,
        }
    }

    /// Get the ID from the versioned action intent
    pub fn get_id(&self) -> String {
        match self {
            VersionedActionIntent::V1(record) => {
                format!("{}#{}", record.action_id, record.intent_id)
            }
        }
    }

    /// Convert to the latest ActionIntent format
    pub fn into_action_intent(self) -> ActionIntent {
        match self {
            VersionedActionIntent::V1(record) => record,
        }
    }

    /// Migrate from existing ActionIntent to VersionedActionIntent (legacy support)
    pub fn migrate(record: ActionIntent) -> Self {
        VersionedActionIntent::V1(record)
    }
}
