// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        action::v3::ActionV3, common::AddressTypeV3, intent::v3::IntentV3, link::v3::LinkV3,
    },
};
use cashier_common::utils::get_link_account;

#[derive(Debug)]
pub struct CreateActionV3 {
    pub action: ActionV3,
    pub intents: Vec<IntentV3>,
}

impl CreateActionV3 {
    pub fn new(action: ActionV3, intents: Vec<IntentV3>) -> Self {
        Self { action, intents }
    }

    /// Creates a new CreateAction for a given Link.
    /// # Arguments
    /// * `link` - The Link for which the action is created.
    /// * `canister_id` - The canister ID of the token contract.
    /// # Returns
    /// * `Result<CreateAction, CanisterError>` - The resulting action or an error if the creation fails.
    pub fn create(
        link: &LinkV3,
        canister_id: Principal,
        action: ActionV3,
        intents: &[IntentV3],
    ) -> Result<Self, CanisterError> {
        let link_account = get_link_account(&link.id, canister_id)?;

        let enrich_intents = intents
            .iter()
            .map(|intent| {
                // if the intent is to link, set the dest_account to link_account
                if intent.dest_address_type == AddressTypeV3::Link {
                    let mut enriched_intent = intent.clone();
                    enriched_intent.dest_account = Some(link_account);
                    enriched_intent
                } else {
                    intent.clone()
                }
            })
            .collect();

        Ok(Self::new(action, enrich_intents))
    }
}
