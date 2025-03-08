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
    utils::runtime::IcEnvironment,
};

use super::{ActionAdapter, ConvertToIntentInput};

pub struct IcAdapter<'a, E: IcEnvironment + Clone> {
    pub ic_env: &'a E,
}

impl<'a, E: IcEnvironment + Clone> IcAdapter<'a, E> {
    pub fn new(ic_env: &'a E) -> Self {
        Self { ic_env }
    }
    pub fn convert(&self, input: ConvertToIntentInput) -> Result<Vec<Intent>, String> {
        match (
            input.link.link_type.unwrap().clone(),
            input.action.r#type.clone(),
        ) {
            (LinkType::TipLink, ActionType::CreateLink) => {
                let fee_intent = self.build_create_link_fee_intent()?;
                let tip_intent = self.build_create_tip_link_intent(input)?;

                let result: Vec<_> = fee_intent
                    .into_iter()
                    .chain(tip_intent.into_iter())
                    .collect();

                Ok(result)
            }
            _ => Err("Unsupported link type or action type".to_string()),
        }
    }

    fn build_create_link_fee_intent(&self) -> Result<Vec<Intent>, String> {
        let fee_asset = Asset {
            address: ICP_CANISTER_ID.to_string(),
            chain: Chain::IC,
        };

        let transfer_to_link_builer = TransferWalletToLinkTreasuryBuilder {
            amount: transaction_manager::fee::Fee::CreateTipLinkFeeIcp.as_u64(),
            asset: fee_asset,
            ic_env: self.ic_env,
        };

        let res = transfer_to_link_builer.build();

        return Ok(res.intents);
    }

    fn build_create_tip_link_intent(
        &self,
        input: ConvertToIntentInput,
    ) -> Result<Vec<Intent>, String> {
        let caller_wallet = Wallet {
            address: Account {
                owner: self.ic_env.caller(),
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
            ic_env: self.ic_env,
        };

        let res = transfer_to_link_builer.build();

        return Ok(res.intents);
    }
}

impl<'a, E: IcEnvironment + Clone> ActionAdapter for IcAdapter<'a, E> {
    fn convert_to_intent(&self, input: ConvertToIntentInput) -> Result<Vec<Intent>, String> {
        self.convert(input)
    }
}
