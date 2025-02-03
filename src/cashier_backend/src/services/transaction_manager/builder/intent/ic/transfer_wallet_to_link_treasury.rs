use cashier_types::{
    Asset, Chain, Intent, IntentState, IntentTask, IntentType, TransferFromIntent, Wallet,
};
use icrc_ledger_types::icrc1::account::Account;
use uuid::Uuid;

use crate::services::transaction_manager::builder::{IntentBuildResponse, IntentBuilder};

pub struct TransferWalletToLinkTreasury;

pub struct TransferWalletToLinkTreasuryBuilder {
    pub amount: u64,
    pub asset: Asset,
}

impl IntentBuilder for TransferWalletToLinkTreasuryBuilder {
    fn build(&self) -> IntentBuildResponse {
        let ts = ic_cdk::api::time();

        let caller_account = Account {
            owner: ic_cdk::caller(),
            subaccount: None,
        };

        let spender_wallet = Wallet {
            address: Account {
                owner: ic_cdk::id(),
                subaccount: None,
            }
            .to_string(),
            chain: Chain::IC,
        };

        let vault_wallet = Wallet {
            address: Account {
                // TODO: change to treasury account
                owner: ic_cdk::id(),
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
            r#type: IntentType::TransferFrom(TransferFromIntent {
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
        };

        IntentBuildResponse {
            intents: vec![intent],
        }
    }
}
