// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::api::state::get_state;
use candid::Nat;
use cashier_common::guard::is_not_anonymous;
use ic_cdk::{api::msg_caller, query, update};
use token_storage_types::error::CanisterError;

/// Retrieves the BTC address associated with the calling user
/// # Returns
/// * `String` - The BTC address of the user, or a CanisterError
#[update(guard = "is_not_anonymous")]
pub async fn user_get_btc_address() -> Result<String, CanisterError> {
    let mut state = get_state();
    let user = msg_caller();
    let ckbtc_minter = state.get_ckbtc_minter_canister_id();
    state.user_ckbtc.get_btc_address(user, ckbtc_minter).await
}

#[update(guard = "is_not_anonymous")]
pub async fn user_update_balance() -> Result<Nat, CanisterError> {
    let mut state = get_state();
    let user = msg_caller();
    let ckbtc_minter = state.get_ckbtc_minter_canister_id();
    state.user_ckbtc.update_balance(user, ckbtc_minter).await
}
