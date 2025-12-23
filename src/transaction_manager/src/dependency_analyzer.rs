// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::topological_sort::kahn_topological_sort;
use cashier_backend_types::{
    error::CanisterError,
    link_v2::graph::Graph,
    repository::{intent::v1::Intent, transaction::v1::Transaction},
};
use std::collections::{HashMap, HashSet};

pub struct DependencyAnalyzer;

impl DependencyAnalyzer {
    /// Analyze and fill transaction dependencies based on intent dependencies
    /// # Arguments
    /// * `intents` - A reference to a vector of Intents
    /// * `intent_txs_map` - A reference to a map from intent ID to its associated Transactions
    /// # Returns
    /// * `Result<Vec<Transaction>, CanisterError>` - A result containing the updated Transactions or an error if circular dependencies are detected
    pub fn analyze_and_fill_transaction_dependencies(
        &self,
        intents: &[Intent],
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
                let deps = tx_dependency_map.entry(tx.id.clone()).or_default();

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
        intents: &[Intent],
    ) -> Result<(), CanisterError> {
        let graph: Graph = intents.to_vec().into();
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
        transactions: &[Transaction],
    ) -> Result<(), CanisterError> {
        let graph: Graph = transactions.to_vec().into();
        let _sorted_levels = kahn_topological_sort(&graph)?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::test_utils::{generate_mock_intent, generate_mock_transaction};
    use std::collections::HashMap;

    #[test]
    fn test_analyze_and_fill_transaction_dependencies_simple() {
        // Arrange
        let analyzer = DependencyAnalyzer;

        // Intents: A, B depends on A
        let intent_a = generate_mock_intent("A", vec![]);
        let intent_b = generate_mock_intent("B", vec!["A"]);
        let intents = vec![intent_a, intent_b];

        // Transactions: tx_a for A, tx_b for B
        let tx_a = generate_mock_transaction("tx_a", vec![]);
        let tx_b = generate_mock_transaction("tx_b", vec![]);

        let mut intent_txs_map = HashMap::new();
        intent_txs_map.insert("A".to_string(), vec![tx_a]);
        intent_txs_map.insert("B".to_string(), vec![tx_b]);

        // Act
        let result = analyzer
            .analyze_and_fill_transaction_dependencies(&intents, &intent_txs_map)
            .unwrap();

        // Assert
        // tx_b should depend on tx_a
        let tx_b_result = result.iter().find(|tx| tx.id == "tx_b").unwrap();
        assert!(
            tx_b_result
                .dependency
                .as_ref()
                .unwrap()
                .contains(&"tx_a".to_string())
        );
        // tx_a should have no dependencies
        let tx_a_result = result.iter().find(|tx| tx.id == "tx_a").unwrap();
        assert!(
            tx_a_result
                .dependency
                .as_ref()
                .map(Vec::is_empty)
                .unwrap_or(true)
        );
    }

    #[test]
    fn test_circular_intent_dependency_detection() {
        // Arrange
        let analyzer = DependencyAnalyzer;
        // Intents: A depends on B, B depends on A (cycle)
        let intent_a = generate_mock_intent("A", vec!["B"]);
        let intent_b = generate_mock_intent("B", vec!["A"]);
        let intents = vec![intent_a, intent_b];
        let intent_txs_map = HashMap::new();

        // Act
        let result = analyzer.analyze_and_fill_transaction_dependencies(&intents, &intent_txs_map);

        // Assert
        assert!(result.is_err());
    }

    #[test]
    fn test_circular_transaction_dependency_detection() {
        // Arrange
        let analyzer = DependencyAnalyzer;
        // Intents: A, B (no intent cycle)
        let intent_a = generate_mock_intent("A", vec![]);
        let intent_b = generate_mock_intent("B", vec![]);
        let intents = vec![intent_a, intent_b];

        // Transactions: tx_a depends on tx_b, tx_b depends on tx_a (cycle)
        let tx_a = generate_mock_transaction("tx_a", vec!["tx_b"]);
        let tx_b = generate_mock_transaction("tx_b", vec!["tx_a"]);

        let mut intent_txs_map = HashMap::new();
        intent_txs_map.insert("A".to_string(), vec![tx_a]);
        intent_txs_map.insert("B".to_string(), vec![tx_b]);

        // Act
        let result = analyzer.analyze_and_fill_transaction_dependencies(&intents, &intent_txs_map);

        // Assert
        assert!(result.is_err());
    }

    #[test]
    fn test_intent_a_depends_on_b_a_has_one_tx_b_has_two_tx() {
        // Arrange
        let analyzer = DependencyAnalyzer;

        // Intents: A depends on B
        let intent_a = generate_mock_intent("A", vec!["B"]);
        let intent_b = generate_mock_intent("B", vec![]);
        let intents = vec![intent_a, intent_b];

        // Transactions: tx_a for A, tx_b1 and tx_b2 for B
        let tx_a = generate_mock_transaction("tx_a", vec![]);
        let tx_b1 = generate_mock_transaction("tx_b1", vec![]);
        let tx_b2 = generate_mock_transaction("tx_b2", vec![]);

        let mut intent_txs_map = HashMap::new();
        intent_txs_map.insert("A".to_string(), vec![tx_a]);
        intent_txs_map.insert("B".to_string(), vec![tx_b1, tx_b2]);

        // Act
        let result = analyzer
            .analyze_and_fill_transaction_dependencies(&intents, &intent_txs_map)
            .unwrap();

        // Assert
        // tx_a should depend on both tx_b1 and tx_b2
        let tx_a_result = result.iter().find(|tx| tx.id == "tx_a").unwrap();
        let deps = tx_a_result.dependency.as_ref().unwrap();
        assert!(deps.contains(&"tx_b1".to_string()));
        assert!(deps.contains(&"tx_b2".to_string()));
        assert_eq!(deps.len(), 2);

        // tx_b1 and tx_b2 should have no dependencies
        let tx_b1_result = result.iter().find(|tx| tx.id == "tx_b1").unwrap();
        assert!(
            tx_b1_result
                .dependency
                .as_ref()
                .map(Vec::is_empty)
                .unwrap_or(true)
        );
        let tx_b2_result = result.iter().find(|tx| tx.id == "tx_b2").unwrap();
        assert!(
            tx_b2_result
                .dependency
                .as_ref()
                .map(Vec::is_empty)
                .unwrap_or(true)
        );
    }
}
