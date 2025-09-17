use ic_mple_client::{CanisterClient, CanisterClientResult};

use crate::types::PoolsResult;

/// An KongSwapBackend canister client.
#[derive(Debug, Clone)]
pub struct KongSwapBackendClient<C>
where
    C: CanisterClient,
{
    /// The canister client.
    client: C,
}

impl<C: CanisterClient> KongSwapBackendClient<C> {

    /// Create a new KongSwapBackendClient.
    ///
    /// # Arguments
    /// * `client` - The canister client.
    pub fn new(client: C) -> Self {
        Self { client }
    }

    
    /// Returns a list of pools with their respective liquidity.
    ///
    /// If `token_id` is `None`, it returns all pools.
    /// If `token_id` is `Some(token_id)`, it returns the pools for the given token id.
    pub async fn pools(&self, token_id: Option<&str>) -> CanisterClientResult<PoolsResult> {
        self.client.query("pools", (token_id,)).await
    }

}