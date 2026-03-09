pub mod airdrop_link;
pub mod shared;
pub mod tip_link;
pub mod token_basket_link;

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v3::link_result::{LinkCreateActionResult, LinkProcessActionResult},
    repository::{
        action::{v1::ActionType, v3::ActionV3},
        intent::v3::IntentV3,
        transaction::v1::Transaction,
    },
};
use std::collections::HashMap;
use transaction_manager::{
    transaction::traits::{ExecutionService, ValidationService},
    v3::traits::TransactionManagerV3,
};

use crate::apps::{
    link_v3::traits::LinkV3Instance, token_balance::traits::TokenBalanceFetcher,
    token_fee::traits::TokenFeeCache, token_standard::traits::TokenStandardCache,
};

/// Enum representing the different types of links in LinkV2
#[allow(clippy::enum_variant_names)]
pub enum LinkV3Types {
    TipLink(tip_link::TipLink),
    AirdropLink(airdrop_link::AirdropLink),
    TokenBasketLink(token_basket_link::TokenBasketLink),
}

impl LinkV3Types {
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
    #[allow(clippy::too_many_arguments)]
    pub async fn create_action<M, F, S, B>(
        &self,
        caller: Principal,
        action: ActionType,
        created_at: u64,
        transaction_manager: M,
        token_fee_service: F,
        token_standard_service: S,
        token_balance_service: B,
    ) -> Result<LinkCreateActionResult, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
        B: TokenBalanceFetcher + 'static,
    {
        match self {
            LinkV3Types::TipLink(link) => {
                link.create_action(
                    caller,
                    action,
                    created_at,
                    transaction_manager,
                    token_fee_service,
                    token_standard_service,
                    token_balance_service,
                )
                .await
            }
            LinkV3Types::AirdropLink(link) => {
                link.create_action(
                    caller,
                    action,
                    created_at,
                    transaction_manager,
                    token_fee_service,
                    token_standard_service,
                    token_balance_service,
                )
                .await
            }
            LinkV3Types::TokenBasketLink(link) => {
                link.create_action(
                    caller,
                    action,
                    created_at,
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
    #[allow(clippy::too_many_arguments)]
    pub async fn process_action<M, V, X>(
        &self,
        caller: Principal,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        transaction_manager: M,
        validator_service: V,
        execution_service: X,
    ) -> Result<LinkProcessActionResult, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
        V: ValidationService + 'static,
        X: ExecutionService + 'static,
    {
        match self {
            LinkV3Types::TipLink(link) => {
                link.process_action(
                    caller,
                    action,
                    intents,
                    intent_txs_map,
                    transaction_manager,
                    validator_service,
                    execution_service,
                )
                .await
            }
            LinkV3Types::AirdropLink(link) => {
                link.process_action(
                    caller,
                    action,
                    intents,
                    intent_txs_map,
                    transaction_manager,
                    validator_service,
                    execution_service,
                )
                .await
            }
            LinkV3Types::TokenBasketLink(link) => {
                link.process_action(
                    caller,
                    action,
                    intents,
                    intent_txs_map,
                    transaction_manager,
                    validator_service,
                    execution_service,
                )
                .await
            }
        }
    }
}
