use uuid::Uuid;

use crate::{
    repositories::link_store,
    types::{intent_transaction::IntentTransaction, link::Link, transaction::Transaction},
};

pub struct AssembleTransactionResp {
    pub transactions: Vec<Transaction>,
    pub intent_transactions: Vec<IntentTransaction>,
}

pub fn assemble_created_transaction(
    link_id: &str,
    intent_id: &str,
    ts: u64,
) -> AssembleTransactionResp {
    let link_detail = link_store::get(link_id).unwrap();

    match Link::from_persistence(link_detail) {
        Link::NftCreateAndAirdropLink(_) => {
            let id = Uuid::new_v4();

            let new_transaction = Transaction::create_and_airdrop_nft_default(id.to_string());

            let new_intent_transaction =
                IntentTransaction::new(intent_id.to_string(), new_transaction.id.clone(), ts);

            return AssembleTransactionResp {
                transactions: vec![new_transaction],
                intent_transactions: vec![new_intent_transaction],
            };
        }
    }
}
