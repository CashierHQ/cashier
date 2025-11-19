// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::link_v2::{
    links::{
        shared::receive_link::states::{
            active::ActiveState, created::CreatedState, inactive::InactiveState,
        },
        traits::{LinkV2, LinkV2State},
    },
    transaction_manager::traits::TransactionManager,
};
use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v2::link_result::{LinkCreateActionResult, LinkProcessActionResult},
    repository::{
        action::v1::{Action, ActionType},
        asset_info::AssetInfo,
        intent::v1::Intent,
        link::v1::{Link, LinkState, LinkType},
        transaction::v1::Transaction,
    },
};
use std::{collections::HashMap, future::Future, pin::Pin, rc::Rc};
use uuid::Uuid;

pub struct PaymentLink<M: TransactionManager + 'static> {
    pub link: Link,
    pub canister_id: Principal,
    pub transaction_manager: Rc<M>,
}

impl<M: TransactionManager + 'static> PaymentLink<M> {
    pub fn new(link: Link, canister_id: Principal, transaction_manager: Rc<M>) -> Self {
        Self {
            link,
            canister_id,
            transaction_manager,
        }
    }

    /// Create a new PaymentLink instance
    /// # Arguments
    /// * `creator` - The principal of the user creating the link
    /// * `title` - The title of the link
    /// * `asset_info` - The asset information associated with the link
    /// * `max_use` - The maximum number of times the link can be used
    /// * `created_at_ts` - The timestamp when the link is created
    /// * `canister_id` - The canister ID of the backend canister
    /// * `transaction_manager` - The transaction manager to handle link actions
    /// # Returns
    /// * `PaymentLink` - The newly created PaymentLink instance
    pub fn create(
        creator: Principal,
        title: String,
        asset_info: Vec<AssetInfo>,
        max_use: u64,
        created_at_ts: u64,
        canister_id: Principal,
        transaction_manager: Rc<M>,
    ) -> Self {
        let new_link = Link {
            id: Uuid::new_v4().to_string(),
            link_type: LinkType::SendAirdrop,
            title,
            asset_info,
            link_use_action_counter: 0,
            link_use_action_max_count: max_use,
            creator,
            state: LinkState::CreateLink,
            create_at: created_at_ts,
        };

        Self::new(new_link, canister_id, transaction_manager)
    }

    /// Get the appropriate state handler for the current link state
    /// # Arguments
    /// * `link` - The Link model
    /// * `canister_id` - The canister ID of the backend canister
    /// * `fee_map` - A map of canister principals to their corresponding fees
    /// # Returns
    /// * `Result<Box<dyn LinkV2State>, CanisterError>` - The resulting state handler or an error if the state is unsupported
    pub fn get_state_handler(
        link: &Link,
        canister_id: Principal,
        transaction_manager: Rc<M>,
    ) -> Result<Box<dyn LinkV2State>, CanisterError> {
        match link.state {
            LinkState::CreateLink => Ok(Box::new(CreatedState::new(
                link,
                canister_id,
                transaction_manager,
            ))),
            LinkState::Active => Ok(Box::new(ActiveState::new(
                link,
                canister_id,
                transaction_manager,
            ))),
            LinkState::Inactive => Ok(Box::new(InactiveState::new(
                link,
                canister_id,
                transaction_manager,
            ))),
            _ => Err(CanisterError::ValidationErrors(
                "Unsupported link state".to_string(),
            )),
        }
    }
}

impl<M: TransactionManager + 'static> LinkV2 for PaymentLink<M> {
    /// Creates an action for the PaymentLink.
    /// # Arguments
    /// * `caller` - The caller principal.
    /// * `action_type` - The type of action to be created.
    /// # Returns
    /// * `Pin<Box<dyn Future<Output = Result<CreateActionResult, CanisterError>>>>` - A future that resolves to the resulting action or an error if the creation fails.
    fn create_action(
        &self,
        caller: Principal,
        action_type: ActionType,
    ) -> Pin<Box<dyn Future<Output = Result<LinkCreateActionResult, CanisterError>>>> {
        let link = self.link.clone();
        let canister_id = self.canister_id;
        let transaction_manager = self.transaction_manager.clone();

        Box::pin(async move {
            let state = PaymentLink::get_state_handler(&link, canister_id, transaction_manager)?;
            let create_action_result = state.create_action(caller, action_type).await?;
            Ok(create_action_result)
        })
    }

    /// Processes an action for the PaymentLink.
    /// # Arguments
    /// * `caller` - The caller principal.
    /// * `action` - The action to be processed.
    /// * `intents` - The intents associated with the action.
    /// * `intent_txs_map` - A map of intent IDs to their corresponding transactions.
    /// # Returns
    /// * `Pin<Box<dyn Future<Output = Result<LinkProcessActionResult, CanisterError>>>>` - A future that resolves to the resulting action or an error if the processing fails.
    fn process_action(
        &self,
        caller: Principal,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Pin<Box<dyn Future<Output = Result<LinkProcessActionResult, CanisterError>>>> {
        let link = self.link.clone();
        let canister_id = self.canister_id;
        let transaction_manager = self.transaction_manager.clone();

        Box::pin(async move {
            let state = PaymentLink::get_state_handler(&link, canister_id, transaction_manager)?;
            let process_action_result = state
                .process_action(caller, action, intents, intent_txs_map)
                .await?;
            Ok(process_action_result)
        })
    }
}
