// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::link_v2::utils::calculator::calculate_link_balance_map;
use candid::Principal;
use cashier_backend_types::{
    constant::INTENT_LABEL_SEND_TIP_ASSET,
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        common::Asset,
        intent::v1::Intent,
        link::v1::Link,
    },
};
use transaction_manager::{
    icrc_token::utils::{get_batch_tokens_fee_for_link, get_link_account},
    intents::transfer_wallet_to_link::TransferWalletToLinkIntent,
};
use uuid::Uuid;

#[derive(Debug)]
pub struct SendAction {
    pub action: Action,
    pub intents: Vec<Intent>,
}

impl SendAction {
    pub fn new(action: Action, intents: Vec<Intent>) -> Self {
        Self { action, intents }
    }

    /// Creates a new SendAction for a given Link.
    /// # Arguments
    /// * `link` - The Link for which the action is created.
    /// * `sender_id` - The Principal ID of the caller.
    /// * `canister_id` - The canister ID of the token contract.
    /// # Returns
    /// * `Result<SendAction, CanisterError>` - The resulting action or an error if the creation fails.
    pub async fn create(
        link: &Link,
        sender_id: Principal,
        canister_id: Principal,
    ) -> Result<Self, CanisterError> {
        let action = Action {
            id: Uuid::new_v4().to_string(),
            r#type: ActionType::Send,
            link_id: link.id.clone(),
            creator: sender_id,
            state: ActionState::Created,
        };

        let link_account = get_link_account(&link.id, canister_id)?;

        // token_fee_map
        let token_fee_map = get_batch_tokens_fee_for_link(link).await?;

        let link_token_balance_map = calculate_link_balance_map(
            &link.asset_info,
            &token_fee_map,
            link.link_use_action_max_count,
        );

        // intents
        let deposit_intents = link
            .asset_info
            .iter()
            .map(|asset_info| {
                let address = match asset_info.asset {
                    Asset::IC { address } => address,
                };

                let sending_amount = link_token_balance_map.get(&address).ok_or_else(|| {
                    CanisterError::HandleLogicError(
                        "Failed to get sending amount from balance map".to_string(),
                    )
                })?;

                TransferWalletToLinkIntent::create(
                    INTENT_LABEL_SEND_TIP_ASSET.to_string(),
                    asset_info.asset.clone(),
                    sending_amount.clone(),
                    sender_id,
                    link_account,
                    link.create_at,
                )
            })
            .collect::<Result<Vec<TransferWalletToLinkIntent>, CanisterError>>()?;

        let mut intents = Vec::<Intent>::new();
        deposit_intents.iter().for_each(|dintent| {
            intents.push(dintent.intent.clone());
        });

        Ok(Self::new(action, intents))
    }
}
