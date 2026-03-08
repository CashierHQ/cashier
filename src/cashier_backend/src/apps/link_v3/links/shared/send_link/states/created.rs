// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v3::link_result::{LinkCreateActionResult, LinkProcessActionResult},
    repository::{
        action::{v1::ActionType, v3::ActionV3},
        intent::v3::IntentV3,
        link::v3::{LinkState, LinkV3},
        transaction::v1::Transaction,
    },
};
use std::collections::HashMap;
use transaction_manager::{
    transaction::traits::{ExecutionService, ValidationService},
    v3::traits::TransactionManagerV3,
};

use crate::apps::{
    link_v2::links::shared::receive_link::states::created,
    link_v3::{
        links::shared::send_link::actions::create::CreateActionV3,
        traits::{LinkV3Instance, LinkV3State},
    },
    token_balance::traits::TokenBalanceFetcher,
    token_fee::traits::TokenFeeCache,
    token_standard::traits::TokenStandardCache,
};

pub struct CreatedState {
    pub link: LinkV3,
    pub canister_id: Principal,
}

impl CreatedState {
    pub fn new(link: &LinkV3, canister_id: Principal) -> Self {
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
    pub async fn create_action<M, F, S>(
        caller: Principal,
        canister_id: Principal,
        link: LinkV3,
        created_at: u64,
        transaction_manager: M,
        token_fee_service: F,
        token_standard_service: S,
    ) -> Result<LinkCreateActionResult, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
    {
        // validate caller is the link creator
        if caller != link.creator {
            return Err(CanisterError::Unauthorized(
                "Only the creator can create CREATE action on this link".to_string(),
            ));
        }

        let create_action = CreateActionV3::create(
            &link,
            canister_id,
            created_at,
            token_fee_service,
            token_standard_service,
        )
        .await?;
        let create_action_result =
            transaction_manager.create_action(create_action.action, create_action.intents, None)?;

        Ok(LinkCreateActionResult {
            link,
            create_action_result,
        })
    }

    pub async fn activate<M, V, X>(
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
                "Only the creator can publish the link".to_string(),
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

impl LinkV3State for CreatedState {
    async fn create_action<M, F, S, B>(
        &self,
        caller: Principal,
        action_type: ActionType,
        created_at: u64,
        transaction_manager: M,
        token_fee_service: F,
        token_standard_service: S,
        _token_balance_service: B,
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
            ActionType::CreateLink => {
                let create_action_result = Self::create_action(
                    caller,
                    canister_id,
                    link,
                    created_at,
                    transaction_manager,
                    token_fee_service,
                    token_standard_service,
                )
                .await?;
                Ok(create_action_result)
            }
            _ => Err(CanisterError::ValidationErrors(
                "Unsupported action type for Created state".to_string(),
            )),
        }
    }

    async fn process_action<M, V, X>(
        &self,
        caller: Principal,
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
        let link = self.link.clone();

        match action.action_type {
            ActionType::CreateLink => {
                let activate_link_result = Self::activate(
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
                Ok(activate_link_result)
            }
            _ => Err(CanisterError::ValidationErrors(
                "Unsupported action type for Created state".to_string(),
            )),
        }
    }
}
