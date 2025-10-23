// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::link_v2::{
    links::{tip_link::actions::withdraw::WithdrawAction, traits::LinkV2State},
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

pub struct InactiveState<M: TransactionManager + 'static> {
    pub link: Link,
    pub canister_id: Principal,
    pub transaction_manager: Rc<M>,
}

impl<M: TransactionManager + 'static> InactiveState<M> {
    pub fn new(link: &Link, canister_id: Principal, transaction_manager: Rc<M>) -> Self {
        Self {
            link: link.clone(),
            canister_id,
            transaction_manager,
        }
    }

    async fn withdraw(
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
            link.state = LinkState::InactiveEnded;

            Ok(LinkProcessActionResult {
                link,
                process_action_result,
            })
        } else {
            Err(CanisterError::ValidationErrors(format!(
                "Failed to withdraw link {}",
                process_action_result.errors.join(", ")
            )))
        }
    }
}

impl<M: TransactionManager + 'static> LinkV2State for InactiveState<M> {
    fn create_action(
        &self,
        _caller: Principal,
        action_type: ActionType,
    ) -> Pin<Box<dyn Future<Output = Result<LinkCreateActionResult, CanisterError>>>> {
        let link = self.link.clone();
        let canister_id = self.canister_id;
        let transaction_manager = self.transaction_manager.clone();

        Box::pin(async move {
            match action_type {
                ActionType::Withdraw => {
                    let withdraw_action = WithdrawAction::create(&link, canister_id).await?;
                    let create_action_result = transaction_manager
                        .create_action(withdraw_action.action, withdraw_action.intents)
                        .await?;

                    Ok(LinkCreateActionResult {
                        link: link.clone(),
                        create_action_result,
                    })
                }
                _ => Err(CanisterError::from(
                    "Unsupported action type for InactiveState",
                )),
            }
        })
    }

    fn process_action(
        &self,
        _caller: Principal,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: std::collections::HashMap<String, Vec<Transaction>>,
    ) -> Pin<Box<dyn Future<Output = Result<LinkProcessActionResult, CanisterError>>>> {
        let link = self.link.clone();
        let transaction_manager = self.transaction_manager.clone();

        Box::pin(async move {
            match action.r#type {
                ActionType::Withdraw => {
                    let withdraw_result =
                        Self::withdraw(&link, action, intents, intent_txs_map, transaction_manager)
                            .await?;
                    Ok(withdraw_result)
                }
                _ => Err(CanisterError::from(
                    "Unsupported action type for InactiveState",
                )),
            }
        })
    }
}
