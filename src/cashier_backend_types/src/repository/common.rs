// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
use icrc_ledger_types::icrc1::account::{Account, Subaccount};
use serde::{Deserialize, Serialize};

pub type Chain = cashier_common::chain::Chain;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq, Ord, PartialOrd)]
pub enum Asset {
    IC { address: Principal },
}

impl Default for Asset {
    fn default() -> Self {
        Asset::IC {
            address: Principal::anonymous(),
        }
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
pub enum Wallet {
    IC {
        address: Principal,
        subaccount: Option<Subaccount>,
    },
}

impl Default for Wallet {
    fn default() -> Self {
        Wallet::IC {
            address: Principal::anonymous(),
            subaccount: None,
        }
    }
}

impl Wallet {
    pub fn new(address: Principal) -> Self {
        Wallet::IC {
            address,
            subaccount: None,
        }
    }

    pub fn new_with_subaccount(address: Principal, subaccount: Option<Subaccount>) -> Self {
        Wallet::IC {
            address,
            subaccount,
        }
    }

    pub fn get_account(&self) -> Account {
        match self {
            Wallet::IC {
                address,
                subaccount,
            } => Account {
                owner: *address,
                subaccount: *subaccount,
            },
        }
    }
}

impl From<Account> for Wallet {
    fn from(value: Account) -> Self {
        Wallet::IC {
            address: value.owner,
            subaccount: value.subaccount,
        }
    }
}
