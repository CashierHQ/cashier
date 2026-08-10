import type { Principal } from '@icp-sdk/core/principal';
import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';

export interface Action {
  'id' : string,
  'creator' : Principal,
  'intents' : Array<Intent>,
  'link_id' : [] | [string],
  'action_type' : ActionType_1,
  'action_state' : IntentState,
  'creator_address_type' : AddressType,
  'intent_ids' : [] | [Array<string>],
}
export type ActionType = { 'Withdraw' : null } |
  { 'Send' : null } |
  { 'CreateLink' : null } |
  { 'Receive' : null };
export type ActionType_1 = { 'Withdraw' : null } |
  { 'Send' : null } |
  { 'CreateLink' : null } |
  { 'Receive' : null };
export type AddressType = { 'Gate' : null } |
  { 'Link' : null } |
  { 'User' : null } |
  { 'Treasury' : null } |
  { 'Creator' : null };
export interface Asset {
  'token_standard' : [] | [TokenStandard],
  'address' : Principal,
  'network_fee' : [] | [bigint],
}
export interface AssetInfo {
  'asset' : Asset,
  'label' : string,
  'available_amount' : [] | [bigint],
  'amount' : bigint,
}
export interface BackoffConfig {
  'enabled' : boolean,
  'base_wait_secs' : bigint,
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
  { 'BackoffThrottled' : string } |
  { 'InvalidInput' : string } |
  { 'HandleLogicError' : string } |
  { 'ParsePrincipalError' : string } |
  { 'LinkNoUseAvailable' : { 'link_id' : string } } |
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
  { 'RateLimited' : string } |
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
  'token_standard_cache_ttl_ns' : [] | [bigint],
}
export interface CreateActionInputV3 { 'action' : Action, 'link_id' : string }
export interface CreateActionResponseV3 {
  'action' : Action,
  'link' : Link,
  'icrc112_requests' : [] | [Array<Array<Icrc112Request>>],
}
export interface CreateLinkInputV3 {
  'title' : string,
  'action' : Action,
  'link_type' : LinkType,
  'gate_keys' : [] | [Array<GateKey>],
  'max_use' : bigint,
}
export interface CreateLinkResponseV3 {
  'action' : Action,
  'link' : Link,
  'gates' : Array<Gate>,
  'icrc112_requests' : [] | [Array<Array<Icrc112Request>>],
}
export interface DisableLinkResponseV3 { 'link' : Link }
export interface Gate {
  'id' : string,
  'key' : GateKey,
  'creator' : Principal,
  'subject_id' : string,
}
export interface GateForUser {
  'gate_user_status' : [] | [GateUserStatus],
  'gate' : Gate,
}
export type GateKey = { 'Password' : string } |
  { 'OTPSms' : string } |
  { 'OTPEmail' : string } |
  { 'XFollowing' : string } |
  { 'DiscordServer' : string } |
  { 'XLikedPost' : string } |
  { 'PasswordRedacted' : null } |
  { 'XRetweetedPost' : string } |
  { 'XRetweetedPostCredential' : { 'user_id' : string } } |
  { 'XOwnedAccount' : string } |
  { 'XLikedPostCredential' : { 'user_id' : string, 'access_token' : string } } |
  { 'TelegramGroup' : string };
export type GateStatus = { 'Open' : null } |
  { 'Closed' : null };
export interface GateUserStatus {
  'status' : GateStatus,
  'user_id' : Principal,
  'gate_id' : string,
}
export interface GetLinkDetailsResponseV3 {
  'link' : Link,
  'actions' : Array<Action>,
  'gates' : Array<GateForUser>,
  'icrc112_requests' : [] | [Array<Array<Icrc112Request>>],
}
export interface GetLinkOptions { 'action_type' : ActionType_1 }
export interface GetLinkResponseV3 {
  'link' : Link,
  'actions' : Array<Action>,
  'icrc112_requests' : [] | [Array<Array<Icrc112Request>>],
}
export interface Icrc112Request {
  'arg' : Uint8Array | number[],
  'method' : string,
  'canister_id' : Principal,
  'nonce' : [] | [Uint8Array | number[]],
  'intent_ids' : Array<string>,
}
export interface Icrc114ValidateArgs {
  'arg' : Uint8Array | number[],
  'res' : Uint8Array | number[],
  'method' : string,
  'canister_id' : Principal,
  'nonce' : [] | [Uint8Array | number[]],
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
export interface Intent {
  'id' : string,
  'action_id' : [] | [string],
  'user_fee' : [] | [bigint],
  'total_amount' : [] | [bigint],
  'asset' : Asset,
  'dest_address_type' : AddressType,
  'dest_address' : Principal,
  'label' : string,
  'source_address' : Principal,
  'intent_state' : IntentState,
  'source_address_type' : AddressType,
  'dependencies' : [] | [Array<string>],
  'amount' : bigint,
  'network_fee' : [] | [bigint],
  'intent_type' : IntentType,
}
export type IntentState = { 'Fail' : null } |
  { 'Success' : null } |
  { 'Processing' : null } |
  { 'Created' : null };
export type IntentType = { 'Send' : null } |
  { 'Receive' : null };
export interface Link {
  'id' : string,
  'title' : string,
  'creator' : Principal,
  'asset_info' : Array<AssetInfo>,
  'link_state' : LinkState,
  'link_type' : LinkType,
  'created_at' : [] | [bigint],
  'use_count' : bigint,
  'max_use' : bigint,
}
export type LinkState = { 'Ended' : null } |
  { 'Preview' : null } |
  { 'ChooseType' : null } |
  { 'Inactive' : null } |
  { 'Active' : null } |
  { 'AddAsset' : null } |
  { 'Created' : null };
export type LinkType = { 'SendAirdrop' : null } |
  { 'SendTip' : null } |
  { 'ReceivePayment' : null } |
  { 'SendTokenBasket' : null };
export interface LogServiceSettings {
  'log_filter' : [] | [string],
  'in_memory_records' : [] | [bigint],
  'enable_console' : [] | [boolean],
  'max_record_length' : [] | [bigint],
}
export interface OpenGateSuccessResult {
  'gate_user_status' : GateUserStatus,
  'gate' : Gate,
}
export interface PaginateInput { 'offset' : bigint, 'limit' : bigint }
export interface PaginateResult {
  'metadata' : PaginateResultMetadata,
  'data' : Array<Link>,
}
export interface PaginateResultMetadata {
  'is_next' : boolean,
  'is_prev' : boolean,
  'total' : bigint,
  'offset' : bigint,
  'limit' : bigint,
}
export type Permission = { 'Admin' : null };
export interface ProcessActionInputV3 { 'action_id' : string }
export interface ProcessActionResponseV3 {
  'action' : Action,
  'link' : Link,
  'errors' : Array<string>,
  'is_success' : boolean,
  'icrc112_requests' : [] | [Array<Array<Icrc112Request>>],
}
export interface RateLimitConfig {
  'window_secs' : bigint,
  'enabled' : boolean,
  'max_requests' : number,
}
export type Result = { 'Ok' : null } |
  { 'Err' : CanisterError };
export type Result_1 = { 'Ok' : Array<Permission> } |
  { 'Err' : CanisterError };
export type Result_10 = { 'Ok' : ProcessActionResponseV3 } |
  { 'Err' : CanisterError };
export type Result_2 = { 'Ok' : GetLinkResponseV3 } |
  { 'Err' : CanisterError };
export type Result_3 = { 'Ok' : Icrc21ConsentInfo } |
  { 'Err' : Icrc21Error };
export type Result_4 = { 'Ok' : CreateActionResponseV3 } |
  { 'Err' : CanisterError };
export type Result_5 = { 'Ok' : CreateLinkResponseV3 } |
  { 'Err' : CanisterError };
export type Result_6 = { 'Ok' : DisableLinkResponseV3 } |
  { 'Err' : CanisterError };
export type Result_7 = { 'Ok' : GetLinkDetailsResponseV3 } |
  { 'Err' : CanisterError };
export type Result_8 = { 'Ok' : PaginateResult } |
  { 'Err' : CanisterError };
export type Result_9 = { 'Ok' : OpenGateSuccessResult } |
  { 'Err' : CanisterError };
export interface SettingsDto {
  'inspect_message_enabled' : boolean,
  'gate_service_canister_id' : Principal,
  'token_storage_canister_id' : Principal,
}
export type TokenStandard = { 'ICRC1' : null } |
  { 'ICRC2' : null };
export interface UpdateSettingArgs {
  'inspect_message_enabled' : [] | [boolean],
  'gate_service_canister_id' : [] | [Principal],
  'token_storage_canister_id' : [] | [Principal],
}
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
   * Flushes the token standard cache.
   * This admin endpoint clears all cached token standard information, forcing subsequent queries
   * to fetch fresh data from the token storage canister.
   */
  'admin_flush_token_standard_cache' : ActorMethod<[], Result>,
  /**
   * Returns the current gate API exponential backoff configuration.
   * 
   * # Authorization
   * 
   * Requires `Permission::Admin`.
   */
  'admin_gate_backoff_get' : ActorMethod<[], BackoffConfig>,
  /**
   * Clears the backoff state for a specific user, allowing them to retry immediately.
   * 
   * # Authorization
   * 
   * Requires `Permission::Admin`.
   */
  'admin_gate_backoff_reset_user' : ActorMethod<[Principal], Result>,
  /**
   * Updates the gate API exponential backoff configuration.
   * 
   * Changes take effect immediately on the next `user_open_link_gate` call.
   * Set `enabled: false` to disable backoff entirely (e.g. for emergency access).
   * 
   * # Authorization
   * 
   * Requires `Permission::Admin`.
   */
  'admin_gate_backoff_update' : ActorMethod<[BackoffConfig], Result>,
  /**
   * Returns the current canister settings (for verification).
   * 
   * # Returns
   * * `SettingsDto` - Current settings snapshot (inspect flag + token_storage/gate canister ids)
   * 
   * # Authorization
   * Requires `Permission::Admin`.
   */
  'admin_get_setting' : ActorMethod<[], SettingsDto>,
  /**
   * Enables/disables the inspect message.
   * 
   * Deprecated: prefer `admin_update_setting` with `inspect_message_enabled = opt bool`.
   * Kept for backward compatibility with existing callers.
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
   * Returns the current shared rate limit configuration for `user_open_link_gate` and `user_send_otp`.
   * 
   * # Authorization
   * 
   * Requires `Permission::Admin`.
   */
  'admin_rate_limit_get' : ActorMethod<[], RateLimitConfig>,
  /**
   * Clears the rate limit state for a specific user on both `user_open_link_gate` and
   * `user_send_otp`, allowing them to make requests immediately on either endpoint.
   * 
   * # Authorization
   * 
   * Requires `Permission::Admin`.
   */
  'admin_rate_limit_reset_user' : ActorMethod<[Principal], Result>,
  /**
   * Updates the shared rate limit configuration for `user_open_link_gate` and `user_send_otp`.
   * 
   * Changes take effect immediately on the next call to either endpoint. Each endpoint
   * tracks its own independent counter against this shared limit, so exhausting one
   * endpoint's budget for a user never blocks that same user on the other endpoint.
   * Set `enabled: false` to disable rate limiting entirely (e.g. for emergency access).
   * 
   * # Authorization
   * 
   * Requires `Permission::Admin`.
   */
  'admin_rate_limit_update' : ActorMethod<[RateLimitConfig], Result>,
  /**
   * Updates canister settings. Every field in `arg` is optional; only provided (`Some`) fields are
   * applied, the rest left unchanged. Canister-id changes are persisted in stable memory.
   * 
   * # Arguments
   * * `arg` - Partial settings update: `inspect_message_enabled`, `token_storage_canister_id`,
   * `gate_service_canister_id` (each optional)
   * 
   * # Returns
   * * `Ok(())` - Settings updated successfully (the only non-trap outcome)
   * 
   * # Authorization
   * Requires `Permission::Admin` (enforced in-method and at ingress via the `admin_` prefix guard);
   * unauthorized callers are rejected (trap), not returned as `Err`.
   */
  'admin_update_setting' : ActorMethod<[UpdateSettingArgs], Result>,
  /**
   * Returns the build data of the canister.
   */
  'get_canister_build_data' : ActorMethod<[], BuildData>,
  /**
   * Retrieves a specific link by its ID with optional action data.
   * # Arguments
   * * `link_id` - The unique identifier of the link to retrieve
   * * `options` - Optional parameters including action type to include in response
   * # Returns
   * * `Ok(GetLinkResponseV3)` - Link data
   * * `Err(String)` - Error message if link not found or access denied
   */
  'get_link_details_v3' : ActorMethod<
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
   * Creates a new action V3.
   * # Arguments
   * * `input` - Action creation data
   * # Returns
   * * `Ok(CreateActionResponse)` - The created action data
   * * `Err(CanisterError)` - If action creation fails or validation errors occur
   */
  'user_create_action_v3' : ActorMethod<[CreateActionInputV3], Result_4>,
  /**
   * Creates a new link V3, optionally with one or more gates.
   * # Arguments
   * * `input` - Link creation data, including optional `gate_keys`
   * # Returns
   * * `Ok(CreateLinkResponseV3)` - The created link data and any registered gates
   * * `Err(CanisterError)` - If link creation fails or validation errors occur
   */
  'user_create_link_v3' : ActorMethod<[CreateLinkInputV3], Result_5>,
  /**
   * Disables a link by its ID
   * # Arguments
   * * `link_id` - The unique identifier of the link to disable
   * # Returns
   * * `Ok(DisableLinkResponseV3)` - Confirmation of link being disabled
   * * `Err(String)` - Error message if link not found, access denied, or already disabled
   */
  'user_disable_link_v3' : ActorMethod<[string], Result_6>,
  /**
   * Returns link details together with gate metadata and the caller's gate status.
   * # Arguments
   * * `link_id` - The unique identifier of the link
   * * `options` - Optional parameters including action type to include in response
   * # Returns
   * * `Ok(GetLinkDetailsResponseV3)` - Link data with gate info
   * * `Err(CanisterError)` - If link not found or access denied
   */
  'user_get_link_details_v3' : ActorMethod<
    [string, [] | [GetLinkOptions]],
    Result_7
  >,
  /**
   * Retrieves a paginated list of links for the caller.
   * # Arguments
   * * `input` - Optional pagination parameters
   * # Returns
   * * `Ok(GetLinksResponseV3)` - A paginated list of the caller's links
   * * `Err(CanisterError)` - If retrieval fails or validation errors occur
   */
  'user_get_links_v3' : ActorMethod<[[] | [PaginateInput]], Result_8>,
  /**
   * Opens a gate for the caller on the specified link.
   * The caller must provide the gate ID (obtained from `user_get_link_details_v3`) and the
   * correct gate key. On success the open status is cached locally so subsequent
   * `user_create_action_v3` calls do not need an additional inter-canister round-trip.
   * # Arguments
   * * `link_id` - The unique identifier of the link
   * * `gate_id` - The unique identifier of the gate to open
   * * `gate_key` - The key to open the gate (e.g. the password)
   * # Returns
   * * `Ok(OpenGateSuccessResult)` - Gate and updated user status
   * * `Err(CanisterError)` - If the key is wrong or the gate is not found
   */
  'user_open_link_gate' : ActorMethod<[string, string, GateKey], Result_9>,
  /**
   * Processes a created action V3.
   * # Arguments
   * * `input` - Action processing data
   * # Returns
   * * `Ok(ProcessActionResponseV3)` - The processed action data
   * * `Err(CanisterError)` - If action processing fails or validation errors occur
   */
  'user_process_action_v3' : ActorMethod<[ProcessActionInputV3], Result_10>,
  /**
   * Sends an OTP code to the destination configured on the given gate.
   * 
   * The caller's principal is forwarded to GateService so the OTP is keyed by
   * the actual end-user, not by this canister.
   * # Arguments
   * * `gate_id` - The unique identifier of the OTPEmail or OTPSms gate
   * # Returns
   * * `Ok(())` - Code generated and dispatched via Brevo
   * * `Err(CanisterError)` - Gate not found, not an OTP gate, or Brevo call failed
   */
  'user_send_otp' : ActorMethod<[string], Result>,
  /**
   * Syncs the asset balance cache for a link by querying actual token balances.
   * Only the link creator can trigger this.
   * # Arguments
   * * `link_id` - The unique identifier of the link
   * # Returns
   * * `Ok(SyncAssetBalanceCacheResponseV3)` - The updated link data
   * * `Err(CanisterError)` - If link not found, access denied, or balance fetch fails
   */
  'user_sync_asset_balance_cache' : ActorMethod<[string], Result_6>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
