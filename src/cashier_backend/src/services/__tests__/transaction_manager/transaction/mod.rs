#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use candid::Principal;
    use cashier_types::{FromCallType, TransactionState, Wallet};
    use faux::when;
    use icrc_ledger_types::icrc1::account::Account;
    use uuid::Uuid;

    use crate::{
        services::{
            __tests__::{
                tests::{
                    create_dummy_action, create_dummy_intent, create_dummy_transaction,
                    create_dummy_tx_protocol, create_dummy_tx_protocol_for_tip_link,
                    generate_timestamp, MockIcEnvironment,
                },
                transaction_manager::action::setup_repositories,
            },
            transaction_manager::{action::ActionService, transaction::TransactionService},
        },
        types::transaction_manager::ActionData,
        utils::helper::to_subaccount,
    };

    // TS1: Update a single transaction to processing
    #[test]
    fn update_single_transaction_to_processing() {
        let (_, _, _, mut transaction_repository, _, _, _, _, _) = setup_repositories();

        let mut action_service = ActionService::faux();
        let mut tx = create_dummy_transaction(TransactionState::Created);
        let mut ic_env = MockIcEnvironment::faux();

        let mut changed_tx = tx.clone();
        changed_tx.state = TransactionState::Processing;

        let intent1 = create_dummy_intent(cashier_types::IntentState::Created);
        let intent2 = create_dummy_intent(cashier_types::IntentState::Created);
        let mut intent_txs = HashMap::new();
        intent_txs.insert(
            intent1.id.clone(),
            vec![create_dummy_transaction(TransactionState::Created)],
        );
        intent_txs.insert(intent2.id.clone(), vec![changed_tx.clone()]);

        let action_resp = ActionData {
            action: create_dummy_action(cashier_types::ActionState::Created),
            intents: vec![intent1.clone(), intent2.clone()],
            intent_txs,
        };

        when!(transaction_repository.update).then_return(changed_tx);

        when!(action_service.roll_up_state).then_return(Ok(action_resp));

        when!(ic_env.time).then_return(generate_timestamp());

        let transaction_service =
            TransactionService::new(transaction_repository, action_service, ic_env);

        let result = transaction_service.update_tx_state(&mut tx, TransactionState::Processing);

        assert!(result.is_ok());
        assert_eq!(tx.state, TransactionState::Processing);
    }

    // TS2: Update a single transaction to success
    #[test]
    fn update_single_transaction_to_success() {
        let (_, _, _, mut transaction_repository, _, _, _, _, _) = setup_repositories();

        let mut action_service = ActionService::faux();
        let mut tx = create_dummy_transaction(TransactionState::Processing);
        let mut ic_env = MockIcEnvironment::faux();

        let mut changed_tx = tx.clone();
        changed_tx.state = TransactionState::Success;

        let intent1 = create_dummy_intent(cashier_types::IntentState::Processing);
        let intent2 = create_dummy_intent(cashier_types::IntentState::Success);
        let mut intent_txs = HashMap::new();
        intent_txs.insert(
            intent1.id.clone(),
            vec![create_dummy_transaction(TransactionState::Processing)],
        );
        intent_txs.insert(intent2.id.clone(), vec![changed_tx.clone()]);

        let action_resp = ActionData {
            action: create_dummy_action(cashier_types::ActionState::Processing),
            intents: vec![intent1.clone(), intent2.clone()],
            intent_txs,
        };

        when!(transaction_repository.update).then_return(changed_tx);

        when!(action_service.roll_up_state).then_return(Ok(action_resp));

        when!(ic_env.time).then_return(generate_timestamp());

        let transaction_service =
            TransactionService::new(transaction_repository, action_service, ic_env);

        let result = transaction_service.update_tx_state(&mut tx, TransactionState::Success);

        assert!(result.is_ok());
        assert_eq!(tx.state, TransactionState::Success);
    }

    // TS3: Update a single transaction to fail
    #[test]
    fn update_single_transaction_to_failed() {
        let (_, _, _, mut transaction_repository, _, _, _, _, _) = setup_repositories();

        let mut action_service = ActionService::faux();
        let mut tx = create_dummy_transaction(TransactionState::Processing);
        let mut ic_env = MockIcEnvironment::faux();

        let mut changed_tx = tx.clone();
        changed_tx.state = TransactionState::Fail;

        let intent1 = create_dummy_intent(cashier_types::IntentState::Fail);
        let intent2 = create_dummy_intent(cashier_types::IntentState::Success);
        let mut intent_txs = HashMap::new();
        intent_txs.insert(
            intent1.id.clone(),
            vec![create_dummy_transaction(TransactionState::Processing)],
        );
        intent_txs.insert(intent2.id.clone(), vec![changed_tx.clone()]);

        let action_resp = ActionData {
            action: create_dummy_action(cashier_types::ActionState::Processing),
            intents: vec![intent1.clone(), intent2.clone()],
            intent_txs,
        };

        when!(transaction_repository.update).then_return(changed_tx);

        when!(action_service.roll_up_state).then_return(Ok(action_resp));

        when!(ic_env.time).then_return(generate_timestamp());

        let transaction_service =
            TransactionService::new(transaction_repository, action_service, ic_env);

        let result = transaction_service.update_tx_state(&mut tx, TransactionState::Fail);

        assert!(result.is_ok());
        assert_eq!(tx.state, TransactionState::Fail);
    }

    // Should construct icrc 112 without dependencies success
    #[test]
    fn should_construct_icrc_112_without_dependencies_success() {
        let (_, _, _, transaction_repository, _, _, _, _, _) = setup_repositories();

        let action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();

        let action = create_dummy_action(cashier_types::ActionState::Created);

        let mut tx_a = create_dummy_transaction(TransactionState::Created);
        let mut tx_b = create_dummy_transaction(TransactionState::Created);

        tx_a.group = 1;
        tx_b.group = 1;

        let txs = vec![tx_a.clone(), tx_b.clone()];
        let link_id = Uuid::new_v4().to_string();

        when!(ic_env.id).then_return(Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap());

        let transaction_service =
            TransactionService::new(transaction_repository, action_service, ic_env);

        let icrc_112_requests =
            transaction_service.create_icrc_112(action.id, link_id.clone(), &txs);

        assert!(icrc_112_requests.is_some());
        let requests = icrc_112_requests.unwrap();
        assert_eq!(requests.len(), 1);
        let expected_ids = vec![tx_a.id.clone(), tx_b.id.clone()];
        for request in &requests[0] {
            assert!(expected_ids.contains(&request.nonce.clone().unwrap()));
        }
    }

    // Should create ICRC 112 requests with transactions having dependencies success
    #[test]
    fn should_create_icrc_112_requests_with_txs_have_dependencies_success() {
        let (_, _, _, transaction_repository, _, _, _, _, _) = setup_repositories();

        let action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();

        let action = create_dummy_action(cashier_types::ActionState::Created);

        let mut tx_a = create_dummy_transaction(TransactionState::Created);
        let mut tx_b = create_dummy_transaction(TransactionState::Created);
        let mut tx_c = create_dummy_transaction(TransactionState::Created);
        let mut tx_d = create_dummy_transaction(TransactionState::Created);

        tx_a.group = 1;
        tx_b.group = 1;
        tx_c.group = 1;
        tx_d.group = 2;

        tx_c.dependency = Some(vec![tx_b.id.clone()]);

        let txs = vec![tx_a.clone(), tx_b.clone(), tx_c.clone(), tx_d.clone()];
        let link_id = Uuid::new_v4().to_string();

        when!(ic_env.id).then_return(Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap());

        let transaction_service =
            TransactionService::new(transaction_repository, action_service, ic_env);

        let icrc_112_requests =
            transaction_service.create_icrc_112(action.id, link_id.clone(), &txs);

        assert!(icrc_112_requests.is_some());
        let requests = icrc_112_requests.unwrap();

        assert_eq!(requests.len(), 2);
        let expected_ids = vec![tx_a.id.clone(), tx_b.id.clone(), tx_d.id.clone()];

        for request in &requests[0] {
            assert!(expected_ids.contains(&request.nonce.clone().unwrap()));
        }

        assert_eq!(requests[1][0].nonce, Some(tx_c.id));
    }

    // Should create ICRC 112 requests follow group order and dependencies
    #[test]
    fn should_create_icrc_112_requests_follow_group_order_and_dependencies() {
        let (_, _, _, transaction_repository, _, _, _, _, _) = setup_repositories();

        let action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();

        let action = create_dummy_action(cashier_types::ActionState::Created);

        let mut tx_a = create_dummy_transaction(TransactionState::Created);
        let mut tx_b = create_dummy_transaction(TransactionState::Created);
        let mut tx_c = create_dummy_transaction(TransactionState::Created);
        let mut tx_d = create_dummy_transaction(TransactionState::Created);
        let mut tx_e = create_dummy_transaction(TransactionState::Created);

        tx_a.group = 1;
        tx_b.group = 1;
        tx_c.group = 1;
        tx_d.group = 2;
        tx_e.group = 3;

        tx_a.from_call_type = FromCallType::Wallet;
        tx_b.from_call_type = FromCallType::Wallet;
        tx_c.from_call_type = FromCallType::Wallet;
        tx_d.from_call_type = FromCallType::Canister;
        tx_e.from_call_type = FromCallType::Canister;

        tx_c.dependency = Some(vec![tx_b.id.clone()]);
        tx_e.dependency = Some(vec![tx_a.id.clone()]);

        let txs = vec![
            tx_a.clone(),
            tx_b.clone(),
            tx_c.clone(),
            tx_d.clone(),
            tx_e.clone(),
        ];
        let link_id = Uuid::new_v4().to_string();

        when!(ic_env.id).then_return(Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap());

        let transaction_service =
            TransactionService::new(transaction_repository, action_service, ic_env);

        let icrc_112_requests =
            transaction_service.create_icrc_112(action.id, link_id.clone(), &txs);

        assert!(icrc_112_requests.is_some());
        let requests = icrc_112_requests.unwrap();
        assert_eq!(requests.len(), 2);
        let expected_group_1_ids = vec![tx_a.id.clone(), tx_b.id.clone(), tx_d.id.clone()];
        let expected_group_2_ids = vec![tx_c.id.clone(), tx_e.id.clone()];

        for request in &requests[0] {
            assert!(expected_group_1_ids.contains(&request.nonce.clone().unwrap()));
        }

        for request in &requests[1] {
            assert!(expected_group_2_ids.contains(&request.nonce.clone().unwrap()));
        }
    }

    // Should create ICRC 112 for Tip link success
    #[test]
    fn should_create_icrc_112_for_tip_link_success() {
        let (_, _, _, transaction_repository, _, _, _, _, _) = setup_repositories();

        let action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();

        let action = create_dummy_action(cashier_types::ActionState::Created);

        let canister_id = Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap();
        let link_id = Uuid::new_v4().to_string();
        let fee_account = Account {
            owner: canister_id.clone(),
            subaccount: Some(to_subaccount(link_id.clone())),
        };

        let fee_wallet = Wallet {
            address: fee_account.to_string(),
            chain: cashier_types::Chain::IC,
        };

        let spender_wallet = Wallet {
            address: Account {
                owner: canister_id.clone(),
                subaccount: None,
            }
            .to_string(),
            chain: cashier_types::Chain::IC,
        };

        let mut tx_a = create_dummy_tx_protocol_for_tip_link(
            TransactionState::Created,
            "icrc1_transfer",
            &spender_wallet,
            &fee_wallet,
            &spender_wallet,
        );
        let mut tx_b = create_dummy_tx_protocol_for_tip_link(
            TransactionState::Created,
            "icrc2_approve",
            &spender_wallet,
            &fee_wallet,
            &spender_wallet,
        );
        let mut tx_c = create_dummy_tx_protocol_for_tip_link(
            TransactionState::Created,
            "icrc2_transfer_from",
            &spender_wallet,
            &fee_wallet,
            &spender_wallet,
        );

        tx_a.group = 1;
        tx_b.group = 1;
        tx_c.group = 1;

        tx_c.dependency = Some(vec![tx_b.id.clone()]);

        let txs = vec![tx_a.clone(), tx_b.clone(), tx_c.clone()];

        when!(ic_env.id).then_return(canister_id);

        let transaction_service =
            TransactionService::new(transaction_repository, action_service, ic_env);

        let icrc_112_requests =
            transaction_service.create_icrc_112(action.id, link_id.clone(), &txs);

        assert!(icrc_112_requests.is_some());
        let requests = icrc_112_requests.unwrap();

        assert_eq!(requests.len(), 2);
        for request in &requests[0] {
            if request.nonce == Some(tx_a.id.clone()) {
                assert_eq!(request.method, "icrc1_transfer".to_string());
                assert_eq!(request.canister_id, tx_a.get_asset().address);
                assert_eq!(request.nonce, Some(tx_a.id.clone()));
            } else if request.nonce == Some(tx_b.id.clone()) {
                assert_eq!(request.method, "icrc2_approve".to_string());
                assert_eq!(request.canister_id, tx_b.get_asset().address);
                assert_eq!(request.nonce, Some(tx_b.id.clone()));
            }
        }

        assert_eq!(requests[1][0].nonce, Some(tx_c.id.clone()));
        assert_eq!(requests[1][0].method, "trigger_transaction".to_string());
        assert_eq!(requests[1][0].canister_id, canister_id.to_text());
    }

    // Should create ICRC 112 for all canister transaction success
    #[test]
    fn should_create_icrc_112_for_all_canister_transaction_success() {
        let (_, _, _, transaction_repository, _, _, _, _, _) = setup_repositories();

        let action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();

        let action = create_dummy_action(cashier_types::ActionState::Created);

        let mut tx_a = create_dummy_tx_protocol(TransactionState::Created, "icrc2_transfer_from");
        let mut tx_b = create_dummy_tx_protocol(TransactionState::Created, "icrc2_transfer_from");
        let mut tx_c = create_dummy_tx_protocol(TransactionState::Created, "icrc2_transfer_from");
        let mut tx_d = create_dummy_tx_protocol(TransactionState::Created, "icrc2_transfer_from");
        let mut tx_e = create_dummy_tx_protocol(TransactionState::Created, "icrc2_transfer_from");

        tx_a.group = 1;
        tx_b.group = 1;
        tx_c.group = 1;
        tx_d.group = 2;
        tx_e.group = 3;

        tx_a.from_call_type = FromCallType::Canister;
        tx_b.from_call_type = FromCallType::Canister;
        tx_c.from_call_type = FromCallType::Canister;
        tx_d.from_call_type = FromCallType::Canister;
        tx_e.from_call_type = FromCallType::Canister;

        tx_c.dependency = Some(vec![tx_b.id.clone()]);
        tx_e.dependency = Some(vec![tx_a.id.clone()]);

        let txs = vec![
            tx_a.clone(),
            tx_b.clone(),
            tx_c.clone(),
            tx_d.clone(),
            tx_e.clone(),
        ];
        let link_id = Uuid::new_v4().to_string();
        let canister_id = Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap();

        when!(ic_env.id).then_return(canister_id);

        let transaction_service =
            TransactionService::new(transaction_repository, action_service, ic_env);

        let icrc_112_requests =
            transaction_service.create_icrc_112(action.id, link_id.clone(), &txs);

        assert!(icrc_112_requests.is_some());
        let requests = icrc_112_requests.unwrap();

        let expected_group_1_ids = vec![tx_a.id.clone(), tx_b.id.clone(), tx_d.id.clone()];
        let expected_group_2_ids = vec![tx_c.id.clone(), tx_e.id.clone()];

        assert_eq!(requests.len(), 2);

        for request in &requests[0] {
            assert!(expected_group_1_ids.contains(&request.nonce.clone().unwrap()));
            assert!(request.canister_id == canister_id.to_text());
            assert_eq!(request.method, "trigger_transaction".to_string());
        }

        for request in &requests[1] {
            assert!(expected_group_2_ids.contains(&request.nonce.clone().unwrap()));
            assert!(request.canister_id == canister_id.to_text());
            assert_eq!(request.method, "trigger_transaction".to_string());
        }
    }

    // Should create ICRC 112 for all canister transaction success
    #[test]
    fn should_handle_complicated_dependencies_success() {
        let (_, _, _, transaction_repository, _, _, _, _, _) = setup_repositories();

        let action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();

        let action = create_dummy_action(cashier_types::ActionState::Created);

        let mut tx_a = create_dummy_tx_protocol(TransactionState::Created, "icrc1_transfer");
        let mut tx_b = create_dummy_tx_protocol(TransactionState::Created, "icrc1_transfer");
        let mut tx_c = create_dummy_tx_protocol(TransactionState::Created, "icrc1_transfer");
        let mut tx_d = create_dummy_tx_protocol(TransactionState::Created, "icrc1_transfer");
        let mut tx_e = create_dummy_tx_protocol(TransactionState::Created, "icrc1_transfer");
        let mut tx_f = create_dummy_tx_protocol(TransactionState::Created, "icrc2_approve");
        let mut tx_g = create_dummy_tx_protocol(TransactionState::Created, "icrc1_transfer");
        let mut tx_h = create_dummy_tx_protocol(TransactionState::Created, "icrc1_transfer");
        let mut tx_i = create_dummy_tx_protocol(TransactionState::Created, "icrc2_transfer_from");

        tx_a.group = 1;
        tx_b.group = 1;
        tx_c.group = 1;
        tx_d.group = 2;
        tx_e.group = 2;
        tx_f.group = 2;
        tx_g.group = 3;
        tx_h.group = 3;
        tx_i.group = 3;

        tx_a.from_call_type = FromCallType::Wallet;
        tx_b.from_call_type = FromCallType::Wallet;
        tx_c.from_call_type = FromCallType::Wallet;
        tx_d.from_call_type = FromCallType::Wallet;
        tx_e.from_call_type = FromCallType::Wallet;
        tx_f.from_call_type = FromCallType::Wallet;
        tx_g.from_call_type = FromCallType::Wallet;
        tx_h.from_call_type = FromCallType::Wallet;
        tx_i.from_call_type = FromCallType::Canister;

        //E depend on A
        tx_e.dependency = Some(vec![tx_a.id.clone()]);
        // F depend on D and B
        tx_f.dependency = Some(vec![tx_d.id.clone(), tx_b.id.clone()]);
        // I depend on A, D, E
        tx_i.dependency = Some(vec![tx_a.id.clone(), tx_d.id.clone(), tx_e.id.clone()]);

        let txs = vec![
            tx_a.clone(),
            tx_b.clone(),
            tx_c.clone(),
            tx_d.clone(),
            tx_e.clone(),
            tx_f.clone(),
            tx_g.clone(),
            tx_h.clone(),
            tx_i.clone(),
        ];
        let link_id = Uuid::new_v4().to_string();
        let canister_id = Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap();

        when!(ic_env.id).then_return(canister_id);

        let transaction_service =
            TransactionService::new(transaction_repository, action_service, ic_env);

        let icrc_112_requests =
            transaction_service.create_icrc_112(action.id, link_id.clone(), &txs);

        assert!(icrc_112_requests.is_some());
        let requests = icrc_112_requests.unwrap();

        assert_eq!(requests.len(), 3);
        let expected_group_1_ids = vec![
            tx_a.id.clone(),
            tx_b.id.clone(),
            tx_c.id.clone(),
            tx_d.id.clone(),
            tx_g.id.clone(),
            tx_h.id.clone(),
        ];
        let expected_group_2_ids = vec![tx_e.id.clone(), tx_f.id.clone()];
        let expected_group_3_ids = vec![tx_i.id.clone()];

        for request in &requests[0] {
            assert!(expected_group_1_ids.contains(&request.nonce.clone().unwrap()));
        }

        for request in &requests[1] {
            assert!(expected_group_2_ids.contains(&request.nonce.clone().unwrap()));
        }

        for request in &requests[2] {
            assert!(expected_group_3_ids.contains(&request.nonce.clone().unwrap()));
        }
    }

    #[test]
    fn should_able_to_decode_arguments_back() {
        let (_, _, _, transaction_repository, _, _, _, _, _) = setup_repositories();

        let action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();

        let action = create_dummy_action(cashier_types::ActionState::Created);

        let canister_id = Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap();
        let link_id = Uuid::new_v4().to_string();

        let txs = vec![];

        when!(ic_env.id).then_return(canister_id);

        let transaction_service =
            TransactionService::new(transaction_repository, action_service, ic_env);

        let icrc_112_requests =
            transaction_service.create_icrc_112(action.id, link_id.clone(), &txs);

        assert!(icrc_112_requests.is_none());
    }
}
