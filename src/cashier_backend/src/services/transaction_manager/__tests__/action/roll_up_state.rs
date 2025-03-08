#[cfg(test)]
mod tests {
    use crate::services::transaction_manager::{
        __tests__::{
            action::{
                generate_action_created, generate_action_success, generate_action_with_for_fail,
                generate_action_with_for_processing, setup_repositories,
            },
            tests::MockIcEnvironment,
        },
        action::ActionService,
        validate::ValidateService,
    };

    use cashier_types::{ActionState, IntentState};
    use faux::when;

    #[test]
    fn should_all_be_created() {
        let (
            mut action_repository,
            mut intent_repository,
            mut action_intent_repository,
            mut transaction_repository,
            mut intent_transaction_repository,
            link_repository,
            link_action_repository,
            user_action_repository,
            user_wallet_repository,
        ) = setup_repositories();

        let validate_service = ValidateService::faux();
        let ic_env = MockIcEnvironment::faux();

        let (
            mock_action,
            intents,
            mock_action_intents,
            _intent_id_txs_hash_map,
            intent_transaction_hash_map,
            txs_hash_map,
        ) = generate_action_created();

        let mut list_intent_ids: Vec<String> =
            intents.iter().map(|intent| intent.id.clone()).collect();
        list_intent_ids.sort();

        let selected_intent = intents.first().unwrap();
        let selected_intent_tx = intent_transaction_hash_map
            .get(&selected_intent.id)
            .unwrap()
            .first()
            .unwrap();
        let selected_tx = txs_hash_map
            .get(&selected_intent_tx.transaction_id)
            .unwrap();
        let selected_action_intent = mock_action_intents
            .iter()
            .find(|action_intent| action_intent.intent_id == selected_intent.id);

        if selected_action_intent.is_none() {
            panic!("selected_action_intent not found");
        }

        when!(intent_transaction_repository.get_by_transaction_id)
            .once()
            .then_return(vec![selected_intent_tx.clone()]);
        when!(action_intent_repository.get_by_intent_id)
            .once()
            .then_return(vec![selected_action_intent.unwrap().clone()]);

        // start of _get_action_resp mock
        when!(action_repository.get)
            .once()
            .then_return(Some(mock_action.clone()));
        when!(action_intent_repository.get_by_action_id)
            .once()
            .then_return(mock_action_intents);

        let first_intent = intents[0].clone();
        let second_intent = intents[1].clone();

        when!(intent_repository.get)
            .once()
            .then_return(Some(first_intent.clone()));
        when!(intent_repository.get)
            .once()
            .then_return(Some(second_intent.clone()));

        when!(intent_transaction_repository.get_by_intent_id)
            .once()
            .then_return(
                intent_transaction_hash_map
                    .get(&first_intent.id)
                    .unwrap()
                    .clone(),
            );
        when!(intent_transaction_repository.get_by_intent_id)
            .once()
            .then_return(
                intent_transaction_hash_map
                    .get(&second_intent.id)
                    .unwrap()
                    .clone(),
            );
        when!(intent_repository.update).then_return(());
        when!(action_repository.update).then_return(());

        for (_tx_id, tx) in txs_hash_map.clone() {
            when!(transaction_repository.get)
                .once()
                .then_return(Some(tx.clone()));
        }

        let action_service = ActionService::new(
            action_repository,
            intent_repository,
            action_intent_repository,
            transaction_repository,
            intent_transaction_repository,
            link_repository,
            link_action_repository,
            user_action_repository,
            user_wallet_repository,
            validate_service,
            ic_env,
        );

        let result = action_service.roll_up_state(selected_tx.id.clone());

        let action_resp = result.clone().unwrap();
        println!("{:#?}", action_resp);

        assert_eq!(result.is_ok(), true);
        assert_eq!(action_resp.action.state, ActionState::Created);
        assert_eq!(action_resp.intents.len(), 2);
        assert_eq!(action_resp.intents[0].state, IntentState::Created);
        assert_eq!(action_resp.intents[1].state, IntentState::Created);
        // assert_eq!();
    }

    #[test]
    fn should_all_be_success() {
        let (
            mut action_repository,
            mut intent_repository,
            mut action_intent_repository,
            mut transaction_repository,
            mut intent_transaction_repository,
            link_repository,
            link_action_repository,
            user_action_repository,
            user_wallet_repository,
        ) = setup_repositories();

        let validate_service = ValidateService::faux();
        let ic_env = MockIcEnvironment::faux();

        let (
            mock_action,
            intents,
            mock_action_intents,
            _intent_id_txs_hash_map,
            intent_transaction_hash_map,
            txs_hash_map,
        ) = generate_action_success();

        let mut list_intent_ids: Vec<String> =
            intents.iter().map(|intent| intent.id.clone()).collect();
        list_intent_ids.sort();

        let selected_intent = intents.first().unwrap();
        let selected_intent_tx = intent_transaction_hash_map
            .get(&selected_intent.id)
            .unwrap()
            .first()
            .unwrap();
        let selected_tx = txs_hash_map
            .get(&selected_intent_tx.transaction_id)
            .unwrap();
        let selected_action_intent = mock_action_intents
            .iter()
            .find(|action_intent| action_intent.intent_id == selected_intent.id);

        if selected_action_intent.is_none() {
            panic!("selected_action_intent not found");
        }

        when!(intent_transaction_repository.get_by_transaction_id)
            .once()
            .then_return(vec![selected_intent_tx.clone()]);
        when!(action_intent_repository.get_by_intent_id)
            .once()
            .then_return(vec![selected_action_intent.unwrap().clone()]);

        // start of _get_action_resp mock
        when!(action_repository.get)
            .once()
            .then_return(Some(mock_action.clone()));
        when!(action_intent_repository.get_by_action_id)
            .once()
            .then_return(mock_action_intents);

        let first_intent = intents[0].clone();
        let second_intent = intents[1].clone();

        when!(intent_repository.get)
            .once()
            .then_return(Some(first_intent.clone()));
        when!(intent_repository.get)
            .once()
            .then_return(Some(second_intent.clone()));

        when!(intent_transaction_repository.get_by_intent_id)
            .once()
            .then_return(
                intent_transaction_hash_map
                    .get(&first_intent.id)
                    .unwrap()
                    .clone(),
            );
        when!(intent_transaction_repository.get_by_intent_id)
            .once()
            .then_return(
                intent_transaction_hash_map
                    .get(&second_intent.id)
                    .unwrap()
                    .clone(),
            );
        when!(intent_repository.update).then_return(());
        when!(action_repository.update).then_return(());

        for (_tx_id, tx) in txs_hash_map.clone() {
            when!(transaction_repository.get)
                .once()
                .then_return(Some(tx.clone()));
        }

        let action_service = ActionService::new(
            action_repository,
            intent_repository,
            action_intent_repository,
            transaction_repository,
            intent_transaction_repository,
            link_repository,
            link_action_repository,
            user_action_repository,
            user_wallet_repository,
            validate_service,
            ic_env,
        );

        let result = action_service.roll_up_state(selected_tx.id.clone());

        let action_resp = result.clone().unwrap();
        println!("{:#?}", action_resp);

        assert_eq!(result.is_ok(), true);
        assert_eq!(action_resp.action.state, ActionState::Success);
        assert_eq!(action_resp.intents.len(), 2);
        assert_eq!(action_resp.intents[0].state, IntentState::Success);
        assert_eq!(action_resp.intents[1].state, IntentState::Success);
        // assert_eq!();
    }

    #[test]
    fn should_change_to_fail_if_one_tx_failed() {
        let (
            mut action_repository,
            mut intent_repository,
            mut action_intent_repository,
            mut transaction_repository,
            mut intent_transaction_repository,
            link_repository,
            link_action_repository,
            user_action_repository,
            user_wallet_repository,
        ) = setup_repositories();

        let validate_service = ValidateService::faux();
        let ic_env = MockIcEnvironment::faux();

        let (
            mock_action,
            intents,
            mock_action_intents,
            _intent_id_txs_hash_map,
            intent_transaction_hash_map,
            txs_hash_map,
        ) = generate_action_with_for_fail();

        let mut list_intent_ids: Vec<String> =
            intents.iter().map(|intent| intent.id.clone()).collect();
        list_intent_ids.sort();

        let selected_intent = intents.first().unwrap();
        let selected_intent_tx = intent_transaction_hash_map
            .get(&selected_intent.id)
            .unwrap()
            .first()
            .unwrap();
        let selected_tx = txs_hash_map
            .get(&selected_intent_tx.transaction_id)
            .unwrap();
        let selected_action_intent = mock_action_intents
            .iter()
            .find(|action_intent| action_intent.intent_id == selected_intent.id);

        if selected_action_intent.is_none() {
            panic!("selected_action_intent not found");
        }

        when!(intent_transaction_repository.get_by_transaction_id)
            .once()
            .then_return(vec![selected_intent_tx.clone()]);
        when!(action_intent_repository.get_by_intent_id)
            .once()
            .then_return(vec![selected_action_intent.unwrap().clone()]);

        // start of _get_action_resp mock
        when!(action_repository.get)
            .once()
            .then_return(Some(mock_action.clone()));
        when!(action_intent_repository.get_by_action_id)
            .once()
            .then_return(mock_action_intents);

        let first_intent = intents[0].clone();
        let second_intent = intents[1].clone();

        when!(intent_repository.get)
            .once()
            .then_return(Some(first_intent.clone()));
        when!(intent_repository.get)
            .once()
            .then_return(Some(second_intent.clone()));

        when!(intent_transaction_repository.get_by_intent_id)
            .once()
            .then_return(
                intent_transaction_hash_map
                    .get(&first_intent.id)
                    .unwrap()
                    .clone(),
            );
        when!(intent_transaction_repository.get_by_intent_id)
            .once()
            .then_return(
                intent_transaction_hash_map
                    .get(&second_intent.id)
                    .unwrap()
                    .clone(),
            );
        when!(intent_repository.update).then_return(());
        when!(action_repository.update).then_return(());

        for (_tx_id, tx) in txs_hash_map.clone() {
            when!(transaction_repository.get)
                .once()
                .then_return(Some(tx.clone()));
        }

        let action_service = ActionService::new(
            action_repository,
            intent_repository,
            action_intent_repository,
            transaction_repository,
            intent_transaction_repository,
            link_repository,
            link_action_repository,
            user_action_repository,
            user_wallet_repository,
            validate_service,
            ic_env,
        );

        let result = action_service.roll_up_state(selected_tx.id.clone());

        let action_resp = result.clone().unwrap();
        let mut intents_resp = action_resp.intents;
        intents_resp.sort();

        assert_eq!(result.is_ok(), true);
        assert_eq!(action_resp.action.state, ActionState::Fail);
        assert_eq!(intents_resp.len(), 2);

        let fail_intent = intents_resp
            .iter()
            .find(|intent| intent.state == IntentState::Fail);
        let processing_intent = intents_resp
            .iter()
            .find(|intent| intent.state == IntentState::Processing);

        assert!(fail_intent.is_some());
        assert!(processing_intent.is_some());
        // assert_eq!();
    }

    #[test]
    fn should_keep_be_processing() {
        let (
            mut action_repository,
            mut intent_repository,
            mut action_intent_repository,
            mut transaction_repository,
            mut intent_transaction_repository,
            link_repository,
            link_action_repository,
            user_action_repository,
            user_wallet_repository,
        ) = setup_repositories();

        let validate_service = ValidateService::faux();
        let ic_env = MockIcEnvironment::faux();

        let (
            mock_action,
            intents,
            mock_action_intents,
            _intent_id_txs_hash_map,
            intent_transaction_hash_map,
            txs_hash_map,
        ) = generate_action_with_for_processing();

        let mut list_intent_ids: Vec<String> =
            intents.iter().map(|intent| intent.id.clone()).collect();
        list_intent_ids.sort();

        let selected_intent = intents.first().unwrap();
        let selected_intent_tx = intent_transaction_hash_map
            .get(&selected_intent.id)
            .unwrap()
            .first()
            .unwrap();
        let selected_tx = txs_hash_map
            .get(&selected_intent_tx.transaction_id)
            .unwrap();
        let selected_action_intent = mock_action_intents
            .iter()
            .find(|action_intent| action_intent.intent_id == selected_intent.id);

        if selected_action_intent.is_none() {
            panic!("selected_action_intent not found");
        }

        when!(intent_transaction_repository.get_by_transaction_id)
            .once()
            .then_return(vec![selected_intent_tx.clone()]);
        when!(action_intent_repository.get_by_intent_id)
            .once()
            .then_return(vec![selected_action_intent.unwrap().clone()]);

        // start of _get_action_resp mock
        when!(action_repository.get)
            .once()
            .then_return(Some(mock_action.clone()));
        when!(action_intent_repository.get_by_action_id)
            .once()
            .then_return(mock_action_intents);

        let first_intent = intents[0].clone();
        let second_intent = intents[1].clone();

        when!(intent_repository.get)
            .once()
            .then_return(Some(first_intent.clone()));
        when!(intent_repository.get)
            .once()
            .then_return(Some(second_intent.clone()));

        when!(intent_transaction_repository.get_by_intent_id)
            .once()
            .then_return(
                intent_transaction_hash_map
                    .get(&first_intent.id)
                    .unwrap()
                    .clone(),
            );
        when!(intent_transaction_repository.get_by_intent_id)
            .once()
            .then_return(
                intent_transaction_hash_map
                    .get(&second_intent.id)
                    .unwrap()
                    .clone(),
            );
        when!(intent_repository.update).then_return(());
        when!(action_repository.update).then_return(());

        for (_tx_id, tx) in txs_hash_map.clone() {
            when!(transaction_repository.get)
                .once()
                .then_return(Some(tx.clone()));
        }

        let action_service = ActionService::new(
            action_repository,
            intent_repository,
            action_intent_repository,
            transaction_repository,
            intent_transaction_repository,
            link_repository,
            link_action_repository,
            user_action_repository,
            user_wallet_repository,
            validate_service,
            ic_env,
        );

        let result = action_service.roll_up_state(selected_tx.id.clone());

        let action_resp = result.clone().unwrap();

        assert_eq!(result.is_ok(), true);
        assert_eq!(action_resp.action.state, ActionState::Processing);
        assert_eq!(action_resp.intents.len(), 2);
        // assert_eq!();
    }
}
