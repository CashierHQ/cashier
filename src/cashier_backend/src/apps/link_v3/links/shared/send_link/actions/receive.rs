// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    constant::INTENT_LABEL_SEND_TIP_ASSET,
    error::CanisterError,
    repository::{
        action::{
            v1::{ActionState, ActionType},
            v3::ActionV3,
        },
        common::AddressTypeV3,
        intent::v3::{CreateLinkToWalletIntentArgs, IntentTypeV3, IntentV3},
        link::v3::LinkV3,
    },
};
use cashier_common::utils::get_link_account;
use transaction_manager::intents::v3::transfer_link_to_wallet::TransferLinkToWalletIntent;
use uuid::Uuid;

use crate::{
    apps::link_v2::links::shared::utils::generate_intent_asset_label, repositories::intent,
};

#[derive(Debug)]
pub struct ReceiveAction {
    pub action: ActionV3,
    pub intents: Vec<IntentV3>,
}

impl ReceiveAction {
    pub fn new(action: ActionV3, intents: Vec<IntentV3>) -> Self {
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
        link: &LinkV3,
        receiver_id: Principal,
        canister_id: Principal,
        created_at: u64,
    ) -> Result<Self, CanisterError> {
        let mut action = ActionV3 {
            id: Uuid::new_v4().to_string(),
            action_type: ActionType::Receive,
            link_id: link.id.clone(),
            creator: receiver_id,
            creator_address_type: AddressTypeV3::User,
            state: ActionState::Created,
            intent_ids: vec![],
        };

        let link_account = get_link_account(&link.id, canister_id)?;

        // intents
        let link_to_wallet_intents = link
            .asset_info
            .iter()
            .map(|asset_info| {
                let sending_amount = asset_info.amount.clone();
                let input = CreateLinkToWalletIntentArgs {
                    label: generate_intent_asset_label(link.link_type, asset_info.asset.address),
                    receiver_id,
                    sending_amount,
                    asset: asset_info.asset.clone(),
                    source_address: canister_id,
                    link_account,
                    created_at_ts: created_at,
                };

                TransferLinkToWalletIntent::create(&action.id, input)
            })
            .collect::<Result<Vec<TransferLinkToWalletIntent>, CanisterError>>()?;

        let mut intents = Vec::<IntentV3>::new();
        link_to_wallet_intents
            .iter()
            .for_each(|link_to_wallet_intent| {
                intents.push(link_to_wallet_intent.intent.clone());
            });

        let intent_ids = intents.iter().map(|intent| intent.id.clone()).collect();
        action.intent_ids = intent_ids;

        Ok(Self::new(action, intents))
    }
}
