use std::str::FromStr;

use cashier_types::Icrc1Transfer;
use icrc_ledger_types::icrc1::account::Account;

use crate::{types::error::CanisterError, utils::icrc::IcrcService};

pub async fn validate_balance_transfer(
    icrc_service: &IcrcService,
    icrc1_transfer_info: &Icrc1Transfer,
) -> Result<bool, CanisterError> {
    let target = icrc1_transfer_info.to.clone();

    let target_account = Account::from_str(&target.address)
        .map_err(|e| CanisterError::ParseAccountError(e.to_string()))?;

    let asset = icrc1_transfer_info
        .asset
        .get_principal()
        .map_err(|e| CanisterError::ParsePrincipalError(e.to_string()))?;

    let balance = icrc_service.balance_of(asset, target_account).await?;

    if balance < icrc1_transfer_info.amount {
        return Ok(false);
    }

    Ok(true)
}
