// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v2::link_result::{LinkCreateActionResult, LinkProcessActionResult},
    repository::{
        action::v1::{Action, ActionType},
        intent::v1::Intent,
        transaction::v1::Transaction,
    },
};
use std::collections::HashMap;
use transaction_manager::traits::TransactionManager;

use crate::apps::{
    link_v2::links::traits::LinkV2, token_balance::traits::TokenBalanceFetcher,
    token_fee::traits::TokenFeeCache, token_standard::traits::TokenStandardCache,
};

pub mod airdrop_link;
pub mod factory;
pub mod payment_link;
pub mod shared;
pub mod tip_link;
pub mod token_basket_link;
pub mod traits;

/// Enum representing the different types of links in LinkV2
pub enum LinkV2Types {
    TipLink(tip_link::TipLink),
    AirdropLink(airdrop_link::AirdropLink),
    TokenBasketLink(token_basket_link::TokenBasketLink),
    PaymentLink(payment_link::PaymentLink),
}

impl LinkV2Types {
    /// Create an action for the link based on the action type
    /// # Arguments
    /// * `caller` - The principal of the user creating the action
    /// * `action` - The type of action to be created
    /// * `transaction_manager` - The transaction manager to handle action creation
    /// * `token_fee_service` - The token fee cache service to fetch token fee information
    /// * `token_standard_service` - The token standard cache service to fetch token standard information
    /// * `token_balance_service` - The token balance fetcher service to fetch token balance information
    /// # Returns
    /// * `Result<LinkCreateActionResult, CanisterError>` - The result of creating the action
    pub async fn create_action<M, F, S, B>(
        &self,
        caller: Principal,
        action: ActionType,
        transaction_manager: M,
        token_fee_service: F,
        token_standard_service: S,
        token_balance_service: B,
    ) -> Result<LinkCreateActionResult, CanisterError>
    where
        M: TransactionManager + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
        B: TokenBalanceFetcher + 'static,
    {
        match self {
            LinkV2Types::TipLink(link) => {
                link.create_action(
                    caller,
                    action,
                    transaction_manager,
                    token_fee_service,
                    token_standard_service,
                    token_balance_service,
                )
                .await
            }
            LinkV2Types::AirdropLink(link) => {
                link.create_action(
                    caller,
                    action,
                    transaction_manager,
                    token_fee_service,
                    token_standard_service,
                    token_balance_service,
                )
                .await
            }
            LinkV2Types::TokenBasketLink(link) => {
                link.create_action(
                    caller,
                    action,
                    transaction_manager,
                    token_fee_service,
                    token_standard_service,
                    token_balance_service,
                )
                .await
            }
            LinkV2Types::PaymentLink(link) => {
                link.create_action(
                    caller,
                    action,
                    transaction_manager,
                    token_fee_service,
                    token_standard_service,
                    token_balance_service,
                )
                .await
            }
        }
    }

    /// Process an action for the link based on the action type
    /// # Arguments
    /// * `caller` - The principal of the user processing the action
    /// * `action` - The type of action to be processed
    /// * `intents` - The list of intents associated with the action
    /// * `intent_txs_map` - A map of intent IDs to their associated transactions
    /// * `transaction_manager` - The transaction manager to handle action processing
    /// # Returns
    /// * `Result<LinkProcessActionResult, CanisterError>` - The result of processing the action
    pub async fn process_action<M>(
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
        match self {
            LinkV2Types::TipLink(link) => {
                link.process_action(caller, action, intents, intent_txs_map, transaction_manager)
                    .await
            }
            LinkV2Types::AirdropLink(link) => {
                link.process_action(caller, action, intents, intent_txs_map, transaction_manager)
                    .await
            }
            LinkV2Types::TokenBasketLink(link) => {
                link.process_action(caller, action, intents, intent_txs_map, transaction_manager)
                    .await
            }
            LinkV2Types::PaymentLink(link) => {
                link.process_action(caller, action, intents, intent_txs_map, transaction_manager)
                    .await
            }
        }
    }
}
