// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    constant::ICP_CANISTER_PRINCIPAL,
    v2::{
        traits::LinkV2State,
        utils::{
            calculator::{calculate_create_link_fee, calculate_link_balance_map},
            icrc_token::{
                get_batch_tokens_allowance, get_batch_tokens_balance,
                get_batch_tokens_fee_for_link, get_canister_ext_account,
                get_link_creator_ext_account, get_link_ext_account,
                transfer_fee_from_link_creator_to_treasury,
            },
        },
    },
};
use candid::{Nat, Principal};
use cashier_backend_types::{
    error::CanisterError,
    link_v2::ProcessActionResult,
    repository::{
        action::v1::{Action, ActionType},
        common::Asset,
        link::v1::{Link, LinkState},
    },
};
use std::{collections::HashMap, fmt::Debug, future::Future, pin::Pin};

#[derive(Debug, Clone)]
pub struct CreatedState {
    pub link: Link,
    pub canister_id: Principal,
}

impl CreatedState {
    pub fn new(link: &Link, canister_id: Principal) -> Self {
        Self {
            link: link.clone(),
            canister_id,
        }
    }

    fn activate(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        let mut link = self.link.clone();
        let canister_id = self.canister_id;

        Box::pin(async move {
            let token_fee_map = get_batch_tokens_fee_for_link(&link).await?;

            let required_token_balance_map = calculate_link_balance_map(
                &link.asset_info,
                &token_fee_map,
                link.link_use_action_max_count,
            );

            let assets: Vec<Asset> = link
                .asset_info
                .iter()
                .map(|info| info.asset.clone())
                .collect();
            let link_account = get_link_ext_account(&link.id, canister_id)?;
            let actual_token_balance_map = get_batch_tokens_balance(&assets, &link_account).await?;

            // check if the link balance is sufficient before activating
            for (asset_principal, required_balance) in required_token_balance_map.iter() {
                let actual_balance =
                    actual_token_balance_map
                        .get(asset_principal)
                        .ok_or_else(|| {
                            CanisterError::ValidationErrors(format!(
                                "Missing balance for asset {}",
                                asset_principal.to_text()
                            ))
                        })?;

                if actual_balance < required_balance {
                    return Err(CanisterError::ValidationErrors(format!(
                        "Insufficient balance for asset {}: required {}, actual {}",
                        asset_principal.to_text(),
                        required_balance,
                        actual_balance
                    )));
                }
            }

            // check if ICP allowance is sufficient for fees
            let (required_fee_amount, required_approval_amount) =
                calculate_create_link_fee(&token_fee_map);
            let link_creator_ext_account = get_link_creator_ext_account(&link);
            let canister_ext_account = get_canister_ext_account(canister_id);

            let actual_allowance_map = get_batch_tokens_allowance(
                &[Asset::IC {
                    address: ICP_CANISTER_PRINCIPAL,
                }],
                &link_creator_ext_account,
                &canister_ext_account,
            )
            .await?;

            let actual_allowance = actual_allowance_map
                .get(&ICP_CANISTER_PRINCIPAL)
                .ok_or_else(|| {
                    CanisterError::ValidationErrors("Missing allowance for ICP token".to_string())
                })?;

            if actual_allowance < &required_approval_amount {
                return Err(CanisterError::ValidationErrors(format!(
                    "Insufficient allowance for ICP token: required {}, actual {}",
                    required_approval_amount, actual_allowance
                )));
            }

            // transfer the fee from creator to treasury
            let icp_token_fee = token_fee_map
                .get(&ICP_CANISTER_PRINCIPAL)
                .cloned()
                .unwrap_or_else(|| Nat::from(0u64));
            let _transfer_from_result = transfer_fee_from_link_creator_to_treasury(
                &link,
                required_fee_amount,
                icp_token_fee,
            )
            .await?;

            // if all preconditions are met, activate the link
            link.state = LinkState::Active;
            Ok(link)
        })
    }
}

impl LinkV2State for CreatedState {
    fn process_action(
        &self,
        caller: Principal,
        action: &Action,
    ) -> Pin<Box<dyn Future<Output = Result<ProcessActionResult, CanisterError>>>> {
        let state = self.clone();
        let action = action.clone();

        Box::pin(async move {
            match action.r#type {
                ActionType::CreateLink => {
                    let updated_link = state.activate().await?;
                    Ok(ProcessActionResult {
                        link: updated_link,
                        action,
                        intents: vec![],
                        intent_txs_map: HashMap::new(),
                    })
                }
                _ => Err(CanisterError::from(
                    "Unsupported action type in Created state",
                )),
            }
        })
    }
}
