use candid::CandidType;
use cashier_macros::storable;

#[derive(Debug, Clone, CandidType)]
#[storable]
pub struct RateLimitEntry {
    pub end_time: u64,
    pub count: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord)]
#[storable]
pub enum RateLimitIdentifier {
    UserPrincipal(String),
    AnyUser,
}
