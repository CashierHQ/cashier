// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use candid::{Nat, Principal};
use cashier_types::{Asset, Chain, Icrc1Transfer, Icrc2Approve, Wallet};
use faux::when;
use icrc_ledger_types::icrc1::account::Account;

use crate::{
    services::{
        __tests__::{fixture::TransactionManagerTestFixture, tests::generate_random_principal},
        ext::icrc_token::Allowance,
        transaction_manager::TransactionManagerService,
    },
    types::error::CanisterError,
};

#[tokio::test]
async fn test_validate_allowance_success() {
    // Setup test fixtures
    let (transaction_service, action_service, ic_env, mut icrc_service, ic_intent_adapter) =
        TransactionManagerTestFixture::setup();

    // Create mock data
    let owner = generate_random_principal();
    let spender = generate_random_principal();
    let token_principal = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
    let approval_amount = 10_000_000;

    // Create an ICRC2 approve protocol
    let approve = Icrc2Approve {
        from: Wallet {
            address: Account {
                owner,
                subaccount: None,
            }
            .to_string(),
            chain: Chain::IC,
        },
        spender: Wallet {
            address: Account {
                owner: spender,
                subaccount: None,
            }
            .to_string(),
            chain: Chain::IC,
        },
        asset: Asset {
            address: token_principal.to_text(),
            chain: Chain::IC,
        },
        amount: approval_amount,
    };

    // Mock the allowance call to return sufficient allowance (equal to requested amount)
    when!(icrc_service.allowance).then_return(Ok(Allowance {
        allowance: Nat::from(approval_amount),
        expires_at: None,
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
    let result = tx_manager_service.validate_allowance(&approve).await;

    // Assert the result is successful
    assert!(result.is_ok(), "Expected validate_allowance to succeed");
    assert_eq!(result.unwrap(), true, "Expected validation to return true");
}

#[tokio::test]
async fn test_validate_allowance_insufficient() {
    // Setup test fixtures
    let (transaction_service, action_service, ic_env, mut icrc_service, ic_intent_adapter) =
        TransactionManagerTestFixture::setup();

    // Create mock data
    let owner = generate_random_principal();
    let spender = generate_random_principal();
    let token_principal = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
    let approval_amount = 10_000_000;
    let available_allowance = approval_amount - 1; // Less than the required amount

    // Create an ICRC2 approve protocol
    let approve = Icrc2Approve {
        from: Wallet {
            address: Account {
                owner,
                subaccount: None,
            }
            .to_string(),
            chain: Chain::IC,
        },
        spender: Wallet {
            address: Account {
                owner: spender,
                subaccount: None,
            }
            .to_string(),
            chain: Chain::IC,
        },
        asset: Asset {
            address: token_principal.to_text(),
            chain: Chain::IC,
        },
        amount: approval_amount,
    };

    // Mock the allowance call to return insufficient allowance
    when!(icrc_service.allowance).then_return(Ok(Allowance {
        allowance: Nat::from(available_allowance),
        expires_at: None,
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
    let result = tx_manager_service.validate_allowance(&approve).await;

    // Assert the result is successful but validation fails
    assert!(result.is_ok(), "Expected validate_allowance to succeed");
    assert_eq!(
        result.unwrap(),
        false,
        "Expected validation to return false due to insufficient allowance"
    );
}

#[tokio::test]
async fn test_validate_allowance_api_error() {
    // Setup test fixtures
    let (transaction_service, action_service, ic_env, mut icrc_service, ic_intent_adapter) =
        TransactionManagerTestFixture::setup();

    // Create mock data
    let owner = generate_random_principal();
    let spender = generate_random_principal();
    let token_principal = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
    let approval_amount = 10_000_000;

    // Create an ICRC2 approve protocol
    let approve = Icrc2Approve {
        from: Wallet {
            address: Account {
                owner,
                subaccount: None,
            }
            .to_string(),
            chain: Chain::IC,
        },
        spender: Wallet {
            address: Account {
                owner: spender,
                subaccount: None,
            }
            .to_string(),
            chain: Chain::IC,
        },
        asset: Asset {
            address: token_principal.to_text(),
            chain: Chain::IC,
        },
        amount: approval_amount,
    };

    // Mock the allowance call to return an error
    when!(icrc_service.allowance).then_return(Err(CanisterError::CanisterCallError {
        method: "icrc2_allowance".to_string(),
        canister_id: token_principal.to_text(),
        message: "Failed to get allowance".to_string(),
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
    let result = tx_manager_service.validate_allowance(&approve).await;

    // Assert the error is propagated
    assert!(result.is_err(), "Expected validate_allowance to fail");
    match result {
        Err(CanisterError::CanisterCallError { method, .. }) => {
            assert_eq!(
                method, "icrc2_allowance",
                "Error should be from allowance call"
            );
        }
        _ => panic!("Expected CanisterCallError, got: {:?}", result),
    }
}

#[tokio::test]
async fn test_validate_allowance_account_parse_error() {
    // Setup test fixtures
    let (transaction_service, action_service, ic_env, mut icrc_service, ic_intent_adapter) =
        TransactionManagerTestFixture::setup();

    // Create an ICRC2 approve protocol with invalid account formats
    let approve = Icrc2Approve {
        from: Wallet {
            address: "invalid_account_format".to_string(), // Invalid format
            chain: Chain::IC,
        },
        spender: Wallet {
            address: "another_invalid_format".to_string(), // Invalid format
            chain: Chain::IC,
        },
        asset: Asset {
            address: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
            chain: Chain::IC,
        },
        amount: 1000,
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
    let result = tx_manager_service.validate_allowance(&approve).await;
    // Assert a parsing error occurs
    assert!(
        result.is_err(),
        "Expected validate_allowance to fail due to parsing error"
    );
    match result {
        Err(CanisterError::ParseAccountError(_)) => {
            // Success - we got the expected error type
        }
        _ => panic!("Expected ParseAccountError, got: {:?}", result),
    }
}
