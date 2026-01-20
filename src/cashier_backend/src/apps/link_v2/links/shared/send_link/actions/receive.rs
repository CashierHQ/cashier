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
use transaction_manager::intents::transfer_link_to_wallet::TransferLinkToWalletIntent;
use uuid::Uuid;

use crate::apps::link_v2::links::shared::utils::{get_batch_tokens_fee_for_link, set_intent_fees};

#[derive(Debug)]
pub struct ReceiveAction {
    pub action: Action,
    pub intents: Vec<Intent>,
}

impl ReceiveAction {
    pub fn new(action: Action, intents: Vec<Intent>) -> Self {
        Self { action, intents }
    }

    /// Creates a new ReceiveAction for a given Link.
    /// # Arguments
    /// * `link` - The Link for which the action is created.
    /// * `receiver_id` - The Principal ID of the receiver.
    /// * `canister_id` - The canister ID of the token contract.
    /// # Returns
    /// * `Result<ReceiveAction, CanisterError>` - The resulting action or an error if the creation fails.
    pub async fn create(
        link: &Link,
        receiver_id: Principal,
        canister_id: Principal,
    ) -> Result<Self, CanisterError> {
        let action = Action {
            id: Uuid::new_v4().to_string(),
            r#type: ActionType::Receive,
            link_id: link.id.clone(),
            creator: receiver_id,
            state: ActionState::Created,
        };

        let link_account = get_link_account(&link.id, canister_id)?;
        let token_fee_map = get_batch_tokens_fee_for_link(link).await?;

        // intents
        let link_to_wallet_intents = link
            .asset_info
            .iter()
            .map(|asset_info| {
                let sending_amount = asset_info.amount_per_link_use_action.clone();

                let address = match &asset_info.asset {
                    Asset::IC { address } => *address,
                };
                let network_fee = token_fee_map.get(&address).cloned().ok_or_else(|| {
                    CanisterError::HandleLogicError(format!(
                        "Network fee not found for token: {}",
                        address
                    ))
                })?;

                let mut intent = TransferLinkToWalletIntent::create(
                    INTENT_LABEL_SEND_TIP_ASSET.to_string(),
                    asset_info.asset.clone(),
                    sending_amount,
                    receiver_id,
                    link_account,
                    link.create_at,
                )?;

                // Calculate and set fees (receiver_id != link.creator → LinkToUser)
                set_intent_fees(&mut intent.intent, link, receiver_id, network_fee);

                Ok(intent)
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
