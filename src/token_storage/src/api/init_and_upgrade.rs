// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use ic_cdk::{init, post_upgrade, pre_upgrade};
use log::{error, info};
use token_storage_types::init::TokenStorageInitData;

use crate::{
    api::state::get_state, constant::default_tokens::get_default_tokens,
    repository::{token_registry::TokenRegistryRepository, token_registry_metadata::TokenRegistryMetadataRepository},
};

#[init]
fn init(init_data: TokenStorageInitData) {
    let log_config = init_data.log_settings.unwrap_or_default();
    if let Err(err) = get_state().log_service.init(Some(log_config)) {
        ic_cdk::println!("error configuring the logger. Err: {err:?}")
    }

    info!("[init] Starting Token Storage");

    let mut registry = TokenRegistryRepository::new();
    let mut metadata_registry = TokenRegistryMetadataRepository::new();
    match registry.add_bulk_tokens(get_default_tokens(), &mut metadata_registry) {
        Ok(_) => {}
        Err(e) => {
            error!("Error adding default tokens: {e}");
        }
    }
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {
    if let Err(err) = get_state().log_service.init(None) {
        ic_cdk::println!("error configuring the logger. Err: {err:?}")
    }

    info!("[post_upgrade] Starting Token Storage");
}
