// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
