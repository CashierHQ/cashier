// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


#[cfg(test)]
mod tests {
    use crate::domains::action::ActionDomainLogic;
    use crate::types::error::CanisterError;
    use cashier_types::repository::{
        Action, ActionState, ActionType, Asset, Icrc1Transfer, Intent, IntentState, Link,
        LinkState, Transaction, TransactionState, Wallet,
    };

    // Helper function to create a test action
    fn create_test_action() -> Action {
        Action {
            id: uuid::Uuid::new_v4().to_string(),
            r#type: ActionType::Use ,
            state: ActionState::Created,
            creator: uuid::Uuid::new_v4().to_string(),
            link_id: uuid::Uuid::new_v4().to_string(),
        }
    }

    // Helper function to create a test link
    fn create_test_link(state: LinkState, creator: &str) -> Link {
        Link {
            id: uuid::Uuid::new_v4().to_string(),
            state,
            title: Some("Test Link".to_string()),
            description: Some("A test link".to_string()),
            link_type: Some(cashier_types::LinkType::SendTip),
            asset_info: None,
            template: Some(cashier_types::Template::Central),
            creator: creator.to_string(),
            create_at: 1000000,
            metadata: None,
            link_use_action_counter: 0,
            link_use_action_max_count: 0,
        }
    }

    // Helper function to create a test intent
    fn create_test_intent(state: IntentState) -> Intent {
        Intent {
            id: uuid::Uuid::new_v4().to_string(),
            state,
            created_at: 1000000,
            dependency: vec![],
            chain: cashier_types::Chain::IC,
            task: cashier_types::IntentTask::TransferWalletToLink,
            r#type: cashier_types::IntentType::default_transfer(),
            label: "1000".to_string(),
        }
    }

    // Helper function to create a test transaction
    fn create_test_transaction(state: TransactionState) -> Transaction {
        Transaction {
            id: "test-transaction-id".to_string(),
            created_at: 1000000,
            state,
            dependency: None,
            protocol: cashier_types::Protocol::IC(cashier_types::IcTransaction::Icrc1Transfer(
                Icrc1Transfer {
                    from: Wallet::default(),
                    to: Wallet::default(),
                    asset: Asset::default(),
                    amount: 100000,
                    memo: None,
                    ts: None,
                },
            )),
            group: 1,
            from_call_type: cashier_types::FromCallType::Wallet,
            start_ts: None,
        }
    }

    #[test]
    fn test_validate_action_creator_not_link_creator() {
        let domain_logic = ActionDomainLogic::new();
        let mut action = create_test_action();
        let mut action2 = create_test_action();
        let link = create_test_link(LinkState::Active, "different-creator");
        action.r#type = ActionType::CreateLink;
        action2.r#type = ActionType::Withdraw;

        let result = domain_logic.validate_action(&action, &link);
        let result2 = domain_logic.validate_action(&action2, &link);

        assert!(
            matches!(result, Err(CanisterError::Unauthorized(_))),
            "Only the link creator can perform this action CreateLink"
        );
        assert!(
            matches!(result2, Err(CanisterError::Unauthorized(_))),
            "Only the link creator can perform this action Claim"
        );
    }

    #[test]
    fn test_validate_action_claim_inactive_link() {
        let domain_logic = ActionDomainLogic::new();
        let mut action = create_test_action();
        action.r#type = ActionType::Use ;
        let link = create_test_link(LinkState::ChooseLinkType, "test-creator");

        let result = domain_logic.validate_action(&action, &link);

        assert!(
            matches!(result, Err(CanisterError::ValidationErrors(_))),
            "Should reject Claim action on inactive link"
        );
    }

    #[test]
    fn test_validate_action_claim_active_link() {
        let domain_logic = ActionDomainLogic::new();
        let mut action = create_test_action();
        action.r#type = ActionType::Use ;
        let link = create_test_link(LinkState::Active, "different-creator");

        let result = domain_logic.validate_action(&action, &link);

        assert!(result.is_ok(), "Should allow Claim action on active link");
    }

    #[test]
    fn test_validate_intent_for_action_valid_combination() {
        let domain_logic = ActionDomainLogic::new();
        let mut action = create_test_action();
        action.r#type = ActionType::CreateLink;

        let mut intent = create_test_intent(IntentState::Created);
        intent.task = cashier_types::IntentTask::TransferWalletToLink;

        let result = domain_logic.validate_intent_for_action(&action, &intent);

        assert!(
            result.is_ok(),
            "Should allow valid intent and action combination"
        );
    }

    #[test]
    fn test_validate_intent_for_action_invalid_combination() {
        let domain_logic = ActionDomainLogic::new();
        let mut action = create_test_action();
        action.r#type = ActionType::CreateLink;

        let mut intent = create_test_intent(IntentState::Created);
        intent.task = cashier_types::IntentTask::TransferLinkToWallet;

        let result = domain_logic.validate_intent_for_action(&action, &intent);

        assert!(
            matches!(result, Err(CanisterError::ValidationErrors(_))),
            "Should reject invalid intent and action combination"
        );
    }

    #[test]
    fn test_calculate_intent_state_all_created_transactions() {
        let domain_logic = ActionDomainLogic::new();
        let transactions = vec![
            create_test_transaction(TransactionState::Created),
            create_test_transaction(TransactionState::Created),
        ];

        let result = domain_logic.roll_up_intent_state(&transactions);

        assert_eq!(
            result,
            IntentState::Created,
            "All Created transactions should result in Created intent state"
        );
    }

    #[test]
    fn test_calculate_intent_state_any_fail_transaction() {
        let domain_logic = ActionDomainLogic::new();
        let transactions = vec![
            create_test_transaction(TransactionState::Success),
            create_test_transaction(TransactionState::Fail),
            create_test_transaction(TransactionState::Processing),
        ];

        let result = domain_logic.roll_up_intent_state(&transactions);

        assert_eq!(
            result,
            IntentState::Fail,
            "Any Fail transaction should result in Fail intent state"
        );
    }

    #[test]
    fn test_calculate_intent_state_all_success_transactions() {
        let domain_logic = ActionDomainLogic::new();
        let transactions = vec![
            create_test_transaction(TransactionState::Success),
            create_test_transaction(TransactionState::Success),
        ];

        let result = domain_logic.roll_up_intent_state(&transactions);

        assert_eq!(
            result,
            IntentState::Success,
            "All Success transactions should result in Success intent state"
        );
    }

    #[test]
    fn test_calculate_intent_state_mixed_processing_and_success_transactions() {
        let domain_logic = ActionDomainLogic::new();
        let transactions = vec![
            create_test_transaction(TransactionState::Success),
            create_test_transaction(TransactionState::Processing),
        ];

        let result = domain_logic.roll_up_intent_state(&transactions);

        assert_eq!(
            result,
            IntentState::Processing,
            "Mixed Processing and Success transactions should result in Processing intent state"
        );
    }

    #[test]
    fn test_associate_intents() {
        let domain_logic = ActionDomainLogic::new();
        let action = Action {
            id: "test-action-id".to_string(),
            r#type: ActionType::CreateLink,
            state: ActionState::Created,
            creator: "test-creator".to_string(),
            link_id: "test-link-id".to_string(),
        };

        let mut intent1 = create_test_intent(IntentState::Created);
        let mut intent2 = create_test_intent(IntentState::Created);

        intent1.task = cashier_types::IntentTask::TransferWalletToLink;
        intent2.task = cashier_types::IntentTask::TransferWalletToTreasury;

        let intents = vec![intent1.clone(), intent2.clone()];

        let result = domain_logic.associate_intents(&action, &intents);

        assert!(
            result.is_ok(),
            "Should successfully associate valid intents"
        );
        let action_intents = result.unwrap();
        assert_eq!(
            action_intents.len(),
            2,
            "Should create action_intents for each intent"
        );
        assert_eq!(action_intents[0].action_id, action.id);
        assert_eq!(action_intents[0].intent_id, intent1.id);
        assert_eq!(action_intents[1].action_id, action.id);
        assert_eq!(action_intents[1].intent_id, intent2.id);
    }
}
