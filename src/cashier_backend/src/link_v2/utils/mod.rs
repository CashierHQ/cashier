pub mod calculator;

use candid::Principal;
use cashier_backend_types::error::CanisterError;
use icrc_ledger_types::icrc1::account::Account;

use crate::{services::ext, utils::helper::to_subaccount};

/// Generates a unique account for a link using its ID and the canister's principal.
/// The account is derived by combining the canister's principal with a subaccount
/// generated from the link ID.
/// # Arguments
/// * `link_id` - The unique identifier of the link (UUID string).
/// * `canister_id` - The principal of the canister managing the link.
/// # Returns
/// * `Result<Account, CanisterError>` - The resulting account or an error if the conversion fails.
pub fn get_link_account(link_id: &str, canister_id: Principal) -> Result<Account, CanisterError> {
    Ok(Account {
        owner: canister_id,
        subaccount: Some(to_subaccount(link_id)?),
    })
}

/// Generates an external account representation for a link using its ID and the canister's principal.
/// This is used for interacting with external ICRC token services.
/// # Arguments
/// * `link_id` - The unique identifier of the link (UUID string).
/// * `canister_id` - The principal of the canister managing the link.
/// # Returns
/// * `Result<ext::icrc_token::Account, CanisterError>` - The resulting external account or an error if the conversion fails.
pub fn get_link_ext_account(
    link_id: &str,
    canister_id: Principal,
) -> Result<ext::icrc_token::Account, CanisterError> {
    let subaccount = to_subaccount(link_id)?;
    Ok(ext::icrc_token::Account {
        owner: canister_id,
        subaccount: Some(serde_bytes::ByteBuf::from(subaccount.to_vec())),
    })
}
