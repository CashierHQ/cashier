use cashier_types::{ActionType, Asset, Chain, Intent, LinkType, Wallet};
use icrc_ledger_types::icrc1::account::Account;

use crate::{
    constant::ICP_CANISTER_ID,
    services::transaction_manager::{
        self,
        builder::{
            intent::ic::{
                transfer_wallet_to_link::TransferWalletToLinkIntentBuiler,
                transfer_wallet_to_link_treasury::TransferWalletToLinkTreasuryBuilder,
            },
            IntentBuilder,
        },
    },
};

use super::{ActionAdapter, ConvertToIntentInput};

pub struct IcAdapter {}

impl IcAdapter {
    pub fn convert(input: ConvertToIntentInput) -> Result<Vec<Intent>, String> {
        match (
            input.link.link_type.unwrap().clone(),
            input.action.r#type.clone(),
        ) {
            (LinkType::TipLink, ActionType::CreateLink) => {
                let fee_intent = IcAdapter::build_create_link_fee_intent()?;
                let tip_intent = IcAdapter::build_create_tip_link_intent(input.clone())?;

                let result: Vec<_> = fee_intent
                    .into_iter()
                    .chain(tip_intent.into_iter())
                    .collect();

                Ok(result)
            }
            _ => Err("Unsupported link type or action type".to_string()),
        }
    }

    fn build_create_link_fee_intent() -> Result<Vec<Intent>, String> {
        let fee_asset = Asset {
            address: ICP_CANISTER_ID.to_string(),
            chain: Chain::IC,
        };

        let transfer_to_link_builer = TransferWalletToLinkTreasuryBuilder {
            amount: transaction_manager::fee::Fee::CreateTipLinkFeeIcp.as_u64(),
            asset: fee_asset,
        };

        let res = transfer_to_link_builer.build();

        return Ok(res.intents);
    }

    fn build_create_tip_link_intent(input: ConvertToIntentInput) -> Result<Vec<Intent>, String> {
        let caller_wallet = Wallet {
            address: Account {
                owner: ic_cdk::api::caller(),
                subaccount: None,
            }
            .to_string(),
            chain: Chain::IC,
        };

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

        let transfer_to_link_builer = TransferWalletToLinkIntentBuiler {
            from_user_wallet: caller_wallet,
            link_id: input.link.id,
            amount: first_asset.total_amount,
            asset: asset,
        };

        let res = transfer_to_link_builer.build();

        return Ok(res.intents);
    }
}

impl ActionAdapter for IcAdapter {
    fn convert_to_intent(&self, input: ConvertToIntentInput) -> Result<Vec<Intent>, String> {
        IcAdapter::convert(input)
    }
}
