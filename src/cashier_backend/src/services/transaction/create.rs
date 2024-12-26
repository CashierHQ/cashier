use uuid::Uuid;

use crate::{
    core::intent::types::{CreateIntentConsent, CreateIntentConsentResponse, CreateIntentInput},
    repositories::{
        intent_store, intent_transaction_store, link_intent_store, link_store, transaction_store,
        user_intent_store, user_wallet_store,
    },
    services::link::is_link_creator,
    types::{
        error::CanisterError,
        intent::{Intent, IntentState, IntentType},
        link_intent::LinkIntent,
        user_intent::UserIntent,
    },
};

use super::{
    assemble_intent::assemble_create_trasaction, validate::validate_balance_with_asset_info,
};

pub async fn create(
    intent: CreateIntentInput,
) -> Result<CreateIntentConsentResponse, CanisterError> {
    let caller = ic_cdk::api::caller();
    let link = link_store::get(&intent.link_id);
    match link {
        Some(_) if is_link_creator(caller.to_text(), &intent.link_id) => (),
        Some(_) => {
            return Err(CanisterError::ValidationErrors(
                "User is not the creator of the link".to_string(),
            ))
        }
        None => {
            return Err(CanisterError::ValidationErrors(
                "Link not found".to_string(),
            ))
        }
    }

    let general_link = crate::types::link::Link::from_persistence(link.unwrap());

    // Validate the user's balance
    match validate_balance_with_asset_info(general_link.clone(), caller).await {
        Ok(_) => (),
        Err(e) => return Err(CanisterError::ValidationErrors(e)),
    }
    // Get the user ID from the user wallet store
    let user_id = user_wallet_store::get(&caller.to_text())
        .ok_or_else(|| CanisterError::ValidationErrors("User wallet not found".to_string()))?;

    // Parse the intent type
    let intent_type = IntentType::from_string(&intent.intent_type)
        .map_err(|e| CanisterError::ValidationErrors(format!("Invalid intent type: {}", e)))?;

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

    let assemble_res = match intent_type {
        IntentType::Create => {
            match assemble_create_trasaction(&general_link, &id.to_string(), ts) {
                Ok(resp) => resp,
                Err(e) => {
                    return Err(CanisterError::ValidationErrors(format!(
                        "Failed to assemble transaction: {}",
                        e
                    )))
                }
            }
        }
        _ => {
            return Err(CanisterError::ValidationErrors(
                "Invalid intent type".to_string(),
            ))
        }
    };

    // store all record

    let transactions_persistence = assemble_res
        .transactions
        .iter()
        .map(|t| t.to_persistence())
        .collect::<Vec<_>>();
    let intent_transactions_persistence = assemble_res
        .intent_transactions
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

    let intent = match intent_store::get(&id.to_string())
        .ok_or_else(|| CanisterError::HandleApiError("Failed to create intent".to_string()))
    {
        Ok(intent) => intent,
        Err(e) => return Err(e),
    };

    Ok(CreateIntentConsentResponse {
        intent,
        consents: CreateIntentConsent::from(assemble_res.consent_messages),
    })

    // Retrieve and return the created intent
}
