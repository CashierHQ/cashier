// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

// Generated versioned enum for Action
pub mod v1;

use cashier_macros::storable;
use v1::Action;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedAction {
    V1(Action),
}

impl VersionedAction {
    /// Build a versioned action from version number and data
    pub fn build(version: u32, action: Action) -> Result<Self, String> {
        match version {
            1 => Ok(VersionedAction::V1(action)),
            _ => Err(format!("Unsupported version: {}", version)),
        }
    }

    /// Get the version number of this versioned action
    pub fn get_version(&self) -> u32 {
        match self {
            VersionedAction::V1(_) => 1,
        }
    }

    /// Get the ID from the versioned action
    pub fn get_id(&self) -> String {
        match self {
            VersionedAction::V1(action) => action.id.clone(),
        }
    }

    /// Convert to the latest Action format
    pub fn into_action(self) -> Action {
        match self {
            VersionedAction::V1(action) => action,
        }
    }

    /// Migrate from existing Action to VersionedAction (legacy support)
    pub fn migrate(action: Action) -> Self {
        VersionedAction::V1(action)
    }
}
