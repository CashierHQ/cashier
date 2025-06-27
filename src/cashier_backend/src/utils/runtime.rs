// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use std::{future::Future, time::Duration};

use candid::Principal;

pub trait IcEnvironment {
    fn new() -> Self;
    fn caller(&self) -> Principal;
    fn id(&self) -> Principal;
    fn time(&self) -> u64;
    fn println(&self, message: &str);
    fn spawn<F>(&self, future: F)
    where
        F: Future<Output = ()> + 'static;
    fn set_timer(&self, delay: Duration, f: impl FnOnce() + 'static) -> TimerId;
    // Add other IC-specific methods as needed
}

use ic_cdk::api;
use ic_cdk_timers::TimerId;

#[derive(Clone)]
pub struct RealIcEnvironment;

impl IcEnvironment for RealIcEnvironment {
    fn new() -> Self {
        Self {}
    }
    fn caller(&self) -> Principal {
        api::caller()
    }
    fn id(&self) -> Principal {
        api::id()
    }
    fn time(&self) -> u64 {
        api::time()
    }
    fn println(&self, message: &str) {
        ic_cdk::println!("{}", message);
    }
    fn spawn<F>(&self, future: F)
    where
        F: Future<Output = ()> + 'static,
    {
        ic_cdk::spawn(future)
    }

    fn set_timer(&self, delay: Duration, f: impl FnOnce() + 'static) -> TimerId {
        ic_cdk_timers::set_timer(delay, f)
    }
    // Implement other methods
}
