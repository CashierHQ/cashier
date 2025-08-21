// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use canister_internal_settings::types::Mode;
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
    let canister_internal_settings = state.canister_internal_settings_service.get_setting();
    if canister_internal_settings.mode == Mode::Maintenance {
        return Err("Canister is currently under maintenance".to_string());
    }
    Ok(())
}

pub fn is_admin() -> Result<(), String> {
    let caller = msg_caller();
    if !get_state()
        .canister_internal_settings_service
        .is_admin(&caller)
    {
        return Err("Caller is not an admin".to_string());
    }
    Ok(())
}
