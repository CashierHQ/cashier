use crate::api::state::get_state;
use cashier_common::random::init_ic_rand;
use gate_service_types::{auth::Permission, init::GateServiceInitData};
use ic_cdk::{init, post_upgrade, pre_upgrade};

#[init]
fn init(init_data: GateServiceInitData) {
    init_ic_rand();

    let mut state = get_state();
    state
        .auth_service
        .add_permissions(init_data.owner, vec![Permission::Admin])
        .expect("Should be able to set the admin");
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {
    init_ic_rand();
}
