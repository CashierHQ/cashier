import type { Principal } from '@icp-sdk/core/principal';
import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';

export interface AddTokenInput {
  'is_rune' : [] | [boolean],
  'token_id' : TokenId,
  'rune_info' : [] | [RuneInfo],
  'index_id' : [] | [string],
}
export interface AddTokensInput { 'token_ids' : Array<AddTokenInput> }
export interface AddUserNftInput { 'nft' : Nft }
export interface BlockConfirmation {
  'block_id' : bigint,
  'block_timestamp' : bigint,
}
export interface BridgeAssetInfo {
  'decimals' : number,
  'asset_type' : BridgeAssetType,
  'asset_id' : string,
  'amount' : bigint,
}
export type BridgeAssetType = { 'BTC' : null } |
  { 'Runes' : null } |
  { 'Ordinals' : null };
export type BridgeTransactionStatus = { 'Failed' : null } |
  { 'Confirmed' : null } |
  { 'Created' : null } |
  { 'Completed' : null } |
  { 'Pending' : null };
export type BridgeType = { 'Import' : null } |
  { 'Export' : null };
export interface BuildData {
  'rustc_semver' : string,
  'git_branch' : string,
  'pkg_version' : string,
  'cargo_target_triple' : string,
  'cargo_debug' : string,
  'pkg_name' : string,
  'cargo_features' : string,
  'build_timestamp' : string,
  'git_sha' : string,
  'git_commit_timestamp' : string,
}
export type CanisterError = { 'InvalidDataError' : string } |
  { 'InvalidStateTransition' : { 'to' : string, 'from' : string } } |
  { 'TransactionTimeout' : string } |
  { 'BatchError' : Array<CanisterError> } |
  { 'AuthError' : string } |
  { 'InvalidInput' : string } |
  { 'HandleLogicError' : string } |
  { 'ParsePrincipalError' : string } |
  { 'CandidDecodeFailed' : string } |
  { 'UnknownError' : string } |
  { 'InsufficientBalance' : { 'available' : bigint, 'required' : bigint } } |
  { 'NotFound' : string } |
  { 'ValidationErrors' : string } |
  { 'ParseAccountError' : string } |
  { 'Unauthorized' : string } |
  { 'AlreadyExists' : string } |
  { 'DependencyError' : string } |
  { 'CandidError' : string } |
  { 'AnonymousCall' : null } |
  { 'StorageError' : string } |
  {
    'CanisterCallError' : {
      'method' : string,
      'canister_id' : string,
      'message' : string,
    }
  } |
  { 'UnboundedError' : string } |
  { 'CallCanisterFailed' : string };
export type Chain = { 'IC' : null };
export type ChainTokenDetails = {
    'IC' : {
      'fee' : bigint,
      'ledger_id' : Principal,
      'index_id' : [] | [Principal],
      'supported_standards' : Array<IcrcStandard>,
    }
  };
export interface CollectionDto {
  'floor_price' : [] | [bigint],
  'creator' : Principal,
  'is_cashier' : boolean,
  'name' : string,
  'total_items' : bigint,
  'collection_id' : Principal,
  'description' : string,
  'is_default' : boolean,
  'image' : string,
  'royalty' : [] | [bigint],
  'standard' : string,
}
export interface CollectionRegistryStats {
  'total_collections' : bigint,
  'total_cashier' : bigint,
}
export interface CreateBridgeTransactionInputArg {
  'vin' : [] | [Array<UTXO>],
  'deposit_fee_btc_sats' : [] | [bigint],
  'status' : [] | [BridgeTransactionStatus],
  'withdrawal_fee_btc_sats' : [] | [bigint],
  'asset_infos' : Array<BridgeAssetInfo>,
  'vout' : [] | [Array<UTXO>],
  'btc_txid' : [] | [string],
  'icp_address' : Principal,
  'withdrawal_fee_icp_e8s' : [] | [bigint],
  'omnity_ticket_id' : [] | [string],
  'created_at_ts' : bigint,
  'btc_fee' : [] | [bigint],
  'ckbtc_block_id' : [] | [bigint],
  'btc_address' : string,
  'bridge_type' : BridgeType,
}
export interface EnableCollectionInput {
  'collection_id' : Principal,
  'is_enabled' : boolean,
}
export interface EnableCollectionsInput { 'collection_ids' : Array<Principal> }
export interface GetUserBridgeTransactionsInputArg {
  'status' : [] | [BridgeTransactionStatus],
  'asset_type' : [] | [BridgeAssetType],
  'limit' : [] | [number],
  'start' : [] | [number],
  'rune_id' : [] | [string],
  'bridge_type' : [] | [BridgeType],
}
export interface GetUserNftInput {
  'limit' : [] | [number],
  'start' : [] | [number],
}
export type IcrcStandard = { 'ICRC1' : null } |
  { 'ICRC2' : null } |
  { 'ICRC3' : null };
export interface ListCollectionsInput {
  'limit' : [] | [number],
  'is_default' : [] | [boolean],
  'start' : [] | [number],
}
export interface LogServiceSettings {
  'log_filter' : [] | [string],
  'in_memory_records' : [] | [bigint],
  'enable_console' : [] | [boolean],
  'max_record_length' : [] | [bigint],
}
export interface Nft { 'token_id' : bigint, 'collection_id' : Principal }
export type Permission = { 'TokenManager' : null } |
  { 'Admin' : null } |
  { 'CollectionManager' : null };
export interface RegistryStats {
  'total_enabled_default' : bigint,
  'total_tokens' : bigint,
}
export interface RegistryToken {
  'is_rune' : [] | [boolean],
  'decimals' : number,
  'name' : string,
  'rune_info' : [] | [RuneInfo],
  'enabled_by_default' : boolean,
  'details' : ChainTokenDetails,
  'symbol' : string,
}
export type Result = { 'Ok' : CollectionRegistryStats } |
  { 'Err' : string };
export type Result_1 = { 'Ok' : RegistryStats } |
  { 'Err' : string };
export type Result_10 = { 'Ok' : UserBridgeTransactionDto } |
  { 'Err' : CanisterError };
export type Result_11 = { 'Ok' : string } |
  { 'Err' : CanisterError };
export type Result_2 = { 'Ok' : null } |
  { 'Err' : string };
export type Result_3 = { 'Ok' : null } |
  { 'Err' : CanisterError };
export type Result_4 = { 'Ok' : Array<Permission> } |
  { 'Err' : CanisterError };
export type Result_5 = { 'Ok' : UpsertCollectionsResult } |
  { 'Err' : CanisterError };
export type Result_6 = { 'Ok' : CollectionDto } |
  { 'Err' : CanisterError };
export type Result_7 = { 'Ok' : TokenDto } |
  { 'Err' : CanisterError };
export type Result_8 = { 'Ok' : TokenListResponse } |
  { 'Err' : CanisterError };
export type Result_9 = { 'Ok' : UserNftDto } |
  { 'Err' : CanisterError };
export interface RuneInfo {
  'token_id' : string,
  'icon' : [] | [string],
  'rune_id' : string,
}
export interface SettingsDto {
  'omnity_bitcoin_id' : Principal,
  'ckbtc_minter_id' : Principal,
  'inspect_message_enabled' : boolean,
}
export interface TokenDto {
  'id' : TokenId,
  'is_rune' : [] | [boolean],
  'decimals' : number,
  'balance' : [] | [bigint],
  'chain' : Chain,
  'name' : string,
  'rune_info' : [] | [RuneInfo],
  'is_default' : boolean,
  'enabled' : boolean,
  'details' : ChainTokenDetails,
  'string_id' : string,
  'symbol' : string,
}
export type TokenId = { 'IC' : { 'ledger_id' : Principal } };
export interface TokenListResponse {
  'need_update_version' : boolean,
  'tokens' : Array<TokenDto>,
  'perference' : [] | [UserPreference],
}
export interface TokenRegistryMetadata {
  'last_updated' : bigint,
  'version' : bigint,
}
export interface TokenStorageInitData {
  'omnity_bitcoin_id' : Principal,
  'owner' : Principal,
  'tokens' : [] | [Array<RegistryToken>],
  'ckbtc_minter_id' : Principal,
  'log_settings' : [] | [LogServiceSettings],
}
export interface UTXO { 'txid' : string, 'vout' : number }
export interface UpdateBridgeTransactionInputArg {
  'vin' : [] | [Array<UTXO>],
  'deposit_fee_btc_sats' : [] | [bigint],
  'retry_times' : [] | [number],
  'status' : [] | [BridgeTransactionStatus],
  'block_confirmations' : [] | [Array<BlockConfirmation>],
  'withdrawal_fee_btc_sats' : [] | [bigint],
  'block_id' : [] | [bigint],
  'asset_infos' : [] | [Array<BridgeAssetInfo>],
  'vout' : [] | [Array<UTXO>],
  'btc_txid' : [] | [string],
  'withdrawal_fee_icp_e8s' : [] | [bigint],
  'omnity_ticket_id' : [] | [string],
  'btc_fee' : [] | [bigint],
  'block_timestamp' : [] | [bigint],
  'ckbtc_block_id' : [] | [bigint],
  'bridge_id' : string,
}
export interface UpdateSettingArgs {
  'omnity_bitcoin_id' : [] | [Principal],
  'ckbtc_minter_id' : [] | [Principal],
  'inspect_message_enabled' : [] | [boolean],
}
export interface UpdateTokenInput {
  'token_id' : TokenId,
  'is_enabled' : boolean,
}
export interface UpdateTokenStandardsInput {
  'token_id' : TokenId,
  'supported_standards' : Array<IcrcStandard>,
}
export interface UpsertCollectionsInput { 'collections' : Array<CollectionDto> }
export interface UpsertCollectionsResult { 'upserted' : number }
export interface UserBridgeTransactionDto {
  'vin' : [] | [Array<UTXO>],
  'deposit_fee_btc_sats' : [] | [bigint],
  'retry_times' : number,
  'status' : BridgeTransactionStatus,
  'block_confirmations' : Array<BlockConfirmation>,
  'withdrawal_fee_btc_sats' : [] | [bigint],
  'block_id' : [] | [bigint],
  'asset_infos' : Array<BridgeAssetInfo>,
  'total_amount' : [] | [bigint],
  'vout' : [] | [Array<UTXO>],
  'btc_txid' : [] | [string],
  'icp_address' : Principal,
  'withdrawal_fee_icp_e8s' : [] | [bigint],
  'omnity_ticket_id' : [] | [string],
  'created_at_ts' : bigint,
  'btc_fee' : [] | [bigint],
  'block_timestamp' : [] | [bigint],
  'ckbtc_block_id' : [] | [bigint],
  'bridge_id' : string,
  'btc_address' : string,
  'bridge_type' : BridgeType,
}
export interface UserNftDto { 'nft' : Nft, 'user' : Principal }
export interface UserPreference {
  'hide_zero_balance' : boolean,
  'selected_chain' : Array<Chain>,
  'hide_unknown_token' : boolean,
}
export interface _SERVICE {
  'admin_get_collection_stats' : ActorMethod<[], Result>,
  'admin_get_registry_collections' : ActorMethod<[], Array<CollectionDto>>,
  /**
   * Gets the full metadata of the token registry
   * Includes version number and last updated timestamp
   */
  'admin_get_registry_metadata' : ActorMethod<[], TokenRegistryMetadata>,
  'admin_get_registry_tokens' : ActorMethod<[boolean], Array<TokenDto>>,
  /**
   * Returns the current canister settings (for verification).
   * 
   * # Returns
   * * `SettingsDto` - Current settings snapshot (inspect flag + ckbtc_minter/omnity_bitcoin ids)
   * 
   * # Authorization
   * Requires `Permission::Admin`.
   */
  'admin_get_setting' : ActorMethod<[], SettingsDto>,
  'admin_get_stats' : ActorMethod<[], Result_1>,
  'admin_initialize_collection_registry' : ActorMethod<[], Result_2>,
  'admin_initialize_registry' : ActorMethod<[], Result_2>,
  /**
   * Enables/disables the inspect message.
   * 
   * Deprecated: prefer `admin_update_setting` with `inspect_message_enabled = opt bool`.
   * Kept for backward compatibility with existing callers.
   */
  'admin_inspect_message_enable' : ActorMethod<[boolean], Result_3>,
  /**
   * Adds permissions to a principal and returns the principal permissions.
   */
  'admin_permissions_add' : ActorMethod<
    [Principal, Array<Permission>],
    Result_4
  >,
  /**
   * Returns the permissions of a principal.
   */
  'admin_permissions_get' : ActorMethod<[Principal], Array<Permission>>,
  /**
   * Removes permissions from a principal and returns the principal permissions.
   */
  'admin_permissions_remove' : ActorMethod<
    [Principal, Array<Permission>],
    Result_4
  >,
  /**
   * Updates canister settings. Every field in `arg` is optional; only provided (`Some`) fields are
   * applied, the rest unchanged. Canister-id changes are persisted in stable memory (survive upgrades).
   * 
   * # Arguments
   * * `arg` - Partial settings update: `inspect_message_enabled`, `ckbtc_minter_id`,
   * `omnity_bitcoin_id` (each optional)
   * 
   * # Returns
   * * `Ok(())` - Settings updated successfully (the only non-trap outcome)
   * 
   * # Authorization
   * Requires `Permission::Admin` (auto-gated at ingress via the `admin_` prefix + in-method check);
   * unauthorized callers are rejected (trap), not returned as `Err`.
   */
  'admin_update_setting' : ActorMethod<[UpdateSettingArgs], Result_3>,
  /**
   * Upserts a batch of collections into the registry. Intended to be called by the offchain
   * collection-sync script, authenticated as a principal holding `Permission::Admin` or
   * `Permission::CollectionManager`.
   * # Arguments
   * * `input` - The input containing the collections to upsert
   * # Returns
   * * `Ok(UpsertCollectionsResult)` - The result containing the number of collections upserted
   * * `Err(CanisterError)` - If there was an error during the operation, such as validation errors or permission issues
   */
  'collection_manager_upsert_collections' : ActorMethod<
    [UpsertCollectionsInput],
    Result_5
  >,
  /**
   * Returns the build data of the canister.
   */
  'get_canister_build_data' : ActorMethod<[], BuildData>,
  /**
   * Get a single collection from the registry by id. No auth guard — mirrors `get_token_by_id`.
   * # Arguments
   * * `collection_id` - The id of the collection to retrieve
   * # Returns
   * * `Ok(CollectionDto)` - The collection details if found
   * * `Err(CanisterError::NotFound)` - If the collection doesn't exist in the registry
   */
  'get_collection_by_id' : ActorMethod<[Principal], Result_6>,
  /**
   * Get token from registry by token id
   * # Arguments
   * * `ledger_id` - The principal ID of the ledger associated with the token
   * # Returns
   * * Ok(TokenDto) - The token details if found
   * * Err(CanisterError) - An error message if the token is not found
   */
  'get_token_by_id' : ActorMethod<[Principal], Result_7>,
  /**
   * Returns the inspect message status.
   */
  'is_inspect_message_enabled' : ActorMethod<[], boolean>,
  /**
   * Lists collections in the registry, paginated. No auth guard — registry data is public,
   * mirroring `list_tokens`.
   * # Arguments
   * * `input` - Pagination parameters, optionally filtered to only `is_default` collections
   * # Returns
   * * `Vec<CollectionDto>` - The page of collections
   */
  'list_collections' : ActorMethod<
    [ListCollectionsInput],
    Array<CollectionDto>
  >,
  /**
   * Lists the tokens in the registry for the caller
   * # Returns
   * * `Ok(TokenListResponse)` - The list of tokens and related metadata
   * * `Err(CanisterError)` - An error message if the tokens could not be retrieved
   */
  'list_tokens' : ActorMethod<[], Result_8>,
  /**
   * Override for a token's supported standards
   */
  'token_manager_update_token_standards' : ActorMethod<
    [UpdateTokenStandardsInput],
    Result_3
  >,
  /**
   * Adds a new NFT to the user's collection
   * # Arguments
   * * `input` - The input containing the NFT to be added
   * # Returns
   * * `Ok(UserNftDto)` - The added NFT with user information
   * * `Err(CanisterError)` - An error message if the NFT could not be added
   */
  'user_add_nft' : ActorMethod<[AddUserNftInput], Result_9>,
  /**
   * Add new token to the registry
   * # Arguments
   * * `input` - The token to add
   * # Returns
   * * `Ok(())` - If the token was successfully added
   * * `Err(CanisterError)` - An error message if the token could not be added
   */
  'user_add_token' : ActorMethod<[AddTokenInput], Result_3>,
  /**
   * Add new tokens to the registry in batch
   * # Arguments
   * * `input` - The tokens to add
   * # Returns
   * * `Ok(())` - If the tokens were successfully added
   * * `Err(CanisterError)` - An error message if the tokens could not be
   */
  'user_add_token_batch' : ActorMethod<[AddTokensInput], Result_3>,
  /**
   * Creates a new bridge transaction for the calling user
   * # Arguments
   * * `input` - The input data for creating the bridge transaction
   * # Returns
   * * `Ok(UserBridgeTransactionDto)` - The created bridge transaction if successful
   * * `Err(CanisterError)` - An error if the transaction creation fails
   */
  'user_create_bridge_transaction' : ActorMethod<
    [CreateBridgeTransactionInputArg],
    Result_10
  >,
  /**
   * Enables or disables a single collection for the calling user
   * # Arguments
   * * `input` - The collection id and desired enabled state
   * # Returns
   * * `Ok(())` - If the collection exists in the registry and its state was updated
   * * `Err(CanisterError::NotFound)` - If the collection doesn't exist in the registry
   */
  'user_enable_collection' : ActorMethod<[EnableCollectionInput], Result_3>,
  /**
   * Enables multiple collections for the calling user in one call. Unknown collection ids
   * are silently dropped.
   * # Arguments
   * * `input` - The collection ids to enable
   * # Returns
   * * `Ok(())`
   */
  'user_enable_collections_batch' : ActorMethod<
    [EnableCollectionsInput],
    Result_3
  >,
  /**
   * Retrieves a specific bridge transaction by its ID for the calling user
   * # Arguments
   * * `bridge_id` - The ID of the bridge transaction to retrieve
   * # Returns
   * * `Option<UserBridgeTransactionDto>` - The bridge transaction if found, or None if not found
   */
  'user_get_bridge_transaction_by_id' : ActorMethod<
    [string],
    [] | [UserBridgeTransactionDto]
  >,
  /**
   * Retrieves the list of bridge transactions for the calling user
   * # Arguments
   * * `start` - Optional start index for pagination
   * * `limit` - Optional limit for pagination
   * # Returns
   * * `Vec<UserBridgeTransactionDto>` - List of bridge transactions owned by the user
   */
  'user_get_bridge_transactions' : ActorMethod<
    [GetUserBridgeTransactionsInputArg],
    Array<UserBridgeTransactionDto>
  >,
  /**
   * Retrieves the BTC address associated with the calling user
   * # Returns
   * * `String` - The BTC address of the user, or a CanisterError
   */
  'user_get_btc_address' : ActorMethod<[], Result_11>,
  /**
   * Retrieves the ids of the collections enabled by the calling user
   * # Returns
   * * `Vec<CollectionId>` - The caller's enabled collection ids
   */
  'user_get_enabled_collections' : ActorMethod<[], Array<Principal>>,
  /**
   * Retrieves the NFTs owned by the calling user
   * # Arguments
   * * `input` - The input containing pagination parameters
   * # Returns
   * * `Vec<NftDto>` - List of NFTs owned by the user
   */
  'user_get_nfts' : ActorMethod<[GetUserNftInput], Array<Nft>>,
  /**
   * Retrieves the Rune deposit address associated with the calling user.
   * # Returns
   * * `Ok(String)` - The Rune deposit address of the user
   * * `Err(CanisterError)` - An error if the address cannot be retrieved
   */
  'user_get_rune_address' : ActorMethod<[], Result_11>,
  /**
   * Sync the user's token list with the registry, adding any new tokens from the registry to the user's list
   * # Returns
   * * `Ok(())` - If the token list was successfully synced
   * * `Err(CanisterError)` - An error message if the token list could not be synced
   */
  'user_sync_token_list' : ActorMethod<[], Result_3>,
  /**
   * Updates an existing bridge transaction for the calling user
   * # Arguments
   * * `input` - The input data for updating the bridge transaction
   * # Returns
   * * `Ok(UserBridgeTransactionDto)` - The updated bridge transaction if successful
   * * `Err(CanisterError)` - An error if the transaction update fails
   */
  'user_update_bridge_transaction' : ActorMethod<
    [UpdateBridgeTransactionInputArg],
    Result_10
  >,
  /**
   * Update a token's enabled state for the user
   * # Arguments
   * * `input` - The token ID and new enabled state
   * # Returns
   * * `Ok(())` - If the token's enabled state was successfully updated
   * * `Err(CanisterError)` - An error message if the token's enabled state could not be updated
   */
  'user_update_token_enable' : ActorMethod<[UpdateTokenInput], Result_3>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
