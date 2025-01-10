use candid::Nat;
use icrc_ledger_types::icrc1::{account::Account, transfer::TransferArg};
use uuid::Uuid;

use crate::{
    services::transaction::build_tx::BuildTxResp,
    types::{consent_messsage::ConsentType, transaction::Transaction},
    utils::helper::{to_memo, to_subaccount},
};

pub fn build(link_id: String, token_address: String, transfer_amount: u64) -> BuildTxResp {
    let id: Uuid = Uuid::new_v4();

    let account = Account {
        owner: ic_cdk::id(),
        subaccount: Some(to_subaccount(link_id)),
    };

    let arg = TransferArg {
        to: account,
        amount: Nat::from(transfer_amount),
        memo: Some(to_memo(id.to_string())),
        fee: None,
        created_at_time: None,
        from_subaccount: None,
    };

    let consent = ConsentType::build_send_consent(
        crate::types::chain::Chain::IC,
        transfer_amount,
        token_address.clone(),
    );

    let transaction = Transaction::build_icrc_transfer(id.to_string(), token_address, arg);

    return BuildTxResp {
        transaction,
        consent,
    };
}
