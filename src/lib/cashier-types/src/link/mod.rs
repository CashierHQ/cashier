// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

// Generated versioned enum for Link and LinkAction

use cashier_macros::storable;

pub mod v1;

// Re-export the current version types for convenience
pub use v1::*;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedLink {
    V1(Link),
}

impl VersionedLink {
    /// Build a versioned link from version number and data
    pub fn build(version: u32, link: Link) -> Result<Self, String> {
        match version {
            1 => Ok(VersionedLink::V1(link)),
            _ => Err(format!("Unsupported version: {}", version)),
        }
    }

    /// Get the version number of this versioned link
    pub fn get_version(&self) -> u32 {
        match self {
            VersionedLink::V1(_) => 1,
        }
    }

    /// Get the ID from the versioned link
    pub fn get_id(&self) -> String {
        match self {
            VersionedLink::V1(link) => link.id.clone(),
        }
    }

    /// Convert to the latest Link format
    pub fn into_link(self) -> Link {
        match self {
            VersionedLink::V1(link) => link,
        }
    }

    /// Migrate from existing Link to VersionedLink (legacy support)
    pub fn migrate(link: Link) -> Self {
        VersionedLink::V1(link)
    }
}
