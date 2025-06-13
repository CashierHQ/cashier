// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_macros::storable;

use crate::link_action::v1::LinkAction;

pub mod v1;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedLinkAction {
    V1(LinkAction),
}

impl VersionedLinkAction {
    /// Build a versioned link action from version number and data
    pub fn build(version: u32, record: LinkAction) -> Result<Self, String> {
        match version {
            1 => Ok(VersionedLinkAction::V1(record)),
            _ => Err(format!("Unsupported version: {}", version)),
        }
    }

    /// Get the version number of this versioned link action
    pub fn get_version(&self) -> u32 {
        match self {
            VersionedLinkAction::V1(_) => 1,
        }
    }

    /// Get the ID from the versioned link action
    pub fn get_id(&self) -> String {
        match self {
            VersionedLinkAction::V1(record) => {
                format!("{}#{}#{}", record.link_id, record.action_id, record.user_id)
            }
        }
    }

    /// Convert to the latest LinkAction format
    pub fn into_link_action(self) -> LinkAction {
        match self {
            VersionedLinkAction::V1(record) => record,
        }
    }

    /// Migrate from existing LinkAction to VersionedLinkAction (legacy support)
    pub fn migrate(record: LinkAction) -> Self {
        VersionedLinkAction::V1(record)
    }
}
