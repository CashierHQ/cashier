import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AddTokenInput {
  'token_id' : TokenId,
  'index_id' : [] | [string],
}
export interface AddTokensInput { 'token_ids' : Array<TokenId> }
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
    }
  };
export interface CreateBridgeTransactionInputArg {
  'asset_infos' : Array<BridgeAssetInfo>,
  'btc_txid' : [] | [string],
  'icp_address' : Principal,
  'created_at_ts' : bigint,
  'withdrawal_fee' : [] | [bigint],
  'btc_address' : string,
  'bridge_type' : BridgeType,
  'deposit_fee' : [] | [bigint],
}
export interface GetUserBridgeTransactionsInputArg {
  'limit' : [] | [number],
  'start' : [] | [number],
}
export interface GetUserNftInput {
  'limit' : [] | [number],
  'start' : [] | [number],
}
export interface LogServiceSettings {
  'log_filter' : [] | [string],
  'in_memory_records' : [] | [bigint],
  'enable_console' : [] | [boolean],
  'max_record_length' : [] | [bigint],
}
export interface Nft { 'token_id' : bigint, 'collection_id' : Principal }
export type Permission = { 'Admin' : null };
export interface RegistryStats {
  'total_enabled_default' : bigint,
  'total_tokens' : bigint,
}
export interface RegistryToken {
  'decimals' : number,
  'name' : string,
  'enabled_by_default' : boolean,
  'details' : ChainTokenDetails,
  'symbol' : string,
}
export type Result = { 'Ok' : RegistryStats } |
  { 'Err' : string };
export type Result_1 = { 'Ok' : Array<[TokenId, bigint]> } |
  { 'Err' : string };
export type Result_2 = { 'Ok' : UserTokens } |
  { 'Err' : string };
export type Result_3 = { 'Ok' : null } |
  { 'Err' : string };
export type Result_4 = { 'Ok' : null } |
  { 'Err' : CanisterError };
export type Result_5 = { 'Ok' : TokenListResponse } |
  { 'Err' : string };
export type Result_6 = { 'Ok' : Array<Permission> } |
  { 'Err' : CanisterError };
export type Result_7 = { 'Ok' : UserNftDto } |
  { 'Err' : CanisterError };
export type Result_8 = { 'Ok' : UserBridgeTransactionDto } |
  { 'Err' : CanisterError };
export type Result_9 = { 'Ok' : string } |
  { 'Err' : CanisterError };
export interface TokenDto {
  'id' : TokenId,
  'decimals' : number,
  'balance' : [] | [bigint],
  'chain' : Chain,
  'name' : string,
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
  'owner' : Principal,
  'tokens' : [] | [Array<RegistryToken>],
  'ckbtc_minter_id' : Principal,
  'log_settings' : [] | [LogServiceSettings],
}
export interface UpdateBridgeTransactionInputArg {
  'status' : [] | [BridgeTransactionStatus],
  'block_confirmations' : [] | [Array<BlockConfirmation>],
  'block_id' : [] | [bigint],
  'btc_txid' : [] | [string],
  'withdrawal_fee' : [] | [bigint],
  'bridge_id' : string,
  'deposit_fee' : [] | [bigint],
}
export interface UpdateTokenBalanceInput {
  'balance' : bigint,
  'token_id' : TokenId,
}
export interface UpdateTokenInput {
  'token_id' : TokenId,
  'is_enabled' : boolean,
}
export interface UserBridgeTransactionDto {
  'status' : BridgeTransactionStatus,
  'block_confirmations' : Array<BlockConfirmation>,
  'block_id' : [] | [bigint],
  'asset_infos' : Array<BridgeAssetInfo>,
  'total_amount' : [] | [bigint],
  'btc_txid' : [] | [string],
  'icp_address' : Principal,
  'created_at_ts' : bigint,
  'withdrawal_fee' : [] | [bigint],
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
export interface UserTokens {
  'registry_tokens' : bigint,
  'version' : bigint,
  'enabled' : bigint,
}
export interface _SERVICE {
  /**
   * Gets the full metadata of the token registry
   * Includes version number and last updated timestamp
   */
  'admin_get_registry_metadata' : ActorMethod<[], TokenRegistryMetadata>,
  'admin_get_registry_tokens' : ActorMethod<[boolean], Array<TokenDto>>,
  'admin_get_stats' : ActorMethod<[], Result>,
  'admin_get_user_balance' : ActorMethod<[Principal], Result_1>,
  'admin_get_user_tokens' : ActorMethod<[Principal], Result_2>,
  'admin_initialize_registry' : ActorMethod<[], Result_3>,
  /**
   * Enables/disables the inspect message.
   */
  'admin_inspect_message_enable' : ActorMethod<[boolean], Result_4>,
  'admin_list_tokens_by_wallet' : ActorMethod<[Principal], Result_5>,
  /**
   * Adds permissions to a principal and returns the principal permissions.
   */
  'admin_permissions_add' : ActorMethod<
    [Principal, Array<Permission>],
    Result_6
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
    Result_6
  >,
  /**
   * Returns the build data of the canister.
   */
  'get_canister_build_data' : ActorMethod<[], BuildData>,
  /**
   * Returns the inspect message status.
   */
  'is_inspect_message_enabled' : ActorMethod<[], boolean>,
  /**
   * Lists the tokens in the registry for the caller
   */
  'list_tokens' : ActorMethod<[], Result_5>,
  /**
   * Adds a new NFT to the user's collection
   * # Arguments
   * * `input` - The input containing the NFT to be added
   * # Returns
   * * `UserNftDto` - The added NFT with user information
   */
  'user_add_nft' : ActorMethod<[AddUserNftInput], Result_7>,
  'user_add_token' : ActorMethod<[AddTokenInput], Result_3>,
  /**
   * Add multiple tokens to the user's list
   * 
   * ToDo: this function is not atomic can leave the state in an inconsistent state
   */
  'user_add_token_batch' : ActorMethod<[AddTokensInput], Result_3>,
  /**
   * Creates a new bridge transaction for the calling user
   * # Arguments
   * * `input` - The input data for creating the bridge transaction
   * # Returns
   * * `UserBridgeTransactionDto` - The created bridge transaction, or a CanisterError
   */
  'user_create_bridge_transaction' : ActorMethod<
    [CreateBridgeTransactionInputArg],
    Result_8
  >,
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
  'user_get_btc_address' : ActorMethod<[], Result_9>,
  /**
   * Retrieves the NFTs owned by the calling user
   * # Arguments
   * * `input` - The input containing pagination parameters
   * # Returns
   * * `Vec<NftDto>` - List of NFTs owned by the user
   */
  'user_get_nfts' : ActorMethod<[GetUserNftInput], Array<Nft>>,
  'user_sync_token_list' : ActorMethod<[], Result_3>,
  /**
   * Updates an existing bridge transaction for the calling user
   * # Arguments
   * * `input` - The input data for updating the bridge transaction
   * # Returns
   * * `UserBridgeTransactionDto` - The updated bridge transaction, or a CanisterError
   */
  'user_update_bridge_transaction' : ActorMethod<
    [UpdateBridgeTransactionInputArg],
    Result_8
  >,
  'user_update_token_balance' : ActorMethod<
    [Array<UpdateTokenBalanceInput>],
    Result_3
  >,
  'user_update_token_enable' : ActorMethod<[UpdateTokenInput], Result_3>,
  'user_update_token_registry' : ActorMethod<[AddTokenInput], Result_3>,
  /**
   * Update the metadata for multiple tokens
   * 
   * ToDo: this function is not atomic can leave the state in an inconsistent state
   */
  'user_update_token_registry_batch' : ActorMethod<[AddTokensInput], Result_3>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
