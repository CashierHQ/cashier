// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repositories::{
    ACTION_INTENT_STORE, ACTION_STORE, INTENT_STORE, INTENT_TRANSACTION_STORE, LINK_ACTION_STORE,
    LINK_STORE, TRANSACTION_STORE, USER_ACTION_STORE, USER_LINK_STORE, USER_STORE,
    USER_WALLET_STORE,
};

/// Migrates all data from versioned stores back to normal stores
/// Returns the total number of records migrated across all stores
/// NOTE: Versioned stores have been removed, so this always returns 0
pub fn migrate_versioned_to_normal_stores() -> u64 {
    // All versioned stores have been removed, so no migration is needed
    0
}

/// Clear all versioned stores after migration
/// NOTE: Versioned stores have been removed, so this is a no-op
pub fn clear_versioned_stores_after_migration() {
    // All versioned stores have been removed, nothing to clear
}

/// Get the total count of all versioned stores
/// NOTE: Always returns 0 since versioned stores have been removed
pub fn get_versioned_stores_count() -> u64 {
    0
}

/// Get the total count of all normal stores
pub fn get_normal_stores_count() -> u64 {
    let mut total = 0u64;

    // Count normal stores
    USER_STORE.with_borrow(|store| {
        total += store.len();
    });

    USER_WALLET_STORE.with_borrow(|store| {
        total += store.len();
    });

    USER_LINK_STORE.with_borrow(|store| {
        total += store.len();
    });

    USER_ACTION_STORE.with_borrow(|store| {
        total += store.len();
    });

    LINK_STORE.with_borrow(|store| {
        total += store.len();
    });

    LINK_ACTION_STORE.with_borrow(|store| {
        total += store.len();
    });

    ACTION_STORE.with_borrow(|store| {
        total += store.len();
    });

    ACTION_INTENT_STORE.with_borrow(|store| {
        total += store.len();
    });

    INTENT_STORE.with_borrow(|store| {
        total += store.len();
    });

    INTENT_TRANSACTION_STORE.with_borrow(|store| {
        total += store.len();
    });

    TRANSACTION_STORE.with_borrow(|store| {
        total += store.len();
    });

    total
}

/// Get detailed formatted report of store counts
pub fn get_stores_count_report() -> String {
    let mut report = String::new();

    report.push_str("📊 **Store Count Report**\n");
    report.push_str("========================\n\n");

    // Normal stores section
    report.push_str("✅ **Normal Stores (Active)**\n");
    report.push_str("-----------------------------\n");

    let mut normal_total = 0u64;

    USER_STORE.with_borrow(|store| {
        let count = store.len();
        normal_total += count;
        report.push_str(&format!("• User Store: {}\n", count));
    });

    USER_WALLET_STORE.with_borrow(|store| {
        let count = store.len();
        normal_total += count;
        report.push_str(&format!("• User Wallet Store: {}\n", count));
    });

    USER_LINK_STORE.with_borrow(|store| {
        let count = store.len();
        normal_total += count;
        report.push_str(&format!("• User Link Store: {}\n", count));
    });

    USER_ACTION_STORE.with_borrow(|store| {
        let count = store.len();
        normal_total += count;
        report.push_str(&format!("• User Action Store: {}\n", count));
    });

    LINK_STORE.with_borrow(|store| {
        let count = store.len();
        normal_total += count;
        report.push_str(&format!("• Link Store: {}\n", count));
    });

    LINK_ACTION_STORE.with_borrow(|store| {
        let count = store.len();
        normal_total += count;
        report.push_str(&format!("• Link Action Store: {}\n", count));
    });

    ACTION_STORE.with_borrow(|store| {
        let count = store.len();
        normal_total += count;
        report.push_str(&format!("• Action Store: {}\n", count));
    });

    ACTION_INTENT_STORE.with_borrow(|store| {
        let count = store.len();
        normal_total += count;
        report.push_str(&format!("• Action Intent Store: {}\n", count));
    });

    INTENT_STORE.with_borrow(|store| {
        let count = store.len();
        normal_total += count;
        report.push_str(&format!("• Intent Store (v2): {}\n", count));
    });

    INTENT_TRANSACTION_STORE.with_borrow(|store| {
        let count = store.len();
        normal_total += count;
        report.push_str(&format!("• Intent Transaction Store: {}\n", count));
    });

    TRANSACTION_STORE.with_borrow(|store| {
        let count = store.len();
        normal_total += count;
        report.push_str(&format!("• Transaction Store (v2): {}\n", count));
    });

    report.push_str(&format!("\n**Normal Stores Total: {}**\n", normal_total));

    // Versioned stores section (all removed)
    report.push_str("\n🗑️ **Versioned Stores (Removed)**\n");
    report.push_str("----------------------------------\n");
    report.push_str("• All versioned stores have been removed\n");
    report.push_str("• Migration to normal stores completed\n");
    report.push_str("• Memory IDs 12-24 are now unused\n");

    let versioned_total = 0u64;

    // Summary
    report.push_str(&format!("\n🎯 **Summary**\n"));
    report.push_str("=============\n");
    report.push_str(&format!("• Normal stores: {}\n", normal_total));
    report.push_str(&format!(
        "• Versioned stores: {} (removed)\n",
        versioned_total
    ));
    report.push_str(&format!(
        "• **Grand Total: {}**\n",
        normal_total + versioned_total
    ));

    report.push_str("\n✅ Migration Status: Complete\n");
    report.push_str("📝 All data now uses normal stores with v2 types\n");

    report
}

/// Get compact report showing only non-empty stores
pub fn get_compact_stores_report() -> String {
    let mut report = String::new();
    let mut has_data = false;

    report.push_str("📋 **Compact Store Report**\n");
    report.push_str("===========================\n\n");

    USER_STORE.with_borrow(|store| {
        let count = store.len();
        if count > 0 {
            report.push_str(&format!("• User: {}\n", count));
            has_data = true;
        }
    });

    USER_WALLET_STORE.with_borrow(|store| {
        let count = store.len();
        if count > 0 {
            report.push_str(&format!("• User Wallet: {}\n", count));
            has_data = true;
        }
    });

    USER_LINK_STORE.with_borrow(|store| {
        let count = store.len();
        if count > 0 {
            report.push_str(&format!("• User Link: {}\n", count));
            has_data = true;
        }
    });

    USER_ACTION_STORE.with_borrow(|store| {
        let count = store.len();
        if count > 0 {
            report.push_str(&format!("• User Action: {}\n", count));
            has_data = true;
        }
    });

    LINK_STORE.with_borrow(|store| {
        let count = store.len();
        if count > 0 {
            report.push_str(&format!("• Link: {}\n", count));
            has_data = true;
        }
    });

    LINK_ACTION_STORE.with_borrow(|store| {
        let count = store.len();
        if count > 0 {
            report.push_str(&format!("• Link Action: {}\n", count));
            has_data = true;
        }
    });

    ACTION_STORE.with_borrow(|store| {
        let count = store.len();
        if count > 0 {
            report.push_str(&format!("• Action: {}\n", count));
            has_data = true;
        }
    });

    ACTION_INTENT_STORE.with_borrow(|store| {
        let count = store.len();
        if count > 0 {
            report.push_str(&format!("• Action Intent: {}\n", count));
            has_data = true;
        }
    });

    INTENT_STORE.with_borrow(|store| {
        let count = store.len();
        if count > 0 {
            report.push_str(&format!("• Intent (v2): {}\n", count));
            has_data = true;
        }
    });

    INTENT_TRANSACTION_STORE.with_borrow(|store| {
        let count = store.len();
        if count > 0 {
            report.push_str(&format!("• Intent Transaction: {}\n", count));
            has_data = true;
        }
    });

    TRANSACTION_STORE.with_borrow(|store| {
        let count = store.len();
        if count > 0 {
            report.push_str(&format!("• Transaction (v2): {}\n", count));
            has_data = true;
        }
    });

    if !has_data {
        report.push_str("💡 All stores are empty\n");
    }

    report.push_str("\n✅ Status: All versioned stores removed, using normal stores only\n");

    report
}
