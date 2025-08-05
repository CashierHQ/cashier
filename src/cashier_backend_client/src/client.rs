use cashier_common::build_data::BuildData;
use cashier_types::{
    dto::{
        action::{ActionDto, CreateActionInput, ProcessActionInput, UpdateActionInput},
        link::{CreateLinkInput, LinkDto},
        user::UserDto,
    },
    error::CanisterError,
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

    pub async fn create_action(
        &self,
        input: CreateActionInput,
    ) -> CanisterClientResult<Result<ActionDto, CanisterError>> {
        self.client.update("create_action", ((input),)).await
    }

    pub async fn process_action(
        &self,
        input: ProcessActionInput,
    ) -> CanisterClientResult<Result<ActionDto, CanisterError>> {
        self.client.update("process_action", ((input),)).await
    }

    pub async fn update_action(
        &self,
        input: UpdateActionInput,
    ) -> CanisterClientResult<Result<ActionDto, CanisterError>> {
        self.client.update("update_action", ((input),)).await
    }
}
