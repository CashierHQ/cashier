// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::init::CashierBackendInitData;
use ic_cdk::{init, post_upgrade, pre_upgrade};
use log::info;

use crate::api::state::get_state;
use crate::services::transaction_manager::traits::TimeoutHandler;
use crate::{
    utils::random::init_ic_rand,
};

#[init]
fn init(init_data: CashierBackendInitData) {
    let log_config = init_data.log_settings.unwrap_or_default();
    if let Err(err) = get_state().log_service.init(Some(log_config)) {
        ic_cdk::println!("error configuring the logger. Err: {err:?}")
    }

    info!("[init] Starting Cashier Backend");

    init_ic_rand();
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {
    if let Err(err) = get_state().log_service.init(None) {
        ic_cdk::println!("error configuring the logger. Err: {err:?}")
    }

    info!("[post_upgrade] Starting Cashier Backend");

    init_ic_rand();

    let tx_manager_service = get_state().transaction_manager_service;
    tx_manager_service.restart_processing_transactions();
}
