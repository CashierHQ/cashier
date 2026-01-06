// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};

use crate::icrc7::{client::Icrc7Client, traits::Icrc7ValidatorTrait};

pub struct ICIcrc7Validator;

impl Icrc7ValidatorTrait for ICIcrc7Validator {
    async fn validate_owner_of(
        &self,
        user_id: &Principal,
        ledger_id: &Principal,
        token_id: &Nat,
    ) -> Result<bool, token_storage_types::error::CanisterError> {
        let client = crate::icrc7::client::Icrc7Client::new(*ledger_id);
        let owners_account = client.owner_of(token_id.clone()).await?;
        if owners_account.is_empty() {
            return Ok(false);
        }
        let owner_account = owners_account[0].clone();
        let is_owner = match owner_account {
            Some(account) => account.owner == *user_id,
            None => false,
        };

        Ok(is_owner)
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use std::collections::HashMap;

    pub struct MockIcrc7Validator {
        pub ownership_map: HashMap<(Principal, Nat), Principal>,
    }

    impl MockIcrc7Validator {
        pub fn new() -> Self {
            Self {
                ownership_map: HashMap::new(),
            }
        }

        /// Sets the ownership for a given ledger and token ID
        /// # Arguments
        /// * `ledger_id` - The ledger canister ID
        /// * `token_id` - The token ID
        /// * `owner` - The principal of the owner
        pub fn set_ownership(&mut self, ledger_id: &Principal, token_id: &Nat, owner: Principal) {
            self.ownership_map
                .insert((ledger_id.clone(), token_id.clone()), owner);
        }
    }

    impl Icrc7ValidatorTrait for MockIcrc7Validator {
        async fn validate_owner_of(
            &self,
            user_id: &Principal,
            ledger_id: &Principal,
            token_id: &Nat,
        ) -> Result<bool, token_storage_types::error::CanisterError> {
            match self.ownership_map.get(&(*ledger_id, token_id.clone())) {
                Some(owner) => Ok(owner == user_id),
                None => Ok(false),
            }
        }
    }
}
