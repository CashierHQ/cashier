// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use rand::prelude::*;

pub fn random_id_string(len: usize) -> String {
    let mut rng = thread_rng();
    let chars: Vec<char> = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".chars().collect();
    (0..len).map(|_| chars[rng.gen_range(0..chars.len())]).collect()
}