use candid::{CandidType, Principal};
use cashier_macros::storable;

#[storable]
#[derive(Clone, CandidType)]
pub struct Token {
    r#type: TokenType,
    enable: bool,
}

#[repr(u8)]
#[storable]
#[derive(Clone, CandidType)]
pub enum TokenType {
    Icrc(IcrcToken) = 1,
}

#[storable]
#[derive(Clone, CandidType)]
pub struct IcrcToken {
    ledger_id: Principal,
    index_id: Principal,
}
