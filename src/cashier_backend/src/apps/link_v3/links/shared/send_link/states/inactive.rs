// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use log::error;
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
        links::shared::send_link::actions::withdraw::WithdrawActionV3, traits::LinkV3State,
        utils::update_link_available_amount_after_withdraw,
    },
    token_balance::traits::TokenBalanceFetcher,
    token_fee::traits::TokenFeeCache,
    token_standard::traits::TokenStandardCache,
};

pub struct InactiveState {
    pub link: LinkV3,
    pub canister_id: Principal,
}

impl InactiveState {
    pub fn new(link: &LinkV3, canister_id: Principal) -> Self {
        Self {
            link: link.clone(),
            canister_id,
        }
    }

    /// Create WITHDRAW action for the inactive tip link
    /// # Arguments
    /// * `caller` - The principal of the user creating the action
    /// * `link` - The tip link for which the action is being created
    /// * `canister_id` - The canister ID of the backend canister
    /// * `transaction_manager` - The transaction manager to handle action creation
    /// # Returns
    /// * `Result<LinkCreateActionResult, CanisterError>` - The result of creating the WITHDRAW action
    #[allow(clippy::too_many_arguments)]
    pub async fn create_withdraw_action<M, F, S, B>(
        caller: Principal,
        canister_id: Principal,
        link: LinkV3,
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
        if caller != link.creator {
            return Err(CanisterError::Unauthorized(
                "Only the creator can create WITHDRAW action on this link".to_string(),
            ));
        }

        let withdraw_action = WithdrawActionV3::create(
            &link,
            canister_id,
            created_at,
            token_fee_service,
            token_standard_service,
            token_balance_service,
        )
        .await?;
        let create_action_result = transaction_manager.create_action(
            withdraw_action.action,
            withdraw_action.intents,
            None,
        )?;

        Ok(LinkCreateActionResult {
            link: link.clone(),
            create_action_result,
        })
    }

    /// Process a WITHDRAW action on the inactive tip link
    /// # Arguments
    /// * `caller` - The principal of the user processing the action
    /// * `link` - The tip link being withdrawn
    /// * `action` - The withdraw action to be processed
    /// * `intents` - The intents associated with the action
    /// * `intent_txs_map` - A mapping of intent IDs to their associated transactions
    /// * `transaction_manager` - The transaction manager to handle the action processing
    /// # Returns
    /// * `Result<LinkProcessActionResult, CanisterError>` - The result of processing the withdraw action
    #[allow(clippy::too_many_arguments)]
    pub async fn withdraw<M, V, X>(
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
                "Only the creator can process WITHDRAW action on this link".to_string(),
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

        if process_action_result.is_success {
            link.state = LinkState::Ended;
            update_link_available_amount_after_withdraw(&mut link, &process_action_result.intents)?;
        } else {
            error!(
                "Failed to process WITHDRAW action for link {}, action {}, errors: {:?}",
                link.id, process_action_result.action.id, process_action_result.errors
            );
        }

        Ok(LinkProcessActionResult {
            link,
            process_action_result,
        })
    }
}

impl LinkV3State for InactiveState {
    async fn create_action<M, F, S, B>(
        &self,
        caller: Principal,
        action_type: ActionType,
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
        let link = self.link.clone();
        let canister_id = self.canister_id;

        match action_type {
            ActionType::Withdraw => {
                let create_action_result = Self::create_withdraw_action(
                    caller,
                    canister_id,
                    link,
                    created_at,
                    transaction_manager,
                    token_fee_service,
                    token_standard_service,
                    token_balance_service,
                )
                .await?;
                Ok(create_action_result)
            }
            _ => Err(CanisterError::ValidationErrors(
                "Unsupported action type for InactiveState".to_string(),
            )),
        }
    }

    async fn process_action<M, V, X>(
        &self,
        caller: Principal,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_txs_map: std::collections::HashMap<String, Vec<Transaction>>,
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
            ActionType::Withdraw => {
                let withdraw_result = Self::withdraw(
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
                Ok(withdraw_result)
            }
            _ => Err(CanisterError::ValidationErrors(
                "Unsupported action type for InactiveState".to_string(),
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
    use candid::Nat;
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

    fn fixture_of_link_v3(
        creator: Principal,
        created_at: u64,
        asset_info: Vec<AssetInfoV3>,
    ) -> LinkV3 {
        LinkV3 {
            id: Uuid::new_v4().to_string(),
            title: "Test Inactive Link".to_string(),
            link_type: LinkType::SendTokenBasket,
            asset_info,
            max_use: 3,
            use_count: 1,
            creator,
            state: LinkState::Inactive,
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
    async fn it_should_fail_create_action_due_to_unsupported_action_type_for_inactive_state() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = fixture_of_link_v3(
            creator,
            created_at,
            vec![fixture_of_asset_info_v3(
                random_principal_id(),
                Nat::from(1000u64),
            )],
        );
        let state_handler = InactiveState::new(&link, canister_id);
        let (token_fee_service, token_standard_service, token_balance_service) =
            fixture_of_services(created_at);

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
        assert!(matches!(
            result,
            Err(CanisterError::ValidationErrors(ref msg))
                if msg == "Unsupported action type for InactiveState"
        ));
    }

    #[tokio::test]
    async fn it_should_fail_create_action_due_to_non_creator_caller_for_inactive_state() {
        // Arrange
        let creator = random_principal_id();
        let caller = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = fixture_of_link_v3(
            creator,
            created_at,
            vec![AssetInfoV3 {
                available_amount: Some(Nat::from(1000u64)),
                ..fixture_of_asset_info_v3(ledger_id, Nat::from(1000u64))
            }],
        );
        let state_handler = InactiveState::new(&link, canister_id);
        let (token_fee_service, mut token_standard_service, mut token_balance_service) =
            fixture_of_services(created_at);
        token_fee_service
            .fetcher
            .set_fee(ledger_id, Nat::from(100u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);
        token_balance_service.set_balance(ledger_id, Nat::from(2000u64));

        // Act
        let result = state_handler
            .create_action(
                caller,
                ActionType::Withdraw,
                created_at,
                MockTransactionManagerV3::default(),
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await;

        // Assert
        assert!(matches!(result, Err(CanisterError::Unauthorized(_))));
    }

    #[tokio::test]
    async fn it_should_fail_create_action_due_to_transaction_manager_error_for_inactive_state() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = fixture_of_link_v3(
            creator,
            created_at,
            vec![AssetInfoV3 {
                available_amount: Some(Nat::from(1000u64)),
                ..fixture_of_asset_info_v3(ledger_id, Nat::from(1000u64))
            }],
        );
        let state_handler = InactiveState::new(&link, canister_id);
        let mut failed_tx_manager = MockTransactionManagerV3::default();
        failed_tx_manager.set_failed(true);
        let (token_fee_service, mut token_standard_service, mut token_balance_service) =
            fixture_of_services(created_at);
        token_fee_service
            .fetcher
            .set_fee(ledger_id, Nat::from(100u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);
        token_balance_service.set_balance(ledger_id, Nat::from(2000u64));

        // Act
        let result = state_handler
            .create_action(
                creator,
                ActionType::Withdraw,
                created_at,
                failed_tx_manager,
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await;

        // Assert
        assert!(matches!(result, Err(CanisterError::HandleLogicError(_))));
    }

    #[tokio::test]
    async fn it_should_fail_process_action_due_to_unsupported_action_type_for_inactive_state() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = fixture_of_link_v3(
            creator,
            created_at,
            vec![fixture_of_asset_info_v3(
                random_principal_id(),
                Nat::from(1000u64),
            )],
        );
        let state_handler = InactiveState::new(&link, canister_id);
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
                if msg == "Unsupported action type for InactiveState"
        ));
    }

    #[tokio::test]
    async fn it_should_fail_process_action_due_to_non_creator_caller_for_inactive_state() {
        // Arrange
        let creator = random_principal_id();
        let caller = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = fixture_of_link_v3(
            creator,
            created_at,
            vec![AssetInfoV3 {
                available_amount: Some(Nat::from(1900u64)),
                ..fixture_of_asset_info_v3(ledger_id, Nat::from(1000u64))
            }],
        );
        let state_handler = InactiveState::new(&link, canister_id);
        let (token_fee_service, mut token_standard_service, mut token_balance_service) =
            fixture_of_services(created_at);
        token_fee_service
            .fetcher
            .set_fee(ledger_id, Nat::from(100u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);
        token_balance_service.set_balance(ledger_id, Nat::from(2000u64));
        let mut create_result = state_handler
            .create_action(
                creator,
                ActionType::Withdraw,
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
                    && intent.dest_address_type == AddressTypeV3::Creator
                {
                    intent.asset.network_fee = Some(Nat::from(100u64));
                    intent.intent_tx_data = Some(IntentTransactionDataV3::Transfer(TransferData {
                        from: Wallet::default(),
                        to: Wallet::default(),
                        asset: Asset::IC { address: ledger_id },
                        amount: Nat::from(1800u64),
                    }));
                }
            });

        // Act
        let result = state_handler
            .process_action(
                caller,
                create_result.create_action_result.action,
                create_result.create_action_result.intents,
                create_result.create_action_result.intent_txs_map,
                MockTransactionManagerV3::default(),
                MockValidationService,
                MockExecutionService,
            )
            .await;

        // Assert
        assert!(matches!(result, Err(CanisterError::Unauthorized(_))));
    }

    #[tokio::test]
    async fn it_should_fail_process_action_due_to_transaction_manager_error_for_inactive_state() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = fixture_of_link_v3(
            creator,
            created_at,
            vec![fixture_of_asset_info_v3(ledger_id, Nat::from(1000u64))],
        );
        let state_handler = InactiveState::new(&link, canister_id);
        let (token_fee_service, mut token_standard_service, mut token_balance_service) =
            fixture_of_services(created_at);
        token_fee_service
            .fetcher
            .set_fee(ledger_id, Nat::from(100u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);
        token_balance_service.set_balance(ledger_id, Nat::from(2000u64));
        let mut create_result = state_handler
            .create_action(
                creator,
                ActionType::Withdraw,
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
                    && intent.dest_address_type == AddressTypeV3::Creator
                {
                    intent.asset.network_fee = Some(Nat::from(100u64));
                    intent.intent_tx_data = Some(IntentTransactionDataV3::Transfer(TransferData {
                        from: Wallet::default(),
                        to: Wallet::default(),
                        asset: Asset::IC { address: ledger_id },
                        amount: Nat::from(1800u64),
                    }));
                }
            });
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
    async fn it_should_succeed_create_action_for_inactive_state() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = fixture_of_link_v3(
            creator,
            created_at,
            vec![fixture_of_asset_info_v3(ledger_id, Nat::from(1000u64))],
        );
        let state_handler = InactiveState::new(&link, canister_id);
        let (token_fee_service, mut token_standard_service, mut token_balance_service) =
            fixture_of_services(created_at);
        token_fee_service
            .fetcher
            .set_fee(ledger_id, Nat::from(100u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);
        token_balance_service.set_balance(ledger_id, Nat::from(2000u64));

        // Act
        let result = state_handler
            .create_action(
                creator,
                ActionType::Withdraw,
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
            ActionType::Withdraw
        );
        assert_eq!(created.create_action_result.action.creator, creator);
        assert_eq!(
            created.create_action_result.action.creator_address_type,
            AddressTypeV3::Creator
        );
        assert_eq!(
            created.create_action_result.action.state,
            ActionState::Created
        );
    }

    #[tokio::test]
    async fn it_should_succeed_process_action_and_end_link_for_inactive_state() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000u64;
        let link = fixture_of_link_v3(
            creator,
            created_at,
            vec![AssetInfoV3 {
                available_amount: Some(Nat::from(1900u64)),
                ..fixture_of_asset_info_v3(ledger_id, Nat::from(1000u64))
            }],
        );
        let state_handler = InactiveState::new(&link, canister_id);
        let (token_fee_service, mut token_standard_service, mut token_balance_service) =
            fixture_of_services(created_at);
        token_fee_service
            .fetcher
            .set_fee(ledger_id, Nat::from(100u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);
        token_balance_service.set_balance(ledger_id, Nat::from(2000u64));
        let mut create_result = state_handler
            .create_action(
                creator,
                ActionType::Withdraw,
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
                    && intent.dest_address_type == AddressTypeV3::Creator
                {
                    intent.asset.network_fee = Some(Nat::from(100u64));
                    intent.intent_tx_data = Some(IntentTransactionDataV3::Transfer(TransferData {
                        from: Wallet::default(),
                        to: Wallet::default(),
                        asset: Asset::IC { address: ledger_id },
                        amount: Nat::from(1800u64),
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
        assert_eq!(processed.link.state, LinkState::Ended);
        assert_eq!(
            processed.link.asset_info[0].available_amount,
            Some(Nat::from(0u64))
        );
    }
}
