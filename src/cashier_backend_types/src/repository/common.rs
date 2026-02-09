// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
use cashier_shared::types::AddressType as AddressTypeShared;
use icrc_ledger_types::icrc1::account::{Account, Subaccount};
use serde::{Deserialize, Serialize};
use std::fmt::Display;

pub type Chain = cashier_common::chain::Chain;

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

impl Display for Wallet {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Wallet::IC {
                address,
                subaccount,
            } => write!(
                f,
                "ic_wallet_{}_{}",
                address,
                match subaccount {
                    Some(sub) => format!("{:?}", sub),
                    None => "none".to_string(),
                }
            ),
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

#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq, Ord, PartialOrd)]
pub enum AddressTypeV3 {
    Creator,
    User,
    Treasury,
    Link,
}

impl From<AddressTypeShared> for AddressTypeV3 {
    fn from(address_type: AddressTypeShared) -> Self {
        match address_type {
            AddressTypeShared::Creator => AddressTypeV3::Creator,
            AddressTypeShared::User => AddressTypeV3::User,
            AddressTypeShared::Treasury => AddressTypeV3::Treasury,
            AddressTypeShared::Link => AddressTypeV3::Link,
        }
    }
}

impl AddressTypeV3 {
    pub fn to_shared(&self) -> AddressTypeShared {
        match self {
            AddressTypeV3::Creator => AddressTypeShared::Creator,
            AddressTypeV3::User => AddressTypeShared::User,
            AddressTypeV3::Treasury => AddressTypeShared::Treasury,
            AddressTypeV3::Link => AddressTypeShared::Link,
        }
    }
}
