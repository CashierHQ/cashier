use candid::Principal;
use cashier_common::build_data::BuildData;
use ic_mple_client::{CanisterClient, CanisterClientResult};
use token_storage_types::{
    auth::Permission,
    collection::{
        CollectionDto, CollectionId, EnableCollectionInput, EnableCollectionsInput,
        ListCollectionsInput, UpsertCollectionsInput, UpsertCollectionsResult,
    },
    dto::{
        bitcoin::{
            CreateBridgeTransactionInputArg, GetUserBridgeTransactionsInputArg,
            UpdateBridgeTransactionInputArg, UserBridgeTransactionDto,
        },
        nft::{AddUserNftInput, GetUserNftInput, NftDto, UserNftDto},
    },
    error::CanisterError,
    settings::{SettingsDto, UpdateSettingArgs},
    token::{
        AddTokenInput, AddTokensInput, TokenDto, TokenListResponse, UpdateTokenInput,
        UpdateTokenStandardsInput,
    },
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

    /// Updates canister settings (partial; only `Some` fields are applied).
    /// # Arguments
    /// * `arg` - Partial settings update (inspect flag + ckbtc_minter/omnity_bitcoin canister ids)
    /// # Returns
    /// * `Ok(())` - Settings updated successfully
    /// * `Err(_)` - Transport failure or canister rejection (e.g. unauthorized caller)
    pub async fn admin_update_setting(
        &self,
        arg: UpdateSettingArgs,
    ) -> CanisterClientResult<Result<(), CanisterError>> {
        self.client.update("admin_update_setting", (arg,)).await
    }

    /// Returns the current canister settings.
    /// # Returns
    /// * `SettingsDto` - Current settings snapshot (inspect flag + ckbtc_minter/omnity_bitcoin ids)
    pub async fn admin_get_setting(&self) -> CanisterClientResult<SettingsDto> {
        self.client.query("admin_get_setting", ()).await
    }

    /// Returns the build data of the canister.
    pub async fn get_canister_build_data(&self) -> CanisterClientResult<BuildData> {
        self.client.query("get_canister_build_data", ()).await
    }

    /// Lists the tokens in the registry for the caller
    pub async fn list_tokens(
        &self,
    ) -> CanisterClientResult<Result<TokenListResponse, CanisterError>> {
        self.client.query("list_tokens", ()).await
    }

    /// Update token enable/disable status for the caller
    pub async fn user_update_token_enable(
        &self,
        input: UpdateTokenInput,
    ) -> CanisterClientResult<Result<(), CanisterError>> {
        self.client
            .update("user_update_token_enable", (input,))
            .await
    }

    /// Adds a single token to the caller's list
    pub async fn user_add_token(
        &self,
        input: AddTokenInput,
    ) -> CanisterClientResult<Result<(), CanisterError>> {
        self.client.update("user_add_token", (input,)).await
    }

    /// Adds multiple tokens to the caller's list
    pub async fn user_add_token_batch(
        &self,
        input: AddTokensInput,
    ) -> CanisterClientResult<Result<(), CanisterError>> {
        self.client.update("user_add_token_batch", (input,)).await
    }

    /// Adds a new NFT to the user's collection
    /// # Arguments
    /// * `input` - The input containing the NFT to be added
    /// # Returns
    /// * `UserNftDto` - The added NFT with user information, or a CanisterError
    pub async fn user_add_nft(
        &self,
        input: AddUserNftInput,
    ) -> CanisterClientResult<Result<UserNftDto, CanisterError>> {
        self.client.update("user_add_nft", (input,)).await
    }

    /// Retrieves the NFTs owned by the calling user
    /// # Arguments
    /// * `input` - The input containing pagination parameters
    /// # Returns
    /// * `Vec<NftDto>` - List of NFTs owned by the user
    pub async fn user_get_nfts(&self, input: GetUserNftInput) -> CanisterClientResult<Vec<NftDto>> {
        self.client.query("user_get_nfts", (input,)).await
    }

    /// Retrieves the BTC address associated with the calling user
    /// # Returns
    /// * `String` - The BTC address of the user, or a CanisterError
    pub async fn user_get_btc_address(
        &self,
    ) -> CanisterClientResult<Result<String, CanisterError>> {
        self.client.update("user_get_btc_address", ()).await
    }

    /// Retrieves the Rune deposit address associated with the calling user
    /// # Returns
    /// * `String` - The Rune deposit address of the user, or a CanisterError
    pub async fn user_get_rune_address(
        &self,
    ) -> CanisterClientResult<Result<String, CanisterError>> {
        self.client.update("user_get_rune_address", ()).await
    }

    /// Creates a new bridge transaction for the calling user
    /// # Arguments
    /// * `input` - The input data for creating the bridge transaction
    /// # Returns
    /// * `UserBridgeTransactionDto` - The created bridge transaction, or a Canister
    pub async fn user_create_bridge_transaction(
        &self,
        input: CreateBridgeTransactionInputArg,
    ) -> CanisterClientResult<Result<UserBridgeTransactionDto, CanisterError>> {
        self.client
            .update("user_create_bridge_transaction", (input,))
            .await
    }

    /// Updates an existing bridge transaction for the calling user
    /// # Arguments
    /// * `input` - The input data for updating the bridge transaction
    /// # Returns
    /// * `UserBridgeTransactionDto` - The updated bridge transaction, or a CanisterError
    pub async fn user_update_bridge_transaction(
        &self,
        input: UpdateBridgeTransactionInputArg,
    ) -> CanisterClientResult<Result<UserBridgeTransactionDto, CanisterError>> {
        self.client
            .update("user_update_bridge_transaction", (input,))
            .await
    }

    /// Retrieves the list of bridge transactions for the calling user
    /// # Arguments
    /// * `input` - The input data for retrieving the bridge transactions
    /// # Returns
    /// * `Vec<UserBridgeTransactionDto>` - List of bridge transactions owned by the user
    pub async fn user_get_bridge_transactions(
        &self,
        input: GetUserBridgeTransactionsInputArg,
    ) -> CanisterClientResult<Vec<UserBridgeTransactionDto>> {
        self.client
            .query("user_get_bridge_transactions", (input,))
            .await
    }

    /// Retrieves a bridge transaction by ID for the calling user
    /// # Arguments
    /// * `bridge_id` - The bridge transaction id
    /// # Returns
    /// * `Option<UserBridgeTransactionDto>` - The bridge transaction if found
    pub async fn user_get_bridge_transaction_by_id(
        &self,
        bridge_id: String,
    ) -> CanisterClientResult<Option<UserBridgeTransactionDto>> {
        self.client
            .query("user_get_bridge_transaction_by_id", (bridge_id,))
            .await
    }

    /// Admin override for a token's supported standards
    pub async fn token_manager_update_token_standards(
        &self,
        input: UpdateTokenStandardsInput,
    ) -> CanisterClientResult<Result<(), CanisterError>> {
        self.client
            .update("token_manager_update_token_standards", (input,))
            .await
    }

    /// Get token details by ledger canister id
    /// # Arguments
    /// * `ledger_id` - The principal of the ledger canister
    /// # Returns
    /// * `TokenDto` - The token details, or an error message
    pub async fn get_token_by_id(
        self,
        ledger_id: Principal,
    ) -> CanisterClientResult<Result<TokenDto, CanisterError>> {
        self.client.query("get_token_by_id", (ledger_id,)).await
    }

    /// Lists collections in the registry, paginated
    pub async fn list_collections(
        &self,
        input: ListCollectionsInput,
    ) -> CanisterClientResult<Vec<CollectionDto>> {
        self.client.query("list_collections", (input,)).await
    }

    /// Get a single collection from the registry by id
    pub async fn get_collection_by_id(
        &self,
        collection_id: Principal,
    ) -> CanisterClientResult<Result<CollectionDto, CanisterError>> {
        self.client
            .query("get_collection_by_id", (collection_id,))
            .await
    }

    /// Retrieves the ids of the collections enabled by the calling user
    pub async fn user_get_enabled_collections(&self) -> CanisterClientResult<Vec<CollectionId>> {
        self.client.query("user_get_enabled_collections", ()).await
    }

    /// Enables or disables a single collection for the calling user
    pub async fn user_enable_collection(
        &self,
        input: EnableCollectionInput,
    ) -> CanisterClientResult<Result<(), CanisterError>> {
        self.client.update("user_enable_collection", (input,)).await
    }

    /// Enables multiple collections for the calling user in one call
    pub async fn user_enable_collections_batch(
        &self,
        input: EnableCollectionsInput,
    ) -> CanisterClientResult<Result<(), CanisterError>> {
        self.client
            .update("user_enable_collections_batch", (input,))
            .await
    }

    /// Upserts a batch of collections into the registry (script/manager-facing)
    pub async fn collection_manager_upsert_collections(
        &self,
        input: UpsertCollectionsInput,
    ) -> CanisterClientResult<Result<UpsertCollectionsResult, CanisterError>> {
        self.client
            .update("collection_manager_upsert_collections", (input,))
            .await
    }
}
