use std::collections::HashSet;

use ic_stable_structures::{
    memory_manager::VirtualMemory, DefaultMemoryImpl, StableBTreeMap, Storable,
};

type Memory = VirtualMemory<DefaultMemoryImpl>;

pub trait Store<K, V> {
    fn get_range1(&self, start: K, end: Option<K>) -> Vec<V>;
    fn batch_get(&self, keys: Vec<K>) -> Vec<V>;
    fn batch_create(&mut self, values: Vec<(K, V)>);
    fn is_exist(&self, key: &K) -> bool;
}

impl<K, V> Store<K, V> for StableBTreeMap<K, V, Memory>
where
    K: Ord + Clone + Storable,
    V: Clone + Storable,
{
    fn get_range1(&self, start: K, end: Option<K>) -> Vec<V> {
        match end {
            Some(end) => self.range(start..end).map(|(_, v)| v).collect(),
            None => self.range(start..).map(|(_, v)| v).collect(),
        }
    }

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
