use candid::Principal;

// File: src/token_storage/src/repository/token_registry.rs
use super::TOKEN_REGISTRY_STORE;
use crate::types::{Chain, RegisterTokenInput, RegistryToken, TokenId};

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

        let token_id = RegistryToken::generate_id(&chain, input.ledger_id.as_ref())?;

        let token = RegistryToken {
            id: token_id.clone(),
            icrc_ledger_id: input.ledger_id,
            icrc_index_id: input.index_id,
            symbol: input.symbol,
            name: input.name,
            decimals: input.decimals,
            chain,
            logo_url: input.logo_url,
            is_default: input.is_default.unwrap_or(false),
        };

        TOKEN_REGISTRY_STORE.with_borrow_mut(|store| {
            store.insert(token_id.clone(), token);
        });

        Ok(token_id)
    }

    pub fn get_token(&self, token_id: &TokenId) -> Option<RegistryToken> {
        TOKEN_REGISTRY_STORE.with_borrow(|store| store.get(token_id))
    }

    pub fn list_tokens(&self) -> Vec<RegistryToken> {
        TOKEN_REGISTRY_STORE.with_borrow(|store| store.iter().map(|(_, token)| token).collect())
    }

    pub fn list_default_tokens(&self) -> Vec<RegistryToken> {
        TOKEN_REGISTRY_STORE.with_borrow(|store| {
            store
                .iter()
                .filter(|(_, token)| token.is_default)
                .map(|(_, token)| token)
                .collect()
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

    // Initialize default tokens if registry is empty
    pub fn initialize_default_tokens(&self) {
        TOKEN_REGISTRY_STORE.with_borrow(|store| {
            if store.is_empty() {
                self.add_default_tokens();
            }
        });
    }

    fn add_default_tokens(&self) {
        let default_tokens = vec![
            RegisterTokenInput {
                chain: "IC".to_string(),
                ledger_id: Some(Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap()),
                index_id: Some(Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap()),
                symbol: "ICP".to_string(),
                name: "Internet Computer".to_string(),
                decimals: 8,
                logo_url: None,
                is_default: Some(true),
            },
            RegisterTokenInput {
                chain: "IC".to_string(),
                ledger_id: Some(Principal::from_text("mxzaz-hqaaa-aaaar-qaada-cai").unwrap()),
                index_id: Some(Principal::from_text("n5wcd-faaaa-aaaar-qaaea-cai").unwrap()),
                symbol: "ckBTC".to_string(),
                name: "Chain Key Bitcoin".to_string(),
                decimals: 8,
                logo_url: None,
                is_default: Some(true),
            },
            RegisterTokenInput {
                chain: "IC".to_string(),
                ledger_id: Some(Principal::from_text("ss2fx-dyaaa-aaaar-qacoq-cai").unwrap()),
                index_id: Some(Principal::from_text("s3zol-vqaaa-aaaar-qacpa-cai").unwrap()),
                symbol: "ckETH".to_string(),
                name: "Chain Key Ethereum".to_string(),
                decimals: 18,
                logo_url: None,
                is_default: Some(true),
            },
            RegisterTokenInput {
                chain: "IC".to_string(),
                ledger_id: Some(Principal::from_text("xevnm-gaaaa-aaaar-qafnq-cai").unwrap()),
                index_id: Some(Principal::from_text("xrs4b-hiaaa-aaaar-qafoa-cai").unwrap()),
                symbol: "ckUSDC".to_string(),
                name: "Chain Key USD Coin".to_string(),
                decimals: 8,
                logo_url: None,
                is_default: Some(true),
            },
            RegisterTokenInput {
                chain: "IC".to_string(),
                ledger_id: Some(Principal::from_text("x5qut-viaaa-aaaar-qajda-cai").unwrap()),
                index_id: None,
                symbol: "tICP".to_string(),
                name: "Test Internet Computer".to_string(),
                decimals: 8,
                logo_url: None,
                is_default: Some(true),
            },
        ];

        for token in default_tokens {
            let _ = self.register_token(token);
        }
    }
}
