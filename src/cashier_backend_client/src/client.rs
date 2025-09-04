use candid::Principal;
use cashier_backend_types::{
    auth::Permission,
    dto::{
        action::{ActionDto, CreateActionInput, ProcessActionInput, UpdateActionInput},
        link::{CreateLinkInput, GetLinkOptions, GetLinkResp, LinkDto, UpdateLinkInput},
    },
    error::CanisterError,
};
use cashier_common::build_data::BuildData;
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

    /// Returns the permissions of a principal.
    pub async fn admin_permissions_get(
        &self,
        principal: Principal,
    ) -> CanisterClientResult<Vec<Permission>> {
        self.client
            .query("admin_permissions_get", (principal,))
            .await
    }

    /// Adds permissions to a principal and returns the principal permissions.
    pub async fn admin_permissions_add(
        &self,
        principal: Principal,
        permissions: Vec<Permission>,
    ) -> CanisterClientResult<Result<Vec<Permission>, CanisterError>> {
        self.client
            .update("admin_permissions_add", (principal, permissions))
            .await
    }

    /// Removes permissions from a principal and returns the principal permissions.
    pub async fn admin_permissions_remove(
        &self,
        principal: Principal,
        permissions: Vec<Permission>,
    ) -> CanisterClientResult<Result<Vec<Permission>, CanisterError>> {
        self.client
            .update("admin_permissions_remove", (principal, permissions))
            .await
    }

    /// Returns the build data of the canister.
    pub async fn get_canister_build_data(&self) -> CanisterClientResult<BuildData> {
        self.client.query("get_canister_build_data", ()).await
    }

    /// Creates a new link.
    pub async fn create_link(
        &self,
        input: CreateLinkInput,
    ) -> CanisterClientResult<Result<LinkDto, CanisterError>> {
        self.client.update("create_link", ((input),)).await
    }

    /// Creates a new action.
    pub async fn create_action(
        &self,
        input: CreateActionInput,
    ) -> CanisterClientResult<Result<ActionDto, CanisterError>> {
        self.client.update("create_action", ((input),)).await
    }

    /// Processes a created action.
    pub async fn process_action(
        &self,
        input: ProcessActionInput,
    ) -> CanisterClientResult<Result<ActionDto, CanisterError>> {
        self.client.update("process_action", ((input),)).await
    }

    /// Updates a created action. This function should be called after executing icrc112.
    pub async fn update_action(
        &self,
        input: UpdateActionInput,
    ) -> CanisterClientResult<Result<ActionDto, CanisterError>> {
        self.client.update("update_action", ((input),)).await
    }

    pub async fn update_link(
        &self,
        input: UpdateLinkInput,
    ) -> CanisterClientResult<Result<LinkDto, CanisterError>> {
        self.client.update("update_link", ((input),)).await
    }

    /// Retrieves a specific link by its ID with optional action data.
    pub async fn get_link(
        &self,
        id: String,
        options: Option<GetLinkOptions>,
    ) -> CanisterClientResult<Result<GetLinkResp, String>> {
        self.client.query("get_link", (id, options)).await
    }
}
