use candid::Nat;

pub fn network_fee_icrc1_send_intent(ledger_fee: Nat, max_use: u64) -> Nat {
    let inbound_fee = ledger_fee.clone();
    let outbound_fee = ledger_fee * Nat::from(max_use);
    inbound_fee + outbound_fee
}

pub fn network_fee_icrc1_receive_intent(ledger_fee: Nat) -> Nat {
    ledger_fee
}

pub fn total_amount_icrc1_send_intent(amount: Nat, ledger_fee: Nat, max_use: u64) -> Nat {
    amount + ledger_fee * Nat::from(max_use)
}

pub fn total_amount_icrc1_receive_intent(amount: Nat, ledger_fee: Nat) -> Nat {
    amount - ledger_fee
}
