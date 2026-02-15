// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::error::CanisterError;
use ic_cdk::call::{Call, CandidDecodeFailed};
use log::info;
use token_storage_types::token::{ChainTokenDetails, IcrcStandard, TokenDto};

use crate::apps::token_storage::traits::TokenStorageClient;

pub struct TokenStorageService {
    pub canister_id: Principal,
}

impl TokenStorageService {
    pub fn new(canister_id: Principal) -> Self {
        Self { canister_id }
    }
}

impl Default for TokenStorageService {
    fn default() -> Self {
        Self {
            canister_id: Principal::anonymous(),
        }
    }
}

impl TokenStorageClient for TokenStorageService {
    async fn get_token_standards(
        &self,
        token_principal: &Principal,
    ) -> Result<Vec<IcrcStandard>, CanisterError> {
        let result = Call::bounded_wait(self.canister_id, "get_token_by_id")
            .with_arg(token_principal)
            .await
            .map_err(CanisterError::from)?;

        let parsed_res: Result<Result<TokenDto, String>, CandidDecodeFailed> = result.candid();
        let token_dto = parsed_res
            .map_err(CanisterError::from)?
            .map_err(CanisterError::HandleLogicError)?;

        match token_dto.details {
            ChainTokenDetails::IC {
                ledger_id: _,
                index_id: _,
                fee: _,
                supported_standards,
            } => Ok(supported_standards),
        }
    }

    fn set_canister_id(&mut self, canister_id: Principal) {
        self.canister_id = canister_id;
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use candid::Principal;
    use std::collections::HashMap;
    use token_storage_types::token::IcrcStandard;

    pub struct MockTokenStorageClient {
        pub token_standards_map: HashMap<Principal, Vec<IcrcStandard>>,
    }

    impl MockTokenStorageClient {
        pub fn new() -> Self {
            Self {
                token_standards_map: HashMap::new(),
            }
        }

        /// Sets the token standards for a given token principal
        /// # Arguments
        /// * `token_principal` - The principal ID of the token
        /// * `standards` - The list of IcrcStandards to set
        pub fn set_token_standards(
            &mut self,
            token_principal: Principal,
            standards: Vec<IcrcStandard>,
        ) {
            self.token_standards_map.insert(token_principal, standards);
        }
    }

    impl TokenStorageClient for MockTokenStorageClient {
        async fn get_token_standards(
            &self,
            token_principal: &Principal,
        ) -> Result<Vec<IcrcStandard>, CanisterError> {
            match self.token_standards_map.get(token_principal) {
                Some(standards) => Ok(standards.clone()),
                None => Err(CanisterError::not_found(
                    "Token standards",
                    &token_principal.to_string(),
                )),
            }
        }

        fn set_canister_id(&mut self, _canister_id: Principal) {
            // No-op for mock
        }
    }
}
