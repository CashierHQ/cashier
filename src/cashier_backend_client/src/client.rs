#[cfg(feature = "pocket_ic")]
use candid::CandidType;
use cashier_common::build_data::BuildData;
use cashier_types::{
    dto::{
        action::{ActionDto, CreateActionInput, ProcessActionInput, UpdateActionInput},
        link::{CreateLinkInput, LinkDto, UpdateLinkInput},
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

    /// Creates a new user. User should be created before creating a link.
    pub async fn create_user(&self) -> CanisterClientResult<Result<UserDto, String>> {
        self.client.update("create_user", ()).await
    }

    /// Returns the user in backend.
    pub async fn get_user(&self) -> CanisterClientResult<Result<UserDto, String>> {
        self.client.query("get_user", ()).await
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
}

#[cfg(feature = "pocket_ic")]
use ic_mple_client::PocketIcClient;
#[cfg(feature = "pocket_ic")]
use ic_mple_pocket_ic::pocket_ic::common::rest::RawMessageId;
#[cfg(feature = "pocket_ic")]
use serde::de::DeserializeOwned;

#[cfg(feature = "pocket_ic")]
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
