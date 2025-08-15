// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repositories::{action, user_wallet, Repositories};

pub struct ValidateService<R: Repositories> {
    user_wallet_repository: user_wallet::UserWalletRepository<R::UserWallet>,
    action_repository: action::ActionRepository<R::Action>,
}

impl <R: Repositories> ValidateService<R> {
    pub fn new(repo: &R,
    ) -> Self {
        Self {
            user_wallet_repository: repo.user_wallet(),
            action_repository: repo.action(),
        }
    }

    pub fn is_action_creator(&self, caller: &str, action_id: &str) -> Result<bool, String> {
        let user_wallet = match self.user_wallet_repository.get(caller) {
            Some(user_id) => user_id,
            None => {
                return Err("User not found".to_string());
            }
        };
        let action = self.action_repository.get(action_id);
        match action {
            Some(action) => Ok(action.creator == user_wallet.user_id),
            None => Err("Action not found".to_string()),
        }
    }
}
