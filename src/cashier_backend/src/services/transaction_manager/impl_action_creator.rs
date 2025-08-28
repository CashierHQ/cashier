// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    dto::action::ActionDto,
    error::CanisterError,
    repository::{link_action::v1::LinkAction, transaction::v2::Transaction},
    service::link::TemporaryAction,
};
use std::collections::HashMap;

use crate::{
    repositories::Repositories,
    services::transaction_manager::{service::TransactionManagerService, traits::ActionCreator},
    utils::runtime::IcEnvironment,
};

impl<E: IcEnvironment + Clone, R: Repositories> ActionCreator<E>
    for TransactionManagerService<E, R>
{
    fn create_action(
        &mut self,
        ts: u64,
        temp_action: &mut TemporaryAction,
    ) -> Result<ActionDto, CanisterError> {
        let mut intent_tx_hashmap: HashMap<String, Vec<Transaction>> = HashMap::new();
        let mut intent_tx_ids_hashmap: HashMap<String, Vec<String>> = HashMap::new();

        // check action id
        let action = self.action_service.get_action_by_id(&temp_action.id);
        if action.is_some() {
            return Err(CanisterError::HandleLogicError(
                "Action already exists".to_string(),
            ));
        }

        // fill in tx info
        // enrich each intent with chain-level txs needed to achieve the intent
        for intent in temp_action.intents.iter() {
            let chain = intent.chain.clone();
            // assemble txs

            let txs = self
                .intent_adapter
                .intent_to_transactions(&chain, ts, intent)?;
            intent_tx_hashmap.insert(intent.id.clone(), txs.clone());

            // store tx ids in hashmap
            let tx_ids: Vec<String> = txs.iter().map(|tx| tx.id.clone()).collect();
            intent_tx_ids_hashmap.insert(intent.id.clone(), tx_ids);
        }

        // fill in dependency info
        // if intent A has dependency on intent B, all tx in A will have dependency on txs in B
        for intent in temp_action.intents.iter() {
            // collect the tx ids of the dependencies
            // if not found throw error
            let dependency_tx_ids: Vec<String> = intent
                .dependency
                .iter()
                .map(|dependency_id| {
                    intent_tx_ids_hashmap
                        .get(dependency_id)
                        .ok_or_else(|| {
                            CanisterError::InvalidDataError(format!(
                                "Dependency ID {dependency_id} not found"
                            ))
                        })
                        .cloned()
                })
                .collect::<Result<Vec<Vec<String>>, CanisterError>>()?
                .into_iter()
                .flatten()
                .collect();

            if !dependency_tx_ids.is_empty() {
                // store the dependency tx ids in the tx of current intent
                let txs = intent_tx_hashmap.get_mut(&intent.id).ok_or_else(|| {
                    CanisterError::HandleLogicError(format!("Intent ID {} not found", intent.id))
                })?;
                for tx in txs.iter_mut() {
                    // if the tx already has dependency, then extend the existing dependency
                    match &mut tx.dependency {
                        Some(existing_deps) => {
                            existing_deps.extend(dependency_tx_ids.clone());
                        }
                        None => {
                            tx.dependency = Some(dependency_tx_ids.clone());
                        }
                    }
                }
            }
        }

        // set link_user_state based on action type
        // if action type is claim, then set link_user_state to ChooseWallet
        // else set it to None

        let link_action = LinkAction {
            link_id: temp_action.link_id.clone(),
            action_type: temp_action.r#type.clone(),
            action_id: temp_action.id.clone(),
            user_id: temp_action.creator,
            link_user_state: temp_action.default_link_user_state.clone(),
        };

        // save action to DB
        let _ = self.action_service.store_action_data(
            link_action,
            temp_action.as_action(),
            temp_action.intents.clone(),
            intent_tx_hashmap.clone(),
            temp_action.creator.clone(),
        );

        Ok(ActionDto::from_with_tx(
            temp_action.as_action(),
            temp_action.intents.clone(),
            &intent_tx_hashmap,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::tests::TestRepositories;
    use crate::services::transaction_manager::test_fixtures::*;
    use crate::utils::test_utils::{
        random_id_string, random_principal_id, runtime::MockIcEnvironment,
    };
    use candid::{Nat, Principal};
    use cashier_backend_types::repository::{
        action::v1::{ActionState, ActionType},
        common::{Asset, Chain, Wallet},
        intent::v2::{Intent, IntentState, IntentTask, IntentType, TransferData},
    };
    use std::rc::Rc;

    #[test]
    fn it_should_error_create_action_if_action_exists() {
        // Arrange
        let mut service: TransactionManagerService<MockIcEnvironment, TestRepositories> =
            TransactionManagerService::new(
                Rc::new(TestRepositories::new()),
                MockIcEnvironment::new(),
            );
        let link_id = random_id_string();
        let action = create_action_fixture(&mut service, link_id.clone());

        let ts = 1622547800;
        let mut temp_action = TemporaryAction {
            id: action.id.clone(),
            r#type: ActionType::CreateLink,
            creator: action.creator,
            link_id,
            intents: vec![],
            default_link_user_state: None,
            state: ActionState::Created,
        };

        // Act
        let result = service.create_action(ts, &mut temp_action);

        // Assert
        assert!(result.is_err());
        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert!(msg.contains("Action already exists"));
        } else {
            panic!("Expected HandleLogicError, got {:?}", result);
        }
    }

    #[test]
    fn it_should_error_create_action_if_dependency_not_found() {
        // Arrange
        let mut service: TransactionManagerService<MockIcEnvironment, TestRepositories> =
            TransactionManagerService::new(
                Rc::new(TestRepositories::new()),
                MockIcEnvironment::new(),
            );
        let link_id = random_id_string();
        let action_id = random_id_string();
        let intent_id1 = random_id_string();
        let intent_id2 = random_id_string();
        let creator_id = random_principal_id();

        let ts = 1622547800;
        let mut temp_action = TemporaryAction {
            id: action_id,
            r#type: ActionType::CreateLink,
            creator: creator_id,
            link_id,
            intents: vec![
                Intent {
                    id: intent_id1,
                    state: IntentState::Created,
                    created_at: 1622547800,
                    dependency: vec![],
                    chain: Chain::IC,
                    task: IntentTask::TransferWalletToLink,
                    r#type: IntentType::Transfer(TransferData {
                        from: Wallet::default(),
                        to: Wallet::default(),
                        asset: Asset::IC { address: Principal::anonymous() },
                        amount: Nat::from(1000u64),
                    }),
                    label: "Test Intent".to_string(),
                },
                Intent {
                    id: intent_id2,
                    state: IntentState::Created,
                    created_at: 1622547800,
                    dependency: vec![random_id_string()], // This dependency does not exist
                    chain: Chain::IC,
                    task: IntentTask::TransferWalletToLink,
                    r#type: IntentType::Transfer(TransferData {
                        from: Wallet::default(),
                        to: Wallet::default(),
                        asset: Asset::IC { address: Principal::anonymous() },
                        amount: Nat::from(1000u64),
                    }),
                    label: "Test Intent with Dependency".to_string(),
                },
            ],
            default_link_user_state: None,
            state: ActionState::Created,
        };

        // Act
        let result = service.create_action(ts, &mut temp_action);

        // Assert
        assert!(result.is_err());
        if let Err(CanisterError::InvalidDataError(msg)) = result {
            assert!(msg.contains("Dependency ID"));
        } else {
            panic!("Expected InvalidDataError, got {:?}", result);
        }
    }

    #[test]
    fn it_should_create_action_successfully() {
        // Arrange
        let mut service: TransactionManagerService<MockIcEnvironment, TestRepositories> =
            TransactionManagerService::new(
                Rc::new(TestRepositories::new()),
                MockIcEnvironment::new(),
            );
        let link_id = random_id_string();
        let action_id = random_id_string();
        let creator_id = random_principal_id();
        let intent_id1 = random_id_string();
        let intent_id2 = random_id_string();

        let ts = 1622547800;
        let mut temp_action = TemporaryAction {
            id: action_id.clone(),
            r#type: ActionType::CreateLink,
            creator: creator_id.clone(),
            link_id,
            intents: vec![
                Intent {
                    id: intent_id1.clone(),
                    state: IntentState::Created,
                    created_at: 1622547800,
                    dependency: vec![],
                    chain: Chain::IC,
                    task: IntentTask::TransferWalletToLink,
                    r#type: IntentType::Transfer(TransferData {
                        from: Wallet::default(),
                        to: Wallet::default(),
                        asset: Asset::IC { address: Principal::anonymous() },
                        amount: Nat::from(1000u64),
                    }),
                    label: "Test Intent".to_string(),
                },
                Intent {
                    id: intent_id2.clone(),
                    state: IntentState::Created,
                    created_at: 1622547800,
                    dependency: vec![intent_id1.clone()],
                    chain: Chain::IC,
                    task: IntentTask::TransferWalletToLink,
                    r#type: IntentType::Transfer(TransferData {
                        from: Wallet::default(),
                        to: Wallet::default(),
                        asset: Asset::IC { address: Principal::anonymous() },
                        amount: Nat::from(1000u64),
                    }),
                    label: "Test Intent with Dependency".to_string(),
                },
            ],
            default_link_user_state: None,
            state: ActionState::Created,
        };

        // Act
        let result = service.create_action(ts, &mut temp_action);

        // Assert
        assert!(result.is_ok());
        let action_dto = result.unwrap();
        assert_eq!(action_dto.id, action_id);
        assert_eq!(action_dto.r#type, ActionType::CreateLink);
        assert_eq!(action_dto.creator, creator_id);
        assert_eq!(action_dto.intents.len(), 2);
        assert_eq!(action_dto.intents[0].id, intent_id1);
        assert_eq!(action_dto.intents[1].id, intent_id2);
    }
}
