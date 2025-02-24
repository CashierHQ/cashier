use candid::Nat;
use cashier_types::Icrc2Approve;

use crate::{types::error::CanisterError, utils::icrc::IcrcService};

pub async fn validate_allowance(
    icrc_service: &IcrcService,
    icrc2_transfer_from_info: &Icrc2Approve,
) -> Result<bool, CanisterError> {
    let from_wallet_account = icrc2_transfer_from_info
        .from
        .get_account()
        .map_err(|e| CanisterError::ParseAccountError(e.to_string()))?;

    let spender_account = icrc2_transfer_from_info
        .spender
        .get_account()
        .map_err(|e| CanisterError::ParseAccountError(format!("Error parsing spender: {}", e)))?;

    let allowance_amount = icrc2_transfer_from_info.amount;

    let asset = icrc2_transfer_from_info
        .asset
        .get_principal()
        .map_err(|e| CanisterError::ParsePrincipalError(e.to_string()))?;

    let allowance_fee = icrc_service
        .allowance(asset, from_wallet_account, spender_account)
        .await?;

    if allowance_fee.allowance < Nat::from(allowance_amount) {
        return Ok(false);
    }

    Ok(true)
}
