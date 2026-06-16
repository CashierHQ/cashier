// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v3::link_result::{LinkCreateActionResult, LinkProcessActionResult},
    repository::{
        action::{v1::ActionType, v3::ActionV3},
        asset_info::v3::AssetInfoV3,
        intent::v3::IntentV3,
        link::{
            v1::LinkType,
            v3::{LinkState as LinkStateV3, LinkV3},
        },
        transaction::v1::Transaction,
    },
};
use std::collections::HashMap;
use transaction_manager::{
    transaction::traits::{ExecutionService, ValidationService},
    v3::traits::TransactionManagerV3,
};
use uuid::Uuid;

use crate::apps::{
    link_v3::{
        links::shared::send_link::states::{
            active::ActiveState, created::CreatedState, inactive::InactiveState,
        },
        traits::{LinkV3Instance, LinkV3State},
    },
    token_balance::traits::TokenBalanceFetcher,
    token_fee::traits::TokenFeeCache,
    token_standard::traits::TokenStandardCache,
};

pub struct TokenBasketLink {
    pub link: LinkV3,
    pub canister_id: Principal,
}

impl TokenBasketLink {
    pub fn new(link: LinkV3, canister_id: Principal) -> Self {
        Self { link, canister_id }
    }

    /// Create a new TipLink instance
    /// # Arguments
    /// * `creator` - The principal of the user creating the link
    /// * `title` - The title of the link
    /// * `asset_info` - The asset information associated with the link
    /// * `max_use` - The maximum number of times the link can be used
    /// * `created_at_ts` - The timestamp when the link is created
    /// # Returns
    /// * `TipLink` - The newly created TipLink instance
    pub fn create(
        creator: Principal,
        title: String,
        asset_info: Vec<AssetInfoV3>,
        max_use: u64,
        created_at: u64,
        canister_id: Principal,
    ) -> Self {
        let new_link = LinkV3 {
            id: Uuid::new_v4().to_string(),
            link_type: LinkType::SendTokenBasket,
            title,
            asset_info,
            max_use,
            use_count: 0,
            creator,
            state: LinkStateV3::Created,
            created_at,
        };

        Self::new(new_link, canister_id)
    }
}

impl LinkV3Instance for TokenBasketLink {
    async fn create_action<M, F, S, B>(
        &self,
        caller: Principal,
        action_type: ActionType,
        created_at: u64,
        transaction_manager: M,
        token_fee_service: F,
        token_standard_service: S,
        token_balance_service: B,
        gate_count: u64,
    ) -> Result<LinkCreateActionResult, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
        B: TokenBalanceFetcher + 'static,
    {
        let link = self.link.clone();
        let canister_id = self.canister_id;

        match link.state {
            LinkStateV3::Created => {
                let state = CreatedState::new(&link, canister_id);
                state
                    .create_action(
                        caller,
                        action_type,
                        created_at,
                        transaction_manager,
                        token_fee_service,
                        token_standard_service,
                        token_balance_service,
                        gate_count,
                    )
                    .await
            }
            LinkStateV3::Active => {
                let state = ActiveState::new(&link, canister_id);
                state
                    .create_action(
                        caller,
                        action_type,
                        created_at,
                        transaction_manager,
                        token_fee_service,
                        token_standard_service,
                        token_balance_service,
                        gate_count,
                    )
                    .await
            }
            LinkStateV3::Inactive => {
                let state = InactiveState::new(&link, canister_id);
                state
                    .create_action(
                        caller,
                        action_type,
                        created_at,
                        transaction_manager,
                        token_fee_service,
                        token_standard_service,
                        token_balance_service,
                        gate_count,
                    )
                    .await
            }
            _ => Err(CanisterError::HandleLogicError(format!(
                "Cannot create action for link in state {:?}",
                link.state
            ))),
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
        let canister_id = self.canister_id;

        match link.state {
            LinkStateV3::Created => {
                let state = CreatedState::new(&link, canister_id);
                let process_action_result = state
                    .process_action(
                        caller,
                        action,
                        intents,
                        intent_txs_map,
                        transaction_manager,
                        validator_service,
                        executor_service,
                    )
                    .await?;
                Ok(process_action_result)
            }
            LinkStateV3::Active => {
                let state = ActiveState::new(&link, canister_id);
                let process_action_result = state
                    .process_action(
                        caller,
                        action,
                        intents,
                        intent_txs_map,
                        transaction_manager,
                        validator_service,
                        executor_service,
                    )
                    .await?;
                Ok(process_action_result)
            }
            LinkStateV3::Inactive => {
                let state = InactiveState::new(&link, canister_id);
                let process_action_result = state
                    .process_action(
                        caller,
                        action,
                        intents,
                        intent_txs_map,
                        transaction_manager,
                        validator_service,
                        executor_service,
                    )
                    .await?;
                Ok(process_action_result)
            }
            _ => Err(CanisterError::HandleLogicError(format!(
                "Cannot process action for link in state {:?}",
                link.state
            ))),
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
    use cashier_backend_types::repository::{
        action::v1::ActionState,
        asset::v3::{AssetV3, TokenStandardV3},
        asset_info::v3::AssetInfoV3,
        common::AddressTypeV3,
        link::v3::LinkState,
    };
    use cashier_common::test_utils::random_principal_id;
    use token_storage_types::token::IcrcStandard;
    use uuid::Uuid;

    fn fixture_of_asset_info_v3(address: Principal, amount: Nat) -> AssetInfoV3 {
        AssetInfoV3 {
            asset: AssetV3 {
                address,
                network_fee: None,
                token_standard: TokenStandardV3::ICRC1,
            },
            label: "asset".to_string(),
            amount,
            available_amount: None,
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

    fn fixture_of_token_basket_link_with_state(
        state: LinkState,
        creator: Principal,
        canister_id: Principal,
        asset_info: Vec<AssetInfoV3>,
        created_at: u64,
    ) -> TokenBasketLink {
        TokenBasketLink::new(
            LinkV3 {
                id: Uuid::new_v4().to_string(),
                link_type: LinkType::SendTokenBasket,
                title: "Token Basket Link".to_string(),
                asset_info,
                max_use: 5,
                use_count: 0,
                creator,
                state,
                created_at,
            },
            canister_id,
        )
    }

    #[tokio::test]
    async fn it_should_fail_create_action_due_to_unsupported_link_state_for_token_basket_link() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = fixture_of_token_basket_link_with_state(
            LinkState::Ended,
            creator,
            canister_id,
            vec![fixture_of_asset_info_v3(
                random_principal_id(),
                Nat::from(1000u64),
            )],
            created_at,
        );
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
                0,
            )
            .await;

        // Assert
        assert!(matches!(result, Err(CanisterError::HandleLogicError(_))));
    }

    #[tokio::test]
    async fn it_should_fail_process_action_due_to_unsupported_link_state_for_token_basket_link() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = fixture_of_token_basket_link_with_state(
            LinkState::Ended,
            creator,
            canister_id,
            vec![fixture_of_asset_info_v3(
                random_principal_id(),
                Nat::from(1000u64),
            )],
            created_at,
        );
        let action = ActionV3 {
            id: Uuid::new_v4().to_string(),
            action_type: ActionType::CreateLink,
            link_id: link.link.id.clone(),
            creator,
            creator_address_type: AddressTypeV3::Creator,
            state: ActionState::Created,
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

    #[test]
    fn it_should_succeed_create_token_basket_link() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000u64;
        let max_use = 9u64;
        let title = "Token basket test".to_string();
        let asset_info = vec![
            fixture_of_asset_info_v3(random_principal_id(), Nat::from(1000u64)),
            fixture_of_asset_info_v3(random_principal_id(), Nat::from(2000u64)),
        ];

        // Act
        let link = TokenBasketLink::create(
            creator,
            title.clone(),
            asset_info.clone(),
            max_use,
            created_at,
            canister_id,
        );

        // Assert
        assert_eq!(link.canister_id, canister_id);
        assert_eq!(link.link.link_type, LinkType::SendTokenBasket);
        assert_eq!(link.link.title, title);
        assert_eq!(link.link.asset_info.len(), asset_info.len());
        assert_eq!(link.link.max_use, max_use);
        assert_eq!(link.link.use_count, 0);
        assert_eq!(link.link.creator, creator);
        assert_eq!(link.link.state, LinkState::Created);
        assert_eq!(link.link.created_at, created_at);
    }

    #[tokio::test]
    async fn it_should_succeed_create_action_for_created_token_basket_link() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = fixture_of_token_basket_link_with_state(
            LinkState::Created,
            creator,
            canister_id,
            vec![fixture_of_asset_info_v3(ledger_id, Nat::from(1000u64))],
            created_at,
        );
        let (token_fee_service, mut token_standard_service, token_balance_service) =
            fixture_of_services(created_at);
        token_fee_service
            .fetcher
            .set_fee(ledger_id, Nat::from(100u64));
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
                0,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        let created = result.expect("create action should succeed");
        assert_eq!(created.link.state, LinkState::Created);
        assert_eq!(
            created.create_action_result.action.action_type,
            ActionType::CreateLink
        );
    }

    #[tokio::test]
    async fn it_should_succeed_process_action_and_activate_created_token_basket_link() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = fixture_of_token_basket_link_with_state(
            LinkState::Created,
            creator,
            canister_id,
            vec![fixture_of_asset_info_v3(ledger_id, Nat::from(1000u64))],
            created_at,
        );
        let (token_fee_service, mut token_standard_service, token_balance_service) =
            fixture_of_services(created_at);
        token_fee_service
            .fetcher
            .set_fee(ledger_id, Nat::from(100u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);
        let create_result = link
            .create_action(
                creator,
                ActionType::CreateLink,
                created_at,
                MockTransactionManagerV3::default(),
                token_fee_service,
                token_standard_service,
                token_balance_service,
                0,
            )
            .await
            .expect("create action should succeed");

        // Act
        let result = link
            .process_action(
                creator,
                create_result.create_action_result.action,
                create_result.create_action_result.intents,
                create_result.create_action_result.intent_txs_map,
                MockTransactionManagerV3::default(),
                MockValidationService,
                MockExecutionService,
            )
            .await;

        // Assert — handler no longer mutates the link; the service layer
        // commits Created -> Active on a fresh repository read.
        assert!(result.is_ok());
        let processed = result.expect("process action should succeed");
        assert!(processed.process_action_result.is_success);
        assert_eq!(processed.link.state, LinkState::Created);
    }
}
