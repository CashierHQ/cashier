use crate::{
    core::action::types::{CreateIntentConsent, GetConsentMessageInput},
    repositories::link,
    types::{error::CanisterError, intent::IntentType},
};

use super::assemble_intent::assemble_create_trasaction;

pub fn get_consent_message(
    input: GetConsentMessageInput,
) -> Result<CreateIntentConsent, CanisterError> {
    let link = link::get(&input.link_id);
    match link {
        Some(_) => {}
        None => {
            return Err(CanisterError::ValidationErrors(
                "Link not found".to_string(),
            ))
        }
    }

    // Parse the intent type
    let intent_type = IntentType::from_string(&input.intent_type)
        .map_err(|e| CanisterError::ValidationErrors(format!("Invalid intent type: {}", e)))?;

    let general_link = crate::types::link::Link::from_persistence(link.unwrap());

    let assemble_res = match intent_type {
        IntentType::Create => {
            match assemble_create_trasaction(
                &general_link,
                &input.intent_id.to_string(),
                ic_cdk::api::time(),
            ) {
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

    return Ok(CreateIntentConsent::from(assemble_res.consent_messages));
}
