use std::str::FromStr;

use candid::{Nat, Principal};
use cashier_types::Icrc2Approve;
use icrc_ledger_types::icrc1::account::Account;

use crate::utils::icrc::IcrcService;

pub async fn validate_allowance(
    icrc_service: &IcrcService,
    icrc2_transfer_from_info: &Icrc2Approve,
) -> Result<bool, String> {
    let from_wallet_account = Account::from_str(&icrc2_transfer_from_info.from.address)
        .map_err(|e| format!("Error parsing from_wallet_account: {}", e))?;

    let spender_account = Account::from_str(&icrc2_transfer_from_info.spender.address)
        .map_err(|e| format!("Error parsing spender: {}", e))?;

    let allowance_asset = Principal::from_text(icrc2_transfer_from_info.asset.address.clone())
        .map_err(|e| format!("Error parsing allowance_asset: {}", e))?;

    let allowance_amount = icrc2_transfer_from_info.amount;

    let allowance_fee = icrc_service
        .allowance(from_wallet_account, spender_account)
        .await?;

    if allowance_fee.allowance < Nat::from(allowance_amount) {
        return Ok(false);
    }

    Ok(true)
}
