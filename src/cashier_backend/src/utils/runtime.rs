// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
