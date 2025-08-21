use crate::constant::CREATE_LINK_FEE;
use candid::{Nat, Principal};
use rand::prelude::*;
use uuid::Uuid;

/// Convert a Candid Nat value to a u64.
pub fn convert_nat_to_u64(nat_value: &Nat) -> Result<u64, String> {
    nat_value
        .0
        .clone()
        .try_into()
        .map_err(|_| "Value too large to fit in u64".to_string())
}

/// Calculate the fee for creating a link with respect to the ledger fee and max use count.
pub fn calculate_amount_for_create_link(ledger_fee: &Nat) -> u64 {
    let ledger_fee_u64 = convert_nat_to_u64(ledger_fee).unwrap_or(0);

    CREATE_LINK_FEE + ledger_fee_u64 * 2
}

/// Calculate the transfer amount from wallet to the link
/// with respect to the ledger fee and max use count.
pub fn calculate_amount_for_wallet_to_link_transfer(
    amount: u64,
    ledger_fee: &Nat,
    max_use_count: u64,
) -> u64 {
    let ledger_fee_u64 = convert_nat_to_u64(ledger_fee).unwrap_or(0);

    (amount + ledger_fee_u64) * max_use_count
}

/// Generate a random UUID string.
pub fn random_id_string() -> String {
    let id = Uuid::new_v4();
    id.to_string()
}

/// Generate a random principal ID.
pub fn random_principal_id() -> String {
    let mut rng = thread_rng();
    let mut arr = [0u8; 29];
    rng.fill_bytes(&mut arr);
    Principal::from_slice(&arr).to_text()
}
