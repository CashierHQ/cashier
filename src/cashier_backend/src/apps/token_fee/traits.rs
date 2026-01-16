use candid::{Nat, Principal};
use cashier_backend_types::error::CanisterError;

/// Trait for fetching token fees from external sources.
///
/// This trait provides an abstraction layer for retrieving token transfer fees,
/// enabling testability via dependency injection and allowing different
/// implementations (e.g., real canister calls vs. mock responses).
///
/// # Requirements
///
/// Implementors must be `Clone`, `Send`, and `Sync` to support concurrent
/// usage across async contexts and multiple tasks.
pub trait TokenFetcher: Clone + Send + Sync {
    /// Fetches the transfer fee for a specific token.
    ///
    /// # Arguments
    ///
    /// * `address` - The `Principal` of the token canister to query
    ///
    /// # Returns
    ///
    /// Returns the token's transfer fee as a `Nat` on success.
    ///
    /// # Errors
    ///
    /// Returns a `CanisterError` if:
    /// * The token canister cannot be reached
    /// * The canister does not support the fee query
    /// * The response cannot be decoded properly
    /// * Any network or inter-canister communication error occurs
    fn fetch_fee(
        &self,
        address: Principal,
    ) -> impl std::future::Future<Output = Result<Nat, CanisterError>> + Send;
}
