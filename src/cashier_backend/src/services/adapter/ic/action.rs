// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use candid::Nat;
use cashier_types::{
    intent::v2::{Intent, IntentState, IntentTask, IntentType, TransferData, TransferFromData},
    ActionType, Asset, Chain, LinkType, Wallet,
};
use icrc_ledger_types::icrc1::account::Account;
use uuid::Uuid;

use crate::{
    constant::ICP_CANISTER_ID,
    domains::fee::Fee,
    services::adapter::{ActionAdapter, ActionToIntentInput},
    utils::{helper::to_subaccount, runtime::IcEnvironment},
};

#[cfg_attr(test, faux::create)]
#[derive(Clone)]
pub struct IcActionAdapter<E: IcEnvironment + Clone> {
    pub ic_env: E,
}

#[cfg_attr(test, faux::methods)]
impl<E: IcEnvironment + Clone> IcActionAdapter<E> {
    pub fn new() -> Self {
        Self { ic_env: E::new() }
    }

    fn build_create_link_fee_intent(&self) -> Result<Vec<Intent>, String> {
        let fee_asset = Asset {
            address: ICP_CANISTER_ID.to_string(),
            chain: Chain::IC,
        };
        let fee_amount = Fee::CreateTipLinkFeeIcp.as_u64();

        let ts = self.ic_env.time();

        let caller_account = Account {
            owner: self.ic_env.caller(),
            subaccount: None,
        };

        let spender_wallet = Wallet {
            address: Account {
                owner: self.ic_env.id(),
                subaccount: None,
            }
            .to_string(),
            chain: Chain::IC,
        };

        let vault_wallet = Wallet {
            address: Account {
                // TODO: change to treasury account
                owner: self.ic_env.id(),
                subaccount: None,
            }
            .to_string(),
            chain: Chain::IC,
        };

        let approve_wallet = Wallet {
            address: caller_account.to_string(),
            chain: Chain::IC,
        };

        let intent = Intent {
            id: Uuid::new_v4().to_string(),
            r#type: IntentType::TransferFrom(TransferFromData {
                from: approve_wallet,
                to: vault_wallet,
                spender: spender_wallet,
                asset: fee_asset,
                amount: Nat::from(fee_amount),
                actual_amount: None,
                approve_amount: None,
            }),
            state: IntentState::Created,
            created_at: ts,
            task: IntentTask::TransferWalletToTreasury,
            dependency: vec![],
            chain: Chain::IC,
            label: "1001".to_string(),
        };

        return Ok(vec![intent]);
    }

    fn build_create_link_intent(&self, input: ActionToIntentInput) -> Result<Vec<Intent>, String> {
        let first_asset = input
            .link
            .asset_info
            .as_ref()
            .and_then(|assets| assets.iter().next())
            .ok_or("Asset not found".to_string())?;

        let asset = Asset {
            address: first_asset.address.clone(),
            chain: first_asset.chain.clone(),
        };

        let total_amount =
            first_asset.amount_per_link_use_action * input.link.link_use_action_max_count;

        let ts = self.ic_env.time();

        let id = Uuid::new_v4();

        let deposit_account = Account {
            owner: self.ic_env.id(),
            subaccount: Some(to_subaccount(&input.link.id.clone())),
        };

        let deposit_wallet = Wallet {
            address: deposit_account.to_string(),
            chain: Chain::IC,
        };

        let caller_account = Account {
            owner: self.ic_env.caller(),
            subaccount: None,
        };

        let deposit_from_wallet = Wallet {
            address: caller_account.to_string(),
            chain: Chain::IC,
        };

        let intent = Intent {
            id: id.to_string(),
            r#type: IntentType::Transfer(TransferData {
                from: deposit_from_wallet,
                to: deposit_wallet,
                asset,
                // tip link full amount of the first asset
                amount: Nat::from(total_amount),
            }),
            state: IntentState::Created,
            created_at: ts,
            task: IntentTask::TransferWalletToLink,
            dependency: vec![],
            chain: Chain::IC,
            label: "1002".to_string(),
        };

        return Ok(vec![intent]);
    }
}

impl<E: IcEnvironment + Clone> ActionAdapter for IcActionAdapter<E> {
    fn action_to_intents(&self, input: ActionToIntentInput) -> Result<Vec<Intent>, String> {
        match (
            input.link.link_type.unwrap().clone(),
            input.action.r#type.clone(),
        ) {
            (LinkType::SendTip, ActionType::CreateLink) => {
                let fee_intent = self.build_create_link_fee_intent()?;
                let tip_intent = self.build_create_link_intent(input)?;

                let result: Vec<_> = fee_intent
                    .into_iter()
                    .chain(tip_intent.into_iter())
                    .collect();

                Ok(result)
            }
            _ => Err("Unsupported link type or action type".to_string()),
        }
    }

    fn handle_action_link(
        &self,
        link_type: &LinkType,
        action_type: &ActionType,
    ) -> Result<Vec<Intent>, String> {
        // This is where we'd implement support for different link and action type combinations
        match (link_type, action_type) {
            (LinkType::SendTip, ActionType::CreateLink) => {
                // This is a placeholder - in a real implementation, we'd build the intents here
                let fee_intent = self.build_create_link_fee_intent()?;
                Ok(fee_intent)
            }
            _ => Err(format!(
                "Unsupported combination: {:?}, {:?}",
                link_type, action_type
            )),
        }
    }
}
