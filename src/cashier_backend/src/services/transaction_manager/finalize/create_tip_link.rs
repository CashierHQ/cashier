use crate::{
    core::link::types::IntentResp,
    error,
    services::transaction_manager::{
        get::get_intent_transactions,
        update::{roll_up_intent_state, update_transaction_state},
        validate::validate_tip_link::{validate_allowance, validate_balance_transfer},
    },
    types::{intent::Intent, link::Link, transaction::TransactionState},
};

pub async fn execute(intent: Intent, link: Link) -> Result<IntentResp, String> {
    let intent_transactions = get_intent_transactions(&intent.id)?;

    let is_allowance_enough = validate_allowance().await.unwrap_or(false);
    let icrc2_approve_tx = intent_transactions
        .transactions
        .iter()
        .filter(|tx| tx.method == "icrc2_approve")
        .next();

    if let Some(icrc2_approve_tx) = icrc2_approve_tx {
        if is_allowance_enough {
            let _ = update_transaction_state(&icrc2_approve_tx.id, TransactionState::Success);
        } else {
            let _ = update_transaction_state(&icrc2_approve_tx.id, TransactionState::Fail);
        }
    } else {
        error!("icrc2_approve transaction not found");
    }

    let is_tip_balance_enough = validate_balance_transfer(&link).await.unwrap_or(false);
    let transfer_tip_tx = intent_transactions
        .transactions
        .iter()
        .filter(|tx| tx.method == "icrc1_transfer")
        .next();

    if let Some(transfer_tip_tx) = transfer_tip_tx {
        if is_tip_balance_enough {
            let _ = update_transaction_state(&transfer_tip_tx.id, TransactionState::Success);
        } else {
            let _ = update_transaction_state(&transfer_tip_tx.id, TransactionState::Fail);
        }
    } else {
        error!("icrc1_transfer transaction not found");
    }

    // TODO: Charge fee
    let update_intent_tx = intent_transactions
        .transactions
        .iter()
        .filter(|tx| tx.method == "update_intent")
        .next();

    if let Some(update_intent_tx) = update_intent_tx {
        let _ = update_transaction_state(&update_intent_tx.id, TransactionState::Success);
    } else {
        error!("update_intent transaction not found");
    }

    let intent = roll_up_intent_state(intent);

    Ok(intent)
}
