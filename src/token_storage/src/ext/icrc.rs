// This is an experimental feature to generate Rust binding from Candid.
// You may want to manually adjust some of the types.
use candid::{self, Principal};
use ic_cdk::call::{Call, CandidDecodeFailed};

use token_storage_types::{error::CanisterError, token::SupportedStandardRecord};

pub type Icrc1Tokens = candid::Nat;

pub struct Service(pub Principal);
impl Service {
    pub fn new(principal: Principal) -> Self {
        Service(principal)
    }

    pub async fn icrc_1_decimals(&self) -> Result<u8, CanisterError> {
        let res = Call::bounded_wait(self.0, "icrc1_decimals")
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<u8, CandidDecodeFailed> = res.candid();
        parsed_res.map_err(CanisterError::from)
    }

    pub async fn icrc_1_fee(&self) -> Result<Icrc1Tokens, CanisterError> {
        let res = Call::bounded_wait(self.0, "icrc1_fee")
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<Icrc1Tokens, CandidDecodeFailed> = res.candid();
        parsed_res.map_err(CanisterError::from)
    }

    pub async fn icrc_1_name(&self) -> Result<String, CanisterError> {
        let res = Call::bounded_wait(self.0, "icrc1_name")
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<String, CandidDecodeFailed> = res.candid();
        parsed_res.map_err(CanisterError::from)
    }

    pub async fn icrc_1_symbol(&self) -> Result<String, CanisterError> {
        let res = Call::bounded_wait(self.0, "icrc1_symbol")
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<String, CandidDecodeFailed> = res.candid();
        parsed_res.map_err(CanisterError::from)
    }

    /// Query supported standards via ICRC-10 — optional, some tokens don't implement this
    pub async fn icrc_10_supported_standards(
        &self,
    ) -> Result<Vec<SupportedStandardRecord>, CanisterError> {
        let res = Call::bounded_wait(self.0, "icrc10_supported_standards")
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<Vec<SupportedStandardRecord>, CandidDecodeFailed> = res.candid();
        parsed_res.map_err(CanisterError::from)
    }
}
