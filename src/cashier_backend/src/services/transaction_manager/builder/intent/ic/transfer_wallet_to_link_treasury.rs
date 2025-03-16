use cashier_types::{
    Asset, Chain, Intent, IntentState, IntentTask, IntentType, TransferFromData, Wallet,
};
use icrc_ledger_types::icrc1::account::Account;
use uuid::Uuid;

use crate::{
    services::transaction_manager::builder::{IntentBuildResponse, IntentBuilder},
    utils::runtime::IcEnvironment,
};

pub struct TransferWalletToLinkTreasury;

pub struct TransferWalletToLinkTreasuryBuilder<'a, E: IcEnvironment + Clone> {
    pub amount: u64,
    pub asset: Asset,
    pub ic_env: &'a E,
}

impl<'a, E: IcEnvironment + Clone> IntentBuilder for TransferWalletToLinkTreasuryBuilder<'a, E> {
    fn build(&self) -> IntentBuildResponse {
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
                asset: self.asset.clone(),
                amount: self.amount,
            }),
            state: IntentState::Created,
            created_at: ts,
            task: IntentTask::TransferWalletToTreasury,
            dependency: vec![],
            chain: Chain::IC,
            label: "1001".to_string(),
        };

        IntentBuildResponse {
            intents: vec![intent],
        }
    }
}
