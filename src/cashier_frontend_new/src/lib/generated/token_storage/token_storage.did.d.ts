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
export interface CreateBridgeTransactionInputArg {
  'vin' : [] | [Array<UTXO>],
  'status' : [] | [BridgeTransactionStatus],
  'asset_infos' : Array<BridgeAssetInfo>,
  'vout' : [] | [Array<UTXO>],
  'btc_txid' : [] | [string],
  'icp_address' : Principal,
  'omnity_ticket_id' : [] | [string],
  'created_at_ts' : bigint,
  'withdrawal_fee' : [] | [bigint],
  'btc_fee' : [] | [bigint],
  'ckbtc_block_id' : [] | [bigint],
  'btc_address' : string,
  'bridge_type' : BridgeType,
  'deposit_fee' : [] | [bigint],
}
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
export interface LogServiceSettings {
  'log_filter' : [] | [string],
  'in_memory_records' : [] | [bigint],
  'enable_console' : [] | [boolean],
  'max_record_length' : [] | [bigint],
}
export interface Nft { 'token_id' : bigint, 'collection_id' : Principal }
export type Permission = { 'TokenManager' : null } |
  { 'Admin' : null };
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
export type Result = { 'Ok' : RegistryStats } |
  { 'Err' : string };
export type Result_1 = { 'Ok' : null } |
  { 'Err' : string };
export type Result_2 = { 'Ok' : null } |
  { 'Err' : CanisterError };
export type Result_3 = { 'Ok' : Array<Permission> } |
  { 'Err' : CanisterError };
export type Result_4 = { 'Ok' : TokenDto } |
  { 'Err' : CanisterError };
export type Result_5 = { 'Ok' : TokenListResponse } |
  { 'Err' : CanisterError };
export type Result_6 = { 'Ok' : UserNftDto } |
  { 'Err' : CanisterError };
export type Result_7 = { 'Ok' : UserBridgeTransactionDto } |
  { 'Err' : CanisterError };
export type Result_8 = { 'Ok' : string } |
  { 'Err' : CanisterError };
export interface RuneInfo { 'token_id' : string, 'rune_id' : string }
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
  'retry_times' : [] | [number],
  'status' : [] | [BridgeTransactionStatus],
  'block_confirmations' : [] | [Array<BlockConfirmation>],
  'block_id' : [] | [bigint],
  'asset_infos' : [] | [Array<BridgeAssetInfo>],
  'vout' : [] | [Array<UTXO>],
  'btc_txid' : [] | [string],
  'omnity_ticket_id' : [] | [string],
  'withdrawal_fee' : [] | [bigint],
  'btc_fee' : [] | [bigint],
  'block_timestamp' : [] | [bigint],
  'ckbtc_block_id' : [] | [bigint],
  'bridge_id' : string,
  'deposit_fee' : [] | [bigint],
}
export interface UpdateTokenInput {
  'token_id' : TokenId,
  'is_enabled' : boolean,
}
export interface UpdateTokenStandardsInput {
  'token_id' : TokenId,
  'supported_standards' : Array<IcrcStandard>,
}
export interface UserBridgeTransactionDto {
  'vin' : [] | [Array<UTXO>],
  'retry_times' : number,
  'status' : BridgeTransactionStatus,
  'block_confirmations' : Array<BlockConfirmation>,
  'block_id' : [] | [bigint],
  'asset_infos' : Array<BridgeAssetInfo>,
  'total_amount' : [] | [bigint],
  'vout' : [] | [Array<UTXO>],
  'btc_txid' : [] | [string],
  'icp_address' : Principal,
  'omnity_ticket_id' : [] | [string],
  'created_at_ts' : bigint,
  'withdrawal_fee' : [] | [bigint],
  'btc_fee' : [] | [bigint],
  'block_timestamp' : [] | [bigint],
  'ckbtc_block_id' : [] | [bigint],
  'bridge_id' : string,
  'btc_address' : string,
  'bridge_type' : BridgeType,
  'deposit_fee' : [] | [bigint],
}
export interface UserNftDto { 'nft' : Nft, 'user' : Principal }
export interface UserPreference {
  'hide_zero_balance' : boolean,
  'selected_chain' : Array<Chain>,
  'hide_unknown_token' : boolean,
}
export interface _SERVICE {
  /**
   * Gets the full metadata of the token registry
   * Includes version number and last updated timestamp
   */
  'admin_get_registry_metadata' : ActorMethod<[], TokenRegistryMetadata>,
  'admin_get_registry_tokens' : ActorMethod<[boolean], Array<TokenDto>>,
  'admin_get_stats' : ActorMethod<[], Result>,
  'admin_initialize_registry' : ActorMethod<[], Result_1>,
  /**
   * Enables/disables the inspect message.
   */
  'admin_inspect_message_enable' : ActorMethod<[boolean], Result_2>,
  /**
   * Adds permissions to a principal and returns the principal permissions.
   */
  'admin_permissions_add' : ActorMethod<
    [Principal, Array<Permission>],
    Result_3
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
    Result_3
  >,
  /**
   * Returns the build data of the canister.
   */
  'get_canister_build_data' : ActorMethod<[], BuildData>,
  /**
   * Get token from registry by token id
   * # Arguments
   * * `ledger_id` - The principal ID of the ledger associated with the token
   * # Returns
   * * Ok(TokenDto) - The token details if found
   * * Err(CanisterError) - An error message if the token is not found
   */
  'get_token_by_id' : ActorMethod<[Principal], Result_4>,
  /**
   * Returns the inspect message status.
   */
  'is_inspect_message_enabled' : ActorMethod<[], boolean>,
  /**
   * Lists the tokens in the registry for the caller
   * # Returns
   * * `Ok(TokenListResponse)` - The list of tokens and related metadata
   * * `Err(CanisterError)` - An error message if the tokens could not be retrieved
   */
  'list_tokens' : ActorMethod<[], Result_5>,
  /**
   * Override for a token's supported standards
   */
  'token_manager_update_token_standards' : ActorMethod<
    [UpdateTokenStandardsInput],
    Result_2
  >,
  /**
   * Adds a new NFT to the user's collection
   * # Arguments
   * * `input` - The input containing the NFT to be added
   * # Returns
   * * `Ok(UserNftDto)` - The added NFT with user information
   * * `Err(CanisterError)` - An error message if the NFT could not be added
   */
  'user_add_nft' : ActorMethod<[AddUserNftInput], Result_6>,
  /**
   * Add new token to the registry
   * # Arguments
   * * `input` - The token to add
   * # Returns
   * * `Ok(())` - If the token was successfully added
   * * `Err(CanisterError)` - An error message if the token could not be added
   */
  'user_add_token' : ActorMethod<[AddTokenInput], Result_2>,
  /**
   * Add new tokens to the registry in batch
   * # Arguments
   * * `input` - The tokens to add
   * # Returns
   * * `Ok(())` - If the tokens were successfully added
   * * `Err(CanisterError)` - An error message if the tokens could not be
   */
  'user_add_token_batch' : ActorMethod<[AddTokensInput], Result_2>,
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
    Result_7
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
  'user_get_btc_address' : ActorMethod<[], Result_8>,
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
  'user_get_rune_address' : ActorMethod<[], Result_8>,
  /**
   * Sync the user's token list with the registry, adding any new tokens from the registry to the user's list
   * # Returns
   * * `Ok(())` - If the token list was successfully synced
   * * `Err(CanisterError)` - An error message if the token list could not be synced
   */
  'user_sync_token_list' : ActorMethod<[], Result_2>,
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
    Result_7
  >,
  /**
   * Update a token's enabled state for the user
   * # Arguments
   * * `input` - The token ID and new enabled state
   * # Returns
   * * `Ok(())` - If the token's enabled state was successfully updated
   * * `Err(CanisterError)` - An error message if the token's enabled state could not be updated
   */
  'user_update_token_enable' : ActorMethod<[UpdateTokenInput], Result_2>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
