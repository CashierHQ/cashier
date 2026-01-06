// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{api::state::get_state, types::error::CanisterError};
use ic_cdk::{api::msg_caller, query, update};
use token_storage_types::dto::nft::{AddUserNftInput, UserNftDto};

#[update]
pub fn add_user_nft(input: AddUserNftInput) -> Result<UserNftDto, String> {
    let mut state = get_state();
    let user = msg_caller();
    state.user_nft.add_nft(user, input.nft)
}
