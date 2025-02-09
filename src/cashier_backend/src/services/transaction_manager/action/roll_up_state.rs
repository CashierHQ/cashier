use cashier_types::{Action, ActionState, Intent, IntentState, Transaction, TransactionState};
use std::collections::HashMap;

use crate::repositories;

use super::{get_action_by_tx_id, ActionResp};

pub fn roll_up_state(tx_id: String) -> Result<(), String> {
    let action_resp: ActionResp = get_action_by_tx_id::get_action_by_tx_id(tx_id)
        .map_err(|e| format!("get_action_by_tx_id failed: {}", e))?;

    let mut intents = action_resp.intents;
    let intent_txs = action_resp.intent_txs;
    let mut action = action_resp.action;

    roll_up_intent_status(&mut intents, &intent_txs)?;
    roll_up_action_status(&mut action, &intents)?;

    for intent in intents {
        repositories::intent::update(intent.clone());
    }

    repositories::action::update(action.clone());

    Ok(())
}

fn roll_up_intent_status(
    intents: &mut Vec<Intent>,
    intent_txs: &HashMap<String, Vec<Transaction>>,
) -> Result<(), String> {
    for intent in intents {
        if let Some(transactions) = intent_txs.get(&intent.id) {
            if transactions
                .iter()
                .all(|tx| tx.state == TransactionState::Created)
            {
                intent.state = IntentState::Created;
            } else if transactions
                .iter()
                .any(|tx| tx.state == TransactionState::Fail)
            {
                intent.state = IntentState::Fail;
            } else if transactions
                .iter()
                .all(|tx| tx.state == TransactionState::Success)
            {
                intent.state = IntentState::Success;
            } else {
                intent.state = IntentState::Processing;
            }
        }
    }
    Ok(())
}
fn roll_up_action_status(action: &mut Action, intents: &[Intent]) -> Result<(), String> {
    if intents
        .iter()
        .all(|intent| intent.state == IntentState::Created)
    {
        action.state = ActionState::Created;
    } else if intents
        .iter()
        .any(|intent| intent.state == IntentState::Fail)
    {
        action.state = ActionState::Fail;
    } else if intents
        .iter()
        .all(|intent| intent.state == IntentState::Success)
    {
        action.state = ActionState::Success;
    } else {
        action.state = ActionState::Processing;
    }
    Ok(())
}
