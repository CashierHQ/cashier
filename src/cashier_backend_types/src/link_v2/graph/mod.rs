use crate::repository::{intent::v1::Intent, transaction::v1::Transaction};
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
