// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use candid::{CandidType, Deserialize};
use ic_cdk::{query, update};

use crate::migration::{
    get_intent_v1_total_records, get_intent_v2_total_records, get_transaction_v1_total_records,
    get_transaction_v2_total_records, migrate_intents_v1_to_v2, migrate_transactions_v1_to_v2,
};

/// Migration status response
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct MigrationStatus {
    pub v1_total: u64,
    pub v2_total: u64,
    pub migration_complete: bool,
}

/// Migration result response
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct MigrationResult {
    pub migrated_count: u64,
    pub total_v1_records: u64,
    pub total_v2_records_after: u64,
    pub success: bool,
    pub message: String,
}

/// Migrate data from v1 to v2 format
/// migration_type: 1 = transaction, 2 = intent
#[update]
pub fn migrate(migration_type: String) -> MigrationResult {
    match migration_type.as_str() {
        "transaction" => {
            // Transaction migration
            let v1_total = get_transaction_v1_total_records();
            let migrated_count = migrate_transactions_v1_to_v2();
            let v2_total = get_transaction_v2_total_records();

            MigrationResult {
                migrated_count,
                total_v1_records: v1_total,
                total_v2_records_after: v2_total,
                success: true,
                message: format!(
                    "Successfully migrated {} transactions from v1 to v2",
                    migrated_count
                ),
            }
        }
        "intent" => {
            // Intent migration
            let v1_total = get_intent_v1_total_records();
            let migrated_count = migrate_intents_v1_to_v2();
            let v2_total = get_intent_v2_total_records();

            MigrationResult {
                migrated_count,
                total_v1_records: v1_total,
                total_v2_records_after: v2_total,
                success: true,
                message: format!(
                    "Successfully migrated {} intents from v1 to v2",
                    migrated_count
                ),
            }
        }
        _ => MigrationResult {
            migrated_count: 0,
            total_v1_records: 0,
            total_v2_records_after: 0,
            success: false,
            message: "Invalid migration type. Use 'transaction' or 'intent'".to_string(),
        },
    }
}

/// Get migration status
/// status_type: "transaction" or "intent"
#[query]
pub fn get_status(status_type: String) -> MigrationStatus {
    match status_type.as_str() {
        "transaction" => {
            // Transaction status
            let v1_total = get_transaction_v1_total_records();
            let v2_total = get_transaction_v2_total_records();

            MigrationStatus {
                v1_total,
                v2_total,
                migration_complete: v1_total > 0 && v2_total >= v1_total,
            }
        }
        "intent" => {
            // Intent status
            let v1_total = get_intent_v1_total_records();
            let v2_total = get_intent_v2_total_records();

            MigrationStatus {
                v1_total,
                v2_total,
                migration_complete: v1_total > 0 && v2_total >= v1_total,
            }
        }
        _ => MigrationStatus {
            v1_total: 0,
            v2_total: 0,
            migration_complete: false,
        },
    }
}

/// Get comprehensive migration status for both types
#[query]
pub fn get_migration_overview() -> (MigrationStatus, MigrationStatus) {
    let transaction_status = get_status("transaction".to_string());
    let intent_status = get_status("intent".to_string());
    (transaction_status, intent_status)
}

/// Run both migrations in sequence and return comprehensive results
#[update]
pub async fn migrate_all() -> (MigrationResult, MigrationResult) {
    let transaction_result = migrate("transaction".to_string());
    let intent_result = migrate("intent".to_string());
    (transaction_result, intent_result)
}
