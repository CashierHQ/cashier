use uuid::Uuid;

use crate::{
    repositories::{
        intent_store, intent_transaction_store, link_intent_store, link_store, transaction_store,
        user_intent_store, user_wallet_store,
    },
    services::link::is_link_creator,
    types::{
        intent::{CreateIntentInput, Intent, IntentState, IntentType},
        link_intent::LinkIntent,
        user_intent::UserIntent,
    },
};

use super::assemble_intent::{assemble_created_transaction, AssembleTransactionResp};

pub fn create(intent: CreateIntentInput) -> Result<Intent, String> {
    let caller = ic_cdk::api::caller();
    let link = link_store::get(&intent.link_id);
    match link {
        Some(_) if is_link_creator(caller.to_text(), &intent.link_id) => (),
        Some(_) => return Err("You are not the creator of this link".to_string()),
        None => return Err("Link not found".to_string()),
    }
    let user_id = match user_wallet_store::get(&caller.to_text()) {
        Some(user_id) => user_id,
        None => return Err("User not found".to_string()),
    };

    let intent_type = IntentType::from_string(&intent.intent_type)?;
    let id: Uuid = Uuid::new_v4();
    let link_id = intent.link_id.clone();
    let ts: u64 = ic_cdk::api::time();

    let new_intent = Intent::new(
        id.to_string(),
        user_id.clone(),
        intent.link_id,
        IntentState::Created.to_string(),
        intent_type.to_string(),
    );

    let new_link_intent = LinkIntent::new(link_id.clone(), IntentType::Create, id.to_string(), ts);
    let AssembleTransactionResp {
        transactions,
        intent_transactions,
    } = assemble_created_transaction(&link_id, &id.to_string(), ts);
    let transactions_persistence = transactions
        .iter()
        .map(|t| t.to_persistence())
        .collect::<Vec<_>>();
    let intent_transactions_persistence = intent_transactions
        .iter()
        .map(|t| t.to_persistence())
        .collect::<Vec<_>>();
    let user_intent = UserIntent::new(
        user_id.clone(),
        new_intent.id.clone(),
        new_intent.intent_type.clone(),
        ts,
    );

    // Store all record
    let _ = intent_store::create(new_intent.to_persistence());
    let _ = transaction_store::batch_create(transactions_persistence);
    let _ = intent_transaction_store::batch_create(intent_transactions_persistence);
    let _ = link_intent_store::create(new_link_intent.to_persistence());
    let _ = user_intent_store::create(user_intent.to_persistence());

    match intent_store::get(&id.to_string()) {
        Some(intent) => Ok(intent),
        None => Err("Failed to create intent".to_string()),
    }
}
