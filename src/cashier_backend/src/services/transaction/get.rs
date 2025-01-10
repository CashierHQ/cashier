use crate::{
    core::link::types::IntentResp,
    repositories::{intent_store, intent_transaction_store, link_intent_store, transaction_store},
    types::intent::IntentType,
};

use super::assemble_intent::map_tx_map_to_transactions;

pub fn get_create_intent_id(link_id: String) -> Result<String, String> {
    let link_intent_prefix = format!(
        "link#{}#type#{}#intent#",
        link_id,
        IntentType::Create.to_string()
    );

    let link_intent_create = link_intent_store::find_with_prefix(link_intent_prefix.as_str());
    // NOTE
    if link_intent_create.is_empty() {
        return Err("Intent not found".to_string());
    } else if link_intent_create.len() > 1 {
        return Err("Multiple IntentType Create found".to_string());
    }

    let first_link_intent = link_intent_create.first().cloned().unwrap();

    return Ok(first_link_intent.intent_id);
}

pub fn get_create_intent(link_id: String) -> Result<IntentResp, String> {
    let link_intent_prefix = format!(
        "link#{}#type#{}#intent#",
        link_id,
        IntentType::Create.to_string()
    );

    let link_intent_create = link_intent_store::find_with_prefix(link_intent_prefix.as_str());
    // NOTE
    if link_intent_create.is_empty() {
        return Err("Intent not found".to_string());
    } else if link_intent_create.len() > 1 {
        return Err("Multiple IntentType Create found".to_string());
    }

    let first_link_intent = link_intent_create.first().cloned().unwrap();

    let intent = intent_store::get(&first_link_intent.intent_id).unwrap();

    let intent_transaction_prefix = format!("intent#{}#transaction#", first_link_intent.intent_id);

    let intent_transactions =
        intent_transaction_store::find_with_prefix(intent_transaction_prefix.as_str());

    let transaction_ids = intent_transactions
        .iter()
        .map(|intent| intent.transaction_id.clone())
        .collect::<Vec<String>>();

    let transactions = transaction_store::batch_get(transaction_ids);

    let icrcx_transactions = map_tx_map_to_transactions(intent.tx_map, transactions);

    return Ok(IntentResp {
        id: intent.id,
        creator_id: intent.creator_id,
        link_id: intent.link_id,
        state: intent.state,
        intent_type: intent.intent_type,
        transactions: icrcx_transactions,
    });
}
