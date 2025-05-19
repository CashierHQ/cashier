// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use cashier_types::{ActionState, IntentState, TransactionState};
    use faux::when;

    use crate::{
        services::{
            __tests__::tests::{
                create_dummy_action, create_dummy_intent, create_dummy_transaction,
                MockIcEnvironment,
            },
            transaction_manager::{
                action::ActionService, execute_transaction::ExecuteTransactionService,
                manual_check_status::ManualCheckStatusService, transaction::TransactionService,
                TransactionManagerService,
            },
        },
        types::{error::CanisterError, transaction_manager::ActionData},
    };

    //TS1: Should return fail if there is no dependency
    #[tokio::test]
    async fn should_return_false_when_no_dependency() {
        let mut transaction_service = TransactionService::faux();
        let mut action_service = ActionService::faux();
        let manual_check_status_service: ManualCheckStatusService<MockIcEnvironment> =
            ManualCheckStatusService::faux();
        let execute_transaction_service = ExecuteTransactionService::faux();

        let action = create_dummy_action(ActionState::Processing);
        let intent1 = create_dummy_intent(IntentState::Processing);
        let intent2 = create_dummy_intent(IntentState::Processing);
        let mut tx1 = create_dummy_transaction(TransactionState::Processing);
        let mut tx2 = create_dummy_transaction(TransactionState::Processing);

        let mut intent_txs = HashMap::new();
        let ic_env = MockIcEnvironment::faux();

        tx1.dependency = None;
        tx1.group = 1;
        tx2.dependency = Some(vec![]);
        tx2.group = 2;

        intent_txs.insert(intent1.id.clone(), vec![tx1.clone()]);
        intent_txs.insert(intent2.id.clone(), vec![tx2.clone()]);

        when!(transaction_service.get_tx_by_id(tx1.id.clone()))
            .once()
            .then_return(Ok(tx1.clone()));

        when!(action_service.get_action_by_tx_id(tx1.id.clone()))
            .once()
            .then_return(Ok(ActionData {
                action: action.clone(),
                intents: vec![intent1.clone(), intent2.clone()],
                intent_txs: intent_txs.clone(),
            }));

        when!(transaction_service.get_tx_by_id(tx2.id.clone()))
            .once()
            .then_return(Ok(tx2.clone()));
        when!(action_service.get_action_by_tx_id(tx2.id.clone()))
            .once()
            .then_return(Ok(ActionData {
                action: action.clone(),
                intents: vec![intent1.clone(), intent2.clone()],
                intent_txs: intent_txs.clone(),
            }));

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                manual_check_status_service,
                ic_env,
                execute_transaction_service,
            );

        let result = transaction_manager_service.has_dependency(tx1.id).await;
        let result2 = transaction_manager_service.has_dependency(tx2.id).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), false);
        assert!(result2.is_ok());
        assert_eq!(result2.unwrap(), false);
    }

    //TS2:  Should return true if any dependencies is not success
    #[tokio::test]
    async fn should_return_true_when_depedencies_not_success() {
        let mut transaction_service = TransactionService::faux();
        let mut action_service = ActionService::faux();
        let manual_check_status_service: ManualCheckStatusService<MockIcEnvironment> =
            ManualCheckStatusService::faux();
        let execute_transaction_service = ExecuteTransactionService::faux();

        let ic_env = MockIcEnvironment::faux();

        let action = create_dummy_action(ActionState::Processing);
        let intent1 = create_dummy_intent(IntentState::Processing);
        let intent2 = create_dummy_intent(IntentState::Processing);

        let mut tx_a = create_dummy_transaction(TransactionState::Processing);
        let mut tx_b = create_dummy_transaction(TransactionState::Processing);
        tx_b.group = 1;
        let mut tx_c = create_dummy_transaction(TransactionState::Fail);
        tx_c.group = 1;
        let mut tx_d = create_dummy_transaction(TransactionState::Success);
        tx_d.group = 1;

        let mut intent_txs = HashMap::new();

        let list_tx_dependency = vec![tx_b.clone(), tx_c.clone(), tx_d.clone()];
        let tx_a_dependency = vec![tx_b.id.clone(), tx_c.id.clone(), tx_d.id.clone()];

        tx_a.dependency = Some(tx_a_dependency.clone());
        tx_a.group = 2;

        intent_txs.insert(
            intent1.id.clone(),
            vec![tx_b.clone(), tx_c.clone(), tx_d.clone()],
        );
        intent_txs.insert(intent2.id.clone(), vec![tx_a.clone()]);

        when!(transaction_service.get_tx_by_id(tx_a.id.clone()))
            .once()
            .then_return(Ok(tx_a.clone()));

        when!(transaction_service.batch_get)
            .once()
            .then_return(Ok(vec![tx_b.clone(), tx_c.clone(), tx_d.clone()]));

        when!(action_service.get_action_by_tx_id(tx_a.id.clone()))
            .once()
            .then_return(Ok(ActionData {
                action: action.clone(),
                intents: vec![intent1.clone(), intent2.clone()],
                intent_txs: intent_txs.clone(),
            }));

        when!(transaction_service.batch_get(tx_a_dependency.clone()))
            .then_return(Ok(list_tx_dependency));

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                manual_check_status_service,
                ic_env,
                execute_transaction_service,
            );

        let result = transaction_manager_service.has_dependency(tx_a.id).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), true);
    }

    //TS3: Should return false if all dependencies is success
    #[tokio::test]
    async fn should_return_false_when_depedencies_all_success() {
        let mut transaction_service = TransactionService::faux();
        let mut action_service = ActionService::faux();
        let manual_check_status_service: ManualCheckStatusService<MockIcEnvironment> =
            ManualCheckStatusService::faux();
        let execute_transaction_service = ExecuteTransactionService::faux();

        let ic_env = MockIcEnvironment::faux();

        let action = create_dummy_action(ActionState::Processing);
        let intent1 = create_dummy_intent(IntentState::Processing);
        let intent2 = create_dummy_intent(IntentState::Processing);

        let mut tx_a = create_dummy_transaction(TransactionState::Processing);
        let mut tx_b = create_dummy_transaction(TransactionState::Success);
        tx_b.group = 1;
        let mut tx_c = create_dummy_transaction(TransactionState::Success);
        tx_c.group = 1;
        let mut tx_d = create_dummy_transaction(TransactionState::Success);
        tx_d.group = 1;

        let mut intent_txs = HashMap::new();

        let list_tx_dependency = vec![tx_b.clone(), tx_c.clone(), tx_d.clone()];
        let tx_a_dependency = vec![tx_b.id.clone(), tx_c.id.clone(), tx_d.id.clone()];

        tx_a.dependency = Some(tx_a_dependency.clone());
        tx_a.group = 2;

        intent_txs.insert(
            intent1.id.clone(),
            vec![tx_b.clone(), tx_c.clone(), tx_d.clone()],
        );
        intent_txs.insert(intent2.id.clone(), vec![tx_a.clone()]);

        when!(transaction_service.get_tx_by_id(tx_a.id.clone()))
            .once()
            .then_return(Ok(tx_a.clone()));

        when!(transaction_service.batch_get)
            .once()
            .then_return(Ok(vec![tx_b.clone(), tx_c.clone(), tx_d.clone()]));

        when!(action_service.get_action_by_tx_id(tx_a.id.clone()))
            .once()
            .then_return(Ok(ActionData {
                action: action.clone(),
                intents: vec![intent1.clone(), intent2.clone()],
                intent_txs: intent_txs.clone(),
            }));

        when!(transaction_service.batch_get(tx_a_dependency.clone()))
            .then_return(Ok(list_tx_dependency));

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                manual_check_status_service,
                ic_env,
                execute_transaction_service,
            );

        let result = transaction_manager_service.has_dependency(tx_a.id).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), false);
    }

    //TS4: Should return false if all tx in group dont have dependencies
    #[tokio::test]
    async fn should_return_false_when_all_tx_in_group_dont_have_dependencies() {
        let mut transaction_service = TransactionService::faux();
        let mut action_service = ActionService::faux();
        let manual_check_status_service: ManualCheckStatusService<MockIcEnvironment> =
            ManualCheckStatusService::faux();

        let execute_transaction_service = ExecuteTransactionService::faux();

        let ic_env = MockIcEnvironment::faux();

        let action = create_dummy_action(ActionState::Created);
        let intent1 = create_dummy_intent(IntentState::Created);
        let intent2 = create_dummy_intent(IntentState::Created);

        let mut tx_a = create_dummy_transaction(TransactionState::Created);
        let mut tx_b = create_dummy_transaction(TransactionState::Created);
        tx_b.group = 1;
        let mut tx_c = create_dummy_transaction(TransactionState::Created);
        tx_c.group = 1;
        let mut tx_d = create_dummy_transaction(TransactionState::Created);
        tx_d.group = 1;
        let mut intent_txs = HashMap::new();
        tx_a.group = 1;

        intent_txs.insert(
            intent1.id.clone(),
            vec![tx_b.clone(), tx_c.clone(), tx_d.clone()],
        );
        intent_txs.insert(intent2.id.clone(), vec![tx_a.clone()]);

        when!(transaction_service.get_tx_by_id(tx_a.id.clone()))
            .once()
            .then_return(Ok(tx_a.clone()));

        when!(transaction_service.batch_get)
            .once()
            .then_return(Ok(vec![tx_b.clone(), tx_c.clone(), tx_d.clone()]));

        when!(action_service.get_action_by_tx_id(tx_a.id.clone()))
            .once()
            .then_return(Ok(ActionData {
                action: action.clone(),
                intents: vec![intent1.clone(), intent2.clone()],
                intent_txs: intent_txs.clone(),
            }));
        when!(transaction_service.get_tx_by_id(tx_b.id.clone()))
            .once()
            .then_return(Ok(tx_b.clone()));

        when!(transaction_service.get_tx_by_id(tx_c.id.clone()))
            .once()
            .then_return(Ok(tx_c.clone()));

        when!(transaction_service.get_tx_by_id(tx_d.id.clone()))
            .once()
            .then_return(Ok(tx_d.clone()));

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                manual_check_status_service,
                ic_env,
                execute_transaction_service,
            );

        let result = transaction_manager_service.has_dependency(tx_a.id).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), false);
    }

    //TS5: Should return true if any tx in group have dependencies
    #[tokio::test]
    async fn should_return_false_when_if_any_tx_in_group_have_dependencies() {
        let mut transaction_service = TransactionService::faux();
        let mut action_service = ActionService::faux();
        let manual_check_status_service: ManualCheckStatusService<MockIcEnvironment> =
            ManualCheckStatusService::faux();
        let execute_transaction_service = ExecuteTransactionService::faux();

        let ic_env = MockIcEnvironment::faux();

        let action = create_dummy_action(ActionState::Created);
        let intent1 = create_dummy_intent(IntentState::Created);
        let intent2 = create_dummy_intent(IntentState::Created);

        let mut tx_a = create_dummy_transaction(TransactionState::Created);
        let mut tx_b = create_dummy_transaction(TransactionState::Created);
        let mut tx_c = create_dummy_transaction(TransactionState::Created);
        tx_b.group = 2;
        tx_c.group = 2;
        tx_a.group = 2;

        let mut tx_d = create_dummy_transaction(TransactionState::Success);
        tx_d.group = 1;
        let tx_e = create_dummy_transaction(TransactionState::Success);
        tx_d.group = 1;

        tx_b.dependency = Some(vec![tx_d.id.clone()]);
        tx_c.dependency = Some(vec![tx_e.id.clone()]);

        let mut intent_txs = HashMap::new();

        intent_txs.insert(intent1.id.clone(), vec![tx_d.clone(), tx_e.clone()]);
        intent_txs.insert(
            intent2.id.clone(),
            vec![tx_a.clone(), tx_b.clone(), tx_c.clone()],
        );

        when!(transaction_service.get_tx_by_id(tx_a.id.clone()))
            .once()
            .then_return(Ok(tx_a.clone()));

        when!(transaction_service.get_tx_by_id(tx_b.id.clone()))
            .once()
            .then_return(Ok(tx_b.clone()));

        when!(transaction_service.get_tx_by_id(tx_c.id.clone()))
            .once()
            .then_return(Ok(tx_c.clone()));

        when!(transaction_service.get_tx_by_id(tx_d.id.clone()))
            .once()
            .then_return(Ok(tx_d.clone()));

        when!(transaction_service.get_tx_by_id(tx_e.id.clone()))
            .once()
            .then_return(Ok(tx_e.clone()));

        let b_dependency = tx_b.dependency.clone().unwrap();

        when!(transaction_service.batch_get(b_dependency))
            .once()
            .then_return(Ok(vec![tx_d.clone()]));

        let c_dependency = tx_c.dependency.clone().unwrap();

        when!(transaction_service.batch_get(c_dependency))
            .once()
            .then_return(Ok(vec![tx_e.clone()]));

        when!(action_service.get_action_by_tx_id(tx_a.id.clone()))
            .once()
            .then_return(Ok(ActionData {
                action: action.clone(),
                intents: vec![intent1.clone(), intent2.clone()],
                intent_txs: intent_txs.clone(),
            }));

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                manual_check_status_service,
                ic_env,
                execute_transaction_service,
            );

        let result = transaction_manager_service.has_dependency(tx_a.id).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), false);
    }

    //TS6: Should return false if any tx in group have dependencies but all success
    #[tokio::test]
    async fn should_return_true_when_if_any_tx_in_group_have_dependencies() {
        let mut transaction_service = TransactionService::faux();
        let mut action_service = ActionService::faux();
        let manual_check_status_service: ManualCheckStatusService<MockIcEnvironment> =
            ManualCheckStatusService::faux();
        let execute_transaction_service = ExecuteTransactionService::faux();

        let ic_env = MockIcEnvironment::faux();

        let action = create_dummy_action(ActionState::Created);
        let intent1 = create_dummy_intent(IntentState::Created);
        let intent2 = create_dummy_intent(IntentState::Created);

        let mut tx_a = create_dummy_transaction(TransactionState::Created);
        let mut tx_b = create_dummy_transaction(TransactionState::Created);
        let mut tx_c = create_dummy_transaction(TransactionState::Created);
        tx_b.group = 2;
        tx_c.group = 2;
        tx_a.group = 2;

        let mut tx_d = create_dummy_transaction(TransactionState::Success);
        tx_d.group = 1;
        let mut tx_e = create_dummy_transaction(TransactionState::Processing);
        tx_e.group = 1;

        tx_b.dependency = Some(vec![tx_d.id.clone()]);
        tx_c.dependency = Some(vec![tx_e.id.clone()]);

        let mut intent_txs = HashMap::new();

        intent_txs.insert(intent1.id.clone(), vec![tx_d.clone(), tx_e.clone()]);
        intent_txs.insert(
            intent2.id.clone(),
            vec![tx_a.clone(), tx_b.clone(), tx_c.clone()],
        );

        when!(transaction_service.get_tx_by_id(tx_a.id.clone()))
            .once()
            .then_return(Ok(tx_a.clone()));

        when!(transaction_service.get_tx_by_id(tx_b.id.clone()))
            .once()
            .then_return(Ok(tx_b.clone()));

        when!(transaction_service.get_tx_by_id(tx_c.id.clone()))
            .once()
            .then_return(Ok(tx_c.clone()));

        when!(transaction_service.get_tx_by_id(tx_d.id.clone()))
            .once()
            .then_return(Ok(tx_d.clone()));

        when!(transaction_service.get_tx_by_id(tx_e.id.clone()))
            .once()
            .then_return(Ok(tx_e.clone()));

        let b_dependency = tx_b.dependency.clone().unwrap();

        when!(transaction_service.batch_get(b_dependency))
            .once()
            .then_return(Ok(vec![tx_d.clone()]));

        let c_dependency = tx_c.dependency.clone().unwrap();

        when!(transaction_service.batch_get(c_dependency))
            .once()
            .then_return(Ok(vec![tx_e.clone()]));

        when!(action_service.get_action_by_tx_id(tx_a.id.clone()))
            .once()
            .then_return(Ok(ActionData {
                action: action.clone(),
                intents: vec![intent1.clone(), intent2.clone()],
                intent_txs: intent_txs.clone(),
            }));

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                manual_check_status_service,
                ic_env,
                execute_transaction_service,
            );

        let result = transaction_manager_service.has_dependency(tx_a.id).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), true);
    }
    //TS7: Should throw error if tx A depends on a transaction that does not exist (invalid dependency)
    #[tokio::test]
    async fn should_return_false_when_all_depedencies_success() {
        let mut transaction_service = TransactionService::faux();
        let action_service = ActionService::faux();
        let manual_check_status_service: ManualCheckStatusService<MockIcEnvironment> =
            ManualCheckStatusService::faux();
        let ic_env = MockIcEnvironment::faux();
        let execute_transaction_service = ExecuteTransactionService::faux();

        let mut tx_a = create_dummy_transaction(TransactionState::Processing);
        let tx_b = create_dummy_transaction(TransactionState::Processing);
        let tx_c = create_dummy_transaction(TransactionState::Processing);
        let tx_d = create_dummy_transaction(TransactionState::Processing);

        tx_a.dependency = Some(vec![tx_b.id.clone(), tx_c.id.clone(), tx_d.id.clone()]);

        when!(transaction_service.get_tx_by_id)
            .once()
            .then_return(Ok(tx_a.clone()));

        when!(transaction_service.batch_get)
            .once()
            .then_return(Err(CanisterError::NotFound(
                "Some transactions not found".to_string(),
            )));

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                manual_check_status_service,
                ic_env,
                execute_transaction_service,
            );

        let result = transaction_manager_service.has_dependency(tx_a.id).await;

        assert!(result.is_err());
    }

    //TS6: Should return false if any tx in group have dependencies but all success
    #[tokio::test]
    async fn should_return_false_if_tx_have_dependencies_but_in_same_group() {
        let mut transaction_service = TransactionService::faux();
        let mut action_service = ActionService::faux();
        let manual_check_status_service: ManualCheckStatusService<MockIcEnvironment> =
            ManualCheckStatusService::faux();

        let execute_transaction_service = ExecuteTransactionService::faux();

        let ic_env = MockIcEnvironment::faux();

        let action = create_dummy_action(ActionState::Created);
        let intent1 = create_dummy_intent(IntentState::Created);
        let intent2 = create_dummy_intent(IntentState::Created);

        let mut tx_a = create_dummy_transaction(TransactionState::Created);
        let mut tx_b = create_dummy_transaction(TransactionState::Created);
        tx_b.group = 1;
        let mut tx_c = create_dummy_transaction(TransactionState::Created);
        tx_c.group = 1;
        let mut tx_d = create_dummy_transaction(TransactionState::Created);
        tx_d.group = 1;
        let mut intent_txs = HashMap::new();
        tx_a.group = 1;
        tx_d.dependency = Some(vec![tx_a.id.clone()]);

        intent_txs.insert(
            intent1.id.clone(),
            vec![tx_b.clone(), tx_c.clone(), tx_d.clone()],
        );
        intent_txs.insert(intent2.id.clone(), vec![tx_a.clone()]);

        when!(transaction_service.get_tx_by_id(tx_a.id.clone()))
            .once()
            .then_return(Ok(tx_a.clone()));

        when!(transaction_service.batch_get)
            .once()
            .then_return(Ok(vec![tx_b.clone(), tx_c.clone(), tx_d.clone()]));

        when!(action_service.get_action_by_tx_id(tx_a.id.clone()))
            .once()
            .then_return(Ok(ActionData {
                action: action.clone(),
                intents: vec![intent1.clone(), intent2.clone()],
                intent_txs: intent_txs.clone(),
            }));
        when!(transaction_service.get_tx_by_id(tx_b.id.clone()))
            .once()
            .then_return(Ok(tx_b.clone()));

        when!(transaction_service.get_tx_by_id(tx_c.id.clone()))
            .once()
            .then_return(Ok(tx_c.clone()));

        when!(transaction_service.get_tx_by_id(tx_d.id.clone()))
            .once()
            .then_return(Ok(tx_d.clone()));

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                manual_check_status_service,
                ic_env,
                execute_transaction_service,
            );

        let result = transaction_manager_service.has_dependency(tx_a.id).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), false);
    }
}
