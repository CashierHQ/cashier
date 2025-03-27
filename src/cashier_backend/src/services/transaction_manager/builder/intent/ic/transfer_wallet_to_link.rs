use cashier_types::{
    Asset, Chain, Intent, IntentState, IntentTask, IntentType, TransferData, Wallet,
};
use icrc_ledger_types::icrc1::account::Account;
use uuid::Uuid;

use crate::{
    services::transaction_manager::builder::{IntentBuildResponse, IntentBuilder},
    utils::{helper::to_subaccount, runtime::IcEnvironment},
};

pub struct TransferWalletToLinkIntentBuiler<'a, E: IcEnvironment + Clone> {
    pub from_user_wallet: Wallet,
    pub link_id: String,
    pub amount: u64,
    pub asset: Asset,
    pub ic_env: &'a E,
}

impl<'a, E: IcEnvironment + Clone> IntentBuilder for TransferWalletToLinkIntentBuiler<'a, E> {
    fn build(&self) -> IntentBuildResponse {
        let ts = self.ic_env.time();

        let id = Uuid::new_v4();

        let deposit_account = Account {
            owner: self.ic_env.id(),
            subaccount: Some(to_subaccount(&self.link_id.clone())),
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
                asset: self.asset.clone(),
                amount: self.amount,
            }),
            state: IntentState::Created,
            created_at: ts,
            task: IntentTask::TransferWalletToLink,
            dependency: vec![],
            chain: Chain::IC,
            label: "1002".to_string(),
        };

        IntentBuildResponse {
            intents: vec![intent],
        }
    }
}
