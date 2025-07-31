// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use ic_stable_structures::{
    memory_manager::VirtualMemory, DefaultMemoryImpl, StableBTreeMap, Storable,
};

type Memory = VirtualMemory<DefaultMemoryImpl>;

pub trait Store<K, V> {
    fn batch_get(&self, keys: Vec<K>) -> Vec<V>;
    fn batch_create(&mut self, values: Vec<(K, V)>);
    fn is_exist(&self, key: &K) -> bool;
}

impl<K, V> Store<K, V> for StableBTreeMap<K, V, Memory>
where
    K: Ord + Clone + Storable,
    V: Clone + Storable,
{
    fn batch_get(&self, keys: Vec<K>) -> Vec<V> {
        keys.into_iter().filter_map(|key| self.get(&key)).collect()
    }

    fn batch_create(&mut self, values: Vec<(K, V)>) {
        for (key, value) in values {
            self.insert(key, value);
        }
    }

    fn is_exist(&self, key: &K) -> bool {
        self.get(key).is_some()
    }
}
