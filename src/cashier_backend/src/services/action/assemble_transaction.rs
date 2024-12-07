use uuid::Uuid;

use crate::{
    repositories::link_store,
    types::{action_transaction::ActionTransaction, link::Link, transaction::Transaction},
};

pub struct AssembleTransactionResp {
    pub transactions: Vec<Transaction>,
    pub action_transactions: Vec<ActionTransaction>,
}

pub fn assemble_created_transaction(
    link_id: &str,
    action_id: &str,
    ts: u64,
) -> AssembleTransactionResp {
    let link_detail = link_store::get(link_id).unwrap();

    match Link::from_persistence(link_detail) {
        Link::NftCreateAndAirdropLink(_) => {
            let id = Uuid::new_v4();

            let new_transaction = Transaction::create_and_airdrop_nft_default(id.to_string());

            let new_action_transaction =
                ActionTransaction::new(action_id.to_string(), new_transaction.id.clone(), ts);

            return AssembleTransactionResp {
                transactions: vec![new_transaction],
                action_transactions: vec![new_action_transaction],
            };
        }
    }
}
