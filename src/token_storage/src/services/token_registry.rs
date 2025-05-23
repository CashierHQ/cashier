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

use crate::{
    api::token::types::RegisterTokenInput,
    repository::{
        token_registry::TokenRegistryRepository,
        token_registry_metadata::TokenRegistryMetadataRepository,
    },
    types::{RegistryToken, TokenId, TokenRegistryMetadata},
};

pub struct TokenRegistryService {
    registry_repository: TokenRegistryRepository,
    metadata_repository: TokenRegistryMetadataRepository,
}

impl TokenRegistryService {
    pub fn new() -> Self {
        Self {
            registry_repository: TokenRegistryRepository::new(),
            metadata_repository: TokenRegistryMetadataRepository::new(),
        }
    }

    /// Get the current registry metadata containing the version
    pub fn get_metadata(&self) -> TokenRegistryMetadata {
        self.metadata_repository.get()
    }

    /// Increase the registry version number
    pub fn increase_version(&self) -> u64 {
        self.metadata_repository.increase_version()
    }

    /// Get a token from the registry by ID
    pub fn get_token(&self, token_id: &TokenId) -> Option<RegistryToken> {
        self.registry_repository.get_token(token_id)
    }

    /// List all tokens in the registry
    pub fn list_tokens(&self) -> Vec<RegistryToken> {
        self.registry_repository.list_tokens()
    }

    /// Register a new token in the registry
    pub fn register_token(&self, input: RegisterTokenInput) -> Result<TokenId, String> {
        self.registry_repository.register_token(input)
    }
}
