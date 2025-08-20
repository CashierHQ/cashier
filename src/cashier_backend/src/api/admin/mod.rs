use crate::api::guard::is_admin;
use canister_internal_settings::types::Mode;
use cashier_common::build_data::BuildData;
use ic_cdk::{query, update};
use log::debug;

use crate::{api::state::get_state, build_data::canister_build_data};

/// Returns the build data of the canister.
#[query]
fn get_canister_build_data() -> BuildData {
    debug!("[get_canister_build_data]");
    canister_build_data()
}

#[update(guard = "is_admin")]
fn change_to_maintenance_mode(is_maintained: bool) {
    debug!("[change_to_maintenance_mode] is_maintained: {is_maintained}");
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
