use candid::Principal;

pub trait IcEnvironment {
    fn caller(&self) -> Principal;
    fn canister_id(&self) -> Principal;
    fn time(&self) -> u64;
    // Add other IC-specific methods as needed
}

use ic_cdk::api;

pub struct RealIcEnvironment;

impl RealIcEnvironment {
    pub fn new() -> Self {
        Self {}
    }
}

impl IcEnvironment for RealIcEnvironment {
    fn caller(&self) -> Principal {
        api::caller()
    }
    fn canister_id(&self) -> Principal {
        api::id()
    }
    fn time(&self) -> u64 {
        api::time()
    }
    // Implement other methods
}

#[cfg(test)]
pub struct MockIcEnvironment {
    pub caller: Principal,
    pub canister_id: Principal,
    pub time: u64,
}
