use std::{cell::RefCell, thread::LocalKey};

use candid::Principal;
use rate_limit::{
    algorithm::fixed_window_counter::FixedWindowCounterCore, precision::Nanos,
    service::RateLimitState,
};

#[derive(Debug, Clone, Hash, PartialEq, Eq)]
pub enum RateLimitIdentifier {
    UserPrincipal(Principal),
}

pub type RateLimitStateStoreRunetime =
    RateLimitState<FixedWindowCounterCore, RateLimitIdentifier, Nanos>;

pub type RateLimitStateStore = &'static LocalKey<RefCell<RateLimitStateStoreRunetime>>;

pub type RateLimitPrecision = Nanos;
