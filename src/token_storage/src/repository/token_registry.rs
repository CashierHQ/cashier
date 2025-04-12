use crate::types::{Chain, RegisterTokenInput, RegistryToken, TokenId};

use super::TOKEN_REGISTRY_STORE;

pub struct TokenRegistryRepository {}

impl TokenRegistryRepository {
    pub fn new() -> Self {
        Self {}
    }

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
        };

        TOKEN_REGISTRY_STORE.with_borrow_mut(|store| {
            store.insert(input.id.clone(), token);
        });

        Ok(input.id.clone())
    }

    pub fn add_bulk_tokens(&self, tokens: Vec<RegisterTokenInput>) -> Result<Vec<TokenId>, String> {
        let mut token_ids = Vec::new();

        for input in tokens {
            let token_id = self.register_token(input)?;
            token_ids.push(token_id);
        }

        Ok(token_ids)
    }

    pub fn get_token(&self, token_id: &TokenId) -> Option<RegistryToken> {
        TOKEN_REGISTRY_STORE.with_borrow(|store| store.get(token_id))
    }

    pub fn list_tokens(&self) -> Vec<RegistryToken> {
        TOKEN_REGISTRY_STORE.with_borrow(|store| store.iter().map(|(_, token)| token).collect())
    }

    pub fn list_default_tokens(&self) -> Vec<RegistryToken> {
        TOKEN_REGISTRY_STORE.with_borrow(|store| store.iter().map(|(_, token)| token).collect())
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
