// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    constant::INTENT_LABEL_SEND_TIP_ASSET,
    error::CanisterError,
    repository::{
        action::v3::ActionV3, common::AddressTypeV3, intent::v3::IntentV3, link::v3::LinkV3,
    },
};
use cashier_common::utils::get_link_account;
use transaction_manager::intents::transfer_link_to_wallet::TransferLinkToWalletIntent;
use uuid::Uuid;

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
        action: ActionV3,
        intents: Vec<IntentV3>,
        created_at: u64,
    ) -> Result<Self, CanisterError> {
        let link_account = get_link_account(&link.id, canister_id)?;
        let source_address = canister_id;
        let source_account = Some(link_account);
        let source_address_type = AddressTypeV3::Link;
        let dest_address = receiver_id;
        let dest_account = None;
        let dest_address_type = AddressTypeV3::User;

        // intents
        let link_to_wallet_intents = link
            .asset_info
            .iter()
            .map(|asset_info| {
                IntentV3::from_asset_info(
                    asset_info,
                    source_address,
                    source_account,
                    source_address_type.clone(),
                    dest_address,
                    dest_account,
                    dest_address_type.clone(),
                    action.id.clone(),
                    created_at,
                )
            })
            .collect::<Vec<IntentV3>>();

        Ok(Self::new(action, link_to_wallet_intents))
    }
}
