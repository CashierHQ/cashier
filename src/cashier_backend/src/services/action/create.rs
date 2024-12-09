use uuid::Uuid;

use crate::{
    repositories::{
        action_store, action_transaction_store, link_action_store, link_store, transaction_store,
        user_action_store, user_wallet_store,
    },
    services::link::is_link_creator,
    types::{
        action::{Action, ActionState, ActionType, CreateActionInput},
        link_action::LinkAction,
        user_action::UserAction,
    },
};

use super::assemble_transaction::{assemble_created_transaction, AssembleTransactionResp};

pub fn create(action: CreateActionInput) -> Result<Action, String> {
    let caller = ic_cdk::api::caller();
    let link = link_store::get(&action.link_id);
    match link {
        Some(_) if is_link_creator(caller.to_text(), &action.link_id) => (),
        Some(_) => return Err("You are not the creator of this link".to_string()),
        None => return Err("Link not found".to_string()),
    }
    let user_id = match user_wallet_store::get(&caller.to_text()) {
        Some(user_id) => user_id,
        None => return Err("User not found".to_string()),
    };

    let action_type = ActionType::from_string(&action.action_type)?;
    let id: Uuid = Uuid::new_v4();
    let link_id = action.link_id.clone();
    let ts: u64 = ic_cdk::api::time();

    let new_action = Action::new(
        id.to_string(),
        user_id.clone(),
        action.link_id,
        ActionState::Created.to_string(),
        action_type.to_string(),
    );

    let new_link_action = LinkAction::new(link_id.clone(), ActionType::Create, id.to_string(), ts);
    let AssembleTransactionResp {
        transactions,
        action_transactions,
    } = assemble_created_transaction(&link_id, &id.to_string(), ts);
    let transactions_persistence = transactions
        .iter()
        .map(|t| t.to_persistence())
        .collect::<Vec<_>>();
    let action_transactions_persistence = action_transactions
        .iter()
        .map(|t| t.to_persistence())
        .collect::<Vec<_>>();
    let user_action = UserAction::new(
        user_id.clone(),
        new_action.id.clone(),
        new_action.action_type.clone(),
        ts,
    );

    // Store all record
    let _ = action_store::create(new_action.to_persistence());
    let _ = transaction_store::batch_create(transactions_persistence);
    let _ = action_transaction_store::batch_create(action_transactions_persistence);
    let _ = link_action_store::create(new_link_action.to_persistence());
    let _ = user_action_store::create(user_action.to_persistence());

    match action_store::get(&id.to_string()) {
        Some(action) => Ok(action),
        None => Err("Failed to create action".to_string()),
    }
}
