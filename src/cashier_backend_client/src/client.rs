use candid::Principal;
use cashier_backend_types::backoff::BackoffConfig;
use cashier_backend_types::rate_limit::RateLimitConfig;
use cashier_backend_types::settings::{SettingsDto, UpdateSettingArgs};
use cashier_backend_types::{
    auth::Permission,
    dto::{
        action::{ActionDto, CreateActionInput, ProcessActionInput, UpdateActionInput},
        link::{CreateLinkInput, GetLinkOptions, GetLinkResp, LinkDto, UpdateLinkInput},
    },
    error::CanisterError,
    link_v2::dto::{CreateLinkDto, ProcessActionDto, ProcessActionV2Input},
    link_v3::dto::{
        action::{
            CreateActionInputV3, CreateActionResponseV3, ProcessActionInputV3,
            ProcessActionResponseV3,
        },
        link::{
            CreateLinkInputV3, CreateLinkResponseV3, DisableLinkResponseV3,
            GetLinkDetailsResponseV3, GetLinkResponseV3, GetLinksResponseV3,
            SyncAssetBalanceCacheResponseV3,
        },
    },
    service::link::{PaginateInput, PaginateResult},
};
use cashier_common::{build_data::BuildData, icrc::Icrc114ValidateArgs};
use gate_service_types::{GateKey, OpenGateSuccessResult};
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

    /// Updates canister settings (partial; only `Some` fields are applied).
    pub async fn admin_update_setting(
        &self,
        arg: UpdateSettingArgs,
    ) -> CanisterClientResult<Result<(), CanisterError>> {
        self.client.update("admin_update_setting", (arg,)).await
    }

    /// Returns the current canister settings.
    pub async fn admin_get_setting(&self) -> CanisterClientResult<SettingsDto> {
        self.client.query("admin_get_setting", ()).await
    }

    /// Clears all cached token fees.
    pub async fn admin_fee_cache_clear(&self) -> CanisterClientResult<Result<(), CanisterError>> {
        self.client.update("admin_fee_cache_clear", ()).await
    }

    /// Clears cached fee for a specific token.
    pub async fn admin_fee_cache_clear_token(
        &self,
        token_id: Principal,
    ) -> CanisterClientResult<Result<(), CanisterError>> {
        self.client
            .update("admin_fee_cache_clear_token", (token_id,))
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
    pub async fn user_create_link(
        &self,
        input: CreateLinkInput,
    ) -> CanisterClientResult<Result<LinkDto, CanisterError>> {
        self.client.update("user_create_link", ((input),)).await
    }

    /// Creates a new link V2.
    /// # Arguments
    /// * `input` - Link creation data
    /// # Returns
    /// * `Ok(CreateLinkDto)` - The created link data
    /// * `Err(CanisterError)` - If link creation fails or validation errors occur
    pub async fn user_create_link_v2(
        &self,
        input: CreateLinkInput,
    ) -> CanisterClientResult<Result<CreateLinkDto, CanisterError>> {
        self.client.update("user_create_link_v2", ((input),)).await
    }

    /// Disables a link V2.
    /// # Arguments
    /// * `link_id` - The ID of the link to disable
    /// # Returns
    /// * `Ok(LinkDto)` - The disabled link data
    /// * `Err(CanisterError)` - If disabling fails or unauthorized
    pub async fn user_disable_link_v2(
        &self,
        link_id: &str,
    ) -> CanisterClientResult<Result<LinkDto, CanisterError>> {
        self.client.update("user_disable_link_v2", (link_id,)).await
    }

    /// Creates a new action V2.
    /// # Arguments
    /// * `input` - Action creation data
    /// # Returns
    /// * `Ok(ActionDto)` - The created action data
    /// * `Err(CanisterError)` - If action creation fails or validation errors occur
    pub async fn user_create_action_v2(
        &self,
        input: CreateActionInput,
    ) -> CanisterClientResult<Result<ActionDto, CanisterError>> {
        self.client
            .update("user_create_action_v2", ((input),))
            .await
    }

    /// Processes a created action V2.
    /// # Arguments
    /// * `input` - Action processing data
    /// # Returns
    /// * `Ok(ProcessActionDto)` - The processed action data
    /// * `Err(CanisterError)` - If action processing fails or validation errors occur
    pub async fn user_process_action_v2(
        &self,
        input: ProcessActionV2Input,
    ) -> CanisterClientResult<Result<ProcessActionDto, CanisterError>> {
        self.client
            .update("user_process_action_v2", ((input),))
            .await
    }

    /// Retrieves a paginated list of links of caller.
    /// # Arguments
    /// * `options` - Pagination options
    /// # Returns
    /// * `Ok(PaginateResult<LinkDto>)` - The paginated list of links
    /// * `Err(String)` - If retrieval fails
    pub async fn user_get_links_v2(
        &self,
        options: Option<PaginateInput>,
    ) -> CanisterClientResult<Result<PaginateResult<LinkDto>, CanisterError>> {
        self.client.query("user_get_links_v2", (options,)).await
    }

    /// Retrieves a specific link by its ID with optional action data.
    /// # Arguments
    /// * `link_id` - The unique identifier of the link to retrieve
    /// * `options` - Optional parameters including action type to include in response
    /// # Returns
    /// * `Ok(GetLinkResp)` - The link details response
    /// * `Err(CanisterError)` - Error if the link not found or access denied
    pub async fn get_link_details_v2(
        &self,
        link_id: &str,
        options: Option<GetLinkOptions>,
    ) -> CanisterClientResult<Result<GetLinkResp, CanisterError>> {
        self.client
            .query("get_link_details_v2", (link_id, options))
            .await
    }

    /// Creates a new action.
    pub async fn user_create_action(
        &self,
        input: CreateActionInput,
    ) -> CanisterClientResult<Result<ActionDto, CanisterError>> {
        self.client.update("user_create_action", ((input),)).await
    }

    /// Processes a created action.
    pub async fn user_process_action(
        &self,
        input: ProcessActionInput,
    ) -> CanisterClientResult<Result<ActionDto, CanisterError>> {
        self.client.update("user_process_action", ((input),)).await
    }

    /// Updates a created action. This function should be called after executing icrc112.
    pub async fn user_update_action(
        &self,
        input: UpdateActionInput,
    ) -> CanisterClientResult<Result<ActionDto, CanisterError>> {
        self.client.update("user_update_action", ((input),)).await
    }

    pub async fn user_update_link(
        &self,
        input: UpdateLinkInput,
    ) -> CanisterClientResult<Result<LinkDto, CanisterError>> {
        self.client.update("user_update_link", ((input),)).await
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

    /// Creates a new link V3.
    /// # Arguments
    /// * `input` - Link creation data
    /// # Returns
    /// * `Ok(CreateLinkResponseV3)` - The created link data
    /// * `Err(CanisterError)` - If link creation fails or validation errors occur
    pub async fn user_create_link_v3(
        &self,
        input: CreateLinkInputV3,
    ) -> CanisterClientResult<Result<CreateLinkResponseV3, CanisterError>> {
        self.client.update("user_create_link_v3", ((input),)).await
    }

    /// Creates a new action V3.
    /// # Arguments
    /// * `input` - Action creation data
    /// # Returns
    /// * `Ok(CreateActionResponseV3)` - The created action data
    /// * `Err(CanisterError)` - If action creation fails or validation errors occur
    pub async fn user_create_action_v3(
        &self,
        input: CreateActionInputV3,
    ) -> CanisterClientResult<Result<CreateActionResponseV3, CanisterError>> {
        self.client
            .update("user_create_action_v3", ((input),))
            .await
    }

    /// Processes a created action V3.
    /// # Arguments
    /// * `input` - Action processing data
    /// # Returns
    /// * `Ok(ProcessActionResponseV3)` - The processed action data
    /// * `Err(CanisterError)` - If action processing fails or validation errors occur
    pub async fn user_process_action_v3(
        &self,
        input: ProcessActionInputV3,
    ) -> CanisterClientResult<Result<ProcessActionResponseV3, CanisterError>> {
        self.client
            .update("user_process_action_v3", ((input),))
            .await
    }

    /// Retrieves user links list with pagination.
    /// # Arguments
    /// * `options` - Pagination options
    /// # Returns
    /// * `Ok(GetLinksResponseV3)` - The paginated list of links
    /// * `Err(CanisterError)` - If retrieval fails
    pub async fn user_get_links_v3(
        &self,
        options: Option<PaginateInput>,
    ) -> CanisterClientResult<Result<GetLinksResponseV3, CanisterError>> {
        self.client.query("user_get_links_v3", (options,)).await
    }

    /// Retrieves a specific link V3 by its ID.
    /// # Arguments
    /// * `link_id` - The ID of the link to retrieve
    /// * `options` - Optional link retrieval options
    /// # Returns
    /// * `Ok(GetLinkResponseV3)` - The link details
    /// * `Err(CanisterError)` - If retrieval fails
    pub async fn get_link_details_v3(
        &self,
        link_id: &str,
        options: Option<GetLinkOptions>,
    ) -> CanisterClientResult<Result<GetLinkResponseV3, CanisterError>> {
        self.client
            .query("get_link_details_v3", (link_id, options))
            .await
    }

    /// Disables a link V3.
    /// # Arguments
    /// * `link_id` - The ID of the link to disable
    /// # Returns
    /// * `Ok(DisableLinkResponseV3)` - The disabled link data
    /// * `Err(CanisterError)` - If disabling fails or unauthorized
    pub async fn user_disable_link_v3(
        &self,
        link_id: &str,
    ) -> CanisterClientResult<Result<DisableLinkResponseV3, CanisterError>> {
        self.client.update("user_disable_link_v3", (link_id,)).await
    }

    /// Syncs the asset balance cache for a link by querying actual token balances from the ledger.
    /// Only the link creator can trigger this.
    /// # Arguments
    /// * `link_id` - The ID of the link to sync
    /// # Returns
    /// * `Ok(SyncAssetBalanceCacheResponseV3)` - The updated link data
    /// * `Err(CanisterError)` - If sync fails or unauthorized
    pub async fn user_sync_asset_balance_cache(
        &self,
        link_id: &str,
    ) -> CanisterClientResult<Result<SyncAssetBalanceCacheResponseV3, CanisterError>> {
        self.client
            .update("user_sync_asset_balance_cache", (link_id,))
            .await
    }

    /// Opens a gate for the caller on the specified link.
    /// # Arguments
    /// * `link_id` - The link ID
    /// * `gate_id` - The gate ID (from `user_get_link_details_v3`)
    /// * `gate_key` - The key to open the gate
    /// # Returns
    /// * `Ok(OpenGateSuccessResult)` - Gate and updated user status
    /// * `Err(CanisterError)` - If key is wrong or gate not found
    pub async fn user_open_link_gate(
        &self,
        link_id: &str,
        gate_id: &str,
        gate_key: GateKey,
    ) -> CanisterClientResult<Result<OpenGateSuccessResult, CanisterError>> {
        self.client
            .update(
                "user_open_link_gate",
                (link_id.to_string(), gate_id.to_string(), gate_key),
            )
            .await
    }

    /// Returns link details with gate metadata and the caller's gate open status.
    /// # Arguments
    /// * `link_id` - The link ID
    /// * `options` - Optional action type to include
    /// # Returns
    /// * `Ok(GetLinkDetailsResponseV3)` - Link data with gate info
    /// * `Err(CanisterError)` - If link not found
    pub async fn user_get_link_details_v3(
        &self,
        link_id: &str,
        options: Option<GetLinkOptions>,
    ) -> CanisterClientResult<Result<GetLinkDetailsResponseV3, CanisterError>> {
        self.client
            .query("user_get_link_details_v3", (link_id.to_string(), options))
            .await
    }

    /// Flushes the token standard cache.
    pub async fn admin_flush_token_standard_cache(
        &self,
    ) -> CanisterClientResult<Result<(), CanisterError>> {
        self.client
            .update("admin_flush_token_standard_cache", ())
            .await
    }

    /// Updates the gate API rate limit configuration.
    pub async fn admin_gate_rate_limit_update(
        &self,
        config: RateLimitConfig,
    ) -> CanisterClientResult<Result<(), CanisterError>> {
        self.client
            .update("admin_gate_rate_limit_update", (config,))
            .await
    }

    /// Returns the current gate API rate limit configuration.
    pub async fn admin_gate_rate_limit_get(&self) -> CanisterClientResult<RateLimitConfig> {
        self.client.query("admin_gate_rate_limit_get", ()).await
    }

    /// Clears the rate limit state for a specific user.
    pub async fn admin_gate_rate_limit_reset_user(
        &self,
        user: Principal,
    ) -> CanisterClientResult<Result<(), CanisterError>> {
        self.client
            .update("admin_gate_rate_limit_reset_user", (user,))
            .await
    }

    /// Updates the gate API exponential backoff configuration.
    pub async fn admin_gate_backoff_update(
        &self,
        config: BackoffConfig,
    ) -> CanisterClientResult<Result<(), CanisterError>> {
        self.client
            .update("admin_gate_backoff_update", (config,))
            .await
    }

    /// Returns the current gate API exponential backoff configuration.
    pub async fn admin_gate_backoff_get(&self) -> CanisterClientResult<BackoffConfig> {
        self.client.query("admin_gate_backoff_get", ()).await
    }

    /// Clears the backoff state for a specific user.
    pub async fn admin_gate_backoff_reset_user(
        &self,
        user: Principal,
    ) -> CanisterClientResult<Result<(), CanisterError>> {
        self.client
            .update("admin_gate_backoff_reset_user", (user,))
            .await
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

        pub async fn submit_user_create_action_v2(
            &self,
            args: CreateActionInput,
        ) -> CanisterClientResult<RawMessageId> {
            self.client.submit_call("create_action_v2", (args,)).await
        }

        pub async fn submit_user_create_link_v2(
            &self,
            args: CreateLinkInput,
        ) -> CanisterClientResult<RawMessageId> {
            self.client
                .submit_call("user_create_link_v2", (args,))
                .await
        }

        /// Submit a create_action_v2 call and return the message ID (PocketIC only).
        pub async fn submit_create_action_v2(
            &self,
            args: CreateActionInput,
        ) -> CanisterClientResult<RawMessageId> {
            self.client
                .submit_call("user_create_action_v2", (args,))
                .await
        }

        /// Submit a process_action_v2 call and return the message ID (PocketIC only).
        pub async fn submit_process_action_v2(
            &self,
            args: ProcessActionV2Input,
        ) -> CanisterClientResult<RawMessageId> {
            self.client
                .submit_call("user_process_action_v2", (args,))
                .await
        }

        /// Submit a process_action_v3 call and return the message ID (PocketIC only).
        pub async fn submit_process_action_v3(
            &self,
            args: ProcessActionInputV3,
        ) -> CanisterClientResult<RawMessageId> {
            self.client
                .submit_call("user_process_action_v3", (args,))
                .await
        }
    }
}
