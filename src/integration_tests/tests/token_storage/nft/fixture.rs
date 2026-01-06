// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use ic_mple_client::PocketIcClient;
use std::sync::Arc;
use token_storage_types::icrc7::NftMetadata;

use crate::{
    icrc7::client::Icrc7Client,
    utils::{PocketIcTestContext, principal::TestUser},
};

pub struct UserNftFixture {
    pub ctx: Arc<PocketIcTestContext>,
    pub icrc7_ledger_client: Icrc7Client<PocketIcClient>,
}

impl UserNftFixture {
    pub fn new(ctx: Arc<PocketIcTestContext>) -> Self {
        let caller = TestUser::TokenDeployer.get_principal();
        let icrc7_ledger_client = ctx.new_icrc7_ledger_client(caller);
        Self {
            ctx,
            icrc7_ledger_client,
        }
    }

    /// Mints two NFTs to the specified user and returns their token IDs
    /// # Arguments
    /// * `user` - The principal of the user to mint NFTs to
    /// * `number` - The number of NFTs to mint
    /// # Returns
    /// * `Vec<Nat>` - A vector containing the token IDs of the minted NFTs
    pub async fn mint_nfts_to_user(&self, user: Principal, number: u64) -> Vec<Nat> {
        let mut token_ids = Vec::new();
        for _ in 0..number {
            let metadata = NftMetadata {
                name: format!("NFT #{}", token_ids.len() + 1),
                description: Some("This is a test NFT".to_string()),
                image: Some("https://example.com/nft.png".to_string()),
            };

            let mint_result = self.icrc7_ledger_client.mint(metadata, user).await.unwrap();
            let token_id = mint_result.unwrap();
            token_ids.push(token_id);
        }
        token_ids
    }
}
