use cashier_types::{
    Asset, Chain, Intent, IntentState, IntentTask, IntentType, TransferIntent, Wallet,
};
use icrc_ledger_types::icrc1::account::Account;
use uuid::Uuid;

use crate::{
    services::transaction_manager::builder::{IntentBuildResponse, IntentBuilder},
    utils::helper::to_subaccount,
};

pub struct TransferWalletToLinkIntentBuiler {
    pub from_user_wallet: Wallet,
    pub link_id: String,
    pub amount: u64,
    pub asset: Asset,
}

impl IntentBuilder for TransferWalletToLinkIntentBuiler {
    fn build(&self) -> IntentBuildResponse {
        let ts = ic_cdk::api::time();

        let id = Uuid::new_v4();

        let deposit_account = Account {
            owner: ic_cdk::id(),
            subaccount: Some(to_subaccount(self.link_id.clone())),
        };

        let deposit_wallet = Wallet {
            address: deposit_account.to_string(),
            chain: Chain::IC,
        };

        let caller_account = Account {
            owner: ic_cdk::caller(),
            subaccount: None,
        };

        let deposit_from_wallet = Wallet {
            address: caller_account.to_string(),
            chain: Chain::IC,
        };

        let intent = Intent {
            id: id.to_string(),
            r#type: IntentType::Transfer(TransferIntent {
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
        };

        IntentBuildResponse {
            intents: vec![intent],
        }
    }
}
