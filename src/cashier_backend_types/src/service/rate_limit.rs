use std::{cell::RefCell, thread::LocalKey};

use candid::Principal;
use rate_limit::{precision::Nanos, service::RateLimitState};

#[derive(Debug, Clone, Hash, PartialEq, Eq)]
pub enum RateLimitIdentifier {
    UserPrincipal(Principal),
}

pub type RateLimitStateStore =
    &'static LocalKey<RefCell<RateLimitState<RateLimitIdentifier, Nanos>>>;
pub type RateLimitPrecision = Nanos;
