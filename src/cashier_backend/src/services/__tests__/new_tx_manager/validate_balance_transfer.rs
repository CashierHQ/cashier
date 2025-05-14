use candid::Principal;
use cashier_types::{Asset, Chain, Icrc1Transfer, Wallet};
use faux::when;
use icrc_ledger_types::icrc1::account::Account;

use crate::{
    services::{
        __tests__::{fixture::TransactionManagerTestFixture, tests::generate_random_principal},
        transaction_manager::TransactionManagerService,
    },
    types::error::CanisterError,
};

#[tokio::test]
async fn test_validate_balance_transfer_success() {
    // Setup test fixture
    let (transaction_service, action_service, ic_env, mut icrc_service, ic_intent_adapter) =
        TransactionManagerTestFixture::setup();

    // Create mock data
    let recipient = generate_random_principal();
    let token_principal = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
    let token_amount = 10_000_000;

    // Create an ICRC1 transfer protocol
    let transfer = Icrc1Transfer {
        from: Wallet {
            address: "sender_address".to_string(),
            chain: Chain::IC,
        },
        to: Wallet {
            address: Account {
                owner: recipient,
                subaccount: None,
            }
            .to_string(),
            chain: Chain::IC,
        },
        asset: Asset {
            address: token_principal.to_text(),
            chain: Chain::IC,
        },
        amount: token_amount,
        memo: None,
        ts: Some(0),
    };

    // Mock the balance_of call to return sufficient balance (equal to transfer amount)
    when!(icrc_service.balance_of).then_return(Ok(token_amount));

    // Create the service under test
    let tx_manager_service = TransactionManagerService::new(
        transaction_service,
        action_service,
        ic_env,
        icrc_service,
        ic_intent_adapter,
    );

    // Call the method under test
    let result = tx_manager_service
        .validate_balance_transfer(&transfer)
        .await;

    // Assert the result is successful
    assert!(
        result.is_ok(),
        "Expected validate_balance_transfer to succeed"
    );
    assert_eq!(result.unwrap(), true, "Expected validation to return true");
}

#[tokio::test]
async fn test_validate_balance_transfer_insufficient_balance() {
    // Setup test fixture
    let (transaction_service, action_service, ic_env, mut icrc_service, ic_intent_adapter) =
        TransactionManagerTestFixture::setup();

    // Create mock data
    let recipient = generate_random_principal();
    let token_principal = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
    let token_amount = 10_000_000;
    let available_balance = token_amount - 1; // Less than the required amount

    // Create an ICRC1 transfer protocol
    let transfer = Icrc1Transfer {
        from: Wallet {
            address: "sender_address".to_string(),
            chain: Chain::IC,
        },
        to: Wallet {
            address: Account {
                owner: recipient,
                subaccount: None,
            }
            .to_string(),
            chain: Chain::IC,
        },
        asset: Asset {
            address: token_principal.to_text(),
            chain: Chain::IC,
        },
        amount: token_amount,
        memo: None,
        ts: Some(0),
    };

    // Mock the balance_of call to return insufficient balance
    when!(icrc_service.balance_of).then_return(Ok(available_balance));

    // Create the service under test
    let tx_manager_service = TransactionManagerService::new(
        transaction_service,
        action_service,
        ic_env,
        icrc_service,
        ic_intent_adapter,
    );

    // Call the method under test
    let result = tx_manager_service
        .validate_balance_transfer(&transfer)
        .await;

    // Assert the result is successful but validation fails
    assert!(
        result.is_ok(),
        "Expected validate_balance_transfer to succeed"
    );
    assert_eq!(
        result.unwrap(),
        false,
        "Expected validation to return false due to insufficient balance"
    );
}

#[tokio::test]
async fn test_validate_balance_transfer_api_error() {
    // Setup test fixture
    let (transaction_service, action_service, ic_env, mut icrc_service, ic_intent_adapter) =
        TransactionManagerTestFixture::setup();

    // Create mock data
    let recipient = generate_random_principal();
    let token_principal = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
    let token_amount = 10_000_000;

    // Create an ICRC1 transfer protocol
    let transfer = Icrc1Transfer {
        from: Wallet {
            address: "sender_address".to_string(),
            chain: Chain::IC,
        },
        to: Wallet {
            address: Account {
                owner: recipient,
                subaccount: None,
            }
            .to_string(),
            chain: Chain::IC,
        },
        asset: Asset {
            address: token_principal.to_text(),
            chain: Chain::IC,
        },
        amount: token_amount,
        memo: None,
        ts: Some(0),
    };

    // Mock the balance_of call to return an error
    when!(icrc_service.balance_of).then_return(Err(CanisterError::CanisterCallError {
        method: "icrc1_balance_of".to_string(),
        canister_id: token_principal.to_text(),
        message: "Failed to get balance".to_string(),
    }));

    // Create the service under test
    let tx_manager_service = TransactionManagerService::new(
        transaction_service,
        action_service,
        ic_env,
        icrc_service,
        ic_intent_adapter,
    );

    // Call the method under test
    let result = tx_manager_service
        .validate_balance_transfer(&transfer)
        .await;

    // Assert the error is propagated
    assert!(
        result.is_err(),
        "Expected validate_balance_transfer to fail"
    );
    match result {
        Err(CanisterError::CanisterCallError { method, .. }) => {
            assert_eq!(
                method, "icrc1_balance_of",
                "Error should be from balance_of call"
            );
        }
        _ => panic!("Expected CanisterCallError, got: {:?}", result),
    }
}

#[tokio::test]
async fn test_validate_balance_transfer_account_parse_error() {
    // Setup test fixtures
    let (transaction_service, action_service, ic_env, mut icrc_service, ic_intent_adapter) =
        TransactionManagerTestFixture::setup();

    // Create an ICRC1 transfer with invalid account format
    let transfer = Icrc1Transfer {
        from: Wallet {
            address: "sender_address".to_string(),
            chain: Chain::IC,
        },
        to: Wallet {
            address: "invalid_account_format".to_string(), // Invalid format
            chain: Chain::IC,
        },
        asset: Asset {
            address: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
            chain: Chain::IC,
        },
        amount: 1000,
        memo: None,
        ts: Some(0),
    };

    // Create the service under test
    let tx_manager_service = TransactionManagerService::new(
        transaction_service,
        action_service,
        ic_env,
        icrc_service,
        ic_intent_adapter,
    );

    // Call the method under test
    let result = tx_manager_service
        .validate_balance_transfer(&transfer)
        .await;

    // Assert a parsing error occurs
    assert!(
        result.is_err(),
        "Expected validate_balance_transfer to fail due to parsing error"
    );
    match result {
        Err(CanisterError::ParseAccountError(_)) => {
            // Success - we got the expected error type
        }
        _ => panic!("Expected ParseAccountError, got: {:?}", result),
    }
}
