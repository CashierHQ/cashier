use crate::{store::link_store, types::transaction::Transaction};

pub fn assemble_transaction(link_id: &str) {
    let link_detail = link_store::get(link_id);

    let link_detail = match link_detail {
        Some(link_detail) => link_detail,
        None => return,
    };

    let asset_info = link_detail.asset_info.unwrap_or(vec![]);

    let transactions: Vec<Transaction> = vec![];

    for asset in asset_info {
        let transaction = Transaction::from_asset_info(asset);
        transactions.push(transaction);
    }
}
