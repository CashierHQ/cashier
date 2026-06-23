// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::init::{CashierBackendInitData, CashierBackendUpgradeData};
use ic_cdk::{init, post_upgrade, pre_upgrade};
use log::{info, warn};

use crate::api::state::get_state;
use crate::apps::auth::Permission;
use cashier_common::constant::DEFAULT_TOKEN_FEE_TTL_NS;
use cashier_common::random::init_ic_rand;

#[init]
fn init(init_data: CashierBackendInitData) {
    let log_config = init_data.log_settings.unwrap_or_default();
    let mut state = get_state();

    if let Err(err) = state.log_service.init(Some(log_config)) {
        ic_cdk::println!("error configuring the logger. Err: {err:?}")
    }

    info!("[init] Starting Cashier Backend");

    let token_fee_ttl = init_data
        .token_fee_ttl_ns
        .unwrap_or(DEFAULT_TOKEN_FEE_TTL_NS);
    info!("[init] Setting token fee cache TTL to {} ns", token_fee_ttl);
    state.token_fee_service.init(token_fee_ttl);

    info!("[init] Set {:?} as canister admin", init_data.owner);
    state
        .auth_service
        .add_permissions(init_data.owner, vec![Permission::Admin])
        .expect("Should be able to set the admin");

    // Cross-canister IDs are optional at install; when omitted they stay at the stable default
    // (anonymous) and are wired later via the admin endpoints.
    if let Some(token_storage_canister_id) = init_data.token_storage_canister_id {
        info!(
            "[init] Set token storage canister id to {}",
            token_storage_canister_id
        );
        state.set_token_storage_canister_id(token_storage_canister_id);
    }

    if let Some(gate_service_canister_id) = init_data.gate_service_canister_id {
        info!(
            "[init] Set gate service canister id to {}",
            gate_service_canister_id
        );
        state.set_gate_service_canister_id(gate_service_canister_id);
    }

    if init_data.token_storage_canister_id.is_none() || init_data.gate_service_canister_id.is_none()
    {
        warn!(
            "[init] cross-canister IDs not fully set; wire via admin endpoints before use (unset IDs default to the anonymous principal)"
        );
    }

    state.token_standard_service.init(
        init_data
            .token_standard_cache_ttl_ns
            .unwrap_or(DEFAULT_TOKEN_FEE_TTL_NS),
    );

    init_ic_rand();
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
#[allow(clippy::needless_pass_by_value)]
fn post_upgrade(upgrade_data: CashierBackendUpgradeData) {
    if let Err(err) = get_state().log_service.init(None) {
        ic_cdk::println!("error configuring the logger. Err: {err:?}")
    }

    info!("[post_upgrade] Starting Cashier Backend");

    init_ic_rand();

    // Re-initialize token fee cache TTL (cache wiped on upgrade)
    get_state().token_fee_service.init(
        upgrade_data
            .token_fee_ttl_ns
            .unwrap_or(DEFAULT_TOKEN_FEE_TTL_NS),
    );

    // Apply cross-canister IDs ONLY if provided; when omitted, keep the existing stable value
    // (never clobber). This lets upgrades run with empty args while preserving wired config.
    if let Some(token_storage_canister_id) = upgrade_data.token_storage_canister_id {
        info!(
            "[post_upgrade] Set token storage canister id to {}",
            token_storage_canister_id
        );
        get_state().set_token_storage_canister_id(token_storage_canister_id);
    }

    if let Some(gate_service_canister_id) = upgrade_data.gate_service_canister_id {
        info!(
            "[post_upgrade] Set gate service canister id to {}",
            gate_service_canister_id
        );
        get_state().set_gate_service_canister_id(gate_service_canister_id);
    }

    // Re-initialize token standard cache TTL
    get_state().token_standard_service.init(
        upgrade_data
            .token_standard_cache_ttl_ns
            .unwrap_or(DEFAULT_TOKEN_FEE_TTL_NS),
    );
}
