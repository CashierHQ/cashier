// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v2::link_result::{LinkCreateActionResult, LinkProcessActionResult},
    repository::{
        action::v1::{Action, ActionType},
        intent::v1::Intent,
        link::v1::{Link, LinkState},
        transaction::v1::Transaction,
    },
};
use std::collections::HashMap;
use transaction_manager::traits::TransactionManager;

use crate::apps::{
    link_v2::links::{shared::send_link::actions::receive::ReceiveAction, traits::LinkV2State},
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

    /// Create RECEIVE action for the tip link
    /// # Arguments
    /// * `caller` - The principal of the user creating the action
    /// * `link` - The tip link for which the action is being created
    /// * `canister_id` - The canister ID of the backend canister
    /// * `transaction_manager` - The transaction manager to handle action creation
    /// # Returns
    /// * `Result<LinkCreateActionResult, CanisterError>` - The result of creating the RECEIVE action
    pub async fn create_receive_action<M>(
        caller: Principal,
        link: Link,
        canister_id: Principal,
        transaction_manager: M,
    ) -> Result<LinkCreateActionResult, CanisterError>
    where
        M: TransactionManager + 'static,
    {
        let receive_action = ReceiveAction::create(&link, caller, canister_id).await?;
        let create_action_result = transaction_manager.create_action(
            receive_action.action,
            receive_action.intents,
            None,
        )?;

        Ok(LinkCreateActionResult {
            link: link.clone(),
            create_action_result,
        })
    }

    /// Process a RECEIVE action on the active tip link
    /// # Arguments
    /// * `link` - The tip link being received
    /// * `action` - The receive action to be processed
    /// * `intents` - The intents associated with the action
    /// * `intent_txs_map` - A mapping of intent IDs to their associated transactions
    /// * `transaction_manager` - The transaction manager to handle the action processing
    /// # Returns
    /// * `Result<LinkProcessActionResult, CanisterError>` - The result of processing the receive action
    pub async fn receive<M>(
        link: &Link,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        transaction_manager: M,
    ) -> Result<LinkProcessActionResult, CanisterError>
    where
        M: TransactionManager + 'static,
    {
        let mut link = link.clone();

        let process_action_result = transaction_manager
            .process_action(action, intents, intent_txs_map)
            .await?;

        if process_action_result.is_success {
            link.link_use_action_counter += 1;
            if link.link_use_action_counter >= link.link_use_action_max_count {
                link.state = LinkState::InactiveEnded;
            }
        }

        Ok(LinkProcessActionResult {
            link,
            process_action_result,
        })
    }
}

impl LinkV2State for ActiveState {
    async fn create_action<M, F, S>(
        &self,
        caller: Principal,
        action_type: ActionType,
        transaction_manager: M,
        _token_fee_service: F,
        _token_standard_service: S,
    ) -> Result<LinkCreateActionResult, CanisterError>
    where
        M: TransactionManager + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
    {
        let link = self.link.clone();
        let canister_id = self.canister_id;

        match action_type {
            ActionType::Receive => {
                let create_action_result =
                    Self::create_receive_action(caller, link, canister_id, transaction_manager)
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
            ActionType::Receive => {
                let receive_result =
                    Self::receive(&link, action, intents, intent_txs_map, transaction_manager)
                        .await?;
                Ok(receive_result)
            }
            _ => Err(CanisterError::ValidationErrors(
                "Unsupported action type for ActiveState".to_string(),
            )),
        }
    }
}
