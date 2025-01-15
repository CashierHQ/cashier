use std::time::Duration;

use ic_cdk::spawn;
use ic_cdk_timers::set_timer;

use crate::{
    constant::TX_TIMEOUT,
    core::{intent::types::ConfirmIntentInput, link::types::IntentResp},
    info,
    repositories::{intent_store, link_store, user_wallet_store},
    services::{link::is_link_creator, transaction::update::timeout_intent},
    types::intent::{IntentState, IntentType},
};

use super::{
    get::get_intent_resp, update::set_processing_intent, validate::validate_balance_with_asset_info,
};

pub async fn confirm_intent(input: ConfirmIntentInput) -> Result<IntentResp, String> {
    // validate
    let link = link_store::get(&input.link_id)
        .ok_or_else(|| "[confirm_intent] Link not found".to_string())?;

    let intent = intent_store::get(&input.intent_id)
        .ok_or_else(|| "[confirm_intent] Intent not found".to_string())?;

    let caller = ic_cdk::api::caller();

    let user_id = match user_wallet_store::get(&caller.to_text()) {
        Some(id) => id,
        None => return Err("[confirm_intent] User not found".to_string()),
    };

    if intent.creator_id != user_id {
        return Err("[confirm_intent] Caller is not intent creator".to_string());
    }

    if intent.state != IntentState::Created.to_string() {
        return Err("[confirm_intent] Intent state is not Created".to_string());
    }

    let intent_type = IntentType::from_string(&intent.intent_type)?;

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
            set_processing_intent(input.intent_id.clone())?;

            let timeout = TX_TIMEOUT;
            let timeout_sec = timeout.parse::<u64>().unwrap_or(120);

            info!("Set timer for intent {} {}", input.intent_id, timeout_sec);

            let id = input.intent_id.clone();

            set_timer(Duration::from_secs(timeout_sec), move || {
                spawn(async move {
                    let _ = timeout_intent(&input.intent_id.clone());
                });
            });

            // set_processing_intent(input.intent_id)
            get_intent_resp(&id)
        }
        _ => {
            return Err("[confirm_intent] Intent type is not supported".to_string());
        }
    }
}
