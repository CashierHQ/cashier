// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        action::{
            v1::{ActionState, ActionType},
            v3::ActionV3,
        },
        common::AddressTypeV3,
        intent::v3::{CreateLinkToWalletIntentArgs, IntentV3},
        link::v3::LinkV3,
    },
};
use cashier_common::utils::get_link_account;
use transaction_manager::intents::v3::transfer_link_to_wallet::TransferLinkToWalletIntent;

use crate::apps::{
    link_v2::links::shared::utils::generate_intent_asset_label,
    link_v3::utils::link_v3_asset_principals, token_balance::traits::TokenBalanceFetcher,
    token_fee::traits::TokenFeeCache,
};
use uuid::Uuid;

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
    pub async fn create<F, B>(
        link: &LinkV3,
        canister_id: Principal,
        created_at: u64,
        mut token_fee_service: F,
        token_balance_service: B,
    ) -> Result<Self, CanisterError>
    where
        F: TokenFeeCache + 'static,
        B: TokenBalanceFetcher + 'static,
    {
        let action = ActionV3 {
            id: Uuid::new_v4().to_string(),
            action_type: ActionType::Withdraw,
            link_id: link.id.clone(),
            creator: link.creator,
            creator_address_type: AddressTypeV3::Creator,
            state: ActionState::Created,
            intent_ids: vec![],
        };

        let link_account = get_link_account(&link.id, canister_id)?;
        let asset_principals = link_v3_asset_principals(link);
        let token_fee_map = token_fee_service
            .get_batch_tokens_fee(&asset_principals)
            .await?;
        let actual_token_balance_map = token_balance_service
            .get_batch_token_balances(&link_account.into(), &asset_principals)
            .await?;

        // intents
        let link_to_wallet_intents = link
            .asset_info
            .iter()
            .map(|asset_info| {
                let sending_amount = actual_token_balance_map
                    .get(&asset_info.asset.address)
                    .cloned()
                    .unwrap_or(Nat::from(0u64));
                let fee_amount = token_fee_map
                    .get(&asset_info.asset.address)
                    .cloned()
                    .unwrap_or(Nat::from(0u64));
                let sending_amount = if sending_amount <= fee_amount {
                    Nat::from(0u64)
                } else {
                    sending_amount - fee_amount
                };

                let input = CreateLinkToWalletIntentArgs {
                    label: generate_intent_asset_label(link.link_type, asset_info.asset.address),
                    receiver_id: link.creator,
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

        Ok(Self::new(action, intents))
    }
}
