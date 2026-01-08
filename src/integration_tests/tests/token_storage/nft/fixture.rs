// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use ic_mple_client::PocketIcClient;
use std::sync::Arc;
use token_storage_types::{dto::nft::AddUserNftInput, icrc7::NftMetadata, nft::Nft};

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

    /// Mints NFTs to the specified user and adds them to the user's collection in token storage
    /// # Arguments
    /// * `user` - The principal of the user to mint and add NFTs to
    /// * `number` - The number of NFTs to mint and add
    /// # Returns
    /// * `Vec<Nat>` - A vector containing the token IDs of the minted and added NFTs
    pub async fn mint_and_add_nft_to_user(&self, user: Principal, number: u64) -> Vec<Nat> {
        let token_ids = self.mint_nfts_to_user(user, number).await;
        let token_storage_client = self.ctx.new_token_storage_client(user);

        for token_id in &token_ids {
            let add_nft_input = AddUserNftInput {
                nft: Nft {
                    collection_id: self.ctx.icrc7_ledger_principal,
                    token_id: token_id.clone(),
                },
            };
            let _ = token_storage_client
                .user_add_nft(add_nft_input)
                .await
                .unwrap();
        }

        token_ids
    }
}
