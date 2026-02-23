// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_backend_types::repository::intent::v3::IntentTypeV3;
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        action::v3::ActionV3,
        common::AddressTypeV3,
        intent::v3::{AddressInfoV3, IntentV3},
        link::v3::LinkV3,
    },
};
use cashier_common::utils::get_link_account;

use crate::apps::link_v2::links::shared::utils::{
    get_batch_tokens_balance_for_link_v3, get_batch_tokens_fee_for_link_v3,
};

#[derive(Debug)]
pub struct WithdrawAction {
    pub action: ActionV3,
    pub intents: Vec<IntentV3>,
}

impl WithdrawAction {
    pub fn new(action: ActionV3, intents: Vec<IntentV3>) -> Self {
        Self { action, intents }
    }

    /// Creates a new WithdrawAction for a given Link.
    /// # Arguments
    /// * `link` - The Link for which the action is created.
    /// * `canister_id` - The canister ID of the token contract.
    /// # Returns
    /// * `Result<WithdrawAction, CanisterError>` - The resulting action or an error if the creation fails.
    pub async fn create(
        link: &LinkV3,
        canister_id: Principal,
        action: ActionV3,
        _intents: Vec<IntentV3>,
        created_at: u64,
    ) -> Result<Self, CanisterError> {
        let link_account = get_link_account(&link.id, canister_id)?;
        let actual_token_balance_map =
            get_batch_tokens_balance_for_link_v3(link, canister_id).await?;
        let token_fee_map = get_batch_tokens_fee_for_link_v3(link).await?;
        let source_address = canister_id;
        let source_account = Some(link_account);
        let source_address_type = AddressTypeV3::Link;
        let dest_address = link.creator;
        let dest_account = None;
        let dest_address_type = AddressTypeV3::User;

        // intents
        let link_to_wallet_intents = link
            .asset_info
            .iter()
            .map(|asset_info| {
                let mut asset_info = asset_info.clone();

                let address = asset_info.asset.address;
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
                asset_info.amount = sending_amount;

                IntentV3::from_asset_info(
                    &asset_info,
                    IntentTypeV3::Receive,
                    AddressInfoV3 {
                        address: source_address,
                        account: source_account,
                        address_type: source_address_type.clone(),
                    },
                    AddressInfoV3 {
                        address: dest_address,
                        account: dest_account,
                        address_type: dest_address_type.clone(),
                    },
                    action.id.clone(),
                    created_at,
                )
            })
            .collect::<Vec<IntentV3>>();

        Ok(Self::new(action, link_to_wallet_intents))
    }
}
