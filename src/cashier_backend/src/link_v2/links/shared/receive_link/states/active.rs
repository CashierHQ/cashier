// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::link_v2::{
    links::{
        shared::receive_link::actions::{receive::ReceiveAction, send::SendAction},
        traits::LinkV2State,
    },
    transaction_manager::traits::TransactionManager,
};
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
use std::{collections::HashMap, future::Future, pin::Pin, rc::Rc};

pub struct ActiveState<M: TransactionManager + 'static> {
    pub link: Link,
    pub canister_id: Principal,
    pub transaction_manager: Rc<M>,
}

impl<M: TransactionManager + 'static> ActiveState<M> {
    pub fn new(link: &Link, canister_id: Principal, transaction_manager: Rc<M>) -> Self {
        Self {
            link: link.clone(),
            canister_id,
            transaction_manager,
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
    pub async fn create_receive_action(
        caller: Principal,
        link: Link,
        canister_id: Principal,
        transaction_manager: Rc<M>,
    ) -> Result<LinkCreateActionResult, CanisterError> {
        // only creator can create receive action
        if caller != link.creator {
            return Err(CanisterError::ValidationErrors(
                "Only the link creator can create a RECEIVE action".to_string(),
            ));
        }

        let receive_action = ReceiveAction::create(&link, caller, canister_id).await?;
        let create_action_result = transaction_manager
            .create_action(receive_action.action, receive_action.intents, None)
            .await?;

        Ok(LinkCreateActionResult {
            link: link.clone(),
            create_action_result,
        })
    }

    /// Create SEND action for the tip link
    /// # Arguments
    /// * `link` - The tip link for which the action is being created
    /// * `canister_id` - The canister ID of the backend canister
    /// * `transaction_manager` - The transaction manager to handle action creation
    /// # Returns
    /// * `Result<LinkCreateActionResult, CanisterError>` - The result of creating the SEND action
    pub async fn create_send_action(
        link: Link,
        canister_id: Principal,
        transaction_manager: Rc<M>,
    ) -> Result<LinkCreateActionResult, CanisterError> {
        let send_action = SendAction::create(&link, canister_id).await?;
        let create_action_result = transaction_manager
            .create_action(send_action.action, send_action.intents, None)
            .await?;

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
    pub async fn receive(
        link: &Link,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        transaction_manager: Rc<M>,
    ) -> Result<LinkProcessActionResult, CanisterError> {
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

    /// Process a SEND action on the active tip link
    /// # Arguments
    /// * `link` - The tip link being sent
    /// * `action` - The send action to be processed
    /// * `intents` - The intents associated with the action
    /// * `intent_txs_map` - A mapping of intent IDs to their associated transactions
    /// * `transaction_manager` - The transaction manager to handle the action processing
    /// # Returns
    /// * `Result<LinkProcessActionResult, CanisterError>` - The result of processing the send action
    pub async fn send(
        link: &Link,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        transaction_manager: Rc<M>,
    ) -> Result<LinkProcessActionResult, CanisterError> {
        let process_action_result = transaction_manager
            .process_action(action, intents, intent_txs_map)
            .await?;

        Ok(LinkProcessActionResult {
            link: link.clone(),
            process_action_result,
        })
    }
}

impl<M: TransactionManager + 'static> LinkV2State for ActiveState<M> {
    fn create_action(
        &self,
        caller: Principal,
        action_type: ActionType,
    ) -> Pin<Box<dyn Future<Output = Result<LinkCreateActionResult, CanisterError>>>> {
        let link = self.link.clone();
        let canister_id = self.canister_id;
        let transaction_manager = self.transaction_manager.clone();

        Box::pin(async move {
            match action_type {
                ActionType::Receive => {
                    let create_action_result =
                        Self::create_receive_action(caller, link, canister_id, transaction_manager)
                            .await?;
                    Ok(create_action_result)
                }
                ActionType::Send => {
                    let create_action_result =
                        Self::create_send_action(link, canister_id, transaction_manager).await?;
                    Ok(create_action_result)
                }
                _ => Err(CanisterError::ValidationErrors(
                    "Unsupported action type for ActiveState".to_string(),
                )),
            }
        })
    }

    fn process_action(
        &self,
        _caller: Principal,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Pin<Box<dyn Future<Output = Result<LinkProcessActionResult, CanisterError>>>> {
        let link = self.link.clone();
        let transaction_manager = self.transaction_manager.clone();

        Box::pin(async move {
            match action.r#type {
                ActionType::Receive => {
                    let receive_result =
                        Self::receive(&link, action, intents, intent_txs_map, transaction_manager)
                            .await?;
                    Ok(receive_result)
                }
                ActionType::Send => {
                    let send_result =
                        Self::send(&link, action, intents, intent_txs_map, transaction_manager)
                            .await?;
                    Ok(send_result)
                }
                _ => Err(CanisterError::ValidationErrors(
                    "Unsupported action type for ActiveState".to_string(),
                )),
            }
        })
    }
}
