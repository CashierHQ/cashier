use crate::{
    core::intent::types::ConfirmIntentInput,
    info,
    repositories::{intent_store, link_store},
    services::link::is_link_creator,
    types::intent::IntentType,
};

use super::{update::set_processing_intent, validate::validate_balance_with_asset_info};

pub async fn confirm_intent(input: ConfirmIntentInput) -> Result<(), String> {
    // validate
    let link = link_store::get(&input.link_id)
        .ok_or_else(|| "[confirm_intent] Link not found".to_string())?;

    let intent = intent_store::get(&input.intent_id)
        .ok_or_else(|| "[confirm_intent] Intent not found".to_string())?;

    let intent_type = IntentType::from_string(&intent.intent_type)?;

    let caller = ic_cdk::api::caller();

    let general_link = crate::types::link::Link::from_persistence(link);

    match intent_type {
        IntentType::Create => {
            // validate caller is creator
            match is_link_creator(caller.to_text(), &intent.link_id) {
                true => (),
                false => {
                    return Err(
                        "[confirm_intent] Caller is not the creator of the link".to_string()
                    );
                }
            }

            // validate balance enough
            validate_balance_with_asset_info(general_link.clone(), caller).await?;

            // set all to processing
            set_processing_intent(input.intent_id)?;

            // set_processing_intent(input.intent_id)
            Ok(())
        }
        _ => {
            return Err("[confirm_intent] Intent type is not supported".to_string());
        }
    }
}
