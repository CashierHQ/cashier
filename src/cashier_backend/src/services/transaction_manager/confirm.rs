use std::time::Duration;

use cashier_types::{action, ActionState};
use ic_cdk::spawn;
use ic_cdk_timers::set_timer;

use crate::{
    constant::TX_TIMEOUT,
    core::action::types::{ActionDto, ConfirmActionInput},
    info,
    repositories::{self, link, user_wallet},
    services::link::is_link_creator,
};

use super::validate::validate_balance_with_asset_info;

pub async fn confirm_action(input: ConfirmActionInput) -> Result<ActionDto, String> {
    // validate
    let link =
        link::get(&input.link_id).ok_or_else(|| "[confirm_intent] Link not found".to_string())?;

    let action = repositories::action::get(input.action_id)
        .ok_or_else(|| "[confirm_intent] Action not found".to_string())?;

    let caller = ic_cdk::api::caller();

    let user_wallet = match user_wallet::get(&caller.to_text()) {
        Some(id) => id,
        None => return Err("[confirm_intent] User not found".to_string()),
    };

    if action.creator != user_wallet.user_id {
        return Err("[confirm_intent] Caller is not action creator".to_string());
    }

    if action.state != ActionState::Created {
        return Err("[confirm_intent] Intent state is not Created".to_string());
    }

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
            set_processing_intent(input.action_id.clone())?;

            let timeout = TX_TIMEOUT;
            let timeout_sec = timeout.parse::<u64>().unwrap_or(120);

            info!("Set timer for intent {} {}", input.action_id, timeout_sec);

            let id = input.action_id.clone();

            set_timer(Duration::from_secs(timeout_sec), move || {
                spawn(async move {
                    let _ = timeout_intent(&input.action_id.clone());
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
