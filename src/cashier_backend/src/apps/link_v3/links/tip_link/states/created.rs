// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::apps::link_v3::traits::{LinkV3Instance, LinkV3State};
use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v3::link_result::LinkCreateActionResult,
    repository::{
        action::{v1::ActionType, v3::ActionV3},
        intent::v3::IntentV3,
        link::v3::LinkV3,
    },
};
use std::{future::Future, pin::Pin, rc::Rc};
use transaction_manager::v3::traits::TransactionManagerV3;

pub struct CreatedState<M: TransactionManagerV3 + 'static> {
    pub link: LinkV3,
    pub canister_id: Principal,
    pub transaction_manager: Rc<M>,
}

impl<M: TransactionManagerV3 + 'static> CreatedState<M> {
    pub fn new(link: &LinkV3, canister_id: Principal, transaction_manager: Rc<M>) -> Self {
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
        link: LinkV3,
        action: ActionV3,
        intents: Vec<IntentV3>,
        transaction_manager: Rc<M>,
    ) -> Result<LinkCreateActionResult, CanisterError> {
        // validate caller is the link creator
        if caller != link.creator {
            return Err(CanisterError::Unauthorized(
                "Only the creator can create CREATE action on this link".to_string(),
            ));
        }

        let create_action_result =
            transaction_manager.create_action(link.id.clone(), action, intents, None)?;

        Ok(LinkCreateActionResult {
            link,
            create_action_result,
        })
    }
}

impl<M: TransactionManagerV3 + 'static> LinkV3State for CreatedState<M> {
    fn create_action(
        &self,
        caller: Principal,
        action: ActionV3,
        intents: Vec<IntentV3>,
    ) -> Pin<Box<dyn Future<Output = Result<LinkCreateActionResult, CanisterError>>>> {
        let link = self.link.clone();
        let _canister_id = self.canister_id;
        let transaction_manager = self.transaction_manager.clone();

        Box::pin(async move {
            match action.action_type {
                ActionType::CreateLink => {
                    let create_action_result =
                        Self::create_action(caller, link, action, intents, transaction_manager)
                            .await?;
                    Ok(create_action_result)
                }
                _ => Err(CanisterError::ValidationErrors(
                    "Unsupported action type for Created state".to_string(),
                )),
            }
        })
    }
}
