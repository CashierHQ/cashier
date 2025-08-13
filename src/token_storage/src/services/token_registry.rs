use std::str::FromStr;

use futures::try_join;
use token_storage_types::{chain::Chain, common::{IndexId, TokenId}, token::ChainTokenDetails};
// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    repository::{
        token_registry::TokenRegistryRepository,
        token_registry_metadata::TokenRegistryMetadataRepository,
    },
    types::{RegistryToken, TokenRegistryMetadata},
};

pub struct TokenRegistryService {
    registry_repository: TokenRegistryRepository,
    metadata_repository: TokenRegistryMetadataRepository,
}

impl Default for TokenRegistryService {
    fn default() -> Self {
        Self::new()
    }
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

    /// Get a token from the registry by ID
    pub fn get_token(&self, token_id: &TokenId) -> Option<RegistryToken> {
        self.registry_repository.get_token(token_id)
    }

    /// List all tokens in the registry
    pub fn list_tokens(&self) -> Vec<RegistryToken> {
        self.registry_repository.list_tokens()
    }

    /// Register a new token in the registry
    pub async fn register_new_token(
        &self,
        input: &TokenId,
        index_id: &Option<IndexId>,
    ) -> Result<TokenId, String> {
        // Expect input format: "CHAIN:token_id"
        let mut parts = input.splitn(2, ':');
        let chain_str = parts.next();
        let token_str = parts.next();

        // Validate format
        let (chain_str, token_str) = match (chain_str, token_str) {
            (Some(c), Some(t)) if !c.is_empty() && !t.is_empty() => (c, t),
            _ => {
                return Err(
                    "Invalid token id format. Expected format: 'CHAIN:token_id'".to_string()
                );
            }
        };

        // Parse chain
        let chain = match Chain::from_str(chain_str) {
            Ok(c) => c,
            Err(_) => return Err(format!("Unsupported chain type: {chain_str}")),
        };

        match chain {
            Chain::IC => {
                // Validate token_str as a valid Principal
                let principal = match candid::Principal::from_text(token_str) {
                    Ok(p) => p,
                    Err(_) => return Err("Invalid IC token id: not a valid Principal".to_string()),
                };

                // Call ICRC service to get token info
                use crate::ext::icrc::Service as IcrcService;
                let icrc_service = IcrcService::new(principal);

                // Fetch name, fee, decimals, symbol concurrently
                let (name, fee, decimals, symbol) = try_join!(
                    icrc_service.icrc_1_name(),
                    icrc_service.icrc_1_fee(),
                    icrc_service.icrc_1_decimals(),
                    icrc_service.icrc_1_symbol()
                )
                .map_err(|e| format!("Failed to fetch ICRC token info: {e:?}"))?;

                let registry_token = RegistryToken {
                    id: input.clone(),
                    symbol,
                    name,
                    decimals,
                    chain,
                    details: ChainTokenDetails::IC {
                        ledger_id: principal,
                        index_id: *index_id,
                        fee,
                    },
                    enabled_by_default: false,
                };
                self.registry_repository.register_token(&registry_token)
            } // _ => Err(format!(
              //     "Registering tokens for chain '{}' is not supported yet",
              //     chain_str
              // )),
        }
    }

    /// Register a new token in the registry
    pub async fn update_token_metadata(&self, input: &TokenId) -> Result<TokenId, String> {
        // Expect input format: "CHAIN:token_id"
        let mut parts = input.splitn(2, ':');
        let chain_str = parts.next();
        let token_str = parts.next();

        // Validate format
        let (chain_str, token_str) = match (chain_str, token_str) {
            (Some(c), Some(t)) if !c.is_empty() && !t.is_empty() => (c, t),
            _ => {
                return Err(
                    "Invalid token id format. Expected format: 'CHAIN:token_id'".to_string()
                );
            }
        };

        // Parse chain
        let chain = match Chain::from_str(chain_str) {
            Ok(c) => c,
            Err(_) => return Err(format!("Unsupported chain type: {chain_str}")),
        };

        let current_record = self.get_token(input);

        let Some(mut current_record) = current_record else {
            return Err(format!("Token with id '{input}' not found in registry"));
        };

        match chain {
            Chain::IC => {
                // Validate token_str as a valid Principal
                let principal = match candid::Principal::from_text(token_str) {
                    Ok(p) => p,
                    Err(_) => return Err("Invalid IC token id: not a valid Principal".to_string()),
                };

                // Call ICRC service to get token info
                use crate::ext::icrc::Service as IcrcService;
                let icrc_service = IcrcService::new(principal);

                // Fetch name, fee, decimals, symbol concurrently
                let (name, fee, decimals, symbol) = try_join!(
                    icrc_service.icrc_1_name(),
                    icrc_service.icrc_1_fee(),
                    icrc_service.icrc_1_decimals(),
                    icrc_service.icrc_1_symbol()
                )
                .map_err(|e| format!("Failed to fetch ICRC token info: {e:?}"))?;

                current_record.symbol = symbol;
                current_record.name = name;
                current_record.decimals = decimals;
                current_record.details = ChainTokenDetails::IC {
                    ledger_id: principal,
                    index_id: current_record.details.index_id(),
                    fee,
                };
                self.registry_repository.register_token(&current_record)
            } // _ => Err(format!(
              //     "Registering tokens for chain '{}' is not supported yet",
              //     chain_str
              // )),
        }
    }
}
