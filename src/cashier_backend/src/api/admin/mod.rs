use crate::api::guard::is_admin;
use candid::Principal;
use canister_internal_settings::types::Mode;
use cashier_common::build_data::BuildData;
use ic_cdk::{api::msg_caller, query, update};
use log::{debug, info};

use crate::{api::state::get_state, build_data::canister_build_data};

/// Returns the build data of the canister.
#[query]
fn get_canister_build_data() -> BuildData {
    debug!("[get_canister_build_data]");
    canister_build_data()
}

/// Method to change the maintenance mode of the canister
/// This method can only be called by an admin.
#[update(guard = "is_admin", hidden = true)]
fn admin_change_to_maintenance_mode(is_maintained: bool) {
    let caller = msg_caller();
    info!("[change_to_maintenance_mode] is_maintained: {is_maintained} by {caller}");
    let mut state = get_state();
    if is_maintained {
        state
            .canister_internal_settings_service
            .set_mode(Mode::Maintenance);
    } else {
        state
            .canister_internal_settings_service
            .set_mode(Mode::Operational);
    }
}

/// Method to add a new admin to the canister.
/// This method can only be called by an admin.
/// Iignore needless_pass_by_value because this is canister endpoint
#[allow(clippy::needless_pass_by_value)]
#[update(guard = "is_admin", hidden = true)]
fn admin_add_new_admin(principal_str: String) -> Result<(), String> {
    let caller = msg_caller();
    let principal: Principal = principal_str
        .parse()
        .expect("Failed to parse principal from string");

    let mut state = get_state();
    state
        .canister_internal_settings_service
        .add_admin(&principal)?;

    info!(
        "[admin_add_new_admin] Added new admin: {} by {caller}",
        principal
    );

    Ok(())
}

/// Method to remove an admin from the canister.
/// This method can only be called by an admin.
#[update(guard = "is_admin", hidden = true)]
/// Iignore needless_pass_by_value because this is canister endpoint
#[allow(clippy::needless_pass_by_value)]
fn admin_remove_admin(principal_str: String) -> Result<(), String> {
    let caller = msg_caller();
    let principal: Principal = principal_str
        .parse()
        .expect("Failed to parse principal from string");
    let mut state = get_state();
    state
        .canister_internal_settings_service
        .remove_admin(&principal)?;

    info!(
        "[admin_add_new_admin] Removed admin: {} by {caller}",
        principal
    );

    Ok(())
}
