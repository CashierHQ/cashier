use candid::Principal;
use cashier_common::build_data::BuildData;
use ic_mple_client::{CanisterClient, CanisterClientResult};
use token_storage_types::{
    auth::Permission,
    error::CanisterError,
    token::{AddTokenInput, TokenListResponse, UpdateTokenInput},
};

/// A TokenStorage canister client.
#[derive(Debug, Clone)]
pub struct TokenStorageClient<C>
where
    C: CanisterClient,
{
    /// The canister client.
    client: C,
}

impl<C: CanisterClient> TokenStorageClient<C> {
    /// Create a new TokenStorageClient.
    ///
    /// # Arguments
    /// * `client` - The client.
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

    /// Enables/disables the inspect message.
    pub async fn admin_inspect_message_enable(
        &self,
        inspect_message_enabled: bool,
    ) -> CanisterClientResult<Result<(), CanisterError>> {
        self.client
            .update("admin_inspect_message_enable", (inspect_message_enabled,))
            .await
    }

    /// Returns the inspect message status.
    pub async fn is_inspect_message_enabled(&self) -> CanisterClientResult<bool> {
        self.client.query("is_inspect_message_enabled", ()).await
    }

    /// Returns the build data of the canister.
    pub async fn get_canister_build_data(&self) -> CanisterClientResult<BuildData> {
        self.client.query("get_canister_build_data", ()).await
    }

    /// Lists the tokens in the registry for the caller
    pub async fn list_tokens(&self) -> CanisterClientResult<Result<TokenListResponse, String>> {
        self.client.query("list_tokens", ()).await
    }

    /// Update token enable/disable status for the caller
    pub async fn user_update_token_enable(
        &self,
        input: UpdateTokenInput,
    ) -> CanisterClientResult<Result<(), String>> {
        self.client
            .update("user_update_token_enable", (input,))
            .await
    }

    /// Adds a single token to the caller's list
    pub async fn user_add_token(
        &self,
        input: AddTokenInput,
    ) -> CanisterClientResult<Result<(), String>> {
        self.client.update("user_add_token", (input,)).await
    }
}
