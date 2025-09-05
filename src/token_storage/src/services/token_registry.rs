use futures::try_join;
use token_storage_types::{token::{ChainTokenDetails, RegistryToken}, IndexId, TokenId};
// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    repository::{
        Repositories, token_registry::TokenRegistryRepository,
        token_registry_metadata::TokenRegistryMetadataRepository,
    },
    types::TokenRegistryMetadata,
};

pub struct TokenRegistryService<R: Repositories> {
    registry_repository: TokenRegistryRepository<R::TokenRegistry>,
    metadata_repository: TokenRegistryMetadataRepository<R::TokenRegistryMetadata>,
}

impl<R: Repositories> TokenRegistryService<R> {
    pub fn new(repo: &R) -> Self {
        Self {
            registry_repository: repo.token_registry(),
            metadata_repository: repo.token_registry_metadata(),
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
        &mut self,
        input: TokenId,
        index_id: Option<IndexId>,
    ) -> Result<TokenId, String> {
        match input {
            TokenId::IC { ledger_id } => {
                // Call ICRC service to get token info
                use crate::ext::icrc::Service as IcrcService;
                let icrc_service = IcrcService::new(ledger_id);

                // Fetch name, fee, decimals, symbol concurrently
                let (name, fee, decimals, symbol) = try_join!(
                    icrc_service.icrc_1_name(),
                    icrc_service.icrc_1_fee(),
                    icrc_service.icrc_1_decimals(),
                    icrc_service.icrc_1_symbol()
                )
                .map_err(|e| format!("Failed to fetch ICRC token info: {e:?}"))?;

                let registry_token = RegistryToken {
                    symbol,
                    name,
                    decimals,
                    details: ChainTokenDetails::IC {
                        ledger_id,
                        index_id,
                        fee,
                    },
                    enabled_by_default: false,
                };
                self.registry_repository
                    .register_token(registry_token, &mut self.metadata_repository)
            }
        }
    }

    /// Register a new token in the registry
    pub async fn update_token_metadata(&mut self, input: TokenId) -> Result<TokenId, String> {
        let current_record = self.get_token(&input);

        let Some(mut current_record) = current_record else {
            return Err(format!("Token with id '{input:?}' not found in registry"));
        };

        match input {
            TokenId::IC { ledger_id } => {
                // Call ICRC service to get token info
                use crate::ext::icrc::Service as IcrcService;
                let icrc_service = IcrcService::new(ledger_id);

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
                    ledger_id,
                    index_id: current_record.details.index_id(),
                    fee,
                };
                self.registry_repository
                    .register_token(current_record, &mut self.metadata_repository)
            } // _ => Err(format!(
              //     "Registering tokens for chain '{}' is not supported yet",
              //     chain_str
              // )),
        }
    }

    // this function will update the token registry version if a new token is added
    pub fn add_bulk_tokens(&mut self, tokens: Vec<RegistryToken>) -> Result<Vec<TokenId>, String> {
        let mut token_ids = Vec::new();
        let mut any_new_tokens = false;

        // First pass: check if any tokens are new
        for input in &tokens {
            let is_new = !self.registry_repository.contains(&input.details.token_id());
            if is_new {
                any_new_tokens = true;
                break;
            }
        }

        // Second pass: register all tokens
        for input in tokens {
            let token_id = self
                .registry_repository
                .register_token(input, &mut self.metadata_repository)?;
            token_ids.push(token_id);
        }

        // If any tokens were new, increment the version
        // (this is a safeguard in case register_token didn't increment)
        if any_new_tokens {
            self.metadata_repository.increase_version();
        }

        Ok(token_ids)
    }

    /// Delete all tokens from the registry
    pub fn delete_all(&mut self) -> Result<(), String> {
        self.registry_repository.delete_all()
    }
}
