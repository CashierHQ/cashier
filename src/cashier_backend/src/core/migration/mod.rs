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

use ic_cdk::{query, update};

use crate::core::guard::is_not_admin;
use crate::services::migration::{MigrationResult, MigrationService, MigrationStatus};

#[query(guard = "is_not_admin")]
pub async fn migration_get_status() -> MigrationStatus {
    MigrationService::get_migration_status()
}

#[query(guard = "is_not_admin")]
pub async fn migration_overall_percentage() -> String {
    let status = MigrationService::get_migration_status();
    let percentage = status.overall_migration_percentage();
    let is_migration_complete = status.is_fully_migrated();

    return format!(
        "Migration overall percentage: {}% - {}",
        percentage,
        if is_migration_complete {
            "Migration complete"
        } else {
            "Migration in progress"
        }
    );
}

#[update(guard = "is_not_admin")]
pub fn migration_run_by_batch(batch_number: String) -> Result<MigrationResult, String> {
    match batch_number.as_str() {
        "1" => Ok(MigrationService::migrate_batch_1()),
        "2" => Ok(MigrationService::migrate_batch_2()),
        "3" => Ok(MigrationService::migrate_batch_3()),
        "4" => Ok(MigrationService::migrate_batch_4()),
        "5" => Ok(MigrationService::migrate_batch_5()),
        _ => Err(format!(
            "Invalid batch number: {}. Valid batches are 1-5",
            batch_number
        )),
    }
}
