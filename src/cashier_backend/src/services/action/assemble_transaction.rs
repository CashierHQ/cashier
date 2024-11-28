use uuid::Uuid;

use crate::{
    store::link_store,
    types::{
        account::Account,
        transaction::{Transaction, TransactionStatus},
    },
};

pub fn assemble_created_transaction(link_id: &str) {
    let caller = ic_cdk::api::caller();
    let link_detail = link_store::get(link_id);

    let link_detail = match link_detail {
        Some(link_detail) => link_detail,
        None => return,
    };

    let asset_info = link_detail.asset_info.unwrap_or(vec![]);

    let transactions: Vec<Transaction> = vec![];
    let to_account = Account::from_link_id(caller, link_id.to_string());
    let from_account: Account = Account::from_link_id(link_detail.creator, link_id.to_string());

    for asset in asset_info {
        let id = Uuid::new_v4().to_string();
        let transaction = Transaction::new(id, TransactionStatus::Created, link_id.to_string());

        transactions.push(transaction);
    }
}
