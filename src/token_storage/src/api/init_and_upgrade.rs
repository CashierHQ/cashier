// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::time::Duration;

use ic_cdk::{api::instruction_counter, init, post_upgrade, pre_upgrade};
use log::{debug, error, info};
use token_storage_types::init::TokenStorageInitData;

use crate::{api::state::get_state, services::auth::Permission};

#[init]
fn init(init_data: TokenStorageInitData) {
    let log_config = init_data.log_settings.unwrap_or_default();
    let mut state = get_state();

    if let Err(err) = state.log_service.init(Some(log_config)) {
        ic_cdk::println!("error configuring the logger. Err: {err:?}")
    }

    info!("[init] Starting Token Storage");

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

    set_token_price_timer();
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {
    if let Err(err) = get_state().log_service.init(None) {
        ic_cdk::println!("error configuring the logger. Err: {err:?}")
    }

    info!("[post_upgrade] Starting Token Storage");
    set_token_price_timer()
}

/// Set the token price timer
fn set_token_price_timer() {
    if cfg!(target_family = "wasm") {
        info!("Setting token price timer");

        ic_cdk_timers::set_timer_interval(Duration::from_secs(30), move || {
            ic_cdk::futures::spawn(async {
                debug!("[token_price_timer] - Start execution");

                let instructions_before = instruction_counter();

                let mut state = get_state();
                state.token_price.update_prices().await;

                let instructions_after = instruction_counter();

                let instructions = (instructions_after - instructions_before) / 1_000_000;
                info!(
                    "[token_price_timer] - Execution finished - Instructions used: {instructions}"
                );
            })
        });
    }
}
