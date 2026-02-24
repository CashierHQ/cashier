// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    constant::INTENT_LABEL_LINK_CREATION_FEE,
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        asset::v1::Asset,
        intent::v1::{CreateWalletToTreasuryIntentArgs, Intent},
        link::v1::Link,
    },
};
use cashier_common::constant::ICP_CANISTER_PRINCIPAL;
use icrc_ledger_types::icrc1::account::Account;
use transaction_manager::{
    intents::transfer_wallet_to_treasury::TransferWalletToTreasuryIntent,
    utils::calculator::calculate_create_link_fee,
};

use crate::apps::{
    link_v2::links::shared::utils::link_asset_principals, token_fee::traits::TokenFeeCache,
};
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
    pub async fn create<F>(
        link: &Link,
        canister_id: Principal,
        mut token_fee_service: F,
    ) -> Result<Self, CanisterError>
    where
        F: TokenFeeCache + 'static,
    {
        let action = Action {
            id: Uuid::new_v4().to_string(),
            r#type: ActionType::CreateLink,
            link_id: link.id.clone(),
            creator: link.creator,
            state: ActionState::Created,
        };

        // token_fee_map
        let asset_principals = link_asset_principals(link);
        let token_fee_map = token_fee_service
            .get_batch_tokens_fee(&asset_principals)
            .await?;

        // intents
        let fee_asset = Asset::IC {
            address: ICP_CANISTER_PRINCIPAL,
        };
        let (actual_amount, approval_amount) = calculate_create_link_fee(&token_fee_map);
        let spender_account = Account {
            owner: canister_id,
            subaccount: None,
        };
        let input: CreateWalletToTreasuryIntentArgs = CreateWalletToTreasuryIntentArgs {
            label: INTENT_LABEL_LINK_CREATION_FEE.to_string(),
            asset: fee_asset,
            actual_amount,
            approval_amount,
            sender_id: link.creator,
            spender_account,
            created_at_ts: link.create_at,
        };

        let fee_intent = TransferWalletToTreasuryIntent::create(input)?;

        let intents = vec![fee_intent.intent];
        Ok(Self::new(action, intents))
    }
}
