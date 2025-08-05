// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use ic_cdk::{init, post_upgrade, pre_upgrade};
use ic_mple_log::Builder;
use log::info;

use crate::services::transaction_manager::traits::TimeoutHandler;
use crate::{
    repositories,
    services::transaction_manager::service::TransactionManagerService,
    utils::{random::init_ic_rand, runtime::RealIcEnvironment},
};
#[init]
fn init() {

    // ToDo: add to configuration
    let _log_config = Builder::default()
            .filter_level(log::LevelFilter::Debug)
            .try_init()
            .unwrap();

    info!("[init] Starting Cashier Backend");
    
    init_ic_rand();
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {
    init_ic_rand();
    // add log
    repositories::load();
    let tx_manager_service = TransactionManagerService::<RealIcEnvironment>::get_instance();
    tx_manager_service.restart_processing_transactions();
}
