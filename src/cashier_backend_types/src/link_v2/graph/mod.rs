use crate::repository::{intent::v2::Intent, transaction::v1::Transaction};
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone)]
pub struct Graph {
    pub vertices: Vec<String>,
    pub adjacency_list: HashMap<String, Vec<String>>,
}

impl Graph {
    pub fn new(vertices: Vec<String>, adjacency_list: HashMap<String, Vec<String>>) -> Self {
        Self {
            vertices,
            adjacency_list,
        }
    }
}

impl From<Vec<Intent>> for Graph {
    fn from(intents: Vec<Intent>) -> Self {
        let mut vertices = HashSet::<String>::new();
        let mut adjacency_list = HashMap::<String, HashSet<String>>::new();

        // First pass: collect all vertices
        for intent in intents.iter() {
            vertices.insert(intent.id.clone());

            for dep in intent.dependency.iter() {
                vertices.insert(dep.clone());
            }
        }

        // Second pass: build adjacency list
        for intent in intents.iter() {
            for dep in intent.dependency.iter() {
                adjacency_list
                    .entry(dep.clone())
                    .or_default()
                    .insert(intent.id.clone());
            }
        }

        Self {
            vertices: vertices.into_iter().collect(),
            adjacency_list: adjacency_list
                .into_iter()
                .map(|(k, v)| (k, v.into_iter().collect()))
                .collect(),
        }
    }
}

impl From<Vec<Transaction>> for Graph {
    fn from(transactions: Vec<Transaction>) -> Self {
        let mut vertices = HashSet::<String>::new();
        let mut adjacency_list = HashMap::<String, HashSet<String>>::new();

        // First pass: collect all vertices
        for tx in transactions.iter() {
            vertices.insert(tx.id.clone());

            if let Some(deps) = &tx.dependency {
                for dep in deps.iter() {
                    vertices.insert(dep.clone());
                }
            }
        }

        // Second pass: build adjacency list
        for tx in transactions.iter() {
            if let Some(deps) = &tx.dependency {
                for dep in deps.iter() {
                    adjacency_list
                        .entry(dep.clone())
                        .or_default()
                        .insert(tx.id.clone());
                }
            }
        }

        Self {
            vertices: vertices.into_iter().collect(),
            adjacency_list: adjacency_list
                .into_iter()
                .map(|(k, v)| (k, v.into_iter().collect()))
                .collect(),
        }
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use crate::link_v2::graph::Graph;
    use crate::repository::common::{Asset, Chain, Wallet};
    use crate::repository::intent::v1::{IntentState, IntentTask, IntentType, TransferData};
    use crate::repository::intent::v2::Intent;
    use crate::repository::transaction::v1::{
        FromCallType, IcTransaction, Icrc1Transfer, Protocol, Transaction, TransactionState,
    };
    use candid::Nat;

    // Generate a mock Intent
    pub fn generate_mock_intent(id: String, dependencies: Vec<String>) -> Intent {
        Intent {
            id,
            state: IntentState::Created,
            created_at: 0,
            dependency: dependencies,
            chain: Chain::IC,
            task: IntentTask::TransferWalletToTreasury,
            r#type: IntentType::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(100u64),
            }),
            label: "mock_intent".to_string(),
            intent_total_amount: None,
            intent_total_network_fee: None,
            intent_user_fee: None,
        }
    }

    // Generate a mock Transaction
    pub fn generate_mock_transaction(id: String, dependencies: Vec<String>) -> Transaction {
        Transaction {
            id,
            created_at: 0,
            state: TransactionState::Created,
            dependency: Some(dependencies),
            group: 0,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(0u64),
                memo: None,
                ts: None,
            })),
            start_ts: None,
        }
    }

    #[test]
    fn test_graph_from_intents() {
        // Arrange
        let intent_a = generate_mock_intent("A".to_string(), vec![]);
        let intent_b = generate_mock_intent("B".to_string(), vec!["A".to_string()]);
        let intent_c = generate_mock_intent("C".to_string(), vec!["A".to_string()]);
        let intent_d =
            generate_mock_intent("D".to_string(), vec!["B".to_string(), "C".to_string()]);

        // Act
        let graph = Graph::from(vec![intent_a, intent_b, intent_c, intent_d]);

        // Assert
        assert_eq!(graph.vertices.len(), 4);
        let actual: HashSet<_> = graph
            .adjacency_list
            .get("A")
            .unwrap()
            .iter()
            .cloned()
            .collect();
        let expected: HashSet<_> = vec!["C".to_string(), "B".to_string()].into_iter().collect();
        assert_eq!(actual, expected);
        assert_eq!(
            graph.adjacency_list.get("B").unwrap(),
            &vec!["D".to_string()]
        );
        assert_eq!(
            graph.adjacency_list.get("C").unwrap(),
            &vec!["D".to_string()]
        );
        assert!(!graph.adjacency_list.contains_key("D"));
    }

    #[test]
    fn test_graph_from_transactions() {
        // Arrange
        let tx_a = generate_mock_transaction("A".to_string(), vec![]);
        let tx_b = generate_mock_transaction("B".to_string(), vec!["A".to_string()]);
        let tx_c = generate_mock_transaction("C".to_string(), vec!["A".to_string()]);
        let tx_d =
            generate_mock_transaction("D".to_string(), vec!["B".to_string(), "C".to_string()]);

        // Act
        let graph = Graph::from(vec![tx_a, tx_b, tx_c, tx_d]);

        // Assert
        assert_eq!(graph.vertices.len(), 4);
        let actual: HashSet<_> = graph
            .adjacency_list
            .get("A")
            .unwrap()
            .iter()
            .cloned()
            .collect();
        let expected: HashSet<_> = vec!["C".to_string(), "B".to_string()].into_iter().collect();
        assert_eq!(actual, expected);
        assert_eq!(
            graph.adjacency_list.get("B").unwrap(),
            &vec!["D".to_string()]
        );
        assert_eq!(
            graph.adjacency_list.get("C").unwrap(),
            &vec!["D".to_string()]
        );
        assert!(!graph.adjacency_list.contains_key("D"));
    }
}
