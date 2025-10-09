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
export type ActionType = { 'Use' : null } |
  { 'Withdraw' : null } |
  { 'CreateLink' : null };
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
  'owner' : Principal,
  'log_settings' : [] | [LogServiceSettings],
}
export type Chain = { 'IC' : null };
export interface CreateActionAnonymousInput {
  'link_id' : string,
  'action_type' : ActionType,
  'wallet_address' : Principal,
}
export interface CreateActionInput {
  'link_id' : string,
  'action_type' : ActionType,
}
export interface CreateLinkInput {
  'title' : string,
  'asset_info' : Array<LinkDetailUpdateAssetInfoInput>,
  'link_type' : LinkType,
  'link_use_action_max_count' : bigint,
}
export type FromCallType = { 'Canister' : null } |
  { 'Wallet' : null };
export interface GetLinkOptions { 'action_type' : ActionType }
export interface GetLinkResp { 'action' : [] | [ActionDto], 'link' : LinkDto }
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
export interface LinkDetailUpdateAssetInfoInput {
  'asset' : Asset,
  'amount_per_link_use_action' : bigint,
  'label' : string,
}
export interface LinkDto {
  'id' : string,
  'title' : [] | [string],
  'creator' : Principal,
  'asset_info' : Array<AssetInfoDto>,
  'link_type' : [] | [LinkType],
  'metadata' : Array<[string, string]>,
  'create_at' : bigint,
  'description' : [] | [string],
  'state' : LinkState,
  'template' : [] | [Template],
  'link_use_action_max_count' : bigint,
  'link_use_action_counter' : bigint,
}
export interface LinkGetUserStateInput {
  'link_id' : string,
  'action_type' : ActionType,
  'anonymous_wallet_address' : [] | [Principal],
}
export interface LinkGetUserStateOutput {
  'action' : ActionDto,
  'link_user_state' : LinkUserState,
}
export type LinkState = { 'Preview' : null } |
  { 'ChooseLinkType' : null } |
  { 'Inactive' : null } |
  { 'Active' : null } |
  { 'CreateLink' : null } |
  { 'AddAssets' : null } |
  { 'InactiveEnded' : null };
export type LinkType = { 'SendAirdrop' : null } |
  { 'ReceiveMutliPayment' : null } |
  { 'SendTip' : null } |
  { 'ReceivePayment' : null } |
  { 'SendTokenBasket' : null } |
  { 'SwapMultiAsset' : null } |
  { 'NftCreateAndAirdrop' : null } |
  { 'SwapSingleAsset' : null };
export interface LinkUpdateUserStateInput {
  'link_id' : string,
  'action_type' : ActionType,
  'goto' : UserStateMachineGoto,
  'anonymous_wallet_address' : [] | [Principal],
}
export type LinkUserState = { 'CompletedLink' : null } |
  { 'Address' : null } |
  { 'GateClosed' : null } |
  { 'GateOpened' : null };
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
export interface ProcessActionAnonymousInput {
  'action_id' : string,
  'link_id' : string,
  'action_type' : ActionType,
  'wallet_address' : Principal,
}
export interface ProcessActionInput {
  'action_id' : string,
  'link_id' : string,
  'action_type' : ActionType,
}
export type Protocol = { 'IC' : IcTransaction };
export type Result = { 'Ok' : null } |
  { 'Err' : CanisterError };
export type Result_1 = { 'Ok' : Array<Permission> } |
  { 'Err' : CanisterError };
export type Result_2 = { 'Ok' : ActionDto } |
  { 'Err' : CanisterError };
export type Result_3 = { 'Ok' : LinkDto } |
  { 'Err' : CanisterError };
export type Result_4 = { 'Ok' : GetLinkResp } |
  { 'Err' : string };
export type Result_5 = { 'Ok' : PaginateResult } |
  { 'Err' : string };
export type Result_6 = { 'Ok' : Icrc21ConsentInfo } |
  { 'Err' : Icrc21Error };
export type Result_7 = { 'Ok' : [] | [LinkGetUserStateOutput] } |
  { 'Err' : CanisterError };
export type Result_8 = { 'Ok' : string } |
  { 'Err' : CanisterError };
export type Template = { 'Left' : null } |
  { 'Right' : null } |
  { 'Central' : null };
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
  'goto' : UserStateMachineGoto,
}
export type UserStateMachineGoto = { 'Continue' : null } |
  { 'Back' : null };
export type Wallet = {
    'IC' : {
      'subaccount' : [] | [Uint8Array | number[]],
      'address' : Principal,
    }
  };
export interface _SERVICE {
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
   * Creates a new action for authenticated users on a specific link.
   * 
   * This endpoint allows users to create blockchain actions (like claims, transfers, etc.)
   * on existing links. The action is prepared with all necessary intents and transactions
   * but not immediately executed.
   * 
   * # Arguments
   * * `input` - Action creation parameters including link ID and action type
   * 
   * # Returns
   * * `Ok(ActionDto)` - Created action data with associated intents
   * * `Err(CanisterError)` - Error if creation fails or action already exists
   */
  'create_action' : ActorMethod<[CreateActionInput], Result_2>,
  /**
   * Creates a new action for anonymous users with wallet address.
   * 
   * This endpoint allows anonymous users to create blockchain actions (typically claims)
   * by providing their wallet address. Only supports "Use" action types and validates
   * that the action doesn't already exist for the given wallet.
   * 
   * # Arguments
   * * `input` - Anonymous action creation parameters including wallet address
   * 
   * # Returns
   * * `Ok(ActionDto)` - Created action data with associated intents
   * * `Err(CanisterError)` - Error if creation fails or action already exists
   */
  'create_action_anonymous' : ActorMethod<
    [CreateActionAnonymousInput],
    Result_2
  >,
  /**
   * Creates a new link using the v2 API format with enhanced features.
   * 
   * This endpoint requires authentication and creates a new blockchain transaction link
   * owned by the calling principal. Returns the complete link data structure.
   * 
   * # Arguments
   * * `input` - Link creation parameters (v2 format with additional features)
   * 
   * # Returns
   * * `Ok(LinkDto)` - Complete data of the created link
   * * `Err(CanisterError)` - Error if link creation fails
   */
  'create_link' : ActorMethod<[CreateLinkInput], Result_3>,
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
   * * `id` - The unique identifier of the link to retrieve
   * * `options` - Optional parameters including action type to include in response
   * 
   * # Returns
   * * `Ok(GetLinkResp)` - Link data with optional action information
   * * `Err(String)` - Error message if link not found or access denied
   */
  'get_link' : ActorMethod<[string, [] | [GetLinkOptions]], Result_4>,
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
   * * `Err(String)` - Error message if retrieval fails
   */
  'get_links' : ActorMethod<[[] | [PaginateInput]], Result_5>,
  'icrc10_supported_standards' : ActorMethod<
    [],
    Array<Icrc21SupportedStandard>
  >,
  'icrc114_validate' : ActorMethod<[Icrc114ValidateArgs], boolean>,
  'icrc21_canister_call_consent_message' : ActorMethod<
    [Icrc21ConsentMessageRequest],
    Result_6
  >,
  'icrc28_trusted_origins' : ActorMethod<[], Icrc28TrustedOriginsResponse>,
  /**
   * Returns the inspect message status.
   */
  'is_inspect_message_enabled' : ActorMethod<[], boolean>,
  /**
   * Retrieves the current user state for a specific link action.
   * 
   * This endpoint returns the user's current progress/state within a link's action flow.
   * It supports both authenticated users (via session) and anonymous users (via wallet address).
   * Currently only supports "Use" action types for security.
   * 
   * # Arguments
   * * `input` - Parameters including link ID, action type, and optional wallet address
   * 
   * # Returns
   * * `Ok(Some(LinkGetUserStateOutput))` - Current user state and action data if found
   * * `Ok(None)` - If no action exists for the user
   * * `Err(CanisterError)` - Error if validation fails or invalid parameters
   */
  'link_get_user_state' : ActorMethod<[LinkGetUserStateInput], Result_7>,
  /**
   * Updates the user state for a specific link action.
   * 
   * This endpoint transitions the user through different states in a link's action flow
   * (e.g., from wallet selection to transaction signing). It implements a state machine
   * to guide users through the complete action process.
   * 
   * # Arguments
   * * `input` - Parameters including link ID, action type, target state, and optional wallet address
   * 
   * # Returns
   * * `Ok(Some(LinkGetUserStateOutput))` - Updated user state and action data
   * * `Ok(None)` - If state transition is not valid
   * * `Err(CanisterError)` - Error if validation fails or transition not allowed
   */
  'link_update_user_state' : ActorMethod<[LinkUpdateUserStateInput], Result_7>,
  /**
   * Processes an existing action for authenticated users.
   * 
   * This endpoint executes a blockchain action that was previously created by the user.
   * It validates the action state, executes the associated blockchain transactions,
   * and updates the action status accordingly.
   * 
   * # Arguments
   * * `input` - Action processing parameters including link ID and action type
   * 
   * # Returns
   * * `Ok(ActionDto)` - Updated action data after processing
   * * `Err(CanisterError)` - Error if processing fails or action not found
   */
  'process_action' : ActorMethod<[ProcessActionInput], Result_2>,
  /**
   * Processes an existing action for anonymous users with wallet address.
   * 
   * This endpoint allows anonymous users to execute blockchain actions (typically claims)
   * by providing their wallet address. Only supports "Use" action types for security.
   * Actions are executed without requiring user authentication.
   * 
   * # Arguments
   * * `input` - Anonymous action processing parameters including wallet address
   * 
   * # Returns
   * * `Ok(ActionDto)` - Updated action data after processing
   * * `Err(CanisterError)` - Error if processing fails or invalid action type
   */
  'process_action_anonymous' : ActorMethod<
    [ProcessActionAnonymousInput],
    Result_2
  >,
  'trigger_transaction' : ActorMethod<[TriggerTransactionInput], Result_8>,
  /**
   * Updates an existing action's state and executes associated transactions.
   * 
   * This endpoint allows action creators to modify and execute their blockchain actions.
   * It validates ownership, processes the action through the transaction manager,
   * and executes wallet transactions if specified.
   * 
   * # Arguments
   * * `input` - Action update parameters including action ID and link ID
   * 
   * # Returns
   * * `Ok(ActionDto)` - Updated action data after processing
   * * `Err(CanisterError)` - Error if update fails, unauthorized, or action not found
   */
  'update_action' : ActorMethod<[UpdateActionInput], Result_2>,
  /**
   * Updates an existing link's configuration or state.
   * 
   * This endpoint requires authentication and allows the link creator to modify
   * link properties, trigger state transitions, or update link parameters.
   * 
   * # Arguments
   * * `input` - Link update parameters including ID and new configuration
   * 
   * # Returns
   * * `Ok(LinkDto)` - Updated link data
   * * `Err(CanisterError)` - Error if update fails or unauthorized
   */
  'update_link' : ActorMethod<[UpdateLinkInput], Result_3>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
