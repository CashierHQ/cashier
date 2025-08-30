// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;

use crate::repositories::{Repositories, action};

pub struct ValidateService<R: Repositories> {
    action_repository: action::ActionRepository<R::Action>,
}

impl<R: Repositories> ValidateService<R> {
    pub fn new(repo: &R) -> Self {
        Self {
            action_repository: repo.action(),
        }
    }

    pub fn is_action_creator(&self, caller: Principal, action_id: &str) -> Result<bool, String> {
        let action = self.action_repository.get(action_id);
        match action {
            Some(action) => Ok(action.creator == caller),
            None => Err("Action not found".to_string()),
        }
    }
}
