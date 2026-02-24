// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v2::link_result::{LinkCreateActionResult, LinkProcessActionResult},
    repository::{
        action::v1::{Action, ActionType},
        intent::v1::Intent,
        link::v1::Link,
        transaction::v1::Transaction,
    },
};
<<<<<<< HEAD
use std::{collections::HashMap, future::Future, pin::Pin, rc::Rc};
use transaction_manager::v2::traits::TransactionManager;
=======
use std::collections::HashMap;
use transaction_manager::traits::TransactionManager;
>>>>>>> feature/icrc-standard-intents

use crate::apps::{
    link_v2::links::{shared::receive_link::actions::send::SendAction, traits::LinkV2State},
    token_balance::traits::TokenBalanceFetcher,
    token_fee::traits::TokenFeeCache,
    token_standard::traits::TokenStandardCache,
};

pub struct ActiveState {
    pub link: Link,
    pub canister_id: Principal,
}

impl ActiveState {
    pub fn new(link: &Link, canister_id: Principal) -> Self {
        Self {
            link: link.clone(),
            canister_id,
        }
    }

    /// Create SEND action for the tip link
    /// # Arguments
    /// * `caller` - The principal of the user creating the action
    /// * `link` - The tip link for which the action is being created
    /// * `canister_id` - The canister ID of the backend canister
    /// * `transaction_manager` - The transaction manager to handle action creation
    /// # Returns
    /// * `Result<LinkCreateActionResult, CanisterError>` - The result of creating the SEND action
    pub async fn create_send_action<M, F>(
        caller: Principal,
        link: Link,
        canister_id: Principal,
        transaction_manager: M,
        token_fee_service: F,
    ) -> Result<LinkCreateActionResult, CanisterError>
    where
        M: TransactionManager + 'static,
        F: TokenFeeCache + 'static,
    {
        let send_action = SendAction::create(&link, caller, canister_id, token_fee_service).await?;
        let create_action_result =
            transaction_manager.create_action(send_action.action, send_action.intents, None)?;

        Ok(LinkCreateActionResult {
            link: link.clone(),
            create_action_result,
        })
    }

    /// Process a SEND action on the active tip link
    /// # Arguments
    /// * `link` - The tip link being sent
    /// * `action` - The send action to be processed
    /// * `intents` - The intents associated with the action
    /// * `intent_txs_map` - A mapping of intent IDs to their associated transactions
    /// * `transaction_manager` - The transaction manager to handle the action processing
    /// # Returns
    /// * `Result<LinkProcessActionResult, CanisterError>` - The result of processing the send action
    pub async fn send<M>(
        link: &Link,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        transaction_manager: M,
    ) -> Result<LinkProcessActionResult, CanisterError>
    where
        M: TransactionManager + 'static,
    {
        let process_action_result = transaction_manager
            .process_action(action, intents, intent_txs_map)
            .await?;

        Ok(LinkProcessActionResult {
            link: link.clone(),
            process_action_result,
        })
    }
}

impl LinkV2State for ActiveState {
    async fn create_action<M, F, S, B>(
        &self,
        caller: Principal,
        action_type: ActionType,
        transaction_manager: M,
        token_fee_service: F,
        _token_standard_service: S,
        _token_balance_service: B,
    ) -> Result<LinkCreateActionResult, CanisterError>
    where
        M: TransactionManager + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
        B: TokenBalanceFetcher + 'static,
    {
        let link = self.link.clone();
        let canister_id = self.canister_id;

        match action_type {
            ActionType::Send => {
                let create_action_result = Self::create_send_action(
                    caller,
                    link,
                    canister_id,
                    transaction_manager,
                    token_fee_service,
                )
                .await?;
                Ok(create_action_result)
            }
            _ => Err(CanisterError::ValidationErrors(
                "Unsupported action type for ActiveState".to_string(),
            )),
        }
    }

    async fn process_action<M>(
        &self,
        _caller: Principal,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        transaction_manager: M,
    ) -> Result<LinkProcessActionResult, CanisterError>
    where
        M: TransactionManager + 'static,
    {
        let link = self.link.clone();
        match action.r#type {
            ActionType::Send => {
                let send_result =
                    Self::send(&link, action, intents, intent_txs_map, transaction_manager).await?;
                Ok(send_result)
            }
            _ => Err(CanisterError::ValidationErrors(
                "Unsupported action type for ActiveState".to_string(),
            )),
        }
    }
}
