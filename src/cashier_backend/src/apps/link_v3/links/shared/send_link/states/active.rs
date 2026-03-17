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
    link_v3::{
        links::shared::send_link::actions::receive::ReceiveActionV3, traits::LinkV3State,
        utils::update_link_available_amount_after_receive,
    },
    token_balance::traits::TokenBalanceFetcher,
    token_fee::traits::TokenFeeCache,
    token_standard::traits::TokenStandardCache,
};

pub struct ActiveState {
    pub link: LinkV3,
    pub canister_id: Principal,
}

impl ActiveState {
    pub fn new(link: &LinkV3, canister_id: Principal) -> Self {
        Self {
            link: link.clone(),
            canister_id,
        }
    }

    /// Create RECEIVE action for the tip link
    /// # Arguments
    /// * `caller` - The principal of the user creating the action
    /// * `link` - The tip link for which the action is being created
    /// * `canister_id` - The canister ID of the backend canister
    /// * `transaction_manager` - The transaction manager to handle action creation
    /// # Returns
    /// * `Result<LinkCreateActionResult, CanisterError>` - The result of creating the RECEIVE action
    pub async fn create_receive_action<M, F, S>(
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
        let receive_action = ReceiveActionV3::create(
            &link,
            caller,
            canister_id,
            created_at,
            token_fee_service,
            token_standard_service,
        )
        .await?;
        let create_action_result = transaction_manager.create_action(
            receive_action.action,
            receive_action.intents,
            None,
        )?;

        Ok(LinkCreateActionResult {
            link: link.clone(),
            create_action_result,
        })
    }

    /// Process a RECEIVE action on the active tip link
    /// # Arguments
    /// * `link` - The tip link being received
    /// * `action` - The receive action to be processed
    /// * `intents` - The intents associated with the action
    /// * `intent_txs_map` - A mapping of intent IDs to their associated transactions
    /// * `transaction_manager` - The transaction manager to handle the action processing
    /// # Returns
    /// * `Result<LinkProcessActionResult, CanisterError>` - The result of processing the receive action
    pub async fn receive<M, V, X>(
        link: &LinkV3,
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

        if process_action_result.is_success {
            link.use_count += 1;
            update_link_available_amount_after_receive(&mut link, &process_action_result.intents)?;
            if link.use_count >= link.max_use {
                link.state = LinkState::Ended;
            }
        }

        Ok(LinkProcessActionResult {
            link,
            process_action_result,
        })
    }
}

impl LinkV3State for ActiveState {
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
            ActionType::Receive => {
                let create_action_result = Self::create_receive_action(
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
                "Unsupported action type for ActiveState".to_string(),
            )),
        }
    }

    async fn process_action<M, V, X>(
        &self,
        _caller: Principal,
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
            ActionType::Receive => {
                let receive_result = Self::receive(
                    &link,
                    action,
                    intents,
                    intent_txs_map,
                    transaction_manager,
                    validator_service,
                    executor_service,
                )
                .await?;
                Ok(receive_result)
            }
            _ => Err(CanisterError::ValidationErrors(
                "Unsupported action type for ActiveState".to_string(),
            )),
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
    use cashier_backend_types::repository::{
        action::v1::ActionState,
        asset::v1::Asset,
        asset::v3::{AssetV3, TokenStandardV3},
        asset_info::v3::AssetInfoV3,
        common::{AddressTypeV3, Wallet},
        intent::v1::TransferData,
        intent::v3::IntentTransactionDataV3,
        link::v1::LinkType,
    };
    use cashier_common::test_utils::random_principal_id;
    use token_storage_types::token::IcrcStandard;
    use uuid::Uuid;

    fn fixture_of_asset_info_v3(address: Principal, amount: candid::Nat) -> AssetInfoV3 {
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

    fn fixture_of_link_v3(
        creator: Principal,
        max_use: u64,
        created_at: u64,
        asset_info: Vec<AssetInfoV3>,
    ) -> LinkV3 {
        LinkV3 {
            id: Uuid::new_v4().to_string(),
            title: "Test Active Link".to_string(),
            link_type: LinkType::SendTokenBasket,
            asset_info,
            max_use,
            use_count: 0,
            creator,
            state: LinkState::Active,
            created_at,
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
    async fn it_should_fail_create_action_due_to_unsupported_action_type_for_active_state() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = fixture_of_link_v3(
            creator,
            3,
            created_at,
            vec![fixture_of_asset_info_v3(
                random_principal_id(),
                candid::Nat::from(1000u64),
            )],
        );
        let state_handler = ActiveState::new(&link, canister_id);
        let transaction_manager = MockTransactionManagerV3::default();
        let (token_fee_service, token_standard_service, token_balance_service) =
            fixture_of_services(created_at);

        // Act
        let result = state_handler
            .create_action(
                creator,
                ActionType::Withdraw,
                created_at,
                transaction_manager,
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await;

        // Assert
        assert!(matches!(
            result,
            Err(CanisterError::ValidationErrors(ref msg))
                if msg == "Unsupported action type for ActiveState"
        ));
    }

    #[tokio::test]
    async fn it_should_fail_create_action_due_to_transaction_manager_error_for_active_state() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = fixture_of_link_v3(
            creator,
            3,
            created_at,
            vec![fixture_of_asset_info_v3(
                ledger_id,
                candid::Nat::from(1000u64),
            )],
        );
        let state_handler = ActiveState::new(&link, canister_id);
        let mut transaction_manager = MockTransactionManagerV3::default();
        transaction_manager.set_failed(true);
        let (token_fee_service, mut token_standard_service, token_balance_service) =
            fixture_of_services(created_at);
        token_fee_service.fetcher.set_fee(ledger_id, candid::Nat::from(0u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);

        // Act
        let result = state_handler
            .create_action(
                creator,
                ActionType::Receive,
                created_at,
                transaction_manager,
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await;

        // Assert
        assert!(matches!(result, Err(CanisterError::HandleLogicError(_))));
    }

    #[tokio::test]
    async fn it_should_fail_process_action_due_to_unsupported_action_type_for_active_state() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = fixture_of_link_v3(
            creator,
            3,
            created_at,
            vec![fixture_of_asset_info_v3(
                random_principal_id(),
                candid::Nat::from(1000u64),
            )],
        );
        let state_handler = ActiveState::new(&link, canister_id);
        let action = ActionV3 {
            id: Uuid::new_v4().to_string(),
            action_type: ActionType::CreateLink,
            link_id: link.id.clone(),
            creator,
            creator_address_type: AddressTypeV3::Creator,
            state: ActionState::Created,
            intent_ids: vec![],
        };

        // Act
        let result = state_handler
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
        assert!(matches!(
            result,
            Err(CanisterError::ValidationErrors(ref msg))
                if msg == "Unsupported action type for ActiveState"
        ));
    }

    #[tokio::test]
    async fn it_should_fail_process_action_due_to_transaction_manager_error_for_active_state() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = fixture_of_link_v3(
            creator,
            3,
            created_at,
            vec![fixture_of_asset_info_v3(
                ledger_id,
                candid::Nat::from(1000u64),
            )],
        );
        let state_handler = ActiveState::new(&link, canister_id);
        let (token_fee_service, mut token_standard_service, token_balance_service) =
            fixture_of_services(created_at);
        link.asset_info.iter().for_each(|asset_info| {
            token_fee_service
                .fetcher
                .set_fee(asset_info.asset.address, candid::Nat::from(0u64));
            token_standard_service
                .token_storage_client
                .set_token_standards(asset_info.asset.address, vec![IcrcStandard::ICRC1]);
        });
        let create_result = state_handler
            .create_action(
                creator,
                ActionType::Receive,
                created_at,
                MockTransactionManagerV3::default(),
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await
            .expect("create action should succeed");
        let mut failed_tx_manager = MockTransactionManagerV3::default();
        failed_tx_manager.set_failed(true);

        // Act
        let result = state_handler
            .process_action(
                creator,
                create_result.create_action_result.action,
                create_result.create_action_result.intents,
                create_result.create_action_result.intent_txs_map,
                failed_tx_manager,
                MockValidationService,
                MockExecutionService,
            )
            .await;

        // Assert
        assert!(matches!(result, Err(CanisterError::HandleLogicError(_))));
    }

    #[tokio::test]
    async fn it_should_succeed_create_action_for_active_state() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = fixture_of_link_v3(
            creator,
            3,
            created_at,
            vec![
                fixture_of_asset_info_v3(random_principal_id(), candid::Nat::from(1000u64)),
                fixture_of_asset_info_v3(random_principal_id(), candid::Nat::from(2000u64)),
            ],
        );
        let state_handler = ActiveState::new(&link, canister_id);
        let (token_fee_service, mut token_standard_service, token_balance_service) =
            fixture_of_services(created_at);
        link.asset_info.iter().for_each(|asset_info| {
            token_fee_service
                .fetcher
                .set_fee(asset_info.asset.address, candid::Nat::from(0u64));
            token_standard_service
                .token_storage_client
                .set_token_standards(asset_info.asset.address, vec![IcrcStandard::ICRC1]);
        });

        // Act
        let result = state_handler
            .create_action(
                creator,
                ActionType::Receive,
                created_at,
                MockTransactionManagerV3::default(),
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        let created = result.expect("create action should succeed");
        assert_eq!(created.link.id, link.id);
        assert_eq!(
            created.create_action_result.action.action_type,
            ActionType::Receive
        );
        assert_eq!(created.create_action_result.action.creator, creator);
        assert_eq!(
            created.create_action_result.action.state,
            ActionState::Created
        );
        assert_eq!(created.create_action_result.intents.len(), 2);
    }

    #[tokio::test]
    async fn it_should_succeed_process_action_and_end_link_due_to_reaching_max_use_for_active_state()
     {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = fixture_of_link_v3(
            creator,
            1,
            created_at,
            vec![AssetInfoV3 {
                available_amount: Some(candid::Nat::from(1000u64)),
                ..fixture_of_asset_info_v3(random_principal_id(), candid::Nat::from(1000u64))
            }],
        );
        let state_handler = ActiveState::new(&link, canister_id);
        let (token_fee_service, mut token_standard_service, token_balance_service) =
            fixture_of_services(created_at);
        token_fee_service
            .fetcher
            .set_fee(link.asset_info[0].asset.address, candid::Nat::from(0u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(link.asset_info[0].asset.address, vec![IcrcStandard::ICRC1]);
        let mut create_result = state_handler
            .create_action(
                creator,
                ActionType::Receive,
                created_at,
                MockTransactionManagerV3::default(),
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await
            .expect("create action should succeed");
        create_result
            .create_action_result
            .intents
            .iter_mut()
            .for_each(|intent| {
                if intent.source_address_type == AddressTypeV3::Link
                    && intent.dest_address_type == AddressTypeV3::User
                {
                    intent.asset.network_fee = Some(candid::Nat::from(0u64));
                    intent.intent_tx_data = Some(IntentTransactionDataV3::Transfer(TransferData {
                        from: Wallet::default(),
                        to: Wallet::default(),
                        asset: Asset::IC {
                            address: link.asset_info[0].asset.address,
                        },
                        amount: candid::Nat::from(1000u64),
                    }));
                }
            });

        // Act
        let result = state_handler
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

        // Assert
        assert!(result.is_ok());
        let processed = result.expect("process action should succeed");
        assert_eq!(processed.link.use_count, 1u64);
        assert_eq!(processed.link.state, LinkState::Ended);
        assert_eq!(
            processed.link.asset_info[0].available_amount,
            Some(candid::Nat::from(0u64))
        );
    }

    #[tokio::test]
    async fn it_should_succeed_process_action_and_increase_use_count_of_link_for_active_state() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = fixture_of_link_v3(
            creator,
            3,
            created_at,
            vec![AssetInfoV3 {
                available_amount: Some(candid::Nat::from(1000u64)),
                ..fixture_of_asset_info_v3(random_principal_id(), candid::Nat::from(1000u64))
            }],
        );
        let state_handler = ActiveState::new(&link, canister_id);
        let (token_fee_service, mut token_standard_service, token_balance_service) =
            fixture_of_services(created_at);
        token_fee_service
            .fetcher
            .set_fee(link.asset_info[0].asset.address, candid::Nat::from(0u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(link.asset_info[0].asset.address, vec![IcrcStandard::ICRC1]);
        let mut create_result = state_handler
            .create_action(
                creator,
                ActionType::Receive,
                created_at,
                MockTransactionManagerV3::default(),
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await
            .expect("create action should succeed");
        create_result
            .create_action_result
            .intents
            .iter_mut()
            .for_each(|intent| {
                if intent.source_address_type == AddressTypeV3::Link
                    && intent.dest_address_type == AddressTypeV3::User
                {
                    intent.asset.network_fee = Some(candid::Nat::from(0u64));
                    intent.intent_tx_data = Some(IntentTransactionDataV3::Transfer(TransferData {
                        from: Wallet::default(),
                        to: Wallet::default(),
                        asset: Asset::IC {
                            address: link.asset_info[0].asset.address,
                        },
                        amount: candid::Nat::from(400u64),
                    }));
                }
            });

        // Act
        let result = state_handler
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

        // Assert
        assert!(result.is_ok());
        let processed = result.expect("process action should succeed");
        assert_eq!(processed.link.use_count, 1u64);
        assert_eq!(processed.link.state, LinkState::Active);
        assert_eq!(
            processed.link.asset_info[0].available_amount,
            Some(candid::Nat::from(600u64))
        );
    }
}
