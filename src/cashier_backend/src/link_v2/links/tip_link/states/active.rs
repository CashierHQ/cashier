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
use std::{collections::HashMap, fmt::Debug, future::Future, pin::Pin};

#[derive(Debug, Clone)]
pub struct ActiveState {
    pub link: Link,
    pub canister_id: Principal,
}

impl ActiveState {
    pub fn new(link: &Link, canister_id: Principal) -> Self {
        Self {
            link: link.clone(),
            canister_id,
        }
    }

    fn deactivate(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        let mut link = self.link.clone();

        Box::pin(async move {
            link.state = LinkState::Inactive;
            Ok(link)
        })
    }

    fn claim(
        &self,
        caller: Principal,
    ) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        let mut link = self.link.clone();
        let canister_id = self.canister_id;
        let to_account = Account::from(caller);

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

            // Increment the use action counter and check if it has reached the max count
            link.link_use_action_counter += 1;
            if link.link_use_action_counter >= link.link_use_action_max_count {
                link.state = LinkState::InactiveEnded;
            }

            Ok(link)
        })
    }
}

impl LinkV2State for ActiveState {
    fn process_action(
        &self,
        caller: Principal,
        action: &Action,
    ) -> Pin<Box<dyn Future<Output = Result<ProcessActionResult, CanisterError>>>> {
        let state = self.clone();
        let action = action.clone();

        Box::pin(async move {
            match action.r#type {
                ActionType::Deactivate => {
                    let updated_link = state.deactivate().await?;
                    Ok(ProcessActionResult {
                        link: updated_link,
                        action,
                        intents: vec![],
                        intent_txs_map: HashMap::new(),
                    })
                }
                ActionType::Claim => {
                    let updated_link = state.claim(caller).await?;
                    Ok(ProcessActionResult {
                        link: updated_link,
                        action,
                        intents: vec![],
                        intent_txs_map: HashMap::new(),
                    })
                }
                _ => Err(CanisterError::from(
                    "Unsupported action type for ActiveState",
                )),
            }
        })
    }
}
