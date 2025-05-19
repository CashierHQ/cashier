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
    let (seed,) = ic_cdk::call(Principal::management_canister(), "raw_rand", ())
        .await
        .unwrap();
    RNG.with(|rng| {
        *rng.borrow_mut() = Some(StdRng::from_seed(seed));
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
