// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    link_v2::{
        graph::Graph,
        transaction_manager::{RollupActionStateResult, ValidateActionTransactionsResult},
    },
    link_v3::transaction_manager::RollupActionStateResultV3,
    repository::{
        action::{
            v1::{Action, ActionState},
            v3::ActionV3,
        },
        intent::{
            v1::{Intent, IntentState},
            v3::IntentV3,
        },
        transaction::v1::{FromCallType, Transaction, TransactionState},
    },
};
use std::collections::HashMap;

use crate::{
    transaction::traits::{TransactionValidator, ValidationService},
    utils::topological_sort::kahn_topological_sort,
};

pub struct IcValidatorService<V: TransactionValidator + Clone> {
    validator: V,
}

impl<V: TransactionValidator + Clone> IcValidatorService<V> {
    pub fn new(validator: V) -> Self {
        Self { validator }
    }
}

impl<V: TransactionValidator + Clone> ValidationService for IcValidatorService<V> {
    async fn validate_action_transactions(
        &self,
        transactions: &[Transaction],
    ) -> Result<ValidateActionTransactionsResult, CanisterError> {
        let mut errors = Vec::<String>::new();
        let mut is_success = true;
        let validator = self.validator.clone();

        let txs_map: HashMap<&str, &Transaction> =
            transactions.iter().map(|tx| (tx.id.as_str(), tx)).collect();

        // split canister and wallet transactions
        let (canister_transactions, mut wallet_transactions): (Vec<Transaction>, Vec<Transaction>) =
            transactions
                .iter()
                .cloned()
                .partition(|tx| tx.from_call_type == FromCallType::Canister);

        // verify ICRC1 wallet transactions in topological order and update their status
        // the ICRC2 wallet transactions verification is skipped because they are verified during execution
        let icrc1_wallet_transactions = wallet_transactions
            .iter()
            .filter(|tx| tx.is_icrc1())
            .cloned()
            .collect::<Vec<_>>();

        let graph: Graph = icrc1_wallet_transactions.into();
        let sorted_levels = kahn_topological_sort(&graph)?;

        for level_txids in sorted_levels.iter() {
            // validate all transactions in the same level in parallel
            let level_txs = level_txids
                .iter()
                .map(|txid| {
                    txs_map.get(txid.as_str()).cloned().ok_or_else(|| {
                        CanisterError::HandleLogicError(format!(
                            "Transaction with id {} not found",
                            txid
                        ))
                    })
                })
                .collect::<Result<Vec<_>, _>>()?;

            let futures = level_txs
                .iter()
                .map(|&tx| validator.validate_success(tx.clone()))
                .collect::<Vec<_>>();
            let results = futures::future::join_all(futures).await;

            for (txid, result) in level_txids.iter().zip(results.into_iter()) {
                let mut updated_tx = txs_map
                    .get(txid.as_str())
                    .cloned()
                    .ok_or_else(|| {
                        CanisterError::HandleLogicError(format!(
                            "Transaction with id {} not found",
                            txid
                        ))
                    })?
                    .clone();
                match result {
                    Ok(_) => {
                        updated_tx.state = TransactionState::Success;
                    }
                    Err(e) => {
                        updated_tx.state = TransactionState::Fail;
                        is_success = false;
                        errors.push(format!("Failed to validate transaction {}: {}", txid, e));
                    }
                }
                // update in wallet transactions
                if let Some(pos) = wallet_transactions
                    .iter()
                    .position(|wtx| wtx.id == updated_tx.id)
                {
                    wallet_transactions[pos] = updated_tx;
                }
            }
        }

        Ok(ValidateActionTransactionsResult {
            wallet_transactions,
            canister_transactions,
            is_success,
            errors,
        })
    }

    fn rollup_icrc2_wallet_transaction_state(&self, transactions: &mut [Transaction]) {
        // Build dependent_map with immutable borrows
        let mut dependent_map: HashMap<String, Vec<TransactionState>> = HashMap::new();

        for tx in transactions.iter() {
            if let Some(deps) = &tx.dependency {
                for dep in deps.iter() {
                    dependent_map
                        .entry(dep.clone())
                        .or_default()
                        .push(tx.state.clone());
                }
            }
        }

        // Now mutably iterate and update
        // Skip Success transactions to preserve validated state on retry
        for tx in transactions.iter_mut() {
            if tx.is_icrc2_approve()
                && tx.from_call_type == FromCallType::Wallet
                && tx.state != TransactionState::Success
                && let Some(dependent_states) = dependent_map.get(&tx.id)
            {
                if dependent_states.contains(&TransactionState::Fail) {
                    tx.state = TransactionState::Fail;
                } else if dependent_states
                    .iter()
                    .all(|state| *state == TransactionState::Success)
                {
                    tx.state = TransactionState::Success;
                }
            }
        }
    }

    fn rollup_action_state(
        &self,
        action: Action,
        intents: &[Intent],
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Result<RollupActionStateResult, CanisterError> {
        // rollup intent state from its transactions state
        let mut updated_intents = Vec::<Intent>::new();
        for intent in intents.iter() {
            let mut updated_intent = intent.clone();
            if let Some(txs) = intent_txs_map.get(&intent.id) {
                let all_success = txs.iter().all(|tx| tx.state == TransactionState::Success);
                let any_fail = txs.iter().any(|tx| tx.state == TransactionState::Fail);

                if all_success {
                    updated_intent.state = IntentState::Success;
                } else if any_fail {
                    updated_intent.state = IntentState::Fail;
                }
            }
            updated_intents.push(updated_intent);
        }

        // rollup action state from its intents state
        let mut updated_action = action;
        let all_intent_success = updated_intents
            .iter()
            .all(|intent| intent.state == IntentState::Success);
        let any_intent_fail = updated_intents
            .iter()
            .any(|intent| intent.state == IntentState::Fail);

        if all_intent_success {
            updated_action.state = ActionState::Success;
        } else if any_intent_fail {
            updated_action.state = ActionState::Fail;
        }

        Ok(RollupActionStateResult {
            action: updated_action,
            intents: updated_intents,
            intent_txs_map,
        })
    }

    fn rollup_action_state_v3(
        &self,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Result<RollupActionStateResultV3, CanisterError> {
        // rollup intent state from its transactions state
        let mut updated_intents = Vec::<IntentV3>::new();
        for intent in intents.iter() {
            let mut updated_intent = intent.clone();
            if let Some(txs) = intent_txs_map.get(&intent.id) {
                let all_success = txs.iter().all(|tx| tx.state == TransactionState::Success);
                let any_fail = txs.iter().any(|tx| tx.state == TransactionState::Fail);

                if all_success {
                    updated_intent.state = IntentState::Success;
                } else if any_fail {
                    updated_intent.state = IntentState::Fail;
                }
            }
            updated_intents.push(updated_intent);
        }

        // rollup action state from its intents state
        let mut updated_action = action;
        let all_intent_success = updated_intents
            .iter()
            .all(|intent| intent.state == IntentState::Success);
        let any_intent_fail = updated_intents
            .iter()
            .any(|intent| intent.state == IntentState::Fail);

        if all_intent_success {
            updated_action.state = ActionState::Success;
        } else if any_intent_fail {
            updated_action.state = ActionState::Fail;
        }

        Ok(RollupActionStateResultV3 {
            action: updated_action,
            intents: updated_intents,
            intent_txs_map,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::test_utils::{
        generate_mock_create_action, generate_mock_icrc1_wallet_to_link_transactions,
        generate_mock_icrc2_wallet_to_link_transactions,
        generate_mock_wallet_to_treasury_transactions,
    };
    use candid::Nat;
    use cashier_backend_types::repository::action::v1::ActionState;
    use cashier_backend_types::repository::action::v1::ActionType;
    use cashier_backend_types::repository::action::v3::ActionV3;
    use cashier_backend_types::repository::asset::v1::Asset;
    use cashier_backend_types::repository::asset::v3::AssetV3;
    use cashier_backend_types::repository::common::AddressTypeV3;
    use cashier_backend_types::repository::intent::v1::{IntentState, IntentTask};
    use cashier_backend_types::repository::intent::v3::{IntentTypeV3, IntentV3};
    use cashier_backend_types::repository::transaction::v1::{Transaction, TransactionState};
    use cashier_common::test_utils::random_principal_id;
    use std::collections::HashMap;
    use std::future::Future;
    use std::pin::Pin;

    // Mock TransactionValidator
    #[derive(Clone)]
    struct MockValidator {
        should_fail: HashMap<String, bool>,
    }

    impl MockValidator {
        fn new() -> Self {
            Self {
                should_fail: HashMap::new(),
            }
        }

        fn set_failure(&mut self, tx_id: &str, fail: bool) {
            self.should_fail.insert(tx_id.to_string(), fail);
        }

        fn is_fail(&self, tx_id: &str) -> bool {
            *self.should_fail.get(tx_id).unwrap_or(&false)
        }
    }

    impl TransactionValidator for MockValidator {
        fn validate_success(
            &self,
            tx: Transaction,
        ) -> Pin<Box<dyn Future<Output = Result<(), String>>>> {
            let fail = self.is_fail(&tx.id);
            Box::pin(async move {
                if fail {
                    Err("mock fail".to_string())
                } else {
                    Ok(())
                }
            })
        }
    }

    fn fixture_action_and_intents_v3()
    -> (ActionV3, Vec<IntentV3>, HashMap<String, Vec<Transaction>>) {
        let creator = random_principal_id();
        let fee_intent = IntentV3 {
            id: "fee_intent".to_string(),
            label: "fee".to_string(),
            intent_type: IntentTypeV3::Send,
            asset: AssetV3::default(),
            amount: Nat::from(100u64),
            total_amount: Some(Nat::from(100u64)),
            network_fee: None,
            user_fee: None,
            source_address: creator,
            source_account: None,
            source_address_type: AddressTypeV3::Creator,
            dest_address: random_principal_id(),
            dest_account: None,
            dest_address_type: AddressTypeV3::Treasury,
            intent_tx_data: None,
            dependencies: vec![],
            action_id: "action_v3".to_string(),
            state: IntentState::Created,
            created_at: 0,
        };

        let asset_intent = IntentV3 {
            id: "asset_intent".to_string(),
            label: "asset".to_string(),
            intent_type: IntentTypeV3::Send,
            asset: AssetV3::default(),
            amount: Nat::from(500u64),
            total_amount: Some(Nat::from(500u64)),
            network_fee: None,
            user_fee: None,
            source_address: creator,
            source_account: None,
            source_address_type: AddressTypeV3::Creator,
            dest_address: random_principal_id(),
            dest_account: None,
            dest_address_type: AddressTypeV3::Link,
            intent_tx_data: None,
            dependencies: vec![],
            action_id: "action_v3".to_string(),
            state: IntentState::Created,
            created_at: 0,
        };

        let action = ActionV3 {
            id: "action_v3".to_string(),
            action_type: ActionType::CreateLink,
            state: ActionState::Created,
            creator,
            creator_address_type: AddressTypeV3::Creator,
            link_id: "link_v3".to_string(),
            intent_ids: vec![fee_intent.id.clone(), asset_intent.id.clone()],
        };

        let fee_tx = Transaction {
            id: "fee_tx".to_string(),
            created_at: 0,
            state: TransactionState::Created,
            dependency: None,
            group: 0,
            from_call_type:
                cashier_backend_types::repository::transaction::v1::FromCallType::Wallet,
            protocol: cashier_backend_types::repository::transaction::v1::Protocol::IC(
                cashier_backend_types::repository::transaction::v1::IcTransaction::Icrc1Transfer(
                    cashier_backend_types::repository::transaction::v1::Icrc1Transfer {
                        from: cashier_backend_types::repository::common::Wallet::default(),
                        to: cashier_backend_types::repository::common::Wallet::default(),
                        asset: Asset::default(),
                        amount: Nat::from(100u64),
                        memo: None,
                        ts: None,
                    },
                ),
            ),
            start_ts: None,
        };
        let asset_tx = Transaction {
            id: "asset_tx".to_string(),
            created_at: 0,
            state: TransactionState::Created,
            dependency: None,
            group: 0,
            from_call_type:
                cashier_backend_types::repository::transaction::v1::FromCallType::Wallet,
            protocol: cashier_backend_types::repository::transaction::v1::Protocol::IC(
                cashier_backend_types::repository::transaction::v1::IcTransaction::Icrc1Transfer(
                    cashier_backend_types::repository::transaction::v1::Icrc1Transfer {
                        from: cashier_backend_types::repository::common::Wallet::default(),
                        to: cashier_backend_types::repository::common::Wallet::default(),
                        asset: Asset::default(),
                        amount: Nat::from(500u64),
                        memo: None,
                        ts: None,
                    },
                ),
            ),
            start_ts: None,
        };

        let mut intent_txs_map = HashMap::new();
        intent_txs_map.insert(fee_intent.id.clone(), vec![fee_tx]);
        intent_txs_map.insert(asset_intent.id.clone(), vec![asset_tx]);

        (action, vec![fee_intent, asset_intent], intent_txs_map)
    }

    #[tokio::test]
    async fn it_should_validate_icrc2_create_action_transaction_success() {
        // Arrange
        let mut mock_validator = MockValidator::new();

        let from = random_principal_id();
        let cashier_be = random_principal_id();
        let treasury = random_principal_id();
        let link_account = random_principal_id();
        let fee_txs = generate_mock_wallet_to_treasury_transactions(from, cashier_be, treasury);
        let asset: Asset = Asset::default();
        let amount = Nat::from(1000u64);
        let asset_txs = generate_mock_icrc2_wallet_to_link_transactions(
            from,
            cashier_be,
            link_account,
            asset,
            amount,
        );
        let all_txs: Vec<Transaction> = [fee_txs.clone(), asset_txs.clone()].concat();
        mock_validator.set_failure(&fee_txs[0].id, true);
        mock_validator.set_failure(&asset_txs[0].id, true);
        let service = IcValidatorService::new(mock_validator);

        // Act
        let result = service
            .validate_action_transactions(&all_txs)
            .await
            .unwrap();

        // Assert
        assert!(result.is_success);
        assert!(result.errors.is_empty());
        assert_eq!(result.wallet_transactions.len(), 2);
        assert_eq!(result.canister_transactions.len(), 2);
    }

    #[tokio::test]
    async fn it_should_validate_icrc1_create_action_transaction_failed() {
        // Arrange
        let mut mock_validator = MockValidator::new();
        let from = random_principal_id();
        let cashier_be = random_principal_id();
        let treasury = random_principal_id();
        let link_account = random_principal_id();
        let asset: Asset = Asset::default();
        let amount = Nat::from(1000u64);
        let fee_tx = generate_mock_wallet_to_treasury_transactions(from, cashier_be, treasury);
        let asset_txs = generate_mock_icrc1_wallet_to_link_transactions(
            from,
            cashier_be,
            link_account,
            asset,
            amount,
        );

        let all_txs: Vec<Transaction> = [fee_tx.clone(), asset_txs.clone()].concat();

        mock_validator.set_failure(&fee_tx[0].id, true);
        mock_validator.set_failure(&asset_txs[0].id, true);
        let service = IcValidatorService::new(mock_validator);

        // Act
        let result = service
            .validate_action_transactions(&all_txs)
            .await
            .unwrap();

        // Assert
        assert!(!result.is_success);
        assert_eq!(result.errors.len(), 1);
        assert_eq!(result.wallet_transactions.len(), 2);
        assert_eq!(result.canister_transactions.len(), 1);

        let fail_tx = result
            .wallet_transactions
            .iter()
            .find(|tx| tx.id == asset_txs[0].id)
            .unwrap();
        assert_eq!(fail_tx.state, TransactionState::Fail);
    }

    #[tokio::test]
    async fn it_should_rollup_icrc2_wallet_transaction_state_success() {
        // Arrange
        let from = random_principal_id();
        let cashier_be = random_principal_id();
        let treasury = random_principal_id();
        let link_account = random_principal_id();
        let asset = Asset::default();
        let amount = Nat::from(1000u64);
        let mut fee_txs = generate_mock_wallet_to_treasury_transactions(from, cashier_be, treasury);
        let mut asset_txs = generate_mock_icrc2_wallet_to_link_transactions(
            from,
            cashier_be,
            link_account,
            asset,
            amount,
        );
        fee_txs[1].state = TransactionState::Success; // Simulate fee transfer success
        asset_txs[1].state = TransactionState::Success; // Simulate asset transfer

        let mut all_txs: Vec<Transaction> = [fee_txs.clone(), asset_txs.clone()].concat();
        let service = IcValidatorService::new(MockValidator::new());

        // Assert initial states
        assert_eq!(all_txs[0].state, TransactionState::Created);
        assert_eq!(all_txs[2].state, TransactionState::Created);

        // Act
        service.rollup_icrc2_wallet_transaction_state(&mut all_txs);

        // Assert after rollup
        assert_eq!(all_txs[0].state, TransactionState::Success); // Approve should change to Success
        assert_eq!(all_txs[1].state, TransactionState::Success); // Transfer should succeed
        assert_eq!(all_txs[2].state, TransactionState::Success); // Approve should change to Success
        assert_eq!(all_txs[3].state, TransactionState::Success); // Transfer should succeed
    }

    #[tokio::test]
    async fn it_should_rollup_icrc2_wallet_transaction_state_failed() {
        // Arrange
        let from = random_principal_id();
        let cashier_be = random_principal_id();
        let treasury = random_principal_id();
        let link_account = random_principal_id();
        let asset = Asset::default();
        let amount = Nat::from(1000u64);
        let mut fee_txs = generate_mock_wallet_to_treasury_transactions(from, cashier_be, treasury);
        let mut asset_txs = generate_mock_icrc2_wallet_to_link_transactions(
            from,
            cashier_be,
            link_account,
            asset,
            amount,
        );
        fee_txs[1].state = TransactionState::Fail; // Simulate fee transfer failure
        asset_txs[1].state = TransactionState::Fail; // Simulate asset transfer failure

        let mut all_txs: Vec<Transaction> = [fee_txs.clone(), asset_txs.clone()].concat();
        let service = IcValidatorService::new(MockValidator::new());

        // Assert initial states
        assert_eq!(all_txs[0].state, TransactionState::Created);
        assert_eq!(all_txs[2].state, TransactionState::Created);

        // Act
        service.rollup_icrc2_wallet_transaction_state(&mut all_txs);

        // Assert after rollup
        assert_eq!(all_txs[0].state, TransactionState::Fail);
        assert_eq!(all_txs[1].state, TransactionState::Fail);
        assert_eq!(all_txs[2].state, TransactionState::Fail);
        assert_eq!(all_txs[3].state, TransactionState::Fail);
    }

    #[tokio::test]
    async fn it_should_rollup_action_failed_fee_intent_success() {
        // Arrange
        let from = random_principal_id();
        let cashier_be = random_principal_id();
        let treasury = random_principal_id();
        let link_account = random_principal_id();
        let asset = Asset::default();
        let amount = Nat::from(1000u64);

        let (action, intents, mut intent_txs_map) =
            generate_mock_create_action(from, link_account, cashier_be, treasury, asset, amount);

        let fee_intent_id = intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToTreasury)
            .unwrap()
            .id
            .as_str();
        let fee_txs = intent_txs_map.get_mut(fee_intent_id).unwrap();
        for tx in fee_txs.iter_mut() {
            tx.state = TransactionState::Success;
        }

        let asset_intent_id = intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToLink)
            .unwrap()
            .id
            .as_str();
        let asset_txs = intent_txs_map.get_mut(asset_intent_id).unwrap();
        for tx in asset_txs.iter_mut() {
            tx.state = TransactionState::Fail;
        }

        let mock_validator = MockValidator::new();
        let service = IcValidatorService::new(mock_validator);

        // Act
        let result = service
            .rollup_action_state(action, &intents, intent_txs_map.clone())
            .unwrap();

        // Assert
        assert_eq!(result.action.state, ActionState::Fail);
        assert_eq!(result.intents.len(), 2);
        let fee_intent = result
            .intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToTreasury)
            .unwrap();
        assert_eq!(fee_intent.state, IntentState::Success);
        let asset_intent = result
            .intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToLink)
            .unwrap();
        assert_eq!(asset_intent.state, IntentState::Fail);
    }

    #[tokio::test]
    async fn it_should_rollup_action_failed_asset_intent_success() {
        // Arrange
        let from = random_principal_id();
        let cashier_be = random_principal_id();
        let treasury = random_principal_id();
        let link_account = random_principal_id();
        let asset = Asset::default();
        let amount = Nat::from(1000u64);

        let (action, intents, mut intent_txs_map) =
            generate_mock_create_action(from, link_account, cashier_be, treasury, asset, amount);

        let fee_intent_id = intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToTreasury)
            .unwrap()
            .id
            .as_str();
        let fee_txs = intent_txs_map.get_mut(fee_intent_id).unwrap();
        for tx in fee_txs.iter_mut() {
            tx.state = TransactionState::Fail;
        }

        let asset_intent_id = intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToLink)
            .unwrap()
            .id
            .as_str();
        let asset_txs = intent_txs_map.get_mut(asset_intent_id).unwrap();
        for tx in asset_txs.iter_mut() {
            tx.state = TransactionState::Success;
        }

        let mock_validator = MockValidator::new();
        let service = IcValidatorService::new(mock_validator);

        // Act
        let result = service
            .rollup_action_state(action, &intents, intent_txs_map.clone())
            .unwrap();

        // Assert
        assert_eq!(result.action.state, ActionState::Fail);
        assert_eq!(result.intents.len(), 2);
        let fee_intent = result
            .intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToTreasury)
            .unwrap();
        assert_eq!(fee_intent.state, IntentState::Fail);
        let asset_intent = result
            .intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToLink)
            .unwrap();
        assert_eq!(asset_intent.state, IntentState::Success);
    }

    #[tokio::test]
    async fn it_should_rollup_action_success() {
        // Arrange
        let from = random_principal_id();
        let cashier_be = random_principal_id();
        let treasury = random_principal_id();
        let link_account = random_principal_id();
        let asset = Asset::default();
        let amount = Nat::from(1000u64);

        let (action, intents, mut intent_txs_map) =
            generate_mock_create_action(from, link_account, cashier_be, treasury, asset, amount);

        let fee_intent_id = intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToTreasury)
            .unwrap()
            .id
            .as_str();
        let fee_txs = intent_txs_map.get_mut(fee_intent_id).unwrap();
        for tx in fee_txs.iter_mut() {
            tx.state = TransactionState::Success;
        }

        let asset_intent_id = intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToLink)
            .unwrap()
            .id
            .as_str();
        let asset_txs = intent_txs_map.get_mut(asset_intent_id).unwrap();
        for tx in asset_txs.iter_mut() {
            tx.state = TransactionState::Success;
        }

        let mock_validator = MockValidator::new();
        let service = IcValidatorService::new(mock_validator);

        // Act
        let result = service
            .rollup_action_state(action, &intents, intent_txs_map.clone())
            .unwrap();

        // Assert
        assert_eq!(result.action.state, ActionState::Success);
        assert_eq!(result.intents.len(), 2);
        let fee_intent = result
            .intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToTreasury)
            .unwrap();
        assert_eq!(fee_intent.state, IntentState::Success);
        let asset_intent = result
            .intents
            .iter()
            .find(|intent| intent.task == IntentTask::TransferWalletToLink)
            .unwrap();
        assert_eq!(asset_intent.state, IntentState::Success);
    }

    #[tokio::test]
    async fn it_should_fail_rollup_action_state_v3_due_to_fee_intent_transactions_failed() {
        // Arrange
        let (action, intents, mut intent_txs_map) = fixture_action_and_intents_v3();
        intent_txs_map.get_mut("fee_intent").unwrap()[0].state = TransactionState::Fail;
        intent_txs_map.get_mut("asset_intent").unwrap()[0].state = TransactionState::Success;

        let service = IcValidatorService::new(MockValidator::new());

        // Act
        let result = service
            .rollup_action_state_v3(action, intents, intent_txs_map)
            .unwrap();

        // Assert
        assert_eq!(result.action.state, ActionState::Fail);
        assert_eq!(
            result
                .intents
                .iter()
                .find(|i| i.id == "fee_intent")
                .unwrap()
                .state,
            IntentState::Fail
        );
        assert_eq!(
            result
                .intents
                .iter()
                .find(|i| i.id == "asset_intent")
                .unwrap()
                .state,
            IntentState::Success
        );
    }

    #[tokio::test]
    async fn it_should_fail_rollup_action_state_v3_due_to_asset_intent_transactions_failed() {
        // Arrange
        let (action, intents, mut intent_txs_map) = fixture_action_and_intents_v3();
        intent_txs_map.get_mut("fee_intent").unwrap()[0].state = TransactionState::Success;
        intent_txs_map.get_mut("asset_intent").unwrap()[0].state = TransactionState::Fail;

        let service = IcValidatorService::new(MockValidator::new());

        // Act
        let result = service
            .rollup_action_state_v3(action, intents, intent_txs_map)
            .unwrap();

        // Assert
        assert_eq!(result.action.state, ActionState::Fail);
        assert_eq!(
            result
                .intents
                .iter()
                .find(|i| i.id == "fee_intent")
                .unwrap()
                .state,
            IntentState::Success
        );
        assert_eq!(
            result
                .intents
                .iter()
                .find(|i| i.id == "asset_intent")
                .unwrap()
                .state,
            IntentState::Fail
        );
    }

    #[tokio::test]
    async fn it_should_succeed_rollup_action_state_v3() {
        // Arrange
        let (action, intents, mut intent_txs_map) = fixture_action_and_intents_v3();
        intent_txs_map.get_mut("fee_intent").unwrap()[0].state = TransactionState::Success;
        intent_txs_map.get_mut("asset_intent").unwrap()[0].state = TransactionState::Success;

        let service = IcValidatorService::new(MockValidator::new());

        // Act
        let result = service
            .rollup_action_state_v3(action, intents, intent_txs_map)
            .unwrap();

        // Assert
        assert_eq!(result.action.state, ActionState::Success);
        assert_eq!(
            result
                .intents
                .iter()
                .find(|i| i.id == "fee_intent")
                .unwrap()
                .state,
            IntentState::Success
        );
        assert_eq!(
            result
                .intents
                .iter()
                .find(|i| i.id == "asset_intent")
                .unwrap()
                .state,
            IntentState::Success
        );
    }
}
