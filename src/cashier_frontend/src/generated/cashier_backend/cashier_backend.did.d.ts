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
export type ActionType =
  | { Withdraw: null }
  | { Send: null }
  | { CreateLink: null }
  | { Receive: null };
export type Asset = { IC: { address: Principal } };
export interface AssetInfoDto {
  asset: Asset;
  amount_per_link_use_action: bigint;
  label: string;
}
export interface BuildData {
  rustc_semver: string;
  git_branch: string;
  pkg_version: string;
  cargo_target_triple: string;
  cargo_debug: string;
  pkg_name: string;
  cargo_features: string;
  build_timestamp: string;
  git_sha: string;
  git_commit_timestamp: string;
}
export type CanisterError =
  | { InvalidDataError: string }
  | { InvalidStateTransition: { to: string; from: string } }
  | { TransactionTimeout: string }
  | { BatchError: Array<CanisterError> }
  | { AuthError: string }
  | { InvalidInput: string }
  | { HandleLogicError: string }
  | { ParsePrincipalError: string }
  | { CandidDecodeFailed: string }
  | { UnknownError: string }
  | { InsufficientBalance: { available: bigint; required: bigint } }
  | { NotFound: string }
  | { ValidationErrors: string }
  | { ParseAccountError: string }
  | { Unauthorized: string }
  | { AlreadyExists: string }
  | { DependencyError: string }
  | { CandidError: string }
  | { AnonymousCall: null }
  | {
      CanisterCallError: {
        method: string;
        canister_id: string;
        message: string;
      };
    }
  | { UnboundedError: string }
  | { CallCanisterFailed: string };
export interface CashierBackendInitData {
  owner: Principal;
  log_settings: [] | [LogServiceSettings];
}
export type Chain = { IC: null };
export interface CreateActionAnonymousInput {
  link_id: string;
  action_type: ActionType;
  wallet_address: Principal;
}
export interface CreateActionInput {
  link_id: string;
  action_type: ActionType;
}
export interface CreateLinkDto {
  action: ActionDto;
  link: LinkDto;
}
export interface CreateLinkInput {
  title: string;
  asset_info: Array<AssetInfoDto>;
  link_type: LinkType;
  link_use_action_max_count: bigint;
}
export type FromCallType = { Canister: null } | { Wallet: null };
export interface GetLinkOptions {
  action_type: ActionType;
}
export interface GetLinkResp {
  action: [] | [ActionDto];
  link_user_state: LinkUserStateDto;
  link: LinkDto;
}
export type IcTransaction =
  | { Icrc2Approve: Icrc2Approve }
  | { Icrc1Transfer: Icrc1Transfer }
  | { Icrc2TransferFrom: Icrc2TransferFrom };
export interface Icrc112Request {
  arg: Uint8Array | number[];
  method: string;
  canister_id: Principal;
  nonce: [] | [Uint8Array | number[]];
}
export interface Icrc114ValidateArgs {
  arg: Uint8Array | number[];
  res: Uint8Array | number[];
  method: string;
  canister_id: Principal;
  nonce: [] | [Uint8Array | number[]];
}
export interface Icrc1Transfer {
  to: Wallet;
  ts: [] | [bigint];
  asset: Asset;
  from: Wallet;
  memo: [] | [Uint8Array | number[]];
  amount: bigint;
}
export interface Icrc21ConsentInfo {
  metadata: Icrc21ConsentMessageMetadata;
  consent_message: Icrc21ConsentMessage;
}
export type Icrc21ConsentMessage =
  | {
      LineDisplayMessage: { pages: Array<Icrc21LineDisplayPage> };
    }
  | { GenericDisplayMessage: string };
export interface Icrc21ConsentMessageMetadata {
  utc_offset_minutes: [] | [number];
  language: string;
}
export interface Icrc21ConsentMessageRequest {
  arg: Uint8Array | number[];
  method: string;
  user_preferences: Icrc21ConsentMessageSpec;
}
export interface Icrc21ConsentMessageSpec {
  metadata: Icrc21ConsentMessageMetadata;
  device_spec: [] | [Icrc21DeviceSpec];
}
export type Icrc21DeviceSpec =
  | { GenericDisplay: null }
  | {
      LineDisplay: {
        characters_per_line: number;
        lines_per_page: number;
      };
    };
export type Icrc21Error =
  | {
      GenericError: { description: string; error_code: bigint };
    }
  | { InsufficientPayment: Icrc21ErrorInfo }
  | { UnsupportedCanisterCall: Icrc21ErrorInfo }
  | { ConsentMessageUnavailable: Icrc21ErrorInfo };
export interface Icrc21ErrorInfo {
  description: string;
}
export interface Icrc21LineDisplayPage {
  lines: Array<string>;
}
export interface Icrc21SupportedStandard {
  url: string;
  name: string;
}
export interface Icrc28TrustedOriginsResponse {
  trusted_origins: Array<string>;
}
export interface Icrc2Approve {
  ts: [] | [bigint];
  asset: Asset;
  from: Wallet;
  memo: [] | [Uint8Array | number[]];
  amount: bigint;
  spender: Wallet;
}
export interface Icrc2TransferFrom {
  to: Wallet;
  ts: [] | [bigint];
  asset: Asset;
  from: Wallet;
  memo: [] | [Uint8Array | number[]];
  amount: bigint;
  spender: Wallet;
}
export interface IntentDto {
  id: string;
  chain: Chain;
  task: IntentTask;
  type: IntentType;
  created_at: bigint;
  state: IntentState;
  transactions: Array<TransactionDto>;
}
export type IntentState =
  | { Fail: null }
  | { Success: null }
  | { Processing: null }
  | { Created: null };
export type IntentTask =
  | { TransferWalletToLink: null }
  | { TransferLinkToWallet: null }
  | { TransferWalletToTreasury: null };
export type IntentType =
  | { Transfer: TransferData }
  | { TransferFrom: TransferFromData };
export interface LinkDto {
  id: string;
  title: string;
  creator: Principal;
  asset_info: Array<AssetInfoDto>;
  link_type: LinkType;
  create_at: bigint;
  state: LinkState;
  link_use_action_max_count: bigint;
  link_use_action_counter: bigint;
}
export interface LinkGetUserStateInput {
  link_id: string;
  action_type: ActionType;
  anonymous_wallet_address: [] | [Principal];
}
export interface LinkGetUserStateOutput {
  action: ActionDto;
  link_user_state: LinkUserState;
}
export type LinkState =
  | { Inactive: null }
  | { Active: null }
  | { CreateLink: null }
  | { InactiveEnded: null };
export type LinkType =
  | { SendAirdrop: null }
  | { SendTip: null }
  | { ReceivePayment: null }
  | { SendTokenBasket: null };
export interface LinkUpdateUserStateInput {
  link_id: string;
  action_type: ActionType;
  goto: UserStateMachineGoto;
  anonymous_wallet_address: [] | [Principal];
}
export type LinkUserState =
  | { Address: null }
  | { GateClosed: null }
  | { GateOpened: null }
  | { Completed: null };
export interface LinkUserStateDto {
  link_id: string;
  user_id: Principal;
  state: [] | [LinkUserState];
}
export interface LogServiceSettings {
  log_filter: [] | [string];
  in_memory_records: [] | [bigint];
  enable_console: [] | [boolean];
  max_record_length: [] | [bigint];
}
export interface PaginateInput {
  offset: bigint;
  limit: bigint;
}
export interface PaginateResult {
  metadata: PaginateResultMetadata;
  data: Array<LinkDto>;
}
export interface PaginateResultMetadata {
  is_next: boolean;
  is_prev: boolean;
  total: bigint;
  offset: bigint;
  limit: bigint;
}
export type Permission = { Admin: null };
export interface ProcessActionAnonymousInput {
  action_id: string;
  link_id: string;
  action_type: ActionType;
  wallet_address: Principal;
}
export interface ProcessActionDto {
  action: ActionDto;
  link: LinkDto;
  errors: Array<string>;
  is_success: boolean;
}
export interface ProcessActionInput {
  action_id: string;
  link_id: string;
  action_type: ActionType;
}
export interface ProcessActionV2Input {
  action_id: string;
}
export type Protocol = { IC: IcTransaction };
export type Result = { Ok: null } | { Err: CanisterError };
export type Result_1 = { Ok: Array<Permission> } | { Err: CanisterError };
export type Result_10 = { Ok: PaginateResult } | { Err: CanisterError };
export type Result_11 = { Ok: ProcessActionDto } | { Err: CanisterError };
export type Result_12 = { Ok: string } | { Err: CanisterError };
export type Result_2 = { Ok: ActionDto } | { Err: CanisterError };
export type Result_3 = { Ok: GetLinkResp } | { Err: string };
export type Result_4 = { Ok: GetLinkResp } | { Err: CanisterError };
export type Result_5 = { Ok: PaginateResult } | { Err: string };
export type Result_6 = { Ok: Icrc21ConsentInfo } | { Err: Icrc21Error };
export type Result_7 =
  | { Ok: [] | [LinkGetUserStateOutput] }
  | { Err: CanisterError };
export type Result_8 = { Ok: LinkDto } | { Err: CanisterError };
export type Result_9 = { Ok: CreateLinkDto } | { Err: CanisterError };
export interface TransactionDto {
  id: string;
  protocol: Protocol;
  from_call_type: FromCallType;
  created_at: bigint;
  state: IntentState;
  dependency: [] | [Array<string>];
  group: number;
}
export interface TransferData {
  to: Wallet;
  asset: Asset;
  from: Wallet;
  amount: bigint;
}
export interface TransferFromData {
  to: Wallet;
  asset: Asset;
  from: Wallet;
  actual_amount: [] | [bigint];
  amount: bigint;
  approve_amount: [] | [bigint];
  spender: Wallet;
}
export interface TriggerTransactionInput {
  transaction_id: string;
  action_id: string;
  link_id: string;
}
export interface UpdateActionInput {
  action_id: string;
  link_id: string;
  external: boolean;
}
export interface UpdateLinkInput {
  id: string;
  goto: UserStateMachineGoto;
}
export type UserStateMachineGoto = { Continue: null } | { Back: null };
export type Wallet = {
  IC: {
    subaccount: [] | [Uint8Array | number[]];
    address: Principal;
  };
};
export interface _SERVICE {
  admin_inspect_message_enable: ActorMethod<[boolean], Result>;
  admin_permissions_add: ActorMethod<[Principal, Array<Permission>], Result_1>;
  admin_permissions_get: ActorMethod<[Principal], Array<Permission>>;
  admin_permissions_remove: ActorMethod<
    [Principal, Array<Permission>],
    Result_1
  >;
  create_action_anonymous: ActorMethod<[CreateActionAnonymousInput], Result_2>;
  get_canister_build_data: ActorMethod<[], BuildData>;
  get_link: ActorMethod<[string, [] | [GetLinkOptions]], Result_3>;
  get_link_details_v2: ActorMethod<[string, [] | [GetLinkOptions]], Result_4>;
  get_links: ActorMethod<[[] | [PaginateInput]], Result_5>;
  icrc10_supported_standards: ActorMethod<[], Array<Icrc21SupportedStandard>>;
  icrc114_validate: ActorMethod<[Icrc114ValidateArgs], boolean>;
  icrc21_canister_call_consent_message: ActorMethod<
    [Icrc21ConsentMessageRequest],
    Result_6
  >;
  icrc28_trusted_origins: ActorMethod<[], Icrc28TrustedOriginsResponse>;
  is_inspect_message_enabled: ActorMethod<[], boolean>;
  link_get_user_state: ActorMethod<[LinkGetUserStateInput], Result_7>;
  process_action_anonymous: ActorMethod<
    [ProcessActionAnonymousInput],
    Result_2
  >;
  user_create_action: ActorMethod<[CreateActionInput], Result_2>;
  user_create_action_v2: ActorMethod<[CreateActionInput], Result_2>;
  user_create_link: ActorMethod<[CreateLinkInput], Result_8>;
  user_create_link_v2: ActorMethod<[CreateLinkInput], Result_9>;
  user_disable_link_v2: ActorMethod<[string], Result_8>;
  user_get_links_v2: ActorMethod<[[] | [PaginateInput]], Result_10>;
  user_link_update_user_state: ActorMethod<
    [LinkUpdateUserStateInput],
    Result_7
  >;
  user_process_action: ActorMethod<[ProcessActionInput], Result_2>;
  user_process_action_v2: ActorMethod<[ProcessActionV2Input], Result_11>;
  user_trigger_transaction: ActorMethod<[TriggerTransactionInput], Result_12>;
  user_update_action: ActorMethod<[UpdateActionInput], Result_2>;
  user_update_link: ActorMethod<[UpdateLinkInput], Result_8>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
