// File: src/token_storage/src/repository/token.rs
use super::{token_registry::TokenRegistryRepository, user_preference, USER_TOKEN_STORE};
use crate::repository::token_registry_metadata::TokenRegistryMetadataRepository;
use crate::types::{Candid, TokenDto, TokenId};

pub struct TokenRepository {}

impl TokenRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn add_token(&self, user_id: String, token_id: TokenId) -> Result<(), String> {
        USER_TOKEN_STORE.with_borrow_mut(|store| {
            let user_tokens = store.get(&user_id).unwrap_or_default();
            let mut tokens = user_tokens.into_inner();

            // Check if token already exists in user's list
            if !tokens.contains(&token_id) {
                tokens.push(token_id);
                store.insert(user_id, Candid(tokens));
            }

            Ok(())
        })
    }

    pub fn add_bulk_tokens(&self, user_id: String, token_ids: Vec<TokenId>) -> Result<(), String> {
        USER_TOKEN_STORE.with_borrow_mut(|store| {
            let user_tokens = store.get(&user_id).unwrap_or_default();
            let mut tokens = user_tokens.into_inner();

            // Convert to HashSet for quick lookup
            let mut tokens_set: std::collections::HashSet<_> = tokens.iter().cloned().collect();
            let mut added_any = false;

            for token_id in token_ids {
                // Check if token already exists in user's list using the HashSet
                if !tokens_set.contains(&token_id) {
                    tokens.push(token_id.clone());
                    tokens_set.insert(token_id);
                    added_any = true;
                }
            }

            // Only update storage if we've actually added tokens
            if added_any {
                store.insert(user_id, Candid(tokens));
            }

            Ok(())
        })
    }

    pub fn remove_token(&self, user_id: &String, token_id: &TokenId) -> Result<(), String> {
        USER_TOKEN_STORE.with_borrow_mut(|store| {
            if let Some(Candid(mut user_tokens)) = store.get(user_id) {
                if let Some(position) = user_tokens.iter().position(|id| id == token_id) {
                    user_tokens.swap_remove(position);
                    store.insert(user_id.to_string(), Candid(user_tokens));
                    Ok(())
                } else {
                    Err(format!("Token not found in user's list"))
                }
            } else {
                Err(format!("User has no tokens"))
            }
        })
    }

    pub fn reset_token_list(&self, user_id: &String) {
        USER_TOKEN_STORE.with_borrow_mut(|store| {
            store.insert(user_id.to_string(), Candid(vec![]));
        });
    }

    pub fn list_token_ids(&self, user_id: &String) -> Vec<TokenId> {
        USER_TOKEN_STORE
            .with_borrow(|store| store.get(user_id))
            .unwrap_or_default()
            .into_inner()
    }

    // Get detailed token information combining registry data with user preferences
    pub fn list_tokens(&self, user_id: &String) -> Vec<TokenDto> {
        let token_ids = self.list_token_ids(user_id);
        let registry = TokenRegistryRepository::new();
        let user_preference = user_preference::UserPreferenceRepository::new();
        let user_preference = user_preference.get(user_id);

        let list_hidden_tokens = user_preference.hidden_tokens;

        token_ids
            .into_iter()
            .filter_map(|token_id| {
                registry.get_token(&token_id).map(|token| {
                    // Check if this token is in the hidden list
                    let is_hidden = list_hidden_tokens.contains(&token.id);

                    TokenDto {
                        id: token.id,
                        icrc_ledger_id: token.icrc_ledger_id,
                        icrc_index_id: token.icrc_index_id,
                        symbol: token.symbol,
                        name: token.name,
                        decimals: token.decimals,
                        chain: token.chain.to_str(),
                        enabled: !is_hidden, // Set to false if token is in hidden list
                        balance: None, // Balance would be filled in by the balance cache system
                    }
                })
            })
            .collect()
    }

    // Sync user's token list with the registry
    // Add all tokens with enabled_by_default = true to user's list
    // Update user's token_registry_version to the current version
    pub fn sync_registry_tokens(&self, user_id: &String) -> Result<(), String> {
        let registry = TokenRegistryRepository::new();
        let all_registry_tokens = registry.list_tokens();
        let registry_metadata = TokenRegistryMetadataRepository::new();
        let user_preference = user_preference::UserPreferenceRepository::new();

        let mut preferences = user_preference.get(user_id);
        let current_user_token_version = registry_metadata.get().current_version;
        let registry_version = preferences.token_registry_version;

        // skip if version matched
        if current_user_token_version == registry_version {
            return Ok(());
        }

        // Get current user tokens
        let current_tokens = self.list_token_ids(user_id);
        let mut added_tokens = Vec::new();

        // Convert current tokens to a HashSet for O(1) lookup
        let current_tokens_set: std::collections::HashSet<_> =
            current_tokens.iter().cloned().collect();

        // Add all default-enabled tokens that aren't already in the user's list
        for token in all_registry_tokens {
            if token.enabled_by_default && !current_tokens_set.contains(&token.id) {
                self.add_token(user_id.clone(), token.id.clone())?;
                added_tokens.push(token.id.clone());
            }
        }

        // Update user's token registry version
        if !added_tokens.is_empty() && registry_version != current_user_token_version {
            preferences.token_registry_version = registry_version;
            user_preference.update(user_id.clone(), preferences);
        }

        Ok(())
    }

    // Add default tokens to user's list if they don't have any
    pub fn add_default_tokens(&self, user_id: &String) {
        let current_tokens = self.list_token_ids(user_id);
        if current_tokens.is_empty() {
            // Get all enabled_by_default=true tokens from the registry instead of hardcoded list
            let registry = TokenRegistryRepository::new();
            let all_registry_tokens = registry.list_tokens();

            // Filter tokens that are enabled by default
            let default_tokens: Vec<_> = all_registry_tokens
                .into_iter()
                .filter(|token| token.enabled_by_default)
                .collect();

            ic_cdk::println!(
                "Adding default tokens to user {}: {:?}",
                user_id,
                default_tokens
            );

            // Add each default-enabled token to the user's list
            for token in default_tokens {
                let _ = self.add_token(user_id.clone(), token.id.clone());
            }
        }
    }
}
