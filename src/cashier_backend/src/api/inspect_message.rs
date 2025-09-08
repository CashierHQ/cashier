
use cashier_backend_types::auth::Permission;
use ic_cdk::{self, api, inspect_message, trap};

use crate::api::state::get_state;

#[inspect_message]
fn inspect_messages() {

    let state = get_state();

    // if state.is_inspect_message_disabled() {
    //     api::accept_message();
    //     return;
    // }

    let method = api::msg_method_name();
    let caller = api::msg_caller();

    let check_result = match method.as_str() {
        method if method.starts_with("admin_") => {
            state
                .auth_service
                .check_has_permission(&caller, Permission::Admin)
        },
        _ => Ok(()),
    };

    if let Err(e) = check_result {
        trap(&format!("Call rejected by inspect check: {e:?}"));
    } else {
        api::accept_message();
    }
}
