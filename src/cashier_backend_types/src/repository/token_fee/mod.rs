use candid::Nat;

/// Cached token fee with timestamp for TTL validation
#[derive(Clone, Debug)]
pub struct CachedFee {
    /// Token transfer fee
    pub fee: Nat,
    /// Timestamp when cached/updated (nanoseconds since epoch)
    pub updated_at: u64,
}
