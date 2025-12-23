// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::link_v2::intents::transfer_link_to_wallet::TransferLinkToWalletIntent;
use candid::{Nat, Principal};
use cashier_backend_types::repository::common::Asset;
use cashier_backend_types::{
    constant::INTENT_LABEL_SEND_TIP_ASSET,
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        intent::v1::Intent,
        link::v1::Link,
    },
};
use transaction_manager::icrc_token::utils::{
    get_batch_tokens_balance_for_link, get_batch_tokens_fee_for_link, get_link_account,
};
use uuid::Uuid;

#[derive(Debug)]
pub struct WithdrawAction {
    pub action: Action,
    pub intents: Vec<Intent>,
}

impl WithdrawAction {
    pub fn new(action: Action, intents: Vec<Intent>) -> Self {
        Self { action, intents }
    }

    /// Creates a new WithdrawAction for a given Link.
    /// # Arguments
    /// * `link` - The Link for which the action is created.
    /// * `canister_id` - The canister ID of the token contract.
    /// # Returns
    /// * `Result<WithdrawAction, CanisterError>` - The resulting action or an error if the creation fails.
    pub async fn create(link: &Link, canister_id: Principal) -> Result<Self, CanisterError> {
        let action = Action {
            id: Uuid::new_v4().to_string(),
            r#type: ActionType::Withdraw,
            link_id: link.id.clone(),
            creator: link.creator,
            state: ActionState::Created,
        };

        let link_account = get_link_account(&link.id, canister_id)?;
        let actual_token_balance_map = get_batch_tokens_balance_for_link(link, canister_id).await?;
        let token_fee_map = get_batch_tokens_fee_for_link(link).await?;

        // intents
        let link_to_wallet_intents = link
            .asset_info
            .iter()
            .map(|asset_info| {
                let address = match asset_info.asset {
                    Asset::IC { address } => address,
                };
                let sending_amount = actual_token_balance_map
                    .get(&address)
                    .cloned()
                    .unwrap_or(Nat::from(0u64));
                let fee_amount = token_fee_map
                    .get(&address)
                    .cloned()
                    .unwrap_or(Nat::from(0u64));
                let sending_amount = if sending_amount <= fee_amount {
                    Nat::from(0u64)
                } else {
                    sending_amount - fee_amount
                };

                TransferLinkToWalletIntent::create(
                    INTENT_LABEL_SEND_TIP_ASSET.to_string(),
                    asset_info.asset.clone(),
                    sending_amount,
                    link.creator,
                    link_account,
                    link.create_at,
                )
            })
            .collect::<Result<Vec<TransferLinkToWalletIntent>, CanisterError>>()?;

        let mut intents = Vec::<Intent>::new();
        link_to_wallet_intents
            .iter()
            .for_each(|link_to_wallet_intent| {
                intents.push(link_to_wallet_intent.intent.clone());
            });

        Ok(Self::new(action, intents))
    }
}
