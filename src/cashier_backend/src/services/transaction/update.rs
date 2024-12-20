use crate::{
    core::intent::types::UpdateIntentInput,
    repositories::{intent_store, intent_transaction_store, transaction_store},
    types::{
        intent::{Intent, IntentState},
        transaction::TransactionState,
    },
};

pub fn set_processing_intent(intent_id: String) -> Result<(), String> {
    let intent = intent_store::get(&intent_id).ok_or_else(|| "Intent not found".to_string())?;
    let prefix = "intent#{intent_id}#transaction#";

    let intent_transactions = intent_transaction_store::find_with_prefix(prefix);
    let transaction_ids = intent_transactions
        .iter()
        .map(|t| t.transaction_id.clone())
        .collect();

    let mut transactions = transaction_store::batch_get(transaction_ids);

    let processing_transactions = transactions
        .iter_mut()
        .map(|transaction| {
            transaction.state = TransactionState::Processing.to_string();
            transaction.to_persistence()
        })
        .collect::<Vec<_>>();

    let _ = transaction_store::batch_update(processing_transactions);
    let _ = update_intent_state(intent.id.clone(), IntentState::Processing);

    Ok(())
}

pub fn update_intent_state(id: String, state: IntentState) -> Result<Intent, String> {
    match intent_store::get(&id) {
        Some(mut intent) => {
            intent.state = state.to_string();
            intent_store::update(intent.to_persistence());
            Ok(intent)
        }
        None => Err("Intent not found".to_string()),
    }
}

pub fn update_transaction_and_roll_up(input: UpdateIntentInput) -> Result<(), String> {
    let UpdateIntentInput {
        intent_id,
        transaction_id,
        block_id: _,
    } = input;

    let intent = intent_store::get(&intent_id).ok_or_else(|| "Intent not found".to_string())?;
    let mut current_transaction = transaction_store::get(transaction_id)
        .ok_or_else(|| "Transaction not found".to_string())?;
    let prefix = "intent#{intent_id}#transaction#";

    let intent_transactions = intent_transaction_store::find_with_prefix(prefix);

    // TODO: Validate block id
    // This is mock code, it should be replaced with real code
    let is_transfer_success = true;

    if is_transfer_success {
        current_transaction.state = TransactionState::Success.to_string();
        transaction_store::update(current_transaction.to_persistence());

        // check all transaction to roll up
        roll_up_intent_state(intent, intent_transactions);
    }

    Ok(())
}

pub fn roll_up_intent_state(
    intent: Intent,
    intent_transactions: Vec<crate::types::intent_transaction::IntentTransaction>,
) {
    let transaction_ids = intent_transactions
        .iter()
        .map(|t| t.transaction_id.clone())
        .collect();

    let transactions = transaction_store::batch_get(transaction_ids);

    let is_all_transaction_success = transactions
        .iter()
        .all(|t| t.state == TransactionState::Success.to_string());

    if is_all_transaction_success {
        let _ = update_intent_state(intent.id.clone(), IntentState::Success);
    }
}
