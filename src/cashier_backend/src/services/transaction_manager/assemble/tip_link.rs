use crate::services::transaction_manager::builder::approve_cashier_fee::ApproveCashierFeeBuilder;
use crate::services::transaction_manager::builder::update_intent::UpdateIntentBuilder;
use crate::services::transaction_manager::builder::TransactionBuilder;
use crate::{
    constant::ICP_CANISTER_ID,
    services::transaction_manager::{
        assemble_intent::AssembleTransactionResp,
        builder::transfer_to_link_escrow_wallet::TransferToLinkEscrowWalletBuilder, fee::Fee,
    },
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
        vec!["update_intent".to_string()],
    ];

    let amount_need_to_transfer = match &link.asset_info {
        Some(asset_info) if !asset_info.is_empty() => {
            let first_item = &asset_info[0];
            first_item.total_amount
        }
        _ => return Err("Asset info not found".to_string()),
    };

    let first_asset = match &link.asset_info {
        Some(asset_info) if !asset_info.is_empty() => &asset_info[0],
        _ => return Err("Asset info not found".to_string()),
    };

    let transfer_token_builder = TransferToLinkEscrowWalletBuilder {
        link_id: link.id.clone(),
        token_address: first_asset.address.clone(),
        transfer_amount: amount_need_to_transfer,
    };
    let build_trasfer_res = transfer_token_builder.build();
    tx_map_template[0][0] = build_trasfer_res.transaction.id.clone();

    let fee = Fee::CreateTipLinkFeeIcp.as_u64();
    let token_fee_address = ICP_CANISTER_ID.to_string();

    let approve_fee_builder = ApproveCashierFeeBuilder {
        token_address: token_fee_address.clone(),
        fee_amount: fee,
    };
    let build_approve_fee_res = approve_fee_builder.build();

    tx_map_template[0][1] = build_approve_fee_res.transaction.id.clone();

    let build_update_intent_builder = UpdateIntentBuilder {
        intent_id: intent_id.to_string(),
        link_id: link.id.clone(),
    };
    let build_update_intent_res = build_update_intent_builder.build();

    tx_map_template[1][0] = build_update_intent_res.transaction.id.clone();

    let transfer_intent_transaction = IntentTransaction::new(
        intent_id.to_string(),
        build_trasfer_res.transaction.id.clone(),
        ts,
    );

    let approve_fee_intent_transaction = IntentTransaction::new(
        intent_id.to_string(),
        build_approve_fee_res.transaction.id.clone(),
        ts,
    );

    let update_intent_intent_transaction = IntentTransaction::new(
        intent_id.to_string(),
        build_update_intent_res.transaction.id.clone(),
        ts,
    );

    let consent_receive_tip_link = ConsentType::build_receive_consent(
        Chain::IC,
        ReceiveType::Link,
        link.title.clone().unwrap(),
        None,
        None,
    );

    return Ok(AssembleTransactionResp {
        transactions: vec![
            build_trasfer_res.transaction,
            build_approve_fee_res.transaction,
            build_update_intent_res.transaction,
        ],
        intent_transactions: vec![
            transfer_intent_transaction,
            approve_fee_intent_transaction,
            update_intent_intent_transaction,
        ],
        consent_messages: vec![
            consent_receive_tip_link,
            build_trasfer_res.consent,
            build_approve_fee_res.consent,
        ],
        tx_map: tx_map_template,
    });
}
