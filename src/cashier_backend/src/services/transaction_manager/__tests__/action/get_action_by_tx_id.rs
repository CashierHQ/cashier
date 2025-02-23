mod tests {
    use crate::services::transaction_manager::{
        __tests__::action::{generate_action_with_for_processing, setup_repositories},
        action::ActionService,
    };

    use faux::when;

    #[test]
    fn should_throw_intent_tx_not_found() {
        let (
            action_repository,
            intent_repository,
            action_intent_repository,
            transaction_repository,
            mut intent_transaction_repository,
        ) = setup_repositories();
        let (
            _mock_action,
            intents,
            _mock_action_intents,
            _intent_id_txs_hash_map,
            intent_transaction_hash_map,
            txs_hash_map,
        ) = generate_action_with_for_processing();
        let selected_intent = intents.first().unwrap();
        let selected_intent_tx = intent_transaction_hash_map
            .get(&selected_intent.id)
            .unwrap()
            .first()
            .unwrap();
        let _selected_tx = txs_hash_map
            .get(&selected_intent_tx.transaction_id)
            .unwrap();

        when!(intent_transaction_repository.get_by_transaction_id)
            .once()
            .then_return(vec![]);

        let action_service = ActionService::new(
            action_repository,
            intent_repository,
            action_intent_repository,
            transaction_repository,
            intent_transaction_repository,
        );

        let result = action_service.get_action_by_tx_id("tx1".to_string());

        assert_eq!(result.is_err(), true);
        assert_eq!(result.err().unwrap(), "intent_transaction not found");
    }

    #[test]
    fn should_get_action_by_tx_id_success() {
        let (
            mut action_repository,
            mut intent_repository,
            mut action_intent_repository,
            mut transaction_repository,
            mut intent_transaction_repository,
        ) = setup_repositories();
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
        );

        let result = action_service.get_action_by_tx_id(selected_tx.id.clone());

        assert_eq!(result.is_ok(), true);

        let action_resp = result.unwrap();
        let mut res_intent_id: Vec<String> = action_resp
            .intents
            .iter()
            .map(|intent| intent.id.clone())
            .collect();

        res_intent_id.sort();

        assert_eq!(action_resp.action.id, mock_action.id.clone());
        assert_eq!(action_resp.intents.len(), 2);
        assert_eq!(action_resp.intent_txs.len(), 2);
        assert_eq!(res_intent_id, list_intent_ids);
    }
}
