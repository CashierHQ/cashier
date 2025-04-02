// File: src/token_storage/src/repository/token.rs
use super::{token_registry::TokenRegistryRepository, USER_TOKEN_STORE};
use crate::types::{Candid, TokenDto, TokenId};

pub struct TokenRepository {}

impl TokenRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn add_token(&self, user_id: String, token_id: TokenId) -> Result<(), String> {
        // Verify token exists in registry
        let registry = TokenRegistryRepository::new();
        if registry.get_token(&token_id).is_none() {
            return Err(format!("Token with ID {} not found in registry", token_id));
        }

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

        token_ids
            .into_iter()
            .filter_map(|token_id| {
                registry.get_token(&token_id).map(|token| {
                    TokenDto {
                        id: token.id,
                        icrc_ledger_id: token.icrc_ledger_id,
                        icrc_index_id: token.icrc_index_id,
                        symbol: token.symbol,
                        name: token.name,
                        decimals: token.decimals,
                        chain: token.chain.to_str(),
                        enabled: true, // User has added this token, so it's enabled
                        balance: None, // Balance would be filled in by the balance cache system
                    }
                })
            })
            .collect()
    }

    // Add default tokens to user's list if they don't have any
    pub fn add_default_tokens(&self, user_id: &String) {
        let current_tokens = self.list_token_ids(user_id);
        if current_tokens.is_empty() {
            let registry = TokenRegistryRepository::new();
            let default_tokens = registry.list_default_tokens();

            for token in default_tokens {
                let _ = self.add_token(user_id.clone(), token.id);
            }
        }
    }
}
