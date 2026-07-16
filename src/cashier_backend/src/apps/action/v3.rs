// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    dto::link::GetLinkOptions,
    error::CanisterError,
    link_v3::link_result::LinkProcessActionResult,
    repository::{
        action::{
            v1::{ActionState, ActionType},
            v3::ActionV3,
        },
        action_intent::v1::ActionIntent,
        intent::v3::IntentV3,
        intent_transaction::v1::IntentTransaction,
        link_action::v1::{LinkAction, LinkUserState},
        transaction::v1::Transaction,
        user_action::v1::UserAction,
    },
    service::action::v3::ActionDataV3,
};
use cashier_shared::types::Action as ActionShared;
use log::error;
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

use crate::repositories::{self, Repositories};

pub struct ActionServiceV3<R: Repositories> {
    // Concrete repository implementations
    action_repository: repositories::action::v3::ActionV3Repository<R::ActionV3>,
    intent_repository: repositories::intent::v3::IntentV3Repository<R::IntentV3>,
    action_intent_repository: repositories::action_intent::ActionIntentRepository<R::ActionIntent>,
    transaction_repository: repositories::transaction::TransactionRepository<R::Transaction>,
    intent_transaction_repository:
        repositories::intent_transaction::IntentTransactionRepository<R::IntentTransaction>,
    link_action_repository: repositories::link_action::LinkActionRepository<R::LinkAction>,
    user_action_repository: repositories::user_action::UserActionRepository<R::UserAction>,
    user_link_action_repository:
        repositories::user_link_action::UserLinkActionRepository<R::UserLinkAction>,
    // Domain logic
}

impl<R: Repositories> ActionServiceV3<R> {
    pub fn new(repo: &R) -> Self {
        Self {
            action_repository: repo.action_v3(),
            intent_repository: repo.intent_v3(),
            action_intent_repository: repo.action_intent(),
            transaction_repository: repo.transaction(),
            intent_transaction_repository: repo.intent_transaction(),
            link_action_repository: repo.link_action(),
            user_action_repository: repo.user_action(),
            user_link_action_repository: repo.user_link_action(),
        }
    }

    /// Creates an ActionV3 model from shared action data.
    /// # Arguments
    /// * `action` - The shared action data
    /// * `link_id` - Optional link ID associated with the action
    /// * `creator` - The principal of the action creator
    /// # Returns
    /// * `ActionV3` - The created ActionV3 model
    pub fn create_action_from_shared_data(
        &self,
        action: ActionShared,
        link_id: Option<String>,
        creator: Principal,
    ) -> ActionV3 {
        let action_id = Uuid::new_v4().to_string();
        let mut action_model = ActionV3::from(action);
        action_model.id = action_id;
        action_model.creator = creator;
        action_model.link_id = link_id.unwrap_or_default();
        action_model
    }

    /// Stores action-related data into the database.
    /// # Arguments
    /// * `link_action` - The LinkAction model to store
    /// * `action` - The ActionV3 model to store
    /// * `intents` - The list of IntentV3 models to store
    /// * `intent_txs_map` - A map of intent IDs to their associated transactions
    /// * `user_id` - The principal of the user associated with the action
    /// # Returns
    /// * `Result<(), CanisterError>` - Ok if successful, otherwise an error
    pub fn store_action_data(
        &mut self,
        link_action: LinkAction,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        user_id: Principal,
    ) -> Result<(), CanisterError> {
        let action_intents = intents
            .iter()
            .map(|intent| ActionIntent {
                action_id: action.id.clone(),
                intent_id: intent.id.clone(),
            })
            .collect::<Vec<ActionIntent>>();

        let mut intent_transactions: Vec<IntentTransaction> = vec![];
        let mut transactions: Vec<Transaction> = vec![];
        let mut transaction_ids = HashSet::<String>::new();

        for (intent_id, txs) in intent_txs_map {
            for tx in txs {
                let intent_transaction = IntentTransaction {
                    intent_id: intent_id.clone(),
                    transaction_id: tx.id.clone(),
                };
                intent_transactions.push(intent_transaction);
                if transaction_ids.insert(tx.id.clone()) {
                    transactions.push(tx);
                }
            }
        }

        let user_action = UserAction {
            user_id,
            action_id: action.id.clone(),
        };

        self.link_action_repository.create(link_action.clone());
        self.user_action_repository.create(user_action);
        self.action_repository.create(action);
        self.action_intent_repository.batch_create(action_intents);
        self.intent_repository.batch_create(intents);
        self.intent_transaction_repository
            .batch_create(intent_transactions);
        self.transaction_repository.batch_create(transactions);
        self.user_link_action_repository.create(link_action);

        Ok(())
    }

    /// Retrieves action-related data from the database.
    /// # Arguments
    /// * `action_id` - The ID of the action to retrieve
    /// # Returns
    /// * `Result<ActionDataV3, String>` - The retrieved action data or an error message
    pub fn get_action_data(&self, action_id: &str) -> Result<ActionDataV3, String> {
        let action = self
            .action_repository
            .get(action_id)
            .ok_or_else(|| "action not found".to_string())?;

        let all_intents = self.action_intent_repository.get_by_action_id(action_id);

        let intents: Vec<IntentV3> = all_intents
            .iter()
            .map(|ai| {
                self.intent_repository
                    .get(&ai.intent_id)
                    .ok_or_else(|| format!("intent not found: {}", ai.intent_id))
            })
            .collect::<Result<_, _>>()?;

        let mut intent_txs_hashmap = HashMap::new();

        for action_intent in all_intents {
            let intent_transactions = self
                .intent_transaction_repository
                .get_by_intent_id(&action_intent.intent_id);

            let mut txs = vec![];
            for intent_tx in intent_transactions {
                let tx = self
                    .transaction_repository
                    .get(&intent_tx.transaction_id.clone())
                    .ok_or_else(|| "transaction not found".to_string())?;
                txs.push(tx);
            }

            intent_txs_hashmap.insert(action_intent.intent_id, txs);
        }

        Ok(ActionDataV3 {
            action,
            intents,
            intent_txs: intent_txs_hashmap,
        })
    }

    /// Updates action-related data in the database.
    /// # Arguments
    /// * `action` - The ActionV3 model to update
    /// * `intents` - The list of IntentV3 models to update
    /// * `intent_tx_map` - A map of intent IDs to their associated transactions
    /// # Returns
    /// * `Result<(), CanisterError>` - Ok if successful, otherwise an error
    pub fn update_action_data(
        &mut self,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_tx_map: &HashMap<String, Vec<Transaction>>,
    ) -> Result<(), CanisterError> {
        self.action_repository.update(action);
        self.intent_repository.batch_update(intents);

        let mut transactions: Vec<Transaction> = vec![];
        for txs in intent_tx_map.values() {
            for tx in txs {
                transactions.push(tx.clone());
            }
        }
        self.transaction_repository.batch_create(transactions);

        Ok(())
    }

    /// Updates the link user state based on the result of a link process action.
    /// # Arguments
    /// * `result` - The result of the link process action
    pub fn update_link_user_state(&mut self, result: &LinkProcessActionResult) {
        let action = &result.process_action_result.action;
        if result.process_action_result.is_success
            && matches!(action.action_type, ActionType::Receive | ActionType::Send)
            && action.state == ActionState::Success
        {
            let link_action = LinkAction {
                link_id: result.link.id.clone(),
                action_type: action.action_type.clone(),
                action_id: action.id.clone(),
                user_id: action.creator,
                link_user_state: Some(LinkUserState::Completed),
            };

            self.user_link_action_repository.update(link_action);
        } else {
            error!(
                "Link user state not updated for action {:#?} of link {:#?} due to unsuccessful processing or non-matching action type/state",
                action, result.link,
            );
        }
    }

    /// Retrieves all of the caller's actions for a given link and action type,
    /// in creation order (oldest first).
    /// # Arguments
    /// * `caller` - The principal of the caller
    /// * `link_id` - The ID of the link to retrieve actions for
    /// * `options` - Optional parameters for filtering actions
    /// # Returns
    /// * `Vec<ActionV3>` - A vector of ActionV3 models matching the criteria
    pub fn get_actions(
        &self,
        caller: &Principal,
        link_id: &str,
        options: Option<GetLinkOptions>,
    ) -> Vec<ActionV3> {
        let Some(opts) = options else {
            return vec![];
        };
        let action_type = opts.action_type;

        let Some(link_actions) = self
            .user_link_action_repository
            .get_actions_by_user_link_and_type(*caller, link_id, &action_type)
        else {
            return vec![];
        };

        link_actions
            .iter()
            .filter_map(|link_action| self.action_repository.get(&link_action.action_id))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::tests::TestRepositories;
    use candid::Nat;
    use cashier_backend_types::{
        link_v3::{action_result::ProcessActionResult, link_result::LinkProcessActionResult},
        repository::{
            asset::{
                v1::Asset,
                v3::{AssetV3, TokenStandardV3},
            },
            common::{AddressTypeV3, Wallet},
            intent::v1::IntentState,
            link::{
                v1::LinkType,
                v3::{LinkState, LinkV3},
            },
            transaction::v1::{FromCallType, IcTransaction, Icrc1Transfer, Protocol},
        },
    };
    use cashier_common::test_utils::{random_id_string, random_principal_id};
    use cashier_shared::types::{
        Action as SharedAction, ActionState as SharedActionState, ActionType as SharedActionType,
        AddressType as SharedAddressType,
    };
    use std::collections::HashMap;

    fn fixture_link_v3(id: &str, creator: Principal) -> LinkV3 {
        LinkV3 {
            id: id.to_string(),
            title: "test-link".to_string(),
            link_type: LinkType::SendTip,
            asset_info: vec![],
            max_use: 3,
            use_count: 0,
            creator,
            state: LinkState::Active,
            created_at: 1_000_000,
        }
    }

    fn fixture_action_v3(
        id: &str,
        action_type: ActionType,
        state: ActionState,
        creator: Principal,
        link_id: &str,
    ) -> ActionV3 {
        ActionV3 {
            id: id.to_string(),
            action_type,
            state,
            creator,
            creator_address_type: AddressTypeV3::User,
            link_id: link_id.to_string(),
            intent_ids: vec![],
        }
    }

    fn fixture_intent_v3(id: &str, action_id: &str) -> IntentV3 {
        IntentV3 {
            id: id.to_string(),
            label: "intent".to_string(),
            intent_type: cashier_backend_types::repository::intent::v3::IntentTypeV3::Send,
            asset: AssetV3 {
                address: random_principal_id(),
                network_fee: None,
                token_standard: TokenStandardV3::ICRC1,
            },
            amount: Nat::from(1_000u64),
            total_amount: None,
            network_fee: None,
            user_fee: None,
            source_address: random_principal_id(),
            source_account: None,
            source_address_type: AddressTypeV3::Link,
            dest_address: random_principal_id(),
            dest_account: None,
            dest_address_type: AddressTypeV3::User,
            intent_tx_data: None,
            dependencies: vec![],
            action_id: action_id.to_string(),
            state: IntentState::Created,
            created_at: 1_000_000,
        }
    }

    fn fixture_transaction(id: &str) -> Transaction {
        Transaction {
            id: id.to_string(),
            created_at: 1_000_000,
            state: cashier_backend_types::repository::transaction::v1::TransactionState::Created,
            dependency: None,
            group: 0,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::IC {
                    address: random_principal_id(),
                },
                amount: Nat::from(1_000u64),
                memo: None,
                ts: Some(1_000_000),
            })),
            start_ts: None,
        }
    }

    fn fixture_shared_action(action_type: SharedActionType, creator: Principal) -> SharedAction {
        SharedAction {
            id: Uuid::new_v4().to_string(),
            creator,
            creator_address_type: SharedAddressType::Creator,
            action_type,
            intents: vec![],
            action_state: SharedActionState::Created,
            link_id: None,
            intent_ids: None,
        }
    }

    // ---- create_action_from_shared_data ----

    #[test]
    fn it_should_generate_new_id_and_set_creator_and_link_id() {
        // Arrange
        let repositories = TestRepositories::new();
        let service = ActionServiceV3::new(&repositories);
        let creator = random_principal_id();
        let shared_action = fixture_shared_action(SharedActionType::Receive, creator);
        let original_id = shared_action.id.clone();
        let link_id = random_id_string();

        // Act
        let action_model =
            service.create_action_from_shared_data(shared_action, Some(link_id.clone()), creator);

        // Assert
        assert_ne!(action_model.id, original_id, "a fresh id must be generated");
        assert!(!action_model.id.is_empty());
        assert_eq!(action_model.creator, creator);
        assert_eq!(action_model.link_id, link_id);
        assert_eq!(action_model.action_type, ActionType::Receive);
    }

    #[test]
    fn it_should_default_link_id_to_empty_string_when_none() {
        // Arrange
        let repositories = TestRepositories::new();
        let service = ActionServiceV3::new(&repositories);
        let creator = random_principal_id();
        let shared_action = fixture_shared_action(SharedActionType::CreateLink, creator);

        // Act
        let action_model = service.create_action_from_shared_data(shared_action, None, creator);

        // Assert
        assert_eq!(action_model.link_id, "");
    }

    // ---- store_action_data ----

    #[test]
    fn it_should_store_action_data_with_no_intents() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = ActionServiceV3::new(&repositories);
        let creator = random_principal_id();
        let link_id = random_id_string();
        let action_id = random_id_string();
        let action = fixture_action_v3(
            &action_id,
            ActionType::Receive,
            ActionState::Created,
            creator,
            &link_id,
        );
        let link_action = LinkAction {
            link_id,
            action_type: ActionType::Receive,
            action_id: action_id.clone(),
            user_id: creator,
            link_user_state: None,
        };

        // Act
        let result =
            service.store_action_data(link_action, action, vec![], HashMap::new(), creator);

        // Assert
        assert!(result.is_ok());
        let stored = service
            .get_action_data(&action_id)
            .expect("action data should be retrievable");
        assert_eq!(stored.action.id, action_id);
        assert!(stored.intents.is_empty());
        assert!(stored.intent_txs.is_empty());
    }

    #[test]
    fn it_should_store_action_data_with_intents_and_transactions() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = ActionServiceV3::new(&repositories);
        let creator = random_principal_id();
        let link_id = random_id_string();
        let action_id = random_id_string();
        let action = fixture_action_v3(
            &action_id,
            ActionType::Receive,
            ActionState::Created,
            creator,
            &link_id,
        );
        let link_action = LinkAction {
            link_id,
            action_type: ActionType::Receive,
            action_id: action_id.clone(),
            user_id: creator,
            link_user_state: None,
        };

        let intent = fixture_intent_v3(&random_id_string(), &action_id);
        let intent_id = intent.id.clone();
        let transaction = fixture_transaction(&random_id_string());
        let mut intent_txs_map = HashMap::new();
        intent_txs_map.insert(intent_id.clone(), vec![transaction.clone()]);

        // Act
        let result =
            service.store_action_data(link_action, action, vec![intent], intent_txs_map, creator);

        // Assert
        assert!(result.is_ok());
        let stored = service
            .get_action_data(&action_id)
            .expect("action data should be retrievable");
        assert_eq!(stored.intents.len(), 1);
        assert_eq!(stored.intents[0].id, intent_id);
        let txs = stored.intent_txs.get(&intent_id).expect("txs for intent");
        assert_eq!(txs.len(), 1);
        assert_eq!(txs[0].id, transaction.id);
    }

    #[test]
    fn it_should_create_user_link_action_entry_that_get_actions_can_find() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = ActionServiceV3::new(&repositories);
        let creator = random_principal_id();
        let link_id = random_id_string();
        let action_id = random_id_string();
        let action = fixture_action_v3(
            &action_id,
            ActionType::Receive,
            ActionState::Created,
            creator,
            &link_id,
        );
        let link_action = LinkAction {
            link_id: link_id.clone(),
            action_type: ActionType::Receive,
            action_id: action_id.clone(),
            user_id: creator,
            link_user_state: None,
        };

        // Act
        service
            .store_action_data(link_action, action, vec![], HashMap::new(), creator)
            .expect("store should succeed");

        let actions = service.get_actions(
            &creator,
            &link_id,
            Some(GetLinkOptions {
                action_type: ActionType::Receive,
            }),
        );

        // Assert
        assert_eq!(actions.len(), 1);
        assert_eq!(actions[0].id, action_id);
    }

    // ---- get_action_data ----

    #[test]
    fn it_should_fail_get_action_data_when_action_not_found() {
        // Arrange
        let repositories = TestRepositories::new();
        let service = ActionServiceV3::new(&repositories);

        // Act
        let result = service.get_action_data("non-existent-action");

        // Assert
        assert_eq!(result.unwrap_err(), "action not found".to_string());
    }

    #[test]
    fn it_should_fail_get_action_data_when_referenced_intent_missing() {
        // Arrange: an action whose ActionIntent link points at an intent that
        // was never actually stored (data corruption / partial write).
        let repositories = TestRepositories::new();
        let mut service = ActionServiceV3::new(&repositories);
        let creator = random_principal_id();
        let action_id = random_id_string();
        let action = fixture_action_v3(
            &action_id,
            ActionType::Receive,
            ActionState::Created,
            creator,
            &random_id_string(),
        );
        service.action_repository.create(action);

        let missing_intent_id = random_id_string();
        service
            .action_intent_repository
            .batch_create(vec![ActionIntent {
                action_id: action_id.clone(),
                intent_id: missing_intent_id.clone(),
            }]);

        // Act
        let result = service.get_action_data(&action_id);

        // Assert
        assert_eq!(
            result.unwrap_err(),
            format!("intent not found: {missing_intent_id}")
        );
    }

    #[test]
    fn it_should_fail_get_action_data_when_referenced_transaction_missing() {
        // Arrange: an intent whose IntentTransaction link points at a
        // transaction that was never actually stored.
        let repositories = TestRepositories::new();
        let mut service = ActionServiceV3::new(&repositories);
        let creator = random_principal_id();
        let action_id = random_id_string();
        let action = fixture_action_v3(
            &action_id,
            ActionType::Receive,
            ActionState::Created,
            creator,
            &random_id_string(),
        );
        service.action_repository.create(action);

        let intent = fixture_intent_v3(&random_id_string(), &action_id);
        let intent_id = intent.id.clone();
        service.intent_repository.batch_create(vec![intent]);
        service
            .action_intent_repository
            .batch_create(vec![ActionIntent {
                action_id: action_id.clone(),
                intent_id: intent_id.clone(),
            }]);

        let missing_transaction_id = random_id_string();
        service
            .intent_transaction_repository
            .batch_create(vec![IntentTransaction {
                intent_id,
                transaction_id: missing_transaction_id,
            }]);

        // Act
        let result = service.get_action_data(&action_id);

        // Assert
        assert_eq!(result.unwrap_err(), "transaction not found".to_string());
    }

    // ---- update_action_data ----

    #[test]
    fn it_should_update_action_state_and_intents_and_add_transactions() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = ActionServiceV3::new(&repositories);
        let creator = random_principal_id();
        let link_id = random_id_string();
        let action_id = random_id_string();
        let action = fixture_action_v3(
            &action_id,
            ActionType::Receive,
            ActionState::Created,
            creator,
            &link_id,
        );
        let link_action = LinkAction {
            link_id,
            action_type: ActionType::Receive,
            action_id: action_id.clone(),
            user_id: creator,
            link_user_state: None,
        };
        let intent = fixture_intent_v3(&random_id_string(), &action_id);
        let intent_id = intent.id.clone();
        service
            .store_action_data(
                link_action,
                action,
                vec![intent.clone()],
                HashMap::new(),
                creator,
            )
            .expect("store should succeed");

        let mut updated_action = service.action_repository.get(&action_id).unwrap();
        updated_action.state = ActionState::Success;
        let mut updated_intent = intent;
        updated_intent.state = IntentState::Success;
        let new_transaction = fixture_transaction(&random_id_string());
        let mut intent_tx_map = HashMap::new();
        intent_tx_map.insert(intent_id.clone(), vec![new_transaction.clone()]);

        // Act
        let result =
            service.update_action_data(updated_action, vec![updated_intent], &intent_tx_map);

        // Assert
        assert!(result.is_ok());
        let stored_action = service.action_repository.get(&action_id).unwrap();
        assert_eq!(stored_action.state, ActionState::Success);
        let stored_intent = service.intent_repository.get(&intent_id).unwrap();
        assert_eq!(stored_intent.state, IntentState::Success);
        let stored_tx = service
            .transaction_repository
            .get(&new_transaction.id)
            .expect("transaction should be stored");
        assert_eq!(stored_tx.id, new_transaction.id);
    }

    // ---- update_link_user_state ----

    fn fixture_process_result(
        link: LinkV3,
        action: ActionV3,
        is_success: bool,
    ) -> LinkProcessActionResult {
        LinkProcessActionResult {
            link,
            process_action_result: ProcessActionResult {
                action,
                intents: vec![],
                intent_txs_map: HashMap::new(),
                icrc112_requests: None,
                is_success,
                errors: vec![],
            },
        }
    }

    #[test]
    fn it_should_mark_completed_for_successful_receive_action() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = ActionServiceV3::new(&repositories);
        let creator = random_principal_id();
        let link_id = random_id_string();
        let action_id = random_id_string();
        let action = fixture_action_v3(
            &action_id,
            ActionType::Receive,
            ActionState::Success,
            creator,
            &link_id,
        );
        let result = fixture_process_result(fixture_link_v3(&link_id, creator), action, true);

        // Act
        service.update_link_user_state(&result);

        // Assert
        let stored = service
            .user_link_action_repository
            .get_actions_by_user_link_and_type(creator, &link_id, &ActionType::Receive)
            .expect("link action should have been recorded");
        assert_eq!(stored.len(), 1);
        assert_eq!(stored[0].action_id, action_id);
        assert_eq!(stored[0].link_user_state, Some(LinkUserState::Completed));
    }

    #[test]
    fn it_should_mark_completed_for_successful_send_action() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = ActionServiceV3::new(&repositories);
        let creator = random_principal_id();
        let link_id = random_id_string();
        let action_id = random_id_string();
        let action = fixture_action_v3(
            &action_id,
            ActionType::Send,
            ActionState::Success,
            creator,
            &link_id,
        );
        let result = fixture_process_result(fixture_link_v3(&link_id, creator), action, true);

        // Act
        service.update_link_user_state(&result);

        // Assert
        let stored = service
            .user_link_action_repository
            .get_actions_by_user_link_and_type(creator, &link_id, &ActionType::Send)
            .expect("link action should have been recorded");
        assert_eq!(stored[0].link_user_state, Some(LinkUserState::Completed));
    }

    #[test]
    fn it_should_not_update_when_processing_was_not_successful() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = ActionServiceV3::new(&repositories);
        let creator = random_principal_id();
        let link_id = random_id_string();
        let action = fixture_action_v3(
            &random_id_string(),
            ActionType::Receive,
            ActionState::Fail,
            creator,
            &link_id,
        );
        let result = fixture_process_result(fixture_link_v3(&link_id, creator), action, false);

        // Act
        service.update_link_user_state(&result);

        // Assert
        assert!(
            service
                .user_link_action_repository
                .get_actions_by_user_link_and_type(creator, &link_id, &ActionType::Receive)
                .is_none()
        );
    }

    #[test]
    fn it_should_not_update_when_action_type_is_not_receive_or_send() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = ActionServiceV3::new(&repositories);
        let creator = random_principal_id();
        let link_id = random_id_string();
        let action = fixture_action_v3(
            &random_id_string(),
            ActionType::Withdraw,
            ActionState::Success,
            creator,
            &link_id,
        );
        let result = fixture_process_result(fixture_link_v3(&link_id, creator), action, true);

        // Act
        service.update_link_user_state(&result);

        // Assert
        assert!(
            service
                .user_link_action_repository
                .get_actions_by_user_link_and_type(creator, &link_id, &ActionType::Withdraw)
                .is_none()
        );
    }

    #[test]
    fn it_should_not_update_when_action_state_is_not_success() {
        // Arrange: is_success=true at the process-result level, but the
        // action itself didn't land in Success state (defensive mismatch).
        let repositories = TestRepositories::new();
        let mut service = ActionServiceV3::new(&repositories);
        let creator = random_principal_id();
        let link_id = random_id_string();
        let action = fixture_action_v3(
            &random_id_string(),
            ActionType::Receive,
            ActionState::Processing,
            creator,
            &link_id,
        );
        let result = fixture_process_result(fixture_link_v3(&link_id, creator), action, true);

        // Act
        service.update_link_user_state(&result);

        // Assert
        assert!(
            service
                .user_link_action_repository
                .get_actions_by_user_link_and_type(creator, &link_id, &ActionType::Receive)
                .is_none()
        );
    }

    // ---- get_actions ----

    #[test]
    fn it_should_return_empty_vec_when_options_is_none() {
        // Arrange
        let repositories = TestRepositories::new();
        let service = ActionServiceV3::new(&repositories);

        // Act
        let actions = service.get_actions(&random_principal_id(), &random_id_string(), None);

        // Assert
        assert!(actions.is_empty());
    }

    #[test]
    fn it_should_return_empty_vec_when_no_actions_exist_for_user_link_type() {
        // Arrange
        let repositories = TestRepositories::new();
        let service = ActionServiceV3::new(&repositories);

        // Act
        let actions = service.get_actions(
            &random_principal_id(),
            &random_id_string(),
            Some(GetLinkOptions {
                action_type: ActionType::Receive,
            }),
        );

        // Assert
        assert!(actions.is_empty());
    }

    #[test]
    fn it_should_return_all_actions_in_creation_order_for_multiple_claims() {
        // Arrange: two RECEIVE claims by the same user for the same link —
        // one already Success (a prior claim), one still Created (pending) —
        // both must be returned, not just the first ever created.
        let repositories = TestRepositories::new();
        let mut service = ActionServiceV3::new(&repositories);
        let creator = random_principal_id();
        let link_id = random_id_string();

        let first_action_id = random_id_string();
        let first_action = fixture_action_v3(
            &first_action_id,
            ActionType::Receive,
            ActionState::Success,
            creator,
            &link_id,
        );
        service
            .store_action_data(
                LinkAction {
                    link_id: link_id.clone(),
                    action_type: ActionType::Receive,
                    action_id: first_action_id.clone(),
                    user_id: creator,
                    link_user_state: Some(LinkUserState::Completed),
                },
                first_action,
                vec![],
                HashMap::new(),
                creator,
            )
            .expect("first store should succeed");

        let second_action_id = random_id_string();
        let second_action = fixture_action_v3(
            &second_action_id,
            ActionType::Receive,
            ActionState::Created,
            creator,
            &link_id,
        );
        service
            .store_action_data(
                LinkAction {
                    link_id: link_id.clone(),
                    action_type: ActionType::Receive,
                    action_id: second_action_id.clone(),
                    user_id: creator,
                    link_user_state: None,
                },
                second_action,
                vec![],
                HashMap::new(),
                creator,
            )
            .expect("second store should succeed");

        // Act
        let actions = service.get_actions(
            &creator,
            &link_id,
            Some(GetLinkOptions {
                action_type: ActionType::Receive,
            }),
        );

        // Assert
        assert_eq!(actions.len(), 2);
        assert_eq!(actions[0].id, first_action_id);
        assert_eq!(actions[0].state, ActionState::Success);
        assert_eq!(actions[1].id, second_action_id);
        assert_eq!(actions[1].state, ActionState::Created);
    }

    #[test]
    fn it_should_skip_link_actions_whose_action_record_is_missing() {
        // Arrange: a LinkAction entry whose referenced action was never
        // stored (or was removed) — get_actions must skip it via filter_map
        // rather than panicking or returning a placeholder.
        let repositories = TestRepositories::new();
        let mut service = ActionServiceV3::new(&repositories);
        let creator = random_principal_id();
        let link_id = random_id_string();

        service.user_link_action_repository.create(LinkAction {
            link_id: link_id.clone(),
            action_type: ActionType::Receive,
            action_id: random_id_string(),
            user_id: creator,
            link_user_state: None,
        });

        // Act
        let actions = service.get_actions(
            &creator,
            &link_id,
            Some(GetLinkOptions {
                action_type: ActionType::Receive,
            }),
        );

        // Assert
        assert!(actions.is_empty());
    }

    #[test]
    fn it_should_only_return_actions_matching_the_requested_action_type() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = ActionServiceV3::new(&repositories);
        let creator = random_principal_id();
        let link_id = random_id_string();

        let receive_action_id = random_id_string();
        service
            .store_action_data(
                LinkAction {
                    link_id: link_id.clone(),
                    action_type: ActionType::Receive,
                    action_id: receive_action_id.clone(),
                    user_id: creator,
                    link_user_state: None,
                },
                fixture_action_v3(
                    &receive_action_id,
                    ActionType::Receive,
                    ActionState::Created,
                    creator,
                    &link_id,
                ),
                vec![],
                HashMap::new(),
                creator,
            )
            .expect("store receive action should succeed");

        let withdraw_action_id = random_id_string();
        service
            .store_action_data(
                LinkAction {
                    link_id: link_id.clone(),
                    action_type: ActionType::Withdraw,
                    action_id: withdraw_action_id.clone(),
                    user_id: creator,
                    link_user_state: None,
                },
                fixture_action_v3(
                    &withdraw_action_id,
                    ActionType::Withdraw,
                    ActionState::Created,
                    creator,
                    &link_id,
                ),
                vec![],
                HashMap::new(),
                creator,
            )
            .expect("store withdraw action should succeed");

        // Act
        let actions = service.get_actions(
            &creator,
            &link_id,
            Some(GetLinkOptions {
                action_type: ActionType::Receive,
            }),
        );

        // Assert
        assert_eq!(actions.len(), 1);
        assert_eq!(actions[0].id, receive_action_id);
    }
}
