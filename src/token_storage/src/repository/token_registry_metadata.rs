// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use ic_cdk::api::time;

use super::TOKEN_REGISTRY_METADATA_STORE;
use crate::types::TokenRegistryMetadata;

pub struct TokenRegistryMetadataRepository {}

impl TokenRegistryMetadataRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn get(&self) -> TokenRegistryMetadata {
        TOKEN_REGISTRY_METADATA_STORE.with_borrow(|store| store.get().clone())
    }

    pub fn update(&self, update_fn: impl FnOnce(&mut TokenRegistryMetadata)) {
        TOKEN_REGISTRY_METADATA_STORE.with_borrow_mut(|store| {
            let mut metadata = store.get().clone();
            update_fn(&mut metadata);
            let _ = store.set(metadata);
        });
    }

    pub fn increase_version(&self) -> u64 {
        TOKEN_REGISTRY_METADATA_STORE.with_borrow_mut(|store| {
            let mut metadata = store.get().clone();
            metadata.current_version += 1;
            metadata.last_updated = time();
            let _ = store.set(metadata);

            let updated_metadata = store.get().clone();
            updated_metadata.current_version
        })
    }
}
