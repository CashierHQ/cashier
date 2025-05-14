use candid::Principal;
use icrc_ledger_types::icrc1::account::Account;

use crate::{
    repositories::{intent_store, user_wallet_store},
    types::link::Link,
    utils::icrc::balance_of,
};

pub async fn validate_balance_with_asset_info(link: Link, user: Principal) -> Result<(), String> {
    let asset_info = link
        .asset_info
        .clone()
        .ok_or_else(|| "Asset info not found".to_string())?;

    for asset in asset_info {
        let token_pid = Principal::from_text(asset.address.as_str())
            .map_err(|e| format!("Error converting token address to principal: {:?}", e))?;

        let account = Account {
            owner: user,
            subaccount: None,
        };

        let balance = balance_of(token_pid, account).await?;
        if balance <= asset.total_amount {
            return Err(format!(
                "Insufficient balance for asset: {}, balance: {}, required: {} and fee try smaller amount",
                asset.address, balance, asset.total_amount
            ));
        }
    }

    Ok(())
}

pub async fn is_intent_creator(caller: String, intent_id: &str) -> Result<bool, String> {
    let user_id = match user_wallet_store::get(&caller) {
        Some(user_id) => user_id,
        None => {
            return Err("User not found".to_string());
        }
    };
    let intent = intent_store::get(intent_id);
    match intent {
        Some(intent) => Ok(intent.creator_id == user_id),
        None => {
            return Err("Intent not found".to_string());
        }
    }
}
