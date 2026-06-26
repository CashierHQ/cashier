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
        token_standard_cache_ttl_ns: None,
    }
}

/// Canister ids set via `admin_update_setting` must survive an upgrade run with EMPTY args
/// (the anti-clobber guarantee — they live in stable Settings, not volatile memory).
#[tokio::test]
async fn should_persist_canister_ids_across_upgrade() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: as admin, set new distinct ids and confirm they are stored (precondition).
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

        // Act: upgrade with EMPTY args (no ids supplied) — must not touch stable Settings.
        ctx.upgrade_canister(
            ctx.cashier_backend_principal,
            None,
            get_cashier_backend_canister_bytecode(),
            (upgrade_args_empty(),),
        )
        .await;

        // Assert: stable ids preserved (not clobbered to the anonymous principal).
        let after = admin_client.admin_get_setting().await.unwrap();
        assert_eq!(after.token_storage_canister_id, new_ts);
        assert_eq!(after.gate_service_canister_id, new_gate);

        Ok(())
    })
    .await
    .unwrap();
}
