use cashier_types::{Action, ActionState, Intent, IntentState, Transaction, TransactionState};
use std::collections::HashMap;

pub fn roll_up_state(
    mut action: Action,
    mut intents: Vec<Intent>,
    intent_txs: HashMap<String, Vec<Transaction>>,
) -> Result<(), String> {
    roll_up_intent_statuses(&mut intents, &intent_txs)?;
    roll_up_action_status(&mut action, &intents)?;
    Ok(())
}

fn roll_up_intent_statuses(
    intents: &mut Vec<Intent>,
    intent_txs: &HashMap<String, Vec<Transaction>>,
) -> Result<(), String> {
    for intent in intents {
        if let Some(transactions) = intent_txs.get(&intent.id) {
            if transactions
                .iter()
                .any(|tx| tx.state == TransactionState::Fail)
            {
                intent.state = IntentState::Fail;
            } else if transactions
                .iter()
                .all(|tx| tx.state == TransactionState::Success)
            {
                intent.state = IntentState::Success;
            }
        }
    }
    Ok(())
}
fn roll_up_action_status(action: &mut Action, intents: &[Intent]) -> Result<(), String> {
    if intents
        .iter()
        .any(|intent| intent.state == IntentState::Fail)
    {
        action.state = ActionState::Fail;
    } else if intents
        .iter()
        .all(|intent| intent.state == IntentState::Success)
    {
        action.state = ActionState::Success;
    }
    Ok(())
}
