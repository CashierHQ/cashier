import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AddTokenInput {
  'token_id' : TokenId,
  'index_id' : [] | [string],
}
export interface AddTokensInput { 'token_ids' : Array<TokenId> }
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
export type Chain = { 'IC' : null };
export type ChainTokenDetails = {
    'IC' : {
      'fee' : bigint,
      'ledger_id' : Principal,
      'index_id' : [] | [Principal],
    }
  };
export interface LogServiceSettings {
  'log_filter' : [] | [string],
  'in_memory_records' : [] | [bigint],
  'enable_console' : [] | [boolean],
  'max_record_length' : [] | [bigint],
}
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
  { 'Err' : TokenStorageError };
export type Result_5 = { 'Ok' : TokenListResponse } |
  { 'Err' : string };
export type Result_6 = { 'Ok' : Array<Permission> } |
  { 'Err' : TokenStorageError };
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
export type TokenStorageError = { 'AuthError' : string };
export interface TokenStorageInitData {
  'owner' : Principal,
  'tokens' : [] | [Array<RegistryToken>],
  'log_settings' : [] | [LogServiceSettings],
}
export interface UpdateTokenBalanceInput {
  'balance' : bigint,
  'token_id' : TokenId,
}
export interface UpdateTokenInput {
  'token_id' : TokenId,
  'is_enabled' : boolean,
}
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
  'user_add_token' : ActorMethod<[AddTokenInput], Result_3>,
  /**
   * Add multiple tokens to the user's list
   * 
   * ToDo: this function is not atomic can leave the state in an inconsistent state
   */
  'user_add_token_batch' : ActorMethod<[AddTokensInput], Result_3>,
  'user_sync_token_list' : ActorMethod<[], Result_3>,
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
