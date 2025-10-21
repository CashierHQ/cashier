// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    link_v2::{
        traits::LinkV2State,
        utils::icrc_token::{get_batch_tokens_fee_for_link, transfer_assets_from_link_to_account},
    },
    services::ext::icrc_token::Account,
};
use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    repository::link::v1::{Link, LinkState},
};
use std::{fmt::Debug, future::Future, pin::Pin};

#[derive(Debug)]
pub struct InactiveState {
    pub link: Link,
    pub canister_id: Principal,
}

impl InactiveState {
    pub fn new(link: &Link, canister_id: Principal) -> Self {
        Self {
            link: link.clone(),
            canister_id,
        }
    }
}

impl LinkV2State for InactiveState {
    fn withdraw(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        let mut link = self.link.clone();
        let canister_id = self.canister_id;
        let to_account = Account::from(link.creator);

        Box::pin(async move {
            let token_fee_map = get_batch_tokens_fee_for_link(&link).await?;

            let _transfer_result = transfer_assets_from_link_to_account(
                &link,
                canister_id,
                &to_account,
                token_fee_map,
                true,
            )
            .await?;

            // Update link state to INACTIVE_ENDED after withdrawal
            link.state = LinkState::InactiveEnded;
            Ok(link)
        })
    }
}
