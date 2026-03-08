// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v3::link_result::{LinkCreateActionResult, LinkProcessActionResult},
    repository::{
        action::{
            v1::{Action, ActionType},
            v3::ActionV3,
        },
        intent::{v1::Intent, v3::IntentV3},
        link::v3::{LinkState, LinkV3},
        transaction::v1::Transaction,
    },
};
use std::{collections::HashMap, future::Future, pin::Pin, rc::Rc};
use token_storage_types::token;
use transaction_manager::{
    transaction::traits::{ExecutionService, ValidationService},
    v3::traits::TransactionManagerV3,
};

use crate::apps::{
    link_v3::{links::shared::send_link::actions::withdraw::WithdrawAction, traits::LinkV3State},
    token_balance::traits::TokenBalanceFetcher,
    token_fee::traits::TokenFeeCache,
    token_standard::traits::TokenStandardCache,
};

pub struct InactiveState {
    pub link: LinkV3,
    pub canister_id: Principal,
}

impl InactiveState {
    pub fn new(link: &LinkV3, canister_id: Principal) -> Self {
        Self {
            link: link.clone(),
            canister_id,
        }
    }

    /// Create WITHDRAW action for the inactive tip link
    /// # Arguments
    /// * `caller` - The principal of the user creating the action
    /// * `link` - The tip link for which the action is being created
    /// * `canister_id` - The canister ID of the backend canister
    /// * `transaction_manager` - The transaction manager to handle action creation
    /// # Returns
    /// * `Result<LinkCreateActionResult, CanisterError>` - The result of creating the WITHDRAW action
    pub async fn create_withdraw_action<M, F, B>(
        caller: Principal,
        canister_id: Principal,
        link: LinkV3,
        created_at: u64,
        transaction_manager: M,
        token_fee_service: F,
        token_balance_service: B,
    ) -> Result<LinkCreateActionResult, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
        F: TokenFeeCache + 'static,
        B: TokenBalanceFetcher + 'static,
    {
        if caller != link.creator {
            return Err(CanisterError::Unauthorized(
                "Only the creator can create WITHDRAW action on this link".to_string(),
            ));
        }

        let withdraw_action = WithdrawAction::create(
            &link,
            canister_id,
            created_at,
            token_fee_service,
            token_balance_service,
        )
        .await?;
        let create_action_result = transaction_manager.create_action(
            withdraw_action.action,
            withdraw_action.intents,
            None,
        )?;

        Ok(LinkCreateActionResult {
            link: link.clone(),
            create_action_result,
        })
    }

    /// Process a WITHDRAW action on the inactive tip link
    /// # Arguments
    /// * `link` - The tip link being withdrawn
    /// * `action` - The withdraw action to be processed
    /// * `intents` - The intents associated with the action
    /// * `intent_txs_map` - A mapping of intent IDs to their associated transactions
    /// * `transaction_manager` - The transaction manager to handle the action processing
    /// # Returns
    /// * `Result<LinkProcessActionResult, CanisterError>` - The result of processing the withdraw action
    pub async fn withdraw<M, V, X>(
        caller: Principal,
        link: LinkV3,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        transaction_manager: M,
        validator_service: V,
        executor_service: X,
    ) -> Result<LinkProcessActionResult, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
        V: ValidationService + 'static,
        X: ExecutionService + 'static,
    {
        if caller != link.creator {
            return Err(CanisterError::Unauthorized(
                "Only the creator can process WITHDRAW action on this link".to_string(),
            ));
        }

        let mut link = link.clone();

        let process_action_result = transaction_manager
            .process_action(
                action,
                intents,
                intent_txs_map,
                validator_service,
                executor_service,
            )
            .await?;

        if process_action_result.is_success {
            link.state = LinkState::Ended;
        }

        Ok(LinkProcessActionResult {
            link,
            process_action_result,
        })
    }
}

impl LinkV3State for InactiveState {
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
        B: TokenBalanceFetcher + 'static,
    {
        let link = self.link.clone();
        let canister_id = self.canister_id;

        match action_type {
            ActionType::Withdraw => {
                let create_action_result = Self::create_withdraw_action(
                    caller,
                    canister_id,
                    link,
                    created_at,
                    transaction_manager,
                    token_fee_service,
                    token_balance_service,
                )
                .await?;
                Ok(create_action_result)
            }
            _ => Err(CanisterError::ValidationErrors(
                "Unsupported action type for InactiveState".to_string(),
            )),
        }
    }

    async fn process_action<M, V, X>(
        &self,
        caller: Principal,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_txs_map: std::collections::HashMap<String, Vec<Transaction>>,
        transaction_manager: M,
        validator_service: V,
        executor_service: X,
    ) -> Result<LinkProcessActionResult, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
        V: ValidationService + 'static,
        X: ExecutionService + 'static,
    {
        let link = self.link.clone();

        match action.action_type {
            ActionType::Withdraw => {
                let withdraw_result = Self::withdraw(
                    caller,
                    link,
                    action,
                    intents,
                    intent_txs_map,
                    transaction_manager,
                    validator_service,
                    executor_service,
                )
                .await?;
                Ok(withdraw_result)
            }
            _ => Err(CanisterError::ValidationErrors(
                "Unsupported action type for InactiveState".to_string(),
            )),
        }
    }
}
