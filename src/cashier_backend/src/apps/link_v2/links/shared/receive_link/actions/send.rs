// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    constant::INTENT_LABEL_SEND_TIP_ASSET,
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        common::Asset,
        intent::v2::Intent,
        link::v1::Link,
    },
};
use cashier_common::utils::get_link_account;
use fee_calculator::{calc_outbound_fee, calculate_link_balance_map};
use transaction_manager::intents::transfer_wallet_to_link::TransferWalletToLinkIntent;

use crate::apps::link_v2::links::shared::utils::get_batch_tokens_fee_for_link;
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

                let base_amount = link_token_balance_map.get(&address).ok_or_else(|| {
                    CanisterError::HandleLogicError(
                        "Failed to get sending amount from balance map".to_string(),
                    )
                })?;

                // Add outbound fee (for creator to withdraw later)
                let network_fee = token_fee_map.get(&address).ok_or_else(|| {
                    CanisterError::HandleLogicError(
                        "Failed to get network fee from token fee map".to_string(),
                    )
                })?;
                let outbound_fee = calc_outbound_fee(1, network_fee);
                let sending_amount = base_amount.clone() + outbound_fee;

                // source_amount = user input amount (amount_per_link_use_action)
                let source_amount = asset_info.amount_per_link_use_action.clone();

                let intent = TransferWalletToLinkIntent::create(
                    INTENT_LABEL_SEND_TIP_ASSET.to_string(),
                    asset_info.asset.clone(),
                    sending_amount,
                    source_amount,
                    sender_id,
                    link_account,
                    link.create_at,
                )?;

                Ok(intent)
            })
            .collect::<Result<Vec<TransferWalletToLinkIntent>, CanisterError>>()?;

        let mut intents = Vec::<Intent>::new();
        deposit_intents.iter().for_each(|dintent| {
            intents.push(dintent.intent.clone());
        });

        Ok(Self::new(action, intents))
    }
}
