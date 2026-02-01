// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    constant::{INTENT_LABEL_LINK_CREATION_FEE, INTENT_LABEL_SEND_TIP_ASSET},
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        common::Asset,
        intent::v1::Intent,
        link::v1::Link,
    },
};
use cashier_common::{
    constant::ICP_CANISTER_PRINCIPAL,
    utils::{convert_nat_to_u64, get_link_account},
};
use icrc_ledger_types::icrc1::account::Account;
use transaction_manager::{
    intents::{
        transfer_wallet_to_link::TransferWalletToLinkIntent,
        transfer_wallet_to_treasury::TransferWalletToTreasuryIntent,
    },
    utils::calculator::{
        calculate_create_link_fee, calculate_icrc2_transfer_intent_amount,
        calculate_link_balance_map,
    },
};

use crate::apps::link_v2::links::shared::utils::get_batch_tokens_fee_for_link;
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

                let spender_account = Account {
                    owner: canister_id,
                    subaccount: None,
                };

                let (actual_amount, approval_amount) = calculate_icrc2_transfer_intent_amount(
                    link.link_use_action_max_count,
                    &asset_info.amount_per_link_use_action,
                    &asset_info.asset,
                    &token_fee_map,
                )?;

                TransferWalletToLinkIntent::create_icrc2(
                    INTENT_LABEL_SEND_TIP_ASSET.to_string(),
                    asset_info.asset.clone(),
                    actual_amount,
                    approval_amount,
                    link.creator,
                    spender_account,
                    link_account,
                    link.create_at,
                )
            })
            .collect::<Result<Vec<TransferWalletToLinkIntent>, CanisterError>>()?;

        let fee_asset = Asset::IC {
            address: ICP_CANISTER_PRINCIPAL,
        };
        let (actual_amount, approval_amount) = calculate_create_link_fee(&token_fee_map);
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

        let mut intents = Vec::<Intent>::new();
        deposit_intents.iter().for_each(|dintent| {
            intents.push(dintent.intent.clone());
        });
        intents.push(fee_intent.intent);

        Ok(Self::new(action, intents))
    }
}
