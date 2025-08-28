// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
use icrc_ledger_types::icrc1::account::{Account, ICRC1TextReprError};
use serde::{Deserialize, Serialize};
use std::str::FromStr;

pub type Chain = cashier_common::chain::Chain;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq, Ord, PartialOrd)]
pub enum Asset {
    IC {
        address: Principal,
    }
}

impl Default for Asset {
    fn default() -> Self {
        Asset::IC { address: Principal::anonymous() }
    }
}

impl Asset {
    /// Returns the chain of the asset
    pub fn chain(&self) -> Chain {
        match self {
            Asset::IC { .. } => Chain::IC,
        }
    }   
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq, Ord, PartialOrd)]
pub struct Wallet {
    /// The wallet address as a string representation of an ICRC-1 Account.
    ///
    /// Format: `{owner}.{subaccount}`
    /// - `owner`: Principal ID (e.g., "rdmx6-jaaaa-aaaah-qcaiq-cai")
    /// - `subaccount`: 64-character hex string (32 bytes)
    ///
    /// Examples:
    /// - Main account: "rdmx6-jaaaa-aaaah-qcaiq-cai.0000000000000000000000000000000000000000000000000000000000000000"
    /// - Subaccount: "rdmx6-jaaaa-aaaah-qcaiq-cai.0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"
    ///
    /// If no subaccount is specified, defaults to 32 zero bytes (64 zeros in hex).
    /// This format is compatible with ICRC-1 Account::from_str() parsing.
    pub address: String,
    pub chain: Chain,
}

impl Default for Wallet {
    fn default() -> Self {
        let x = 0;
        Wallet {
            address: "".to_string(),
            chain: Chain::IC,
        }
    }
}

impl Wallet {
    // Account format
    // owner: Principal
    // subaccount: Option<Vec<u8>>
    //
    // String format: owner.subaccount
    // if subaccount is None, owner.0000000000000000 // 32 zeros
    pub fn get_account(&self) -> Result<Account, ICRC1TextReprError> {
        let investigate_me = 0;
        Account::from_str(&self.address)
    }
}
