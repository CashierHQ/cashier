// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_backend_types::{
    link_v2::action_result::TransferAmountsResult,
    repository::{
        asset_info::AssetInfo,
        common::Asset,
        intent::v1::{Intent, IntentTask},
        transaction::v1::{IcTransaction, Protocol, Transaction, TransactionState},
    },
};
use cashier_common::constant::{CREATE_LINK_FEE, ICP_CANISTER_PRINCIPAL};
use std::collections::HashMap;

/// Calculate the token balance required for the link
/// # Arguments
/// * `asset_info` - A vector of AssetInfo associated with the link
/// * `fee_map` - A map of token principal to its corresponding fee
/// * `max_use_count` - The maximum number of times the link can be used
/// # Returns
/// * `HashMap<Principal, Nat>` - A map of token principal to the total balance required for the link
pub fn calculate_link_balance_map(
    asset_info: &[AssetInfo],
    fee_map: &HashMap<Principal, Nat>,
    max_use_count: u64,
) -> HashMap<Principal, Nat> {
    let mut balance_map: HashMap<Principal, Nat> = HashMap::new();
    asset_info.iter().for_each(|info| {
        let address = match &info.asset {
            Asset::IC { address } => address,
        };

        let default_fee = Nat::from(0u64);
        let fee_in_nat = fee_map.get(address).unwrap_or(&default_fee);
        let fee_amount = fee_in_nat.clone();

        let sending_amount =
            (info.amount_per_link_use_action.clone() + fee_amount) * Nat::from(max_use_count);

        balance_map.insert(*address, sending_amount);
    });

    balance_map
}

/// Calculate the token balance for the link (without fees)
/// Used for calculating available amount like payment link
/// # Arguments
/// * `asset_info` - A vector of AssetInfo associated with the link
/// * `max_use_count` - The maximum number of times the link can be used
/// # Returns
/// * `HashMap<Principal, Nat>` - A map of token principal to the balance (without fees)
pub fn calculate_link_balance_map_without_fee(
    asset_info: &[AssetInfo],
    max_use_count: u64,
) -> HashMap<Principal, Nat> {
    let mut balance_map: HashMap<Principal, Nat> = HashMap::new();
    asset_info.iter().for_each(|info| {
        let address = match &info.asset {
            Asset::IC { address } => address,
        };
        let amount = info.amount_per_link_use_action.clone() * Nat::from(max_use_count);
        balance_map.insert(*address, amount);
    });
    balance_map
}

/// Calculate the total fee required to create a link
/// # Arguments
/// * `fee_map` - A map of token principal to its corresponding fee
/// # Returns
/// * `(actual_amount: Nat, approved_amount: Nat)` - A tuple containing the actual fee amount and the approved fee amount
pub fn calculate_create_link_fee(fee_map: &HashMap<Principal, Nat>) -> (Nat, Nat) {
    let create_link_fee = Nat::from(CREATE_LINK_FEE);
    let default_fee = Nat::from(0u64);
    let fee_in_nat = fee_map.get(&ICP_CANISTER_PRINCIPAL).unwrap_or(&default_fee);
    (
        create_link_fee.clone(),
        create_link_fee + fee_in_nat.clone(),
    )
}

/// Calculate transfer amounts by direction from intents and their transactions
/// Groups by IntentTask (wallet_to_link vs link_to_wallet)
/// Only counts successful Icrc1Transfer and Icrc2TransferFrom transactions
/// Icrc2Approve is skipped as it doesn't transfer tokens
/// # Arguments
/// * `intents` - The intents to process
/// * `intent_txs_map` - Mapping of intent ID to its transactions
/// # Returns
/// * `TransferAmountsResult` - amounts grouped by transfer direction
pub fn calculate_successful_transfer_amounts(
    intents: &[Intent],
    intent_txs_map: &HashMap<String, Vec<Transaction>>,
) -> TransferAmountsResult {
    let mut result = TransferAmountsResult::new();

    for intent in intents {
        let Some(txs) = intent_txs_map.get(&intent.id) else {
            continue;
        };

        for tx in txs {
            if tx.state != TransactionState::Success {
                continue;
            }

            let (address, amount) = match &tx.protocol {
                Protocol::IC(IcTransaction::Icrc1Transfer(t)) => {
                    let addr = match &t.asset {
                        Asset::IC { address } => *address,
                    };
                    (addr, t.amount.clone())
                }
                Protocol::IC(IcTransaction::Icrc2TransferFrom(t)) => {
                    let addr = match &t.asset {
                        Asset::IC { address } => *address,
                    };
                    (addr, t.amount.clone())
                }
                // Icrc2Approve doesn't transfer tokens, skip
                Protocol::IC(IcTransaction::Icrc2Approve(_)) => {
                    continue;
                }
            };

            match intent.task {
                IntentTask::TransferWalletToLink => {
                    result.add_wallet_to_link(address, amount);
                }
                IntentTask::TransferLinkToWallet => {
                    result.add_link_to_wallet(address, amount);
                }
                IntentTask::TransferWalletToTreasury => {
                    continue;
                }
            }
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use cashier_backend_types::repository::{
        common::{Chain, Wallet},
        intent::v1::{IntentState, IntentType, TransferData},
        transaction::v1::{FromCallType, Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom},
    };

    fn create_test_intent(id: &str, task: IntentTask) -> Intent {
        Intent {
            id: id.to_string(),
            state: IntentState::Success,
            created_at: 0,
            dependency: vec![],
            chain: Chain::IC,
            task,
            r#type: IntentType::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(0u64),
            }),
            label: "test".to_string(),
        }
    }

    #[test]
    fn test_calculate_link_balance_map() {
        // Arrange
        let asset = Asset::default();
        let label = "Test Asset1".to_string();
        let amount_per_link_use_action = Nat::from(10u64);

        let asset_info = AssetInfo {
            asset: asset.clone(),
            label: label.clone(),
            amount_per_link_use_action: amount_per_link_use_action.clone(),
            amount_available: Nat::from(0u64),
        };

        let fee_map: HashMap<Principal, Nat> = vec![(ICP_CANISTER_PRINCIPAL, Nat::from(2u64))]
            .into_iter()
            .collect();

        let max_use_count = 3u64;

        // Act
        let balance_map = calculate_link_balance_map(&[asset_info], &fee_map, max_use_count);

        // Assert
        let expected_sending_amount = amount_per_link_use_action * Nat::from(3u64);
        let address = match &asset {
            Asset::IC { address } => address,
        };
        assert_eq!(
            balance_map.get(address).cloned().unwrap(),
            expected_sending_amount
        );
    }

    #[test]
    fn test_calculate_create_link_fee() {
        // Arrange
        let fee_map: HashMap<Principal, Nat> = vec![(ICP_CANISTER_PRINCIPAL, Nat::from(5u64))]
            .into_iter()
            .collect();

        // Act
        let (actual_amount, approved_amount) = calculate_create_link_fee(&fee_map);

        // Assert
        assert_eq!(actual_amount, Nat::from(CREATE_LINK_FEE));
        assert_eq!(approved_amount, Nat::from(CREATE_LINK_FEE + 5u64));
    }

    fn create_test_icrc1_transfer_tx(
        id: &str,
        amount: u64,
        state: TransactionState,
        asset: Asset,
    ) -> Transaction {
        Transaction {
            id: id.to_string(),
            created_at: 0,
            state,
            dependency: None,
            group: 0,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: Wallet::default(),
                to: Wallet::default(),
                asset,
                amount: Nat::from(amount),
                memo: None,
                ts: None,
            })),
            start_ts: None,
        }
    }

    fn create_test_icrc2_approve_tx(
        id: &str,
        amount: u64,
        state: TransactionState,
        asset: Asset,
    ) -> Transaction {
        Transaction {
            id: id.to_string(),
            created_at: 0,
            state,
            dependency: None,
            group: 0,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc2Approve(Icrc2Approve {
                from: Wallet::default(),
                spender: Wallet::default(),
                asset,
                amount: Nat::from(amount),
                memo: None,
                ts: None,
            })),
            start_ts: None,
        }
    }

    fn create_test_icrc2_transfer_from_tx(
        id: &str,
        amount: u64,
        state: TransactionState,
        asset: Asset,
    ) -> Transaction {
        Transaction {
            id: id.to_string(),
            created_at: 0,
            state,
            dependency: None,
            group: 0,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc2TransferFrom(Icrc2TransferFrom {
                from: Wallet::default(),
                to: Wallet::default(),
                spender: Wallet::default(),
                asset,
                amount: Nat::from(amount),
                memo: None,
                ts: None,
            })),
            start_ts: None,
        }
    }

    #[test]
    fn test_calculate_successful_transfer_amounts_empty() {
        let result = calculate_successful_transfer_amounts(&[], &HashMap::new());
        assert!(result.is_empty());
    }

    #[test]
    fn test_calculate_successful_transfer_amounts_wallet_to_link() {
        let asset = Asset::default();
        let address = match &asset {
            Asset::IC { address } => *address,
        };

        let intent = create_test_intent("intent1", IntentTask::TransferWalletToLink);
        let txs = vec![
            create_test_icrc1_transfer_tx("tx1", 100, TransactionState::Success, asset.clone()),
            create_test_icrc1_transfer_tx("tx2", 50, TransactionState::Success, asset.clone()),
        ];

        let mut intent_txs_map = HashMap::new();
        intent_txs_map.insert(intent.id.clone(), txs);

        let result = calculate_successful_transfer_amounts(&[intent], &intent_txs_map);

        assert_eq!(result.get_wallet_to_link(&address), Nat::from(150u64));
        assert_eq!(result.get_link_to_wallet(&address), Nat::from(0u64));
    }

    #[test]
    fn test_calculate_successful_transfer_amounts_link_to_wallet() {
        let asset = Asset::default();
        let address = match &asset {
            Asset::IC { address } => *address,
        };

        let intent = create_test_intent("intent1", IntentTask::TransferLinkToWallet);
        let txs = vec![
            create_test_icrc1_transfer_tx("tx1", 100, TransactionState::Success, asset.clone()),
            create_test_icrc1_transfer_tx("tx2", 50, TransactionState::Success, asset.clone()),
        ];

        let mut intent_txs_map = HashMap::new();
        intent_txs_map.insert(intent.id.clone(), txs);

        let result = calculate_successful_transfer_amounts(&[intent], &intent_txs_map);

        assert_eq!(result.get_wallet_to_link(&address), Nat::from(0u64));
        assert_eq!(result.get_link_to_wallet(&address), Nat::from(150u64));
    }

    #[test]
    fn test_calculate_successful_transfer_amounts_partial() {
        let asset = Asset::default();
        let address = match &asset {
            Asset::IC { address } => *address,
        };

        let intent = create_test_intent("intent1", IntentTask::TransferWalletToLink);
        // 3 txs: 2 success (100 + 50), 1 fail (200)
        let txs = vec![
            create_test_icrc1_transfer_tx("tx1", 100, TransactionState::Success, asset.clone()),
            create_test_icrc1_transfer_tx("tx2", 50, TransactionState::Success, asset.clone()),
            create_test_icrc1_transfer_tx("tx3", 200, TransactionState::Fail, asset.clone()),
        ];

        let mut intent_txs_map = HashMap::new();
        intent_txs_map.insert(intent.id.clone(), txs);

        let result = calculate_successful_transfer_amounts(&[intent], &intent_txs_map);

        // Only 150 (100 + 50), not 350
        assert_eq!(result.get_wallet_to_link(&address), Nat::from(150u64));
    }

    #[test]
    fn test_calculate_successful_transfer_amounts_all_fail() {
        let asset = Asset::default();

        let intent = create_test_intent("intent1", IntentTask::TransferWalletToLink);
        let txs = vec![
            create_test_icrc1_transfer_tx("tx1", 100, TransactionState::Fail, asset.clone()),
            create_test_icrc1_transfer_tx("tx2", 50, TransactionState::Fail, asset.clone()),
        ];

        let mut intent_txs_map = HashMap::new();
        intent_txs_map.insert(intent.id.clone(), txs);

        let result = calculate_successful_transfer_amounts(&[intent], &intent_txs_map);

        assert!(result.is_empty());
    }

    #[test]
    fn test_calculate_successful_transfer_amounts_ignores_approve() {
        let asset = Asset::default();
        let address = match &asset {
            Asset::IC { address } => *address,
        };

        let intent = create_test_intent("intent1", IntentTask::TransferWalletToLink);
        // Icrc2Approve success should NOT be counted
        let txs = vec![
            create_test_icrc1_transfer_tx("tx1", 100, TransactionState::Success, asset.clone()),
            create_test_icrc2_approve_tx("tx2", 500, TransactionState::Success, asset.clone()),
        ];

        let mut intent_txs_map = HashMap::new();
        intent_txs_map.insert(intent.id.clone(), txs);

        let result = calculate_successful_transfer_amounts(&[intent], &intent_txs_map);

        // Only 100 (transfer), not 600 (transfer + approve)
        assert_eq!(result.get_wallet_to_link(&address), Nat::from(100u64));
    }

    #[test]
    fn test_calculate_successful_transfer_amounts_icrc2_transfer_from() {
        let asset = Asset::default();
        let address = match &asset {
            Asset::IC { address } => *address,
        };

        let intent = create_test_intent("intent1", IntentTask::TransferWalletToLink);
        let txs = vec![
            create_test_icrc1_transfer_tx("tx1", 100, TransactionState::Success, asset.clone()),
            create_test_icrc2_transfer_from_tx(
                "tx2",
                200,
                TransactionState::Success,
                asset.clone(),
            ),
        ];

        let mut intent_txs_map = HashMap::new();
        intent_txs_map.insert(intent.id.clone(), txs);

        let result = calculate_successful_transfer_amounts(&[intent], &intent_txs_map);

        // 100 + 200 = 300
        assert_eq!(result.get_wallet_to_link(&address), Nat::from(300u64));
    }

    #[test]
    fn test_calculate_successful_transfer_amounts_multi_asset() {
        let asset1 = Asset::IC {
            address: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
        };
        let asset2 = Asset::IC {
            address: Principal::from_text("mxzaz-hqaaa-aaaar-qaada-cai").unwrap(),
        };

        let addr1 = match &asset1 {
            Asset::IC { address } => *address,
        };
        let addr2 = match &asset2 {
            Asset::IC { address } => *address,
        };

        let intent = create_test_intent("intent1", IntentTask::TransferWalletToLink);
        let txs = vec![
            create_test_icrc1_transfer_tx("tx1", 100, TransactionState::Success, asset1.clone()),
            create_test_icrc1_transfer_tx("tx2", 200, TransactionState::Success, asset2.clone()),
            create_test_icrc1_transfer_tx("tx3", 50, TransactionState::Fail, asset1.clone()),
        ];

        let mut intent_txs_map = HashMap::new();
        intent_txs_map.insert(intent.id.clone(), txs);

        let result = calculate_successful_transfer_amounts(&[intent], &intent_txs_map);

        assert_eq!(result.get_wallet_to_link(&addr1), Nat::from(100u64));
        assert_eq!(result.get_wallet_to_link(&addr2), Nat::from(200u64));
    }

    #[test]
    fn test_calculate_successful_transfer_amounts_mixed_directions() {
        let asset = Asset::default();
        let address = match &asset {
            Asset::IC { address } => *address,
        };

        // Two intents with different directions
        let intent1 = create_test_intent("intent1", IntentTask::TransferWalletToLink);
        let intent2 = create_test_intent("intent2", IntentTask::TransferLinkToWallet);

        let txs1 = vec![create_test_icrc1_transfer_tx(
            "tx1",
            100,
            TransactionState::Success,
            asset.clone(),
        )];
        let txs2 = vec![create_test_icrc1_transfer_tx(
            "tx2",
            75,
            TransactionState::Success,
            asset.clone(),
        )];

        let mut intent_txs_map = HashMap::new();
        intent_txs_map.insert(intent1.id.clone(), txs1);
        intent_txs_map.insert(intent2.id.clone(), txs2);

        let result = calculate_successful_transfer_amounts(&[intent1, intent2], &intent_txs_map);

        assert_eq!(result.get_wallet_to_link(&address), Nat::from(100u64));
        assert_eq!(result.get_link_to_wallet(&address), Nat::from(75u64));
    }

    #[test]
    fn test_calculate_successful_transfer_amounts_treasury_ignored() {
        let asset = Asset::default();
        let address = match &asset {
            Asset::IC { address } => *address,
        };

        let intent = create_test_intent("intent1", IntentTask::TransferWalletToTreasury);
        let txs = vec![create_test_icrc1_transfer_tx(
            "tx1",
            100,
            TransactionState::Success,
            asset.clone(),
        )];

        let mut intent_txs_map = HashMap::new();
        intent_txs_map.insert(intent.id.clone(), txs);

        let result = calculate_successful_transfer_amounts(&[intent], &intent_txs_map);

        // Treasury transfers are not tracked
        assert!(result.is_empty());
        assert_eq!(result.get_wallet_to_link(&address), Nat::from(0u64));
        assert_eq!(result.get_link_to_wallet(&address), Nat::from(0u64));
    }
}
