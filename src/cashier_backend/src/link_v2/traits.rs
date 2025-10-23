// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v2::link_result::{LinkCreateActionResult, LinkProcessActionResult},
    repository::action::v1::{Action, ActionType},
};
use std::{fmt::Debug, future::Future, pin::Pin};

pub trait LinkV2: Debug {
    /// Create an action associated with the link
    /// # Arguments
    /// * `caller` - The principal of the user creating the action
    /// * `action` - The type of action to be created
    /// * `created_at_ts` - The timestamp when the action is created
    /// # Returns
    /// * `CreateActionResult` - The result containing the created action and associated intents and transactions
    /// # Errors
    /// * `CanisterError` - If there is an error during action creation
    fn create_action(
        &self,
        caller: Principal,
        action: ActionType,
    ) -> Pin<Box<dyn Future<Output = Result<LinkCreateActionResult, CanisterError>>>>;

    fn process_action(
        &self,
        caller: Principal,
        action: Action,
    ) -> Pin<Box<dyn Future<Output = Result<LinkProcessActionResult, CanisterError>>>> {
        Box::pin(async move { Err(CanisterError::from("process_action not implemented")) })
    }
}

pub trait LinkV2State: Debug {
    fn create_action(
        &self,
        caller: Principal,
        action: ActionType,
    ) -> Pin<Box<dyn Future<Output = Result<LinkCreateActionResult, CanisterError>>>> {
        Box::pin(async move { Err(CanisterError::from("create_action not implemented")) })
    }

    fn process_action(
        &self,
        caller: Principal,
        action: Action,
    ) -> Pin<Box<dyn Future<Output = Result<LinkProcessActionResult, CanisterError>>>> {
        Box::pin(async move { Err(CanisterError::from("process_action not implemented")) })
    }
}
