use candid::Nat;
use icrc_ledger_types::{icrc1::account::Account, icrc2::approve::ApproveArgs};
use uuid::Uuid;

use crate::{
    services::transaction_manager::build_tx::BuildTxResp, types::consent_messsage::ConsentType,
};

use super::TransactionBuilder;

pub struct ApproveCashierFeeBuilder {
    pub token_address: String,
    pub fee_amount: u64,
}

impl TransactionBuilder for ApproveCashierFeeBuilder {
    fn build(&self) -> BuildTxResp {
        let id: Uuid = Uuid::new_v4();

        let spender = Account {
            owner: ic_cdk::id(),
            subaccount: None,
        };

        let arg = ApproveArgs {
            from_subaccount: None,
            spender,
            amount: Nat::from(self.fee_amount),
            expected_allowance: None,
            expires_at: None,
            fee: None,
            memo: None,
            created_at_time: None,
        };

        let transaction =
            Transaction::build_icrc_approve(id.to_string(), self.token_address.clone(), arg);

        let consent = ConsentType::build_send_app_fee_consent(
            crate::types::chain::Chain::IC,
            self.fee_amount,
            self.token_address.clone(),
        );

        BuildTxResp {
            transaction,
            consent,
        }
    }
}
