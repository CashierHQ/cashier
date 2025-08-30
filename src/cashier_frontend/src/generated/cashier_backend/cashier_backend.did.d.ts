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
  'description' : [] | [string],
  'link_image_url' : [] | [string],
  'template' : Template,
  'link_use_action_max_count' : bigint,
  'nft_image' : [] | [string],
}
export type FromCallType = { 'Canister' : null } |
  { 'Wallet' : null };
export interface GetLinkOptions { 'action_type' : ActionType }
export interface GetLinkResp { 'action' : [] | [ActionDto], 'link' : LinkDto }
export type IcTransaction = { 'Icrc2Approve' : Icrc2Approve } |
  { 'Icrc1Transfer' : Icrc1Transfer } |
  { 'Icrc2TransferFrom' : Icrc2TransferFrom };
export interface Icrc112Request {
  'arg' : string,
  'method' : string,
  'canister_id' : Principal,
  'nonce' : [] | [string],
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
export interface LinkDetailUpdateInput {
  'title' : [] | [string],
  'asset_info' : Array<AssetInfoDto>,
  'link_type' : [] | [LinkType],
  'description' : [] | [string],
  'link_image_url' : [] | [string],
  'template' : [] | [Template],
  'link_use_action_max_count' : [] | [bigint],
  'nft_image' : [] | [string],
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
  { 'ChooseWallet' : null };
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
export type Result = { 'Ok' : ActionDto } |
  { 'Err' : CanisterError };
export type Result_1 = { 'Ok' : LinkDto } |
  { 'Err' : CanisterError };
export type Result_2 = { 'Ok' : GetLinkResp } |
  { 'Err' : string };
export type Result_3 = { 'Ok' : PaginateResult } |
  { 'Err' : string };
export type Result_4 = { 'Ok' : Icrc21ConsentInfo } |
  { 'Err' : Icrc21Error };
export type Result_5 = { 'Ok' : [] | [LinkGetUserStateOutput] } |
  { 'Err' : CanisterError };
export type Result_6 = { 'Ok' : string } |
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
  'params' : [] | [LinkDetailUpdateInput],
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
  'create_action' : ActorMethod<[CreateActionInput], Result>,
  'create_action_anonymous' : ActorMethod<[CreateActionAnonymousInput], Result>,
  'create_link' : ActorMethod<[CreateLinkInput], Result_1>,
  'get_canister_build_data' : ActorMethod<[], BuildData>,
  'get_link' : ActorMethod<[string, [] | [GetLinkOptions]], Result_2>,
  'get_links' : ActorMethod<[[] | [PaginateInput]], Result_3>,
  'icrc10_supported_standards' : ActorMethod<
    [],
    Array<Icrc21SupportedStandard>
  >,
  'icrc21_canister_call_consent_message' : ActorMethod<
    [Icrc21ConsentMessageRequest],
    Result_4
  >,
  'icrc28_trusted_origins' : ActorMethod<[], Icrc28TrustedOriginsResponse>,
  'link_get_user_state' : ActorMethod<[LinkGetUserStateInput], Result_5>,
  'link_update_user_state' : ActorMethod<[LinkUpdateUserStateInput], Result_5>,
  'process_action' : ActorMethod<[ProcessActionInput], Result>,
  'process_action_anonymous' : ActorMethod<
    [ProcessActionAnonymousInput],
    Result
  >,
  'trigger_transaction' : ActorMethod<[TriggerTransactionInput], Result_6>,
  'update_action' : ActorMethod<[UpdateActionInput], Result>,
  'update_link' : ActorMethod<[UpdateLinkInput], Result_1>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
