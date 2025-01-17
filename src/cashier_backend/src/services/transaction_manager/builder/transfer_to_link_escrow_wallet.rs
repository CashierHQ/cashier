use candid::Nat;
use icrc_ledger_types::icrc1::{account::Account, transfer::TransferArg};
use uuid::Uuid;

use crate::{
    services::transaction_manager::build_tx::BuildTxResp,
    types::{consent_messsage::ConsentType, transaction::Transaction},
    utils::helper::{to_memo, to_subaccount},
};

use super::TransactionBuilder;

pub struct TransferToLinkEscrowWalletBuilder {
    pub link_id: String,
    pub token_address: String,
    pub transfer_amount: u64,
}

impl TransactionBuilder for TransferToLinkEscrowWalletBuilder {
    fn build(&self) -> BuildTxResp {
        let id: Uuid = Uuid::new_v4();

        let account = Account {
            owner: ic_cdk::id(),
            subaccount: Some(to_subaccount(self.link_id.clone())),
        };

        let arg = TransferArg {
            to: account,
            amount: Nat::from(self.transfer_amount),
            memo: Some(to_memo(id.to_string())),
            fee: None,
            created_at_time: None,
            from_subaccount: None,
        };

        let consent = ConsentType::build_send_consent(
            crate::types::chain::Chain::IC,
            self.transfer_amount,
            self.token_address.clone(),
        );

        let transaction =
            Transaction::build_icrc_transfer(id.to_string(), self.token_address.clone(), arg);

        BuildTxResp {
            transaction,
            consent,
        }
    }
}
