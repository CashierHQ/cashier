use crate::link_v2::transaction_manager::topological_sort::kahn_topological_sort;
use cashier_backend_types::{
    error::CanisterError,
    link_v2::graph::Graph,
    repository::{intent::v1::Intent, transaction::v1::Transaction},
};
use std::collections::{HashMap, HashSet};

/// Analyze and fill transaction dependencies based on intent dependencies
/// # Arguments
/// * `intents` - A reference to a vector of Intents
/// * `intent_txs_map` - A reference to a map from intent ID to its associated Transactions
/// # Returns
/// * `Result<Vec<Transaction>, CanisterError>` - A result containing the updated Transactions
///  or an error if circular dependencies are detected
pub fn analyze_and_fill_transaction_dependencies(
    intents: &Vec<Intent>,
    intent_txs_map: &HashMap<String, Vec<Transaction>>,
) -> Result<Vec<Transaction>, CanisterError> {
    check_circular_intents_dependencies(intents)?;

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

    check_circular_transactions_dependencies(&updated_transactions)?;
    Ok(updated_transactions)
}

/// Check for circular dependencies among intents using topological sort
/// # Arguments
/// * `intents` - A reference to a vector of Intents
/// # Returns
/// * `Result<(), CanisterError>` - Ok if no cycles, Err if cycles detected
pub fn check_circular_intents_dependencies(intents: &Vec<Intent>) -> Result<(), CanisterError> {
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
    transactions: &Vec<Transaction>,
) -> Result<(), CanisterError> {
    let graph: Graph = transactions.clone().into();
    let _sorted_levels = kahn_topological_sort(&graph)?;

    Ok(())
}
