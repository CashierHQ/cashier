use cashier_types::Intent;

use crate::repositories;

pub fn get_intents_by_action_id(action_id: String) -> Vec<Intent> {
    let action_intents = repositories::action_intent::get_by_action_id(action_id);

    let intent_ids = action_intents
        .iter()
        .map(|action_intent| action_intent.intent_id.clone())
        .collect();

    repositories::intent::batch_get(intent_ids)
}
