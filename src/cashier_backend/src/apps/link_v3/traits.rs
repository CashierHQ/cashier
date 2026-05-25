// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v3::link_result::{LinkCreateActionResult, LinkProcessActionResult},
    repository::{
        action::{v1::ActionType, v3::ActionV3},
        intent::v3::IntentV3,
        transaction::v1::Transaction,
    },
};
use std::collections::HashMap;
use transaction_manager::{
    transaction::traits::{ExecutionService, ValidationService},
    v3::traits::TransactionManagerV3,
};

use crate::apps::{
    token_balance::traits::TokenBalanceFetcher, token_fee::traits::TokenFeeCache,
    token_standard::traits::TokenStandardCache,
};

/// Validates that all gates for a link are open for a given user.
/// Implementations read from a local cache (no inter-canister call).
pub trait GateValidator {
    /// Returns `Ok(())` if all gates are open, `Err(Unauthorized)` otherwise.
    fn check_all_gates_open(&self, link_id: &str, user: Principal) -> Result<(), CanisterError>;
}

/// A no-op gate validator that always passes — used for `CreateLink` actions where
/// the creator is never required to open their own gate.
pub struct NoGateValidator;

impl GateValidator for NoGateValidator {
    fn check_all_gates_open(&self, _link_id: &str, _user: Principal) -> Result<(), CanisterError> {
        Ok(())
    }
}

pub trait LinkV3Instance {
    /// Create an action associated with the link
    /// # Arguments
    /// * `caller` - The principal of the user creating the action
    /// * `action` - The type of action to be created
    /// # Returns
    /// * `LinkCreateActionResult` - The result containing the updated link and action creation result
    /// # Errors
    /// * `CanisterError` - If there is an error during action creation
    #[allow(clippy::too_many_arguments)]
    async fn create_action<M, F, S, B>(
        &self,
        caller: Principal,
        action_type: ActionType,
        created_at: u64,
        transaction_manager: M,
        token_fee_service: F,
        token_standard_service: S,
        token_balance_service: B,
    ) -> Result<LinkCreateActionResult, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
        B: TokenBalanceFetcher + 'static;

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
    #[allow(clippy::too_many_arguments)]
    async fn process_action<M, V, X>(
        &self,
        caller: Principal,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        transaction_manager: M,
        validator_service: V,
        execution_service: X,
    ) -> Result<LinkProcessActionResult, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
        V: ValidationService + 'static,
        X: ExecutionService + 'static;
}

pub trait LinkV3State {
    /// Create an action associated with the link
    /// # Arguments
    /// * `caller` - The principal of the user creating the action
    /// * `action` - The type of action to be created
    /// # Returns
    /// * `LinkCreateActionResult` - The result containing the updated link and action creation result
    /// # Errors
    /// * `CanisterError` - If there is an error during action creation
    #[allow(clippy::too_many_arguments)]
    async fn create_action<M, F, S, B>(
        &self,
        caller: Principal,
        action_type: ActionType,
        created_at: u64,
        transaction_manager: M,
        token_fee_service: F,
        token_standard_service: S,
        token_balance_service: B,
    ) -> Result<LinkCreateActionResult, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
        B: TokenBalanceFetcher + 'static;

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
    #[allow(clippy::too_many_arguments)]
    async fn process_action<M, V, X>(
        &self,
        caller: Principal,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        transaction_manager: M,
        validator_service: V,
        execution_service: X,
    ) -> Result<LinkProcessActionResult, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
        V: ValidationService + 'static,
        X: ExecutionService + 'static;
}
