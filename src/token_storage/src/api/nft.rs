// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::api::state::get_state;
use cashier_common::guard::is_not_anonymous;
use ic_cdk::{api::msg_caller, query, update};
use token_storage_types::{
    dto::nft::{AddUserNftInput, GetUserNftInput, NftDto, UserNftDto},
    error::CanisterError,
};

/// Adds a new NFT to the user's collection
/// # Arguments
/// * `input` - The input containing the NFT to be added
/// # Returns
/// * `UserNftDto` - The added NFT with user information
#[update(guard = "is_not_anonymous")]
pub async fn user_add_nft(input: AddUserNftInput) -> Result<UserNftDto, CanisterError> {
    let mut state = get_state();
    let user = msg_caller();
    state.user_nft.add_nft(user, input.nft).await
}

/// Retrieves the NFTs owned by the calling user
/// # Arguments
/// * `input` - The input containing pagination parameters
/// # Returns
/// * `Vec<NftDto>` - List of NFTs owned by the user
#[query(guard = "is_not_anonymous")]
pub fn user_get_nfts(input: GetUserNftInput) -> Vec<NftDto> {
    let state = get_state();
    let user = msg_caller();
    state.user_nft.get_nfts(&user, input.start, input.limit)
}
