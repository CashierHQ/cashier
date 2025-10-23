use crate::link_v2::{
    transaction::traits::{TransactionExecutor, TransactionValidator},
    transaction_manager::topological_sort::{
        flatten_sorted_list, kahn_topological_sort, kahn_topological_sort_flat,
    },
};
use cashier_backend_types::{
    error::CanisterError,
    link_v2::{graph::Graph, transaction_manager::ValidateActionTransactionsResult},
    repository::{
        intent::v1::Intent,
        transaction::v1::{FromCallType, Transaction, TransactionState},
    },
};
use std::collections::{HashMap, HashSet};

pub struct DependencyAnalyzer<V: TransactionValidator, E: TransactionExecutor> {
    pub validator: V,
    pub executor: E,
}

impl<V: TransactionValidator, E: TransactionExecutor> DependencyAnalyzer<V, E> {
    pub fn new(validator: V, executor: E) -> Self {
        Self {
            validator,
            executor,
        }
    }

    /// Analyze and fill transaction dependencies based on intent dependencies
    /// # Arguments
    /// * `intents` - A reference to a vector of Intents
    /// * `intent_txs_map` - A reference to a map from intent ID to its associated Transactions
    /// # Returns
    /// * `Result<Vec<Transaction>, CanisterError>` - A result containing the updated Transactions
    ///  or an error if circular dependencies are detected
    pub fn analyze_and_fill_transaction_dependencies(
        &self,
        intents: &Vec<Intent>,
        intent_txs_map: &HashMap<String, Vec<Transaction>>,
    ) -> Result<Vec<Transaction>, CanisterError> {
        self.check_circular_intents_dependencies(intents)?;

        let mut updated_transactions = Vec::<Transaction>::new();

        // build intent dependency map
        let intent_dependency_map: HashMap<String, Vec<String>> = intents
            .iter()
            .map(|intent| (intent.id.clone(), intent.dependency.clone()))
            .collect();

        // build transaction dependency map
        let mut tx_dependency_map = HashMap::<String, HashSet<String>>::new();
        for (intent_id, txs) in intent_txs_map.iter() {
            let mut dependent_txs = HashSet::<String>::new();
            if let Some(dependent_intents) = intent_dependency_map.get(intent_id) {
                for dep_intent_id in dependent_intents.iter() {
                    if let Some(dep_txs) = intent_txs_map.get(dep_intent_id) {
                        for tx in dep_txs.iter() {
                            dependent_txs.insert(tx.id.clone());
                        }
                    }
                }
            }

            for tx in txs.iter() {
                let deps = tx_dependency_map
                    .entry(tx.id.clone())
                    .or_insert_with(HashSet::new);

                // Add intent-derived dependencies
                deps.extend(dependent_txs.iter().cloned());

                // Preserve existing transaction dependencies (if any)
                if let Some(ref existing_deps) = tx.dependency {
                    deps.extend(existing_deps.iter().cloned());
                }
            }
        }

        // update transactions with dependencies
        for (_intent_id, txs) in intent_txs_map.iter() {
            for mut tx in txs.iter().cloned() {
                if let Some(dependencies) = tx_dependency_map.get(&tx.id) {
                    tx.dependency = Some(dependencies.iter().cloned().collect());
                }
                updated_transactions.push(tx);
            }
        }

        self.check_circular_transactions_dependencies(&updated_transactions)?;
        Ok(updated_transactions)
    }

    /// Check for circular dependencies among intents using topological sort
    /// # Arguments
    /// * `intents` - A reference to a vector of Intents
    /// # Returns
    /// * `Result<(), CanisterError>` - Ok if no cycles, Err if cycles detected
    pub fn check_circular_intents_dependencies(
        &self,
        intents: &Vec<Intent>,
    ) -> Result<(), CanisterError> {
        let graph: Graph = intents.clone().into();
        let _sorted_levels = kahn_topological_sort(&graph)?;

        Ok(())
    }

    /// Check for circular dependencies among transactions using topological sort
    /// # Arguments
    /// * `transactions` - A reference to a vector of Transactions
    /// # Returns
    /// * `Result<(), CanisterError>` - Ok if no cycles, Err if cycles detected
    pub fn check_circular_transactions_dependencies(
        &self,
        transactions: &Vec<Transaction>,
    ) -> Result<(), CanisterError> {
        let graph: Graph = transactions.clone().into();
        let _sorted_levels = kahn_topological_sort(&graph)?;

        Ok(())
    }

    pub async fn validate_action_transactions(
        &self,
        transactions: &Vec<Transaction>,
    ) -> Result<ValidateActionTransactionsResult, CanisterError> {
        let mut updated_transactions = Vec::<Transaction>::new();

        let mut txs_map: HashMap<String, Transaction> = transactions
            .iter()
            .map(|tx| (tx.id.clone(), tx.clone()))
            .collect();

        // topologically sort transactions
        let graph: Graph = transactions.clone().into();
        let sorted_transactions = kahn_topological_sort_flat(&graph)?;

        // validate transactions in topological order and update their status
        let mut is_dependencies_resolved = true;
        for tx_id in sorted_transactions.iter() {
            if let Some(tx) = txs_map.get_mut(tx_id) {
                if tx.from_call_type == FromCallType::Canister {
                    // Skip validation for canister-initiated transactions
                    updated_transactions.push(tx.clone());
                    continue;
                }

                if let Ok(_tx_success) = self.validator.validate_success(tx.clone()).await {
                    tx.state = TransactionState::Success;
                } else {
                    tx.state = TransactionState::Fail;
                    is_dependencies_resolved = false;
                }
                updated_transactions.push(tx.clone());
            }
        }

        Ok(ValidateActionTransactionsResult {
            transactions: updated_transactions,
            is_dependencies_resolved,
        })
    }
}
