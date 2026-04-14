use ic_cdk::{
    api::{msg_caller, time},
    update,
};
use log::{debug, info};
use token_storage_types::{auth::Permission, token::UpdateTokenStandardsInput};

use crate::api::state::get_state;

/// Override for a token's supported standards
#[update]
pub fn token_manager_update_token_standards(
    input: UpdateTokenStandardsInput,
) -> Result<(), String> {
    info!("[token_manager_update_token_standards]");
    debug!("[token_manager_update_token_standards] input: {input:?}");

    let state = get_state();
    let caller = msg_caller();
    let updated_at = time();

    state
        .auth_service
        .check_has_any_permission(&caller, &[Permission::Admin, Permission::TokenManager])
        .map_err(|e| format!("{e:?}"))?;

    let mut registry = state.token_registry;
    registry.update_token_standards(input.token_id, input.supported_standards, updated_at)
}
