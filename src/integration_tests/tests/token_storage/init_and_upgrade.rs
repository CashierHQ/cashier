// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use token_storage_types::{
    init::TokenStorageUpgradeData,
    settings::UpdateSettingArgs,
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
                supported_standards: vec![
                    IcrcStandard::ICRC1,
                    IcrcStandard::ICRC2,
                    IcrcStandard::ICRC3,
                ],
            },
            symbol: "NEWTKN".to_string(),
            name: "New Test Token".to_string(),
            decimals: 8,
            enabled_by_default: false,
            is_rune: None,
            rune_info: None,
        };

        let ckbtc_minter_principal =
            Principal::from_text(crate::constant::ckbtc::CKBTC_MINTER_PRINCIPAL_ID).unwrap();
        let omnity_bitcoin_principal = ctx.omnity_bitcoin_principal;

        // Act
        ctx.upgrade_canister(
            ctx.token_storage_principal,
            None,
            get_token_storage_canister_bytecode(),
            (TokenStorageUpgradeData {
                ckbtc_minter_id: Some(ckbtc_minter_principal),
                omnity_bitcoin_id: Some(omnity_bitcoin_principal),
                tokens: Some(vec![new_token]),
            },),
        )
        .await;

        // Assert
        let after = admin_client.list_tokens().await.unwrap().unwrap();
        assert!(after.tokens.len() > before_count);

        match after.tokens.iter().find(|t| t.symbol == "NEWTKN") {
            Some(token) => match &token.details {
                ChainTokenDetails::IC {
                    ledger_id,
                    supported_standards,
                    ..
                } => {
                    assert_eq!(
                        *ledger_id,
                        Principal::from_text("r7inp-6aaaa-aaaaa-aaabq-cai").unwrap()
                    );
                    assert_eq!(
                        supported_standards,
                        &vec![
                            IcrcStandard::ICRC1,
                            IcrcStandard::ICRC2,
                            IcrcStandard::ICRC3
                        ]
                    );
                }
            },
            None => panic!("New token not found after upgrade"),
        }

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
        let omnity_bitcoin_principal = ctx.omnity_bitcoin_principal;

        // Act
        ctx.upgrade_canister(
            ctx.token_storage_principal,
            None,
            get_token_storage_canister_bytecode(),
            (TokenStorageUpgradeData {
                ckbtc_minter_id: Some(ckbtc_minter_principal),
                omnity_bitcoin_id: Some(omnity_bitcoin_principal),
                tokens: None,
            },),
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
        let omnity_bitcoin_principal = ctx.omnity_bitcoin_principal;

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
            is_rune: None,
            rune_info: None,
        };

        // Act
        ctx.upgrade_canister(
            ctx.token_storage_principal,
            None,
            get_token_storage_canister_bytecode(),
            (TokenStorageUpgradeData {
                ckbtc_minter_id: Some(ckbtc_minter_principal),
                omnity_bitcoin_id: Some(omnity_bitcoin_principal),
                tokens: Some(vec![updated_icp]),
            },),
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
                assert_eq!(
                    supported_standards,
                    &vec![
                        IcrcStandard::ICRC1,
                        IcrcStandard::ICRC2,
                        IcrcStandard::ICRC3,
                    ]
                );
            }
        }

        Ok(())
    })
    .await
    .unwrap();
}

fn upgrade_args_empty() -> TokenStorageUpgradeData {
    TokenStorageUpgradeData {
        ckbtc_minter_id: None,
        omnity_bitcoin_id: None,
        tokens: None,
    }
}

/// Canister ids set via `admin_update_setting` must survive an upgrade run with EMPTY args
/// (anti-clobber — they live in stable Settings, not volatile memory).
#[tokio::test]
async fn should_persist_canister_ids_across_upgrade() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: admin sets new distinct ids at runtime.
        let admin = TestUser::TokenStorageAdmin.get_principal();
        let admin_client = ctx.new_token_storage_client(admin);
        let new_ckbtc = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap();
        let new_omnity = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();

        admin_client
            .admin_update_setting(UpdateSettingArgs {
                inspect_message_enabled: None,
                ckbtc_minter_id: Some(new_ckbtc),
                omnity_bitcoin_id: Some(new_omnity),
            })
            .await
            .unwrap()
            .unwrap();

        let before = admin_client.admin_get_setting().await.unwrap();
        assert_eq!(before.ckbtc_minter_id, new_ckbtc);
        assert_eq!(before.omnity_bitcoin_id, new_omnity);

        // Act: upgrade with EMPTY args (no ids supplied).
        ctx.upgrade_canister(
            ctx.token_storage_principal,
            None,
            get_token_storage_canister_bytecode(),
            (upgrade_args_empty(),),
        )
        .await;

        // Assert: stable ids preserved (not clobbered).
        let after = admin_client.admin_get_setting().await.unwrap();
        assert_eq!(after.ckbtc_minter_id, new_ckbtc);
        assert_eq!(after.omnity_bitcoin_id, new_omnity);

        Ok(())
    })
    .await
    .unwrap();
}

/// Upgrade args, when provided (`Some`), override the stable value; omitted fields preserved.
#[tokio::test]
async fn should_apply_canister_ids_from_upgrade_args_when_provided() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let admin = TestUser::TokenStorageAdmin.get_principal();
        let admin_client = ctx.new_token_storage_client(admin);
        let overridden_ckbtc = Principal::from_text("r7inp-6aaaa-aaaaa-aaabq-cai").unwrap();
        let omnity_before = admin_client.admin_get_setting().await.unwrap().omnity_bitcoin_id;

        // Act: upgrade supplying only ckbtc id.
        let mut args = upgrade_args_empty();
        args.ckbtc_minter_id = Some(overridden_ckbtc);
        ctx.upgrade_canister(
            ctx.token_storage_principal,
            None,
            get_token_storage_canister_bytecode(),
            (args,),
        )
        .await;

        // Assert: ckbtc overridden; omnity (omitted) preserved.
        let after = admin_client.admin_get_setting().await.unwrap();
        assert_eq!(after.ckbtc_minter_id, overridden_ckbtc);
        assert_eq!(after.omnity_bitcoin_id, omnity_before);

        Ok(())
    })
    .await
    .unwrap();
}

/// Non-admin callers cannot update or read settings.
#[tokio::test]
async fn should_not_allow_non_admin_to_update_or_get_setting() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_token_storage_client(user);

        assert!(
            user_client
                .admin_update_setting(UpdateSettingArgs::default())
                .await
                .is_err()
        );
        assert!(user_client.admin_get_setting().await.is_err());

        Ok(())
    })
    .await
    .unwrap();
}
