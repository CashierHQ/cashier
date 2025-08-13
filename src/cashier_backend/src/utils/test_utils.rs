// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use rand::prelude::*;
use uuid::Uuid;

pub fn random_id_string() -> String {
    let id = Uuid::new_v4();
    id.to_string()
}

pub fn random_principal_id() -> String {
    let mut rng = thread_rng();
    let mut arr = [0u8; 29];
    rng.fill_bytes(&mut arr);
    Principal::from_slice(&arr).to_text()
}
