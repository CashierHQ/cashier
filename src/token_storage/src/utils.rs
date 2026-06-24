// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;

/// Default canister id sentinel ("unset"): the anonymous principal. Used as struct `Default` and as
/// the serde default so pre-migration records (without the field) decode to it (CBOR `#[storable]`).
pub fn default_canister_id() -> Principal {
    Principal::anonymous()
}
