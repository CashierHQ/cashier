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
    link_v2::ProcessActionResult,
    repository::{
        action::v1::{Action, ActionType},
        link::v1::{Link, LinkState},
    },
};
use std::{fmt::Debug, future::Future, pin::Pin};

#[derive(Debug, Clone)]
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

impl LinkV2State for InactiveState {
    fn process_action(
        &self,
        _caller: Principal,
        action: &Action,
    ) -> Pin<Box<dyn Future<Output = Result<ProcessActionResult, CanisterError>>>> {
        let state = self.clone();
        let action = action.clone();

        Box::pin(async move {
            match action.r#type {
                ActionType::Withdraw => {
                    let updated_link = state.withdraw().await?;
                    Ok(ProcessActionResult {
                        link: updated_link,
                        action,
                        intents: vec![],
                        intent_txs_map: std::collections::HashMap::new(),
                    })
                }
                _ => Err(CanisterError::from(
                    "Unsupported action type for InactiveState",
                )),
            }
        })
    }
}
