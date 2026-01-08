// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

//! Utility for draining tokens from link subaccounts in tests.
//!
//! Used to simulate insufficient balance scenarios for partial success testing.

use crate::utils::{PocketIcTestContext, link_id_to_account::link_id_to_account};
use candid::Nat;
use icrc_ledger_types::icrc1::{account::Account, transfer::TransferArg};

/// Drains tokens from link subaccount to simulate insufficient balance.
/// Uses cashier_backend as caller since it owns the link subaccounts.
pub async fn drain_link_token_balance(ctx: &PocketIcTestContext, link_id: &str, token_name: &str) {
    let link_account = link_id_to_account(ctx, link_id);
    let ledger_principal = ctx.get_icrc_token_principal(token_name).unwrap();

    // Get current balance
    let ledger_client = ctx.new_icrc_ledger_client(token_name, ctx.cashier_backend_principal);
    let current_balance = ledger_client.balance_of(&link_account).await.unwrap();

    if current_balance == 0u64 {
        return; // Nothing to drain
    }

    // Get fee for this token
    let fee = ledger_client.fee().await.unwrap();

    // Calculate amount to drain (balance - fee so transfer succeeds)
    let drain_amount = if current_balance > fee.clone() {
        current_balance - fee.clone()
    } else {
        return; // Can't drain - balance <= fee
    };

    let drain_to = Account {
        owner: candid::Principal::management_canister(),
        subaccount: None,
    };

    let transfer_args = TransferArg {
        memo: None,
        amount: drain_amount,
        fee: Some(fee),
        from_subaccount: link_account.subaccount,
        to: drain_to,
        created_at_time: None,
    };

    let result = ctx
        .client
        .update_call(
            ledger_principal,
            ctx.cashier_backend_principal,
            "icrc1_transfer",
            candid::encode_one(transfer_args).unwrap(),
        )
        .await;

    // Verify drain succeeded
    assert!(result.is_ok(), "Drain transfer failed: {:?}", result);

    // Verify balance is now 0
    let balance_after = ledger_client.balance_of(&link_account).await.unwrap();
    assert_eq!(
        balance_after,
        Nat::from(0u64),
        "Balance should be 0 after drain, got {}",
        balance_after
    );
}
