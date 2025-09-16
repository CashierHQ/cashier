// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::time::Duration;

use ic_cdk::{init, post_upgrade, pre_upgrade};
use log::{debug, error, info};
use token_storage_types::init::TokenStorageInitData;

use crate::{api::state::get_state, services::{auth::Permission, token_price::TokenPriceService}};

#[init]
fn init(init_data: TokenStorageInitData) {
    let log_config = init_data.log_settings.unwrap_or_default();
    let mut state = get_state();

    if let Err(err) = state.log_service.init(Some(log_config)) {
        ic_cdk::println!("error configuring the logger. Err: {err:?}")
    }
    
    info!("[init] Set {:?} as canister admin", init_data.owner);
    state
    .auth_service
    .add_permissions(init_data.owner, vec![Permission::Admin])
    .expect("Should be able to set the admin");

    if let Some(tokens) = init_data.tokens {
        info!("[init] Set {} default tokens", tokens.len());
        debug!("[init] Default tokens: {tokens:?}");
        
        match state.token_registry.add_bulk_tokens(tokens) {
            Ok(_) => {}
            Err(e) => {
                error!("Error adding tokens: {e}");
            }
        }
    } else {
        info!("[init] No default tokens provided");
}

    set_token_timer();
    info!("[init] Starting Token Storage");
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {
    if let Err(err) = get_state().log_service.init(None) {
        ic_cdk::println!("error configuring the logger. Err: {err:?}")
    }

    set_token_timer();
    info!("[post_upgrade] Starting Token Storage");
}


    fn set_token_timer() {
        if cfg!(target_family = "wasm") {

            ic_cdk_timers::set_timer_interval(Duration::from_secs(15), move || {
                ic_cdk::futures::spawn(async move {
                    info!("Updating token list");
                    let token_service = TokenPriceService{};
                    token_service.get_token_list().await;
                    info!("Updated token list");
                })
            });
        }
    }