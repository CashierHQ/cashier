use std::{collections::HashMap, str::FromStr};

use cashier_types::{
    Action, ActionIntent, ActionState, ActionType, Intent, IntentTransaction, LinkAction,
    Transaction, UserAction,
};
use uuid::Uuid;

use crate::{
    core::action::types::{ActionDto, CreateActionInput},
    repositories::{self, link, user_wallet},
    types::error::CanisterError,
};

use super::{
    action_adapter::{self, ConvertToIntentInput},
    intent_adapter,
    validate::validate_balance_with_asset_info,
};

// TODO: handle the params for the action incase claim action
pub async fn create_link_action(input: CreateActionInput) -> Result<ActionDto, CanisterError> {
    let caller = ic_cdk::api::caller();
    let link = link::get(&input.link_id)
        .ok_or_else(|| CanisterError::ValidationErrors("Link not found".to_string()))?;

    // Validate the user's balance
    match validate_balance_with_asset_info(&link.clone(), &caller).await {
        Ok(_) => (),
        Err(e) => return Err(CanisterError::ValidationErrors(e)),
    }

    // Get the user ID from the user wallet store
    let user_wallet = user_wallet::get(&caller.to_text())
        .ok_or_else(|| CanisterError::ValidationErrors("User wallet not found".to_string()))?;

    // Parse the intent type
    let action_type = ActionType::from_str(&input.action_type)
        .map_err(|_| CanisterError::ValidationErrors(format!("Invalid inteactionnt type ")))?;

    let action = Action {
        id: Uuid::new_v4().to_string(),
        r#type: action_type,
        state: ActionState::Created,
        creator: user_wallet.user_id.clone(),
    };

    let link_action = LinkAction {
        link_id: link.id.clone(),
        action_type: input.action_type.clone(),
        action_id: action.id.clone(),
    };

    let create_intent_input = ConvertToIntentInput {
        action: action.clone(),
        link: link.clone(),
    };

    let intents = action_adapter::ic_adapter::IcAdapter::convert(create_intent_input)
        .map_err(|e| {
            CanisterError::ValidationErrors(format!("Failed to convert action to intent: {}", e))
        })
        .map_err(|e| {
            CanisterError::ValidationErrors(format!("Failed to convert action to intent: {:?}", e))
        })?;

    let mut intent_tx_hashmap: HashMap<String, Vec<Transaction>> = HashMap::new();

    for intent in intents.clone() {
        let transactions = intent_adapter::ic_adapter::IcAdapter::convert(&intent)
            .map_err(|e| {
                CanisterError::ValidationErrors(format!(
                    "Failed to convert intent to transaction: {}",
                    e
                ))
            })
            .map_err(|e| {
                CanisterError::ValidationErrors(format!(
                    "Failed to convert intent to transaction: {:?}",
                    e
                ))
            })?;

        intent_tx_hashmap.insert(intent.id.clone(), transactions);
    }

    let _ = store_records(
        link_action,
        action.clone(),
        intents.clone(),
        intent_tx_hashmap,
        user_wallet.user_id.clone(),
    )?;

    Ok(ActionDto::from(action, intents))

    // Retrieve and return the created intent
}

// This method store link action, action, intents, action intents, transaction, intent transaction
fn store_records(
    link_action: LinkAction,
    action: Action,
    intents: Vec<Intent>,
    intent_tx_map: HashMap<String, Vec<Transaction>>,
    user_id: String,
) -> Result<(), CanisterError> {
    let action_intents = intents
        .iter()
        .map(|intent| ActionIntent {
            action_id: action.id.clone(),
            intent_id: intent.id.clone(),
        })
        .collect::<Vec<ActionIntent>>();

    let mut intent_transactions: Vec<IntentTransaction> = vec![];
    let mut transactions: Vec<Transaction> = vec![];

    for (intent_id, txs) in intent_tx_map {
        for tx in txs {
            let intent_transaction = IntentTransaction {
                intent_id: intent_id.clone(),
                transaction_id: tx.id.clone(),
            };

            intent_transactions.push(intent_transaction);
            transactions.push(tx);
        }
    }

    let user_action = UserAction {
        user_id: user_id.to_string(),
        action_id: action.id.clone(),
    };

    repositories::link_action::create(link_action);
    repositories::user_action::create(user_action);
    repositories::action::create(action);
    repositories::action_intent::batch_create(action_intents);
    repositories::intent::batch_create(intents);
    repositories::intent_transaction::batch_create(intent_transactions);
    repositories::transaction::batch_create(transactions);

    // Store all records
    // let _ = intent::create(new_intent.to_persistence());
    // let _ = transaction::batch_create(transactions_persistence);
    // let _ = intent_transaction::batch_create(intent_transactions_persistence);
    // let _ = link_intent_store::create(new_link_intent.to_persistence());
    // let _ = user_action::create(user_intent.to_persistence());

    Ok(())
}
