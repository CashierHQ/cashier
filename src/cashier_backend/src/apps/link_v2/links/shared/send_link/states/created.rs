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
use std::{collections::HashMap, future::Future, pin::Pin, rc::Rc};
use transaction_manager::v2::traits::TransactionManager;

use crate::apps::{
    link_v2::links::{shared::send_link::actions::create::CreateAction, traits::LinkV2State},
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
    pub async fn create_create_action<M, F, S>(
        caller: Principal,
        link: Link,
        canister_id: Principal,
        transaction_manager: M,
        mut token_fee_service: F,
        mut token_standard_service: S,
    ) -> Result<LinkCreateActionResult, CanisterError>
    where
        M: TransactionManager,
        F: TokenFeeCache,
        S: TokenStandardCache,
    {
        // validate caller is the link creator
        if caller != link.creator {
            return Err(CanisterError::Unauthorized(
                "Only the creator can create CREATE action on this link".to_string(),
            ));
        }

        let create_action = CreateAction::create(
            &link,
            canister_id,
            &mut token_fee_service,
            &mut token_standard_service,
        )
        .await?;
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
        M: TransactionManager,
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
        token_fee_service: F,
        token_standard_service: S,
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
                let create_action_result = Self::create_create_action(
                    caller,
                    link,
                    canister_id,
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::apps::{
        shared::test_utils::tests::MockTransactionManager,
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
        action::v1::ActionState, asset_info::AssetInfo, common::Asset, link::v1::LinkType,
    };
    use cashier_common::{constant::ICP_CANISTER_PRINCIPAL, test_utils::random_principal_id};
    use token_storage_types::token::IcrcStandard;
    use uuid::Uuid;

    /// Test fixture to create a link and the necessary services for testing
    /// # Arguments
    /// * `link_type` - The type of the link to be created
    /// * `ledger_ids` - A vector of ledger IDs for the assets in the link
    /// * `amounts` - A vector of amounts corresponding to each ledger ID
    /// * `max_use` - The maximum number of times the link can be used
    /// * `creator` - The principal of the link creator
    /// * `current_ts` - The current timestamp for setting up the services
    /// # Returns
    /// A tuple containing the created link and the necessary mock services for testing
    fn test_fixture(
        link_type: LinkType,
        ledger_ids: Vec<Principal>,
        amounts: Vec<Nat>,
        max_use: u64,
        creator: Principal,
        current_ts: u64,
    ) -> (
        Link,
        MockTransactionManager,
        MockTokenFeeService,
        MockTokenStandardService,
        MockTokenBalanceService,
    ) {
        let asset_info = ledger_ids
            .iter()
            .zip(amounts)
            .map(|(id, amount)| AssetInfo {
                asset: Asset::IC { address: *id },
                amount_per_link_use_action: amount,
                label: "asset".to_string(),
            })
            .collect::<Vec<AssetInfo>>();

        let link = Link {
            id: Uuid::new_v4().to_string(),
            title: "Test Link".to_string(),
            link_type,
            creator,
            asset_info,
            link_use_action_max_count: max_use,
            link_use_action_counter: 0,
            state: LinkState::CreateLink,
            create_at: 1_000_000,
        };

        let transaction_manager = MockTransactionManager::default();
        let token_fee_service = create_mock_token_fee_service(current_ts);
        let mut token_standard_service = create_mock_token_standard_service(current_ts);
        let mut token_balance_service = MockTokenBalanceService::new();

        token_fee_service
            .fetcher
            .set_fee(ICP_CANISTER_PRINCIPAL, Nat::from(10_000u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(
                ICP_CANISTER_PRINCIPAL,
                vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2],
            );
        token_balance_service.set_balance(ICP_CANISTER_PRINCIPAL, Nat::from(0u64));

        for ledger_id in ledger_ids {
            token_fee_service
                .fetcher
                .set_fee(ledger_id, Nat::from(10_000u64));
            token_standard_service
                .token_storage_client
                .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2]);
            token_balance_service.set_balance(ledger_id, Nat::from(1000u64));
        }

        (
            link,
            transaction_manager,
            token_fee_service,
            token_standard_service,
            token_balance_service,
        )
    }

    #[tokio::test]
    async fn it_should_fail_create_action_if_action_type_is_not_create_link() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id1 = random_principal_id();
        let ledger_id2 = random_principal_id();
        let amount1 = Nat::from(1000u64);
        let amount2 = Nat::from(2000u64);
        let max_use = 3u64;
        let current_ts = 1_000_000u64;

        let (
            link,
            transaction_manager,
            token_fee_service,
            token_standard_service,
            token_balance_service,
        ) = test_fixture(
            LinkType::SendTokenBasket,
            vec![ledger_id1, ledger_id2],
            vec![amount1, amount2],
            max_use,
            creator,
            current_ts,
        );
        let state_handler = CreatedState::new(&link, canister_id);

        // Act
        let result = state_handler
            .create_action(
                creator,
                ActionType::Receive, // Invalid action type for CreatedState
                transaction_manager,
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await;

        // Assert
        assert!(result.is_err());
        let error = result.err().unwrap();
        match error {
            CanisterError::ValidationErrors(msg) => {
                assert_eq!(msg, "Unsupported action type for Created state".to_string())
            }
            _ => panic!("Expected ValidationErrors"),
        }
    }

    #[tokio::test]
    async fn it_should_fail_create_action_if_caller_is_not_creator() {
        // Arrange
        let creator = random_principal_id();
        let non_creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id1 = random_principal_id();
        let ledger_id2 = random_principal_id();
        let amount1 = Nat::from(1000u64);
        let amount2 = Nat::from(2000u64);
        let max_use = 3u64;
        let current_ts = 1_000_000u64;

        let (
            link,
            transaction_manager,
            token_fee_service,
            token_standard_service,
            token_balance_service,
        ) = test_fixture(
            LinkType::SendTokenBasket,
            vec![ledger_id1, ledger_id2],
            vec![amount1, amount2],
            max_use,
            creator,
            current_ts,
        );
        let state_handler = CreatedState::new(&link, canister_id);

        // Act
        let result = state_handler
            .create_action(
                non_creator, // Caller is not the creator
                ActionType::CreateLink,
                transaction_manager,
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await;

        // Assert
        assert!(result.is_err());
        let error = result.err().unwrap();
        match error {
            CanisterError::Unauthorized(msg) => {
                assert_eq!(
                    msg,
                    "Only the creator can create CREATE action on this link".to_string()
                )
            }
            _ => panic!("Expected Unauthorized error"),
        }
    }

    #[tokio::test]
    async fn it_should_fail_create_action_if_transaction_manager_fails() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id1 = random_principal_id();
        let ledger_id2 = random_principal_id();
        let amount1 = Nat::from(1000u64);
        let amount2 = Nat::from(2000u64);
        let max_use = 3u64;
        let current_ts = 1_000_000u64;

        let (
            link,
            mut transaction_manager,
            token_fee_service,
            token_standard_service,
            token_balance_service,
        ) = test_fixture(
            LinkType::SendTokenBasket,
            vec![ledger_id1, ledger_id2],
            vec![amount1, amount2],
            max_use,
            creator,
            current_ts,
        );
        transaction_manager.set_failed(true);
        let state_handler = CreatedState::new(&link, canister_id);

        // Act
        let result = state_handler
            .create_action(
                creator,
                ActionType::CreateLink,
                transaction_manager,
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await;

        // Assert
        assert!(result.is_err());
        let error = result.err().unwrap();
        match error {
            CanisterError::HandleLogicError(msg) => {
                assert!(msg.contains("TxManager creates action failed for action"))
            }
            _ => panic!("Expected HandleLogicError"),
        }
    }

    #[tokio::test]
    async fn it_should_success_create_action_if_transaction_manager_succeeds() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id1 = random_principal_id();
        let ledger_id2 = random_principal_id();
        let amount1 = Nat::from(1000u64);
        let amount2 = Nat::from(2000u64);
        let max_use = 3u64;
        let current_ts = 1_000_000u64;

        let (
            link,
            transaction_manager,
            token_fee_service,
            token_standard_service,
            token_balance_service,
        ) = test_fixture(
            LinkType::SendTokenBasket,
            vec![ledger_id1, ledger_id2],
            vec![amount1, amount2],
            max_use,
            creator,
            current_ts,
        );
        let state_handler = CreatedState::new(&link, canister_id);

        // Act
        let result = state_handler
            .create_action(
                creator,
                ActionType::CreateLink,
                transaction_manager,
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        let create_action_result = result.ok().unwrap();
        assert_eq!(create_action_result.link.id, link.id);
        let action = create_action_result.create_action_result.action;
        assert_eq!(action.r#type, ActionType::CreateLink);
        assert_eq!(action.creator, creator);
        assert_eq!(action.state, ActionState::Created);

        let intents = create_action_result.create_action_result.intents;
        assert_eq!(intents.len(), 3);
    }

    #[tokio::test]
    async fn it_should_fail_process_action_if_action_type_is_not_create_link() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id1 = random_principal_id();
        let ledger_id2 = random_principal_id();
        let amount1 = Nat::from(1000u64);
        let amount2 = Nat::from(2000u64);
        let max_use = 3u64;
        let current_ts = 1_000_000u64;

        let (
            link,
            transaction_manager,
            _token_fee_service,
            _token_standard_service,
            _token_balance_service,
        ) = test_fixture(
            LinkType::SendTokenBasket,
            vec![ledger_id1, ledger_id2],
            vec![amount1, amount2],
            max_use,
            creator,
            current_ts,
        );
        let state_handler = CreatedState::new(&link, canister_id);

        let action = Action {
            id: Uuid::new_v4().to_string(),
            link_id: link.id.clone(),
            r#type: ActionType::Receive, // Invalid action type for CreatedState
            creator,
            state: ActionState::Created,
        };
        let intents = vec![];
        let intent_txs_map = HashMap::new();

        // Act
        let result = state_handler
            .process_action(
                creator,
                action,
                intents,
                intent_txs_map,
                transaction_manager,
            )
            .await;

        // Assert
        assert!(result.is_err());
        let error = result.err().unwrap();
        match error {
            CanisterError::ValidationErrors(msg) => {
                assert_eq!(msg, "Unsupported action type for Created state".to_string())
            }
            _ => panic!("Expected ValidationErrors"),
        }
    }

    #[tokio::test]
    async fn it_should_fail_process_action_if_caller_is_not_creator() {
        // Arrange
        let creator = random_principal_id();
        let non_creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id1 = random_principal_id();
        let ledger_id2 = random_principal_id();
        let amount1 = Nat::from(1000u64);
        let amount2 = Nat::from(2000u64);
        let max_use = 3u64;
        let current_ts = 1_000_000u64;

        let (
            link,
            transaction_manager,
            _token_fee_service,
            _token_standard_service,
            _token_balance_service,
        ) = test_fixture(
            LinkType::SendTokenBasket,
            vec![ledger_id1, ledger_id2],
            vec![amount1, amount2],
            max_use,
            creator,
            current_ts,
        );
        let state_handler = CreatedState::new(&link, canister_id);

        let action = Action {
            id: Uuid::new_v4().to_string(),
            link_id: link.id.clone(),
            r#type: ActionType::CreateLink,
            creator,
            state: ActionState::Created,
        };
        let intents = vec![];
        let intent_txs_map = HashMap::new();

        // Act
        let result = state_handler
            .process_action(
                non_creator,
                action,
                intents,
                intent_txs_map,
                transaction_manager,
            )
            .await;

        // Assert
        assert!(result.is_err());
        let error = result.err().unwrap();
        match error {
            CanisterError::Unauthorized(msg) => {
                assert_eq!(msg, "Only the creator can publish the link".to_string())
            }
            _ => panic!("Expected Unauthorized error"),
        }
    }

    #[tokio::test]
    async fn it_should_fail_process_action_if_transaction_manager_fails() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id1 = random_principal_id();
        let ledger_id2 = random_principal_id();
        let amount1 = Nat::from(1000u64);
        let amount2 = Nat::from(2000u64);
        let max_use = 3u64;
        let current_ts = 1_000_000u64;

        let (
            link,
            mut transaction_manager,
            token_fee_service,
            token_standard_service,
            token_balance_service,
        ) = test_fixture(
            LinkType::SendTokenBasket,
            vec![ledger_id1, ledger_id2],
            vec![amount1, amount2],
            max_use,
            creator,
            current_ts,
        );
        let state_handler = CreatedState::new(&link, canister_id);

        let create_action_result = state_handler
            .create_action(
                creator,
                ActionType::CreateLink,
                transaction_manager.clone(),
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await
            .unwrap();

        let action = create_action_result.create_action_result.action;
        let intents = create_action_result.create_action_result.intents;
        let intent_txs_map = create_action_result.create_action_result.intent_txs_map;

        transaction_manager.set_failed(true);

        // Act
        let result = state_handler
            .process_action(
                creator,
                action,
                intents,
                intent_txs_map,
                transaction_manager,
            )
            .await;

        // Assert
        assert!(result.is_err());
        let error = result.err().unwrap();
        match error {
            CanisterError::HandleLogicError(msg) => {
                assert!(msg.contains("TxManager process action failed for action"))
            }
            _ => panic!("Expected HandleLogicError"),
        }
    }

    #[tokio::test]
    async fn is_should_success_process_action_if_transaction_manager_succeeds() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id1 = random_principal_id();
        let ledger_id2 = random_principal_id();
        let amount1 = Nat::from(1000u64);
        let amount2 = Nat::from(2000u64);
        let max_use = 3u64;
        let current_ts = 1_000_000u64;

        let (
            link,
            transaction_manager,
            token_fee_service,
            token_standard_service,
            token_balance_service,
        ) = test_fixture(
            LinkType::SendTokenBasket,
            vec![ledger_id1, ledger_id2],
            vec![amount1, amount2],
            max_use,
            creator,
            current_ts,
        );
        let state_handler = CreatedState::new(&link, canister_id);

        let create_action_result = state_handler
            .create_action(
                creator,
                ActionType::CreateLink,
                transaction_manager.clone(),
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await
            .unwrap();

        let action = create_action_result.create_action_result.action;
        let intents = create_action_result.create_action_result.intents;
        let intent_txs_map = create_action_result.create_action_result.intent_txs_map;

        // Act
        let result = state_handler
            .process_action(
                creator,
                action,
                intents,
                intent_txs_map,
                transaction_manager,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        let process_action_result = result.ok().unwrap();
        assert_eq!(process_action_result.link.state, LinkState::Active);
    }
}
