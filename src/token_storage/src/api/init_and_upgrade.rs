// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use ic_cdk::{init, post_upgrade, pre_upgrade};
use log::{error, info};
use token_storage_types::init::TokenStorageInitData;

use crate::{api::state::get_state, constant::default_tokens::get_default_tokens, services::auth::Permission};

#[init]
fn init(init_data: TokenStorageInitData) {
    let log_config = init_data.log_settings.unwrap_or_default();
    let mut state = get_state();

    if let Err(err) = state.log_service.init(Some(log_config)) {
        ic_cdk::println!("error configuring the logger. Err: {err:?}")
    }

    info!("[init] Starting Token Storage");

    info!("Set {:?} as canister admin", init_data.owner);
    state.auth_service.add_permissions(init_data.owner, vec![Permission::Admin]).expect("Should be able to set the admin");
    
    match state.token_registry.add_bulk_tokens(get_default_tokens()) {
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
