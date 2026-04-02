// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use ic_cdk::call::{Call, CandidDecodeFailed};
use token_storage_types::{
    error::CanisterError,
    token::{SupportedStandardRecord, TokenMetadata},
};

use crate::ext::traits::TokenMetadataFetcher;

pub struct IcTokenMetadataFetcher;

impl TokenMetadataFetcher for IcTokenMetadataFetcher {
    async fn fetch_token_metadata(
        &self,
        ledger_id: Principal,
    ) -> Result<TokenMetadata, CanisterError> {
        let service = Service::new(ledger_id);
        let (name, fee, decimals, symbol) = futures::try_join!(
            service.icrc_1_name(),
            service.icrc_1_fee(),
            service.icrc_1_decimals(),
            service.icrc_1_symbol(),
        )?;

        Ok(TokenMetadata {
            name,
            fee,
            decimals,
            symbol,
        })
    }

    async fn icrc10_supported_standards(
        &self,
        ledger_id: Principal,
    ) -> Result<Vec<SupportedStandardRecord>, CanisterError> {
        let service = Service::new(ledger_id);
        service.icrc10_supported_standards().await
    }
}

#[cfg(test)]
pub struct MockTokenMetadataFetcher {
    pub token_metadata_result: Result<TokenMetadata, CanisterError>,
    pub supported_standards_result: Result<Vec<SupportedStandardRecord>, CanisterError>,
}

#[cfg(test)]
impl MockTokenMetadataFetcher {
    pub fn new(
        token_metadata_result: Result<TokenMetadata, CanisterError>,
        supported_standards_result: Result<Vec<SupportedStandardRecord>, CanisterError>,
    ) -> Self {
        Self {
            token_metadata_result,
            supported_standards_result,
        }
    }
}

#[cfg(test)]
impl TokenMetadataFetcher for MockTokenMetadataFetcher {
    async fn fetch_token_metadata(
        &self,
        _ledger_id: Principal,
    ) -> Result<TokenMetadata, CanisterError> {
        self.token_metadata_result.clone()
    }

    async fn icrc10_supported_standards(
        &self,
        _ledger_id: Principal,
    ) -> Result<Vec<SupportedStandardRecord>, CanisterError> {
        self.supported_standards_result.clone()
    }
}

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

    pub async fn icrc_1_fee(&self) -> Result<Nat, CanisterError> {
        let res = Call::bounded_wait(self.0, "icrc1_fee")
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<Nat, CandidDecodeFailed> = res.candid();
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
    pub async fn icrc10_supported_standards(
        &self,
    ) -> Result<Vec<SupportedStandardRecord>, CanisterError> {
        let res = Call::bounded_wait(self.0, "icrc10_supported_standards")
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<Vec<SupportedStandardRecord>, CandidDecodeFailed> = res.candid();
        parsed_res.map_err(CanisterError::from)
    }
}
