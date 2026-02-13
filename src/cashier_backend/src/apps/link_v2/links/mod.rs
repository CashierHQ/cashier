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
    link_v2::links::traits::LinkV2, token_fee::traits::TokenFeeCache,
    token_standard::traits::TokenStandardCache,
};

pub mod airdrop_link;
pub mod factory;
pub mod payment_link;
pub mod shared;
pub mod tip_link;
pub mod token_basket_link;
pub mod traits;

pub enum LinkV2Enum {
    TipLink(tip_link::TipLink),
    AirdropLink(airdrop_link::AirdropLink),
    TokenBasketLink(token_basket_link::TokenBasketLink),
    PaymentLink(payment_link::PaymentLink),
}

impl LinkV2Enum {
    pub async fn create_action<M, F, S>(
        &self,
        caller: Principal,
        action: ActionType,
        transaction_manager: M,
        token_fee_service: F,
        token_standard_service: S,
    ) -> Result<LinkCreateActionResult, CanisterError>
    where
        M: TransactionManager + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
    {
        match self {
            LinkV2Enum::TipLink(link) => {
                link.create_action(
                    caller,
                    action,
                    transaction_manager,
                    token_fee_service,
                    token_standard_service,
                )
                .await
            }
            LinkV2Enum::AirdropLink(link) => {
                link.create_action(
                    caller,
                    action,
                    transaction_manager,
                    token_fee_service,
                    token_standard_service,
                )
                .await
            }
            LinkV2Enum::TokenBasketLink(link) => {
                link.create_action(
                    caller,
                    action,
                    transaction_manager,
                    token_fee_service,
                    token_standard_service,
                )
                .await
            }
            LinkV2Enum::PaymentLink(link) => {
                link.create_action(
                    caller,
                    action,
                    transaction_manager,
                    token_fee_service,
                    token_standard_service,
                )
                .await
            }
        }
    }

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
            LinkV2Enum::TipLink(link) => {
                link.process_action(caller, action, intents, intent_txs_map, transaction_manager)
                    .await
            }
            LinkV2Enum::AirdropLink(link) => {
                link.process_action(caller, action, intents, intent_txs_map, transaction_manager)
                    .await
            }
            LinkV2Enum::TokenBasketLink(link) => {
                link.process_action(caller, action, intents, intent_txs_map, transaction_manager)
                    .await
            }
            LinkV2Enum::PaymentLink(link) => {
                link.process_action(caller, action, intents, intent_txs_map, transaction_manager)
                    .await
            }
        }
    }
}
