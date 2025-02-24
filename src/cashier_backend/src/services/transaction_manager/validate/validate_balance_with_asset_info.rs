use candid::Principal;
use cashier_types::Link;
use icrc_ledger_types::icrc1::account::Account;

use crate::utils::icrc::IcrcService;

pub async fn validate_balance_with_asset_info(link: &Link, user: &Principal) -> Result<(), String> {
    let asset_info = link
        .asset_info
        .clone()
        .ok_or_else(|| "Asset info not found".to_string())?;

    for asset in asset_info {
        let token_pid = Principal::from_text(asset.address.as_str())
            .map_err(|e| format!("Error converting token address to principal: {:?}", e))?;

        let account = Account {
            owner: *user,
            subaccount: None,
        };

        let icrc_service = IcrcService::new();

        let balance = icrc_service
            .balance_of(token_pid, account)
            .await
            .map_err(|e| {
                format!(
                    "Error getting balance for asset: {}, error: {:?}",
                    asset.address, e
                )
            })?;
        if balance <= asset.total_amount {
            return Err(format!(
                "Insufficient balance for asset: {}, balance: {}, required: {} and fee try smaller amount",
                asset.address, balance, asset.total_amount
            ));
        }
    }

    Ok(())
}
