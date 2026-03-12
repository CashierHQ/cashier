// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

//! Utility functions for type conversions and common operations.

use candid::{Nat, Principal};

use crate::repository::{asset::v1::Asset, common::Wallet};

/// Extract Principal addresses from Wallet/Asset for generated type construction.
///
/// # Arguments
/// * `from` - Source wallet
/// * `to` - Destination wallet
/// * `asset` - Token asset
/// * `amount` - Transfer amount
///
/// # Returns
/// Tuple of (from_principal, to_principal, asset_principal, amount)
pub fn extract_wallet_fields(
    from: &Wallet,
    to: &Wallet,
    asset: &Asset,
    amount: &Nat,
) -> (Principal, Principal, Principal, Nat) {
    let from_addr = match from {
        Wallet::IC { address, .. } => *address,
    };
    let to_addr = match to {
        Wallet::IC { address, .. } => *address,
    };
    let asset_addr = match asset {
        Asset::IC { address } => *address,
    };
    (from_addr, to_addr, asset_addr, amount.clone())
}
