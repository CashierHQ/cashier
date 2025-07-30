// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::time::Duration;

use ic_cdk::{init, post_upgrade, pre_upgrade};

use crate::info;
use crate::repositories::rate_limit::RateLimitRepository;
use crate::services::rate_limit::RateLimitService;
use crate::services::transaction_manager::traits::TimeoutHandler;
use crate::{
    repositories,
    services::transaction_manager::service::TransactionManagerService,
    utils::{random::init_ic_rand, runtime::RealIcEnvironment},
};
#[init]
fn init() {
    init_ic_rand();

    let rate_limit_service =
        RateLimitService::<RealIcEnvironment, RateLimitRepository>::get_instance();
    rate_limit_service
        .set_timer_interval_for_cleaning_expried_record(&Duration::from_secs(60 * 60));
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

    let rate_limit_service =
        RateLimitService::<RealIcEnvironment, RateLimitRepository>::get_instance();
    rate_limit_service
        .set_timer_interval_for_cleaning_expried_record(&Duration::from_secs(60 * 60));
}
