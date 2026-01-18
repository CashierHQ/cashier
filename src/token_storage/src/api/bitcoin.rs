// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::api::state::get_state;
use cashier_common::guard::is_not_anonymous;
use ic_cdk::{api::msg_caller, update};
use token_storage_types::{
    dto::bitcoin::{CreateBridgeTransactionInputArg, UserBridgeTransactionDto},
    error::CanisterError,
};

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

/// Creates a new bridge transaction for the calling user
/// # Arguments
/// * `input` - The input data for creating the bridge transaction
/// # Returns
/// * `UserBridgeTransactionDto` - The created bridge transaction, or a CanisterError
#[update(guard = "is_not_anonymous")]
pub async fn user_create_bridge_transaction(
    input: CreateBridgeTransactionInputArg,
) -> Result<UserBridgeTransactionDto, CanisterError> {
    let mut state = get_state();
    let user = msg_caller();
    state
        .user_ckbtc
        .create_bridge_transaction(user, input)
        .await
}
