use uuid::Uuid;

use crate::types::{intent_transaction::IntentTransaction, link::Link, transaction::Transaction};

use super::assemble;

//TODO: optimize it if there is too much transaction
// for now tip link only 3 transactions
pub fn map_tx_map_to_transactions(
    tx_map: Vec<Vec<String>>,
    txs: Vec<Transaction>,
) -> Vec<Vec<Transaction>> {
    tx_map
        .into_iter()
        .map(|tx_ids| {
            tx_ids
                .into_iter()
                .filter_map(|tx_id| txs.iter().find(|tx| tx.id == tx_id).cloned())
                .collect()
        })
        .collect()
}

pub fn assemble_create_trasaction(
    link: &Link,
    intent_id: &str,
    ts: u64,
) -> Result<AssembleTransactionResp, String> {
    let link_type = match link.link_type {
        Some(ref link_type) => link_type.as_str(),
        None => return Err("Link type not found".to_string()),
    };

    match LinkType::from_string(link_type) {
        Ok(link_type) => match link_type {
            LinkType::NftCreateAndAirdrop => {
                return assemble_create_and_airdrop_nft(intent_id, ts);
            }
            LinkType::TipLink => {
                return assemble::tip_link::create(link, intent_id, ts);
            }
        },
        Err(e) => {
            return Err(e);
        }
    }

    // let new_transaction = Transaction::create_and_airdrop_nft_default(id.to_string());

    // let new_intent_transaction =
    //     IntentTransaction::new(intent_id.to_string(), new_transaction.id.clone(), ts);

    // return AssembleTransactionResp {
    //     transactions: vec![new_transaction],
    //     intent_transactions: vec![new_intent_transaction],
    // };
}

pub fn assemble_create_and_airdrop_nft(
    intent_id: &str,
    ts: u64,
) -> Result<AssembleTransactionResp, String> {
    let id = Uuid::new_v4();

    let new_transaction = Transaction::create_and_airdrop_nft_default(id.to_string());

    let new_intent_transaction =
        IntentTransaction::new(intent_id.to_string(), new_transaction.id.clone(), ts);

    return Ok(AssembleTransactionResp {
        transactions: vec![new_transaction],
        intent_transactions: vec![new_intent_transaction],
        consent_messages: vec![],
        tx_map: vec![],
    });
}
