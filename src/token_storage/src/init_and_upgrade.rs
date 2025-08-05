// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use ic_cdk::{init, post_upgrade, pre_upgrade};
use ic_mple_log::Builder;
use log::info;

use crate::{
    constant::default_tokens::get_default_tokens,
    repository::{load, token_registry::TokenRegistryRepository},
};

#[init]
fn init() {

    // ToDo: add to configuration
    let _log_config = Builder::default()
            .filter_level(log::LevelFilter::Debug)
            .try_init()
            .unwrap();

    info!("[init] Starting Token Storage");

    let registry = TokenRegistryRepository::new();
    match registry.add_bulk_tokens(&get_default_tokens()) {
        Ok(_) => {}
        Err(e) => {
            eprintln!("Error adding default tokens: {e}");
        }
    }
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {
    load();
}
