// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

//! Token fee caching service for optimized fee lookups.

mod fetcher;
mod service;

pub use fetcher::{IcrcTokenFetcher, TokenFetcher};
pub use service::TokenFeeService;

#[cfg(test)]
pub use fetcher::test_utils::MockTokenFetcher;
