// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_backend_types::error::CanisterError;
use futures::future;
use std::collections::HashMap;
use transaction_manager::icrc_token::{service::IcrcService, types::Account};

use crate::apps::token_balance::traits::TokenBalanceFetcher;

pub struct TokenBalanceService;

impl TokenBalanceFetcher for TokenBalanceService {
    async fn get_batch_token_balances(
        &self,
        account: &Account,
        token_principals: &[Principal],
    ) -> Result<HashMap<Principal, Nat>, CanisterError> {
        let mut balance_map = HashMap::new();
        let get_balance_tasks = token_principals
            .iter()
            .map(|address| {
                let account = account.clone();
                async move {
                    let service = IcrcService::new(*address);
                    let service_account = Account {
                        owner: account.owner,
                        subaccount: account.subaccount,
                    };
                    let balance_res = service.icrc_1_balance_of(&service_account).await;
                    (*address, balance_res)
                }
            })
            .collect::<Vec<_>>();

        let results = future::join_all(get_balance_tasks).await;
        for (address, result) in results {
            match result {
                Ok(balance) => {
                    balance_map.insert(address, balance);
                }
                Err(err) => {
                    return Err(CanisterError::CallCanisterFailed(format!(
                        "Failed to get balance for asset {}: {:?}",
                        address.to_text(),
                        err,
                    )));
                }
            }
        }

        Ok(balance_map)
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use candid::Nat;

    pub struct MockTokenBalanceService {
        pub balances: HashMap<Principal, Nat>,
    }

    impl MockTokenBalanceService {
        pub fn new() -> Self {
            Self {
                balances: HashMap::new(),
            }
        }

        pub fn set_balance(&mut self, token_principal: Principal, balance: Nat) {
            self.balances.insert(token_principal, balance);
        }
    }

    impl TokenBalanceFetcher for MockTokenBalanceService {
        async fn get_batch_token_balances(
            &self,
            _account: &Account,
            token_principals: &[Principal],
        ) -> Result<HashMap<Principal, Nat>, CanisterError> {
            let mut balance_map = HashMap::new();
            for principal in token_principals {
                if let Some(balance) = self.balances.get(principal) {
                    balance_map.insert(*principal, balance.clone());
                } else {
                    return Err(CanisterError::HandleLogicError(format!(
                        "Not found balance for token {}",
                        principal.to_text()
                    )));
                }
            }
            Ok(balance_map)
        }
    }
}
