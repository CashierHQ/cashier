// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Principal};
use icrc_ledger_types::icrc1::account::{Account, Subaccount};
use serde::{Deserialize, Serialize};
use std::fmt::Display;

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

    /// Returns the address of the asset
    /// # Returns
    /// * `Principal` - The principal address of the asset
    pub fn get_address(&self) -> Principal {
        match self {
            Asset::IC { address } => *address,
        }
    }
}

impl Display for Asset {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Asset::IC { address } => write!(f, "ic_asset_{}", address),
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

#[cfg(test)]
mod tests {
    use super::*;
    use cashier_common::test_utils::random_principal_id;

    #[test]
    fn it_should_get_asset_address() {
        // Arrange
        let ledger_id = random_principal_id();
        let asset = Asset::IC { address: ledger_id };

        // Act
        let address = asset.get_address();

        // Assert
        assert_eq!(address, ledger_id);
    }
}
