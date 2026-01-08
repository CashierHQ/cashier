// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_mple_client::{CanisterClient, CanisterClientError};
use token_storage_types::icrc7::{
    Account, Icrc3Value, MintArgs, MintRequest, MintResult, NftMetadata,
};

pub struct Icrc7Client<C>
where
    C: CanisterClient,
{
    client: C,
}

impl<C> Icrc7Client<C>
where
    C: CanisterClient,
{
    pub fn new(client: C) -> Self {
        Self { client }
    }

    pub async fn mint(
        &self,
        metadata: NftMetadata,
        owner: Principal,
    ) -> Result<MintResult, CanisterClientError> {
        let nft_metadata = vec![
            (
                "name".to_string(),
                Box::new(Icrc3Value::Text(metadata.name)),
            ),
            (
                "description".to_string(),
                Box::new(Icrc3Value::Text(metadata.description.unwrap_or_default())),
            ),
            (
                "image".to_string(),
                Box::new(Icrc3Value::Text(metadata.image.unwrap_or_default())),
            ),
        ];
        let mint_args = MintArgs {
            mint_requests: vec![MintRequest {
                metadata: nft_metadata,
                token_owner: Account {
                    owner,
                    subaccount: None,
                },
                memo: None,
            }],
        };

        self.client.update("mint", (mint_args,)).await
    }
}
