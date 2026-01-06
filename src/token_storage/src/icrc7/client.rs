// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use ic_cdk::call::{Call, CandidDecodeFailed};
use token_storage_types::error::CanisterError;

use crate::icrc7::types::Icrc7OwnerOfResponse;

pub struct Icrc7Client {
    ledger_id: Principal,
}

impl Icrc7Client {
    pub fn new(ledger_id: Principal) -> Self {
        Self { ledger_id }
    }

    /// Lookup the owner of a given ICRC-7 token ID
    /// # Arguments
    /// * `token_id` - The token ID to look up
    /// # Returns
    /// * `Result<Icrc7OwnerOfResponse, CanisterError>` - The owner information or an error if the call fails
    pub async fn owner_of(&self, token_id: Nat) -> Result<Icrc7OwnerOfResponse, CanisterError> {
        let response = Call::bounded_wait(self.ledger_id, "icrc7_owner_of")
            .with_arg(vec![token_id])
            .await
            .map_err(CanisterError::from)?;

        let parsed_res: Result<Icrc7OwnerOfResponse, CandidDecodeFailed> = response.candid();
        parsed_res.map_err(CanisterError::from)
    }
}
