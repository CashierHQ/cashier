// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use ic_mple_client::CanisterClientError;
use token_storage_types::icrc7::{MintResult, NftMetadata};

use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn it_should_succeed_mint_nft() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller = TestUser::TokenDeployer.get_principal();
        let icrc7_client = ctx.new_icrc7_ledger_client(caller);

        let metadata = NftMetadata {
            name: "NFT #1".to_string(),
            description: Some("This is a test NFT".to_string()),
            image: Some("https://example.com/nft.png".to_string()),
        };

        let mint_result = icrc7_client.mint(metadata, caller).await.unwrap();
        assert!(
            mint_result.is_ok(),
            "MintResult indicates failure: {:?}",
            mint_result
        );

        let token_id = mint_result.unwrap();
        assert_eq!(token_id, Nat::from(1u64), "Unexpected token ID returned");

        let metadata = NftMetadata {
            name: "NFT #2".to_string(),
            description: Some("This is a test NFT".to_string()),
            image: Some("https://example.com/nft.png".to_string()),
        };

        let mint_result = icrc7_client.mint(metadata, caller).await.unwrap();
        assert!(
            mint_result.is_ok(),
            "MintResult indicates failure: {:?}",
            mint_result
        );

        let token_id = mint_result.unwrap();
        assert_eq!(token_id, Nat::from(2u64), "Unexpected token ID returned");

        Ok(())
    })
    .await
    .unwrap();
}
