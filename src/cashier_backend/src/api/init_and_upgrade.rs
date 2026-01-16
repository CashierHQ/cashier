// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::init::{CashierBackendInitData, CashierBackendUpgradeData};
use ic_cdk::{init, post_upgrade, pre_upgrade};
use log::info;

use crate::api::state::get_state;
use crate::apps::auth::Permission;
use crate::apps::token_fee::init_token_fee_ttl;
use cashier_common::constant::DEFAULT_TOKEN_FEE_TTL_NS;
use cashier_common::random::init_ic_rand;

#[init]
fn init(init_data: CashierBackendInitData) {
    let log_config = init_data.log_settings.unwrap_or_default();
    let mut state = get_state();

    if let Err(err) = state.log_service.init(Some(log_config)) {
        ic_cdk::println!("error configuring the logger. Err: {err:?}")
    }

    info!("[init] Starting Cashier Backend");

    // Initialize token fee cache TTL
    init_token_fee_ttl(
        init_data
            .token_fee_ttl_ns
            .unwrap_or(DEFAULT_TOKEN_FEE_TTL_NS),
    );

    info!("[init] Set {:?} as canister admin", init_data.owner);
    state
        .auth_service
        .add_permissions(init_data.owner, vec![Permission::Admin])
        .expect("Should be able to set the admin");

    init_ic_rand();
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
#[allow(clippy::needless_pass_by_value)]
fn post_upgrade(upgrade_data: CashierBackendUpgradeData) {
    if let Err(err) = get_state().log_service.init(None) {
        ic_cdk::println!("error configuring the logger. Err: {err:?}")
    }

    info!("[post_upgrade] Starting Cashier Backend");

    init_ic_rand();

    // Re-initialize token fee cache TTL (cache wiped on upgrade)
    init_token_fee_ttl(
        upgrade_data
            .token_fee_ttl_ns
            .unwrap_or(DEFAULT_TOKEN_FEE_TTL_NS),
    );
}
