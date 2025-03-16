mod tests {
    use std::collections::HashMap;

    use candid::Principal;
    use cashier_types::{
        ActionState, ActionType, Asset, Chain, IntentState, IntentTask, IntentType,
        TransactionState, TransferData, TransferFromData, Wallet,
    };
    use faux::when;
    use icrc_ledger_types::icrc1::account::Account;
    use uuid::Uuid;

    use crate::{
        core::action::types::{AssetDto, MetadataValue, WalletDto},
        services::{
            __tests__::tests::{
                create_dummy_intent, generate_random_principal, generate_timestamp,
                MockIcEnvironment,
            },
            transaction_manager::{
                action::ActionService, execute_transaction::ExecuteTransactionService,
                manual_check_status::ManualCheckStatusService, transaction::TransactionService,
                TransactionManagerService,
            },
        },
        types::{error::CanisterError, temp_action::TemporaryAction},
        utils::helper::to_subaccount,
    };

    #[tokio::test]
    async fn should_success_convert_intent_to_tx() {
        let mut action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let execute_transaction_service = ExecuteTransactionService::faux();
        let transaction_service: TransactionService<MockIcEnvironment> = TransactionService::faux();
        let manual_check_status_service = ManualCheckStatusService::faux();

        let action_id = Uuid::new_v4().to_string();
        let link_id = Uuid::new_v4().to_string();
        let creator = generate_random_principal().to_text();

        let mut intent1 = create_dummy_intent(IntentState::Created);
        intent1.id = Uuid::new_v4().to_string();
        intent1.task = IntentTask::TransferWalletToLink;
        let transfer_data: TransferData = TransferData {
            from: Wallet {
                address: creator.clone(),
                chain: Chain::IC,
            },
            to: Wallet {
                address: "jjio5-5aaaa-aaaam-adhaq-cai".to_string(),
                chain: Chain::IC,
            },
            asset: Asset {
                address: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
                chain: Chain::IC,
            },
            amount: 10_0000_0000,
        };
        intent1.r#type = IntentType::Transfer(transfer_data);

        let mut intent2 = create_dummy_intent(IntentState::Created);
        intent2.id = Uuid::new_v4().to_string();
        intent2.task = IntentTask::TransferWalletToTreasury;
        let link_vault_account = Account {
            owner: Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap(),
            subaccount: Some(to_subaccount(link_id.clone())),
        };
        let transfer_from_data: TransferFromData = TransferFromData {
            from: Wallet {
                address: creator.clone(),
                chain: Chain::IC,
            },
            spender: Wallet {
                address: "jjio5-5aaaa-aaaam-adhaq-cai".to_string(),
                chain: Chain::IC,
            },
            to: Wallet {
                address: link_vault_account.to_string(),
                chain: Chain::IC,
            },
            asset: Asset {
                address: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
                chain: Chain::IC,
            },
            amount: 10_0000,
        };
        intent2.r#type = IntentType::TransferFrom(transfer_from_data);

        let intents = vec![intent1.clone(), intent2.clone()];

        let temp_action = TemporaryAction {
            id: action_id.clone(),
            r#type: ActionType::CreateLink,
            state: ActionState::Created,
            creator: creator.clone(),
            link_id: link_id.clone(),
            intents: intents.clone(),
        };

        when!(action_service.get_action_by_id).then_return(None);
        when!(ic_env.time).then_return(generate_timestamp());
        when!(action_service.store_action_records).then_return(Ok(()));

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                manual_check_status_service,
                ic_env,
                execute_transaction_service,
            );

        let result = transaction_manager_service.tx_man_create_action(&temp_action);

        println!("{:#?}", result);

        assert!(result.is_ok());

        let action_dto = result.unwrap();
        assert_eq!(action_dto.id, action_id);
        assert_eq!(action_dto.creator, creator);
        assert_eq!(action_dto.state, ActionState::Created.to_string());
        assert_eq!(action_dto.intents.len(), intents.len());
        assert_eq!(action_dto.intents[0].transactions.len(), 1);
        assert_eq!(action_dto.intents[1].transactions.len(), 2);

        let tx1 = &action_dto.intents[0].transactions[0];

        assert_eq!(tx1.protocol, "Icrc1Transfer".to_string());
        assert_eq!(tx1.state, TransactionState::Created.to_string());
        assert_eq!(
            tx1.protocol_metadata.get("to"),
            Some(&MetadataValue::Wallet(WalletDto {
                address: "jjio5-5aaaa-aaaam-adhaq-cai".to_string(),
                chain: "IC".to_string(),
            }))
        );
        assert_eq!(
            tx1.protocol_metadata.get("from"),
            Some(&MetadataValue::Wallet(WalletDto {
                address: creator.clone(),
                chain: "IC".to_string(),
            }))
        );
        assert_eq!(
            tx1.protocol_metadata.get("asset"),
            Some(&MetadataValue::Asset(AssetDto {
                address: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
                chain: "IC".to_string(),
            }))
        );
        assert_eq!(
            tx1.protocol_metadata.get("amount"),
            Some(&MetadataValue::U64(10_0000_0000))
        );

        let tx2 = &action_dto.intents[1].transactions[0];
        let tx3 = &action_dto.intents[1].transactions[1];

        assert_eq!(tx2.protocol, "Icrc2Approve".to_string());
        assert_eq!(tx3.protocol, "Icrc2TransferFrom".to_string());

        assert_eq!(tx2.state, TransactionState::Created.to_string());
        assert_eq!(tx3.state, TransactionState::Created.to_string());

        assert_eq!(
            tx2.protocol_metadata.get("spender"),
            Some(&MetadataValue::Wallet(WalletDto {
                address: "jjio5-5aaaa-aaaam-adhaq-cai".to_string(),
                chain: "IC".to_string(),
            }))
        );
        assert_eq!(
            tx2.protocol_metadata.get("from"),
            Some(&MetadataValue::Wallet(WalletDto {
                address: creator.clone(),
                chain: "IC".to_string(),
            }))
        );
        assert_eq!(
            tx2.protocol_metadata.get("amount"),
            Some(&MetadataValue::U64(10_0000))
        );
        assert_eq!(
            tx2.protocol_metadata.get("asset"),
            Some(&MetadataValue::Asset(AssetDto {
                address: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
                chain: "IC".to_string(),
            }))
        );

        assert_eq!(
            tx3.protocol_metadata.get("spender"),
            Some(&MetadataValue::Wallet(WalletDto {
                address: "jjio5-5aaaa-aaaam-adhaq-cai".to_string(),
                chain: "IC".to_string(),
            }))
        );
        assert_eq!(
            tx3.protocol_metadata.get("from"),
            Some(&MetadataValue::Wallet(WalletDto {
                address: creator.clone(),
                chain: "IC".to_string(),
            }))
        );
        assert_eq!(
            tx3.protocol_metadata.get("to"),
            Some(&MetadataValue::Wallet(WalletDto {
                address: link_vault_account.to_string(),
                chain: "IC".to_string(),
            }))
        );
        assert_eq!(
            tx3.protocol_metadata.get("amount"),
            Some(&MetadataValue::U64(10_0000))
        );
        assert_eq!(tx3.dependency, Some(vec![tx2.id.clone()]));
    }
    #[tokio::test]
    async fn should_success_convert_intent_have_dependency_to_tx() {
        let mut action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let execute_transaction_service = ExecuteTransactionService::faux();
        let transaction_service: TransactionService<MockIcEnvironment> = TransactionService::faux();
        let manual_check_status_service = ManualCheckStatusService::faux();

        let action_id = Uuid::new_v4().to_string();
        let link_id = Uuid::new_v4().to_string();
        let creator = generate_random_principal().to_text();

        let mut intent1 = create_dummy_intent(IntentState::Created);
        intent1.id = Uuid::new_v4().to_string();
        intent1.task = IntentTask::TransferWalletToLink;
        let transfer_data: TransferData = TransferData {
            from: Wallet {
                address: creator.clone(),
                chain: Chain::IC,
            },
            to: Wallet {
                address: "jjio5-5aaaa-aaaam-adhaq-cai".to_string(),
                chain: Chain::IC,
            },
            asset: Asset {
                address: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
                chain: Chain::IC,
            },
            amount: 10_0000_0000,
        };
        intent1.r#type = IntentType::Transfer(transfer_data);

        let mut intent2 = create_dummy_intent(IntentState::Created);
        intent2.id = Uuid::new_v4().to_string();
        intent2.task = IntentTask::TransferWalletToLink;
        let transfer_data: TransferData = TransferData {
            from: Wallet {
                address: creator.clone(),
                chain: Chain::IC,
            },
            to: Wallet {
                address: "jjio5-5aaaa-aaaam-adhaq-cai".to_string(),
                chain: Chain::IC,
            },
            asset: Asset {
                address: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
                chain: Chain::IC,
            },
            amount: 10_0000_0000,
        };
        intent2.r#type = IntentType::Transfer(transfer_data);

        let mut intent3 = create_dummy_intent(IntentState::Created);
        intent3.id = Uuid::new_v4().to_string();
        intent3.task = IntentTask::TransferWalletToTreasury;
        let link_vault_account = Account {
            owner: Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap(),
            subaccount: Some(to_subaccount(link_id.clone())),
        };
        let transfer_from_data: TransferFromData = TransferFromData {
            from: Wallet {
                address: creator.clone(),
                chain: Chain::IC,
            },
            spender: Wallet {
                address: "jjio5-5aaaa-aaaam-adhaq-cai".to_string(),
                chain: Chain::IC,
            },
            to: Wallet {
                address: link_vault_account.to_string(),
                chain: Chain::IC,
            },
            asset: Asset {
                address: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
                chain: Chain::IC,
            },
            amount: 10_0000,
        };
        intent3.r#type = IntentType::TransferFrom(transfer_from_data);
        intent3.dependency = vec![intent1.id.clone(), intent2.id.clone()];

        let intents = vec![intent1.clone(), intent2.clone(), intent3.clone()];

        let temp_action = TemporaryAction {
            id: action_id.clone(),
            r#type: ActionType::CreateLink,
            state: ActionState::Created,
            creator: creator.clone(),
            link_id: link_id.clone(),
            intents: intents.clone(),
        };

        when!(action_service.get_action_by_id).then_return(None);
        when!(ic_env.time).then_return(generate_timestamp());
        when!(action_service.store_action_records).then_return(Ok(()));

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                manual_check_status_service,
                ic_env,
                execute_transaction_service,
            );

        let result = transaction_manager_service.tx_man_create_action(&temp_action);

        println!("{:#?}", result);

        assert!(result.is_ok());

        let action_dto = result.unwrap();
        assert_eq!(action_dto.id, action_id);
        assert_eq!(action_dto.creator, creator);
        assert_eq!(action_dto.state, ActionState::Created.to_string());
        assert_eq!(action_dto.intents.len(), intents.len());
        assert_eq!(action_dto.intents[0].transactions.len(), 1);
        assert_eq!(action_dto.intents[1].transactions.len(), 1);
        assert_eq!(action_dto.intents[2].transactions.len(), 2);

        let tx1_1 = &action_dto.intents[0].transactions[0];

        assert_eq!(tx1_1.protocol, "Icrc1Transfer".to_string());
        assert_eq!(tx1_1.state, TransactionState::Created.to_string());
        assert_eq!(
            tx1_1.protocol_metadata.get("to"),
            Some(&MetadataValue::Wallet(WalletDto {
                address: "jjio5-5aaaa-aaaam-adhaq-cai".to_string(),
                chain: "IC".to_string(),
            }))
        );
        assert_eq!(
            tx1_1.protocol_metadata.get("from"),
            Some(&MetadataValue::Wallet(WalletDto {
                address: creator.clone(),
                chain: "IC".to_string(),
            }))
        );
        assert_eq!(
            tx1_1.protocol_metadata.get("asset"),
            Some(&MetadataValue::Asset(AssetDto {
                address: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
                chain: "IC".to_string(),
            }))
        );
        assert_eq!(
            tx1_1.protocol_metadata.get("amount"),
            Some(&MetadataValue::U64(10_0000_0000))
        );

        let tx2_1 = &action_dto.intents[1].transactions[0];

        assert_eq!(tx2_1.protocol, "Icrc1Transfer".to_string());
        assert_eq!(tx2_1.state, TransactionState::Created.to_string());
        assert_eq!(
            tx2_1.protocol_metadata.get("to"),
            Some(&MetadataValue::Wallet(WalletDto {
                address: "jjio5-5aaaa-aaaam-adhaq-cai".to_string(),
                chain: "IC".to_string(),
            }))
        );
        assert_eq!(
            tx2_1.protocol_metadata.get("from"),
            Some(&MetadataValue::Wallet(WalletDto {
                address: creator.clone(),
                chain: "IC".to_string(),
            }))
        );
        assert_eq!(
            tx2_1.protocol_metadata.get("asset"),
            Some(&MetadataValue::Asset(AssetDto {
                address: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
                chain: "IC".to_string(),
            }))
        );
        assert_eq!(
            tx2_1.protocol_metadata.get("amount"),
            Some(&MetadataValue::U64(10_0000_0000))
        );

        let tx3_1 = &action_dto.intents[2].transactions[0];
        let tx3_2 = &action_dto.intents[2].transactions[1];

        assert_eq!(tx3_1.protocol, "Icrc2Approve".to_string());
        assert_eq!(tx3_2.protocol, "Icrc2TransferFrom".to_string());

        assert_eq!(tx3_1.state, TransactionState::Created.to_string());
        assert_eq!(tx3_2.state, TransactionState::Created.to_string());

        assert_eq!(
            tx3_1.protocol_metadata.get("spender"),
            Some(&MetadataValue::Wallet(WalletDto {
                address: "jjio5-5aaaa-aaaam-adhaq-cai".to_string(),
                chain: "IC".to_string(),
            }))
        );
        assert_eq!(
            tx3_1.protocol_metadata.get("from"),
            Some(&MetadataValue::Wallet(WalletDto {
                address: creator.clone(),
                chain: "IC".to_string(),
            }))
        );
        assert_eq!(
            tx3_1.protocol_metadata.get("amount"),
            Some(&MetadataValue::U64(10_0000))
        );
        assert_eq!(
            tx3_1.protocol_metadata.get("asset"),
            Some(&MetadataValue::Asset(AssetDto {
                address: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
                chain: "IC".to_string(),
            }))
        );
        let expected_dependencies = vec![tx1_1.id.clone(), tx2_1.id.clone(), tx3_1.id.clone()];
        let actual_dependencies = tx3_2.dependency.clone().unwrap_or_default();
        assert!(expected_dependencies
            .iter()
            .all(|item| actual_dependencies.contains(item)));

        assert_eq!(
            tx3_1.dependency,
            Some(vec![tx1_1.id.clone(), tx2_1.id.clone()])
        );

        assert_eq!(
            tx3_2.protocol_metadata.get("spender"),
            Some(&MetadataValue::Wallet(WalletDto {
                address: "jjio5-5aaaa-aaaam-adhaq-cai".to_string(),
                chain: "IC".to_string(),
            }))
        );
        assert_eq!(
            tx3_2.protocol_metadata.get("from"),
            Some(&MetadataValue::Wallet(WalletDto {
                address: creator.clone(),
                chain: "IC".to_string(),
            }))
        );
        assert_eq!(
            tx3_2.protocol_metadata.get("to"),
            Some(&MetadataValue::Wallet(WalletDto {
                address: link_vault_account.to_string(),
                chain: "IC".to_string(),
            }))
        );
        assert_eq!(
            tx3_2.protocol_metadata.get("amount"),
            Some(&MetadataValue::U64(10_0000))
        );
        // Assert that tx3_2.dependency contains the expected values
        let expected_dependencies = vec![tx1_1.id.clone(), tx2_1.id.clone(), tx3_1.id.clone()];
        let actual_dependencies = tx3_2.dependency.clone().unwrap_or_default();
        assert!(expected_dependencies
            .iter()
            .all(|item| actual_dependencies.contains(item)));
    }

    #[tokio::test]
    async fn should_return_error_if_action_already_exists() {
        let mut action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let execute_transaction_service = ExecuteTransactionService::faux();
        let transaction_service: TransactionService<MockIcEnvironment> = TransactionService::faux();
        let manual_check_status_service = ManualCheckStatusService::faux();

        let action_id = Uuid::new_v4().to_string();
        let link_id = Uuid::new_v4().to_string();
        let creator = generate_random_principal().to_text();

        let mut intent1 = create_dummy_intent(IntentState::Created);
        let mut intent2 = create_dummy_intent(IntentState::Created);
        intent1.id = Uuid::new_v4().to_string();
        intent2.id = Uuid::new_v4().to_string();

        let intents = vec![intent1.clone(), intent2.clone()];

        let temp_action = TemporaryAction {
            id: action_id.clone(),
            r#type: ActionType::CreateLink,
            state: ActionState::Created,
            creator: creator.clone(),
            link_id: link_id.clone(),
            intents: intents.clone(),
        };

        when!(action_service.get_action_by_id).then_return(Some(temp_action.as_action()));
        when!(ic_env.time).then_return(generate_timestamp());

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                manual_check_status_service,
                ic_env,
                execute_transaction_service,
            );

        let result = transaction_manager_service.tx_man_create_action(&temp_action);

        assert!(matches!(result, Err(CanisterError::HandleLogicError(_))));
    }
}
