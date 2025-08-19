use candid::{Nat, Principal};
use rand::prelude::*;
use uuid::Uuid;

pub fn convert_nat_to_u64(nat_value: &Nat) -> Result<u64, String> {
    nat_value
        .0
        .clone()
        .try_into()
        .map_err(|_| "Value too large to fit in u64".to_string())
}

pub fn calculate_create_link_fee(token: &str, ledger_fee: &Nat, max_use_count: u64) -> u64 {
    let ledger_fee_u64 = convert_nat_to_u64(ledger_fee).unwrap_or(0);

    match token {
        "ICP" => 10_000u64 + ledger_fee_u64 * (max_use_count + 3),
        _ => ledger_fee_u64 * 2,
    }
}

pub fn calculate_create_payment_link_fee(token: &str, ledger_fee: &Nat) -> u64 {
    let ledger_fee_u64 = convert_nat_to_u64(ledger_fee).unwrap_or(0);

    match token {
        "ICP" => 10_000u64 + ledger_fee_u64 * 2,
        _ => ledger_fee_u64 * 2,
    }
}

pub fn random_id_string() -> String {
    let id = Uuid::new_v4();
    id.to_string()
}

pub fn random_principal_id() -> String {
    let mut rng = thread_rng();
    let mut arr = [0u8; 29];
    rng.fill_bytes(&mut arr);
    Principal::from_slice(&arr).to_text()
}
