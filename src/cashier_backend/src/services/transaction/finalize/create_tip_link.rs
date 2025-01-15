use crate::{
    core::link::types::{LinkStateMachineAction, UpdateLinkInput},
    services::{
        link::update::handle_update_link,
        transaction::{
            get::get_intent_transactions,
            update::{roll_up_intent_state, update_transaction_state},
            validate::validate_tip_link::{validate_allowance, validate_balance_transfer},
        },
    },
    types::{
        intent::{Intent, IntentState},
        link::Link,
        transaction::TransactionState,
    },
};

pub async fn finalize_create_tip_link(intent: Intent, link: Link) -> Result<(), String> {
    let intent_transactions = get_intent_transactions(&intent.id)?;

    let is_allowance_enough = validate_allowance().await.unwrap_or(false);
    let icrc2_approve_tx = intent_transactions
        .transactions
        .iter()
        .filter(|tx| tx.method == "icrc2_approve")
        .next()
        .ok_or_else(|| "icrc2_approve transaction not found".to_string())?;

    if is_allowance_enough {
        update_transaction_state(&icrc2_approve_tx.id, TransactionState::Success)?;
    } else {
        update_transaction_state(&icrc2_approve_tx.id, TransactionState::Fail)?;
    }

    let is_tip_balance_enough = validate_balance_transfer(&link).await.unwrap_or(false);
    let transfer_tip_tx = intent_transactions
        .transactions
        .iter()
        .filter(|tx| tx.method == "balance_transfer")
        .next()
        .ok_or_else(|| "balance_transfer transaction not found".to_string())?;

    if is_tip_balance_enough {
        update_transaction_state(&transfer_tip_tx.id, TransactionState::Success)?;
    } else {
        update_transaction_state(&transfer_tip_tx.id, TransactionState::Fail)?;
    }

    // TODO: Charge fee
    // TODO: update tx

    let intent = roll_up_intent_state(intent);

    if intent.state == IntentState::Success.to_string() {
        let _ = handle_update_link(
            UpdateLinkInput {
                id: link.id.clone(),
                action: LinkStateMachineAction::Continue.to_string(),
                params: None,
            },
            link,
        )
        .await;
    }

    Ok(())
}
