// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::api::state::get_state;
use cashier_common::guard::is_not_anonymous;
use ic_cdk::{api::msg_caller, query, update};
use token_storage_types::error::CanisterError;

#[update(guard = "is_not_anonymous")]
pub async fn user_get_btc_address() -> Result<String, CanisterError> {
    let mut state = get_state();
    let user = msg_caller();
    state.user_ckbtc.get_btc_address(user).await
}
