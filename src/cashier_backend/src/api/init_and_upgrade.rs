// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::init::{CashierBackendInitData, CashierBackendUpgradeData};
use ic_cdk::{init, post_upgrade, pre_upgrade};
use log::info;

use crate::api::state::get_state;
use crate::services::auth::Permission;
use crate::services::transaction_manager::traits::TimeoutHandler;
use cashier_common::random::init_ic_rand;

#[init]
fn init(init_data: CashierBackendInitData) {
    let log_config = init_data.log_settings.unwrap_or_default();
    let mut state = get_state();

    if let Err(err) = state.log_service.init(Some(log_config)) {
        ic_cdk::println!("error configuring the logger. Err: {err:?}")
    }

    state.settings.settings_repo.update(|settings| {
        settings.gate_canister_principal = init_data.gate_service_canister_id;
    });

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
// canister endpoint doesn't use reference to avoid clippy warning
#[allow(clippy::needless_pass_by_value)]
fn post_upgrade(upgrade_data: CashierBackendUpgradeData) {
    if let Err(err) = get_state().log_service.init(None) {
        ic_cdk::println!("error configuring the logger. Err: {err:?}")
    }

    let mut state = get_state();

    if upgrade_data.gate_service_canister_id.is_some() {
        state.settings.settings_repo.update(|settings| {
            settings.gate_canister_principal = upgrade_data.gate_service_canister_id.unwrap();
        });
    }

    info!("[post_upgrade] Starting Cashier Backend");

    init_ic_rand();

    let tx_manager_service = get_state().transaction_manager_service;
    tx_manager_service.restart_processing_transactions();
}
