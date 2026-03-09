// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::apps::{
        shared::test_utils::tests::{
            MockExecutionService, MockTransactionManagerV3, MockValidationService,
        },
        token_balance::service::tests::MockTokenBalanceService,
        token_fee::service::tests::{
            MockTokenFeeService, create_mock_service as create_mock_token_fee_service,
        },
        token_standard::service::tests::{
            MockTokenStandardService, create_mock_service as create_mock_token_standard_service,
        },
    };
    use candid::Nat;
    use cashier_backend_types::repository::{asset::v3::AssetV3, asset_info::v3::AssetInfoV3};
    use cashier_common::test_utils::random_principal_id;
    use token_storage_types::token::IcrcStandard;

    fn fixture_of_asset_info_v3(address: Principal, amount: Nat) -> AssetInfoV3 {
        AssetInfoV3 {
            asset: AssetV3 {
                address,
                network_fee: None,
                token_standard: cashier_backend_types::repository::asset::v3::TokenStandardV3::ICRC1,
            },
            label: "asset".to_string(),
            amount,
        }
    }

    fn fixture_of_services(
        current_ts: u64,
    ) -> (
        MockTokenFeeService,
        MockTokenStandardService,
        MockTokenBalanceService,
    ) {
        (
            create_mock_token_fee_service(current_ts),
            create_mock_token_standard_service(current_ts),
            MockTokenBalanceService::new(),
        )
    }

    #[tokio::test]
    async fn it_should_fail_create_action_due_to_unsupported_link_state_for_link_v3_types() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000u64;
        let ledger_id = random_principal_id();
        let link = LinkV3Types::TipLink(tip_link::TipLink::new(
            cashier_backend_types::repository::link::v3::LinkV3 {
                id: "ended-link".to_string(),
                link_type: cashier_backend_types::repository::link::v1::LinkType::SendTip,
                title: "Ended".to_string(),
                asset_info: vec![fixture_of_asset_info_v3(ledger_id, Nat::from(1000u64))],
                max_use: 1,
                use_count: 1,
                creator,
                state: cashier_backend_types::repository::link::v3::LinkState::Ended,
                created_at,
            },
            canister_id,
        ));
        let (token_fee_service, token_standard_service, token_balance_service) =
            fixture_of_services(created_at);

        // Act
        let result = link
            .create_action(
                creator,
                ActionType::CreateLink,
                created_at,
                MockTransactionManagerV3::default(),
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await;

        // Assert
        assert!(matches!(result, Err(CanisterError::HandleLogicError(_))));
    }

    #[tokio::test]
    async fn it_should_fail_process_action_due_to_unsupported_link_state_for_link_v3_types() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = LinkV3Types::TipLink(tip_link::TipLink::new(
            cashier_backend_types::repository::link::v3::LinkV3 {
                id: "ended-link".to_string(),
                link_type: cashier_backend_types::repository::link::v1::LinkType::SendTip,
                title: "Ended".to_string(),
                asset_info: vec![],
                max_use: 1,
                use_count: 1,
                creator,
                state: cashier_backend_types::repository::link::v3::LinkState::Ended,
                created_at,
            },
            canister_id,
        ));
        let action = ActionV3 {
            id: "action-id".to_string(),
            action_type: ActionType::CreateLink,
            link_id: "ended-link".to_string(),
            creator,
            creator_address_type: cashier_backend_types::repository::common::AddressTypeV3::Creator,
            state: cashier_backend_types::repository::action::v1::ActionState::Created,
            intent_ids: vec![],
        };

        // Act
        let result = link
            .process_action(
                creator,
                action,
                vec![],
                HashMap::new(),
                MockTransactionManagerV3::default(),
                MockValidationService,
                MockExecutionService,
            )
            .await;

        // Assert
        assert!(matches!(result, Err(CanisterError::HandleLogicError(_))));
    }

    #[tokio::test]
    async fn it_should_succeed_create_action_for_tip_link_variant_of_link_v3_types() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = LinkV3Types::TipLink(tip_link::TipLink::create(
            creator,
            "Tip".to_string(),
            vec![fixture_of_asset_info_v3(ledger_id, Nat::from(1000u64))],
            created_at,
            canister_id,
        ));
        let (token_fee_service, mut token_standard_service, token_balance_service) =
            fixture_of_services(created_at);
        token_fee_service.fetcher.set_fee(ledger_id, Nat::from(100u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);

        // Act
        let result = link
            .create_action(
                creator,
                ActionType::CreateLink,
                created_at,
                MockTransactionManagerV3::default(),
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        assert_eq!(
            result.unwrap().create_action_result.action.action_type,
            ActionType::CreateLink
        );
    }

    #[tokio::test]
    async fn it_should_succeed_create_action_for_airdrop_link_variant_of_link_v3_types() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = LinkV3Types::AirdropLink(airdrop_link::AirdropLink::create(
            creator,
            "Airdrop".to_string(),
            vec![fixture_of_asset_info_v3(ledger_id, Nat::from(1000u64))],
            5,
            created_at,
            canister_id,
        ));
        let (token_fee_service, mut token_standard_service, token_balance_service) =
            fixture_of_services(created_at);
        token_fee_service.fetcher.set_fee(ledger_id, Nat::from(100u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);

        // Act
        let result = link
            .create_action(
                creator,
                ActionType::CreateLink,
                created_at,
                MockTransactionManagerV3::default(),
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        assert_eq!(
            result.unwrap().create_action_result.action.action_type,
            ActionType::CreateLink
        );
    }

    #[tokio::test]
    async fn it_should_succeed_create_action_for_token_basket_link_variant_of_link_v3_types() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = LinkV3Types::TokenBasketLink(token_basket_link::TokenBasketLink::create(
            creator,
            "Basket".to_string(),
            vec![fixture_of_asset_info_v3(ledger_id, Nat::from(1000u64))],
            7,
            created_at,
            canister_id,
        ));
        let (token_fee_service, mut token_standard_service, token_balance_service) =
            fixture_of_services(created_at);
        token_fee_service.fetcher.set_fee(ledger_id, Nat::from(100u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);

        // Act
        let result = link
            .create_action(
                creator,
                ActionType::CreateLink,
                created_at,
                MockTransactionManagerV3::default(),
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        assert_eq!(
            result.unwrap().create_action_result.action.action_type,
            ActionType::CreateLink
        );
    }
}
