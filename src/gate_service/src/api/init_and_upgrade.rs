// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::api::state::get_state;
use cashier_common::random::init_ic_rand;
use gate_service_types::{auth::Permission, init::GateServiceInitData};
use ic_cdk::{init, post_upgrade, pre_upgrade};

/// Initialises the canister on first install.
/// Sets up logging and grants the specified owner `Admin` permission.
/// # Arguments
/// * `init_data`: Owner principal, optional extra permissions, and optional log settings.
#[init]
fn init(init_data: GateServiceInitData) {
    init_ic_rand();

    let mut state = get_state();

    // Set up logging
    let log_config = init_data.log_settings.unwrap_or_default();
    if let Err(err) = state.log_service.init(Some(log_config)) {
        ic_cdk::println!("error configuring the logger. Err: {err:?}")
    }

    // Set up permissions
    state
        .auth_service
        .add_permissions(init_data.owner, vec![Permission::Admin])
        .expect("Should be able to set the owner");

    if let Some(permissions) = init_data.permissions {
        for (principal, perms) in permissions {
            state
                .auth_service
                .add_permissions(principal, perms)
                .expect("Should be able to set the permissions");
        }
    }
}

/// Called by the IC before a canister upgrade. Stable memory is managed by
/// `ic-stable-structures` so no manual serialisation is required.
#[pre_upgrade]
fn pre_upgrade() {}

/// Called by the IC after a canister upgrade. Re-seeds the IC randomness source
/// because the seed is not preserved across upgrades.
#[post_upgrade]
fn post_upgrade() {
    init_ic_rand();
}
