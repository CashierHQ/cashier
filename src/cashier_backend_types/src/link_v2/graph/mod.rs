use crate::repository::{intent::v1::Intent, transaction::v1::Transaction};
use std::collections::HashMap;

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
        let mut vertices = Vec::<String>::new();
        let mut adjacency_list = HashMap::<String, Vec<String>>::new();

        for intent in intents.iter() {
            if vertices.contains(&intent.id) {
                continue;
            }
            vertices.push(intent.id.clone());
            match adjacency_list.get_mut(&intent.id) {
                Some(deps) => {
                    deps.extend(intent.dependency.clone());
                }
                None => {
                    adjacency_list.insert(intent.id.clone(), intent.dependency.clone());
                }
            }
        }

        Self {
            vertices,
            adjacency_list,
        }
    }
}

impl From<Vec<Transaction>> for Graph {
    fn from(transactions: Vec<Transaction>) -> Self {
        let mut vertices = Vec::<String>::new();
        let mut adjacency_list = HashMap::<String, Vec<String>>::new();

        for tx in transactions.iter() {
            if vertices.contains(&tx.id) {
                continue;
            }

            vertices.push(tx.id.clone());
            match adjacency_list.get_mut(&tx.id) {
                Some(deps) => {
                    if let Some(tx_deps) = &tx.dependency {
                        deps.extend(tx_deps.clone());
                    }
                }
                None => {
                    adjacency_list.insert(tx.id.clone(), tx.dependency.clone().unwrap_or_default());
                }
            }
        }

        Self {
            vertices,
            adjacency_list,
        }
    }
}
