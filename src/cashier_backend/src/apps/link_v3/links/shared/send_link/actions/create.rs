// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    constant::INTENT_LABEL_LINK_CREATION_FEE,
    error::CanisterError,
    repository::{
        action::{
            v1::{ActionState, ActionType},
            v3::ActionV3,
        },
        asset::v3::{AssetV3, TokenStandardV3},
        common::AddressTypeV3,
        intent::v3::{
            CreateIcrc1WalletToLinkIntentArgs, CreateIcrc2WalletToLinkIntentArgs,
            CreateWalletToTreasuryIntentArgs, IntentV3,
        },
        link::v3::LinkV3,
    },
};
use cashier_common::{constant::ICP_CANISTER_PRINCIPAL, utils::get_link_account};
use icrc_ledger_types::icrc1::account::Account;
use token_storage_types::token::IcrcStandard;
use transaction_manager::{
    intents::v3::{
        transfer_wallet_to_link::TransferWalletToLinkIntent,
        transfer_wallet_to_treasury::TransferWalletToTreasuryIntent,
    },
    utils::calculator::{
        calculate_create_link_fee, calculate_icrc1_transfer_intent_amount,
        calculate_icrc2_transfer_intent_amount,
    },
};
use uuid::Uuid;

use crate::apps::{
    link_v2::links::shared::utils::generate_intent_asset_label,
    link_v3::utils::link_v3_asset_principals, token_fee::traits::TokenFeeCache,
    token_standard::traits::TokenStandardCache,
};

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
    pub async fn create<F, S>(
        link: &LinkV3,
        canister_id: Principal,
        created_at: u64,
        mut token_fee_service: F,
        mut token_standard_service: S,
    ) -> Result<Self, CanisterError>
    where
        F: TokenFeeCache,
        S: TokenStandardCache,
    {
        let mut action = ActionV3 {
            id: Uuid::new_v4().to_string(),
            action_type: ActionType::CreateLink,
            link_id: link.id.clone(),
            creator: link.creator,
            creator_address_type: AddressTypeV3::Creator,
            state: ActionState::Created,
            intent_ids: vec![],
        };

        let link_account = get_link_account(&link.id, canister_id)?;
        // lookup token fees and standards from caching services
        let asset_principals: Vec<Principal> = link_v3_asset_principals(link);
        let token_fee_map = token_fee_service
            .get_batch_tokens_fee(&asset_principals)
            .await?;
        let token_standards_map = token_standard_service
            .get_batch_token_standards(&asset_principals)
            .await?;

        // intents
        let deposit_intents = link
            .asset_info
            .iter()
            .map(|asset_info| {
                let asset_address = asset_info.get_asset_address();
                let token_standards = token_standards_map.get(&asset_address).ok_or_else(|| {
                    CanisterError::not_found(
                        "Token standards for asset",
                        &asset_address.to_string(),
                    )
                })?;

                if token_standards.contains(&IcrcStandard::ICRC2) {
                    let spender_account = Account {
                        owner: canister_id,
                        subaccount: None,
                    };

                    let (actual_amount, approval_amount) = calculate_icrc2_transfer_intent_amount(
                        link.max_use,
                        &asset_info.amount,
                        asset_info.asset.address,
                        &token_fee_map,
                    )?;

                    let input = CreateIcrc2WalletToLinkIntentArgs {
                        label: generate_intent_asset_label(
                            link.link_type,
                            asset_info.asset.address,
                        ),
                        asset: asset_info.asset.clone(),
                        user_ui_input_asset_amount: asset_info.amount.clone(),
                        max_use: link.max_use,
                        actual_amount,
                        approval_amount,
                        sender_id: link.creator,
                        receiver_id: canister_id,
                        link_account,
                        spender_account,
                        created_at_ts: created_at,
                    };

                    TransferWalletToLinkIntent::create_icrc2(&action.id, input)
                } else {
                    let (actual_amount, _total_amount) = calculate_icrc1_transfer_intent_amount(
                        link.max_use,
                        &asset_info.amount,
                        asset_info.asset.address,
                        &token_fee_map,
                    )?;

                    let input = CreateIcrc1WalletToLinkIntentArgs {
                        label: generate_intent_asset_label(
                            link.link_type,
                            asset_info.asset.address,
                        ),
                        asset: asset_info.asset.clone(),
                        user_ui_input_asset_amount: asset_info.amount.clone(),
                        max_use: link.max_use,
                        sending_amount: actual_amount,
                        sender_id: link.creator,
                        receiver_id: canister_id,
                        link_account,
                        created_at_ts: created_at,
                    };

                    TransferWalletToLinkIntent::create_icrc1(&action.id, input)
                }
            })
            .collect::<Result<Vec<TransferWalletToLinkIntent>, CanisterError>>()?;

        let fee_asset = AssetV3 {
            address: ICP_CANISTER_PRINCIPAL,
            network_fee: token_fee_map.get(&ICP_CANISTER_PRINCIPAL).cloned(),
            token_standard: TokenStandardV3::ICRC2,
        };
        let (actual_amount, approval_amount) = calculate_create_link_fee(&token_fee_map);
        let spender_account = Account {
            owner: canister_id,
            subaccount: None,
        };
        let input = CreateWalletToTreasuryIntentArgs {
            label: INTENT_LABEL_LINK_CREATION_FEE.to_string(),
            asset: fee_asset,
            actual_amount,
            approval_amount,
            sender_id: link.creator,
            spender_account,
            receiver_id: canister_id,
            created_at_ts: link.created_at,
        };

        let fee_intent = TransferWalletToTreasuryIntent::create(&action.id, input)?;

        let mut intents = Vec::<IntentV3>::new();
        deposit_intents.iter().for_each(|dintent| {
            intents.push(dintent.intent.clone());
        });
        intents.push(fee_intent.intent);

        // enrich action with intent ids
        let intent_ids = intents.iter().map(|intent| intent.id.clone()).collect();
        action.intent_ids = intent_ids;

        Ok(Self::new(action, intents))
    }
}
