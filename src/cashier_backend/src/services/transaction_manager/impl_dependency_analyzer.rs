// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_types::transaction::v2::{Transaction, TransactionState};

use crate::{
    services::transaction_manager::{
        service::TransactionManagerService, traits::DependencyAnalyzer,
    },
    types::error::CanisterError,
    utils::runtime::IcEnvironment,
};

impl<E: IcEnvironment + Clone> DependencyAnalyzer for TransactionManagerService<E> {
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
            .map_err(|e| {
                CanisterError::NotFound(format!("Error getting action by tx id: {}", e))
            })?;

        let txs_in_group = action
            .get_txs_of_tx_group(&transaction.id)
            .map_err(|e| CanisterError::NotFound(format!("Error getting txs in group: {}", e)))?;

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
                        CanisterError::NotFound(format!("Error getting tx in group: {}", e))
                    })?;

                    self.is_all_depdendency_success(&tx_in_group, true)
                })
                .collect::<Result<Vec<bool>, CanisterError>>()?;

            res.iter().any(|x| !(*x))
        };

        Ok(is_any_txs_has_dependency)
    }
}

impl<E: IcEnvironment + Clone> TransactionManagerService<E> {
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
                        CanisterError::NotFound(format!("Error getting dependencies: {}", e))
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
