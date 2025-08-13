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
export interface RegistryStats {
  'total_enabled_default' : bigint,
  'total_tokens' : bigint,
}
export type Result = { 'Ok' : null } |
  { 'Err' : string };
export type Result_1 = { 'Ok' : RegistryStats } |
  { 'Err' : string };
export type Result_2 = { 'Ok' : Array<[TokenId, bigint]> } |
  { 'Err' : string };
export type Result_3 = { 'Ok' : UserTokens } |
  { 'Err' : string };
export type Result_4 = { 'Ok' : TokenListResponse } |
  { 'Err' : string };
export interface TokenDto {
  'id' : TokenId,
  'decimals' : number,
  'balance' : [] | [bigint],
  'chain' : Chain,
  'name' : string,
  'enabled' : boolean,
  'details' : ChainTokenDetails,
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
  'add_token' : ActorMethod<[AddTokenInput], Result>,
  'add_token_batch' : ActorMethod<[AddTokensInput], Result>,
  'admin_get_registry_metadata' : ActorMethod<[], TokenRegistryMetadata>,
  'admin_get_registry_tokens' : ActorMethod<[boolean], Array<TokenDto>>,
  'admin_get_registry_version' : ActorMethod<[], bigint>,
  'admin_get_stats' : ActorMethod<[], Result_1>,
  'admin_get_user_balance' : ActorMethod<[Principal], Result_2>,
  'admin_get_user_tokens' : ActorMethod<[Principal], Result_3>,
  'admin_initialize_registry' : ActorMethod<[], Result>,
  'admin_list_tokens_by_wallet' : ActorMethod<[Principal], Result_4>,
  'get_canister_build_data' : ActorMethod<[], BuildData>,
  'list_tokens' : ActorMethod<[], Result_4>,
  'sync_token_list' : ActorMethod<[], Result>,
  'update_token_balance' : ActorMethod<
    [Array<UpdateTokenBalanceInput>],
    Result
  >,
  'update_token_enable' : ActorMethod<[UpdateTokenInput], Result>,
  'update_token_registry' : ActorMethod<[AddTokenInput], Result>,
  'update_token_registry_batch' : ActorMethod<[AddTokensInput], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
