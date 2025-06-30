// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::{collections::HashMap, str::FromStr};

use candid::{Nat, Principal};
use cashier_types::{
    action::v1::{Action, ActionState, ActionType},
    asset_info::AssetInfo,
    common::{Asset, Chain, Wallet},
    intent::v2::{Intent, IntentState, IntentTask, IntentType},
    link::v1::{Link, LinkState, LinkType, Template},
    link_action::v1::{LinkAction, LinkUserState},
    user_link::v1::UserLink,
};
use icrc_ledger_types::icrc1::account::Account;
use uuid::Uuid;

use crate::{
    constant::{
        FEE_TREASURY_ADDRESS, ICP_CANISTER_ID, INTENT_LABEL_LINK_CREATION_FEE,
        INTENT_LABEL_RECEIVE_PAYMENT_ASSET, INTENT_LABEL_SEND_AIRDROP_ASSET,
        INTENT_LABEL_SEND_TIP_ASSET, INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
    },
    core::link::types::{
        CreateLinkInputV2, LinkDetailUpdateInput, LinkStateMachineGoto, UserStateMachineGoto,
    },
    domains::fee::Fee,
    error,
    repositories::{
        self, action::ActionRepository, link_action::LinkActionRepository,
        user_wallet::UserWalletRepository,
    },
    types::{
        api::{PaginateInput, PaginateResult},
        error::CanisterError,
    },
    utils::{
        helper::{convert_nat_to_u64, to_subaccount},
        icrc::IcrcService,
        runtime::IcEnvironment,
    },
    warn,
};

#[cfg_attr(test, faux::create)]
#[derive(Clone)]
pub struct LinkService<E: IcEnvironment + Clone> {
    // LinkService fields go here
    link_repository: repositories::link::LinkRepository,
    link_action_repository: LinkActionRepository,
    action_repository: ActionRepository,
    icrc_service: IcrcService,
    user_wallet_repository: UserWalletRepository,
    user_link_repository: repositories::user_link::UserLinkRepository,
    ic_env: E,
}

#[cfg_attr(test, faux::methods)]
impl<E: IcEnvironment + Clone> LinkService<E> {
    pub fn new(
        link_repository: repositories::link::LinkRepository,
        link_action_repository: LinkActionRepository,
        action_repository: ActionRepository,
        icrc_service: IcrcService,
        user_wallet_repository: UserWalletRepository,
        user_link_repository: repositories::user_link::UserLinkRepository,
        ic_env: E,
    ) -> Self {
        Self {
            link_repository,
            link_action_repository,
            action_repository,
            icrc_service,
            user_wallet_repository,
            user_link_repository,
            ic_env,
        }
    }

    pub fn get_instance() -> Self {
        Self {
            link_repository: repositories::link::LinkRepository::new(),
            link_action_repository: LinkActionRepository::new(),
            action_repository: ActionRepository::new(),
            icrc_service: IcrcService::new(),
            user_wallet_repository: UserWalletRepository::new(),
            user_link_repository: repositories::user_link::UserLinkRepository::new(),
            ic_env: E::new(),
        }
    }

    pub fn get_link_by_id(&self, id: String) -> Result<Link, CanisterError> {
        let link = self
            .link_repository
            .get(&id)
            .ok_or_else(|| CanisterError::NotFound("link not found".to_string()))?;

        Ok(link)
    }

    // Helper methods to create common intent types
    fn create_basic_intent(&self, task: IntentTask, label: String) -> Intent {
        let ts = self.ic_env.time();
        let mut intent = Intent::default();
        let transfer_data = IntentType::default_transfer();
        intent.r#type = transfer_data;
        intent.task = task;
        intent.id = Uuid::new_v4().to_string();
        intent.state = IntentState::Created;
        intent.created_at = ts;
        intent.label = label;
        intent
    }

    fn create_fee_intent(&self) -> Intent {
        let ts = self.ic_env.time();
        let mut intent = Intent::default();
        let transfer_fee_data = IntentType::default_transfer_from();
        intent.r#type = transfer_fee_data;
        intent.task = IntentTask::TransferWalletToTreasury;
        intent.id = Uuid::new_v4().to_string();
        intent.state = IntentState::Created;
        intent.created_at = ts;
        intent.label = INTENT_LABEL_LINK_CREATION_FEE.to_string();
        intent
    }

    pub fn look_up_intent(
        &self,
        link: &Link,
        action_type: &ActionType,
    ) -> Result<Option<Vec<Intent>>, CanisterError> {
        let mut intents: Vec<Intent> = vec![];
        let link_type = link
            .link_type
            .ok_or_else(|| CanisterError::HandleLogicError("link type not found".to_string()))?;

        match (link_type, action_type) {
            // SendTip link type handlers
            (LinkType::SendTip, ActionType::CreateLink) => {
                // Create intent for transfer asset to link
                let transfer_asset_intent = self.create_basic_intent(
                    IntentTask::TransferWalletToLink,
                    INTENT_LABEL_SEND_TIP_ASSET.to_string(),
                );

                // Create intent for transfer fee to treasury
                let transfer_fee_intent = self.create_fee_intent();

                intents.push(transfer_asset_intent);
                intents.push(transfer_fee_intent);
            }
            (LinkType::SendTip, ActionType::Use) | (LinkType::SendTip, ActionType::Withdraw) => {
                // Create intent for link asset to user wallet
                let intent = self.create_basic_intent(
                    IntentTask::TransferLinkToWallet,
                    INTENT_LABEL_SEND_TIP_ASSET.to_string(),
                );

                intents.push(intent);
            }

            // SendAirdrop link type handlers
            (LinkType::SendAirdrop, ActionType::CreateLink) => {
                // Create intent for transfer asset to link
                let transfer_asset_intent = self.create_basic_intent(
                    IntentTask::TransferWalletToLink,
                    INTENT_LABEL_SEND_AIRDROP_ASSET.to_string(),
                );

                // Create intent for transfer fee to treasury
                let transfer_fee_intent = self.create_fee_intent();
                intents.push(transfer_asset_intent);
                intents.push(transfer_fee_intent);
            }
            (LinkType::SendAirdrop, ActionType::Use)
            | (LinkType::SendAirdrop, ActionType::Withdraw) => {
                // Create intent for link asset to user wallet
                let intent = self.create_basic_intent(
                    IntentTask::TransferLinkToWallet,
                    INTENT_LABEL_SEND_AIRDROP_ASSET.to_string(),
                );

                intents.push(intent);
            }

            // SendTokenBasket link type handlers
            (LinkType::SendTokenBasket, ActionType::CreateLink) => {
                let asset_info = link.asset_info.clone().ok_or_else(|| {
                    CanisterError::HandleLogicError("Asset info not found".to_string())
                })?;

                // Create intents for each asset in asset_info
                for asset in asset_info.iter() {
                    if !asset
                        .label
                        .starts_with(INTENT_LABEL_SEND_TOKEN_BASKET_ASSET)
                    {
                        return Err(CanisterError::HandleLogicError(
                            "Asset label not match".to_string(),
                        ));
                    }

                    // Create intent for transfer asset to link
                    let label =
                        format!("{}_{}", INTENT_LABEL_SEND_TOKEN_BASKET_ASSET, asset.address);
                    let transfer_asset_intent =
                        self.create_basic_intent(IntentTask::TransferWalletToLink, label);

                    intents.push(transfer_asset_intent);
                }

                // Create intent for transfer fee to treasury
                let transfer_fee_intent = self.create_fee_intent();
                intents.push(transfer_fee_intent);
            }
            (LinkType::SendTokenBasket, ActionType::Use)
            | (LinkType::SendTokenBasket, ActionType::Withdraw) => {
                let asset_info = link.asset_info.clone().ok_or_else(|| {
                    CanisterError::HandleLogicError("Asset info not found".to_string())
                })?;

                // Create intents for each asset in asset_info
                for asset in asset_info.iter() {
                    // Create intent for transfer asset from link to wallet
                    let label =
                        format!("{}_{}", INTENT_LABEL_SEND_TOKEN_BASKET_ASSET, asset.address);
                    let transfer_asset_intent =
                        self.create_basic_intent(IntentTask::TransferLinkToWallet, label);

                    intents.push(transfer_asset_intent);
                }
            }

            // ReceivePayment link type handlers
            (LinkType::ReceivePayment, ActionType::CreateLink) => {
                // Create intent for transfer fee to treasury
                let transfer_fee_intent = self.create_fee_intent();
                intents.push(transfer_fee_intent);
            }
            (LinkType::ReceivePayment, ActionType::Use) => {
                // Create intent for payment transfer
                let intent = self.create_basic_intent(
                    IntentTask::TransferWalletToLink,
                    INTENT_LABEL_RECEIVE_PAYMENT_ASSET.to_string(),
                );

                intents.push(intent);
            }
            (LinkType::ReceivePayment, ActionType::Withdraw) => {
                // Create intent for link asset to user wallet
                let intent = self.create_basic_intent(
                    IntentTask::TransferLinkToWallet,
                    INTENT_LABEL_RECEIVE_PAYMENT_ASSET.to_string(),
                );

                intents.push(intent);
            }

            _ => return Ok(None),
        }

        Ok(Some(intents))
    }

    pub async fn assemble_intents(
        &self,
        link_id: &str,
        action_type: &ActionType,
        user_wallet: &Principal,
        fee_map: &HashMap<String, Nat>,
    ) -> Result<Vec<Intent>, CanisterError> {
        let link = self.get_link_by_id(link_id.to_string())?;

        let temp_intents = self.look_up_intent(&link, action_type)?;

        if temp_intents.is_none() {
            return Err(CanisterError::HandleLogicError(
                "Not found intents config for {link_type}_{action_type}".to_string(),
            ));
        }

        let mut intents = temp_intents.unwrap();

        // enrich data for intent
        for intent in intents.iter_mut() {
            // action type and intent task decide the values for intent
            let (
                amount,
                maybe_transfer_amount,
                maybe_approve_amount,
                asset,
                from_wallet,
                to_wallet,
                spender_wallet,
            ) = match (&action_type, &intent.task) {
                // for top up the link
                // need transfer amount = (amount_per_use + asset_network_fee) x amount_per_link_use_action
                (ActionType::CreateLink, IntentTask::TransferWalletToLink) => {
                    let asset_info = link.get_asset_by_label(&intent.label).ok_or_else(|| {
                        error!(
                    "[link_assemble_intents] find label for TransferWalletToLink not found {:#?}",
                    intent.label
                );
                        CanisterError::HandleLogicError(
                            "[link_assemble_intents] find label for TransferWalletToLink not found"
                                .to_string(),
                        )
                    })?;

                    let fee_in_nat = fee_map.get(&asset_info.address).ok_or_else(|| {
                        CanisterError::HandleLogicError(
                            "Fee not found for link creation".to_string(),
                        )
                    })?;
                    let fee_amount = convert_nat_to_u64(fee_in_nat)?;

                    let amount = (asset_info.amount_per_link_use_action + fee_amount)
                        * link.link_use_action_max_count;

                    let asset = Asset {
                        address: asset_info.address.clone(),
                        chain: asset_info.chain.clone(),
                    };
                    let from_wallet = Wallet {
                        address: Account {
                            owner: *user_wallet,
                            subaccount: None,
                        }
                        .to_string(),
                        chain: Chain::IC,
                    };
                    let to_wallet = Wallet {
                        address: Account {
                            owner: self.ic_env.id(),
                            subaccount: Some(to_subaccount(&link.id.clone())),
                        }
                        .to_string(),
                        chain: Chain::IC,
                    };

                    (amount, None, None, asset, from_wallet, to_wallet, None)
                }

                // for approve   create link fee + ledger_fee = (0.009 ICP)
                (ActionType::CreateLink, IntentTask::TransferWalletToTreasury) => {
                    let fee_in_nat =
                        fee_map.get(&ICP_CANISTER_ID.to_string()).ok_or_else(|| {
                            CanisterError::HandleLogicError(
                                "Fee not found for link creation".to_string(),
                            )
                        })?;
                    let fee_amount = convert_nat_to_u64(fee_in_nat)?;

                    let amount = Fee::CreateTipLinkFeeIcp.as_u64();
                    let actual_amount = amount;
                    let approve_amount = amount + fee_amount;

                    let asset = Asset {
                        address: ICP_CANISTER_ID.to_string(),
                        chain: Chain::IC,
                    };
                    let from_wallet = Wallet {
                        address: Account {
                            owner: *user_wallet,
                            subaccount: None,
                        }
                        .to_string(),
                        chain: Chain::IC,
                    };
                    let to_wallet = Wallet {
                        address: Account {
                            owner: Principal::from_str(FEE_TREASURY_ADDRESS).unwrap(),
                            subaccount: None,
                        }
                        .to_string(),
                        chain: Chain::IC,
                    };
                    let spender_wallet = Wallet {
                        address: Account {
                            owner: self.ic_env.id(),
                            subaccount: None,
                        }
                        .to_string(),
                        chain: Chain::IC,
                    };

                    (
                        amount,
                        Some(actual_amount),
                        Some(approve_amount),
                        asset,
                        from_wallet,
                        to_wallet,
                        Some(spender_wallet),
                    )
                }

                // for use link, mostly for "send" link type - need transfer amount = amount_per_user
                (ActionType::Use, IntentTask::TransferLinkToWallet) => {
                    let asset_info = link.get_asset_by_label(&intent.label).ok_or_else(|| {
                        CanisterError::HandleLogicError(
                            "[link_assemble_intents] task TransferLinkToWallet Asset not found"
                                .to_string(),
                        )
                    })?;

                    let amount = asset_info.amount_per_link_use_action;

                    let asset = Asset {
                        address: asset_info.address.clone(),
                        chain: asset_info.chain.clone(),
                    };
                    let from_wallet = Wallet {
                        address: Account {
                            owner: self.ic_env.id(),
                            subaccount: Some(to_subaccount(&link.id.clone())),
                        }
                        .to_string(),
                        chain: Chain::IC,
                    };
                    let to_wallet = Wallet {
                        address: user_wallet.to_string(),
                        chain: Chain::IC,
                    };

                    (amount, None, None, asset, from_wallet, to_wallet, None)
                }

                // for use link, mostly for "receive" link type - need transfer amount = amount_per_user
                (ActionType::Use, IntentTask::TransferWalletToLink) => {
                    let asset_info = link.get_asset_by_label(&intent.label).ok_or_else(|| {
                        CanisterError::HandleLogicError(
                            "[link_assemble_intents] task TransferWalletToLink Asset not found"
                                .to_string(),
                        )
                    })?;

                    let amount = asset_info.amount_per_link_use_action;

                    let asset = Asset {
                        address: asset_info.address.clone(),
                        chain: asset_info.chain.clone(),
                    };
                    let from_wallet = Wallet {
                        address: Account {
                            owner: *user_wallet,
                            subaccount: None,
                        }
                        .to_string(),
                        chain: Chain::IC,
                    };
                    let to_wallet = Wallet {
                        address: Account {
                            owner: self.ic_env.id(),
                            subaccount: Some(to_subaccount(&link.id.clone())),
                        }
                        .to_string(),
                        chain: Chain::IC,
                    };

                    (amount, None, None, asset, from_wallet, to_wallet, None)
                }

                // for withdraw link - need transfer amount = asset left in link
                (ActionType::Withdraw, IntentTask::TransferLinkToWallet) => {
                    let asset_info = link.get_asset_by_label(&intent.label).ok_or_else(|| {
                        CanisterError::HandleLogicError(
                            "[link_assemble_intents] task TransferLinkToWallet Asset not found"
                                .to_string(),
                        )
                    })?;

                    let link_balance = self
                        .icrc_service
                        .balance_of(
                            Principal::from_text(asset_info.address.clone()).unwrap(),
                            Account {
                                owner: self.ic_env.id(),
                                subaccount: Some(to_subaccount(&link.id.clone())),
                            },
                        )
                        .await?;

                    let fee_in_nat = fee_map.get(&asset_info.address).ok_or_else(|| {
                        CanisterError::HandleLogicError(
                            "Fee not found for link creation".to_string(),
                        )
                    })?;
                    let fee_amount = convert_nat_to_u64(fee_in_nat)?;

                    if link_balance <= 0 {
                        return Err(CanisterError::ValidationErrors(
                            "Not enough asset in link".to_string(),
                        ));
                    }

                    if link_balance < fee_amount {
                        return Err(CanisterError::ValidationErrors(
                            "Not enough asset in link to cover fee".to_string(),
                        ));
                    }

                    let amount = link_balance - fee_amount;
                    let asset = Asset {
                        address: asset_info.address.clone(),
                        chain: asset_info.chain.clone(),
                    };
                    let from_wallet = Wallet {
                        address: Account {
                            owner: self.ic_env.id(),
                            subaccount: Some(to_subaccount(&link.id.clone())),
                        }
                        .to_string(),
                        chain: Chain::IC,
                    };
                    let to_wallet = Wallet {
                        address: user_wallet.to_string(),
                        chain: Chain::IC,
                    };

                    (amount, None, None, asset, from_wallet, to_wallet, None)
                }

                _ => {
                    return Err(CanisterError::HandleLogicError(format!(
                        "No matching case found for action_type: {:?} and intent_task: {:?}",
                        action_type, intent.task
                    )));
                }
            };

            // Apply the values to the intent
            match &spender_wallet as &Option<Wallet> {
                Some(spender) => {
                    // TransferFrom case
                    let mut transfer_from_data = intent.r#type.as_transfer_from().unwrap();
                    transfer_from_data.amount = Nat::from(amount);
                    transfer_from_data.approve_amount = maybe_approve_amount.map(Nat::from);
                    transfer_from_data.actual_amount = maybe_transfer_amount.map(Nat::from);
                    transfer_from_data.asset = asset;
                    transfer_from_data.from = from_wallet;
                    transfer_from_data.to = to_wallet;
                    transfer_from_data.spender = spender.clone();
                    intent.r#type = IntentType::TransferFrom(transfer_from_data);
                }
                None => {
                    // Transfer case
                    let mut transfer_data = intent.r#type.as_transfer().unwrap();
                    transfer_data.amount = Nat::from(amount);
                    transfer_data.asset = asset;
                    transfer_data.from = from_wallet;
                    transfer_data.to = to_wallet;
                    intent.r#type = IntentType::Transfer(transfer_data);
                }
            }
        }

        Ok(intents)
    }

    /// Extracts and returns just the assets from assembled intents
    ///
    /// This method follows the same logic as `assemble_intents` but only returns
    /// the unique assets that would be used in the intents, without creating
    /// the full intent structures.
    ///
    /// # Arguments
    /// * `link_id` - The ID of the link
    /// * `action_type` - The type of action (CreateLink, Use, Withdraw)
    /// * `user_wallet` - The user's wallet principal
    ///
    /// # Returns
    /// * `Ok(Vec<Asset>)` - List of unique assets required for the action
    /// * `Err(CanisterError)` - Error if link not found or invalid configuration
    pub fn get_assets_for_action(
        &self,
        link_id: &str,
        action_type: &ActionType,
    ) -> Result<Vec<Asset>, CanisterError> {
        let link = self.get_link_by_id(link_id.to_string())?;
        let temp_intents = self.look_up_intent(&link, action_type)?;

        if temp_intents.is_none() {
            return Err(CanisterError::HandleLogicError(
                "Not found intents config for {link_type}_{action_type}".to_string(),
            ));
        }

        let intents = temp_intents.unwrap();
        let mut assets = Vec::new();

        // Extract assets from each intent based on task type
        for intent in intents.iter() {
            match intent.task.clone() {
                IntentTask::TransferWalletToLink => {
                    let asset_info = link.get_asset_by_label(&intent.label).ok_or_else(|| {
                        CanisterError::HandleLogicError(
                            format!(
                                "[get_assets_for_action] task TransferWalletToLink Asset not found for label: {}",
                                intent.label
                            ),
                        )
                    })?;

                    assets.push(Asset {
                        address: asset_info.address.clone(),
                        chain: asset_info.chain.clone(),
                    });
                }
                IntentTask::TransferWalletToTreasury => {
                    // Fee payment always uses ICP
                    assets.push(Asset {
                        address: ICP_CANISTER_ID.to_string(),
                        chain: Chain::IC,
                    });
                }
                IntentTask::TransferLinkToWallet => {
                    let asset_info = link.get_asset_by_label(&intent.label).ok_or_else(|| {
                        CanisterError::HandleLogicError(
                            "[get_assets_for_action] task TransferLinkToWallet Asset not found"
                                .to_string(),
                        )
                    })?;

                    assets.push(Asset {
                        address: asset_info.address.clone(),
                        chain: asset_info.chain.clone(),
                    });
                }
            }
        }

        // Remove duplicates by converting to a set-like structure
        assets.sort_by(|a, b| a.address.cmp(&b.address));
        assets.dedup_by(|a, b| a.address == b.address && a.chain == b.chain);

        Ok(assets)
    }

    pub fn get_action_of_link(
        &self,
        link_id: &str,
        action_type: &str,
        user_id: &str,
    ) -> Option<Action> {
        let link_actions = self.link_action_repository.get_by_prefix(
            link_id.to_string(),
            action_type.to_string(),
            user_id.to_string(),
        );

        if link_actions.is_empty() {
            return None;
        }

        

        self
            .action_repository
            .get(link_actions[0].action_id.clone())
    }

    // this method validate for each action type
    // create link:
    //      - only creator can create link
    // withdraw:
    //      - only creator can withdraw
    //      - validate link balance left
    // claim:
    //      - any one can use
    //      - validate link state is active
    //      - validate link balance left
    pub async fn link_validate_user_create_action_async(
        &self,
        link_id: &str,
        action_type: &ActionType,
        user_id: &str,
        caller: &Principal,
    ) -> Result<(), CanisterError> {
        // get link
        let link = self.get_link_by_id(link_id.to_string()).unwrap();

        match action_type {
            ActionType::CreateLink => {
                // validate user id == link creator
                if link.creator == user_id {
                    // validate user’s balance
                    self.link_validate_balance_with_asset_info(action_type, link_id, caller)
                        .await?;
                    Ok(())
                } else {
                    Err(CanisterError::ValidationErrors(
                        "User is not the creator of the link".to_string(),
                    ))
                }
            }
            ActionType::Withdraw => {
                // validate user id == link creator
                if link.creator == user_id {
                    let asset = link.asset_info.clone().ok_or_else(|| {
                        CanisterError::HandleLogicError("Asset info not found".to_string())
                    })?;
                    let asset_address = asset[0].address.clone();
                    let link_balance = self
                        .icrc_service
                        .balance_of(
                            Principal::from_text(asset_address).unwrap(),
                            Account {
                                owner: self.ic_env.id(),
                                subaccount: Some(to_subaccount(&link.id.clone())),
                            },
                        )
                        .await?;

                    if link_balance <= 0 {
                        return Err(CanisterError::ValidationErrors(
                            "Not enough asset".to_string(),
                        ));
                    }

                    Ok(())
                } else {
                    Err(CanisterError::ValidationErrors(
                        "User is not the creator of the link".to_string(),
                    ))
                }
            }
            ActionType::Use => {
                // validate link state
                if link.state != LinkState::Active {
                    return Err(CanisterError::ValidationErrors(
                        "Link is not active".to_string(),
                    ));
                }

                if link.link_type != Some(LinkType::ReceivePayment) {
                    // validate link balance
                    let asset = link.asset_info.clone().ok_or_else(|| {
                        CanisterError::HandleLogicError("Asset info not found".to_string())
                    })?;
                    let asset_address = asset[0].address.clone();

                    let link_balance = self
                        .icrc_service
                        .balance_of(
                            Principal::from_text(asset_address).unwrap(),
                            Account {
                                owner: self.ic_env.id(),
                                subaccount: Some(to_subaccount(&link.id.clone())),
                            },
                        )
                        .await?;

                    if link_balance <= 0 {
                        return Err(CanisterError::ValidationErrors(
                            "Not enough asset".to_string(),
                        ));
                    }
                }

                Ok(())
            }
            _ => {
                Err(CanisterError::ValidationErrors(
                    "Unsupported action type".to_string(),
                ))
            }
        }
    }

    pub async fn link_validate_user_update_action_async(
        &self,
        action: &Action,
        user_id: &str,
        caller: &Principal,
    ) -> Result<(), CanisterError> {
        //validate user_id
        match action.r#type.clone() {
            ActionType::CreateLink => {
                let link = self.get_link_by_id(action.link_id.clone())?;
                if !(action.creator == user_id && link.creator == user_id) {
                    return Err(CanisterError::ValidationErrors(
                        "User is not the creator of the action".to_string(),
                    ));
                }

                self.link_validate_balance_with_asset_info(&action.r#type, &link.id, caller)
                    .await?;
            }
            ActionType::Withdraw => {
                let link = self.get_link_by_id(action.link_id.clone())?;
                if !(action.creator == user_id && link.creator == user_id) {
                    return Err(CanisterError::ValidationErrors(
                        "User is not the creator of the action".to_string(),
                    ));
                }
            }
            ActionType::Use => {
                if action.creator != user_id {
                    return Err(CanisterError::ValidationErrors(
                        "User is not the creator of the action".to_string(),
                    ));
                }
            }
            _ => {
                return Err(CanisterError::ValidationErrors(
                    "Unsupported action type".to_string(),
                ));
            }
        }

        Ok(())
    }

    // This method is a synchronous version that performs basic validation without async checks
    pub fn link_validate_user_create_action(
        &self,
        link_id: &str,
        action_type: &ActionType,
        user_id: &str,
    ) -> Result<(), CanisterError> {
        // Get link
        let link = self.get_link_by_id(link_id.to_string())?;

        match action_type {
            ActionType::CreateLink => {
                // Validate user ID == link creator
                if link.creator == user_id {
                    // Basic validation passes, async balance validation would happen separately
                    Ok(())
                } else {
                    Err(CanisterError::ValidationErrors(
                        "User is not the creator of the link".to_string(),
                    ))
                }
            }
            ActionType::Withdraw => {
                // Validate user ID == link creator
                if link.creator == user_id {
                    // Synchronous validation passes
                    Ok(())
                } else {
                    Err(CanisterError::ValidationErrors(
                        "User is not the creator of the link".to_string(),
                    ))
                }
            }
            ActionType::Use => {
                // Validate link state
                if link.state != LinkState::Active {
                    return Err(CanisterError::ValidationErrors(
                        "Link is not active".to_string(),
                    ));
                }

                // For send-type links, check usage counter against max allowed
                if let Some(_link_type) = &link.link_type {
                    if link.link_use_action_counter >= link.link_use_action_max_count {
                        return Err(CanisterError::ValidationErrors(format!(
                            "Link maximum usage count reached: {}",
                            link.link_use_action_max_count
                        )));
                    }
                }

                // Synchronous validation passes
                Ok(())
            }
            _ => {
                Err(CanisterError::ValidationErrors(
                    "Unsupported action type".to_string(),
                ))
            }
        }
    }

    // Helper method to validate action update permissions
    pub fn link_validate_user_update_action(
        &self,
        action: &Action,
        user_id: &str,
    ) -> Result<(), CanisterError> {
        //validate user_id
        match action.r#type.clone() {
            ActionType::CreateLink => {
                let link = self.get_link_by_id(action.link_id.clone())?;
                if !(action.creator == user_id && link.creator == user_id) {
                    return Err(CanisterError::ValidationErrors(
                        "User is not the creator of the action".to_string(),
                    ));
                }
            }
            ActionType::Withdraw => {
                let link = self.get_link_by_id(action.link_id.clone())?;
                if !(action.creator == user_id && link.creator == user_id) {
                    return Err(CanisterError::ValidationErrors(
                        "User is not the creator of the action".to_string(),
                    ));
                }
            }

            //TODO: replace claim as use
            ActionType::Use => {
                if action.creator != user_id {
                    return Err(CanisterError::ValidationErrors(
                        "User is not the creator of the action".to_string(),
                    ));
                }

                if action.state == ActionState::Success {
                    return Err(CanisterError::ValidationErrors(
                        "Action is already success".to_string(),
                    ));
                }
            }
            _ => {
                return Err(CanisterError::ValidationErrors(
                    "Unsupported action type".to_string(),
                ));
            }
        }

        Ok(())
    }

    // This method mostly use for "Send" link type
    pub async fn link_validate_balance_with_asset_info(
        &self,
        action_type: &ActionType,
        link_id: &str,
        user: &Principal,
    ) -> Result<(), CanisterError> {
        if action_type != &ActionType::CreateLink {
            return Ok(());
        }

        let link = self
            .get_link_by_id(link_id.to_string())
            .map_err(|e| CanisterError::NotFound(e.to_string()))?;

        if link.link_type.unwrap() == LinkType::ReceivePayment {
            return Ok(());
        }

        let asset_info = link
            .asset_info
            .clone()
            .ok_or_else(|| CanisterError::NotFound("Asset info not found".to_string()))?;

        for asset in asset_info {
            let token_pid = Principal::from_text(asset.address.as_str()).map_err(|e| {
                CanisterError::HandleLogicError(format!(
                    "Error converting token address to principal: {:?}",
                    e
                ))
            })?;

            let account = Account {
                owner: *user,
                subaccount: None,
            };

            let balance = self
                .icrc_service
                .balance_of(token_pid, account)
                .await?;

            let expected_amount = asset.amount_per_link_use_action * link.link_use_action_max_count;

            if balance <= expected_amount {
                return Err(CanisterError::ValidationErrors(format!(
                    "Insufficient balance for asset: {}, balance: {}, required: {} and fee try smaller amount",
                    asset.address, balance, expected_amount
                )));
            }
        }

        Ok(())
    }

    pub fn get_link_action_user(
        &self,
        link_id: String,
        action_type: String,
        user_id: String,
    ) -> Result<Option<LinkAction>, CanisterError> {
        let link_action = self.link_action_repository.get_by_prefix(
            link_id,
            action_type,
            user_id,
        );
        if link_action.is_empty() {
            return Ok(None);
        }

        Ok(Some(link_action[0].clone()))
    }

    pub fn handle_user_link_state_machine(
        &self,
        link_id: String,
        action_type: String,
        user_id: String,
        goto: UserStateMachineGoto,
    ) -> Result<LinkAction, CanisterError> {
        // check inputs that can be changed this state
        let action_list = self.link_action_repository.get_by_prefix(
            link_id.clone(),
            action_type.clone(),
            user_id.clone(),
        );

        if action_list.is_empty() {
            return Err(CanisterError::NotFound("Link action not found".to_string()));
        }

        let mut link_action = action_list[0].clone();

        // Validate current state
        let current_user_state = link_action
            .link_user_state
            .clone()
            .ok_or_else(|| CanisterError::HandleLogicError("unknown state".to_string()))?;

        // Flattened state transitions using if/else
        let new_state;

        // Check if we're in final state (CompletedLink)
        if current_user_state == LinkUserState::CompletedLink {
            return Err(CanisterError::HandleLogicError(
                "current state is final state".to_string(),
            ));
        }
        //
        // !Start of user state machine
        //
        // Check for valid transition: ChooseWallet -> CompletedLink
        else if current_user_state == LinkUserState::ChooseWallet
            && goto == UserStateMachineGoto::Continue
        {
            // Validate the action exists and is successful
            let action = self
                .get_action_of_link(&link_id, &action_type, &user_id)
                .ok_or_else(|| CanisterError::NotFound("Action not found".to_string()))?;

            if action.state != ActionState::Success {
                return Err(CanisterError::HandleLogicError(
                    "Action is not success".to_string(),
                ));
            }

            // Set the new state
            new_state = LinkUserState::CompletedLink;
        }
        // !End of state machine logic

        // Any other transition is invalid
        else {
            return Err(CanisterError::HandleLogicError(format!(
                "current state {:#?} is not allowed to transition: {:#?}",
                current_user_state, goto
            )));
        }

        // Only update the state field
        link_action.link_user_state = Some(new_state);

        // Update in repository
        self.link_action_repository.update(link_action.clone());

        // Return the updated link_action
        Ok(link_action)
    }

    /// Updates link properties after an action completes
    /// Returns true if link properties were updated, false otherwise
    pub fn update_link_use_counter(
        &self,
        link_id: String,
        action_id: String,
    ) -> Result<bool, CanisterError> {
        // Get the link and action
        let link = self.get_link_by_id(link_id)?;
        let action = match self.action_repository.get(action_id) {
            Some(action) => action,
            None => return Ok(false),
        };

        // Early return if not a successful claim on a TipLink
        if action.state != ActionState::Success {
            return Ok(false);
        }

        // At this point we know we have a successful claim on a TipLink
        // Update link's properties here
        let mut updated_link = link;
        let mut is_update: bool = false;

        if action.r#type == ActionType::Use {
            // Update asset info to track the claim
            if updated_link.link_use_action_counter + 1 > updated_link.link_use_action_max_count {
                return Err(CanisterError::HandleLogicError(
                    "Link use action counter exceeded max count".to_string(),
                ));
            }
            updated_link.link_use_action_counter += 1;
            is_update = true;
        }

        // Save the updated link
        if !is_update {
            return Ok(false);
        }

        self.link_repository.update(updated_link);

        // Return true to indicate that we updated the link
        Ok(true)
    }

    // if the link and asset info meet the requirement return true
    // else return false
    pub fn link_type_add_asset_validate(
        &self,
        link: &Link,
        asset_infos: &Vec<AssetInfo>,
        link_use_action_max_count: &u64,
    ) -> bool {
        if link.link_type == Some(LinkType::SendTip) {
            // Send tip only use one time with one asset
            // check amount_per_link_use_action for asset > 0
            // check link_use_action_max_count == 1
            asset_infos.len() == 1
                && asset_infos[0].amount_per_link_use_action > 0 && *link_use_action_max_count == 1
        } else if link.link_type == Some(LinkType::SendAirdrop) {
            // Send airdrop use multiple time with one asset
            // check amount_per_link_use_action for asset > 0
            // check link_use_action_max_count >= 1

            return asset_infos.len() == 1
                && asset_infos[0].amount_per_link_use_action > 0 && *link_use_action_max_count >= 1
        } else if link.link_type == Some(LinkType::SendTokenBasket) {
            // Send token basket use one time with multiple asset
            // check amount_per_link_use_action for asset > 0
            // check link_use_action_max_count == 1
            if !asset_infos.is_empty() {
                for asset in asset_infos.iter() {
                    if asset.amount_per_link_use_action == 0 && *link_use_action_max_count != 1 {
                        return false;
                    }
                }

                return true;
            } else {
                return false;
            }
        } else if link.link_type == Some(LinkType::ReceivePayment) {
            // Receive payment use one time with one asset
            // check amount_per_link_use_action for asset > 0
            // check link_use_action_max_count == 1
            return asset_infos.len() == 1
                && asset_infos[0].amount_per_link_use_action > 0 && *link_use_action_max_count == 1
        } else {
            // link type is not supported
            return false;
        }
    }

    // this method use for withdraw
    // return true if any balance > 0 or gas fee
    // return false if all balance == 0
    pub async fn check_link_asset_left(&self, link: &Link) -> Result<bool, CanisterError> {
        let asset_info = link
            .asset_info
            .clone()
            .ok_or_else(|| CanisterError::HandleLogicError("Asset info not found".to_string()))
            .unwrap();

        if asset_info.is_empty() {
            return Err(CanisterError::HandleLogicError(
                "Asset info not found".to_string(),
            ));
        }

        for asset in asset_info.iter() {
            let token_pid = Principal::from_text(asset.address.as_str()).map_err(|e| {
                CanisterError::HandleLogicError(format!(
                    "Error converting token address to principal: {:?}",
                    e
                ))
            })?;

            let account = Account {
                owner: self.ic_env.id(),
                subaccount: Some(to_subaccount(&link.id.clone())),
            };

            let balance = self
                .icrc_service
                .balance_of(token_pid, account)
                .await?;

            if balance > 0 {
                return Ok(true);
            }
        }

        Ok(false)
    }

    pub fn prefetch_template(
        &self,
        params: &LinkDetailUpdateInput,
    ) -> Result<(Template, LinkType), CanisterError> {
        let template_str = params
            .template
            .clone()
            .ok_or_else(|| CanisterError::ValidationErrors("Template is required".to_string()))?;

        let link_type_str = params
            .link_type
            .clone()
            .ok_or_else(|| CanisterError::ValidationErrors("Link type is required".to_string()))?;

        let template = Template::from_str(template_str.as_str())
            .map_err(|_| CanisterError::ValidationErrors("Invalid template".to_string()))?;

        let link_type = LinkType::from_str(link_type_str.as_str())
            .map_err(|_| CanisterError::ValidationErrors("Invalid link type".to_string()))?;

        Ok((template, link_type))
    }

    pub fn prefetch_params_add_asset(
        &self,
        params: &LinkDetailUpdateInput,
    ) -> Result<(u64, Vec<AssetInfo>), CanisterError> {
        let link_use_action_max_count = params.link_use_action_max_count.ok_or_else(|| {
            CanisterError::ValidationErrors("Link use action max count is required".to_string())
        })?;

        let asset_info_input = params
            .asset_info
            .clone()
            .ok_or_else(|| CanisterError::ValidationErrors("Asset info is required".to_string()))?;

        Ok((
            link_use_action_max_count,
            asset_info_input
                .iter()
                .map(crate::core::link::types::LinkDetailUpdateAssetInfoInput::to_model)
                .collect(),
        ))
    }

    pub fn prefetch_create_action(&self, link: &Link) -> Result<Option<Action>, CanisterError> {
        let link_creation_action: Vec<LinkAction> = self.link_action_repository.get_by_prefix(
            link.id.clone(),
            ActionType::CreateLink.to_string(),
            link.creator.clone(),
        );

        if link_creation_action.is_empty() {
            return Ok(None);
        }

        let create_action = self
            .action_repository
            .get(link_creation_action[0].action_id.clone());

        Ok(create_action)
    }

    pub fn prefetch_withdraw_action(&self, link: &Link) -> Result<Option<Action>, CanisterError> {
        let link_withdraw_action: Vec<LinkAction> = self.link_action_repository.get_by_prefix(
            link.id.clone(),
            ActionType::Withdraw.to_string(),
            link.creator.clone(),
        );

        if link_withdraw_action.is_empty() {
            return Ok(None);
        }

        let withdraw_action = self
            .action_repository
            .get(link_withdraw_action[0].action_id.clone());

        Ok(withdraw_action)
    }

    // this method checking non-whitelist props are changed or not
    // if changed, return true
    // if not changed, return false
    pub fn is_props_changed(
        &self,
        whitelist_props: Vec<String>,
        params: &LinkDetailUpdateInput,
        link: &Link,
    ) -> bool {
        let props_list = ["title".to_string(),
            "description".to_string(),
            "asset_info".to_string(),
            "template".to_string(),
            "link_type".to_string(),
            "link_image_url".to_string(),
            "nft_image".to_string(),
            "link_use_action_max_count".to_string()];

        let check_props = props_list
            .iter()
            .filter(|prop| !whitelist_props.contains(prop))
            .collect::<Vec<_>>();

        for prop in check_props.iter() {
            match prop.as_str() {
                "title" => {
                    if params.title.is_none() {
                        return false;
                    }

                    if params.title != link.title {
                        return true;
                    }
                }
                "description" => {
                    if params.description.is_none() {
                        return false;
                    }

                    if params.description != link.description {
                        return true;
                    }
                }
                "link_image_url" => {
                    if params.link_image_url.is_none() {
                        return false;
                    }

                    if params.link_image_url != link.get_metadata("link_image_url") {
                        return true;
                    }
                }
                "nft_image" => {
                    if params.nft_image.is_none() {
                        return false;
                    }

                    if params.nft_image != link.get_metadata("nft_image") {
                        return true;
                    }
                }
                "link_type" => {
                    let link_link_type_str = link.link_type.as_ref().map(cashier_types::link::v1::LinkType::to_string);

                    if params.link_type.is_none() {
                        return false;
                    }
                    if params.link_type != link_link_type_str {
                        return true;
                    }
                }
                "template" => {
                    let link_template_str = link.template.as_ref().map(cashier_types::link::v1::Template::to_string);
                    if params.template.is_none() {
                        return false;
                    }
                    if params.template != link_template_str {
                        return true;
                    }
                }
                "link_use_action_max_count" => {
                    if params.link_use_action_max_count.is_none() {
                        return false;
                    }

                    if params.link_use_action_max_count.unwrap() != link.link_use_action_max_count {
                        return true;
                    }
                }
                "asset_info" => {
                    match (&link.asset_info, &params.asset_info) {
                        (_, None) => {
                            return false;
                        }
                        (Some(link_asset_info), Some(params_asset_info)) => {
                            // Compare IDs in both lists
                            let link_ids: Vec<_> =
                                link_asset_info.iter().map(|asset| &asset.label).collect();
                            let params_ids: Vec<_> =
                                params_asset_info.iter().map(|asset| &asset.label).collect();

                            // asset info changed
                            if link_ids.len() != params_ids.len()
                                || !link_ids.iter().all(|id| params_ids.contains(id))
                            {
                                return true;
                            }

                            // Compare updated data
                            for param_asset in params_asset_info {
                                if let Some(link_asset) = link_asset_info
                                    .iter()
                                    .find(|asset| asset.label == param_asset.label)
                                {
                                    if param_asset.is_changed(link_asset) {
                                        return true;
                                    }
                                } else {
                                    return true;
                                }
                            }
                        }
                        _ => {}
                    }
                }
                _ => {}
            }
        }

        false
    }

    pub async fn handle_link_state_transition(
        &self,
        link_id: &str,
        action: String,
        params: Option<LinkDetailUpdateInput>,
    ) -> Result<Link, CanisterError> {
        let mut link = self.get_link_by_id(link_id.to_string())?;

        let link_state_goto = LinkStateMachineGoto::from_string(&action)
            .map_err(CanisterError::ValidationErrors)?;

        // if params is None, all params are None
        // some goto not required params like Back
        let params = params.unwrap_or(LinkDetailUpdateInput {
            title: None,
            description: None,
            link_image_url: None,
            nft_image: None,
            asset_info: None,
            template: None,
            link_type: None,
            link_use_action_max_count: None,
        });

        // !Start of link state machine
        // CHOOSE LINK TYPE
        if link.state == LinkState::ChooseLinkType {
            let (template, link_type) = self.prefetch_template(&params)?;

            if self.is_props_changed(
                vec![
                    "title".to_string(),
                    "template".to_string(),
                    "link_type".to_string(),
                ],
                &params,
                &link,
            ) {
                return Err(CanisterError::ValidationErrors(
                    "[ChooseLinkType] Link properties are not allowed to change".to_string(),
                ));
            }

            // ====== Continue Go to =====
            if link_state_goto == LinkStateMachineGoto::Continue {
                link.title = params.title.clone();
                link.template = Some(template);
                link.link_type = Some(link_type);
                link.state = LinkState::AddAssets;
                self.link_repository.update(link.clone());
                Ok(link.clone())

            // ====== Back Go to =====
            } else if link_state_goto == LinkStateMachineGoto::Back {
                link.title = params.title.clone();
                link.template = Some(template);
                link.link_type = Some(link_type);
                self.link_repository.update(link.clone());
                return Ok(link.clone());
            }
            // ====== invalid state =====
            else {
                return Err(CanisterError::ValidationErrors(
                    "State transition failed for ChooseLinkType".to_string(),
                ));
            }
        } else if link.state == LinkState::AddAssets {
            let (link_use_action_max_count, asset_info) =
                self.prefetch_params_add_asset(&params)?;

            if self.is_props_changed(
                vec![
                    "link_use_action_max_count".to_string(),
                    "asset_info".to_string(),
                ],
                &params,
                &link,
            ) {
                return Err(CanisterError::ValidationErrors(
                    "[AddAssets] Link properties are not allowed to change".to_string(),
                ));
            }

            // ====== Continue Go to =====
            if link_state_goto == LinkStateMachineGoto::Continue {
                if !self.link_type_add_asset_validate(
                    &link,
                    &asset_info,
                    &link_use_action_max_count,
                ) {
                    return Err(CanisterError::ValidationErrors(
                        "Link type add asset validate failed".to_string(),
                    ));
                }

                link.asset_info = Some(asset_info);
                link.link_use_action_max_count = link_use_action_max_count;
                link.state = LinkState::Preview;
                self.link_repository.update(link.clone());
                return Ok(link.clone());
            }
            // ===== Back Go to =====
            else if link_state_goto == LinkStateMachineGoto::Back {
                link.state = LinkState::ChooseLinkType;
                link.asset_info = Some(asset_info);
                link.link_use_action_max_count = link_use_action_max_count;
                self.link_repository.update(link.clone());
                return Ok(link.clone());
            }
            // ===== invalid state =====
            else {
                return Err(CanisterError::ValidationErrors(
                    "State transition failed for AddAssets".to_string(),
                ));
            }
        } else if link.state == LinkState::Preview {
            if self.is_props_changed(vec![], &params, &link) {
                return Err(CanisterError::ValidationErrors(
                    "[Preview] Link properties are not allowed to change".to_string(),
                ));
            }

            // ===== Continue Go to =====
            if link_state_goto == LinkStateMachineGoto::Continue {
                link.state = LinkState::CreateLink;
                self.link_repository.update(link.clone());
                return Ok(link.clone());
            }
            // ===== Back Go to =====
            else if link_state_goto == LinkStateMachineGoto::Back {
                link.state = LinkState::AddAssets;
                self.link_repository.update(link.clone());
                return Ok(link.clone());
            }
            // ===== invalid state =====
            else {
                return Err(CanisterError::ValidationErrors(
                    "State transition failed for Preview".to_string(),
                ));
            }
        } else if link.state == LinkState::CreateLink {
            let create_action = self.prefetch_create_action(&link)?;

            // ===== Continue Go to =====
            if link_state_goto == LinkStateMachineGoto::Continue {
                if create_action.is_none() {
                    return Err(CanisterError::ValidationErrors(
                        "Create action not found".to_string(),
                    ));
                } else if create_action.as_ref().unwrap().state != ActionState::Success {
                    return Err(CanisterError::ValidationErrors(
                        format!(
                            "Create action not success, current state: {:?}",
                            create_action.as_ref().unwrap().state
                        )
                        ,
                    ));
                } else {
                    link.state = LinkState::Active;
                    self.link_repository.update(link.clone());
                    return Ok(link.clone());
                }
            }
            // ===== invalid state =====
            else {
                return Err(CanisterError::ValidationErrors(
                    "State transition failed for CreateLink".to_string(),
                ));
            }
        } else if link.state == LinkState::Active {
            if self.is_props_changed(vec![], &params, &link) {
                return Err(CanisterError::ValidationErrors(
                    "[Active] Link properties are not allowed to change".to_string(),
                ));
            }

            if link_state_goto == LinkStateMachineGoto::Continue {
                if self.check_link_asset_left(&link).await? {
                    link.state = LinkState::Inactive;
                } else {
                    link.state = LinkState::InactiveEnded;
                }
                self.link_repository.update(link.clone());
                return Ok(link.clone());
            } else {
                return Err(CanisterError::ValidationErrors(
                    "State transition failed for Active".to_string(),
                ));
            }
        } else if link.state == LinkState::Inactive {
            if self.is_props_changed(vec![], &params, &link) {
                return Err(CanisterError::ValidationErrors(
                    "[Inactive] Link properties are not allowed to change".to_string(),
                ));
            }

            let withdraw_action = self.prefetch_withdraw_action(&link)?;
            if link_state_goto == LinkStateMachineGoto::Continue {
                if !self.check_link_asset_left(&link).await? {
                    if let Some(action) = withdraw_action {
                        if action.state == ActionState::Success {
                            link.state = LinkState::InactiveEnded;
                            self.link_repository.update(link.clone());
                            return Ok(link.clone());
                        } else {
                            error!("withdraw_action not success {:#?}", action);
                            return Err(CanisterError::ValidationErrors(
                                "Withdraw action not success".to_string(),
                            ));
                        }
                    } else {
                        error!("withdraw_action is None");
                        return Err(CanisterError::ValidationErrors(
                            "Withdraw action not found".to_string(),
                        ));
                    }
                } else {
                    return Err(CanisterError::ValidationErrors(
                        "Link still has assets left".to_string(),
                    ));
                }
            } else {
                return Err(CanisterError::ValidationErrors(
                    "State transition failed for Inactive".to_string(),
                ));
            }
        } else if link.state == LinkState::InactiveEnded {
            return Err(CanisterError::ValidationErrors("Link is ended".to_string()));
        } else {
            return Err(CanisterError::ValidationErrors("Invalid state".to_string()));
        }
        // !End of link state machine
    }

    /// Create a new link
    pub fn create_new(
        &self,
        caller: String,
        input: crate::core::link::types::CreateLinkInput,
    ) -> Result<String, String> {
        let user_wallet = self
            .user_wallet_repository
            .get(&caller)
            .ok_or_else(|| "User not found".to_string())?;

        let user_id = user_wallet.user_id;

        let ts = self.ic_env.time();
        let id = Uuid::new_v4();
        let link_id_str = id.to_string();

        let link_type = LinkType::from_str(input.link_type.as_str())
            .map_err(|_| "Invalid link type".to_string())?;

        let new_link = Link {
            id: link_id_str.clone(),
            state: LinkState::ChooseLinkType,
            title: None,
            description: None,
            link_type: Some(link_type),
            asset_info: None,
            template: Some(Template::Central),
            creator: user_id.clone(),
            create_at: ts,
            metadata: None,
            link_use_action_counter: 0,
            link_use_action_max_count: 0,
        };
        let new_user_link = UserLink {
            user_id,
            link_id: link_id_str.clone(),
        };

        self.link_repository.create(new_link);
        self.user_link_repository.create(new_user_link);

        Ok(link_id_str)
    }

    pub async fn create_new_v2(
        &self,
        caller: String,
        input: CreateLinkInputV2,
    ) -> Result<Link, CanisterError> {
        let user_wallet = self
            .user_wallet_repository
            .get(&caller)
            .ok_or_else(|| "User not found".to_string())?;

        let user_id = user_wallet.user_id;

        let ts = self.ic_env.time();
        let id = Uuid::new_v4();
        let link_id_str = id.to_string();

        let link_type = LinkType::from_str(input.link_type.as_str())
            .map_err(|_| "Invalid link type".to_string())?;

        let new_link = Link {
            id: link_id_str.clone(),
            state: LinkState::ChooseLinkType,
            title: None,
            description: None,
            link_type: Some(link_type),
            asset_info: None,
            template: Some(Template::Central),
            creator: user_id.clone(),
            create_at: ts,
            metadata: None,
            link_use_action_counter: 0,
            link_use_action_max_count: 0,
        };
        let new_user_link = UserLink {
            user_id: user_id.clone(),
            link_id: link_id_str.clone(),
        };

        // Create the initial link and user_link records
        self.link_repository.create(new_link);
        self.user_link_repository.create(new_user_link.clone());

        // First transition: ChooseLinkType -> AddAssets
        // For this transition, we only need title, template, and link_type
        let choose_link_type_params = LinkDetailUpdateInput {
            title: Some(input.title.clone()),
            template: Some(input.template.clone()),
            link_type: Some(input.link_type.clone()),
            description: None,
            link_image_url: None,
            nft_image: None,
            asset_info: None,
            link_use_action_max_count: None,
        };

        let result = self
            .handle_link_state_transition(
                &link_id_str,
                "Continue".to_string(),
                Some(choose_link_type_params),
            )
            .await;

        if result.is_err() {
            // Clean up on failure
            self.link_repository.delete(&link_id_str);
            self.user_link_repository.delete(new_user_link);
            return Err(CanisterError::HandleLogicError(format!(
                "Create link failed: transition from ChooseLinkType to AddAssets{}",
                result.err().unwrap()
            )));
        }

        // Second transition: AddAssets -> Preview
        // For this transition, we only need asset_info and link_use_action_max_count
        let add_assets_params = LinkDetailUpdateInput {
            title: None,
            template: None,
            link_type: None,
            description: input.description.clone(),
            link_image_url: input.link_image_url.clone(),
            nft_image: input.nft_image.clone(),
            asset_info: Some(input.asset_info.clone()),
            link_use_action_max_count: Some(input.link_use_action_max_count),
        };

        let result = self
            .handle_link_state_transition(
                &link_id_str,
                "Continue".to_string(),
                Some(add_assets_params),
            )
            .await;

        if result.is_err() {
            // Clean up on failure
            self.link_repository.delete(&link_id_str);
            self.user_link_repository.delete(new_user_link);
            return Err(CanisterError::HandleLogicError(format!(
                "Create link failed: transition from AddAssets to Preview: {}",
                result.err().unwrap()
            )));
        }

        // Second transition: Preview -> CreateLink
        let add_assets_params = LinkDetailUpdateInput {
            title: None,
            template: None,
            link_type: None,
            description: None,
            link_image_url: None,
            nft_image: None,
            asset_info: None,
            link_use_action_max_count: None,
        };

        let result = self
            .handle_link_state_transition(
                &link_id_str,
                "Continue".to_string(),
                Some(add_assets_params),
            )
            .await;

        if result.is_err() {
            // Clean up on failure
            self.link_repository.delete(&link_id_str);
            self.user_link_repository.delete(new_user_link);
            return Err(CanisterError::HandleLogicError(format!(
                "Create link failed: transition from Preview to CreateLink: {}",
                result.err().unwrap()
            )));
        }

        // Successfully reached CreateLink state
        result
    }

    /// Get links by principal
    pub fn get_links_by_principal(
        &self,
        principal: String,
        pagination: PaginateInput,
    ) -> Result<PaginateResult<Link>, String> {
        let user_wallet = self
            .user_wallet_repository
            .get(&principal)
            .ok_or_else(|| "User not found".to_string())?;

        let user_id = user_wallet.user_id;

        let links = match self.get_links_by_user_id(user_id, pagination) {
            Ok(link_users) => link_users,
            Err(e) => return Err(e),
        };

        Ok(links)
    }

    /// Get links by user ID
    pub fn get_links_by_user_id(
        &self,
        user_id: String,
        pagination: PaginateInput,
    ) -> Result<PaginateResult<Link>, String> {
        let user_links = self
            .user_link_repository
            .get_links_by_user_id(user_id, pagination);

        let link_ids = user_links
            .data
            .iter()
            .map(|link_user| link_user.link_id.clone())
            .collect();

        let links = self.link_repository.get_batch(link_ids);

        let res = PaginateResult::new(links, user_links.metadata);
        Ok(res)
    }

    /// Get link action
    pub fn get_link_action(
        &self,
        link_id: String,
        action_type: String,
        user_id: String,
    ) -> Option<Action> {
        let link_actions = self
            .link_action_repository
            .get_by_prefix(link_id, action_type, user_id);

        if link_actions.is_empty() {
            return None;
        }

        let action_id = link_actions.first().unwrap().action_id.clone();
        self.action_repository.get(action_id)
    }

    /// Check if caller is the creator of a link
    pub fn is_link_creator(&self, caller: String, link_id: &String) -> bool {
        let user_wallet = match self.user_wallet_repository.get(&caller) {
            Some(u) => u,
            None => {
                warn!("User not found");
                return false;
            }
        };

        match self.link_repository.get(link_id) {
            None => false,
            Some(link_detail) => link_detail.creator == user_wallet.user_id,
        }
    }

    /// Check if link exists
    pub fn is_link_exist(&self, link_id: String) -> bool {
        self.link_repository.get(&link_id).is_some()
    }

    pub fn link_handle_tx_update(
        &self,
        previous_state: ActionState,
        current_state: ActionState,
        link_id: String,
        action_type: ActionType,
        action_id: String,
    ) -> Result<(), CanisterError> {
        // Return early if state hasn't changed
        if previous_state == current_state {
            return Ok(());
        }

        // Return early if this isn't a claim/use action or if it's not a successful state
        if (action_type != ActionType::Use) || current_state != ActionState::Success {
            return Ok(());
        }

        // At this point we know:
        // 1. The state has changed
        // 2. The action type is either Claim or Use
        // 3. The current state is Success

        // Update link properties
        let result = self.update_link_use_counter(link_id.clone(), action_id.clone());
        if let Err(err) = result {
            error!(
                "[link_handle_tx_update] Failed to update link properties for link_id: {:?}, action_id: {:?}, error: {:?}",
                link_id, action_id, err
            );

            return Err(CanisterError::HandleLogicError(format!(
                "Failed to update link properties: {}",
                err
            )));
        }

        Ok(())
    }
}
