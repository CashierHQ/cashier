import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface ActionDto {
  'id' : string,
  'icrc_112_requests' : [] | [Array<Array<Icrc112Request>>],
  'creator' : string,
  'intents' : Array<IntentDto>,
  'type' : string,
  'state' : string,
}
export interface AssetDto { 'chain' : string, 'address' : string }
export interface AssetInfoDto {
  'amount_per_link_use_action' : bigint,
  'chain' : string,
  'label' : string,
  'address' : string,
}
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
  {
    'CanisterCallError' : {
      'method' : string,
      'canister_id' : string,
      'message' : string,
    }
  } |
  { 'UnboundedError' : string } |
  { 'CallCanisterFailed' : string };
export interface CashierBackendInitData {
  'log_settings' : [] | [LogServiceSettings],
}
export interface CreateActionAnonymousInput {
  'link_id' : string,
  'action_type' : string,
  'wallet_address' : string,
}
export interface CreateActionInput {
  'link_id' : string,
  'action_type' : string,
}
export interface CreateLinkInput {
  'title' : string,
  'asset_info' : Array<LinkDetailUpdateAssetInfoInput>,
  'link_type' : string,
  'description' : [] | [string],
  'link_image_url' : [] | [string],
  'template' : string,
  'link_use_action_max_count' : bigint,
  'nft_image' : [] | [string],
}
export interface GetLinkOptions { 'action_type' : string }
export interface GetLinkResp { 'action' : [] | [ActionDto], 'link' : LinkDto }
export interface Icrc112Request {
  'arg' : string,
  'method' : string,
  'canister_id' : Principal,
  'nonce' : [] | [string],
}
export interface Icrc21ConsentInfo {
  'metadata' : Icrc21ConsentMessageMetadata,
  'consent_message' : Icrc21ConsentMessage,
}
export type Icrc21ConsentMessage = {
    'LineDisplayMessage' : { 'pages' : Array<Icrc21LineDisplayPage> }
  } |
  { 'GenericDisplayMessage' : string };
export interface Icrc21ConsentMessageMetadata {
  'utc_offset_minutes' : [] | [number],
  'language' : string,
}
export interface Icrc21ConsentMessageRequest {
  'arg' : Uint8Array | number[],
  'method' : string,
  'user_preferences' : Icrc21ConsentMessageSpec,
}
export interface Icrc21ConsentMessageSpec {
  'metadata' : Icrc21ConsentMessageMetadata,
  'device_spec' : [] | [Icrc21DeviceSpec],
}
export type Icrc21DeviceSpec = { 'GenericDisplay' : null } |
  {
    'LineDisplay' : {
      'characters_per_line' : number,
      'lines_per_page' : number,
    }
  };
export type Icrc21Error = {
    'GenericError' : { 'description' : string, 'error_code' : bigint }
  } |
  { 'InsufficientPayment' : Icrc21ErrorInfo } |
  { 'UnsupportedCanisterCall' : Icrc21ErrorInfo } |
  { 'ConsentMessageUnavailable' : Icrc21ErrorInfo };
export interface Icrc21ErrorInfo { 'description' : string }
export interface Icrc21LineDisplayPage { 'lines' : Array<string> }
export interface Icrc21SupportedStandard { 'url' : string, 'name' : string }
export interface Icrc28TrustedOriginsResponse {
  'trusted_origins' : Array<string>,
}
export interface IntentDto {
  'id' : string,
  'chain' : string,
  'task' : string,
  'type' : string,
  'created_at' : bigint,
  'type_metadata' : Array<[string, MetadataValue]>,
  'state' : string,
  'transactions' : Array<TransactionDto>,
}
export interface LinkDetailUpdateAssetInfoInput {
  'amount_per_link_use_action' : bigint,
  'chain' : string,
  'label' : string,
  'address' : string,
}
export interface LinkDetailUpdateInput {
  'title' : [] | [string],
  'asset_info' : [] | [Array<AssetInfoDto>],
  'link_type' : [] | [string],
  'description' : [] | [string],
  'link_image_url' : [] | [string],
  'template' : [] | [string],
  'link_use_action_max_count' : [] | [bigint],
  'nft_image' : [] | [string],
}
export interface LinkDto {
  'id' : string,
  'title' : [] | [string],
  'creator' : string,
  'asset_info' : [] | [Array<AssetInfoDto>],
  'link_type' : [] | [string],
  'metadata' : [] | [Array<[string, string]>],
  'create_at' : bigint,
  'description' : [] | [string],
  'state' : string,
  'template' : [] | [string],
  'link_use_action_max_count' : bigint,
  'link_use_action_counter' : bigint,
}
export interface LinkGetUserStateInput {
  'link_id' : string,
  'action_type' : string,
  'anonymous_wallet_address' : [] | [string],
}
export interface LinkGetUserStateOutput {
  'action' : ActionDto,
  'link_user_state' : string,
}
export interface LinkUpdateUserStateInput {
  'link_id' : string,
  'action_type' : string,
  'goto' : string,
  'anonymous_wallet_address' : [] | [string],
}
export interface LogServiceSettings {
  'log_filter' : [] | [string],
  'in_memory_records' : [] | [bigint],
  'enable_console' : [] | [boolean],
  'max_record_length' : [] | [bigint],
}
export type MetadataValue = { 'Nat' : bigint } |
  { 'U64' : bigint } |
  { 'MaybeNat' : [] | [bigint] } |
  { 'String' : string } |
  { 'MaybeMemo' : [] | [Uint8Array | number[]] } |
  { 'Asset' : AssetDto } |
  { 'Wallet' : AssetDto };
export interface PaginateInput { 'offset' : bigint, 'limit' : bigint }
export interface PaginateResult {
  'metadata' : PaginateResultMetadata,
  'data' : Array<LinkDto>,
}
export interface PaginateResultMetadata {
  'is_next' : boolean,
  'is_prev' : boolean,
  'total' : bigint,
  'offset' : bigint,
  'limit' : bigint,
}
export interface ProcessActionAnonymousInput {
  'action_id' : string,
  'link_id' : string,
  'action_type' : string,
  'wallet_address' : string,
}
export interface ProcessActionInput {
  'action_id' : string,
  'link_id' : string,
  'action_type' : string,
}
export type Result = { 'Ok' : ActionDto } |
  { 'Err' : CanisterError };
export type Result_1 = { 'Ok' : LinkDto } |
  { 'Err' : CanisterError };
export type Result_2 = { 'Ok' : UserDto } |
  { 'Err' : string };
export type Result_3 = { 'Ok' : GetLinkResp } |
  { 'Err' : string };
export type Result_4 = { 'Ok' : PaginateResult } |
  { 'Err' : string };
export type Result_5 = { 'Ok' : UserDto } |
  { 'Err' : string };
export type Result_6 = { 'Ok' : Icrc21ConsentInfo } |
  { 'Err' : Icrc21Error };
export type Result_7 = { 'Ok' : [] | [LinkGetUserStateOutput] } |
  { 'Err' : CanisterError };
export type Result_8 = { 'Ok' : string } |
  { 'Err' : CanisterError };
export interface TransactionDto {
  'id' : string,
  'protocol' : string,
  'protocol_metadata' : Array<[string, MetadataValue]>,
  'from_call_type' : string,
  'created_at' : bigint,
  'state' : string,
  'dependency' : [] | [Array<string>],
  'group' : number,
}
export interface TriggerTransactionInput {
  'transaction_id' : string,
  'action_id' : string,
  'link_id' : string,
}
export interface UpdateActionInput {
  'action_id' : string,
  'link_id' : string,
  'external' : boolean,
}
export interface UpdateLinkInput {
  'id' : string,
  'action' : string,
  'params' : [] | [LinkDetailUpdateInput],
}
export interface UserDto {
  'id' : string,
  'email' : [] | [string],
  'wallet' : string,
}
export interface _SERVICE {
  'create_action' : ActorMethod<[CreateActionInput], Result>,
  'create_action_anonymous' : ActorMethod<[CreateActionAnonymousInput], Result>,
  'create_link' : ActorMethod<[CreateLinkInput], Result_1>,
  'create_user' : ActorMethod<[], Result_2>,
  'get_canister_build_data' : ActorMethod<[], BuildData>,
  'get_link' : ActorMethod<[string, [] | [GetLinkOptions]], Result_3>,
  'get_links' : ActorMethod<[[] | [PaginateInput]], Result_4>,
  'get_user' : ActorMethod<[], Result_5>,
  'icrc10_supported_standards' : ActorMethod<
    [],
    Array<Icrc21SupportedStandard>
  >,
  'icrc21_canister_call_consent_message' : ActorMethod<
    [Icrc21ConsentMessageRequest],
    Result_6
  >,
  'icrc28_trusted_origins' : ActorMethod<[], Icrc28TrustedOriginsResponse>,
  'link_get_user_state' : ActorMethod<[LinkGetUserStateInput], Result_7>,
  'link_update_user_state' : ActorMethod<[LinkUpdateUserStateInput], Result_7>,
  'process_action' : ActorMethod<[ProcessActionInput], Result>,
  'process_action_anonymous' : ActorMethod<
    [ProcessActionAnonymousInput],
    Result
  >,
  'trigger_transaction' : ActorMethod<[TriggerTransactionInput], Result_8>,
  'update_action' : ActorMethod<[UpdateActionInput], Result>,
  'update_link' : ActorMethod<[UpdateLinkInput], Result_1>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
