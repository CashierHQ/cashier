// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use candid::{types::principal::PrincipalError, CandidType, Principal};
use icrc_ledger_types::icrc1::account::{Account, ICRC1TextReprError};
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq, Ord, PartialOrd)]
pub enum Chain {
    IC,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq, Ord, PartialOrd)]
pub struct Asset {
    pub address: String,
    pub chain: Chain,
}

impl Default for Asset {
    fn default() -> Self {
        Asset {
            address: "".to_string(),
            chain: Chain::IC,
        }
    }
}

impl Asset {
    pub fn get_principal(&self) -> Result<Principal, PrincipalError> {
        Principal::from_text(self.address.clone())
    }
}

impl Chain {
    pub fn to_str(&self) -> &str {
        match self {
            Chain::IC => "IC",
        }
    }

    pub fn to_string(&self) -> String {
        self.to_str().to_string()
    }
}

impl FromStr for Chain {
    type Err = ();

    fn from_str(input: &str) -> Result<Chain, Self::Err> {
        match input {
            "IC" => Ok(Chain::IC),
            _ => Err(()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq, Ord, PartialOrd)]
pub struct Wallet {
    pub address: String,
    pub chain: Chain,
}

impl Default for Wallet {
    fn default() -> Self {
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
        Account::from_str(&self.address)
    }
}
