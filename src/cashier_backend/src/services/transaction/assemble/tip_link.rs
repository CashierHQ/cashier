use crate::{
    constant::ICP_CANISTER_ID,
    services::transaction::{assemble_intent::AssembleTransactionResp, builder, fee::Fee},
    types::{
        chain::Chain,
        consent_messsage::{ConsentType, ReceiveType},
        intent_transaction::IntentTransaction,
        link::Link,
    },
};

pub fn create(link: &Link, intent_id: &str, ts: u64) -> Result<AssembleTransactionResp, String> {
    let mut tx_map_template = vec![
        // one for deposit tip, one for approve backend use the fee
        vec!["icrc1_transfer".to_string(), "icrc2_approve".to_string()],
        // update the intent and charge fee after two above finished
        vec!["update_intent".to_string()],
    ];

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

    let first_asset = match &link.asset_info {
        Some(asset_info) if !asset_info.is_empty() => &asset_info[0],
        _ => return Err("Asset info not found".to_string()),
    };

    let build_trasfer_res = builder::transfer_to_link_escrow_wallet::build(
        link.id.clone(),
        first_asset.address.clone(),
        amount_need_to_transfer,
    );
    tx_map_template[0][0] = build_trasfer_res.transaction.id.clone();

    let fee = Fee::CreateTipLinkFeeIcp.as_u64();
    let token_fee_address = ICP_CANISTER_ID.to_string();

    let build_approve_fee_res = builder::approve_cashier_fee::build(token_fee_address, fee);
    tx_map_template[0][1] = build_approve_fee_res.transaction.id.clone();

    let transfer_intent_transacrtion = IntentTransaction::new(
        intent_id.to_string(),
        build_trasfer_res.transaction.id.clone(),
        ts,
    );

    let approve_fee_intent_transacrtion = IntentTransaction::new(
        intent_id.to_string(),
        build_approve_fee_res.transaction.id.clone(),
        ts,
    );

    let consent_receive_tip_link = ConsentType::build_receive_consent(
        Chain::IC,
        ReceiveType::Link,
        link.title.clone().unwrap(),
        None,
        None,
    );

    // TODO: add update_intent transaction to transactions and its intent_transactions

    return Ok(AssembleTransactionResp {
        transactions: vec![
            build_trasfer_res.transaction,
            build_approve_fee_res.transaction,
        ],
        intent_transactions: vec![
            transfer_intent_transacrtion,
            approve_fee_intent_transacrtion,
        ],
        consent_messages: vec![
            consent_receive_tip_link,
            build_trasfer_res.consent,
            build_approve_fee_res.consent,
        ],
        tx_map: tx_map_template,
    });
}
