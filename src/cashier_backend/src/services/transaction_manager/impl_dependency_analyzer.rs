// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    repository::transaction::v2::{Transaction, TransactionState},
};

use crate::{
    repositories::Repositories,
    services::transaction_manager::{
        service::TransactionManagerService, traits::DependencyAnalyzer,
    },
    utils::runtime::IcEnvironment,
};

impl<E: IcEnvironment + Clone, R: Repositories> DependencyAnalyzer
    for TransactionManagerService<E, R>
{
    fn has_dependency(&self, tx_id: &str) -> Result<bool, CanisterError> {
        let tx: Transaction = self.transaction_service.get_tx_by_id(&tx_id.to_string())?;

        // checks if tx has other dependent txs that were not completed yet
        let is_all_dependencies_success = self.is_all_depdendency_success(&tx, true)?;

        // checks if tx is part of a batch of txs (ICRC-112)
        // tx is deemed has dependency if any of the other txs in the batch still has unmet dependencies
        // this is done so that al the txs in the batch can be executed altogether, not separately
        let is_group_has_dependency = self.is_group_has_dependency(&tx)?;

        // if any of the tx in the group has dependency (exclusive the tx in same group), then current tx has dependency
        // if all success then no dependency
        //|                                   | `is_all_dependencies_success = false`   | `is_all_dependencies_success = true`   |
        //|--------------------------         |--------------------------------------   |--------------------------------------- |
        //| `is_group_has_dependency = false` | `true`                                  | `false`                                 |
        //| `is_group_has_dependency = true`  | `true`                                  | `true`                                 |

        if is_all_dependencies_success && !is_group_has_dependency {
            Ok(false)
        } else {
            Ok(true)
        }
    }

    fn is_group_has_dependency(&self, transaction: &Transaction) -> Result<bool, CanisterError> {
        let action = self
            .action_service
            .get_action_by_tx_id(&transaction.id)
            .map_err(|e| CanisterError::NotFound(format!("Error getting action by tx id: {e}")))?;

        let txs_in_group = action
            .get_txs_of_tx_group(&transaction.id)
            .map_err(|e| CanisterError::NotFound(format!("Error getting txs in group: {e}")))?;

        let other_txs_in_group: Vec<&String> = txs_in_group
            .iter()
            .filter(|id| *(*id) != transaction.id.clone())
            .collect();

        let is_any_txs_has_dependency = if other_txs_in_group.is_empty() {
            false
        } else {
            let res = other_txs_in_group
                .iter()
                .map(|id| {
                    let tx_in_group = self.transaction_service.get_tx_by_id(id).map_err(|e| {
                        CanisterError::NotFound(format!("Error getting tx in group: {e}"))
                    })?;

                    self.is_all_depdendency_success(&tx_in_group, true)
                })
                .collect::<Result<Vec<bool>, CanisterError>>()?;

            res.iter().any(|x| !(*x))
        };

        Ok(is_any_txs_has_dependency)
    }
}

impl<E: IcEnvironment + Clone, R: Repositories> TransactionManagerService<E, R> {
    // if is_skip_check_in_group is true, then skip checking the dependency in the same group
    pub fn is_all_depdendency_success(
        &self,
        tx: &Transaction,
        is_skip_check_in_group: bool,
    ) -> Result<bool, CanisterError> {
        // if there no dependency treat it as true
        let is_all_dependencies_success = match &tx.dependency {
            None => true,
            Some(dependencies) => {
                let txs = self
                    .transaction_service
                    .batch_get(dependencies)
                    .map_err(|e| {
                        CanisterError::NotFound(format!("Error getting dependencies: {e}"))
                    })?;

                let txs_to_check: Vec<&Transaction> = if is_skip_check_in_group {
                    txs.iter()
                        .filter(|check_tx| check_tx.group != tx.group)
                        .collect()
                } else {
                    txs.iter().collect()
                };

                txs_to_check
                    .iter()
                    .all(|tx| tx.state == TransactionState::Success)
            }
        };

        Ok(is_all_dependencies_success)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::transaction_manager::test_fixtures::*;
    use crate::utils::test_utils::{random_id_string, runtime::MockIcEnvironment};
    use candid::Nat;
    use cashier_backend_types::repository::{
        common::{Asset, Wallet},
        transaction::v2::{FromCallType, IcTransaction, Icrc1Transfer, Protocol},
    };

    #[test]
    fn it_should_true_is_all_depdendency_success_if_dependency_empty() {
        // Arrange
        let service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::get_instance();

        let transaction1 = create_transaction_fixture(&service);

        // Act
        let result = service.is_all_depdendency_success(&transaction1, false);

        // Assert
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn it_should_error_is_all_depdendency_success_if_tx_not_found() {
        // Arrange
        let service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::get_instance();

        let transaction1 = create_transaction_fixture(&service);
        let dummy_tx_id = random_id_string();

        let updated_tx1 = Transaction {
            id: transaction1.id.clone(),
            dependency: Some(vec![dummy_tx_id]),
            ..transaction1
        };
        service
            .action_service
            .transaction_repository
            .update(updated_tx1.clone());

        // Act
        let result = service.is_all_depdendency_success(&updated_tx1, false);

        // Assert
        assert!(result.is_err());
        if let Err(CanisterError::NotFound(msg)) = result {
            assert!(msg.contains("Some transactions not found"));
        } else {
            panic!("Expected NotFound error");
        }
    }

    #[test]
    fn it_should_false_is_all_depedency_success_if_any_dependency_failed() {
        // Arrange
        let service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::get_instance();

        let transaction1 = create_transaction_fixture(&service);
        let transaction2 = create_transaction_fixture(&service);
        let transaction3 = create_transaction_fixture(&service);

        let updated_tx3 = Transaction {
            id: transaction3.id.clone(),
            dependency: Some(vec![transaction1.id, transaction2.id]),
            ..transaction3
        };
        service
            .action_service
            .transaction_repository
            .update(updated_tx3.clone());

        // Act
        let result = service.is_all_depdendency_success(&updated_tx3, false);

        // Assert
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn it_should_true_is_all_depdendency_success_if_all_dependencies_success() {
        // Arrange
        let service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::get_instance();

        let transaction1 = create_transaction_fixture(&service);
        let transaction2 = create_transaction_fixture(&service);
        let transaction3 = create_transaction_fixture(&service);

        let updated_tx3 = Transaction {
            id: transaction3.id.clone(),
            dependency: Some(vec![transaction1.id.clone(), transaction2.id.clone()]),
            ..transaction3
        };
        service
            .action_service
            .transaction_repository
            .update(updated_tx3.clone());

        service
            .transaction_service
            .update_tx_state(
                &mut service
                    .action_service
                    .transaction_repository
                    .get(&transaction1.id)
                    .unwrap(),
                &TransactionState::Success,
            )
            .unwrap();
        service
            .transaction_service
            .update_tx_state(
                &mut service
                    .action_service
                    .transaction_repository
                    .get(&transaction2.id)
                    .unwrap(),
                &TransactionState::Success,
            )
            .unwrap();

        // Act
        let result = service.is_all_depdendency_success(&updated_tx3, false);

        // Assert
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn it_should_false_is_all_depdendency_success_if_skip_check_in_group() {
        // Arrange
        let service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::get_instance();

        let transaction1 = create_transaction_fixture(&service);
        let transaction2 = create_transaction_fixture(&service);
        let transaction3 = create_transaction_fixture(&service);

        let updated_tx3 = Transaction {
            id: transaction3.id.clone(),
            dependency: Some(vec![transaction1.id.clone(), transaction2.id.clone()]),
            group: 3,
            ..transaction3
        };
        service
            .action_service
            .transaction_repository
            .update(updated_tx3.clone());

        let update_tx1 = Transaction {
            id: transaction1.id.clone(),
            state: TransactionState::Processing,
            group: 1,
            ..transaction1
        };
        service
            .action_service
            .transaction_repository
            .update(update_tx1);

        let update_tx2 = Transaction {
            id: transaction2.id.clone(),
            state: TransactionState::Success,
            group: 3,
            ..transaction2
        };
        service
            .action_service
            .transaction_repository
            .update(update_tx2);

        // Act
        let result = service.is_all_depdendency_success(&updated_tx3, true);

        // Assert
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn it_should_true_is_all_depdendency_success_if_skip_check_in_group() {
        // Arrange
        let service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::get_instance();

        let transaction1 = create_transaction_fixture(&service);
        let transaction2 = create_transaction_fixture(&service);
        let transaction3 = create_transaction_fixture(&service);

        let updated_tx3 = Transaction {
            id: transaction3.id.clone(),
            dependency: Some(vec![transaction1.id.clone(), transaction2.id.clone()]),
            group: 3,
            ..transaction3
        };
        service
            .action_service
            .transaction_repository
            .update(updated_tx3.clone());

        let update_tx1 = Transaction {
            id: transaction1.id.clone(),
            state: TransactionState::Success,
            group: 1,
            ..transaction1
        };
        service
            .action_service
            .transaction_repository
            .update(update_tx1);

        let update_tx2 = Transaction {
            id: transaction2.id.clone(),
            state: TransactionState::Processing,
            group: 3,
            ..transaction2
        };
        service
            .action_service
            .transaction_repository
            .update(update_tx2);

        // Act
        let result = service.is_all_depdendency_success(&updated_tx3, true);

        // Assert
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn it_should_error_is_group_has_dependency_if_action_not_found() {
        // Arrange
        let service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::get_instance();
        let transaction1 = create_transaction_fixture(&service);

        // Act
        let result = service.is_group_has_dependency(&transaction1);

        // Assert
        assert!(result.is_err());
        if let Err(CanisterError::NotFound(msg)) = result {
            assert!(msg.contains("Error getting action by tx id"));
        } else {
            panic!("Expected NotFound error");
        }
    }

    #[test]
    fn it_should_false_is_group_has_dependency_if_no_other_txs_in_group() {
        // Arrange
        let service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::get_instance();

        let link_id = random_id_string();
        let action = create_action_with_intents_fixture(&service, link_id);

        let transaction_dto = action.intents[0].transactions[0].clone();
        let transaction1 = Transaction {
            id: transaction_dto.id,
            state: TransactionState::Created,
            dependency: None,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(1000u64),
                ts: None,
                memo: None,
            })),
            group: transaction_dto.group,
            from_call_type: FromCallType::Canister,
            start_ts: None,
            created_at: 1622547800,
        };

        // Act
        let result = service.is_group_has_dependency(&transaction1);

        // Assert
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn it_should_false_is_group_has_dependency_if_other_txs_in_group_has_dependency() {
        // Arrange
        let service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::get_instance();
        let (_action, _intents, transactions) = create_action_data_fixture(&service);

        // Act
        let result = service.is_group_has_dependency(&transactions[0]);

        // Assert
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn it_should_true_is_group_has_dependency_if_other_txs_in_group_has_dependency() {
        // Arrange
        let service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::get_instance();
        let (_action, _intents, transactions) = create_action_data_fixture(&service);

        let updated_tx1 = Transaction {
            id: transactions[0].id.clone(),
            state: TransactionState::Success,
            ..transactions[0].clone()
        };
        service
            .action_service
            .transaction_repository
            .update(updated_tx1.clone());

        let updated_tx2 = Transaction {
            id: transactions[1].id.clone(),
            state: TransactionState::Processing,
            group: 2,
            ..transactions[1].clone()
        };
        service
            .action_service
            .transaction_repository
            .update(updated_tx2.clone());

        let updated_tx3 = Transaction {
            id: transactions[2].id.clone(),
            state: TransactionState::Processing,
            dependency: Some(vec![updated_tx1.id.clone(), updated_tx2.id]),
            ..transactions[2].clone()
        };
        service
            .action_service
            .transaction_repository
            .update(updated_tx3);

        // Act
        let result = service.is_group_has_dependency(&updated_tx1);

        // Assert
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn it_should_error_has_dependency_if_tx_not_found() {
        // Arrange
        let service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::get_instance();

        let tx_id = random_id_string();

        // Act
        let result = service.has_dependency(&tx_id);

        // Assert
        assert!(result.is_err());
        if let Err(CanisterError::NotFound(msg)) = result {
            assert!(msg.contains("Transaction not found"));
        } else {
            panic!("Expected NotFound error");
        }
    }

    #[test]
    fn it_should_false_has_dependency_if_not_all_dependency_success() {
        // Arrange
        let service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::get_instance();

        let (_action, _intents, transactions) = create_action_data_fixture(&service);

        let tx_id1 = transactions[0].id.clone();

        // Act
        let result = service.has_dependency(&tx_id1);

        // Assert
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn it_should_true_has_dependency_if_all_dependency_success() {
        // Arrange
        let service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::get_instance();

        let (_action, _intents, transactions) = create_action_data_fixture(&service);

        let update_tx1 = Transaction {
            id: transactions[0].id.clone(),
            dependency: Some(vec![transactions[1].id.clone(), transactions[2].id.clone()]),
            ..transactions[0].clone()
        };
        service
            .action_service
            .transaction_repository
            .update(update_tx1.clone());

        let update_tx2 = Transaction {
            id: transactions[1].id.clone(),
            group: 2,
            ..transactions[1].clone()
        };
        service
            .action_service
            .transaction_repository
            .update(update_tx2);

        // Act
        let result = service.has_dependency(&update_tx1.id);

        // Assert
        assert!(result.is_ok());
        assert!(result.unwrap());
    }
}
