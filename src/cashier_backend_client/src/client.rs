use candid::Principal;
use cashier_backend_types::{
    auth::Permission,
    dto::{
        action::{ActionDto, CreateActionInput, ProcessActionInput, UpdateActionInput},
        link::{CreateLinkInput, GetLinkOptions, GetLinkResp, LinkDto, UpdateLinkInput},
    },
    error::CanisterError,
    link_v2::dto::{CreateLinkDto, ProcessActionDto, ProcessActionV2Input},
};
use cashier_common::{build_data::BuildData, icrc::Icrc114ValidateArgs};
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

    /// Creates a new link.
    pub async fn create_link(
        &self,
        input: CreateLinkInput,
    ) -> CanisterClientResult<Result<LinkDto, CanisterError>> {
        self.client.update("create_link", ((input),)).await
    }

    /// Creates a new link V2.
    /// # Arguments
    /// * `input` - Link creation data
    /// # Returns
    /// * `Ok(CreateLinkDto)` - The created link data
    /// * `Err(CanisterError)` - If link creation fails or validation errors occur
    pub async fn create_link_v2(
        &self,
        input: CreateLinkInput,
    ) -> CanisterClientResult<Result<CreateLinkDto, CanisterError>> {
        self.client.update("create_link_v2", ((input),)).await
    }

    /// Activates a link V2.
    /// # Arguments
    /// * `link_id` - The ID of the link to activate
    /// # Returns
    /// * `Ok(LinkDto)` - The activated link data
    /// * `Err(CanisterError)` - If activation fails or unauthorized
    pub async fn activate_link_v2(
        &self,
        link_id: &str,
    ) -> CanisterClientResult<Result<LinkDto, CanisterError>> {
        self.client.update("activate_link_v2", (link_id,)).await
    }

    /// Creates a new action V2.
    /// # Arguments
    /// * `input` - Action creation data
    /// # Returns
    /// * `Ok(ActionDto)` - The created action data
    /// * `Err(CanisterError)` - If action creation fails or validation errors occur
    pub async fn create_action_v2(
        &self,
        input: CreateActionInput,
    ) -> CanisterClientResult<Result<ActionDto, CanisterError>> {
        self.client.update("create_action_v2", ((input),)).await
    }

    /// Processes a created action V2.
    /// # Arguments
    /// * `input` - Action processing data
    /// # Returns
    /// * `Ok(ProcessActionDto)` - The processed action data
    /// * `Err(CanisterError)` - If action processing fails or validation errors occur
    pub async fn process_action_v2(
        &self,
        input: ProcessActionV2Input,
    ) -> CanisterClientResult<Result<ProcessActionDto, CanisterError>> {
        self.client.update("process_action_v2", ((input),)).await
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

    pub async fn icrc114_validate(&self, args: Icrc114ValidateArgs) -> CanisterClientResult<bool> {
        self.client.update("icrc114_validate", (args,)).await
    }
}

#[cfg(feature = "pocket_ic")]
mod pic {
    use super::*;
    use candid::CandidType;
    use ic_mple_client::PocketIcClient;
    use ic_mple_pocket_ic::pocket_ic::common::rest::RawMessageId;
    use serde::de::DeserializeOwned;

    /// PocketIC-specific extensions for CashierBackendClient
    impl CashierBackendClient<PocketIcClient> {
        /// Await a previously submitted call and decode into `R` (PocketIC only).
        pub async fn await_call<R>(&self, msg_id: RawMessageId) -> CanisterClientResult<R>
        where
            R: DeserializeOwned + CandidType,
        {
            self.client.await_call(msg_id).await
        }

        /// Submit a create_action call and return the message ID (PocketIC only).
        pub async fn submit_create_action(
            &self,
            args: CreateActionInput,
        ) -> CanisterClientResult<RawMessageId> {
            // For single-argument candid calls, pass a one-element tuple `(args,)`
            self.client.submit_call("create_action", (args,)).await
        }

        /// Submit a process_action call and return the message ID (PocketIC only).
        pub async fn submit_process_action(
            &self,
            args: ProcessActionInput,
        ) -> CanisterClientResult<RawMessageId> {
            self.client.submit_call("process_action", (args,)).await
        }

        /// Submit an update_action call and return the message ID (PocketIC only).
        pub async fn submit_update_action(
            &self,
            args: UpdateActionInput,
        ) -> CanisterClientResult<RawMessageId> {
            self.client.submit_call("update_action", (args,)).await
        }
    }
}
