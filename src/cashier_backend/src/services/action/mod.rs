use cashier_types::Intent;

use crate::repositories;

pub fn get_intents_by_action_id(action_id: String) -> Vec<Intent> {
    let action_intent_reposiroty = repositories::action_intent::ActionIntentRepository::new();
    let intent_repository = repositories::intent::IntentRepository::new();
    let action_intents = action_intent_reposiroty.get_by_action_id(action_id);

    let intent_ids = action_intents
        .iter()
        .map(|action_intent| action_intent.intent_id.clone())
        .collect();

    intent_repository.batch_get(intent_ids)
}

pub fn is_action_exist(action_id: String) -> bool {
    let action_repository = repositories::action::ActionRepository::new();
    action_repository.get(action_id).is_some()
}
