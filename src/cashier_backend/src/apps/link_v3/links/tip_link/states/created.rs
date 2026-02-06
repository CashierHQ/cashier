// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::apps::link_v3::traits::{LinkV3, LinkV3State};
use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v3::{
        action_result::{CreateActionResult, ProcessActionResult},
        link_result::{LinkCreateActionResult, LinkProcessActionResult},
    },
    repository::{
        action::v1::{Action, ActionType},
        intent::v1::Intent,
        link::v1::{Link, LinkState},
        transaction::v1::Transaction,
    },
};
use cashier_shared::types::{Action as ActionShared, ActionType as ActionTypeShared};
use std::{collections::HashMap, future::Future, pin::Pin, rc::Rc};
use transaction_manager::v3::traits::TransactionManagerV3;

pub struct CreatedState<M: TransactionManagerV3 + 'static> {
    pub link: Link,
    pub canister_id: Principal,
    pub transaction_manager: Rc<M>,
}

impl<M: TransactionManagerV3 + 'static> CreatedState<M> {
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
    pub async fn create_action(
        caller: Principal,
        link: Link,
        action: ActionShared,
        transaction_manager: Rc<M>,
    ) -> Result<LinkCreateActionResult, CanisterError> {
        // validate caller is the link creator
        if caller != link.creator {
            return Err(CanisterError::Unauthorized(
                "Only the creator can create CREATE action on this link".to_string(),
            ));
        }

        let create_action_result = transaction_manager.create_action(link.id.clone(), action)?;

        Ok(LinkCreateActionResult {
            link,
            create_action_result,
        })
    }

    pub async fn activate(
        caller: Principal,
        link: Link,
        action: ActionShared,
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
            .process_action(link.id.clone(), action, intent_txs_map)
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

impl<M: TransactionManagerV3 + 'static> LinkV3State for CreatedState<M> {
    fn create_action(
        &self,
        caller: Principal,
        action: ActionShared,
    ) -> Pin<Box<dyn Future<Output = Result<LinkCreateActionResult, CanisterError>>>> {
        let link = self.link.clone();
        let _canister_id = self.canister_id;
        let transaction_manager = self.transaction_manager.clone();

        Box::pin(async move {
            match action.action_type {
                ActionTypeShared::CreateLink => {
                    let create_action_result =
                        Self::create_action(caller, link, action, transaction_manager).await?;
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
        action: ActionShared,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Pin<Box<dyn Future<Output = Result<LinkProcessActionResult, CanisterError>>>> {
        let link = self.link.clone();
        let transaction_manager = self.transaction_manager.clone();

        Box::pin(async move {
            match action.action_type {
                ActionTypeShared::CreateLink => {
                    let activate_link_result =
                        Self::activate(caller, link, action, intent_txs_map, transaction_manager)
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
