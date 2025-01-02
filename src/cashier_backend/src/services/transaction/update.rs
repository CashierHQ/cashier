use crate::{
    core::intent::types::UpdateIntentInput,
    repositories::{intent_store, intent_transaction_store, transaction_store},
    types::{
        intent::{Intent, IntentState, IntentType},
        transaction::TransactionState,
    },
};

// This function set the intent and all transactions to processing state
pub fn set_processing_intent(intent_id: String) -> Result<(), String> {
    let intent = intent_store::get(&intent_id)
        .ok_or_else(|| "[set_processing_intent] Intent not found".to_string())?;
    let prefix = format!("intent#{}#transaction#", intent_id);

    let intent_transactions = intent_transaction_store::find_with_prefix(prefix.as_str());
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
        link_id: _,
        intent_id,
        transaction_update,
    } = input;

    let intent = intent_store::get(&intent_id).ok_or_else(|| "Intent not found".to_string())?;

    match IntentType::from_string(&intent.intent_type) {
        Ok(intent_type) => match intent_type {
            IntentType::Create => {
                for transaction_update in transaction_update {
                    if transaction_update.is_send {
                        set_transaction_state(
                            transaction_update.transaction_id.as_str(),
                            TransactionState::Success,
                        )?;
                    } else {
                        set_transaction_state(
                            transaction_update.transaction_id.as_str(),
                            TransactionState::Fail,
                        )?;
                    }
                }

                roll_up_intent_state(intent);

                Ok(())
            }
            _ => Err("Not supported".to_string()),
        },
        Err(e) => Err(e),
    }
}

pub fn roll_up_intent_state(intent: Intent) {
    let intent_transactions = intent_transaction_store::find_with_prefix(
        format!("intent#{}#transaction#", intent.id).as_str(),
    );

    let transaction_ids: Vec<String> = intent_transactions
        .iter()
        .map(|t| t.transaction_id.clone())
        .collect();

    let transactions = transaction_store::batch_get(transaction_ids);

    let all_success = transactions
        .iter()
        .all(|t| t.state == TransactionState::Success.to_string());

    let any_fail_or_timeout = transactions.iter().any(|t| {
        t.state == TransactionState::Fail.to_string()
            || t.state == TransactionState::Timeout.to_string()
    });

    if all_success {
        let _ = update_intent_state(intent.id.clone(), IntentState::Success);
    } else if any_fail_or_timeout {
        let _ = update_intent_state(intent.id.clone(), IntentState::Fail);
    }
}
pub fn set_transaction_state(transaction_id: &str, state: TransactionState) -> Result<(), String> {
    let mut transaction = transaction_store::get(transaction_id)
        .ok_or_else(|| "[set_transaction_timeout] Transaction not found".to_string())?;

    transaction.state = state.to_string();

    transaction_store::update(transaction.to_persistence());

    Ok(())
}

// This method will used when need to change intent's transactions to timeout
pub fn timeout_intent(intent_id: &str) -> Result<(), String> {
    let intent = intent_store::get(intent_id)
        .ok_or_else(|| "[check_intent_processing] Intent not found".to_string())?;
    let prefix = format!("intent#{}#transaction#", intent_id);
    let intent_transactions = intent_transaction_store::find_with_prefix(prefix.as_str());

    let transaction_ids: Vec<String> = intent_transactions
        .iter()
        .map(|t| t.transaction_id.clone())
        .collect();

    for transaction_id in transaction_ids {
        match set_timeout_if_needed(transaction_id.as_str()) {
            Ok(_) => (),
            Err(e) => return Err(e),
        }
    }

    // rollup intent state
    roll_up_intent_state(intent);

    Ok(())
}

// If the intent is timeout then set transaction is processing -> timeout
// other transaction wont be affected
pub fn set_timeout_if_needed(transaction_id: &str) -> Result<(), String> {
    let mut transaction = transaction_store::get(transaction_id)
        .ok_or_else(|| "[set_timeout_if_needed] Transaction not found".to_string())?;

    if transaction.state == TransactionState::Processing.to_string() {
        transaction.state = TransactionState::Timeout.to_string();
        transaction_store::update(transaction.to_persistence());
    }

    Ok(())
}
