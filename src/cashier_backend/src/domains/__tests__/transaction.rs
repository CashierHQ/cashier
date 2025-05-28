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
    use crate::domains::transaction::TransactionDomainLogic;
    use candid::Principal;
    use cashier_types::{
        Asset, Chain, FromCallType, IcTransaction, Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom,
        Protocol, Transaction, TransactionState, Wallet,
    };
    use uuid::Uuid;

    // Helper function to create a test transaction
    fn create_test_transaction(
        id: &str,
        state: TransactionState,
        protocol_type: &str,
    ) -> Transaction {
        let protocol = match protocol_type {
            "icrc1_transfer" => {
                let transfer = Icrc1Transfer {
                    from: Wallet {
                        address: "sender".to_string(),
                        chain: Chain::IC,
                    },
                    to: Wallet {
                        address: "receiver".to_string(),
                        chain: Chain::IC,
                    },
                    asset: Asset {
                        address: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
                        chain: Chain::IC,
                    },
                    amount: 100_000,
                    memo: None,
                    ts: Some(1000000),
                };
                Protocol::IC(IcTransaction::Icrc1Transfer(transfer))
            }
            "icrc2_approve" => {
                let approve = Icrc2Approve {
                    from: Wallet {
                        address: "sender".to_string(),
                        chain: Chain::IC,
                    },
                    spender: Wallet {
                        address: "spender".to_string(),
                        chain: Chain::IC,
                    },
                    asset: Asset {
                        address: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
                        chain: Chain::IC,
                    },
                    amount: 100_000,
                };
                Protocol::IC(IcTransaction::Icrc2Approve(approve))
            }
            "icrc2_transfer_from" => {
                let transfer_from = Icrc2TransferFrom {
                    from: Wallet {
                        address: "sender".to_string(),
                        chain: Chain::IC,
                    },
                    to: Wallet {
                        address: "receiver".to_string(),
                        chain: Chain::IC,
                    },
                    spender: Wallet {
                        address: "spender".to_string(),
                        chain: Chain::IC,
                    },
                    asset: Asset {
                        address: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
                        chain: Chain::IC,
                    },
                    amount: 100_000,
                    memo: None,
                    ts: Some(1000000),
                };
                Protocol::IC(IcTransaction::Icrc2TransferFrom(transfer_from))
            }
            _ => panic!("Unsupported protocol type: {}", protocol_type),
        };

        Transaction {
            id: id.to_string(),
            created_at: 1000000,
            state,
            dependency: None,
            protocol,
            group: 1,
            from_call_type: FromCallType::Wallet,
            start_ts: None,
        }
    }

    #[test]
    fn test_convert_tx_to_icrc_112_request_icrc1_transfer() {
        let domain_logic = TransactionDomainLogic::new();
        let action_id = Uuid::new_v4().to_string();
        let link_id = Uuid::new_v4().to_string();
        let tx = create_test_transaction("tx1", TransactionState::Created, "icrc1_transfer");
        let canister_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();

        let result =
            domain_logic.convert_tx_to_icrc_112_request(&action_id, &link_id, &tx, &canister_id);

        assert_eq!(result.method, "icrc1_transfer");
        assert_eq!(result.canister_id, "ryjl3-tyaaa-aaaaa-aaaba-cai");
        assert_eq!(result.nonce, Some("tx1".to_string()));
        // Base64 arg content would vary based on binary encoding, so we skip checking that
    }

    #[test]
    fn test_convert_tx_to_icrc_112_request_icrc2_approve() {
        let domain_logic = TransactionDomainLogic::new();
        let action_id = Uuid::new_v4().to_string();
        let link_id = Uuid::new_v4().to_string();
        let tx = create_test_transaction("tx2", TransactionState::Created, "icrc2_approve");
        let canister_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();

        let result =
            domain_logic.convert_tx_to_icrc_112_request(&action_id, &link_id, &tx, &canister_id);

        assert_eq!(result.method, "icrc2_approve");
        assert_eq!(result.canister_id, "ryjl3-tyaaa-aaaaa-aaaba-cai");
        assert_eq!(result.nonce, Some("tx2".to_string()));
    }

    #[test]
    fn test_convert_tx_to_icrc_112_request_icrc2_transfer_from() {
        let domain_logic = TransactionDomainLogic::new();
        let action_id = Uuid::new_v4().to_string();
        let link_id = Uuid::new_v4().to_string();
        let tx = create_test_transaction("tx3", TransactionState::Created, "icrc2_transfer_from");
        let canister_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();

        let result =
            domain_logic.convert_tx_to_icrc_112_request(&action_id, &link_id, &tx, &canister_id);

        assert_eq!(result.method, "trigger_transaction");
        assert_eq!(result.canister_id, "ryjl3-tyaaa-aaaaa-aaaba-cai");
        assert_eq!(result.nonce, Some("tx3".to_string()));
    }

    #[test]
    fn test_create_icrc_112_empty_transactions() {
        let domain_logic = TransactionDomainLogic::new();
        let action_id = Uuid::new_v4().to_string();
        let link_id = Uuid::new_v4().to_string();
        let transactions: Vec<Transaction> = vec![];
        let canister_id = Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap();

        let result =
            domain_logic.create_icrc_112(&action_id, &link_id, &transactions, &canister_id);

        assert!(result.is_none(), "Empty transactions should result in None");
    }

    #[test]
    fn test_create_icrc_112_single_transaction() {
        let domain_logic = TransactionDomainLogic::new();
        let action_id = Uuid::new_v4().to_string();
        let link_id = Uuid::new_v4().to_string();
        let tx = create_test_transaction("tx1", TransactionState::Created, "icrc1_transfer");
        let transactions = vec![tx];
        let canister_id = Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap();

        let result =
            domain_logic.create_icrc_112(&action_id, &link_id, &transactions, &canister_id);

        assert!(
            result.is_some(),
            "Should return ICRC-112 requests for single transaction"
        );
        let requests = result.unwrap();
        assert_eq!(requests.len(), 1, "Should have one group of requests");
        assert_eq!(requests[0].len(), 1, "First group should have one request");
        assert_eq!(requests[0][0].method, "icrc1_transfer");
        assert_eq!(requests[0][0].nonce, Some("tx1".to_string()));
    }

    #[test]
    fn test_create_icrc_112_multiple_transactions_no_dependencies() {
        let domain_logic = TransactionDomainLogic::new();
        let action_id = Uuid::new_v4().to_string();
        let link_id = Uuid::new_v4().to_string();

        let tx1 = create_test_transaction("tx1", TransactionState::Created, "icrc1_transfer");
        let tx2 = create_test_transaction("tx2", TransactionState::Created, "icrc2_approve");

        let transactions = vec![tx1, tx2];
        let canister_id = Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap();

        let result =
            domain_logic.create_icrc_112(&action_id, &link_id, &transactions, &canister_id);

        assert!(
            result.is_some(),
            "Should return ICRC-112 requests for multiple transactions"
        );
        let requests = result.unwrap();
        assert_eq!(
            requests.len(),
            1,
            "Should have one group of requests with no dependencies"
        );
        assert_eq!(requests[0].len(), 2, "Group should have two requests");
    }

    #[test]
    fn test_create_icrc_112_with_dependencies() {
        let domain_logic = TransactionDomainLogic::new();
        let action_id = Uuid::new_v4().to_string();
        let link_id = Uuid::new_v4().to_string();

        let tx1 = create_test_transaction("tx1", TransactionState::Created, "icrc2_approve");

        let mut tx2 =
            create_test_transaction("tx2", TransactionState::Created, "icrc2_transfer_from");
        tx2.dependency = Some(vec!["tx1".to_string()]);

        let transactions = vec![tx1, tx2];
        let canister_id = Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap();

        let result =
            domain_logic.create_icrc_112(&action_id, &link_id, &transactions, &canister_id);

        assert!(
            result.is_some(),
            "Should return ICRC-112 requests with dependencies"
        );
        let requests = result.unwrap();
        assert_eq!(
            requests.len(),
            2,
            "Should have two groups of requests due to dependencies"
        );
        assert_eq!(requests[0].len(), 1, "First group should have one request");
        assert_eq!(requests[1].len(), 1, "Second group should have one request");
        assert_eq!(
            requests[0][0].nonce,
            Some("tx1".to_string()),
            "First group should contain tx1"
        );
        assert_eq!(
            requests[1][0].nonce,
            Some("tx2".to_string()),
            "Second group should contain tx2"
        );
    }

    #[test]
    fn test_create_icrc_112_complex_dependencies() {
        let domain_logic = TransactionDomainLogic::new();
        let action_id = Uuid::new_v4().to_string();
        let link_id = Uuid::new_v4().to_string();
        let tx1 = create_test_transaction("tx1", TransactionState::Created, "icrc1_transfer");
        let tx2 = create_test_transaction("tx2", TransactionState::Created, "icrc2_approve");

        let mut tx3 =
            create_test_transaction("tx3", TransactionState::Created, "icrc2_transfer_from");
        tx3.dependency = Some(vec!["tx2".to_string()]);

        let mut tx4 = create_test_transaction("tx4", TransactionState::Created, "icrc1_transfer");
        tx4.dependency = Some(vec!["tx1".to_string(), "tx3".to_string()]);

        let transactions = vec![tx1, tx2, tx3, tx4];
        let canister_id = Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap();

        let result =
            domain_logic.create_icrc_112(&action_id, &link_id, &transactions, &canister_id);

        assert!(
            result.is_some(),
            "Should return ICRC-112 requests with complex dependencies"
        );
        let requests = result.unwrap();
        assert_eq!(
            requests.len(),
            3,
            "Should have three groups of requests due to dependencies"
        );

        // Verify first level (tx1, tx2)
        let first_group_nonces: Vec<String> = requests[0]
            .iter()
            .filter_map(|req| req.nonce.clone())
            .collect();
        assert!(
            first_group_nonces.contains(&"tx1".to_string()),
            "First group should contain tx1"
        );
        assert!(
            first_group_nonces.contains(&"tx2".to_string()),
            "First group should contain tx2"
        );

        // Verify second level (tx3)
        assert_eq!(
            requests[1][0].nonce,
            Some("tx3".to_string()),
            "Second group should contain tx3"
        );

        // Verify third level (tx4)
        assert_eq!(
            requests[2][0].nonce,
            Some("tx4".to_string()),
            "Third group should contain tx4"
        );
    }
}
