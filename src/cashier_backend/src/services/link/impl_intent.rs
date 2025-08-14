use candid::{Nat, Principal};
use cashier_backend_types::constant::{
    INTENT_LABEL_LINK_CREATION_FEE, INTENT_LABEL_RECEIVE_PAYMENT_ASSET,
    INTENT_LABEL_SEND_AIRDROP_ASSET, INTENT_LABEL_SEND_TIP_ASSET,
    INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
};
use cashier_backend_types::error::CanisterError;
use icrc_ledger_types::icrc1::account::Account;
use log::error;
use std::collections::HashMap;
use std::str::FromStr;
use uuid::Uuid;

use crate::constant::{FEE_TREASURY_ADDRESS, ICP_CANISTER_ID};
use crate::domains::fee::Fee;
use crate::services::link::service::LinkService;
use crate::services::link::traits::IntentAssembler;
use crate::utils::helper::{convert_nat_to_u64, to_subaccount};
use crate::utils::runtime::IcEnvironment;

use cashier_backend_types::repository::{
    action::v1::ActionType,
    common::{Asset, Chain, Wallet},
    intent::v2::{Intent, IntentState, IntentTask, IntentType},
    link::v1::{Link, LinkType},
};

impl<E: IcEnvironment + Clone> IntentAssembler for LinkService<E> {
    async fn assemble_intents(
        &self,
        link_id: &str,
        action_type: &ActionType,
        user_wallet: &Principal,
        fee_map: &HashMap<String, Nat>,
    ) -> Result<Vec<Intent>, CanisterError> {
        let link = self.get_link_by_id(link_id)?;

        let temp_intents = self.look_up_intent(&link, action_type)?;

        let mut intents = temp_intents.ok_or_else(|| {
            CanisterError::HandleLogicError(
                "Not found intents config for {link_type}_{action_type}".to_string(),
            )
        })?;

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
                    "[link_assemble_intents] find label for TransferWalletToLink not found {:?}",
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
                            subaccount: Some(to_subaccount(&link.id)?),
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
                            owner: Principal::from_str(FEE_TREASURY_ADDRESS).map_err(|e| {
                                CanisterError::HandleLogicError(format!(
                                    "Error converting fee treasury address to principal: {e:?}"
                                ))
                            })?,
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
                            subaccount: Some(to_subaccount(&link.id)?),
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
                            subaccount: Some(to_subaccount(&link.id)?),
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
                            Principal::from_text(asset_info.address.clone()).map_err(|e| {
                                CanisterError::HandleLogicError(format!(
                                    "Error converting token address to principal: {e:?}"
                                ))
                            })?,
                            Account {
                                owner: self.ic_env.id(),
                                subaccount: Some(to_subaccount(&link.id)?),
                            },
                        )
                        .await?;

                    let fee_in_nat = fee_map.get(&asset_info.address).ok_or_else(|| {
                        CanisterError::HandleLogicError(
                            "Fee not found for link creation".to_string(),
                        )
                    })?;
                    let fee_amount = convert_nat_to_u64(fee_in_nat)?;

                    if link_balance == 0u64 {
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
                            subaccount: Some(to_subaccount(&link.id)?),
                        }
                        .to_string(),
                        chain: Chain::IC,
                    };
                    let to_wallet = Wallet {
                        address: user_wallet.to_string(),
                        chain: Chain::IC,
                    };

                    let amount_64 = convert_nat_to_u64(&amount)?;

                    (amount_64, None, None, asset, from_wallet, to_wallet, None)
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
                    let mut transfer_from_data =
                        intent.r#type.as_transfer_from().ok_or_else(|| {
                            CanisterError::HandleLogicError(
                                "TransferFrom data not found".to_string(),
                            )
                        })?;
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
                    let mut transfer_data = intent.r#type.as_transfer().ok_or_else(|| {
                        CanisterError::HandleLogicError("Transfer data not found".to_string())
                    })?;
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
    ///
    /// # Returns
    /// * `Ok(Vec<Asset>)` - List of unique assets required for the action
    /// * `Err(CanisterError)` - Error if link not found or invalid configuration
    fn get_assets_for_action(
        &self,
        link_id: &str,
        action_type: &ActionType,
    ) -> Result<Vec<Asset>, CanisterError> {
        let link = self.get_link_by_id(link_id)?;
        let temp_intents = self.look_up_intent(&link, action_type)?;

        let intents = temp_intents.ok_or_else(|| {
            CanisterError::HandleLogicError(
                "Not found intents config for {link_type}_{action_type}".to_string(),
            )
        })?;

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
}

// --- helper method implementations ---
impl<E: IcEnvironment + Clone> LinkService<E> {
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

    fn look_up_intent(
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
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::link::test_fixtures::*;
    use crate::utils::test_utils::{random_id_string, runtime::MockIcEnvironment};
    use cashier_backend_types::repository::{
        asset_info::AssetInfo,
        link::v1::{Link, LinkState, LinkType},
    };

    #[test]
    fn it_should_create_basic_intent() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let intent =
            service.create_basic_intent(IntentTask::TransferWalletToLink, "Test Label".to_string());
        assert_eq!(intent.task, IntentTask::TransferWalletToLink);
        assert_eq!(intent.label, "Test Label");
    }

    #[test]
    fn it_should_create_fee_intent() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let intent = service.create_fee_intent();
        assert_eq!(intent.task, IntentTask::TransferWalletToTreasury);
        assert_eq!(intent.label, INTENT_LABEL_LINK_CREATION_FEE);
        assert!(intent.r#type.as_transfer_from().is_some());
    }

    #[test]
    fn it_should_error_not_found_look_up_intent() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let link_id = random_id_string();
        let action_type = ActionType::Use;

        let result = service.look_up_intent(
            &Link {
                id: link_id,
                state: LinkState::ChooseLinkType,
                title: None,
                description: None,
                link_type: None,
                asset_info: None,
                template: None,
                creator: "creator".to_string(),
                create_at: 0,
                metadata: None,
                link_use_action_counter: 0,
                link_use_action_max_count: 10,
            },
            &action_type,
        );

        assert!(result.is_err());

        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert!(msg.contains("link type not found"));
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[test]
    fn it_should_return_empty_look_up_intent() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let link = create_link_feature(&service, PRINCIPAL_ID1);
        let action_type = ActionType::Claim;

        let intents = service.look_up_intent(&link, &action_type).unwrap();
        assert!(intents.is_none());
    }

    #[test]
    fn it_should_look_up_intent_for_create_link_send_tip() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = PRINCIPAL_ID1;
        let link = create_link_feature(&service, creator_id);
        let action_type = ActionType::CreateLink;

        let intents = service.look_up_intent(&link, &action_type).unwrap();
        assert!(intents.is_some());
        let intents = intents.unwrap();
        assert_eq!(intents.len(), 2); // One for asset transfer, one for fee transfer
        assert_eq!(intents[0].task, IntentTask::TransferWalletToLink);
        assert_eq!(intents[1].task, IntentTask::TransferWalletToTreasury);
    }

    #[test]
    fn it_should_look_up_intent_for_use_link_send_tip() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = PRINCIPAL_ID1;
        let link = create_link_feature(&service, creator_id);
        let action_type = ActionType::Use;

        let intents = service.look_up_intent(&link, &action_type).unwrap();
        assert!(intents.is_some());
        let intents = intents.unwrap();
        assert_eq!(intents.len(), 1); // One for asset transfer
        assert_eq!(intents[0].task, IntentTask::TransferLinkToWallet);
    }

    #[test]
    fn it_should_look_up_intent_for_withdraw_link_send_tip() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = PRINCIPAL_ID1;
        let link = create_link_feature(&service, creator_id);
        let action_type = ActionType::Withdraw;

        let intents = service.look_up_intent(&link, &action_type).unwrap();
        assert!(intents.is_some());
        let intents = intents.unwrap();
        assert_eq!(intents.len(), 1); // One for asset transfer
        assert_eq!(intents[0].task, IntentTask::TransferLinkToWallet);
    }

    #[test]
    fn it_should_look_up_intent_for_create_link_send_airdrop() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = PRINCIPAL_ID1;
        let link = create_link_feature(&service, creator_id);

        let updated_link = Link {
            link_type: Some(LinkType::SendAirdrop),
            ..link
        };
        service.link_repository.update(updated_link.clone());
        let action_type = ActionType::CreateLink;

        let intents = service.look_up_intent(&updated_link, &action_type).unwrap();
        assert!(intents.is_some());
        let intents = intents.unwrap();
        assert_eq!(intents.len(), 2); // One for asset transfer, one for fee transfer
        assert_eq!(intents[0].task, IntentTask::TransferWalletToLink);
        assert_eq!(intents[1].task, IntentTask::TransferWalletToTreasury);
    }

    #[test]
    fn it_should_look_up_intent_for_use_link_send_airdrop() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = PRINCIPAL_ID1;
        let link = create_link_feature(&service, creator_id);
        let updated_link = Link {
            link_type: Some(LinkType::SendAirdrop),
            ..link
        };
        service.link_repository.update(updated_link.clone());

        let action_type = ActionType::Use;

        let intents = service.look_up_intent(&updated_link, &action_type).unwrap();
        assert!(intents.is_some());
        let intents = intents.unwrap();
        assert_eq!(intents.len(), 1); // One for asset transfer
        assert_eq!(intents[0].task, IntentTask::TransferLinkToWallet);
    }

    #[test]
    fn it_should_look_up_intent_for_withdraw_link_send_airdrop() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = PRINCIPAL_ID1;
        let link = create_link_feature(&service, creator_id);
        let updated_link = Link {
            link_type: Some(LinkType::SendAirdrop),
            ..link
        };
        service.link_repository.update(updated_link.clone());

        let action_type = ActionType::Withdraw;

        let intents = service.look_up_intent(&updated_link, &action_type).unwrap();
        assert!(intents.is_some());
        let intents = intents.unwrap();
        assert_eq!(intents.len(), 1); // One for asset transfer
        assert_eq!(intents[0].task, IntentTask::TransferLinkToWallet);
    }

    #[test]
    fn it_should_error_on_look_up_intent_for_create_link_send_token_basket_with_empty_link_assets()
    {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = PRINCIPAL_ID1;
        let link = create_link_feature(&service, creator_id);

        let updated_link = Link {
            link_type: Some(LinkType::SendTokenBasket),
            ..link
        };
        service.link_repository.update(updated_link.clone());
        let action_type = ActionType::CreateLink;

        let result = service.look_up_intent(&updated_link, &action_type);
        assert!(result.is_err());

        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert!(msg.contains("Asset info not found"));
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[test]
    fn it_should_error_look_up_intent_for_create_link_send_token_basket_with_invalid_asset_info_label()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = PRINCIPAL_ID1;
        let link = create_link_feature(&service, creator_id);

        let updated_link = Link {
            link_type: Some(LinkType::SendTokenBasket),
            asset_info: Some(vec![AssetInfo {
                address: "some_address".to_string(),
                chain: Chain::IC,
                amount_per_link_use_action: 100,
                label: "invalid_label".to_string(), // Invalid label
            }]),
            ..link
        };
        service.link_repository.update(updated_link.clone());
        let action_type = ActionType::CreateLink;

        let result = service.look_up_intent(&updated_link, &action_type);
        assert!(result.is_err());

        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert!(msg.contains("Asset label not match"));
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[test]
    fn it_should_look_up_intent_for_create_link_send_token_basket() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = PRINCIPAL_ID1;
        let link = create_link_feature(&service, creator_id);

        let updated_link = Link {
            link_type: Some(LinkType::SendTokenBasket),
            asset_info: Some(vec![AssetInfo {
                address: "some_address".to_string(),
                chain: Chain::IC,
                amount_per_link_use_action: 100,
                label: format!(
                    "{}_{}",
                    INTENT_LABEL_SEND_TOKEN_BASKET_ASSET, "some_address"
                ),
            }]),
            ..link
        };
        service.link_repository.update(updated_link.clone());
        let action_type = ActionType::CreateLink;

        let intents = service.look_up_intent(&updated_link, &action_type).unwrap();
        assert!(intents.is_some());
        let intents = intents.unwrap();
        assert_eq!(intents.len(), 2); // One for asset transfer, one for fee transfer
        assert_eq!(intents[0].task, IntentTask::TransferWalletToLink);
        assert_eq!(intents[1].task, IntentTask::TransferWalletToTreasury);
    }

    #[test]
    fn it_should_error_on_look_up_intent_for_use_link_send_token_basket_with_empty_link_assets_info()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = PRINCIPAL_ID1;
        let link = create_link_feature(&service, creator_id);

        let updated_link = Link {
            link_type: Some(LinkType::SendTokenBasket),
            ..link
        };
        service.link_repository.update(updated_link.clone());
        let action_type = ActionType::Use;

        let result = service.look_up_intent(&updated_link, &action_type);
        assert!(result.is_err());

        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert!(msg.contains("Asset info not found"));
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[test]
    fn it_should_look_up_intent_for_use_link_send_token_basket() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = PRINCIPAL_ID1;
        let link = create_link_feature(&service, creator_id);

        let updated_link = Link {
            link_type: Some(LinkType::SendTokenBasket),
            asset_info: Some(vec![AssetInfo {
                address: "some_address".to_string(),
                chain: Chain::IC,
                amount_per_link_use_action: 100,
                label: format!(
                    "{}_{}",
                    INTENT_LABEL_SEND_TOKEN_BASKET_ASSET, "some_address"
                ),
            }]),
            ..link
        };
        service.link_repository.update(updated_link.clone());
        let action_type = ActionType::Use;

        let intents = service.look_up_intent(&updated_link, &action_type).unwrap();
        assert!(intents.is_some());
        let intents = intents.unwrap();
        assert_eq!(intents.len(), 1); // One for asset transfer
        assert_eq!(intents[0].task, IntentTask::TransferLinkToWallet);
    }

    #[test]
    fn it_should_error_on_look_up_intent_for_withdraw_link_send_token_basket_with_empty_link_assets_info()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = PRINCIPAL_ID1;
        let link = create_link_feature(&service, creator_id);

        let updated_link = Link {
            link_type: Some(LinkType::SendTokenBasket),
            ..link
        };
        service.link_repository.update(updated_link.clone());
        let action_type = ActionType::Withdraw;

        let result = service.look_up_intent(&updated_link, &action_type);
        assert!(result.is_err());

        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert!(msg.contains("Asset info not found"));
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[test]
    fn it_should_look_up_intent_for_withdraw_link_send_token_basket() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = PRINCIPAL_ID1;
        let link = create_link_feature(&service, creator_id);

        let updated_link = Link {
            link_type: Some(LinkType::SendTokenBasket),
            asset_info: Some(vec![AssetInfo {
                address: "some_address".to_string(),
                chain: Chain::IC,
                amount_per_link_use_action: 100,
                label: format!(
                    "{}_{}",
                    INTENT_LABEL_SEND_TOKEN_BASKET_ASSET, "some_address"
                ),
            }]),
            ..link
        };
        service.link_repository.update(updated_link.clone());
        let action_type = ActionType::Withdraw;

        let intents = service.look_up_intent(&updated_link, &action_type).unwrap();
        assert!(intents.is_some());
        let intents = intents.unwrap();
        assert_eq!(intents.len(), 1); // One for asset transfer
        assert_eq!(intents[0].task, IntentTask::TransferLinkToWallet);
    }

    #[test]
    fn it_should_look_up_intent_for_create_link_receive_payment() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = PRINCIPAL_ID1;
        let link = create_link_feature(&service, creator_id);

        let updated_link = Link {
            link_type: Some(LinkType::ReceivePayment),
            ..link
        };
        service.link_repository.update(updated_link.clone());
        let action_type = ActionType::CreateLink;

        let intents = service.look_up_intent(&updated_link, &action_type).unwrap();
        assert!(intents.is_some());
        let intents = intents.unwrap();
        assert_eq!(intents.len(), 1); // One for fee transfer
        assert_eq!(intents[0].task, IntentTask::TransferWalletToTreasury);
    }

    #[test]
    fn it_should_look_up_intent_for_use_link_receive_payment() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = PRINCIPAL_ID1;
        let link = create_link_feature(&service, creator_id);

        let updated_link = Link {
            link_type: Some(LinkType::ReceivePayment),
            ..link
        };
        service.link_repository.update(updated_link.clone());
        let action_type = ActionType::Use;

        let intents = service.look_up_intent(&updated_link, &action_type).unwrap();
        assert!(intents.is_some());
        let intents = intents.unwrap();
        assert_eq!(intents.len(), 1); // One for asset transfer to link
        assert_eq!(intents[0].task, IntentTask::TransferWalletToLink);
    }

    #[test]
    fn it_should_look_up_intent_for_withdraw_link_receive_payment() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = PRINCIPAL_ID1;
        let link = create_link_feature(&service, creator_id);

        let updated_link = Link {
            link_type: Some(LinkType::ReceivePayment),
            ..link
        };
        service.link_repository.update(updated_link.clone());
        let action_type = ActionType::Withdraw;

        let intents = service.look_up_intent(&updated_link, &action_type).unwrap();
        assert!(intents.is_some());
        let intents = intents.unwrap();
        assert_eq!(intents.len(), 1); // One for asset transfer from link to wallet
        assert_eq!(intents[0].task, IntentTask::TransferLinkToWallet);
    }

    #[test]
    fn it_should_error_on_get_assets_for_action_with_invalid_link_id() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let link_id = random_id_string();
        let action_type = ActionType::Use;

        let result = service.get_assets_for_action(&link_id, &action_type);
        assert!(result.is_err());

        if let Err(CanisterError::NotFound(msg)) = result {
            assert!(msg.contains("link not found"));
        } else {
            panic!("Expected NotFound error");
        }
    }

    #[test]
    fn it_should_error_on_get_assets_for_action_with_empty_link_type() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let link = create_link_feature(&service, PRINCIPAL_ID1);
        let link = Link {
            link_type: None,
            ..link
        };
        service.link_repository.update(link.clone());

        let result = service.get_assets_for_action(&link.id, &ActionType::Use);
        assert!(result.is_err());

        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert!(msg.contains("link type not found"));
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[test]
    fn it_should_error_on_get_assets_for_action_with_empty_intents() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let link = create_link_feature(&service, PRINCIPAL_ID1);

        let result = service.get_assets_for_action(&link.id, &ActionType::Claim);
        assert!(result.is_err());

        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert!(msg.contains("Not found intents config"));
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[test]
    fn it_should_error_get_assets_for_action_with_intent_task_transfer_wallet_to_link_and_unmatched_link_assets_info_label()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let link = create_link_feature(&service, PRINCIPAL_ID1);

        let result = service.get_assets_for_action(&link.id, &ActionType::CreateLink);
        assert!(result.is_err());

        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert!(msg.contains("TransferWalletToLink Asset not found for label"));
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[test]
    fn it_should_get_assets_for_action_with_intent_task_transfer_wallet_to_link() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let link = create_link_feature(&service, PRINCIPAL_ID1);

        let asset_address = random_id_string();
        let updated_link = Link {
            asset_info: Some(vec![AssetInfo {
                address: asset_address.clone(),
                chain: Chain::IC,
                amount_per_link_use_action: 100,
                label: INTENT_LABEL_SEND_TIP_ASSET.to_string(),
            }]),
            ..link
        };
        service.link_repository.update(updated_link.clone());

        let assets = service
            .get_assets_for_action(&updated_link.id, &ActionType::CreateLink)
            .unwrap();
        assert_eq!(assets.len(), 2);
        let asset_addresses = assets.iter().map(|a| a.address.clone()).collect::<Vec<_>>();
        assert!(asset_addresses.contains(&asset_address));
        assert!(asset_addresses.contains(&ICP_CANISTER_ID.to_string()));
    }

    #[test]
    fn it_should_get_assets_for_action_with_intent_task_transfer_wallet_to_treasury() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let link = create_link_feature(&service, PRINCIPAL_ID1);
        let asset_address = random_id_string();
        let updated_link = Link {
            asset_info: Some(vec![AssetInfo {
                address: asset_address.clone(),
                chain: Chain::IC,
                amount_per_link_use_action: 100,
                label: INTENT_LABEL_SEND_TIP_ASSET.to_string(),
            }]),
            ..link
        };
        service.link_repository.update(updated_link.clone());

        let assets = service
            .get_assets_for_action(&updated_link.id, &ActionType::CreateLink)
            .unwrap();
        assert_eq!(assets.len(), 2);
        let asset_addresses = assets.iter().map(|a| a.address.clone()).collect::<Vec<_>>();
        assert!(asset_addresses.contains(&asset_address));
        assert!(asset_addresses.contains(&ICP_CANISTER_ID.to_string()));
    }

    #[test]
    fn it_should_error_get_assets_for_action_with_intent_task_transfer_link_to_wallet_and_link_assets_info_empty()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let link = create_link_feature(&service, PRINCIPAL_ID1);

        let result = service.get_assets_for_action(&link.id, &ActionType::Use);
        assert!(result.is_err());

        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert!(msg.contains("TransferLinkToWallet Asset not found"));
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[test]
    fn it_should_get_assets_for_action_with_intent_task_transfer_link_to_wallet() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let link = create_link_feature(&service, PRINCIPAL_ID1);

        let asset_address = random_id_string();
        let updated_link = Link {
            asset_info: Some(vec![AssetInfo {
                address: asset_address.clone(),
                chain: Chain::IC,
                amount_per_link_use_action: 100,
                label: INTENT_LABEL_SEND_TIP_ASSET.to_string(),
            }]),
            ..link
        };
        service.link_repository.update(updated_link.clone());

        let assets = service
            .get_assets_for_action(&updated_link.id, &ActionType::Use)
            .unwrap();
        assert_eq!(assets.len(), 1);
        assert_eq!(assets[0].address, asset_address);
        assert_eq!(assets[0].chain, Chain::IC);
    }
}
