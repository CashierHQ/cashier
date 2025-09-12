use crate::api::state::get_state;
use cashier_common::random::init_ic_rand;
use gate_service_types::{auth::Permission, init::GateServiceInitData};
use ic_cdk::{init, post_upgrade, pre_upgrade};

#[init]
fn init(init_data: GateServiceInitData) {
    init_ic_rand();

    let mut state = get_state();

    // Set up logging
    let log_config = init_data.log_settings.unwrap_or_default();
    if let Err(err) = state.log_service.init(Some(log_config)) {
        ic_cdk::println!("error configuring the logger. Err: {err:?}")
    }

    // Set up permissions
    state
        .auth_service
        .add_permissions(init_data.owner, vec![Permission::Admin])
        .expect("Should be able to set the owner");

    if let Some(permissions) = init_data.permissions {
        for (principal, perms) in permissions {
            state
                .auth_service
                .add_permissions(principal, perms)
                .expect("Should be able to set the permissions");
        }
    }
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {
    init_ic_rand();
}
