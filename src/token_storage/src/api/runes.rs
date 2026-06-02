// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::api::state::get_state;
use cashier_common::guard::is_not_anonymous;
use ic_cdk::{api::msg_caller, update};
use token_storage_types::error::CanisterError;

/// Retrieves the Rune deposit address associated with the calling user.
/// # Returns
/// * `Ok(String)` - The Rune deposit address of the user
/// * `Err(CanisterError)` - An error if the address cannot be retrieved
#[update(guard = "is_not_anonymous")]
pub async fn user_get_rune_address() -> Result<String, CanisterError> {
    let mut state = get_state();
    let user = msg_caller();
    state.user_runes.omnity_bitcoin_id = state.get_omnity_bitcoin_id();
    state
        .user_runes
        .get_rune_address(user, &state.omnity_bitcoin)
        .await
}
