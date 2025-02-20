#[cfg(test)]
mod tests {
    use cashier_types::{Action, ActionState, Intent, IntentState};
    use fake::{Fake, Faker};
    use uuid::Uuid;

    use crate::services::transaction_manager::action::ActionService;

    fn create_dummy_intent(state: IntentState) -> Intent {
        Intent {
            id: Uuid::new_v4().to_string(),
            state,
            created_at: Faker.fake(),
            dependency: vec![Faker.fake(), Faker.fake()],
            chain: Faker.fake(),
            task: Faker.fake(),
            r#type: Faker.fake(),
        }
    }

    #[test]
    fn test_roll_up_action_status_all_created() {
        let mut action = Action {
            id: Uuid::new_v4().to_string(),
            r#type: Faker.fake(),
            state: ActionState::Processing,
            creator: Faker.fake(),
        };

        let intents = vec![
            create_dummy_intent(IntentState::Created),
            create_dummy_intent(IntentState::Created),
        ];

        let service = ActionService::new();

        service.roll_up_action_state(&mut action, &intents).unwrap();
        assert_eq!(action.state, ActionState::Created);
    }

    #[test]
    fn test_roll_up_action_status_any_fail() {
        let mut action = Action {
            id: Uuid::new_v4().to_string(),
            r#type: Faker.fake(),
            state: ActionState::Processing,
            creator: Faker.fake(),
        };

        let intents = vec![
            create_dummy_intent(IntentState::Created),
            create_dummy_intent(IntentState::Fail),
        ];

        let service = ActionService::new();

        service.roll_up_action_state(&mut action, &intents).unwrap();
        assert_eq!(action.state, ActionState::Fail);
    }

    #[test]
    fn test_roll_up_action_status_all_success() {
        let mut action = Action {
            id: Uuid::new_v4().to_string(),
            r#type: Faker.fake(),
            state: ActionState::Processing,
            creator: Faker.fake(),
        };

        let intents = vec![
            create_dummy_intent(IntentState::Success),
            create_dummy_intent(IntentState::Success),
        ];

        let service = ActionService::new();

        service.roll_up_action_state(&mut action, &intents).unwrap();
        assert_eq!(action.state, ActionState::Success);
    }

    #[test]
    fn test_roll_up_action_status_processing() {
        let mut action = Action {
            id: Uuid::new_v4().to_string(),
            r#type: Faker.fake(),
            state: ActionState::Processing,
            creator: Faker.fake(),
        };

        let intents = vec![
            create_dummy_intent(IntentState::Created),
            create_dummy_intent(IntentState::Processing),
            create_dummy_intent(IntentState::Success),
            create_dummy_intent(IntentState::Created),
            create_dummy_intent(IntentState::Success),
            create_dummy_intent(IntentState::Processing),
        ];

        let service = ActionService::new();

        service.roll_up_action_state(&mut action, &intents).unwrap();
        assert_eq!(action.state, ActionState::Processing);
    }
}
