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

use crate::core::action::types::{ActionDto, TransactionDto};
use crate::core::guard::{is_not_admin, is_not_anonymous};
use crate::services::action::ActionService;
use crate::services::transaction::TransactionService;
use crate::services::transaction_manager::service::TransactionManagerService;
use crate::utils::runtime::RealIcEnvironment;
use crate::{
    core::CanisterError,
    services::{self},
};

use super::types::TriggerTransactionInput;

#[update(guard = "is_not_anonymous")]
pub async fn trigger_transaction(input: TriggerTransactionInput) -> Result<String, CanisterError> {
    let caller = ic_cdk::api::caller();

    let validate_service = services::transaction_manager::validate::ValidateService::get_instance();
    let transaction_manager: TransactionManagerService<RealIcEnvironment> =
        TransactionManagerService::get_instance();

    let is_creator = validate_service
        .is_action_creator(caller.to_text(), input.action_id.clone())
        .map_err(|e| {
            CanisterError::ValidationErrors(format!("Failed to validate action: {}", e))
        })?;

    if !is_creator {
        return Err(CanisterError::ValidationErrors(
            "User is not the creator of the action".to_string(),
        ));
    }

    transaction_manager
        .execute_tx_by_id(input.transaction_id)
        .await?;

    return Ok("Executed success".to_string());
}

#[query(guard = "is_not_admin")]
pub async fn admin_get_transaction(
    transaction_id: String,
) -> Result<TransactionDto, CanisterError> {
    let tx_service: TransactionService<RealIcEnvironment> = TransactionService::get_instance();

    let tx = tx_service.get_tx_by_id(&transaction_id.to_string())?;

    let dto = TransactionDto::from(tx);
    Ok(dto)
}

#[query(guard = "is_not_admin")]
pub async fn admin_get_intent(action_id: String) -> Result<ActionDto, CanisterError> {
    let action_service: ActionService<RealIcEnvironment> = ActionService::get_instance();

    let data = action_service
        .get_action_data(action_id.to_string())
        .map_err(|e| {
            CanisterError::ValidationErrors(format!("Failed to get action data: {}", e))
        })?;

    Ok(ActionDto::from_with_tx(
        data.action,
        data.intents,
        data.intent_txs,
    ))
}
