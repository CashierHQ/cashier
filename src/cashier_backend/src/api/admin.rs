use cashier_common::build_data::BuildData;
use ic_cdk::query;
use log::debug;

use crate::build_data::canister_build_data;

/// Returns the build data of the canister.
#[query]
fn get_canister_build_data() -> BuildData {
    debug!("[get_canister_build_data]");
    canister_build_data()
}
