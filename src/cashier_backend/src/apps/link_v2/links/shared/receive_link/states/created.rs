// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::apps::link_v2::links::{
    shared::receive_link::actions::create::CreateAction, traits::LinkV2State,
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
use transaction_manager::traits::TransactionManager;

pub struct CreatedState<M: TransactionManager + 'static> {
    pub link: Link,
    pub canister_id: Principal,
    pub transaction_manager: Rc<M>,
}

impl<M: TransactionManager + 'static> CreatedState<M> {
    pub fn new(link: &Link, canister_id: Principal, transaction_manager: Rc<M>) -> Self {
        Self {
            link: link.clone(),
            canister_id,
            transaction_manager,
        }
    }

    /// Create CREATE action for the tip link
    /// # Arguments
    /// * `caller` - The principal of the user creating the action
    /// * `link` - The tip link for which the action is being created
    /// * `canister_id` - The canister ID of the backend canister
    /// * `transaction_manager` - The transaction manager to handle action creation
    /// # Returns
    /// * `Result<LinkCreateActionResult, CanisterError>` - The result of creating the CREATE action
    pub async fn create_create_action(
        caller: Principal,
        link: Link,
        canister_id: Principal,
        transaction_manager: Rc<M>,
    ) -> Result<LinkCreateActionResult, CanisterError> {
        // validate caller is the link creator
        if caller != link.creator {
            return Err(CanisterError::Unauthorized(
                "Only the creator can create CREATE action on this link".to_string(),
            ));
        }

        let create_action = CreateAction::create(&link, canister_id).await?;
        let create_action_result =
            transaction_manager.create_action(create_action.action, create_action.intents, None)?;

        Ok(LinkCreateActionResult {
            link: link.clone(),
            create_action_result,
        })
    }

    /// Process CREATE action to activate the tip link
    /// # Arguments
    /// * `caller` - The principal of the user activating the link
    /// * `link` - The tip link being activated
    /// * `action` - The create action to be processed
    /// * `intents` - The intents associated with the action
    /// * `intent_txs_map` - A mapping of intent IDs to their associated transactions
    /// * `transaction_manager` - The transaction manager to handle the action processing
    /// # Returns
    /// * `Result<LinkProcessActionResult, CanisterError>` - The result of processing the create action
    pub async fn activate(
        caller: Principal,
        link: Link,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        transaction_manager: Rc<M>,
    ) -> Result<LinkProcessActionResult, CanisterError> {
        if caller != link.creator {
            return Err(CanisterError::Unauthorized(
                "Only the creator can publish the link".to_string(),
            ));
        }

        let mut link = link.clone();

        let process_action_result = transaction_manager
            .process_action(action, intents, intent_txs_map)
            .await?;

        // if process action succeeds, activate the link
        if process_action_result.is_success {
            link.state = LinkState::Active;
        }

        Ok(LinkProcessActionResult {
            link,
            process_action_result,
        })
    }
}

impl<M: TransactionManager + 'static> LinkV2State for CreatedState<M> {
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
                ActionType::CreateLink => {
                    let create_action_result =
                        Self::create_create_action(caller, link, canister_id, transaction_manager)
                            .await?;
                    Ok(create_action_result)
                }
                _ => Err(CanisterError::ValidationErrors(
                    "Unsupported action type for Created state".to_string(),
                )),
            }
        })
    }

    fn process_action(
        &self,
        caller: Principal,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Pin<Box<dyn Future<Output = Result<LinkProcessActionResult, CanisterError>>>> {
        let link = self.link.clone();
        let transaction_manager = self.transaction_manager.clone();

        Box::pin(async move {
            match action.r#type {
                ActionType::CreateLink => {
                    let activate_link_result = Self::activate(
                        caller,
                        link,
                        action,
                        intents,
                        intent_txs_map,
                        transaction_manager,
                    )
                    .await?;
                    Ok(activate_link_result)
                }
                _ => Err(CanisterError::ValidationErrors(
                    "Unsupported action type for Created state".to_string(),
                )),
            }
        })
    }
}
