use crate::{
    core::{intent::types::UpdateIntentInput, link::types::IntentResp},
    info,
    repositories::{intent_store, intent_transaction_store, link_store, transaction_store},
    types::{
        intent::{Intent, IntentState, IntentType},
        link::link_type::LinkType,
        transaction::TransactionState,
    },
};

use super::{assemble_intent::map_tx_map_to_transactions, finalize};

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

pub async fn update_transaction_and_roll_up(
    input: UpdateIntentInput,
) -> Result<IntentResp, String> {
    let UpdateIntentInput {
        link_id: _,
        intent_id,
        icrcx_responses,
    } = input;

    let intent = intent_store::get(&intent_id).ok_or_else(|| "Intent not found".to_string())?;

    if intent.state != IntentState::Processing.to_string() {
        return Err("Intent state is not Processing".to_string());
    }

    let link: crate::repositories::entities::link::Link = link_store::get(&intent.link_id)
        .ok_or_else(|| "[update_transaction_and_roll_up] Link not found".to_string())?;
    let link = crate::types::link::Link::from_persistence(link);

    //TODO: validate icrcx response
    // if icrcx_responses.is_some() {
    //     let _responses = icrcx_responses.unwrap();
    //     info!("icrcx_responses: {:?}", _responses);
    // }

    match LinkType::from_string(&link.link_type.clone().unwrap()) {
        Ok(link_type) => match link_type {
            LinkType::TipLink => {
                finalize::create_tip_link::execute(intent.clone(), link).await?;
            }
            _ => return Err("Not supported".to_string()),
        },
        Err(e) => return Err(e),
    }

    match IntentType::from_string(&intent.intent_type) {
        Ok(intent_type) => match intent_type {
            IntentType::Create => Ok(roll_up_intent_state(intent)),
            _ => Err("Not supported".to_string()),
        },
        Err(e) => Err(e),
    }
}

pub fn roll_up_intent_state(intent: Intent) -> IntentResp {
    let intent_transactions = intent_transaction_store::find_with_prefix(
        format!("intent#{}#transaction#", intent.id).as_str(),
    );

    let transaction_ids: Vec<String> = intent_transactions
        .iter()
        .map(|t| t.transaction_id.clone())
        .collect();

    let transactions = transaction_store::batch_get(transaction_ids.clone());

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

    let updated_intent = intent_store::get(&intent.id).unwrap();

    let icrcx_transactions = map_tx_map_to_transactions(intent.tx_map, transactions);

    return IntentResp {
        id: updated_intent.id.clone(),
        creator_id: updated_intent.creator_id.clone(),
        link_id: updated_intent.link_id.clone(),
        state: updated_intent.state.clone(),
        intent_type: updated_intent.intent_type.clone(),
        transactions: icrcx_transactions,
    };
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

    info!("timeout itent: {:?}", intent_id);

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

pub fn update_transaction_state(
    transaction_id: &str,
    state: TransactionState,
) -> Result<(), String> {
    let mut transaction = transaction_store::get(transaction_id)
        .ok_or_else(|| "[update_transaction_state] Transaction not found".to_string())?;

    transaction.state = state.to_string();

    transaction_store::update(transaction.to_persistence());

    Ok(())
}
