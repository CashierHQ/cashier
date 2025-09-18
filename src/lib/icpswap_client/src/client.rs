use ic_mple_client::{CanisterClient, CanisterClientResult};

use crate::types::PublicTokenOverview;

/// An IcpSwapNodeIndex canister client.
#[derive(Debug, Clone)]
pub struct IcpSwapNodeIndexClient<C>
where
    C: CanisterClient,
{
    /// The canister client.
    client: C,
}

impl<C: CanisterClient> IcpSwapNodeIndexClient<C> {
    /// Create a new IcpSwapNodeIndexClient.
    ///
    /// # Arguments
    /// * `client` - The canister client.
    pub fn new(client: C) -> Self {
        Self { client }
    }

    /// Returns all tokens
    pub async fn get_all_tokens(&self) -> CanisterClientResult<Vec<PublicTokenOverview>> {
        self.client.query("getAllTokens", ()).await
    }
}
