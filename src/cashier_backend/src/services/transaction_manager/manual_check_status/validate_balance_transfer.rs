use std::str::FromStr;

use candid::Principal;
use cashier_types::Icrc1Transfer;
use icrc_ledger_types::icrc1::account::Account;

use crate::utils::{self, icrc::IcrcService};

pub async fn validate_balance_transfer(
    icrc_service: &IcrcService,
    icrc1_transfer_info: &Icrc1Transfer,
) -> Result<bool, String> {
    let target = icrc1_transfer_info.to.clone();

    let target_account = Account::from_str(&target.address)
        .map_err(|e| format!("Failed to parse target account address: {}", e.to_string()))?;

    let token_pid = Principal::from_text(icrc1_transfer_info.asset.address.clone())
        .map_err(|e| format!("Failed to parse token principal id: {}", e.to_string()))?;

    let balance = icrc_service
        .balance_of(target_account)
        .await
        .map_err(|e| format!("Failed to get balance of target account: {}", e.to_string()))?;

    if balance < icrc1_transfer_info.amount {
        return Ok(false);
    }

    Ok(true)
}
