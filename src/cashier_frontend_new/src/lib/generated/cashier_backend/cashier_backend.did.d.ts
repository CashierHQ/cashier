import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface ActionDto {
  'id' : string,
  'icrc_112_requests' : [] | [Array<Array<Icrc112Request>>],
  'creator' : Principal,
  'intents' : Array<IntentDto>,
  'type' : ActionType,
  'state' : IntentState,
}
export type ActionType = { 'Withdraw' : null } |
  { 'Send' : null } |
  { 'CreateLink' : null } |
  { 'Receive' : null };
export type Asset = { 'IC' : { 'address' : Principal } };
export interface AssetInfoDto {
  'asset' : Asset,
  'amount_per_link_use_action' : bigint,
  'label' : string,
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
  'token_fee_ttl_ns' : [] | [bigint],
  'owner' : Principal,
  'log_settings' : [] | [LogServiceSettings],
}
export type Chain = { 'IC' : null };
export interface CreateActionInput {
  'link_id' : string,
  'action_type' : ActionType,
}
export interface CreateLinkDto { 'action' : ActionDto, 'link' : LinkDto }
export interface CreateLinkInput {
  'title' : string,
  'asset_info' : Array<AssetInfoDto>,
  'link_type' : LinkType,
  'link_use_action_max_count' : bigint,
}
export type FromCallType = { 'Canister' : null } |
  { 'Wallet' : null };
export interface GetLinkOptions { 'action_type' : ActionType }
export interface GetLinkResp {
  'action' : [] | [ActionDto],
  'link_user_state' : LinkUserStateDto,
  'link' : LinkDto,
}
export type IcTransaction = { 'Icrc2Approve' : Icrc2Approve } |
  { 'Icrc1Transfer' : Icrc1Transfer } |
  { 'Icrc2TransferFrom' : Icrc2TransferFrom };
export interface Icrc112Request {
  'arg' : Uint8Array | number[],
  'method' : string,
  'canister_id' : Principal,
  'nonce' : [] | [Uint8Array | number[]],
}
export interface Icrc114ValidateArgs {
  'arg' : Uint8Array | number[],
  'res' : Uint8Array | number[],
  'method' : string,
  'canister_id' : Principal,
  'nonce' : [] | [Uint8Array | number[]],
}
export interface Icrc1Transfer {
  'to' : Wallet,
  'ts' : [] | [bigint],
  'asset' : Asset,
  'from' : Wallet,
  'memo' : [] | [Uint8Array | number[]],
  'amount' : bigint,
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
export interface Icrc2Approve {
  'ts' : [] | [bigint],
  'asset' : Asset,
  'from' : Wallet,
  'memo' : [] | [Uint8Array | number[]],
  'amount' : bigint,
  'spender' : Wallet,
}
export interface Icrc2TransferFrom {
  'to' : Wallet,
  'ts' : [] | [bigint],
  'asset' : Asset,
  'from' : Wallet,
  'memo' : [] | [Uint8Array | number[]],
  'amount' : bigint,
  'spender' : Wallet,
}
export interface IntentDto {
  'id' : string,
  'intent_total_network_fee' : [] | [bigint],
  'intent_total_amount' : [] | [bigint],
  'intent_user_fee' : [] | [bigint],
  'chain' : Chain,
  'task' : IntentTask,
  'type' : IntentType,
  'created_at' : bigint,
  'state' : IntentState,
  'transactions' : Array<TransactionDto>,
}
export type IntentState = { 'Fail' : null } |
  { 'Success' : null } |
  { 'Processing' : null } |
  { 'Created' : null };
export type IntentTask = { 'TransferWalletToLink' : null } |
  { 'TransferLinkToWallet' : null } |
  { 'TransferWalletToTreasury' : null };
export type IntentType = { 'Transfer' : TransferData } |
  { 'TransferFrom' : TransferFromData };
export interface LinkDto {
  'id' : string,
  'title' : string,
  'creator' : Principal,
  'asset_info' : Array<AssetInfoDto>,
  'link_type' : LinkType,
  'create_at' : bigint,
  'state' : LinkState,
  'link_use_action_max_count' : bigint,
  'link_use_action_counter' : bigint,
}
export type LinkState = { 'Inactive' : null } |
  { 'Active' : null } |
  { 'CreateLink' : null } |
  { 'InactiveEnded' : null };
export type LinkType = { 'SendAirdrop' : null } |
  { 'SendTip' : null } |
  { 'ReceivePayment' : null } |
  { 'SendTokenBasket' : null };
export type LinkUserState = { 'Address' : null } |
  { 'GateClosed' : null } |
  { 'GateOpened' : null } |
  { 'Completed' : null };
export interface LinkUserStateDto {
  'link_id' : string,
  'user_id' : Principal,
  'state' : [] | [LinkUserState],
}
export interface LogServiceSettings {
  'log_filter' : [] | [string],
  'in_memory_records' : [] | [bigint],
  'enable_console' : [] | [boolean],
  'max_record_length' : [] | [bigint],
}
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
export type Permission = { 'Admin' : null };
export interface ProcessActionDto {
  'action' : ActionDto,
  'link' : LinkDto,
  'errors' : Array<string>,
  'is_success' : boolean,
}
export interface ProcessActionV2Input { 'action_id' : string }
export type Protocol = { 'IC' : IcTransaction };
export type Result = { 'Ok' : null } |
  { 'Err' : CanisterError };
export type Result_1 = { 'Ok' : Array<Permission> } |
  { 'Err' : CanisterError };
export type Result_2 = { 'Ok' : GetLinkResp } |
  { 'Err' : CanisterError };
export type Result_3 = { 'Ok' : Icrc21ConsentInfo } |
  { 'Err' : Icrc21Error };
export type Result_4 = { 'Ok' : ActionDto } |
  { 'Err' : CanisterError };
export type Result_5 = { 'Ok' : CreateLinkDto } |
  { 'Err' : CanisterError };
export type Result_6 = { 'Ok' : LinkDto } |
  { 'Err' : CanisterError };
export type Result_7 = { 'Ok' : PaginateResult } |
  { 'Err' : CanisterError };
export type Result_8 = { 'Ok' : ProcessActionDto } |
  { 'Err' : CanisterError };
export interface TransactionDto {
  'id' : string,
  'protocol' : Protocol,
  'from_call_type' : FromCallType,
  'created_at' : bigint,
  'state' : IntentState,
  'dependency' : [] | [Array<string>],
  'group' : number,
}
export interface TransferData {
  'to' : Wallet,
  'asset' : Asset,
  'from' : Wallet,
  'amount' : bigint,
}
export interface TransferFromData {
  'to' : Wallet,
  'asset' : Asset,
  'from' : Wallet,
  'actual_amount' : [] | [bigint],
  'amount' : bigint,
  'approve_amount' : [] | [bigint],
  'spender' : Wallet,
}
export type Wallet = {
    'IC' : {
      'subaccount' : [] | [Uint8Array | number[]],
      'address' : Principal,
    }
  };
export interface _SERVICE {
  /**
   * Clears all cached token fees from the service.
   * 
   * This admin endpoint invalidates all cached token transfer fees, forcing
   * subsequent fee queries to fetch fresh data from their respective token canisters.
   * Useful for cache invalidation when fee structures change or for testing purposes.
   * 
   * # Authorization
   * 
   * Requires `Permission::Admin`. The caller must have admin permissions or the call will panic.
   * 
   * # Returns
   * 
   * Returns `Ok(())` on successful cache clearance.
   * 
   * # Errors
   * 
   * Currently always returns `Ok(())` after clearing the cache.
   */
  'admin_fee_cache_clear' : ActorMethod<[], Result>,
  /**
   * Clears the cached fee for a specific token.
   * 
   * This admin endpoint invalidates the cached transfer fee for a single token,
   * forcing the next fee query for that token to fetch fresh data from its canister.
   * Useful when a specific token's fee structure changes without affecting other tokens.
   * 
   * # Arguments
   * 
   * * `token_id` - The `Principal` of the token canister whose cached fee should be cleared
   * 
   * # Authorization
   * 
   * Requires `Permission::Admin`. The caller must have admin permissions or the call will panic.
   * 
   * # Returns
   * 
   * Returns `Ok(())` on successful cache clearance for the specified token.
   * 
   * # Errors
   * 
   * Currently always returns `Ok(())` after clearing the token's cached fee.
   */
  'admin_fee_cache_clear_token' : ActorMethod<[Principal], Result>,
  /**
   * Enables/disables the inspect message.
   */
  'admin_inspect_message_enable' : ActorMethod<[boolean], Result>,
  /**
   * Adds permissions to a principal and returns the principal permissions.
   */
  'admin_permissions_add' : ActorMethod<
    [Principal, Array<Permission>],
    Result_1
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
    Result_1
  >,
  /**
   * Returns the build data of the canister.
   */
  'get_canister_build_data' : ActorMethod<[], BuildData>,
  /**
   * Retrieves a specific link by its ID with optional action data.
   * 
   * This endpoint is accessible to both anonymous and authenticated users. The response
   * includes the link details and optionally associated action data based on the caller's
   * permissions and the requested action type.
   * 
   * # Arguments
   * * `link_id` - The unique identifier of the link to retrieve
   * * `options` - Optional parameters including action type to include in response
   * 
   * # Returns
   * * `Ok(LinkDto)` - Link data
   * * `Err(String)` - Error message if link not found or access denied
   */
  'get_link_details_v2' : ActorMethod<
    [string, [] | [GetLinkOptions]],
    Result_2
  >,
  'icrc10_supported_standards' : ActorMethod<
    [],
    Array<Icrc21SupportedStandard>
  >,
  'icrc114_validate' : ActorMethod<[Icrc114ValidateArgs], boolean>,
  'icrc21_canister_call_consent_message' : ActorMethod<
    [Icrc21ConsentMessageRequest],
    Result_3
  >,
  'icrc28_trusted_origins' : ActorMethod<[], Icrc28TrustedOriginsResponse>,
  /**
   * Returns the inspect message status.
   */
  'is_inspect_message_enabled' : ActorMethod<[], boolean>,
  /**
   * Creates a new action V2.
   * # Arguments
   * * `input` - Action creation data
   * # Returns
   * * `Ok(ActionDto)` - The created action data
   * * `Err(CanisterError)` - If action creation fails or validation errors occur
   */
  'user_create_action_v2' : ActorMethod<[CreateActionInput], Result_4>,
  /**
   * Creates a new link V2
   * # Arguments
   * * `input` - Link creation data
   * # Returns
   * * `Ok(CreateLinkDto)` - The created link data
   * * `Err(CanisterError)` - If link creation fails or validation errors occur
   */
  'user_create_link_v2' : ActorMethod<[CreateLinkInput], Result_5>,
  /**
   * Disables an existing link V2
   * # Arguments
   * * `link_id` - The ID of the link to disable
   * # Returns
   * * `Ok(LinkDto)` - The disabled link data
   * * `Err(CanisterError)` - If disabling fails or unauthorized
   */
  'user_disable_link_v2' : ActorMethod<[string], Result_6>,
  /**
   * Retrieves a paginated list of links created by the authenticated caller.
   * 
   * This endpoint requires the caller to be authenticated (non-anonymous) and returns
   * only the links that were created by the calling principal.
   * 
   * # Arguments
   * * `input` - Optional pagination parameters (page size, offset, etc.)
   * 
   * # Returns
   * * `Ok(PaginateResult<LinkDto>)` - Paginated list of links owned by the caller
   * * `Err(CanisterError)` - Error message if retrieval fails
   */
  'user_get_links_v2' : ActorMethod<[[] | [PaginateInput]], Result_7>,
  /**
   * Processes a created action V2.
   * # Arguments
   * * `input` - Action processing data
   * # Returns
   * * `Ok(ProcessActionDto)` - The processed action data
   * * `Err(CanisterError)` - If action processing fails or validation errors occur
   */
  'user_process_action_v2' : ActorMethod<[ProcessActionV2Input], Result_8>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
