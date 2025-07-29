use cashier_macros::storable;

#[derive(Debug, Clone)]
#[storable]
pub struct RateLimitEntry {
    pub end_time: u64,
    pub count: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum RateLimitIdentifier {
    UserPrincipal(String),
    AnyUser,
}
