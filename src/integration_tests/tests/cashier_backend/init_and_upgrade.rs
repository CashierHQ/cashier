// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{init::CashierBackendUpgradeData, settings::UpdateSettingArgs};

use crate::utils::{
    get_cashier_backend_canister_bytecode, principal::TestUser, with_pocket_ic_context,
};

fn upgrade_args_empty() -> CashierBackendUpgradeData {
    CashierBackendUpgradeData {
        token_fee_ttl_ns: None,
        token_storage_canister_id: None,
        token_standard_cache_ttl_ns: None,
        gate_service_canister_id: None,
    }
}

/// Canister ids set via `admin_update_setting` must survive an upgrade run with EMPTY args
/// (the anti-clobber guarantee — they live in stable Settings, not volatile memory).
#[tokio::test]
async fn should_persist_canister_ids_across_upgrade() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: admin sets new distinct ids at runtime.
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);
        let new_ts = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap();
        let new_gate = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();

        admin_client
            .admin_update_setting(UpdateSettingArgs {
                inspect_message_enabled: None,
                token_storage_canister_id: Some(new_ts),
                gate_service_canister_id: Some(new_gate),
            })
            .await
            .unwrap()
            .unwrap();

        let before = admin_client.admin_get_setting().await.unwrap();
        assert_eq!(before.token_storage_canister_id, new_ts);
        assert_eq!(before.gate_service_canister_id, new_gate);

        // Act: upgrade with EMPTY args (no ids supplied).
        ctx.upgrade_canister(
            ctx.cashier_backend_principal,
            None,
            get_cashier_backend_canister_bytecode(),
            (upgrade_args_empty(),),
        )
        .await;

        // Assert: stable ids preserved (not clobbered to anonymous).
        let after = admin_client.admin_get_setting().await.unwrap();
        assert_eq!(after.token_storage_canister_id, new_ts);
        assert_eq!(after.gate_service_canister_id, new_gate);

        Ok(())
    })
    .await
    .unwrap();
}

/// Upgrade args, when provided (`Some`), override the stable value.
#[tokio::test]
async fn should_apply_canister_ids_from_upgrade_args_when_provided() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);
        let overridden_ts = Principal::from_text("r7inp-6aaaa-aaaaa-aaabq-cai").unwrap();

        // Act: upgrade supplying only token_storage id.
        let mut args = upgrade_args_empty();
        args.token_storage_canister_id = Some(overridden_ts);
        ctx.upgrade_canister(
            ctx.cashier_backend_principal,
            None,
            get_cashier_backend_canister_bytecode(),
            (args,),
        )
        .await;

        // Assert: overridden value applied; the un-supplied gate id keeps its init value.
        let after = admin_client.admin_get_setting().await.unwrap();
        assert_eq!(after.token_storage_canister_id, overridden_ts);
        assert_eq!(after.gate_service_canister_id, ctx.gate_service_principal);

        Ok(())
    })
    .await
    .unwrap();
}

/// Non-admin callers cannot update settings (rejected at inspect ingress / in-method).
#[tokio::test]
async fn should_not_allow_non_admin_to_update_setting() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_cashier_backend_client(user);

        let result = user_client
            .admin_update_setting(UpdateSettingArgs::default())
            .await;

        assert!(result.is_err());

        Ok(())
    })
    .await
    .unwrap();
}

/// Non-admin callers cannot read settings either.
#[tokio::test]
async fn should_not_allow_non_admin_to_get_setting() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_cashier_backend_client(user);

        let result = user_client.admin_get_setting().await;

        assert!(result.is_err());

        Ok(())
    })
    .await
    .unwrap();
}
