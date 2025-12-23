// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::link_v2::{
    intents::transfer_wallet_to_treasury::TransferWalletToTreasuryIntent,
    utils::calculator::calculate_create_link_fee,
};
use crate::utils::helper::convert_nat_to_u64;
use candid::Principal;
use cashier_backend_types::{
    constant::INTENT_LABEL_LINK_CREATION_FEE,
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        common::Asset,
        intent::v1::Intent,
        link::v1::Link,
    },
};
use cashier_common::constant::ICP_CANISTER_PRINCIPAL;
use icrc_ledger_types::icrc1::account::Account;
use transaction_manager::icrc_token::utils::get_batch_tokens_fee_for_link;
use uuid::Uuid;

#[derive(Debug)]
pub struct CreateAction {
    pub action: Action,
    pub intents: Vec<Intent>,
}

impl CreateAction {
    pub fn new(action: Action, intents: Vec<Intent>) -> Self {
        Self { action, intents }
    }

    /// Creates a new CreateAction for a given Link.
    /// # Arguments
    /// * `link` - The Link for which the action is created.
    /// * `canister_id` - The canister ID of the token contract.
    /// # Returns
    /// * `Result<CreateAction, CanisterError>` - The resulting action or an error if the creation fails.
    pub async fn create(link: &Link, canister_id: Principal) -> Result<Self, CanisterError> {
        let action = Action {
            id: Uuid::new_v4().to_string(),
            r#type: ActionType::CreateLink,
            link_id: link.id.clone(),
            creator: link.creator,
            state: ActionState::Created,
        };

        // token_fee_map
        let token_fee_map = get_batch_tokens_fee_for_link(link).await?;

        // intents
        let fee_asset = Asset::IC {
            address: ICP_CANISTER_PRINCIPAL,
        };
        let (actual_amount, approval_amount) = calculate_create_link_fee(&token_fee_map);
        let actual_amount = convert_nat_to_u64(&actual_amount)?;
        let approval_amount = convert_nat_to_u64(&approval_amount)?;
        let spender_account = Account {
            owner: canister_id,
            subaccount: None,
        };

        let fee_intent = TransferWalletToTreasuryIntent::create(
            INTENT_LABEL_LINK_CREATION_FEE.to_string(),
            fee_asset,
            actual_amount,
            approval_amount,
            link.creator,
            spender_account,
            link.create_at,
        )?;

        let intents = vec![fee_intent.intent];
        Ok(Self::new(action, intents))
    }
}
