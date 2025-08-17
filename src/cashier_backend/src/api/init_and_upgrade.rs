// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::init::CashierBackendInitData;
use ic_cdk::{init, post_upgrade, pre_upgrade};
use log::info;
use rate_limit::algorithm::fixed_window_counter::FixedWindowCounterConfig;
use rate_limit::precision::Nanos;
use std::time::Duration;

use crate::api::state::{CanisterState, get_state};
use crate::services::transaction_manager::traits::TimeoutHandler;
use crate::utils::random::init_ic_rand;
use crate::{
    repositories,
    services::transaction_manager::service::TransactionManagerService,
    utils::{random::init_ic_rand, runtime::RealIcEnvironment},
};

fn init_rate_limit_config(state: &mut CanisterState) {
    let configs = [
        (
            "create_link",
            FixedWindowCounterConfig::new::<Nanos>(10, Duration::from_secs(60 * 10)),
        ), // 10 requests per 10 minutes
        (
            "create_action",
            FixedWindowCounterConfig::new::<Nanos>(10, Duration::from_secs(60 * 10)),
        ), // 10 requests per 10 minutes
        (
            "process_action",
            FixedWindowCounterConfig::new::<Nanos>(10, Duration::from_secs(60 * 10)),
        ), // 10 requests per 10 minutes
        (
            "update_action",
            FixedWindowCounterConfig::new::<Nanos>(10, Duration::from_secs(60 * 10)),
        ), // 10 requests per 10 minutes
    ];
    for (name, config) in configs {
        if let Err(err) = state.rate_limit_service.add_config(name, config) {
            ic_cdk::println!("error configuring rate limiting for {name}. Err: {err:?}");
        }
    }
}

#[init]
fn init(init_data: CashierBackendInitData) {
    let log_config = init_data.log_settings.unwrap_or_default();
    let mut state = get_state();
    if let Err(err) = state.log_service.init(Some(log_config)) {
        ic_cdk::println!("error configuring the logger. Err: {err:?}")
    }
    init_rate_limit_config(&mut state);

    info!("[init] Starting Cashier Backend");

    init_ic_rand();
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {
    let mut state = get_state();
    if let Err(err) = state.log_service.init(None) {
        ic_cdk::println!("error configuring the logger. Err: {err:?}")
    }
    init_rate_limit_config(&mut state);

    info!("[post_upgrade] Starting Cashier Backend");

    init_ic_rand();

    let tx_manager_service = get_state().transaction_manager_service;
    tx_manager_service.restart_processing_transactions();
}
