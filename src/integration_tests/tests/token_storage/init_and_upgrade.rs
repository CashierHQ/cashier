// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use token_storage_types::{
    init::{TokenStorageArgs, TokenStorageUpgradeData},
    token::{ChainTokenDetails, IcrcStandard, RegistryToken},
};

use crate::{
    constant::ICP_PRINCIPAL,
    utils::{get_token_storage_canister_bytecode, principal::TestUser, with_pocket_ic_context},
};

/// Test: init registers default tokens at startup
#[tokio::test]
async fn should_init_with_default_tokens() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let client = ctx.new_token_storage_client(TestUser::TokenStorageAdmin.get_principal());

        // Act
        let tokens = client.list_tokens().await.unwrap().unwrap();

        // Assert
        assert!(!tokens.tokens.is_empty());
        assert!(tokens.tokens.iter().any(|t| t.symbol == "ICP"));
        assert!(tokens.tokens.iter().any(|t| t.symbol == "ckBTC"));
        assert!(tokens.tokens.iter().all(|t| t.is_default));

        Ok(())
    })
    .await
    .unwrap();
}

/// Test: init sets admin permissions correctly
#[tokio::test]
async fn should_init_with_admin_permissions() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::TokenStorageAdmin.get_principal();
        let admin_client = ctx.new_token_storage_client(admin);

        // Act
        let permissions = admin_client.admin_permissions_get(admin).await.unwrap();

        // Assert
        assert_eq!(
            vec![token_storage_types::auth::Permission::Admin],
            permissions
        );

        Ok(())
    })
    .await
    .unwrap();
}

/// Test: upgrade with tokens upserts them into registry
#[tokio::test]
async fn should_upgrade_with_tokens_upsert() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::TokenStorageAdmin.get_principal();
        let admin_client = ctx.new_token_storage_client(admin);
        let before = admin_client.list_tokens().await.unwrap().unwrap();
        let before_count = before.tokens.len();

        let new_token = RegistryToken {
            details: ChainTokenDetails::IC {
                ledger_id: Principal::from_text("r7inp-6aaaa-aaaaa-aaabq-cai").unwrap(),
                index_id: None,
                fee: Nat::from(1_000u64),
                supported_standards: vec![IcrcStandard::ICRC1],
            },
            symbol: "NEWTKN".to_string(),
            name: "New Test Token".to_string(),
            decimals: 8,
            enabled_by_default: false,
        };

        let ckbtc_minter_principal =
            Principal::from_text(crate::constant::ckbtc::CKBTC_MINTER_PRINCIPAL_ID).unwrap();

        // Act
        ctx.upgrade_canister(
            ctx.token_storage_principal,
            None,
            get_token_storage_canister_bytecode(),
            (TokenStorageArgs::Upgrade(TokenStorageUpgradeData {
                ckbtc_minter_id: ckbtc_minter_principal,
                tokens: Some(vec![new_token]),
            }),),
        )
        .await;

        // Assert
        let after = admin_client.list_tokens().await.unwrap().unwrap();
        assert!(after.tokens.len() > before_count);
        assert!(after.tokens.iter().any(|t| t.symbol == "NEWTKN"));

        Ok(())
    })
    .await
    .unwrap();
}

/// Test: upgrade without tokens preserves existing registry
#[tokio::test]
async fn should_upgrade_without_tokens_preserve_registry() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::TokenStorageAdmin.get_principal();
        let admin_client = ctx.new_token_storage_client(admin);
        let before = admin_client.list_tokens().await.unwrap().unwrap();

        let ckbtc_minter_principal =
            Principal::from_text(crate::constant::ckbtc::CKBTC_MINTER_PRINCIPAL_ID).unwrap();

        // Act
        ctx.upgrade_canister(
            ctx.token_storage_principal,
            None,
            get_token_storage_canister_bytecode(),
            (TokenStorageArgs::Upgrade(TokenStorageUpgradeData {
                ckbtc_minter_id: ckbtc_minter_principal,
                tokens: None,
            }),),
        )
        .await;

        // Assert
        let after = admin_client.list_tokens().await.unwrap().unwrap();
        assert_eq!(before.tokens.len(), after.tokens.len());
        assert!(after.tokens.iter().any(|t| t.symbol == "ICP"));

        Ok(())
    })
    .await
    .unwrap();
}

/// Test: upgrade with existing token updates it (upsert behavior)
#[tokio::test]
async fn should_upgrade_upsert_existing_token() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::TokenStorageAdmin.get_principal();
        let admin_client = ctx.new_token_storage_client(admin);

        let ckbtc_minter_principal =
            Principal::from_text(crate::constant::ckbtc::CKBTC_MINTER_PRINCIPAL_ID).unwrap();

        let updated_icp = RegistryToken {
            details: ChainTokenDetails::IC {
                ledger_id: Principal::from_text(ICP_PRINCIPAL).unwrap(),
                index_id: Some(Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap()),
                fee: Nat::from(10_000u64),
                supported_standards: vec![
                    IcrcStandard::ICRC1,
                    IcrcStandard::ICRC2,
                    IcrcStandard::ICRC3,
                ],
            },
            symbol: "ICP".to_string(),
            name: "Internet Computer".to_string(),
            decimals: 8,
            enabled_by_default: true,
        };

        // Act
        ctx.upgrade_canister(
            ctx.token_storage_principal,
            None,
            get_token_storage_canister_bytecode(),
            (TokenStorageArgs::Upgrade(TokenStorageUpgradeData {
                ckbtc_minter_id: ckbtc_minter_principal,
                tokens: Some(vec![updated_icp]),
            }),),
        )
        .await;

        // Assert
        let after = admin_client.list_tokens().await.unwrap().unwrap();
        let icp = after.tokens.iter().find(|t| t.symbol == "ICP").unwrap();
        match &icp.details {
            ChainTokenDetails::IC {
                supported_standards,
                ..
            } => {
                assert!(supported_standards.contains(&IcrcStandard::ICRC3));
            }
        }

        Ok(())
    })
    .await
    .unwrap();
}
