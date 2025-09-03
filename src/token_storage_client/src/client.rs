use candid::Principal;
use cashier_common::build_data::BuildData;
use ic_mple_client::{CanisterClient, CanisterClientResult};
use token_storage_types::{auth::Permission, error::TokenStorageError};

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
    ) -> CanisterClientResult<Result<Vec<Permission>, TokenStorageError>> {
        self.client
            .update("admin_permissions_add", (principal, permissions))
            .await
    }

    /// Removes permissions from a principal and returns the principal permissions.
    pub async fn admin_permissions_remove(
        &self,
        principal: Principal,
        permissions: Vec<Permission>,
    ) -> CanisterClientResult<Result<Vec<Permission>, TokenStorageError>> {
        self.client
            .update("admin_permissions_remove", (principal, permissions))
            .await
    }

    /// Returns the build data of the canister.
    pub async fn get_canister_build_data(&self) -> CanisterClientResult<BuildData> {
        self.client.query("get_canister_build_data", ()).await
    }
}
