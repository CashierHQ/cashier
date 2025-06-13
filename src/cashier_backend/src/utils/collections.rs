// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use std::collections::HashMap;

pub fn flatten_hashmap_values<K, V: Clone>(map: &HashMap<K, Vec<V>>) -> Vec<V> {
    let mut result = vec![];
    for (_, values) in map {
        for value in values {
            result.push(value.clone());
        }
    }
    result
}
