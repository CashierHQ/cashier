// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_cdk::api::msg_caller;

use crate::api::state::get_state;

static ANONYMOUS: Principal = Principal::anonymous();

pub fn is_not_anonymous() -> Result<(), String> {
    if msg_caller() == ANONYMOUS {
        return Err("Anonymous caller is not allowed".to_string());
    }
    Ok(())
}

pub fn is_not_maintained() -> Result<(), String> {
    let state = get_state();
    if state.is_maintained {
        return Err("Canister is currently under maintenance".to_string());
    }
    Ok(())
}
