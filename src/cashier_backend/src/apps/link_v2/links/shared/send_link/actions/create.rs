// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    constant::{INTENT_LABEL_LINK_CREATION_FEE, INTENT_LABEL_SEND_TIP_ASSET},
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        common::Asset,
        intent::v1::{
            CreateIcrc1WalletToLinkIntentArgs, CreateIcrc2WalletToLinkIntentArgs,
            CreateWalletToTreasuryIntentArgs, Intent,
        },
        link::v1::Link,
    },
};
use cashier_common::{
    constant::ICP_CANISTER_PRINCIPAL, runtime::IcEnvironment, utils::get_link_account,
};
use icrc_ledger_types::icrc1::account::Account;
use token_storage_types::token::IcrcStandard;
use transaction_manager::{
    intents::{
        transfer_wallet_to_link::TransferWalletToLinkIntent,
        transfer_wallet_to_treasury::TransferWalletToTreasuryIntent,
    },
    utils::calculator::{calculate_create_link_fee, calculate_icrc2_transfer_intent_amount},
};
use uuid::Uuid;

use crate::{
    apps::{
        link_v2::links::shared::utils::{
            get_batch_token_standards_for_link, get_batch_tokens_fee_for_link, link_assets,
        },
        token_fee::{TokenFeeService, TokenFetcher},
        token_standard::service::TokenStandardService,
        token_storage::traits::TokenStorageClient,
    },
    repositories::{self, Repositories},
};

pub struct CreateAction<R: Repositories, E: IcEnvironment, F: TokenFetcher, S: TokenStorageClient> {
    pub action: Action,
    pub intents: Vec<Intent>,
    pub token_fee_service: TokenFeeService<R, E, F>,
    pub token_standard_service: TokenStandardService<R, S, E>,
}

impl<R: Repositories, E: IcEnvironment, F: TokenFetcher, S: TokenStorageClient>
    CreateAction<R, E, F, S>
{
    pub fn new(
        action: Action,
        intents: Vec<Intent>,
        token_fee_service: TokenFeeService<R, E, F>,
        token_standard_service: TokenStandardService<R, S, E>,
    ) -> Self {
        Self {
            action,
            intents,
            token_fee_service,
            token_standard_service,
        }
    }

    /// Creates a new CreateAction for a given Link.
    /// # Arguments
    /// * `link` - The Link for which the action is created.
    /// * `canister_id` - The canister ID of the token contract.
    /// # Returns
    /// * `Result<CreateAction, CanisterError>` - The resulting action or an error if the creation fails.
    pub async fn create(&self, link: &Link, canister_id: Principal) -> Result<Self, CanisterError> {
        let action = Action {
            id: Uuid::new_v4().to_string(),
            r#type: ActionType::CreateLink,
            link_id: link.id.clone(),
            creator: link.creator,
            state: ActionState::Created,
        };

        let link_account = get_link_account(&link.id, canister_id)?;

        // lookup token fees and standards from caching services
        let assets = link_assets(link);
        let asset_principals: Vec<Principal> = assets
            .iter()
            .map(|asset| match asset {
                Asset::IC { address, .. } => *address,
            })
            .collect();
        let token_fee_map = self.token_fee_service.get_batch_tokens_fee(&assets).await?;
        let token_standards_map = self
            .token_standard_service
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
                        link.link_use_action_max_count,
                        &asset_info.amount_per_link_use_action,
                        &asset_info.asset,
                        &token_fee_map,
                    )?;

                    let input = CreateIcrc2WalletToLinkIntentArgs {
                        label: INTENT_LABEL_SEND_TIP_ASSET.to_string(),
                        asset: asset_info.asset.clone(),
                        actual_amount,
                        approval_amount,
                        sender_id: link.creator,
                        link_account,
                        spender_account,
                        created_at_ts: link.create_at,
                    };

                    TransferWalletToLinkIntent::create_icrc2(input)
                } else {
                    let input = CreateIcrc1WalletToLinkIntentArgs {
                        label: INTENT_LABEL_SEND_TIP_ASSET.to_string(),
                        asset: asset_info.asset.clone(),
                        sending_amount: asset_info.amount_per_link_use_action.clone(),
                        sender_id: link.creator,
                        link_account,
                        created_at_ts: link.create_at,
                    };

                    TransferWalletToLinkIntent::create_icrc1(input)
                }
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
        let input = CreateWalletToTreasuryIntentArgs {
            label: INTENT_LABEL_LINK_CREATION_FEE.to_string(),
            asset: fee_asset,
            actual_amount,
            approval_amount,
            sender_id: link.creator,
            spender_account,
            created_at_ts: link.create_at,
        };

        let fee_intent = TransferWalletToTreasuryIntent::create(input)?;

        let mut intents = Vec::<Intent>::new();
        deposit_intents.iter().for_each(|dintent| {
            intents.push(dintent.intent.clone());
        });
        intents.push(fee_intent.intent);

        Ok(Self::new(action, intents))
    }
}
