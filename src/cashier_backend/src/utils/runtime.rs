// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::{future::Future, time::Duration};

use candid::Principal;

pub trait IcEnvironment {
    fn id(&self) -> Principal;
    fn time(&self) -> u64;
    fn spawn<F>(&self, future: F)
    where
        F: Future<Output = ()> + 'static;
    fn set_timer(&self, delay: Duration, f: impl FnOnce() + 'static) -> TimerId;
    // Add other IC-specific methods as needed
}

use ic_cdk::{
    api::{self, canister_self},
    futures::spawn,
};
use ic_cdk_timers::TimerId;

#[derive(Clone)]
pub struct RealIcEnvironment;

impl RealIcEnvironment {
    pub fn new() -> Self {
        Self {}
    }
}

impl IcEnvironment for RealIcEnvironment {
    fn id(&self) -> Principal {
        canister_self()
    }

    fn time(&self) -> u64 {
        api::time()
    }

    fn spawn<F>(&self, future: F)
    where
        F: Future<Output = ()> + 'static,
    {
        spawn(future)
    }

    fn set_timer(&self, delay: Duration, f: impl FnOnce() + 'static) -> TimerId {
        ic_cdk_timers::set_timer(delay, f)
    }
    // Implement other methods
}
