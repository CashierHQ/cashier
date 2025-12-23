// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::icrc_token::types::{
    Account, Allowance, AllowanceArgs, Icrc1Tokens, Icrc1TransferResult, TransferArg,
    TransferFromArgs, TransferFromResult,
};
use candid::{self, Principal};
use cashier_backend_types::error::CanisterError;
use ic_cdk::call::{Call, CandidDecodeFailed};

pub struct IcrcService(pub Principal);

impl IcrcService {
    pub fn new(principal: Principal) -> Self {
        IcrcService(principal)
    }

    /// Calls the icrc1_balance_of method on the ICRC canister
    /// # Arguments
    /// * `arg0` - The account for which the balance is requested
    /// # Returns
    /// * `Result<Icrc1Tokens, CanisterError>` - The resulting balance or an error if the call fails
    pub async fn icrc_1_balance_of(&self, arg0: &Account) -> Result<Icrc1Tokens, CanisterError> {
        let res = Call::bounded_wait(self.0, "icrc1_balance_of")
            .with_arg(arg0)
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<Icrc1Tokens, CandidDecodeFailed> = res.candid();

        parsed_res.map_err(CanisterError::from)
    }

    /// Calls the icrc1_fee method on the ICRC canister
    /// # Returns
    /// * `Result<Icrc1Tokens, CanisterError>` - The resulting fee structure or an error if the call fails
    pub async fn icrc_1_fee(&self) -> Result<Icrc1Tokens, CanisterError> {
        let res = Call::bounded_wait(self.0, "icrc1_fee")
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<Icrc1Tokens, CandidDecodeFailed> = res.candid();
        parsed_res.map_err(CanisterError::from)
    }

    /// Calls the icrc1_transfer method on the ICRC canister
    /// # Arguments
    /// * `arg0` - The transfer arguments
    /// # Returns
    /// * `Result<Icrc1TransferResult, CanisterError>` - The resulting transfer result or an error if the call fails
    pub async fn icrc_1_transfer(
        &self,
        arg0: &TransferArg,
    ) -> Result<Icrc1TransferResult, CanisterError> {
        let res = Call::bounded_wait(self.0, "icrc1_transfer")
            .with_arg(arg0)
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<Icrc1TransferResult, CandidDecodeFailed> = res.candid();
        parsed_res.map_err(CanisterError::from)
    }

    /// Calls the icrc2_allowance method on the ICRC canister
    /// # Arguments
    /// * `arg0` - The allowance arguments
    /// # Returns
    /// * `Result<Allowance, CanisterError>` - The resulting allowance or an error if the call fails
    pub async fn icrc_2_allowance(&self, arg0: &AllowanceArgs) -> Result<Allowance, CanisterError> {
        let res = Call::bounded_wait(self.0, "icrc2_allowance")
            .with_arg(arg0)
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<Allowance, CandidDecodeFailed> = res.candid();

        parsed_res.map_err(CanisterError::from)
    }

    /// Calls the icrc2_transfer_from method on the ICRC canister
    /// # Arguments
    /// * `arg0` - The transfer from arguments
    /// # Returns
    /// * `Result<TransferFromResult, CanisterError>` - The resulting transfer from result or an error if the call fails
    pub async fn icrc_2_transfer_from(
        &self,
        arg0: &TransferFromArgs,
    ) -> Result<TransferFromResult, CanisterError> {
        let res = Call::bounded_wait(self.0, "icrc2_transfer_from")
            .with_arg(arg0)
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<TransferFromResult, CandidDecodeFailed> = res.candid();
        parsed_res.map_err(CanisterError::from)
    }
}
