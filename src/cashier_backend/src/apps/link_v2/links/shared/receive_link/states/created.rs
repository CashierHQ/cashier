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
    link_v2::links::{shared::receive_link::actions::create::CreateAction, traits::LinkV2State},
    token_balance::traits::TokenBalanceFetcher,
    token_fee::traits::TokenFeeCache,
    token_standard::traits::TokenStandardCache,
};

pub struct CreatedState {
    pub link: Link,
    pub canister_id: Principal,
}

impl CreatedState {
    pub fn new(link: &Link, canister_id: Principal) -> Self {
        Self {
            link: link.clone(),
            canister_id,
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
    pub async fn create_create_action<M>(
        caller: Principal,
        link: Link,
        canister_id: Principal,
        transaction_manager: M,
    ) -> Result<LinkCreateActionResult, CanisterError>
    where
        M: TransactionManager + 'static,
    {
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
    pub async fn activate<M>(
        caller: Principal,
        link: Link,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        transaction_manager: M,
    ) -> Result<LinkProcessActionResult, CanisterError>
    where
        M: TransactionManager + 'static,
    {
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

impl LinkV2State for CreatedState {
    async fn create_action<M, F, S, B>(
        &self,
        caller: Principal,
        action_type: ActionType,
        transaction_manager: M,
        _token_fee_service: F,
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
    }

    async fn process_action<M>(
        &self,
        caller: Principal,
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
    }
}
