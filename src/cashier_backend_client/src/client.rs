use cashier_common::{
    build_data::BuildData,
    error::CanisterError,
    link_types::{CreateLinkInput, LinkDto},
    user_types::UserDto,
};
use ic_mple_client::{CanisterClient, CanisterClientResult};

/// An CashierBackend canister client.
#[derive(Debug, Clone)]
pub struct CashierBackendClient<C>
where
    C: CanisterClient,
{
    /// The canister client.
    client: C,
}

impl<C: CanisterClient> CashierBackendClient<C> {
    /// Create a new CashierBackendClient.
    ///
    /// # Arguments
    /// * `client` - The canister client.
    pub fn new(client: C) -> Self {
        Self { client }
    }

    /// Returns the build data of the canister.
    pub async fn get_canister_build_data(&self) -> CanisterClientResult<BuildData> {
        self.client.query("get_canister_build_data", ()).await
    }

    pub async fn create_user(&self) -> CanisterClientResult<Result<UserDto, String>> {
        self.client.update("create_user", ()).await
    }

    pub async fn get_user(&self) -> CanisterClientResult<Result<UserDto, String>> {
        self.client.query("get_user", ()).await
    }

    pub async fn create_link(
        &self,
        input: CreateLinkInput,
    ) -> CanisterClientResult<Result<LinkDto, CanisterError>> {
        self.client.update("create_link", ((input),)).await
    }
}
