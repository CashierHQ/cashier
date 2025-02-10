use candid::Nat;
use icrc_ledger_types::icrc1::{account::Account, transfer::TransferArg};

use crate::{types::icrc_112_transaction::Icrc112Request, utils::helper::to_subaccount};

use super::TransactionBuilder;

pub struct TransferToLinkEscrowWalletBuilder {
    pub link_id: String,
    pub token_address: String,
    pub transfer_amount: u64,
    pub tx_id: String,
}

impl TransactionBuilder for TransferToLinkEscrowWalletBuilder {
    fn build(&self) -> Icrc112Request {
        let account = Account {
            owner: ic_cdk::id(),
            subaccount: Some(to_subaccount(self.link_id.clone())),
        };

        let arg = TransferArg {
            to: account,
            amount: Nat::from(self.transfer_amount),
            // TODO: update memo
            memo: None,
            fee: None,
            created_at_time: None,
            from_subaccount: None,
        };

        let canister_call =
            ic_icrc_tx::builder::icrc1::build_icrc1_transfer(self.token_address.clone(), arg);

        return Icrc112Request {
            canister_id: canister_call.canister_id,
            method: canister_call.method,
            arg: canister_call.arg,
            nonce: Some(self.tx_id.clone()),
        };
    }
}
