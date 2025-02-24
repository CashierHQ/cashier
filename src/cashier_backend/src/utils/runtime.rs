use candid::Principal;

pub trait IcEnvironment {
    fn new() -> Self;
    fn caller(&self) -> Principal;
    fn canister_id(&self) -> Principal;
    fn time(&self) -> u64;
    fn println(&self, message: &str);
    // Add other IC-specific methods as needed
}

use ic_cdk::api;

#[derive(Clone)]
pub struct RealIcEnvironment;

impl IcEnvironment for RealIcEnvironment {
    fn new() -> Self {
        Self {}
    }
    fn caller(&self) -> Principal {
        api::caller()
    }
    fn canister_id(&self) -> Principal {
        api::id()
    }
    fn time(&self) -> u64 {
        api::time()
    }
    fn println(&self, message: &str) {
        ic_cdk::println!("{}", message);
    }
    // Implement other methods
}
