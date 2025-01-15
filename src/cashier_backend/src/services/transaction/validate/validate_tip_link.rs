use candid::{Nat, Principal};
use icrc_ledger_types::icrc1::account::Account;

use crate::{
    constant::ICP_CANISTER_ID,
    services::transaction::fee::Fee,
    types::link::Link,
    utils::{
        helper::to_subaccount,
        icrc::{allowance, balance_of},
    },
};

pub enum ValidateTipLinkResponse {
    Success,
    InsufficientBalance,
    AllowanceNotEnough,
}

pub async fn validate_balance_transfer(link: &Link) -> Result<bool, String> {
    let asset_info = link
        .asset_info
        .clone()
        .ok_or_else(|| "Asset info not found".to_string())?;

    let asset_address = asset_info[0].address.clone();
    let total_amount = asset_info[0].total_amount;
    let account = Account {
        owner: ic_cdk::id(),
        subaccount: Some(to_subaccount(link.id.clone())),
    };

    let balance = balance_of(Principal::from_text(asset_address).unwrap(), account).await?;

    if balance < total_amount {
        return Ok(false);
    }

    Ok(true)
}

pub async fn validate_allowance() -> Result<bool, String> {
    let creator = ic_cdk::api::caller();
    let create_account = Account {
        owner: creator,
        subaccount: None,
    };

    let spender = Account {
        owner: Principal::from_text(ICP_CANISTER_ID).unwrap(),
        subaccount: None,
    };

    let allowance_fee = allowance(
        Principal::from_text(ICP_CANISTER_ID).unwrap(),
        create_account,
        spender,
    )
    .await?;

    if allowance_fee.allowance < Nat::from(Fee::CreateTipLinkFeeIcp.as_u64()) {
        return Ok(false);
    }

    Ok(true)
}

pub async fn validate_tip_link(link: Link) -> Result<ValidateTipLinkResponse, String> {
    let asset_info = link
        .asset_info
        .clone()
        .ok_or_else(|| "Asset info not found".to_string())?;

    let asset_address = asset_info[0].address.clone();
    let total_amount = asset_info[0].total_amount;

    let account = Account {
        owner: ic_cdk::id(),
        subaccount: Some(to_subaccount(link.id)),
    };

    let balance = balance_of(Principal::from_text(asset_address).unwrap(), account).await?;

    let creator = ic_cdk::api::caller();
    let create_account = Account {
        owner: creator,
        subaccount: None,
    };

    let spender = Account {
        owner: Principal::from_text(ICP_CANISTER_ID).unwrap(),
        subaccount: None,
    };

    let allowance_fee = allowance(
        Principal::from_text(ICP_CANISTER_ID).unwrap(),
        create_account,
        spender,
    )
    .await?;

    if balance < total_amount {
        return Ok(ValidateTipLinkResponse::InsufficientBalance);
    }

    if allowance_fee.allowance < Nat::from(Fee::CreateTipLinkFeeIcp.as_u64()) {
        return Ok(ValidateTipLinkResponse::AllowanceNotEnough);
    }

    return Ok(ValidateTipLinkResponse::Success);
}
