use candid::Nat;
use icrc_ledger_types::{icrc1::account::Account, icrc2::approve::ApproveArgs};
use uuid::Uuid;

use crate::{
    services::transaction::build_tx::BuildTxResp,
    types::{consent_messsage::ConsentType, transaction::Transaction},
};

pub fn build(token_address: String, fee_amount: u64) -> BuildTxResp {
    let id: Uuid = Uuid::new_v4();

    let spender = Account {
        owner: ic_cdk::id(),
        subaccount: None,
    };

    let arg = ApproveArgs {
        from_subaccount: None,
        spender,
        amount: Nat::from(fee_amount),
        expected_allowance: None,
        expires_at: None,
        fee: None,
        memo: None,
        created_at_time: None,
    };

    let consent = ConsentType::build_send_consent(
        crate::types::chain::Chain::IC,
        fee_amount,
        token_address.clone(),
    );

    let transaction = Transaction::build_icrc_approve(id.to_string(), token_address.clone(), arg);

    let consent = ConsentType::build_send_app_fee_consent(
        crate::types::chain::Chain::IC,
        fee_amount,
        token_address.clone(),
    );

    return BuildTxResp {
        transaction,
        consent,
    };
}
