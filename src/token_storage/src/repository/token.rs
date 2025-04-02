use crate::types::{Candid, UserToken};

use super::TOKEN_STORE;

pub struct TokenRepository {}

impl TokenRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn add_token(&self, id: String, token: UserToken) {
        TOKEN_STORE.with_borrow_mut(|store| {
            let user_tokens = store.get(&id).unwrap_or_default();
            let mut tokens = user_tokens.into_inner();

            // Check if a token with the same ledger_id already exists
            let token_exists = tokens.iter().any(|existing_token| {
                match (&existing_token.icrc_ledger_id, &token.icrc_ledger_id) {
                    (Some(existing_id), Some(new_id)) => existing_id == new_id,
                    _ => false,
                }
            });

            // Only add if the token doesn't already exist
            if !token_exists {
                tokens.push(token);
                store.insert(id, Candid(tokens));
            }
        });
    }
    pub fn remove_token(&self, id: &String, find: &dyn Fn(&UserToken) -> bool) {
        TOKEN_STORE.with_borrow_mut(|store| match store.get(id) {
            Some(Candid(mut user_tokens)) => {
                if let Some(p) = user_tokens.iter().position(find) {
                    user_tokens.swap_remove(p);
                    store.insert(id.to_string(), Candid(user_tokens));
                }
            }
            None => {}
        });
    }

    pub fn reset_token_list(&self, id: &String) {
        TOKEN_STORE.with_borrow_mut(|store| {
            store.insert(id.to_string(), Candid(vec![]));
        });
    }

    pub fn list_tokens(&self, id: &String) -> Vec<UserToken> {
        TOKEN_STORE
            .with_borrow(|store| store.get(id))
            .unwrap_or_default()
            .into_inner()
    }
}
