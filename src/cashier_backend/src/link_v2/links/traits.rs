// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v2::link_result::{LinkCreateActionResult, LinkProcessActionResult},
    repository::{
        action::v1::{Action, ActionType},
        intent::v1::Intent,
        transaction::v1::Transaction,
    },
};
use std::{collections::HashMap, future::Future, pin::Pin};

pub trait LinkV2 {
    /// Create an action associated with the link
    /// # Arguments
    /// * `caller` - The principal of the user creating the action
    /// * `action` - The type of action to be created
    /// # Returns
    /// * `LinkCreateActionResult` - The result containing the updated link and action creation result
    /// # Errors
    /// * `CanisterError` - If there is an error during action creation
    fn create_action(
        &self,
        caller: Principal,
        action: ActionType,
    ) -> Pin<Box<dyn Future<Output = Result<LinkCreateActionResult, CanisterError>>>>;

    /// Process an action associated with the link
    /// # Arguments
    /// * `caller` - The principal of the user processing the action
    /// * `action` - The action to be processed
    /// * `intents` - The intents associated with the action
    /// * `intent_txs_map` - A mapping of intent IDs to their associated transactions
    /// # Returns
    /// * `LinkProcessActionResult` - The result containing the updated link and action processing result
    /// # Errors
    /// * `CanisterError` - If there is an error during action processing
    fn process_action(
        &self,
        _caller: Principal,
        _action: Action,
        _intents: Vec<Intent>,
        _intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Pin<Box<dyn Future<Output = Result<LinkProcessActionResult, CanisterError>>>> {
        Box::pin(async move { Err(CanisterError::from("process_action not implemented")) })
    }
}

pub trait LinkV2State {
    /// Create an action associated with the link
    /// # Arguments
    /// * `caller` - The principal of the user creating the action
    /// * `action` - The type of action to be created
    /// # Returns
    /// * `LinkCreateActionResult` - The result containing the updated link and action creation result
    /// # Errors
    /// * `CanisterError` - If there is an error during action creation
    fn create_action(
        &self,
        _caller: Principal,
        _action: ActionType,
    ) -> Pin<Box<dyn Future<Output = Result<LinkCreateActionResult, CanisterError>>>> {
        Box::pin(async move { Err(CanisterError::from("create_action not implemented")) })
    }

    /// Process an action associated with the link
    /// # Arguments
    /// * `caller` - The principal of the user processing the action
    /// * `action` - The action to be processed
    /// * `intents` - The intents associated with the action
    /// * `intent_txs_map` - A mapping of intent IDs to their associated transactions
    /// # Returns
    /// * `LinkProcessActionResult` - The result containing the updated link and action processing result
    /// # Errors
    /// * `CanisterError` - If there is an error during action processing
    fn process_action(
        &self,
        _caller: Principal,
        _action: Action,
        _intents: Vec<Intent>,
        _intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Pin<Box<dyn Future<Output = Result<LinkProcessActionResult, CanisterError>>>> {
        Box::pin(async move { Err(CanisterError::from("process_action not implemented")) })
    }
}
