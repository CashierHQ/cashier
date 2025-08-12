// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::{cell::RefCell, time::Duration};

use getrandom::register_custom_getrandom;
use rand::{RngCore, SeedableRng, rngs::StdRng};

thread_local! {
    pub static RNG: RefCell<Option<StdRng>> = const { RefCell::new(None) };
}

/// Initializes the random number generator for the Internet Computer (IC).
///
/// The standard `getrandom` function always fails because it is not compatible
/// with the canister WebAssembly (WASM) environment. To address this, we register
/// a custom random number generator.
///
pub fn init_ic_rand() {
    ic_cdk_timers::set_timer(Duration::from_secs(0), || {
        ic_cdk::futures::spawn(async {
            let _ = set_rand().await; // Ignore potential error; randomness will be retried later
        });
    });
    register_custom_getrandom!(custom_getrandom);
}

async fn set_rand() -> Result<(), ic_cdk::call::Error> {
    let seed = ic_cdk::management_canister::raw_rand().await?;
    let seed_array: [u8; 32] = seed.try_into().unwrap_or([0u8; 32]);
    RNG.with(|rng| {
        *rng.borrow_mut() = Some(StdRng::from_seed(seed_array));
    });
    Ok(())
}

fn custom_getrandom(buf: &mut [u8]) -> Result<(), getrandom::Error> {
    RNG.with(|rng| {
        if let Some(r) = rng.borrow_mut().as_mut() {
            r.fill_bytes(buf);
            Ok(())
        } else {
            Err(getrandom::Error::UNEXPECTED)
        }
    })
}