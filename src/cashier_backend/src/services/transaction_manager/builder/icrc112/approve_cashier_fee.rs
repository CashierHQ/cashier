use candid::Nat;
use icrc_ledger_types::{icrc1::account::Account, icrc2::approve::ApproveArgs};

use crate::{types::icrc_112_transaction::Icrc112Request, utils::runtime::IcEnvironment};

use super::TransactionBuilder;

pub struct ApproveCashierFeeBuilder<'a, E: IcEnvironment + Clone> {
    pub token_address: String,
    pub fee_amount: u64,
    pub tx_id: String,
    pub ic_env: &'a E,
}

impl<'a, E: IcEnvironment + Clone> TransactionBuilder for ApproveCashierFeeBuilder<'a, E> {
    fn build(&self) -> Icrc112Request {
        let spender = Account {
            owner: self.ic_env.id(),
            subaccount: None,
        };

        let arg = ApproveArgs {
            from_subaccount: None,
            spender,
            amount: Nat::from(self.fee_amount),
            expected_allowance: None,
            expires_at: None,
            fee: None,
            // TODO: update memo
            memo: None,
            created_at_time: None,
        };

        let canister_call =
            ic_icrc_tx::builder::icrc2::build_icrc2_approve(self.token_address.clone(), arg);

        return Icrc112Request {
            canister_id: canister_call.canister_id,
            method: canister_call.method,
            arg: canister_call.arg,
            nonce: Some(self.tx_id.clone()),
        };
    }
}
