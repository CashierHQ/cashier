// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::{cell::RefCell, time::Duration};

use candid::Principal;
use getrandom::register_custom_getrandom;
use rand::{rngs::StdRng, Rng, RngCore, SeedableRng};

thread_local! {
    pub static RNG: RefCell<Option<StdRng>> = RefCell::new(None);
}

/// Initializes the random number generator for the Internet Computer (IC).
///
/// The standard `getrandom` function always fails because it is not compatible
/// with the canister WebAssembly (WASM) environment. To address this, we register
/// a custom random number generator.
///
pub fn init_ic_rand() {
    ic_cdk_timers::set_timer(Duration::from_secs(0), || ic_cdk::spawn(set_rand()));
    register_custom_getrandom!(custom_getrandom);
}

async fn set_rand() {
    let (seed,): (Vec<u8>,) = ic_cdk::call(Principal::management_canister(), "raw_rand", ())
        .await
        .unwrap();
    let seed_array: [u8; 32] = seed.try_into().unwrap_or_else(|_| [0u8; 32]);
    RNG.with(|rng| {
        *rng.borrow_mut() = Some(StdRng::from_seed(seed_array));
    });
}

fn custom_getrandom(buf: &mut [u8]) -> Result<(), getrandom::Error> {
    RNG.with(|rng| rng.borrow_mut().as_mut().unwrap().fill_bytes(buf));
    Ok(())
}

pub fn generate_random_number() -> i32 {
    RNG.with_borrow_mut(|r| r.as_mut().unwrap().gen())
}

pub fn generate_random_number_between_ranges(from: i32, to: i32) -> i32 {
    if to < from {
        ic_cdk::trap("To is smaller than From")
    }
    RNG.with_borrow_mut(|r| r.as_mut().unwrap().gen_range(from..to))
}
