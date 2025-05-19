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

use crate::types::{Chain, RegisterTokenInput, RegistryToken, TokenId};

use super::{token_registry_metadata::TokenRegistryMetadataRepository, TOKEN_REGISTRY_STORE};

pub struct TokenRegistryRepository {}

impl TokenRegistryRepository {
    pub fn new() -> Self {
        Self {}
    }

    // this function will update the token registry version if a new token is added
    pub fn register_token(&self, input: RegisterTokenInput) -> Result<TokenId, String> {
        let chain = Chain::from_str(&input.chain)?;

        if chain == Chain::IC && input.ledger_id.is_none() {
            return Err("Ledger ID is required for IC chain".to_string());
        }

        let token = RegistryToken {
            id: input.id.clone(),
            icrc_ledger_id: input.ledger_id,
            icrc_index_id: input.index_id,
            symbol: input.symbol,
            name: input.name,
            decimals: input.decimals,
            chain,
            enabled_by_default: input.enabled_by_default,
        };

        let is_new_token = !TOKEN_REGISTRY_STORE.with_borrow(|store| store.contains_key(&input.id));

        TOKEN_REGISTRY_STORE.with_borrow_mut(|store| {
            store.insert(input.id.clone(), token);
        });

        // If this is a new token, increment the registry version
        if is_new_token {
            let metadata_repository = TokenRegistryMetadataRepository::new();
            metadata_repository.increase_version();
        }

        Ok(input.id.clone())
    }

    // this function will update the token registry version if a new token is added
    pub fn add_bulk_tokens(&self, tokens: Vec<RegisterTokenInput>) -> Result<Vec<TokenId>, String> {
        let mut token_ids = Vec::new();
        let mut any_new_tokens = false;

        // First pass: check if any tokens are new
        for input in &tokens {
            let is_new = !TOKEN_REGISTRY_STORE.with_borrow(|store| store.contains_key(&input.id));
            if is_new {
                any_new_tokens = true;
                break;
            }
        }

        // Second pass: register all tokens
        for input in tokens {
            let token_id = self.register_token(input)?;
            token_ids.push(token_id);
        }

        // If any tokens were new, increment the version
        // (this is a safeguard in case register_token didn't increment)
        if any_new_tokens {
            let metadata_repository = TokenRegistryMetadataRepository::new();
            metadata_repository.increase_version();
        }

        Ok(token_ids)
    }

    pub fn get_token(&self, token_id: &TokenId) -> Option<RegistryToken> {
        TOKEN_REGISTRY_STORE.with_borrow(|store| store.get(token_id))
    }

    pub fn list_tokens(&self) -> Vec<RegistryToken> {
        TOKEN_REGISTRY_STORE.with_borrow(|store| store.iter().map(|(_, token)| token).collect())
    }

    pub fn delete_all(&self) -> Result<(), String> {
        TOKEN_REGISTRY_STORE.with_borrow_mut(|store| {
            store.clear_new();
            Ok(())
        })
    }

    pub fn update_token(
        &self,
        token_id: &TokenId,
        update_fn: impl FnOnce(&mut RegistryToken),
    ) -> Result<(), String> {
        TOKEN_REGISTRY_STORE.with_borrow_mut(|store| {
            if let Some(mut token) = store.get(token_id) {
                update_fn(&mut token);
                store.insert(token_id.clone(), token);
                Ok(())
            } else {
                Err(format!("Token with ID {} not found", token_id))
            }
        })
    }

    pub fn remove_token(&self, token_id: &TokenId) -> Result<(), String> {
        TOKEN_REGISTRY_STORE.with_borrow_mut(|store| {
            if store.remove(token_id).is_some() {
                Ok(())
            } else {
                Err(format!("Token with ID {} not found", token_id))
            }
        })
    }
}
