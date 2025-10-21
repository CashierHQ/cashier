// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::link_v2::intents::transfer_link_to_wallet::TransferLinkToWalletIntent;
use crate::link_v2::utils::icrc_token::get_link_account;
use candid::{Nat, Principal};
use cashier_backend_types::{
    constant::INTENT_LABEL_SEND_TIP_ASSET,
    dto::action::Icrc112Requests,
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        intent::v1::Intent,
        link::v1::Link,
        transaction::v1::Transaction,
    },
};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug)]
pub struct ClaimAction {
    pub action: Action,
    pub intents: Vec<Intent>,
    pub intent_txs_map: HashMap<String, Vec<Transaction>>,
    pub icrc112_requests: Option<Icrc112Requests>,
}

impl ClaimAction {
    pub fn new(
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        icrc112_requests: Option<Icrc112Requests>,
    ) -> Self {
        Self {
            action,
            intents,
            intent_txs_map,
            icrc112_requests,
        }
    }

    /// Creates a new ClaimAction for a given Link.
    /// # Arguments
    /// * `link` - The Link for which the action is created.
    /// * `canister_id` - The canister ID of the token contract.
    /// # Returns
    /// * `Result<ClaimAction, CanisterError>` - The resulting action or an error if the creation fails.
    pub async fn create(link: &Link, canister_id: Principal) -> Result<Self, CanisterError> {
        let action = Action {
            id: Uuid::new_v4().to_string(),
            r#type: ActionType::Use,
            link_id: link.id.clone(),
            creator: link.creator,
            state: ActionState::Created,
        };

        let link_account = get_link_account(&link.id, canister_id)?;

        // intents
        let link_to_wallet_intents = link
            .asset_info
            .iter()
            .map(|asset_info| {
                let sending_amount = Nat::from(asset_info.amount_per_link_use_action);

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

        // intent_txs_map
        let mut intent_txs_map = HashMap::<String, Vec<Transaction>>::new();

        for link_to_wallet_intent in link_to_wallet_intents.iter() {
            let intent_id = link_to_wallet_intent.intent.id.clone();
            intent_txs_map.insert(intent_id, link_to_wallet_intent.transactions.clone());
        }

        Ok(Self::new(action, intents, intent_txs_map, None))
    }
}
