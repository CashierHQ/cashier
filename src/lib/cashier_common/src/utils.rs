use candid::Nat;

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
