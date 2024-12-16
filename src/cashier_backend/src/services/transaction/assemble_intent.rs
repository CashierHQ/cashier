use candid::Nat;
use icrc_ledger_types::icrc1::{account::Account, transfer::TransferArg};
use uuid::Uuid;

use crate::{
    constant::ICP_CANISTER_ID,
    info,
    types::{
        intent_transaction::IntentTransaction,
        link::{link_type::LinkType, Link},
        transaction::Transaction,
    },
    utils::helper::{to_memo, to_subaccount},
};

use super::fee::build_transfer_fee;

#[derive(Debug)]
pub struct AssembleTransactionResp {
    pub transactions: Vec<Transaction>,
    pub intent_transactions: Vec<IntentTransaction>,
}

pub fn assemble_created_transaction(
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
                return assemble_tip_transaction(link, intent_id, ts);
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
    });
}

// This method will create two transaction
// 1. Transfer fee
// 2. Transfer token to tip
pub fn assemble_tip_transaction(
    link: &Link,
    intent_id: &str,
    ts: u64,
) -> Result<AssembleTransactionResp, String> {
    let id: Uuid = Uuid::new_v4();

    let account = Account {
        owner: ic_cdk::id(),
        subaccount: Some(to_subaccount(link.id.clone())),
    };

    let amount_need_to_transfer = match &link.asset_info {
        Some(asset_info) if !asset_info.is_empty() => {
            let first_item = &asset_info[0];
            first_item.total_amount
        }
        _ => return Err("Asset info not found".to_string()),
    };

    let link_type = match &link.link_type {
        Some(link_type) => link_type,
        None => return Err("Link type not found".to_string()),
    };

    let arg = TransferArg {
        to: account,
        amount: Nat::from(amount_need_to_transfer),
        memo: Some(to_memo(id.to_string())),
        fee: None,
        created_at_time: None,
        from_subaccount: None,
    };

    let transfer_tx =
        Transaction::build_icrc_transfer(id.to_string(), ICP_CANISTER_ID.to_string(), arg);

    let transfer_fee_tx = build_transfer_fee(&LinkType::from_string(link_type).unwrap());

    let new_intent_transaction =
        IntentTransaction::new(intent_id.to_string(), transfer_tx.id.clone(), ts);

    info!("transfer_tx: {:?}", transfer_tx);
    info!("transfer_fee_tx: {:?}", transfer_fee_tx);

    return Ok(AssembleTransactionResp {
        transactions: vec![transfer_tx, transfer_fee_tx],
        intent_transactions: vec![new_intent_transaction],
    });
}
